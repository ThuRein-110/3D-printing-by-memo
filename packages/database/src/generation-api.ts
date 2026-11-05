import {z} from 'zod';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import type {Database} from './generated';
export async function generationApi(req:Request,route:string,ctx:{db:SupabaseClient<Database>;svc:SupabaseClient<Database>;user:User},admin:boolean,body:(req:Request)=>Promise<unknown>):Promise<Response|null>{
 const {db,svc}=ctx;const reply=(v:unknown)=>Response.json(v,{headers:{'Cache-Control':'no-store'}});
 if(route==='generation-config'&&req.method==='GET'){
  const {data,error}=await svc.from('generation_settings').select('*').eq('id',true).single();if(error||!data)throw new Error('Migration 009 required');
  if(!admin)return reply({data:{enabled:data.enabled&&process.env.PREVIEW_PROVIDER==='meshy',daily_customer_limit:data.daily_customer_limit,estimated_credits:20}});
  const [months,metrics]=await Promise.all([db.from('generation_months').select('*').order('month',{ascending:false}).limit(12),db.rpc('generation_metrics')]);
  if(months.error||metrics.error)throw new Error('Generation metrics unavailable');return reply({data,months:months.data,metrics:metrics.data,providerConfigured:process.env.PREVIEW_PROVIDER==='meshy'});
 }
 if(admin&&route==='generation-config'&&req.method==='POST'){
  const p=z.object({enabled:z.boolean(),daily:z.number().int().min(1).max(50),monthly:z.number().nonnegative(),credit:z.number().positive().nullable(),concurrency:z.number().int().min(1).max(4)}).parse(await body(req));
  const {error}=await db.rpc('configure_generation',{p_enabled:p.enabled,p_daily:p.daily,p_monthly:p.monthly,p_credit:p.credit,p_concurrency:p.concurrency});if(error)throw new Error('Generation settings invalid');return reply({ok:true});
 }
 if(route==='retry-preview'&&req.method==='POST'){const p=z.object({id:z.uuid()}).parse(await body(req));const {error}=await db.rpc('retry_generation',{p_id:p.id});if(error)throw new Error('Unsafe retry; reconciliation required');return reply({ok:true});}
 return null;
}
