import 'server-only';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './generated';
import {readLimited} from './limits';
import {serviceClient} from './server';
const schema=z.object({inspirationId:z.string().regex(/^[a-z]+$/).max(40),requestKey:z.uuid(),customer:z.object({name:z.string().trim().min(1).max(120),email:z.email().max(254)}),selection:z.object({dimensions:z.object({x:z.number().positive().max(260),y:z.number().positive().max(260),z:z.number().positive().max(260)}),color:z.enum(['black','white','grey']),quantity:z.number().int().min(1).max(100),notes:z.string().max(4000)})});
export async function inspirationInquiries(req:Request,ctx:{db:SupabaseClient<Database>;user:{id:string}},admin:boolean){
 if(req.method==='GET'){
  if(admin){const {error}=await serviceClient().from('audit_logs').insert({actor_id:ctx.user.id,entity:'inspiration_inquiries',action:'read_summary'});if(error)throw Error('Database operation failed');}
  const {data,error}=await ctx.db.from('inspiration_inquiries').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw Error('Database operation failed');return Response.json({data},{headers:{'Cache-Control':'no-store'}});
 }
 if(req.method==='POST'&&!admin){
  const p=schema.parse(JSON.parse(new TextDecoder().decode(await readLimited(req,32000))));
  const {data,error}=await ctx.db.rpc('submit_inspiration_inquiry',{p_inspiration:p.inspirationId,p_request:p.requestKey,p_customer:p.customer,p_selection:p.selection});
  if(error)throw Error(error.message.includes('Rate limit')?'Rate limit exceeded':'Inquiry could not be saved');return Response.json({id:data},{headers:{'Cache-Control':'no-store'}});
 }
 return new Response(null,{status:405});
}
