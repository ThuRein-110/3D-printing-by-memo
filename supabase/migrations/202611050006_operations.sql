alter table public.production_jobs add column actual_cost_thb numeric check(actual_cost_thb>=0);
alter table public.production_jobs add column actual_labor_thb numeric check(actual_labor_thb>=0);
alter table public.materials add column reserved_grams numeric not null default 0 check(reserved_grams>=0);
create table public.inventory_reservations(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,material_id uuid not null references public.materials,grams numeric not null check(grams>0),state text not null default 'reserved' check(state in ('reserved','consumed','released')),created_at timestamptz not null default now(),unique(order_id,material_id));
alter table public.inventory_reservations enable row level security;
create policy admin_only on public.inventory_reservations for select to authenticated using(public.is_admin());
revoke all on public.inventory_reservations from anon,authenticated;
grant select on public.inventory_reservations to authenticated;
grant all on public.inventory_reservations to service_role;
create function public.reserve_inventory(p_order uuid,p_material uuid,p_grams numeric) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 if p_grams<=0 then raise exception 'Positive reservation required';end if;
 perform 1 from public.orders where id=p_order for update;
 if not found then raise exception 'Order not found';end if;
 if exists(select 1 from public.inventory_reservations where order_id=p_order and material_id=p_material) then return;end if;
 update public.materials set available_grams=available_grams-p_grams,reserved_grams=reserved_grams+p_grams where id=p_material and available_grams>=p_grams;
 if not found then raise exception 'Insufficient stock';end if;
 insert into public.inventory_reservations(order_id,material_id,grams) values(p_order,p_material,p_grams);
 insert into public.inventory_transactions(order_id,material_id,delta_grams,kind,reason) values(p_order,p_material,-p_grams,'reserve','Order reservation');
end; $$;
create function public.settle_inventory(p_reservation uuid,p_consume boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.inventory_reservations;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 select * into r from public.inventory_reservations where id=p_reservation for update;
 if r.id is null then raise exception 'Reservation not found';end if;
 if r.state<>'reserved' then return;end if;
 update public.materials set reserved_grams=reserved_grams-r.grams,available_grams=available_grams+case when p_consume then 0 else r.grams end where id=r.material_id;
 update public.inventory_reservations set state=case when p_consume then 'consumed' else 'released' end where id=r.id;
 insert into public.inventory_transactions(order_id,material_id,delta_grams,kind,reason) values(r.order_id,r.material_id,case when p_consume then 0 else r.grams end,case when p_consume then 'consume' else 'release' end,'Reservation settlement');
end; $$;
create function public.operations_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 select jsonb_build_object(
 'newInquiries',(select count(*) from public.orders where status='submitted'),
 'pendingQuotes',(select count(*) from public.quotes where status in ('submitted','reviewing')),
 'ordersByStatus',(select coalesce(jsonb_object_agg(status,n),'{}') from (select status,count(*) n from public.orders group by status)s),
 'cashReceived',(select coalesce(sum(amount),0) from public.payments where verified),
 'completedOrderSales',(select coalesce(sum((q.final_total-coalesce((q.snapshot->>'shipping')::numeric,0))/(1+coalesce((q.snapshot->>'taxFraction')::numeric,0))),0) from public.orders o join public.quotes q on q.id=o.quote_id where o.status='completed' and q.status='accepted'),
 'completedRecordedCosts',(select coalesce(sum(p.actual_cost_thb),0) from public.production_jobs p join public.orders o on o.id=p.order_id where o.status='completed'),
 'completedRecordedLabor',(select coalesce(sum(p.actual_labor_thb),0) from public.production_jobs p join public.orders o on o.id=p.order_id where o.status='completed'),
 'completedOrdersMissingCosts',(select count(*) from public.orders o where o.status='completed' and (not exists(select 1 from public.production_jobs p where p.order_id=o.id) or exists(select 1 from public.production_jobs p where p.order_id=o.id and (p.actual_cost_thb is null or p.actual_labor_thb is null)))),
 'printQueue',(select count(*) from public.orders where status in ('designing','printing','finishing')),
 'lowStock',(select count(*) from public.materials where available_grams<=low_stock_grams),
 'availableGrams',(select coalesce(sum(available_grams),0) from public.materials),
 'promotionRedemptions',(select count(*) from public.promotion_redemptions),
 'failedPreviewJobs',(select count(*) from public.preview_jobs where state='failed'),
 'reservedProviderBudget',(select coalesce(sum(reserved_thb),0) from public.provider_budgets),
 'privacyRequests',(select count(*) from public.privacy_requests where status='requested')
 ) into result;return result;
end; $$;
revoke execute on function public.reserve_inventory(uuid,uuid,numeric),public.settle_inventory(uuid,boolean),public.operations_metrics() from public,anon,authenticated;
grant execute on function public.reserve_inventory(uuid,uuid,numeric),public.settle_inventory(uuid,boolean),public.operations_metrics() to authenticated;
create trigger reservations_audit after insert or update on public.inventory_reservations for each row execute function public.audit_change();
