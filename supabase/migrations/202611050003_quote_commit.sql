-- A quote and its optional promotion slot commit together. Only checked server handlers can invoke this.
create function public.commit_quote(p_record jsonb,p_promo uuid default null,p_regular jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare qid uuid;begin
 insert into public.quotes(id,owner_id,request_key,service,configuration,snapshot,estimate)
 values((p_record->>'id')::uuid,(p_record->>'owner_id')::uuid,(p_record->>'request_key')::uuid,p_record->>'service',p_record->'configuration',p_record->'snapshot',p_record->'estimate')
 on conflict(owner_id,request_key) do nothing returning id into qid;
 if qid is null then select id into qid from public.quotes where owner_id=(p_record->>'owner_id')::uuid and request_key=(p_record->>'request_key')::uuid;return qid;end if;
 if p_promo is not null and not public.reserve_promotion(p_promo,qid) then
  -- Trigger protects estimates even before acceptance: no updates. Replace the uncommitted record atomically.
  delete from public.quotes where id=qid;
  insert into public.quotes(id,owner_id,request_key,service,configuration,snapshot,estimate)
  values(qid,(p_record->>'owner_id')::uuid,(p_record->>'request_key')::uuid,p_record->>'service',p_record->'configuration',p_record->'snapshot',p_regular);
 end if;
 insert into public.pricing_snapshots(owner_id,quote_id,rates) values((p_record->>'owner_id')::uuid,qid,p_record->'snapshot');
 return qid;
end; $$;
revoke execute on function public.commit_quote(jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.commit_quote(jsonb,uuid,jsonb) to service_role;
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.profiles(id) values(new.id);
 insert into public.customers(owner_id) values(new.id);
 return new;
end; $$;
create trigger create_profile after insert on auth.users for each row execute function public.new_profile();
revoke execute on function public.new_profile() from public,anon,authenticated;
