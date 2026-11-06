import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
let db:PGlite;
const a='ae000000-0000-4000-8000-000000000001',b='ae000000-0000-4000-8000-000000000002',admin='ae000000-0000-4000-8000-000000000003';
async function user(id:string,aal='aal1'){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claims','{"aal":"${aal}"}',false);set role authenticated;`);}
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 for(const path of readdirSync('supabase/migrations').sort())await db.exec(readFileSync('supabase/migrations/'+path,'utf8').replace('create extension if not exists pgcrypto;',''));
 await db.exec(`insert into auth.users values('${a}'),('${b}'),('${admin}');insert into public.roles values('${admin}','admin');`);
});
beforeEach(async()=>{await db.exec(`reset role;delete from public.student_discount_redemptions;delete from public.pricing_snapshots;delete from public.quotes;delete from public.student_verifications;delete from public.student_verification_audit;delete from public.student_challenges;update public.student_discount_rules set active=true,kind='percentage',value=10,usage_limit=null,per_identity_limit=100,minimum_total=100,minimum_profit=0,minimum_margin=0,require_enrollment=false,reverify_days=180,stack_early_bird=false,starts_at=now()-interval '1 day',ends_at=now()+interval '1 year';`);});
afterAll(async()=>{await db?.close();});
async function verify(owner=a,email='student@lamduan.mfu.ac.th'){await db.query('select public.verify_student($1,$2)',[owner,email]);}
const base={subtotal:1000,total:1000,tax:0,shipping:20,original:1000,minimum:100,productionCost:500,cashExpenses:300};
async function price(value:Record<string,unknown>=base){return (await db.query<{p:Record<string,unknown>}>('select public.student_price($1,$2,$3) p',[a,value,{taxFraction:.07}])).rows[0].p;}
async function quote(){const id=crypto.randomUUID();await db.query('select public.commit_quote($1)',[{id,owner_id:a,request_key:id,service:'ready',configuration:{},snapshot:{taxFraction:0},estimate:base}]);return id;}
it('protects verification, raw logs, codes and rule writes with RLS and MFA',async()=>{
 await verify();await user(b);expect((await db.query('select * from public.student_verifications')).rows).toHaveLength(0);expect((await db.query('select * from public.customer_security_events')).rows).toHaveLength(0);
 await expect(db.query('select public.verify_student($1,$2)',[b,'other@lamduan.mfu.ac.th'])).rejects.toThrow('permission denied');await expect(db.exec('update public.student_discount_rules set value=90')).resolves.toBeDefined();
 await db.exec('reset role');expect((await db.query<{value:number}>('select value from public.student_discount_rules')).rows[0].value).not.toBe(90);
 await user(a);expect((await db.query('select * from public.student_verifications')).rows).toHaveLength(1);await expect(db.exec("insert into public.student_challenges(owner_id,email,code_hash,expires_at) values('"+a+"','evil','x',now())")).rejects.toThrow();
 await user(admin);expect((await db.query('select * from public.student_discount_rules')).rows).toHaveLength(0);await user(admin,'aal2');await db.exec('update public.student_discount_rules set value=12');
});
it('rejects staff domains, duplicate identities and switching to evade usage limits',async()=>{
 await expect(verify(a,'staff@mfu.ac.th')).rejects.toThrow();await verify();await expect(verify(b)).rejects.toThrow('unique');await expect(verify(a,'different@lamduan.mfu.ac.th')).rejects.toThrow('administrator review');
});
it('enforces expiry, revocation, re-verification and genuine enrollment requirements',async()=>{
 await verify();expect((await price()).subtotal).toBe(900);await db.exec('update public.student_discount_rules set require_enrollment=true');expect((await price()).subtotal).toBe(1000);
 await db.exec('update public.student_discount_rules set require_enrollment=false;update public.student_verifications set verified_at=now()-interval \'200 days\',expires_at=now()+interval \'1 day\'');expect((await price()).subtotal).toBe(1000);
 await verify();expect((await price()).subtotal).toBe(900);await user(admin,'aal2');const id=(await db.query<{id:string}>('select id from public.student_verifications')).rows[0].id;await db.query('select public.revoke_student($1)',[id]);await db.exec('reset role');expect((await price()).subtotal).toBe(1000);await expect(verify()).rejects.toThrow('administrator review');
});
it('caps fixed/percentage discounts at service, cost, profit and margin floors with correct tax',async()=>{
 await verify();expect(await price()).toMatchObject({subtotal:900,tax:63,total:983});
 await db.exec("update public.student_discount_rules set kind='fixed',value=900,minimum_profit=150,minimum_margin=.4");expect(Number((await price()).subtotal)).toBeCloseTo(833.33,2);
 expect((await price({...base,minimum:1500,subtotal:1500,original:1500})).subtotal).toBe(1500);
 await db.exec('update public.student_discount_rules set minimum_total=2000');expect((await price()).subtotal).toBe(1000);
});
it('respects Early Bird stacking and never increases an existing price',async()=>{
 await verify();expect((await price({...base,promotion:'Early Bird'})).subtotal).toBe(1000);await db.exec('update public.student_discount_rules set stack_early_bird=true');expect((await price({...base,promotion:'Early Bird'})).subtotal).toBe(900);
 expect((await price({...base,subtotal:400})).subtotal).toBe(400);
});
it('atomically caps redemptions and preserves immutable quote discounts across rule changes',async()=>{
 await verify();await db.exec('update public.student_discount_rules set usage_limit=1,per_identity_limit=1');const [one,two]=await Promise.all([quote(),quote()]);
 const rows=(await db.query<{estimate:Record<string,unknown>}>('select estimate from public.quotes order by created_at,id')).rows;expect(rows.filter(q=>q.estimate.studentDiscount)).toHaveLength(1);expect((await db.query('select * from public.student_discount_redemptions')).rows).toHaveLength(1);
 await db.exec('update public.student_discount_rules set value=50');await expect(db.query("update public.quotes set estimate='{}' where id=$1",[one])).rejects.toThrow('immutable');expect(one).not.toBe(two);
});
it('expires codes, limits guesses and consumes a valid code only once',async()=>{
 await db.query('insert into public.student_challenges values($1,$2,$3,now()+interval \'15 minutes\',0)',[a,'student@lamduan.mfu.ac.th','correct']);
 for(let i=0;i<5;i++)expect((await db.query<{c:string|null}>('select public.consume_student_challenge($1,$2) c',[a,'wrong'])).rows[0].c).toBeNull();
 expect((await db.query<{c:string|null}>('select public.consume_student_challenge($1,$2) c',[a,'correct'])).rows[0].c).toBeNull();await db.exec('update public.student_challenges set attempts=0');
 expect((await db.query<{c:string|null}>('select public.consume_student_challenge($1,$2) c',[a,'correct'])).rows[0].c).toBe('student@lamduan.mfu.ac.th');expect((await db.query<{c:string|null}>('select public.consume_student_challenge($1,$2) c',[a,'correct'])).rows[0].c).toBeNull();
});
it('rejects expired email challenges and frozen final-price floor violations',async()=>{
 await db.query('insert into public.student_challenges values($1,$2,$3,now()-interval \'1 second\',0)',[a,'student@lamduan.mfu.ac.th','correct']);expect((await db.query<{c:string|null}>('select public.consume_student_challenge($1,$2) c',[a,'correct'])).rows[0].c).toBeNull();
 await verify();await db.exec('update public.student_discount_rules set minimum_profit=250');const q=await quote();await db.exec('update public.student_discount_rules set minimum_profit=0');await expect(db.query('update public.quotes set final_total=600 where id=$1',[q])).rejects.toThrow('profit floors');await db.query('update public.quotes set final_total=750 where id=$1',[q]);
 await db.exec('update public.student_verifications set verified_at=now()-interval \'3 days\',expires_at=now()-interval \'1 day\'');expect((await price()).subtotal).toBe(1000);
});
it('rejects revoked and mismatched sessions and prunes short-lived metadata',async()=>{
 const sid=crypto.randomUUID();await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,a]);expect((await db.query<{ok:boolean}>('select public.customer_session_active($1,$2) ok',[sid,a])).rows[0].ok).toBe(true);expect((await db.query<{ok:boolean}>('select public.customer_session_active($1,$2) ok',[sid,b])).rows[0].ok).toBe(false);await db.exec('delete from auth.sessions');expect((await db.query<{ok:boolean}>('select public.customer_session_active($1,$2) ok',[sid,a])).rows[0].ok).toBe(false);
 await db.exec("insert into public.customer_security_events(kind,created_at) values('login_failure',now()-interval '31 days'),('login_success',now());select public.prune_customer_security();");expect((await db.query('select * from public.customer_security_events')).rows).toHaveLength(1);
});
