import 'server-only';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './generated';
import {readLimited} from './limits';
import {serviceClient} from './server';
export async function catalogFavorites(req:Request,db:SupabaseClient<Database>,owner:string){
 if(req.method==='GET'){
  const {data,error}=await db.from('catalog_favorites').select('model_id').eq('owner_id',owner).limit(500);if(error)throw Error('Database operation failed');return Response.json({data:data.map(row=>row.model_id)},{headers:{'Cache-Control':'private,no-store'}});
 }
 if(req.method==='POST'){
  const p=z.object({modelId:z.uuid(),saved:z.boolean()}).parse(JSON.parse(new TextDecoder().decode(await readLimited(req,1024))));
  const rate=await serviceClient().rpc('take_rate_limit',{p_key:`catalog-favorites:${owner}`,p_limit:500,p_seconds:86400});if(rate.error)throw Error('Database operation failed');if(!rate.data)throw Error('Rate limit exceeded');
  const {error}=p.saved?await db.from('catalog_favorites').upsert({owner_id:owner,model_id:p.modelId},{onConflict:'owner_id,model_id',ignoreDuplicates:true}):await db.from('catalog_favorites').delete().eq('owner_id',owner).eq('model_id',p.modelId);
  if(error)throw Error('Catalog model unavailable');return Response.json({saved:p.saved},{headers:{'Cache-Control':'private,no-store'}});
 }
 return new Response(null,{status:405});
}
