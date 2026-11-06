-- Lock before reading eligibility so concurrent admin revocation cannot race a renewal or quote.
create or replace function public.verify_student(p_owner uuid,p_email text,p_method text default 'email',p_enrollment text default null,p_expires timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare days integer;begin
 perform 1 from public.student_verifications where owner_id=p_owner for update;
 if exists(select 1 from public.student_verifications where owner_id=p_owner and (verified_email<>lower(p_email) or revoked_at is not null)) then raise exception 'Verification requires administrator review';end if;
 if p_method not in ('email','oidc','saml') or (p_method='email' and (p_enrollment is not null or p_expires is not null)) or (p_method<>'email' and (p_expires is null or p_expires<=now())) then raise exception 'Invalid verification';end if;
 select coalesce(min(reverify_days),180) into days from public.student_discount_rules where active;
 insert into public.student_verifications(owner_id,verified_email,method,expires_at,enrollment_status)
 values(p_owner,lower(p_email),p_method,least(now()+make_interval(days=>days),coalesce(p_expires,now()+make_interval(days=>days))),p_enrollment)
 on conflict(owner_id) do update set verified_email=excluded.verified_email,method=excluded.method,verified_at=now(),expires_at=excluded.expires_at,enrollment_status=excluded.enrollment_status,revoked_at=null;
 insert into public.student_verification_audit(owner_id,actor_id,action) values(p_owner,p_owner,'verified:'||p_method);
end;$$;
create or replace function public.student_price(p_owner uuid,p_estimate jsonb,p_snapshot jsonb,p_reserve boolean default false,p_quote uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.student_verifications;r public.student_discount_rules;amount numeric;cost numeric;floor numeric;sub numeric;begin
 select * into v from public.student_verifications where owner_id=p_owner and revoked_at is null and expires_at>now() for update;
 if v.id is null then return p_estimate;end if;
 -- Serialize identity and offer limits, including competing requests from the same customer.
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
