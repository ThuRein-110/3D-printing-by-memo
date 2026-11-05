create function public.initial_order_event() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.order_events(order_id,owner_id,actor_id,to_status,note) values(new.id,new.owner_id,new.owner_id,new.status,'Request submitted');
 insert into public.notifications(owner_id,order_id,message) values(new.owner_id,new.id,'Your request has been submitted for review.');
 return new;
end; $$;
create trigger order_created after insert on public.orders for each row execute function public.initial_order_event();
create function public.issue_final_quote(p_id uuid,p_total numeric,p_notes text,p_design uuid) returns void language plpgsql security definer set search_path='' as $$
declare q public.quotes;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 select * into q from public.quotes where id=p_id for update;
 if q.id is null or q.status='accepted' then raise exception 'Quote cannot be revised';end if;
 if p_total < ((case when q.service in ('photo','custom') then 1500 else 300 end)*(1+coalesce((q.snapshot->>'taxFraction')::numeric,0))+coalesce((q.snapshot->>'shipping')::numeric,0)) then raise exception 'Service minimum, tax and shipping required';end if;
 if not exists(select 1 from public.customer_files where id=p_design and owner_id=q.owner_id and kind='mesh') then raise exception 'Customer-owned final mesh required';end if;
 update public.quotes set final_total=p_total,notes=left(p_notes,4000),status='final',expires_at=now()+interval '14 days' where id=p_id;
 update public.orders set final_design_file_id=p_design,final_design_approved=false where quote_id=p_id;
 insert into public.notifications(owner_id,message) values(q.owner_id,'A final quotation has been issued. Please review your order.');
end; $$;
revoke execute on function public.initial_order_event(),public.issue_final_quote(uuid,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.issue_final_quote(uuid,numeric,text,uuid) to authenticated;
create trigger quotes_audit after update on public.quotes for each row execute function public.audit_change();
create trigger gallery_audit after insert or update or delete on public.gallery_items for each row execute function public.audit_change();
