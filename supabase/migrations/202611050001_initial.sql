-- Shared backend. Apply with Supabase CLI; PostgreSQL 15+.
create extension if not exists pgcrypto;
create type public.order_status as enum ('draft','submitted','reviewing','awaiting_customer_approval','approved','awaiting_deposit','paid_deposit','designing','printing','finishing','ready','shipped','completed','cancelled');
create table public.profiles(id uuid primary key references auth.users on delete cascade, display_name text check(length(display_name)<=120), created_at timestamptz not null default now());
create table public.roles(user_id uuid primary key references auth.users on delete cascade, role text not null check(role='admin'));
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.roles where user_id=auth.uid() and role='admin') and coalesce(auth.jwt()->>'aal','')='aal2';
$$;
create table public.materials(id uuid primary key default gen_random_uuid(), name text not null default 'PETG', color text not null, hex text not null check(hex~'^#[0-9A-Fa-f]{6}$'), visible boolean not null default false, available_grams numeric not null default 0 check(available_grams>=0), low_stock_grams numeric not null default 200, created_at timestamptz not null default now());
create table public.printer_profiles(id uuid primary key default gen_random_uuid(),name text not null,volume_mm integer[] not null default '{260,260,260}',settings jsonb not null default '{}',created_at timestamptz not null default now());
create table public.pricing_rules(id uuid primary key default gen_random_uuid(),rates jsonb not null, effective_at timestamptz not null default now(), active boolean not null default false,created_at timestamptz not null default now());
create table public.promotions(id uuid primary key default gen_random_uuid(),name text not null,kind text not null check(kind in ('fixed','percentage')),value numeric not null check(value>=0 and (kind<>'percentage' or value<=100)), starts_at timestamptz not null,ends_at timestamptz not null,usage_limit integer check(usage_limit>0),used integer not null default 0 check(used>=0),active boolean not null default false,minimum_total numeric not null default 0,created_at timestamptz not null default now(),check(ends_at>starts_at),check(usage_limit is null or used<=usage_limit));
create table public.customer_files(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,path text not null unique,sha256 text not null check(sha256~'^[a-f0-9]{64}$'),original_name text not null,mime text not null,bytes integer not null check(bytes>0 and bytes<=4194304),analysis jsonb,kind text not null check(kind in ('reference','mesh','payment')),created_at timestamptz not null default now());
create table public.quotes(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,request_key uuid not null,service text not null check(service in ('ready','custom','photo','reprint')),configuration jsonb not null,snapshot jsonb not null,estimate jsonb not null,status text not null default 'submitted' check(status in ('submitted','reviewing','final','accepted','expired','rejected')),final_total numeric check(final_total>=0),notes text not null default '',expires_at timestamptz not null default now()+interval '14 days',created_at timestamptz not null default now(),unique(owner_id,request_key));
create table public.orders(id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,owner_id uuid not null references auth.users on delete cascade,quote_id uuid not null unique references public.quotes,status public.order_status not null default 'submitted',final_design_file_id uuid references public.customer_files,final_design_approved boolean not null default false,created_at timestamptz not null default now());
create table public.order_events(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders on delete cascade,owner_id uuid not null references auth.users on delete cascade,actor_id uuid references auth.users,from_status public.order_status,to_status public.order_status not null,note text not null default '',created_at timestamptz not null default now());
create table public.preview_jobs(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,file_id uuid not null references public.customer_files,state text not null default 'queued' check(state in ('queued','processing','succeeded','failed','cancelled')),provider_id text,attempts integer not null default 0,max_cost_thb numeric not null check(max_cost_thb>=0),error_code text,lease_until timestamptz,next_attempt_at timestamptz not null default now(),started_at timestamptz,output_file_id uuid references public.customer_files,created_at timestamptz not null default now(),unique(owner_id,file_id));
create table public.gallery_items(id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',public boolean not null default false,consent_record text,image_path text,created_at timestamptz not null default now(),check(not public or consent_record is not null));
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid,entity text not null,entity_id uuid,action text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,window_start timestamptz not null default now(),hits integer not null default 0);
create table public.customers(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,display_name text,created_at timestamptz not null default now());
create table public.models(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,file_id uuid references public.customer_files, name text,created_at timestamptz not null default now());
create table public.model_versions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,model_id uuid references public.models on delete cascade, file_id uuid references public.customer_files,created_at timestamptz not null default now());
create table public.pricing_snapshots(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,quote_id uuid references public.quotes on delete cascade, rates jsonb not null,created_at timestamptz not null default now());
create table public.quote_items(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,quote_id uuid references public.quotes on delete cascade, quantity integer not null check(quantity>0), description text,created_at timestamptz not null default now());
create table public.payments(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,order_id uuid not null references public.orders, file_id uuid not null references public.customer_files, amount numeric not null check(amount>0), verified boolean not null default false, request_key uuid not null unique,created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,order_id uuid references public.orders, message text not null, read_at timestamptz,created_at timestamptz not null default now());
create table public.privacy_requests(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,kind text not null check(kind in ('export','deletion')), status text not null default 'requested',created_at timestamptz not null default now());
create table public.filament_spools(id uuid primary key default gen_random_uuid(),material_id uuid not null references public.materials,supplier text,batch text,cost_per_kg numeric check(cost_per_kg>=0),remaining_grams numeric not null check(remaining_grams>=0),spool_weight_grams numeric check(spool_weight_grams>=0),created_at timestamptz not null default now());
create table public.inventory_transactions(id uuid primary key default gen_random_uuid(),material_id uuid not null references public.materials,order_id uuid references public.orders,delta_grams numeric not null,kind text not null check(kind in ('receive','reserve','release','consume','adjust')),reason text not null,created_at timestamptz not null default now());
create table public.production_jobs(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,printer_id uuid references public.printer_profiles,profile jsonb,slicer_results jsonb,status text not null default 'queued',failure_reason text,internal_notes text,created_at timestamptz not null default now());
create table public.settings(id uuid primary key default gen_random_uuid(),name text not null unique,value jsonb not null,created_at timestamptz not null default now());
create table public.promotion_redemptions(id uuid primary key default gen_random_uuid(),promotion_id uuid not null references public.promotions,owner_id uuid not null references auth.users on delete cascade,quote_id uuid not null references public.quotes,created_at timestamptz not null default now(),unique(promotion_id,quote_id));
create index orders_owner on public.orders(owner_id,created_at desc);
create index files_owner on public.customer_files(owner_id);
create index quotes_owner on public.quotes(owner_id,created_at desc);
create index jobs_queue on public.preview_jobs(state,next_attempt_at,lease_until);
create index events_order on public.order_events(order_id,created_at);
create index notifications_owner on public.notifications(owner_id,created_at);
alter table public.profiles enable row level security;
create policy admin_read on public.profiles for select to authenticated using(public.is_admin());
create policy owner_read on public.profiles for select to authenticated using(id=auth.uid());
alter table public.customers enable row level security;
create policy admin_read on public.customers for select to authenticated using(public.is_admin());
create policy owner_read on public.customers for select to authenticated using(owner_id=auth.uid());
alter table public.customer_files enable row level security;
create policy admin_read on public.customer_files for select to authenticated using(public.is_admin());
create policy owner_read on public.customer_files for select to authenticated using(owner_id=auth.uid());
alter table public.models enable row level security;
create policy admin_read on public.models for select to authenticated using(public.is_admin());
create policy owner_read on public.models for select to authenticated using(owner_id=auth.uid());
alter table public.model_versions enable row level security;
create policy admin_read on public.model_versions for select to authenticated using(public.is_admin());
create policy owner_read on public.model_versions for select to authenticated using(owner_id=auth.uid());
alter table public.preview_jobs enable row level security;
create policy admin_read on public.preview_jobs for select to authenticated using(public.is_admin());
create policy owner_read on public.preview_jobs for select to authenticated using(owner_id=auth.uid());
alter table public.pricing_snapshots enable row level security;
create policy admin_read on public.pricing_snapshots for select to authenticated using(public.is_admin());
create policy owner_read on public.pricing_snapshots for select to authenticated using(owner_id=auth.uid());
alter table public.quotes enable row level security;
create policy admin_read on public.quotes for select to authenticated using(public.is_admin());
create policy owner_read on public.quotes for select to authenticated using(owner_id=auth.uid());
alter table public.quote_items enable row level security;
create policy admin_read on public.quote_items for select to authenticated using(public.is_admin());
create policy owner_read on public.quote_items for select to authenticated using(owner_id=auth.uid());
alter table public.orders enable row level security;
create policy admin_read on public.orders for select to authenticated using(public.is_admin());
create policy owner_read on public.orders for select to authenticated using(owner_id=auth.uid());
alter table public.order_events enable row level security;
create policy admin_read on public.order_events for select to authenticated using(public.is_admin());
create policy owner_read on public.order_events for select to authenticated using(owner_id=auth.uid());
alter table public.payments enable row level security;
create policy admin_read on public.payments for select to authenticated using(public.is_admin());
create policy owner_read on public.payments for select to authenticated using(owner_id=auth.uid());
alter table public.notifications enable row level security;
create policy admin_read on public.notifications for select to authenticated using(public.is_admin());
create policy owner_read on public.notifications for select to authenticated using(owner_id=auth.uid());
alter table public.promotion_redemptions enable row level security;
create policy admin_read on public.promotion_redemptions for select to authenticated using(public.is_admin());
create policy owner_read on public.promotion_redemptions for select to authenticated using(owner_id=auth.uid());
alter table public.privacy_requests enable row level security;
create policy admin_read on public.privacy_requests for select to authenticated using(public.is_admin());
create policy owner_read on public.privacy_requests for select to authenticated using(owner_id=auth.uid());
alter table public.roles enable row level security;
create policy admin_read on public.roles for select to authenticated using(public.is_admin());
alter table public.printer_profiles enable row level security;
create policy admin_read on public.printer_profiles for select to authenticated using(public.is_admin());
alter table public.materials enable row level security;
create policy admin_read on public.materials for select to authenticated using(public.is_admin());
alter table public.filament_spools enable row level security;
create policy admin_read on public.filament_spools for select to authenticated using(public.is_admin());
alter table public.inventory_transactions enable row level security;
create policy admin_read on public.inventory_transactions for select to authenticated using(public.is_admin());
alter table public.pricing_rules enable row level security;
create policy admin_read on public.pricing_rules for select to authenticated using(public.is_admin());
alter table public.promotions enable row level security;
create policy admin_read on public.promotions for select to authenticated using(public.is_admin());
alter table public.production_jobs enable row level security;
create policy admin_read on public.production_jobs for select to authenticated using(public.is_admin());
alter table public.gallery_items enable row level security;
create policy admin_read on public.gallery_items for select to authenticated using(public.is_admin());
alter table public.audit_logs enable row level security;
create policy admin_read on public.audit_logs for select to authenticated using(public.is_admin());
alter table public.rate_limits enable row level security;
alter table public.settings enable row level security;
create policy admin_read on public.settings for select to authenticated using(public.is_admin());
create policy public_read on public.materials for select to anon,authenticated using(visible and available_grams>0);
create policy public_read on public.gallery_items for select to anon,authenticated using(public and consent_record is not null);
create policy public_read on public.promotions for select to anon,authenticated using(active and now()>=starts_at and now()<ends_at and (usage_limit is null or used<usage_limit));
create policy public_read on public.pricing_rules for select to anon,authenticated using(active and effective_at<=now());
-- No browser role has direct INSERT/UPDATE/DELETE rights. All writes pass constrained RPCs or server-only service client.
revoke all on all tables in schema public from anon,authenticated;
grant select on all tables in schema public to authenticated;
grant select on public.materials,public.gallery_items,public.promotions,public.pricing_rules to anon;

create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,entity,entity_id,action,before_data,after_data) values(auth.uid(),tg_table_name,coalesce(new.id,old.id),tg_op,to_jsonb(old),to_jsonb(new)); return coalesce(new,old);
end; $$;
create trigger audit after insert or update or delete on public.pricing_rules for each row execute function public.audit_change();
create trigger audit after insert or update or delete on public.promotions for each row execute function public.audit_change();
create trigger audit after insert or update or delete on public.orders for each row execute function public.audit_change();
create trigger audit after insert or update or delete on public.materials for each row execute function public.audit_change();
create trigger audit after insert or update or delete on public.payments for each row execute function public.audit_change();
create trigger audit after insert or update or delete on public.settings for each row execute function public.audit_change();
create function public.immutable_record() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Immutable record'; end; $$;
create trigger files_immutable before update on public.customer_files for each row execute function public.immutable_record();
create trigger snapshot_immutable before update on public.pricing_snapshots for each row execute function public.immutable_record();
create function public.protect_quote() returns trigger language plpgsql set search_path='' as $$ begin
 if new.snapshot is distinct from old.snapshot or new.configuration is distinct from old.configuration or new.estimate is distinct from old.estimate or new.owner_id<>old.owner_id or (old.status='accepted' and new is distinct from old) then raise exception 'Quote snapshot is immutable'; end if; return new;
end; $$;
create trigger quote_immutable before update on public.quotes for each row execute function public.protect_quote();

create function public.take_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into public.rate_limits as r(key,hits) values(p_key,1) on conflict(key) do update set hits=case when r.window_start<now()-make_interval(secs=>p_seconds) then 1 else r.hits+1 end,window_start=case when r.window_start<now()-make_interval(secs=>p_seconds) then now() else r.window_start end returning hits into n;
 return n<=p_limit;
end; $$;

create function public.transition_order(p_id uuid,p_to public.order_status,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; allowed text[]; a boolean:=public.is_admin(); begin
 select * into o from public.orders where id=p_id for update;
 if o.id is null or (o.owner_id<>auth.uid() and not a) then raise exception 'Not authorized'; end if;
 allowed:=case o.status
 when 'draft' then array['submitted','cancelled'] when 'submitted' then array['reviewing','cancelled']
 when 'reviewing' then array['awaiting_customer_approval','cancelled'] when 'awaiting_customer_approval' then array['approved','reviewing','cancelled']
 when 'approved' then array['awaiting_deposit','cancelled'] when 'awaiting_deposit' then array['paid_deposit','cancelled']
 when 'paid_deposit' then array['designing','printing','cancelled'] when 'designing' then array['awaiting_customer_approval','printing','cancelled']
 when 'printing' then array['finishing','cancelled'] when 'finishing' then array['ready','printing','cancelled']
 when 'ready' then array['shipped','completed'] when 'shipped' then array['completed'] else array[]::text[] end;
 if not (p_to::text=any(allowed)) then raise exception 'Illegal transition'; end if;
 if not a and not ((o.status='draft' and p_to='submitted') or (o.status='awaiting_customer_approval' and p_to in ('approved','reviewing')) or (o.status='shipped' and p_to='completed')) then raise exception 'Admin required'; end if;
 if p_to='approved' and (o.final_design_file_id is null or not exists(select 1 from public.quotes where id=o.quote_id and status='final' and expires_at>now())) then raise exception 'Actual final design and valid final quote required'; end if;
 if p_to='paid_deposit' and not exists(select 1 from public.payments where order_id=o.id and verified) then raise exception 'Manually verified deposit required'; end if;
 if p_to='approved' then update public.quotes set status='accepted' where id=o.quote_id; end if;
 update public.orders set status=p_to,final_design_approved=case when p_to='approved' then true when p_to='reviewing' then false else final_design_approved end where id=p_id;
 insert into public.order_events(order_id,owner_id,actor_id,from_status,to_status,note) values(o.id,o.owner_id,auth.uid(),o.status,p_to,left(p_note,2000));
 insert into public.notifications(owner_id,order_id,message) values(o.owner_id,o.id,'Order status: '||p_to);
end; $$;

-- Atomic reservation; unique redemption prevents a retry consuming a second slot.
create function public.reserve_promotion(p_promo uuid,p_quote uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare q public.quotes; n integer; begin
 select * into q from public.quotes where id=p_quote;
 if q.id is null then raise exception 'Unknown quote'; end if;
 if exists(select 1 from public.promotion_redemptions where promotion_id=p_promo and quote_id=p_quote) then return true; end if;
 update public.promotions set used=used+1 where id=p_promo and active and now()>=starts_at and now()<ends_at and (usage_limit is null or used<usage_limit) and (q.estimate->>'subtotal')::numeric>=minimum_total;
 get diagnostics n=row_count;if n=0 then return false; end if;
 insert into public.promotion_redemptions(promotion_id,owner_id,quote_id) values(p_promo,q.owner_id,p_quote) on conflict do nothing;
 get diagnostics n=row_count;if n=0 then update public.promotions set used=used-1 where id=p_promo; end if; return true;
end; $$;

create function public.claim_preview_job() returns setof public.preview_jobs language sql security definer set search_path='' as $$
 with pick as (select id from public.preview_jobs where state in ('queued','processing') and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 1)
 update public.preview_jobs j set state='processing',lease_until=now()+interval '90 seconds',started_at=coalesce(started_at,now()) from pick where j.id=pick.id returning j.*;
$$;
create function public.inventory_adjust(p_material uuid,p_delta numeric,p_kind text,p_reason text,p_order uuid default null) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'Admin MFA required'; end if;
 update public.materials set available_grams=available_grams+p_delta where id=p_material and available_grams+p_delta>=0;
 if not found then raise exception 'Insufficient stock'; end if;
 insert into public.inventory_transactions(material_id,order_id,delta_grams,kind,reason) values(p_material,p_order,p_delta,p_kind,p_reason);
end; $$;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.transition_order(uuid,public.order_status,text),public.inventory_adjust(uuid,numeric,text,text,uuid) to authenticated;
grant execute on all functions in schema public to service_role;
insert into storage.buckets(id,name,public,file_size_limit) values('customer-private','customer-private',false,4194304) on conflict(id) do nothing;
-- Storage reads and writes are mediated by checked server routes; no browser Storage policies.
