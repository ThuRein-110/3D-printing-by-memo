-- Additive customer verification, security monitoring and versioned student offers.
create table public.student_verifications(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),
 method text not null check(method in ('email','oidc','saml')),verified_email text not null unique check(verified_email=lower(verified_email) and split_part(verified_email,'@',2)='lamduan.mfu.ac.th'),
 verified_at timestamptz not null default now(),expires_at timestamptz not null,
 enrollment_status text check(enrollment_status in ('active','inactive')),revoked_at timestamptz,unique(owner_id),check(expires_at>verified_at)
);
create table public.student_verification_audit(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),actor_id uuid,action text not null,created_at timestamptz not null default now());
create table public.student_challenges(owner_id uuid primary key references public.profiles(id),email text not null,code_hash text not null,expires_at timestamptz not null,attempts integer not null default 0 check(attempts>=0));
create table public.customer_security_events(id uuid primary key default gen_random_uuid(),owner_id uuid references public.profiles(id),kind text not null check(kind in ('login_success','login_failure','oauth_success','oauth_failure','password_recovery','password_changed','mfa_verified','mfa_removed','sessions_revoked','verification_success','verification_revoked')),subject_hash text,network_hash text,suspicious boolean not null default false,created_at timestamptz not null default now());
create index security_recent on public.customer_security_events(created_at);
create index security_subject on public.customer_security_events(subject_hash,created_at);
create table public.student_discount_rules(
 id uuid primary key default gen_random_uuid(),name text not null default 'MFU student',kind text not null default 'percentage' check(kind in ('percentage','fixed')),
 value numeric not null default 10 check(value>=0 and (kind<>'percentage' or value<=100)),active boolean not null default false,
 starts_at timestamptz not null default now(),ends_at timestamptz not null default now()+interval '1 year',minimum_total numeric not null default 100 check(minimum_total>=0),
 usage_limit integer check(usage_limit>0),per_identity_limit integer not null default 100 check(per_identity_limit>0),
 stack_early_bird boolean not null default false,minimum_profit numeric not null default 0 check(minimum_profit>=0),minimum_margin numeric not null default 0 check(minimum_margin>=0 and minimum_margin<1),
 require_enrollment boolean not null default false,reverify_days integer not null default 180 check(reverify_days between 1 and 365),created_at timestamptz not null default now(),check(ends_at>starts_at)
);
insert into public.student_discount_rules(name) values('MFU student 10% (pending admin activation)');
create table public.student_discount_redemptions(quote_id uuid primary key references public.quotes(id) on delete cascade,rule_id uuid not null references public.student_discount_rules(id),verification_id uuid not null references public.student_verifications(id),created_at timestamptz not null default now());
do $$ declare t text;begin foreach t in array array['student_verifications','student_verification_audit','student_challenges','customer_security_events','student_discount_rules','student_discount_redemptions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using(public.is_admin())',t);
 end loop;end;$$;
create policy own_verification on public.student_verifications for select to authenticated using(owner_id=auth.uid());
-- No customer policies on raw security/challenge/audit records. Safe history is served by the API.
create trigger audit_student_rules after insert or update or delete on public.student_discount_rules for each row execute function public.audit_change();

create function public.verify_student(p_owner uuid,p_email text,p_method text default 'email',p_enrollment text default null,p_expires timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare days integer;begin
 if exists(select 1 from public.student_verifications where owner_id=p_owner and (verified_email<>lower(p_email) or revoked_at is not null)) then raise exception 'Verification requires administrator review';end if;
 if p_method not in ('email','oidc','saml') or (p_method='email' and (p_enrollment is not null or p_expires is not null)) or (p_method<>'email' and (p_expires is null or p_expires<=now())) then raise exception 'Invalid verification';end if;
 select coalesce(min(reverify_days),180) into days from public.student_discount_rules where active;
 insert into public.student_verifications(owner_id,verified_email,method,expires_at,enrollment_status)
 values(p_owner,lower(p_email),p_method,least(now()+make_interval(days=>days),coalesce(p_expires,now()+make_interval(days=>days))),p_enrollment)
 on conflict(owner_id) do update set verified_email=excluded.verified_email,method=excluded.method,verified_at=now(),expires_at=excluded.expires_at,enrollment_status=excluded.enrollment_status,revoked_at=null;
 insert into public.student_verification_audit(owner_id,actor_id,action) values(p_owner,p_owner,'verified:'||p_method);
end;$$;
create function public.consume_student_challenge(p_owner uuid,p_hash text) returns text language plpgsql security definer set search_path='' as $$
declare c public.student_challenges;begin
 select * into c from public.student_challenges where owner_id=p_owner for update;
 if c.owner_id is null or c.expires_at<=now() or c.attempts>=5 then return null;end if;
 update public.student_challenges set attempts=attempts+1 where owner_id=p_owner;
 if c.code_hash<>p_hash then return null;end if;
 delete from public.student_challenges where owner_id=p_owner;return c.email;
end;$$;
-- A quote insert trigger computes eligibility and freezes the result in the existing immutable estimate.
create function public.student_price(p_owner uuid,p_estimate jsonb,p_snapshot jsonb,p_reserve boolean default false,p_quote uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.student_verifications;r public.student_discount_rules;amount numeric;cost numeric;floor numeric;sub numeric;begin
 select * into v from public.student_verifications where owner_id=p_owner and revoked_at is null and expires_at>now();
 if v.id is null then return p_estimate;end if;
 -- Serialize identity and offer limits, including competing requests from the same customer.
 perform 1 from public.student_verifications where id=v.id for update;
 select * into r from public.student_discount_rules where active and starts_at<=now() and ends_at>now() order by created_at desc,id limit 1 for update;
 if r.id is null or v.verified_at+make_interval(days=>r.reverify_days)<=now() or (r.require_enrollment and v.enrollment_status is distinct from 'active') or
 coalesce((p_estimate->>'subtotal')::numeric,0)<r.minimum_total or (not r.stack_early_bird and nullif(p_estimate->>'promotion','') is not null) or
 (r.usage_limit is not null and (select count(*) from public.student_discount_redemptions where rule_id=r.id)>=r.usage_limit) or
 (select count(*) from public.student_discount_redemptions where rule_id=r.id and verification_id=v.id)>=r.per_identity_limit then return p_estimate;end if;
 cost:=coalesce((p_estimate->>'productionCost')::numeric,0);
 floor:=greatest(coalesce((p_estimate->>'minimum')::numeric,100),cost+r.minimum_profit,cost/(1-r.minimum_margin));
 amount:=case when r.kind='percentage' then (p_estimate->>'subtotal')::numeric*r.value/100 else r.value end;
 sub:=round(greatest(floor,(p_estimate->>'subtotal')::numeric-amount),2);
 -- Never increase a price when an existing promotion went below this offer's floor.
 if sub>=(p_estimate->>'subtotal')::numeric then return p_estimate;end if;
 if p_reserve then insert into public.student_discount_redemptions(quote_id,rule_id,verification_id) values(p_quote,r.id,v.id);end if;
 return p_estimate||jsonb_build_object('subtotal',sub,'tax',round(sub*coalesce((p_snapshot->>'taxFraction')::numeric,0),2),'total',sub+round(sub*coalesce((p_snapshot->>'taxFraction')::numeric,0),2)+coalesce((p_estimate->>'shipping')::numeric,0),'discount',coalesce((p_estimate->>'original')::numeric,sub)-sub,'profitAfterLabor',sub-cost,'margin',(sub-cost)/nullif(sub,0),'contribution',sub-coalesce((p_estimate->>'cashExpenses')::numeric,0),'studentDiscount',jsonb_build_object('ruleId',r.id,'verificationId',v.id,'kind',r.kind,'value',r.value,'amount',(p_estimate->>'subtotal')::numeric-sub,'verifiedAt',v.verified_at,'expiresAt',v.expires_at,'terms',to_jsonb(r)));
end;$$;
-- AFTER insert is needed for the redemption FK. Update NEW in BEFORE, reserve in AFTER under the same transaction locks.
create function public.price_student_quote() returns trigger language plpgsql security definer set search_path='' as $$ begin new.estimate:=public.student_price(new.owner_id,new.estimate,new.snapshot);return new;end;$$;
create function public.reserve_student_quote() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.estimate ? 'studentDiscount' then insert into public.student_discount_redemptions(quote_id,rule_id,verification_id) values(new.id,(new.estimate->'studentDiscount'->>'ruleId')::uuid,(new.estimate->'studentDiscount'->>'verificationId')::uuid);end if;return new;end;$$;
create trigger student_quote_price before insert on public.quotes for each row execute function public.price_student_quote();
create trigger student_quote_reserve after insert on public.quotes for each row execute function public.reserve_student_quote();
create function public.protect_student_final_floor() returns trigger language plpgsql security definer set search_path='' as $$
declare cost numeric;floor numeric;terms jsonb;begin
 if new.final_total is not null and new.final_total is distinct from old.final_total and old.estimate ? 'studentDiscount' then
  terms:=old.estimate->'studentDiscount'->'terms';
  cost:=coalesce((select (review->>'productionCost')::numeric from public.quote_cost_reviews where quote_id=old.id),(old.estimate->>'productionCost')::numeric,0);
  floor:=greatest(coalesce((old.estimate->>'minimum')::numeric,100),cost+coalesce((terms->>'minimum_profit')::numeric,0),cost/(1-coalesce((terms->>'minimum_margin')::numeric,0)));
  if new.final_total<round(floor*(1+coalesce((old.snapshot->>'taxFraction')::numeric,0)),2)+coalesce((old.snapshot->>'shipping')::numeric,0) then raise exception 'Student offer cost and profit floors required';end if;
 end if;return new;
end;$$;
create trigger student_final_floor before update on public.quotes for each row execute function public.protect_student_final_floor();
revoke all on function public.protect_student_final_floor() from public,anon,authenticated;
create function public.revoke_student(p_id uuid,p_restore boolean default false) returns void language plpgsql security definer set search_path='' as $$ declare o uuid;begin
 if not public.is_admin() then raise exception 'Admin MFA required';end if;
 update public.student_verifications set revoked_at=case when p_restore then null else now() end where id=p_id returning owner_id into o;
 if o is null then raise exception 'Verification not found';end if;
 insert into public.student_verification_audit(owner_id,actor_id,action) values(o,auth.uid(),case when p_restore then 'restored' else 'revoked' end);
end;$$;
create function public.prune_customer_security() returns void language plpgsql security definer set search_path='' as $$ begin
 delete from public.customer_security_events where created_at<now()-interval '30 days';
 delete from public.student_challenges where expires_at<now();
 delete from public.rate_limits where window_start<now()-interval '2 days';
end;$$;
create function public.customer_session_active(p_session uuid,p_owner uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin
 return exists(select 1 from auth.sessions where id=p_session and user_id=p_owner and (not_after is null or not_after>now()));
end;$$;
revoke all on function public.customer_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_session_active(uuid,uuid) to service_role;
revoke all on function public.verify_student(uuid,text,text,text,timestamptz),public.consume_student_challenge(uuid,text),public.student_price(uuid,jsonb,jsonb,boolean,uuid),public.price_student_quote(),public.reserve_student_quote(),public.prune_customer_security(),public.revoke_student(uuid,boolean) from public,anon,authenticated;
grant execute on function public.verify_student(uuid,text,text,text,timestamptz),public.consume_student_challenge(uuid,text),public.student_price(uuid,jsonb,jsonb,boolean,uuid),public.prune_customer_security() to service_role;
grant execute on function public.revoke_student(uuid,boolean) to authenticated;
grant insert,update on public.student_discount_rules to authenticated;
create policy admin_insert on public.student_discount_rules for insert to authenticated with check(public.is_admin());
create policy admin_update on public.student_discount_rules for update to authenticated using(public.is_admin()) with check(public.is_admin());
