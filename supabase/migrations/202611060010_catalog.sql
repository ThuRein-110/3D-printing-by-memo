-- Additive catalog and immutable order provenance. Existing quote snapshots stay unchanged.
create table public.catalog_assets(
 id uuid primary key default gen_random_uuid(), uploader_id uuid not null references auth.users,
 path text unique not null, filename text not null, mime text not null,
 kind text not null check(kind in ('image','mesh')), bytes integer not null check(bytes between 1 and 4194304),
 analysis jsonb, created_at timestamptz not null default now()
);
create table public.catalog_models(
 id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
 source_kind text not null check(source_kind in ('creality','owned','licensed')), source_url text not null default '',
 creator text not null, creator_url text not null default '', category text not null, tags text[] not null default '{}',
 license_name text not null, license_url text not null default '', commercial_allowed boolean not null default false,
 license_approved boolean not null default false, preview_allowed boolean not null default false,
 printability text not null default 'pending' check(printability in ('pending','approved','rejected')),
 visible boolean not null default false, available boolean not null default true,
 mesh_asset_id uuid references public.catalog_assets, image_asset_id uuid references public.catalog_assets,
 starting_price numeric check(starting_price>=100), lead_time_days integer check(lead_time_days between 1 and 365), search_document tsvector,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not visible or (commercial_allowed and license_approved and printability='approved')),
 check(not visible or source_kind<>'owned' or mesh_asset_id is not null)
);
create index catalog_search on public.catalog_models(category,created_at desc) where visible;
create index catalog_text_search on public.catalog_models using gin(search_document);
create function public.catalog_categories() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (select distinct category from public.catalog_models where visible and commercial_allowed and license_approved and printability='approved') c$$;
revoke all on function public.catalog_categories() from public;
grant execute on function public.catalog_categories() to anon,authenticated,service_role;
create table public.model_license_reviews(
 id uuid primary key default gen_random_uuid(), model_id uuid not null references public.catalog_models,
 reviewer_id uuid not null references auth.users, commercial_allowed boolean not null, approved boolean not null,
 note text not null check(length(note)>0), record jsonb not null, created_at timestamptz not null default now()
);
create table public.model_order_snapshots(
 quote_id uuid primary key references public.quotes on delete cascade, owner_id uuid not null references auth.users,
 model_id uuid not null references public.catalog_models, metadata jsonb not null, created_at timestamptz not null default now()
);
alter table public.orders add column final_catalog_asset_id uuid references public.catalog_assets;
create table public.quote_cost_reviews(quote_id uuid primary key references public.quotes,reviewer_id uuid not null references auth.users,review jsonb not null,created_at timestamptz not null default now());
alter table public.quote_cost_reviews enable row level security;
create policy admin_read on public.quote_cost_reviews for select to authenticated using(public.is_admin());
grant select on public.quote_cost_reviews to authenticated;
grant all on public.quote_cost_reviews to service_role;
create function public.protect_cost_review() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.quotes where id=new.quote_id and status<>'accepted' for update;
 if not found then raise exception 'Accepted quote cost review is immutable';end if;return new;
end;$$;
create trigger cost_review_guard before insert or update on public.quote_cost_reviews for each row execute function public.protect_cost_review();
revoke all on function public.protect_cost_review() from public,anon,authenticated;
alter table public.catalog_assets enable row level security;
alter table public.catalog_models enable row level security;
alter table public.model_license_reviews enable row level security;
alter table public.model_order_snapshots enable row level security;
create policy admin_read on public.catalog_assets for select to authenticated using(public.is_admin());
create policy admin_read on public.catalog_models for select to authenticated using(public.is_admin());
create policy approved_read on public.catalog_models for select to anon,authenticated using(visible and commercial_allowed and license_approved and printability='approved');
create policy admin_read on public.model_license_reviews for select to authenticated using(public.is_admin());
create policy own_snapshot on public.model_order_snapshots for select to authenticated using(owner_id=auth.uid() or public.is_admin());
grant select on public.catalog_models to anon,authenticated;
grant select on public.catalog_assets,public.model_license_reviews,public.model_order_snapshots to authenticated;
grant all on public.catalog_assets,public.catalog_models,public.model_license_reviews,public.model_order_snapshots to service_role;
insert into storage.buckets(id,name,public,file_size_limit) values('catalog-private','catalog-private',false,4194304) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;
create trigger model_snapshot_immutable before update on public.model_order_snapshots for each row execute function public.immutable_record();
create trigger license_review_immutable before update on public.model_license_reviews for each row execute function public.immutable_record();
create trigger catalog_audit after insert or update on public.catalog_models for each row execute function public.audit_change();

create function public.save_catalog_model(p_id uuid,p_values jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.catalog_models; mid uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not public.is_admin() then raise exception 'Admin MFA required'; end if;
 if length(trim(coalesce(p_values->>'review_note','')))=0 then raise exception 'License review evidence required'; end if;
 v:=jsonb_populate_record(null::public.catalog_models,p_values);
 if v.mesh_asset_id is not null and not exists(select 1 from public.catalog_assets where id=v.mesh_asset_id and kind='mesh') then raise exception 'Catalog mesh required';end if;
 if v.image_asset_id is not null and not exists(select 1 from public.catalog_assets where id=v.image_asset_id and kind='image') then raise exception 'Catalog image required';end if;
 insert into public.catalog_models(id,name,description,source_kind,source_url,creator,creator_url,category,tags,license_name,license_url,commercial_allowed,license_approved,preview_allowed,printability,visible,available,mesh_asset_id,image_asset_id,starting_price,lead_time_days)
 values(mid,v.name,v.description,v.source_kind,v.source_url,v.creator,v.creator_url,v.category,v.tags,v.license_name,v.license_url,v.commercial_allowed,v.license_approved,v.preview_allowed,v.printability,v.visible,v.available,v.mesh_asset_id,v.image_asset_id,v.starting_price,v.lead_time_days)
 on conflict(id) do update set name=excluded.name,description=excluded.description,source_kind=excluded.source_kind,source_url=excluded.source_url,creator=excluded.creator,creator_url=excluded.creator_url,category=excluded.category,tags=excluded.tags,license_name=excluded.license_name,license_url=excluded.license_url,commercial_allowed=excluded.commercial_allowed,license_approved=excluded.license_approved,preview_allowed=excluded.preview_allowed,printability=excluded.printability,visible=excluded.visible,available=excluded.available,mesh_asset_id=excluded.mesh_asset_id,image_asset_id=excluded.image_asset_id,starting_price=excluded.starting_price,lead_time_days=excluded.lead_time_days,updated_at=now();
 update public.catalog_models set search_document=to_tsvector('simple',name||' '||description||' '||category||' '||array_to_string(tags,' ')) where id=mid;
 insert into public.model_license_reviews(model_id,reviewer_id,commercial_allowed,approved,note,record) values(mid,auth.uid(),v.commercial_allowed,v.license_approved,p_values->>'review_note',p_values-'review_note');
 return mid;
end;$$;
revoke all on function public.save_catalog_model(uuid,jsonb) from public,anon;
grant execute on function public.save_catalog_model(uuid,jsonb) to authenticated;

alter table public.promotions add column allow_below_cost boolean not null default false;
alter table public.promotions add column authorization_note text not null default '';
alter table public.promotions add constraint promotion_authorization check(not allow_below_cost or length(trim(authorization_note))>0);
revoke select on public.promotions from anon,authenticated;
grant select(id,name,kind,value,starts_at,ends_at,usage_limit,used,active,minimum_total,created_at) on public.promotions to anon,authenticated;

-- Append new rules, preserving all prior versions. Only the old business minimum changes.
alter table public.pricing_rules add column reviewed boolean not null default false;
insert into public.pricing_rules(rates,effective_at,active,material_id,service)
select jsonb_set(rates,'{basicMinimum}','100'),now(),true,material_id,service from (
 select distinct on(material_id,service) * from public.pricing_rules where active and effective_at<=now() order by material_id,service,effective_at desc,id
) latest where (rates->>'basicMinimum')::numeric=300;
-- A fresh version gives every new catalog quotation a durable rule identifier.
-- Operating costs are illustrative until an administrator publishes reviewed rates.
insert into public.pricing_rules(rates,effective_at,active)
select '{"filamentKg":700,"machineHour":25,"electricityKwh":5,"averageKw":0.25,"laborHour":150,"designHour":300,"finishingHour":150,"supportFraction":0.15,"setup":50,"basicMinimum":100,"customMinimum":1500,"packaging":20,"hardware":0,"failureFraction":0.1,"overheadFraction":0.1,"shipping":0,"taxFraction":0,"margin":0.4,"rushFraction":0,"discountFraction":0}'::jsonb,now(),true
where not exists(select 1 from public.pricing_rules where active and material_id is null and service is null and effective_at<=now());

create or replace function public.commit_quote(p_record jsonb,p_promo uuid default null,p_regular jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare qid uuid; mid uuid; m public.catalog_models; meta jsonb; begin
 mid:=nullif(p_record->'configuration'->>'catalogModelId','')::uuid;
 if mid is not null then
  select * into m from public.catalog_models where id=mid for share;
  if m.id is null or not(m.visible and m.available and m.commercial_allowed and m.license_approved and m.printability='approved') then raise exception 'Catalog model unavailable';end if;
  if not exists(select 1 from public.materials where id=(p_record->'configuration'->>'materialId')::uuid and visible and available_grams>0 and upper(name)='PETG' and lower(color) in ('black','white','grey','gray')) then raise exception 'Selected color is unavailable';end if;
 end if;
 insert into public.quotes(id,owner_id,request_key,service,configuration,snapshot,estimate)
 values((p_record->>'id')::uuid,(p_record->>'owner_id')::uuid,(p_record->>'request_key')::uuid,p_record->>'service',p_record->'configuration',p_record->'snapshot',p_record->'estimate')
 on conflict(owner_id,request_key) do nothing returning id into qid;
 if qid is null then select id into qid from public.quotes where owner_id=(p_record->>'owner_id')::uuid and request_key=(p_record->>'request_key')::uuid;return qid;end if;
 if p_promo is not null and not public.reserve_promotion(p_promo,qid) then
  delete from public.quotes where id=qid;
  insert into public.quotes(id,owner_id,request_key,service,configuration,snapshot,estimate)
  values(qid,(p_record->>'owner_id')::uuid,(p_record->>'request_key')::uuid,p_record->>'service',p_record->'configuration',p_record->'snapshot',p_regular);
 end if;
 insert into public.pricing_snapshots(owner_id,quote_id,rates) values((p_record->>'owner_id')::uuid,qid,p_record->'snapshot');
 if mid is not null then
  meta:=jsonb_build_object('model',to_jsonb(m)-'search_document','selection',p_record->'configuration','pricingRuleId',p_record->'estimate'->'pricingRuleId','price', (select jsonb_build_object('total',estimate->'total','minimum',estimate->'minimum','confidence',estimate->'confidence') from public.quotes where id=qid),'material',p_record->'catalog_material','file',p_record->'catalog_file');
  insert into public.model_order_snapshots(quote_id,owner_id,model_id,metadata) values(qid,(p_record->>'owner_id')::uuid,mid,meta);
 end if;
 return qid;
end;$$;

-- New quotes use their frozen minimum. Legacy snapshots without a minimum keep the old floor.
create or replace function public.issue_final_quote(p_id uuid,p_total numeric,p_notes text,p_design uuid) returns void language plpgsql security definer set search_path='' as $$
declare q public.quotes; floor numeric;cost numeric;catalog_asset uuid;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 select * into q from public.quotes where id=p_id for update;
 if q.id is null or q.status='accepted' then raise exception 'Quote cannot be revised';end if;
 floor:=case when q.service in ('photo','custom') then coalesce((q.snapshot->>'customMinimum')::numeric,1500) else coalesce((q.snapshot->>'basicMinimum')::numeric,300) end;
 cost:=coalesce((select (review->>'productionCost')::numeric from public.quote_cost_reviews where quote_id=q.id),(q.estimate->>'productionCost')::numeric,0);
 if not coalesce((q.estimate->>'allowBelowCost')::boolean,false) then floor:=greatest(floor,cost);end if;
 if p_total < (floor*(1+coalesce((q.snapshot->>'taxFraction')::numeric,0))+coalesce((q.snapshot->>'shipping')::numeric,0)) then raise exception 'Service minimum, tax and shipping required';end if;
 if p_design is null then
  select m.mesh_asset_id into catalog_asset from public.model_order_snapshots s join public.catalog_models m on m.id=s.model_id join public.catalog_assets a on a.id=m.mesh_asset_id and a.kind='mesh' where s.quote_id=q.id and m.commercial_allowed and m.license_approved and m.printability='approved';
  if catalog_asset is null then raise exception 'Actual licensed final mesh required';end if;
  if not exists(select 1 from public.quote_cost_reviews where quote_id=q.id) then raise exception 'Verified slicer review required';end if;
 elsif not exists(select 1 from public.customer_files where id=p_design and owner_id=q.owner_id and kind='mesh') then raise exception 'Customer-owned final mesh required';end if;
 update public.quotes set final_total=p_total,notes=left(p_notes,4000),status='final',expires_at=now()+interval '14 days' where id=p_id;
 update public.orders set final_design_file_id=p_design,final_catalog_asset_id=catalog_asset,final_design_approved=false where quote_id=p_id;
 insert into public.notifications(owner_id,message) values(q.owner_id,'A final quotation has been issued. Please review your order.');
end;$$;

-- A private licensed catalog mesh can be reviewed without distributing its file.
create or replace function public.transition_order(p_id uuid,p_to public.order_status,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
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
 if p_to='approved' and ((o.final_design_file_id is null and o.final_catalog_asset_id is null) or not exists(select 1 from public.quotes where id=o.quote_id and status='final' and expires_at>now())) then raise exception 'Actual final design and valid final quote required'; end if;
 if p_to='paid_deposit' and not exists(select 1 from public.payments where order_id=o.id and verified) then raise exception 'Manually verified deposit required'; end if;
 if p_to='approved' then update public.quotes set status='accepted' where id=o.quote_id; end if;
 update public.orders set status=p_to,final_design_approved=case when p_to='approved' then true when p_to='reviewing' then false else final_design_approved end where id=p_id;
 insert into public.order_events(order_id,owner_id,actor_id,from_status,to_status,note) values(o.id,o.owner_id,auth.uid(),o.status,p_to,left(p_note,2000));
 insert into public.notifications(owner_id,order_id,message) values(o.owner_id,o.id,'Order status: '||p_to);
end; $$;
