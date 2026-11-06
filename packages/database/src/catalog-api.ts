import 'server-only';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {z} from 'zod';
import {catalogSchema} from '@mfu/validation/catalog.ts';
import {MAX_UPLOAD,validateHeader,extension} from '@mfu/validation';
import {parseMesh} from '@mfu/three';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Row} from './generated';
import {readLimited} from './limits';
import {serviceClient} from './server';

type DB=SupabaseClient<Database>;
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
async function previewAsset(db:DB,id:string,publicPreview=false){
 const {data:a}=await db.from('catalog_assets').select('*').eq('id',id).eq('kind','mesh').single();if(!a)throw new Error('File unavailable');
 const {data:blob,error}=await db.storage.from('catalog-private').download(a.path);if(error||!blob)throw new Error('File unavailable');
 const mesh=parseMesh(new Uint8Array(await blob.arrayBuffer()),extension(a.filename));
 const bytes=new ArrayBuffer(mesh.positions.length*4),view=new DataView(bytes);mesh.positions.forEach((value,index)=>view.setFloat32(index*4,value,true));
 return new Response(bytes,{headers:{'Content-Type':'application/vnd.memo.mesh','Cache-Control':publicPreview?'public,max-age=60':'private,no-store','X-Content-Type-Options':'nosniff'}});
}
export const publicModel=(m:Row<'catalog_models'>)=>({id:m.id,name:m.name,description:m.description,source_kind:m.source_kind,source_url:m.source_url,creator:m.creator,creator_url:m.creator_url,category:m.category,tags:m.tags,license_name:m.license_name,license_url:m.license_url,commercial_allowed:m.commercial_allowed,available:m.available,starting_price:m.starting_price,lead_time_days:m.lead_time_days,referenceOnly:m.showcase_visible,hasPreview:!!m.mesh_asset_id&&m.preview_allowed,imageUrl:m.image_asset_id?`/api/public/catalog/${m.id}/image`:null});
export async function selectedCatalog(db:DB,id:string){
 const {data,error}=await db.from('catalog_models').select('*').eq('id',id).eq('visible',true).eq('commercial_allowed',true).eq('license_approved',true).eq('printability','approved').single();
 if(error||!data)throw new Error('Catalog model unavailable');return data;
}
export async function catalogPublic(req:Request,path:string[]):Promise<Response|undefined>{
 if(req.method!=='GET'||path[0]!=='public'||!['catalog','pricing-minimums'].includes(path[1]))return;
 const db=serviceClient(),params=new URL(req.url).searchParams;
 if(path[1]==='pricing-minimums'){
  const {data,error}=await db.from('pricing_rules').select('rates').eq('active',true).is('material_id',null).is('service',null).lte('effective_at',new Date().toISOString()).order('effective_at',{ascending:false}).limit(1);if(error)throw new Error('Database operation failed');
  const rates=data?.[0]?.rates as {basicMinimum?:number;customMinimum?:number}|undefined;return json({data:{basicMinimum:rates?.basicMinimum??100,customMinimum:rates?.customMinimum??1500}});
 }
 if(!path[2]){
  const page=z.coerce.number().int().min(0).max(1000).parse(params.get('page')??0);
  const seed=z.uuid().parse(params.get('seed')??randomUUID()),search=z.string().max(160).parse(params.get('q')?.trim()??''),category=z.string().max(80).parse(params.get('category')??'');
  const min=params.has('min')?z.coerce.number().nonnegative().max(1000000).parse(params.get('min')):null,max=params.has('max')?z.coerce.number().nonnegative().max(1000000).parse(params.get('max')):null;
  const [batch,categories]=await Promise.all([db.rpc('browse_catalog',{p_seed:seed,p_page:page,p_query:search,p_category:category,p_min:min,p_max:max}),db.rpc('catalog_categories')]);
  if(batch.error||categories.error)throw new Error('Database operation failed');
  const result=batch.data as {data:Row<'catalog_models'>[];count:number};return json({data:result.data.map(publicModel),count:result.count,categories:categories.data,page,seed});
 }
 const {data:m,error:lookupError}=await db.from('catalog_models').select('*').eq('id',z.uuid().parse(path[2])).or('showcase_visible.eq.true,and(visible.eq.true,commercial_allowed.eq.true,license_approved.eq.true,printability.eq.approved)').single();if(lookupError||!m)throw new Error('Catalog model unavailable');
 if(!path[3])return json({data:publicModel(m)});
 if(path[3]==='image'&&m.image_asset_id){
  const {data:a}=await db.from('catalog_assets').select('*').eq('id',m.image_asset_id).eq('kind','image').single();if(!a)throw new Error('File unavailable');
  const {data:blob,error}=await db.storage.from('catalog-private').download(a.path);if(error||!blob)throw new Error('File unavailable');
  return new Response(await blob.arrayBuffer(),{headers:{'Content-Type':'image/jpeg','Cache-Control':'public,max-age=60','X-Content-Type-Options':'nosniff'}});
 }
 if(path[3]==='preview'&&m.preview_allowed&&m.mesh_asset_id){
  return previewAsset(db,m.mesh_asset_id,true);
 }
 return new Response(null,{status:404});
}
export async function catalogAdmin(req:Request,path:string[],ctx:{db:DB;svc:DB;user:{id:string}}):Promise<Response|undefined>{
 if(path[0]!=='catalog')return;
 if(path[1]==='assets'&&path[2]&&path[3]==='preview'&&req.method==='GET')return previewAsset(ctx.svc,z.uuid().parse(path[2]));
 if(path[1]==='assets'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')??0)>MAX_UPLOAD+65536)throw new Error('File too large');
  const bytes=await readLimited(req,MAX_UPLOAD+65536),form=await new Request(req.url,{method:'POST',headers:req.headers,body:bytes as unknown as BodyInit}).formData();
  const f=form.get('file');if(!(f instanceof File)||form.get('authorized')!=='true')throw new Error('Authorized file required');
  let content=new Uint8Array(await f.arrayBuffer());const ext=validateHeader(f.name,content),image=['jpg','jpeg','png','webp'].includes(ext),id=randomUUID();
  const mesh=image?undefined:parseMesh(content,ext);
  if(image)content=new Uint8Array(await sharp(content,{limitInputPixels:20_000_000}).rotate().resize(1400,1400,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer());
  if(content.length>MAX_UPLOAD)throw new Error('File too large');
  const filename=image?`${id}.jpg`:f.name.slice(0,160),storagePath=`${ctx.user.id}/${id}.${image?'jpg':ext}`;
  const upload=await ctx.svc.storage.from('catalog-private').upload(storagePath,content,{contentType:image?'image/jpeg':'application/octet-stream',upsert:false});if(upload.error)throw new Error('File upload failed');
  const {error}=await ctx.svc.from('catalog_assets').insert({id,uploader_id:ctx.user.id,path:storagePath,filename,mime:image?'image/jpeg':'application/octet-stream',kind:image?'image':'mesh',bytes:content.length,analysis:mesh?JSON.parse(JSON.stringify({...mesh,positions:undefined})):null});
  if(error){await ctx.svc.storage.from('catalog-private').remove([storagePath]);throw new Error('Database operation failed');}return json({id,kind:image?'image':'mesh',filename});
 }
 if(req.method==='GET'){
  const table=path[1]==='assets'?'catalog_assets':'catalog_models';let query=ctx.db.from(table).select('*').order('created_at',{ascending:false}).limit(200);
  if(path[1]&&path[1]!=='assets')query=query.eq('id',z.uuid().parse(path[1]));
  const {data,error}=await query;if(error)throw new Error('Database operation failed');return json({data});
 }
 if(req.method==='POST'){
  const payload=z.object({id:z.uuid().optional(),values:catalogSchema,confirmed:z.literal(true)}).parse(JSON.parse(new TextDecoder().decode(await readLimited(req,32000))));
  const {data,error}=await ctx.db.rpc('save_catalog_model',{p_id:payload.id??randomUUID(),p_values:JSON.parse(JSON.stringify(payload.values))});if(error)throw new Error('Catalog approval failed');return json({id:data});
 }
}

export async function catalogInquiries(req:Request,ctx:{db:DB;user:{id:string}},admin:boolean){
 if(req.method==='GET'){if(admin){const audit=await serviceClient().from('audit_logs').insert({actor_id:ctx.user.id,entity:'catalog_inquiries',action:'read_summary'});if(audit.error)throw new Error('Database operation failed');}const {data,error}=await ctx.db.from('catalog_inquiries').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw new Error('Database operation failed');return json({data});}
 if(req.method==='POST'&&!admin){
  const p=z.object({modelId:z.uuid(),requestKey:z.uuid(),customer:z.object({name:z.string().trim().min(1).max(120),email:z.email().max(254)}),selection:z.object({dimensions:z.object({x:z.number().positive().max(260),y:z.number().positive().max(260),z:z.number().positive().max(260)}),color:z.enum(['black','white','grey']),quantity:z.number().int().min(1).max(100),notes:z.string().max(4000)})}).parse(JSON.parse(new TextDecoder().decode(await readLimited(req,10000))));
  const {data,error}=await ctx.db.rpc('submit_catalog_inquiry',{p_model:p.modelId,p_request:p.requestKey,p_customer:p.customer,p_selection:p.selection});if(error)throw new Error(error.message.includes('Rate limit')?'Rate limit exceeded':'Inquiry could not be saved');return json({id:data});
 }
 return new Response(null,{status:405});
}
