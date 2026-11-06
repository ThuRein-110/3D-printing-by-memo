-- Authorized reference images are independent of commercial printing rights.
alter table public.catalog_models add column image_permission text not null default '' check(length(image_permission)<=4000);
alter table public.catalog_models drop constraint reference_only_showcase;
alter table public.catalog_models add constraint reference_only_showcase check(not showcase_visible or (
 source_kind='creality' and source_url<>'' and not visible and not available and not commercial_allowed and not license_approved
 and not preview_allowed and mesh_asset_id is null and (image_asset_id is null or length(trim(image_permission))>=20) and starting_price is null and lead_time_days is null
));
create or replace function public.save_catalog_model(p_id uuid,p_values jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.catalog_models; mid uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not public.is_admin() then raise exception 'Admin MFA required'; end if;
 if length(trim(coalesce(p_values->>'review_note','')))=0 then raise exception 'License review evidence required'; end if;
 v:=jsonb_populate_record(null::public.catalog_models,p_values);
 if v.mesh_asset_id is not null and not exists(select 1 from public.catalog_assets where id=v.mesh_asset_id and kind='mesh') then raise exception 'Catalog mesh required';end if;
 if v.image_asset_id is not null and not exists(select 1 from public.catalog_assets where id=v.image_asset_id and kind='image') then raise exception 'Catalog image required';end if;
 insert into public.catalog_models(id,name,description,source_kind,source_url,creator,creator_url,category,tags,license_name,license_url,commercial_allowed,license_approved,preview_allowed,printability,visible,available,mesh_asset_id,image_asset_id,starting_price,lead_time_days,showcase_visible,image_permission)
 values(mid,v.name,v.description,v.source_kind,v.source_url,v.creator,v.creator_url,v.category,v.tags,v.license_name,v.license_url,v.commercial_allowed,v.license_approved,v.preview_allowed,v.printability,v.visible,v.available,v.mesh_asset_id,v.image_asset_id,v.starting_price,v.lead_time_days,coalesce(v.showcase_visible,false),coalesce(v.image_permission,''))
 on conflict(id) do update set name=excluded.name,description=excluded.description,source_kind=excluded.source_kind,source_url=excluded.source_url,creator=excluded.creator,creator_url=excluded.creator_url,category=excluded.category,tags=excluded.tags,license_name=excluded.license_name,license_url=excluded.license_url,commercial_allowed=excluded.commercial_allowed,license_approved=excluded.license_approved,preview_allowed=excluded.preview_allowed,printability=excluded.printability,visible=excluded.visible,available=excluded.available,mesh_asset_id=excluded.mesh_asset_id,image_asset_id=excluded.image_asset_id,starting_price=excluded.starting_price,lead_time_days=excluded.lead_time_days,showcase_visible=excluded.showcase_visible,image_permission=excluded.image_permission,updated_at=now();
 update public.catalog_models set search_document=to_tsvector('simple',name||' '||description||' '||category||' '||array_to_string(tags,' ')) where id=mid;
 insert into public.model_license_reviews(model_id,reviewer_id,commercial_allowed,approved,note,record) values(mid,auth.uid(),v.commercial_allowed,v.license_approved,p_values->>'review_note',p_values-'review_note');
 return mid;
end;$$;
create table public.catalog_inquiries(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,
 request_key uuid not null,model_id uuid not null references public.catalog_models,
 model_snapshot jsonb not null,customer jsonb not null,selection jsonb not null,created_at timestamptz not null default now(),unique(owner_id,request_key)
);
alter table public.catalog_inquiries enable row level security;
grant select on public.catalog_inquiries to authenticated;
grant all on public.catalog_inquiries to service_role;
create policy own_read on public.catalog_inquiries for select to authenticated using(owner_id=auth.uid());
create policy admin_read on public.catalog_inquiries for select to authenticated using(public.is_admin());
create trigger inquiry_immutable before update on public.catalog_inquiries for each row execute function public.immutable_record();
create function public.submit_catalog_inquiry(p_model uuid,p_request uuid,p_customer jsonb,p_selection jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare m public.catalog_models;result uuid;axis text;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select id into result from public.catalog_inquiries where owner_id=auth.uid() and request_key=p_request;if result is not null then return result;end if;
 if not public.take_rate_limit('catalog-inquiry:'||auth.uid()::text,20,86400) then raise exception 'Rate limit exceeded';end if;
 select * into m from public.catalog_models where id=p_model for share;
 if m.id is null or not(m.showcase_visible or (m.visible and m.commercial_allowed and m.license_approved and m.printability='approved')) then raise exception 'Catalog model unavailable';end if;
 if jsonb_typeof(p_selection->'dimensions') is distinct from 'object' then raise exception 'Dimensions required';end if;
 foreach axis in array array['x','y','z'] loop
  if jsonb_typeof(p_selection->'dimensions'->axis) is distinct from 'number' or (p_selection->'dimensions'->>axis)::numeric<=0 or (p_selection->'dimensions'->>axis)::numeric>260 then raise exception 'Invalid dimensions';end if;
 end loop;
 if jsonb_typeof(p_selection->'quantity') is distinct from 'number' or (p_selection->>'quantity')::numeric<>trunc((p_selection->>'quantity')::numeric) or (p_selection->>'quantity')::integer not between 1 and 100 or coalesce(p_selection->>'color','') not in ('black','white','grey') or length(coalesce(p_selection->>'notes',''))>4000 or length(trim(coalesce(p_customer->>'name',''))) not between 1 and 120 or length(coalesce(p_customer->>'email',''))>254 or coalesce(p_customer->>'email','')!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Invalid inquiry';end if;
 insert into public.catalog_inquiries(owner_id,request_key,model_id,model_snapshot,customer,selection)
 values(auth.uid(),p_request,m.id,jsonb_build_object('title',m.name,'creator',m.creator,'source_url',m.source_url,'license_name',m.license_name,'license_url',m.license_url,'commercial_allowed',m.commercial_allowed,'license_approved',m.license_approved,'reference_only',m.showcase_visible,'image_asset_id',m.image_asset_id,'image_permission',m.image_permission),jsonb_build_object('name',p_customer->>'name','email',p_customer->>'email','accountEmail',auth.jwt()->>'email'),jsonb_build_object('dimensions',jsonb_build_object('x',p_selection->'dimensions'->'x','y',p_selection->'dimensions'->'y','z',p_selection->'dimensions'->'z'),'unit','mm','color',p_selection->>'color','quantity',p_selection->'quantity','notes',coalesce(p_selection->>'notes','')))
 on conflict(owner_id,request_key) do nothing returning id into result;
 if result is null then select id into result from public.catalog_inquiries where owner_id=auth.uid() and request_key=p_request;end if;
 return result;
end;$$;
revoke all on function public.submit_catalog_inquiry(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.submit_catalog_inquiry(uuid,uuid,jsonb,jsonb) to authenticated;
