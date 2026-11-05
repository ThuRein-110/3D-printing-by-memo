create table public.provider_budgets(day date primary key,limit_thb numeric not null default 0 check(limit_thb>=0),reserved_thb numeric not null default 0 check(reserved_thb>=0));
create table public.provider_reservations(job_id uuid primary key references public.preview_jobs,budget_day date not null references public.provider_budgets,amount numeric not null check(amount>=0));
alter table public.provider_budgets enable row level security;
alter table public.provider_reservations enable row level security;
revoke all on public.provider_budgets,public.provider_reservations from anon,authenticated;
create function public.reserve_provider_budget(p_job uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.preview_jobs; d date:=(now() at time zone 'Asia/Bangkok')::date; begin
 select * into j from public.preview_jobs where id=p_job for update;
 if j.id is null then return false; end if;
 if exists(select 1 from public.provider_reservations where job_id=p_job) then return true; end if;
 update public.provider_budgets set reserved_thb=reserved_thb+j.max_cost_thb where day=d and reserved_thb+j.max_cost_thb<=limit_thb;
 if not found then return false; end if;
 insert into public.provider_reservations(job_id,budget_day,amount) values(j.id,d,j.max_cost_thb);return true;
end; $$;
create or replace function public.claim_preview_job() returns setof public.preview_jobs language plpgsql security definer set search_path='' as $$ begin
 perform pg_advisory_xact_lock(581901);
 if (select count(*) from public.preview_jobs where state='processing' and lease_until>now())>=1 then return; end if;
 return query with pick as (select id from public.preview_jobs where state in ('queued','processing') and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 1)
 update public.preview_jobs j set state='processing',lease_until=now()+interval '90 seconds',started_at=coalesce(started_at,now()) from pick where j.id=pick.id returning j.*;
end; $$;
revoke execute on function public.reserve_provider_budget(uuid),public.claim_preview_job() from public,anon,authenticated;
grant execute on function public.reserve_provider_budget(uuid),public.claim_preview_job() to service_role;
