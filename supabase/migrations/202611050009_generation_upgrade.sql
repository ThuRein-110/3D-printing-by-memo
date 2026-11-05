-- Additive upgrade. Never rewrite 001–008 or accepted quote snapshots.
alter table public.preview_jobs add column progress integer check(progress between 0 and 100);
alter table public.preview_jobs add column consumed_credits integer check(consumed_credits>=0);
alter table public.preview_jobs add column estimated_credits integer not null default 20 check(estimated_credits>0);
alter table public.preview_jobs add column credit_cost_thb numeric check(credit_cost_thb>=0);
alter table public.preview_jobs add column request_key uuid not null default gen_random_uuid() unique;
alter table public.preview_jobs add column poll_failures integer not null default 0;
alter table public.preview_jobs add column consented_at timestamptz;
alter table public.preview_jobs add column consent_version text;
alter table public.customer_files add column generated boolean not null default false;
alter table public.customer_files add column purpose text not null default 'customer' check(purpose in ('customer','filament'));
alter table public.customer_files add column source_job_id uuid references public.preview_jobs;
alter table public.materials add column image_file_id uuid references public.customer_files;
create table public.generation_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_customer_limit integer not null default 3 check(daily_customer_limit between 1 and 50),
 monthly_budget_thb numeric not null default 0 check(monthly_budget_thb>=0),
 credit_cost_thb numeric check(credit_cost_thb>0), concurrency integer not null default 1 check(concurrency between 1 and 4),
 updated_at timestamptz not null default now()
);
insert into public.generation_settings(id) values(true);
create table public.generation_months(month date primary key,reserved_thb numeric not null default 0 check(reserved_thb>=0));
create table public.generation_reservations(job_id uuid primary key references public.preview_jobs,month date not null references public.generation_months,amount_thb numeric not null check(amount_thb>0),created_at timestamptz not null default now());
alter table public.generation_settings enable row level security;
alter table public.generation_months enable row level security;
alter table public.generation_reservations enable row level security;
revoke all on public.generation_settings,public.generation_months,public.generation_reservations from anon,authenticated;
grant all on public.generation_settings,public.generation_months,public.generation_reservations to service_role;
create policy admin_read on public.generation_settings for select to authenticated using(public.is_admin());
create policy admin_read on public.generation_months for select to authenticated using(public.is_admin());
create policy admin_read on public.generation_reservations for select to authenticated using(public.is_admin());
grant select on public.generation_settings,public.generation_months,public.generation_reservations to authenticated;
-- Singleton configuration uses an explicit actor-aware audit function.
create function public.configure_generation(p_enabled boolean,p_daily integer,p_monthly numeric,p_credit numeric,p_concurrency integer) returns void language plpgsql security definer set search_path='' as $$
declare old_config jsonb;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 select to_jsonb(s) into old_config from public.generation_settings s where id for update;
 if p_enabled and (p_monthly<=0 or p_credit is null or p_credit<=0) then raise exception 'Budget and reviewed credit cost required';end if;
 update public.generation_settings set enabled=p_enabled,daily_customer_limit=p_daily,monthly_budget_thb=p_monthly,credit_cost_thb=p_credit,concurrency=p_concurrency,updated_at=now() where id;
 insert into public.audit_logs(actor_id,entity,action,before_data,after_data) values(auth.uid(),'generation_settings','UPDATE',old_config,(select to_jsonb(s) from public.generation_settings s where id));
end; $$;
create function public.enqueue_generation(p_owner uuid,p_file uuid,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare config public.generation_settings; existing uuid; job uuid;begin
 select * into config from public.generation_settings where id for update;
 if not exists(select 1 from public.customer_files where id=p_file and owner_id=p_owner and kind='reference') then raise exception 'Reference not found';end if;
 select id into existing from public.preview_jobs where owner_id=p_owner and (file_id=p_file or request_key=p_request);
 if existing is not null then update public.preview_jobs set consented_at=coalesce(consented_at,now()),consent_version=coalesce(consent_version,'meshy-image-v1') where id=existing;return existing;end if;
 if not config.enabled or config.credit_cost_thb is null or config.monthly_budget_thb<=0 then raise exception 'Generation unavailable';end if;
 if (select count(*) from public.preview_jobs where owner_id=p_owner and created_at>=date_trunc('day',now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok')>=config.daily_customer_limit then raise exception 'Daily generation limit';end if;
 insert into public.preview_jobs(owner_id,file_id,max_cost_thb,estimated_credits,credit_cost_thb,request_key,consented_at,consent_version)
 values(p_owner,p_file,20*config.credit_cost_thb,20,config.credit_cost_thb,p_request,now(),'meshy-image-v1') returning id into job;
 return job;
end; $$;
create function public.start_generation(p_job uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare config public.generation_settings;j public.preview_jobs;m date:=date_trunc('month',now() at time zone 'Asia/Bangkok')::date;begin
 select * into config from public.generation_settings where id for update;
 select * into j from public.preview_jobs where id=p_job for update;
 if not config.enabled or j.id is null or j.attempts<>0 or j.provider_id is not null or j.cancel_requested or j.consented_at is null or j.state<>'processing' then return false;end if;
 insert into public.generation_months(month) values(m) on conflict do nothing;
 update public.generation_months set reserved_thb=reserved_thb+j.max_cost_thb where month=m and reserved_thb+j.max_cost_thb<=config.monthly_budget_thb;
 if not found then return false;end if;
 insert into public.generation_reservations(job_id,month,amount_thb) values(j.id,m,j.max_cost_thb);
 update public.preview_jobs set attempts=1 where id=j.id;
 return true;
end; $$;
create or replace function public.claim_preview_job() returns setof public.preview_jobs language plpgsql security definer set search_path='' as $$ begin
 perform pg_advisory_xact_lock(581901);
 if (select count(*) from public.preview_jobs where state='processing' and lease_until>now())>=(select concurrency from public.generation_settings where id) then return;end if;
 return query with pick as (select id from public.preview_jobs where state in ('queued','processing') and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 1)
 update public.preview_jobs j set state='processing',lease_until=now()+interval '120 seconds',started_at=coalesce(started_at,now()) from pick where j.id=pick.id returning j.*;
end; $$;
create function public.retry_generation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 update public.preview_jobs set state='queued',error_code=null,poll_failures=0,lease_until=null,next_attempt_at=now(),started_at=null
 where id=p_id and (owner_id=auth.uid() or public.is_admin()) and state='failed' and
 (attempts=0 or (provider_id is not null and error_code not in ('PROVIDER_TERMINAL')));
 if not found then raise exception 'Unsafe retry; reconciliation required';end if;
end; $$;
revoke execute on function public.configure_generation(boolean,integer,numeric,numeric,integer),public.enqueue_generation(uuid,uuid,uuid),public.start_generation(uuid),public.retry_generation(uuid) from public,anon,authenticated;
grant execute on function public.configure_generation(boolean,integer,numeric,numeric,integer),public.retry_generation(uuid) to authenticated;
grant execute on function public.enqueue_generation(uuid,uuid,uuid),public.start_generation(uuid),public.claim_preview_job() to service_role;
-- An old worker must not submit new work through the obsolete daily-only budget guard.
revoke execute on function public.reserve_provider_budget(uuid) from service_role;
-- Preserve stored snapshots but prevent direct customer access to internal cost/profit fields.
revoke select on public.pricing_rules,public.pricing_snapshots from anon,authenticated;
revoke select on public.quotes from authenticated;
grant select(id,owner_id,request_key,service,configuration,status,final_total,notes,expires_at,created_at) on public.quotes to authenticated;
create function public.generation_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 return (select jsonb_build_object('jobs',count(*),'actual_credits',sum(consumed_credits),'reported_jobs',count(consumed_credits),'failed_jobs',count(*) filter(where state='failed'),'estimated_credits',sum(estimated_credits)) from public.preview_jobs);
end; $$;
revoke execute on function public.generation_metrics() from public,anon,authenticated;
grant execute on function public.generation_metrics() to authenticated;
