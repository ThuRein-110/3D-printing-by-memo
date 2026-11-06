-- Publish only an uploaded, evidenced image; do not modify print permissions.
alter table public.catalog_models add constraint public_image_permission check(image_asset_id is null or not(visible or showcase_visible) or length(trim(image_permission))>=20);
create function public.publish_catalog_thumbnail(p_model uuid,p_asset uuid,p_permission text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare m public.catalog_models;a public.catalog_assets;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 if length(trim(coalesce(p_permission,''))) not between 20 and 4000 or length(trim(coalesce(p_note,''))) not between 1 and 4000 then raise exception 'Image permission evidence required';end if;
 select * into m from public.catalog_models where id=p_model for update;
 if m.id is null then raise exception 'Catalog model not found';end if;
 select * into a from public.catalog_assets where id=p_asset and kind='image' and mime='image/jpeg';
 if a.id is null or not exists(select 1 from storage.objects where bucket_id='catalog-private' and name=a.path) then raise exception 'Uploaded image unavailable';end if;
 update public.catalog_models set image_asset_id=a.id,image_permission=trim(p_permission),updated_at=now() where id=m.id;
 insert into public.model_license_reviews(model_id,reviewer_id,commercial_allowed,approved,note,record)
 values(m.id,auth.uid(),m.commercial_allowed,m.license_approved,p_note,jsonb_build_object('action','thumbnail_publication','image_asset_id',a.id,'image_permission',trim(p_permission),'previous_image_asset_id',m.image_asset_id));
end;$$;
revoke all on function public.publish_catalog_thumbnail(uuid,uuid,text,text) from public,anon;
grant execute on function public.publish_catalog_thumbnail(uuid,uuid,text,text) to authenticated;
