-- Public display never exposes the private consent record.
revoke select on public.gallery_items from anon,authenticated;
grant select(id,title,description,public,image_path,created_at) on public.gallery_items to anon,authenticated;
create function public.audit_role_change() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.audit_logs(actor_id,entity,entity_id,action,before_data,after_data) values(auth.uid(),'roles',coalesce(new.user_id,old.user_id),tg_op,to_jsonb(old),to_jsonb(new));return coalesce(new,old);
end; $$;
create trigger role_audit after insert or update or delete on public.roles for each row execute function public.audit_role_change();
revoke execute on function public.audit_role_change() from public,anon,authenticated;
