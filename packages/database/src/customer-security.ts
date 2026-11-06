import 'server-only';
import {createHmac} from 'node:crypto';
import {serviceClient} from './server';
import type {Row} from './generated';
export const privateHash=(value:string)=>createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update(value).digest('hex');
export async function securityEvent(req:Request,kind:Row<'customer_security_events'>['kind'],owner?:string,subject?:string){
 const db=serviceClient(),day=new Date().toISOString().slice(0,10),network=privateHash(day+':'+(req.headers.get('x-vercel-forwarded-for')??req.headers.get('x-forwarded-for')??'unknown'));
 const subjectHash=subject?privateHash(subject.trim().toLowerCase()):null;
 const {count}=await db.from('customer_security_events').select('id',{count:'exact',head:true}).eq('kind','login_failure').gte('created_at',new Date(Date.now()-900000).toISOString()).eq(subjectHash?'subject_hash':'network_hash',subjectHash??network);
 const {error}=await db.from('customer_security_events').insert({kind,owner_id:owner??null,subject_hash:subjectHash,network_hash:network,suspicious:(count??0)>=4});if(error)throw new Error('Security event could not be saved');
 await db.rpc('prune_customer_security');
 if(owner&&['password_changed','sessions_revoked','mfa_verified','mfa_removed'].includes(kind))await db.from('notifications').insert({owner_id:owner,message:'Account security event: '+kind});
 if(owner&&['login_success','oauth_success'].includes(kind)){
  const {count:previous}=await db.from('customer_security_events').select('id',{count:'exact',head:true}).eq('owner_id',owner).eq('network_hash',network).neq('id','00000000-0000-0000-0000-000000000000').in('kind',['login_success','oauth_success']);
  if((previous??0)<=1)await db.from('notifications').insert({owner_id:owner,message:'Account security event: login_success'});
 }
}
export async function customerRate(req:Request,key:string,limit=10,seconds=900){const {data,error}=await serviceClient().rpc('take_rate_limit',{p_key:'customer:'+privateHash(key),p_limit:limit,p_seconds:seconds});if(error||!data){await securityEvent(req,'login_failure',undefined,key);throw new Error('Rate limit exceeded');}}
