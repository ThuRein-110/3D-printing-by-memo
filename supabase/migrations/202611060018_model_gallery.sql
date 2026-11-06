-- Marketplace discovery contains approved public products only, never source-only references.
drop policy showcase_read on public.catalog_models;
create or replace function public.catalog_categories() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (select distinct category from public.catalog_models where visible and commercial_allowed and license_approved and printability='approved') c
$$;
create or replace function public.browse_catalog(p_seed uuid,p_page integer default 0,p_query text default '',p_category text default '',p_min numeric default null,p_max numeric default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if p_seed is null or p_page<0 or p_page>1000 or length(p_query)>160 or length(p_category)>80 or p_min<0 or p_max<0 then raise exception 'Invalid catalog browse request';end if;
 with eligible as (
  select * from public.catalog_models where visible and commercial_allowed and license_approved and printability='approved'
  and (p_query='' or search_document@@websearch_to_tsquery('simple',p_query) or position(lower(p_query) in lower(name||' '||description||' '||array_to_string(tags,' ')))>0)
  and (p_category='' or category=p_category) and (p_min is null or starting_price>=p_min) and (p_max is null or starting_price<=p_max)
 ), batch as (select * from eligible order by md5(id::text||p_seed::text),id limit 8 offset p_page*8)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(batch) order by md5(batch.id::text||p_seed::text),batch.id) from batch),'[]'::jsonb),'count',(select count(*) from eligible)) into result;
 return result;
end;$$;
create table public.catalog_favorites(
 owner_id uuid not null default auth.uid() references auth.users on delete cascade,
 model_id uuid not null references public.catalog_models on delete cascade,
 created_at timestamptz not null default now(),primary key(owner_id,model_id)
);
alter table public.catalog_favorites enable row level security;
grant select,insert,delete on public.catalog_favorites to authenticated;
grant all on public.catalog_favorites to service_role;
create policy own_read on public.catalog_favorites for select to authenticated using(owner_id=auth.uid() and exists(select 1 from public.catalog_models m where m.id=model_id and m.visible and m.commercial_allowed and m.license_approved and m.printability='approved'));
create policy own_insert on public.catalog_favorites for insert to authenticated with check(owner_id=auth.uid() and exists(select 1 from public.catalog_models m where m.id=model_id and m.visible and m.commercial_allowed and m.license_approved and m.printability='approved'));
create policy own_delete on public.catalog_favorites for delete to authenticated using(owner_id=auth.uid());
