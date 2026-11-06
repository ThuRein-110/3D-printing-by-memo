-- Preserve the original catalog records and order/inquiry history, but withdraw unlicensed references.
update public.catalog_models set showcase_visible=false,visible=false,available=false,updated_at=now()
where source_kind='creality' and (not license_approved or not commercial_allowed or image_asset_id is null or length(trim(image_permission))<20);
alter table public.catalog_models add constraint creality_published_image_evidence check(
 source_kind<>'creality' or not(visible or showcase_visible) or (image_asset_id is not null and length(trim(image_permission))>=20)
);
create table public.inspiration_images(id text primary key,metadata jsonb not null,active boolean not null default true);
alter table public.inspiration_images enable row level security;
grant select on public.inspiration_images to anon,authenticated;
grant all on public.inspiration_images to service_role;
create policy public_read on public.inspiration_images for select using(active);
insert into public.inspiration_images(id,metadata) values
('cat','{"id":"cat","title":"3D PRINTED CAT.jpg","creator":"Sumanbargavr","sourceUrl":"https://commons.wikimedia.org/wiki/File:3D_PRINTED_CAT.jpg","downloadUrl":"https://upload.wikimedia.org/wikipedia/commons/f/f1/3D_PRINTED_CAT.jpg","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","attribution":"3D PRINTED CAT.jpg by Sumanbargavr, Wikimedia Commons, CC BY-SA 4.0.","changes":"Resized and converted to WebP; metadata removed. Display may be cropped.","checkedAt":"2026-11-06","sourceSha1":"8502433b4235f561491622430f4a563fa3d0851d","sha256":"f314381bcd9abc37830b8fe74416488a42e84b5980bd799dc03e15b1a0b12162","image":"/inspiration/cat.webp","width":900,"height":1200}'::jsonb),
('keychain','{"id":"keychain","title":"Marvin Keychain.jpeg","creator":"Koenbodewes","sourceUrl":"https://commons.wikimedia.org/wiki/File:Marvin_Keychain.jpeg","downloadUrl":"https://upload.wikimedia.org/wikipedia/commons/4/45/Marvin_Keychain.jpeg","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","attribution":"Marvin Keychain.jpeg by Koenbodewes, Wikimedia Commons, CC BY-SA 4.0.","changes":"Resized and converted to WebP; metadata removed. Display may be cropped.","checkedAt":"2026-11-06","sourceSha1":"cc425bb312b30207f8a7f92326cd36fb837cdb6c","sha256":"8e23888d56e7bccc00d584dc5e6aec36193f62efa6e4db630a99cb2ac23aedad","image":"/inspiration/keychain.webp","width":628,"height":472}'::jsonb),
('vase','{"id":"vase","title":"3D Printed Vase.jpg","creator":"D Eaketts","sourceUrl":"https://commons.wikimedia.org/wiki/File:3D_Printed_Vase.jpg","downloadUrl":"https://upload.wikimedia.org/wikipedia/commons/0/04/3D_Printed_Vase.jpg","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","attribution":"3D Printed Vase.jpg by D Eaketts, Wikimedia Commons, CC BY-SA 4.0.","changes":"Resized and converted to WebP; metadata removed. Display may be cropped.","checkedAt":"2026-11-06","sourceSha1":"7f34878817c752d30aa00ac84cff71a0a708ce39","sha256":"fc24bb5aecf1db8b93b3a4265dbd32c5010cfb54e0e9aa1b998dfd868c58f059","image":"/inspiration/vase.webp","width":1200,"height":900}'::jsonb),
('flowers','{"id":"flowers","title":"Flores 3D 02.jpg","creator":"Mortymore","sourceUrl":"https://commons.wikimedia.org/wiki/File:Flores_3D_02.jpg","downloadUrl":"https://upload.wikimedia.org/wikipedia/commons/f/f0/Flores_3D_02.jpg","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0","attribution":"Flores 3D 02.jpg by Mortymore, Wikimedia Commons, CC BY 2.0.","changes":"Resized and converted to WebP; metadata removed. Display may be cropped.","checkedAt":"2026-11-06","sourceSha1":"5b09a17542c690f86ba1762704bd5bc5eb262241","sha256":"dfbaf17e1502620956c02bfc5074f620b76d6d20e99ee05f2df0de7677ed9660","image":"/inspiration/flowers.webp","width":675,"height":1200}'::jsonb),
('gears','{"id":"gears","title":"Helical planetary gear (40069995811).jpg","creator":"Robbie Sproule","sourceUrl":"https://commons.wikimedia.org/wiki/File:Helical_planetary_gear_(40069995811).jpg","downloadUrl":"https://upload.wikimedia.org/wikipedia/commons/6/61/Helical_planetary_gear_%2840069995811%29.jpg","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0","attribution":"Helical planetary gear (40069995811).jpg by Robbie Sproule, Wikimedia Commons, CC BY 2.0.","changes":"Resized and converted to WebP; metadata removed. Display may be cropped.","checkedAt":"2026-11-06","sourceSha1":"27d7b1b67cba1ab4fc4f33eab91c8752c1c38a8d","sha256":"e746a5f5afce5c3e8001f52847f1c7c557c65d733fa7773ab4f74b6fe51da93a","image":"/inspiration/gears.webp","width":1199,"height":1200}'::jsonb),
('mechanism','{"id":"mechanism","title":"Triple Gear.jpg","creator":"Saul Schleimer and Henry Segerman","sourceUrl":"https://commons.wikimedia.org/wiki/File:Triple_Gear.jpg","downloadUrl":"https://upload.wikimedia.org/wikipedia/commons/d/d0/Triple_Gear.jpg","license":"CC BY-SA 3.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/3.0","attribution":"Triple Gear.jpg by Saul Schleimer and Henry Segerman, Wikimedia Commons, CC BY-SA 3.0.","changes":"Resized and converted to WebP; metadata removed. Display may be cropped.","checkedAt":"2026-11-06","sourceSha1":"701fde3e02037761fcbfb45f9aa43326ac73c2d1","sha256":"1e18d1ae9ca52496463bae52d6f5a63d192956ddb089efac2cf7bedb3e1c3c53","image":"/inspiration/mechanism.webp","width":1200,"height":1200}'::jsonb);
create table public.inspiration_inquiries(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,
 request_key uuid not null,inspiration_id text not null references public.inspiration_images,
 image_snapshot jsonb not null,customer jsonb not null,selection jsonb not null,
 created_at timestamptz not null default now(),unique(owner_id,request_key)
);
alter table public.inspiration_inquiries enable row level security;
grant select on public.inspiration_inquiries to authenticated;
grant all on public.inspiration_inquiries to service_role;
create policy own_read on public.inspiration_inquiries for select to authenticated using(owner_id=auth.uid());
create policy admin_read on public.inspiration_inquiries for select to authenticated using(public.is_admin());
create trigger inspiration_immutable before update on public.inspiration_inquiries for each row execute function public.immutable_record();
create function public.submit_inspiration_inquiry(p_inspiration text,p_request uuid,p_customer jsonb,p_selection jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.inspiration_images;result uuid;axis text;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select id into result from public.inspiration_inquiries where owner_id=auth.uid() and request_key=p_request;if result is not null then return result;end if;
 if not public.take_rate_limit('inspiration-inquiry:'||auth.uid()::text,20,86400) then raise exception 'Rate limit exceeded';end if;
 select * into item from public.inspiration_images where id=p_inspiration and active for share;
 if item.id is null then raise exception 'Inspiration unavailable';end if;
 if p_request is null or jsonb_typeof(p_selection->'dimensions') is distinct from 'object' then raise exception 'Invalid inquiry';end if;
 foreach axis in array array['x','y','z'] loop
  if jsonb_typeof(p_selection->'dimensions'->axis) is distinct from 'number' or (p_selection->'dimensions'->>axis)::numeric<=0 or (p_selection->'dimensions'->>axis)::numeric>260 then raise exception 'Invalid dimensions';end if;
 end loop;
 if jsonb_typeof(p_selection->'quantity') is distinct from 'number' or (p_selection->>'quantity')::numeric<>trunc((p_selection->>'quantity')::numeric) or (p_selection->>'quantity')::numeric not between 1 and 100 or coalesce(p_selection->>'color','') not in ('black','white','grey') or jsonb_typeof(p_selection->'notes') is distinct from 'string' or length(p_selection->>'notes')>4000 or jsonb_typeof(p_customer->'name') is distinct from 'string' or length(trim(p_customer->>'name')) not between 1 and 120 or jsonb_typeof(p_customer->'email') is distinct from 'string' or length(p_customer->>'email')>254 or (p_customer->>'email')!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Invalid inquiry';end if;
 insert into public.inspiration_inquiries(owner_id,request_key,inspiration_id,image_snapshot,customer,selection)
 values(auth.uid(),p_request,item.id,item.metadata||jsonb_build_object('example_only',true,'service','custom','printing_permission_granted',false),jsonb_build_object('name',trim(p_customer->>'name'),'email',p_customer->>'email','accountEmail',auth.jwt()->>'email'),jsonb_build_object('dimensions',jsonb_build_object('x',p_selection->'dimensions'->'x','y',p_selection->'dimensions'->'y','z',p_selection->'dimensions'->'z'),'unit','mm','color',p_selection->>'color','quantity',p_selection->'quantity','notes',p_selection->>'notes'))
 on conflict(owner_id,request_key) do nothing returning id into result;
 if result is null then select id into result from public.inspiration_inquiries where owner_id=auth.uid() and request_key=p_request;end if;
 return result;
end;$$;
revoke all on function public.submit_inspiration_inquiry(text,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.submit_inspiration_inquiry(text,uuid,jsonb,jsonb) to authenticated;
