import 'server-only';
import {randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {session,serviceClient,requireUser,requireAdmin,sessionCookies} from './server';
import {customerOrigin,eligibleStudentEmail,mfuProvider,validCallback,trustedEnrollment} from './customer-auth-policy';
import {customerRate,privateHash,securityEvent} from './customer-security';
import {readLimited} from './limits';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
async function input(req:Request){return JSON.parse(new TextDecoder().decode(await readLimited(req,8000)));}
const ok=(error:unknown)=>{if(error)throw new Error('Authentication operation failed');};
export async function beginCustomerFlow(purpose='login'){
 const origin=customerOrigin(),flow=randomBytes(32).toString('hex'),store=await sessionCookies();
 const options={httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax' as const,path:'/',maxAge:900};
 store.set('memo-auth-flow',flow,options);store.set('memo-auth-purpose',purpose,options);
 return origin+'/api/auth/callback?flow='+flow;
}
export async function customerAuth(req:Request,path:string[],admin:boolean):Promise<Response|undefined>{
 const route=path.join('/');
 if(route==='security-retention'&&req.method==='GET'&&!admin){const supplied=Buffer.from(req.headers.get('authorization')??''),expected=Buffer.from('Bearer '+(process.env.CRON_SECRET??''));if(!process.env.CRON_SECRET||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return json({error:'Authentication required'},401);ok((await serviceClient().rpc('prune_customer_security')).error);return json({ok:true});}
 if(route==='auth/providers'&&req.method==='GET'&&!admin){
  const cfg=await fetch(`${process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:process.env.SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??''},cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  return json({google:cfg?.external?.google===true,mfu:!!mfuProvider(),email:true,studentEmail:!!process.env.RESEND_API_KEY&&!!process.env.AUTH_EMAIL_FROM});
 }
 if(route==='auth/callback'&&req.method==='GET'&&!admin){
  const store=await sessionCookies(),url=new URL(req.url),state=store.get('memo-auth-flow')?.value,purpose=store.get('memo-auth-purpose')?.value;
  store.delete('memo-auth-flow');store.delete('memo-auth-purpose');
  if(!validCallback(url,state)){await securityEvent(req,'oauth_failure');return Response.redirect(customerOrigin()+'/login?authError=1',303);}
  const db=await session();const {error}=await db.auth.exchangeCodeForSession(url.searchParams.get('code')!);
  if(error){await securityEvent(req,'oauth_failure');return Response.redirect(customerOrigin()+'/login?authError=1',303);}
  const {data}=await db.auth.getUser();if(!data.user)return Response.redirect(customerOrigin()+'/login?authError=1',303);
  await securityEvent(req,'oauth_success',data.user.id);const aal=await db.auth.mfa.getAuthenticatorAssuranceLevel();return Response.redirect(customerOrigin()+(aal.data?.nextLevel==='aal2'&&aal.data.currentLevel!=='aal2'?'/login?mfa=1':purpose==='recovery'?'/account/security?recovery=1':'/account'),303);
 }
 if(route==='auth/customer'&&req.method==='POST'&&!admin){
  const p=z.object({action:z.enum(['google','mfu','recover','resend','password','revoke','factors','mfa-remove']),email:z.email().optional(),password:z.string().min(12).max(128).optional(),factorId:z.uuid().optional()}).parse(await input(req));
  await customerRate(req,'network:'+(req.headers.get('x-vercel-forwarded-for')??req.headers.get('x-forwarded-for')??'unknown'),15);
  const db=await session();
  if(['google','mfu','recover'].includes(p.action)){
   const redirectTo=await beginCustomerFlow(p.action==='recover'?'recovery':'login');
   if(p.action==='recover'){
    if(!p.email)throw new Error('Email required');await customerRate(req,'recovery:'+p.email.toLowerCase(),3,3600);
    await db.auth.resetPasswordForEmail(p.email,{redirectTo});await securityEvent(req,'password_recovery');return json({ok:true});
   }
   if(p.action==='mfu'){
    const provider=mfuProvider();if(!provider)throw new Error('MFU SSO is not authorized or configured');
    const result=provider.kind==='saml'?await db.auth.signInWithSSO({providerId:provider.id,options:{redirectTo}}):await db.auth.signInWithOAuth({provider:provider.id as `custom:${string}`,options:{redirectTo}});ok(result.error);return json({url:result.data?.url});
   }
   const result=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo,scopes:'openid email profile'}});ok(result.error);return json({url:result.data.url});
  }
  if(p.action==='resend'){if(!p.email)throw new Error('Email required');await customerRate(req,'resend:'+p.email.toLowerCase(),3,3600);await db.auth.resend({type:'signup',email:p.email,options:{emailRedirectTo:await beginCustomerFlow()}});return json({ok:true});}
  const ctx=await requireUser();await customerRate(req,'account:'+ctx.user.id,10);
  if(p.action==='password'){
   if(!p.password)throw new Error('MEMO password required');
   if(!ctx.user.identities?.some(i=>i.provider==='email'))throw new Error('Use your identity provider to recover your institutional password');
   ok((await db.auth.updateUser({password:p.password})).error);await db.auth.signOut({scope:'others'});await securityEvent(req,'password_changed',ctx.user.id);return json({ok:true});
  }
  if(p.action==='revoke'){ok((await db.auth.signOut({scope:'global'})).error);await securityEvent(req,'sessions_revoked',ctx.user.id);return json({ok:true});}
  if(p.action==='factors'){const r=await db.auth.mfa.listFactors();ok(r.error);return json({data:r.data?.totp.map(f=>({id:f.id,status:f.status}))??[]});}
  if(p.action==='mfa-remove'){if(!p.factorId)throw new Error('Factor required');const aal=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.data?.currentLevel!=='aal2')throw new Error('Verified MFA required');ok((await db.auth.mfa.unenroll({factorId:p.factorId})).error);await securityEvent(req,'mfa_removed',ctx.user.id);return json({ok:true});}
 }
 if(route==='auth/pending-mfa'&&req.method==='GET'&&!admin){const {db}=await requireUser(true);const r=await db.auth.mfa.listFactors(),aal=await db.auth.mfa.getAuthenticatorAssuranceLevel();ok(r.error);return json({data:aal.data?.currentLevel!=='aal2'?r.data?.totp.filter(f=>f.status==='verified').map(f=>({id:f.id}))??[]:[]});}
 if(route==='auth/customer-factors'&&req.method==='GET'&&!admin){const {db}=await requireUser();const r=await db.auth.mfa.listFactors();ok(r.error);return json({data:r.data?.totp.map(f=>({id:f.id,status:f.status}))??[]});}
 if(route==='account/security'&&req.method==='GET'&&!admin){
  const {user}=await requireUser(),db=serviceClient();const [verification,activity]=await Promise.all([db.from('student_verifications').select('id,method,verified_email,verified_at,expires_at,enrollment_status,revoked_at').eq('owner_id',user.id).maybeSingle(),db.from('customer_security_events').select('kind,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(30)]);ok(verification.error);ok(activity.error);return json({email:user.email,verification:verification.data,activity:activity.data});
 }
 if(route==='student/verify'&&req.method==='POST'&&!admin){
  const {user}=await requireUser(),db=serviceClient();await customerRate(req,'student:'+user.id,5,3600);
  const p=z.object({action:z.enum(['current','send','confirm','sso']),email:z.email().max(254).optional(),code:z.string().regex(/^\d{6}$/).optional()}).parse(await input(req));let email:string|undefined;
  if(p.action==='sso'){const claim=trustedEnrollment(user);if(!claim)throw new Error('Authorized enrollment claim unavailable');const r=await db.rpc('verify_student',{p_owner:user.id,p_email:claim.email,p_method:claim.method,p_enrollment:claim.status,p_expires:claim.expiresAt});ok(r.error);await securityEvent(req,'verification_success',user.id);return json({ok:true});}
  if(p.action==='current'){
   if(user.email_confirmed_at&&user.email&&eligibleStudentEmail(user.email))email=user.email;
   if(!email)throw new Error('A confirmed Lamduan student email is required');
  }else if(p.action==='send'){
   if(!p.email||!eligibleStudentEmail(p.email))throw new Error('A Lamduan student email is required');
   if(!process.env.RESEND_API_KEY||!process.env.AUTH_EMAIL_FROM)throw new Error('Student verification email delivery is not configured');
   const code=String(randomInt(100000,1000000));const r=await db.from('student_challenges').upsert({owner_id:user.id,email:p.email.toLowerCase(),code_hash:privateHash(user.id+':'+code),expires_at:new Date(Date.now()+900000).toISOString(),attempts:0});ok(r.error);
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.AUTH_EMAIL_FROM,to:[p.email],subject:'MEMO student email verification',text:`Your MEMO email verification code is ${code}. It expires in 15 minutes. This is not an MFU login or MFA code. MEMO never asks for university passwords.`})});if(!response.ok){await db.from('student_challenges').delete().eq('owner_id',user.id);throw new Error('Verification email could not be sent');}return json({ok:true});
  }else{if(!p.code)throw new Error('Verification code required');const r=await db.rpc('consume_student_challenge',{p_owner:user.id,p_hash:privateHash(user.id+':'+p.code)});ok(r.error);if(!r.data)throw new Error('Invalid or expired verification code');email=r.data;}
  const r=await db.rpc('verify_student',{p_owner:user.id,p_email:email!.toLowerCase(),p_method:'email'});if(r.error)throw new Error('Verification unavailable; this eligible identity may already be claimed');await securityEvent(req,'verification_success',user.id);return json({ok:true});
 }
 if(route==='customer-security'&&admin){
  const {db,user:administrator}=await requireAdmin();
  if(req.method==='GET'){ok((await serviceClient().from('audit_logs').insert({actor_id:administrator.id,entity:'customer_security',action:'read_summary'})).error);const [customers,verifications,rules,events,audit,accounts]=await Promise.all([db.from('customers').select('*').order('created_at',{ascending:false}).limit(100),db.from('student_verifications').select('*').order('expires_at').limit(100),db.from('student_discount_rules').select('*').order('created_at',{ascending:false}).limit(50),db.from('customer_security_events').select('id,owner_id,kind,suspicious,created_at').order('created_at',{ascending:false}).limit(100),db.from('student_verification_audit').select('*').order('created_at',{ascending:false}).limit(100),serviceClient().auth.admin.listUsers({page:1,perPage:100})]);for(const r of [customers,verifications,rules,events,audit,accounts])ok(r.error);return json({customers:customers.data,accounts:accounts.data.users.map(u=>({id:u.id,email:u.email,confirmed_at:u.email_confirmed_at,last_sign_in_at:u.last_sign_in_at,providers:u.identities?.map(i=>i.provider)??[]})),verifications:verifications.data,rules:rules.data,events:events.data,audit:audit.data});}
  if(req.method==='POST'){
   const payload=z.object({action:z.enum(['rule','revoke','restore']),id:z.uuid().optional(),values:z.unknown().optional()}).parse(await input(req));
   if(payload.action==='revoke'||payload.action==='restore'){if(!payload.id)throw new Error('Verification required');ok((await db.rpc('revoke_student',{p_id:payload.id,p_restore:payload.action==='restore'})).error);return json({ok:true});}
   const rule=z.object({name:z.string().min(1).max(120),kind:z.enum(['percentage','fixed']),value:z.number().nonnegative(),active:z.boolean(),starts_at:z.iso.datetime(),ends_at:z.iso.datetime(),minimum_total:z.number().nonnegative(),usage_limit:z.number().int().positive().nullable(),per_identity_limit:z.number().int().positive(),stack_early_bird:z.boolean(),minimum_profit:z.number().nonnegative(),minimum_margin:z.number().min(0).max(.99),require_enrollment:z.boolean(),reverify_days:z.number().int().min(1).max(365)}).refine(r=>r.kind!=='percentage'||r.value<=100).refine(r=>r.ends_at>r.starts_at).parse(payload.values);
   ok((payload.id?await db.from('student_discount_rules').update(rule).eq('id',payload.id):await db.from('student_discount_rules').insert(rule)).error);return json({ok:true});
  }
 }
}
