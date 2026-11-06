-- Seeded eight-item discovery; the same seed keeps incremental pages stable.
alter table public.catalog_models add column showcase_visible boolean not null default false;
alter table public.catalog_models add constraint reference_only_showcase check(not showcase_visible or (
 source_kind='creality' and source_url<>'' and not visible and not available and not commercial_allowed and not license_approved
 and not preview_allowed and mesh_asset_id is null and image_asset_id is null and starting_price is null and lead_time_days is null
));
create policy showcase_read on public.catalog_models for select to anon,authenticated using(showcase_visible);
create or replace function public.catalog_categories() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (select distinct category from public.catalog_models where showcase_visible or (visible and commercial_allowed and license_approved and printability='approved')) c$$;
create function public.browse_catalog(p_seed uuid,p_page integer default 0,p_query text default '',p_category text default '',p_min numeric default null,p_max numeric default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if p_seed is null or p_page<0 or p_page>1000 or length(p_query)>160 or length(p_category)>80 or p_min<0 or p_max<0 then raise exception 'Invalid catalog browse request';end if;
 with eligible as (
  select * from public.catalog_models where (showcase_visible or (visible and commercial_allowed and license_approved and printability='approved'))
  and (p_query='' or search_document@@websearch_to_tsquery('simple',p_query))
  and (p_category='' or category=p_category) and (p_min is null or starting_price>=p_min) and (p_max is null or starting_price<=p_max)
 ), batch as (select * from eligible order by md5(id::text||p_seed::text),id limit 8 offset p_page*8)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(batch) order by md5(batch.id::text||p_seed::text),batch.id) from batch),'[]'::jsonb),'count',(select count(*) from eligible)) into result;
 return result;
end;$$;
revoke all on function public.browse_catalog(uuid,integer,text,text,numeric,numeric) from public,anon,authenticated;
grant execute on function public.browse_catalog(uuid,integer,text,text,numeric,numeric) to service_role;

create or replace function public.save_catalog_model(p_id uuid,p_values jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.catalog_models; mid uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not public.is_admin() then raise exception 'Admin MFA required'; end if;
 if length(trim(coalesce(p_values->>'review_note','')))=0 then raise exception 'License review evidence required'; end if;
 v:=jsonb_populate_record(null::public.catalog_models,p_values);
 if v.mesh_asset_id is not null and not exists(select 1 from public.catalog_assets where id=v.mesh_asset_id and kind='mesh') then raise exception 'Catalog mesh required';end if;
 if v.image_asset_id is not null and not exists(select 1 from public.catalog_assets where id=v.image_asset_id and kind='image') then raise exception 'Catalog image required';end if;
 insert into public.catalog_models(id,name,description,source_kind,source_url,creator,creator_url,category,tags,license_name,license_url,commercial_allowed,license_approved,preview_allowed,printability,visible,available,mesh_asset_id,image_asset_id,starting_price,lead_time_days,showcase_visible)
 values(mid,v.name,v.description,v.source_kind,v.source_url,v.creator,v.creator_url,v.category,v.tags,v.license_name,v.license_url,v.commercial_allowed,v.license_approved,v.preview_allowed,v.printability,v.visible,v.available,v.mesh_asset_id,v.image_asset_id,v.starting_price,v.lead_time_days,coalesce(v.showcase_visible,false))
 on conflict(id) do update set name=excluded.name,description=excluded.description,source_kind=excluded.source_kind,source_url=excluded.source_url,creator=excluded.creator,creator_url=excluded.creator_url,category=excluded.category,tags=excluded.tags,license_name=excluded.license_name,license_url=excluded.license_url,commercial_allowed=excluded.commercial_allowed,license_approved=excluded.license_approved,preview_allowed=excluded.preview_allowed,printability=excluded.printability,visible=excluded.visible,available=excluded.available,mesh_asset_id=excluded.mesh_asset_id,image_asset_id=excluded.image_asset_id,starting_price=excluded.starting_price,lead_time_days=excluded.lead_time_days,showcase_visible=excluded.showcase_visible,updated_at=now();
 update public.catalog_models set search_document=to_tsvector('simple',name||' '||description||' '||category||' '||array_to_string(tags,' ')) where id=mid;
 insert into public.model_license_reviews(model_id,reviewer_id,commercial_allowed,approved,note,record) values(mid,auth.uid(),v.commercial_allowed,v.license_approved,p_values->>'review_note',p_values-'review_note');
 return mid;
end;$$;
