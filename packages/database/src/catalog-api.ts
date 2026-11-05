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
export const publicModel=(m:Row<'catalog_models'>)=>({id:m.id,name:m.name,description:m.description,source_kind:m.source_kind,source_url:m.source_url,creator:m.creator,creator_url:m.creator_url,category:m.category,tags:m.tags,license_name:m.license_name,license_url:m.license_url,commercial_allowed:m.commercial_allowed,available:m.available,starting_price:m.starting_price,lead_time_days:m.lead_time_days,hasPreview:!!m.mesh_asset_id&&m.preview_allowed,imageUrl:m.image_asset_id?`/api/public/catalog/${m.id}/image`:null});
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
  let query=db.from('catalog_models').select('*',{count:'exact'}).eq('visible',true).eq('commercial_allowed',true).eq('license_approved',true).eq('printability','approved');
  const search=params.get('q')?.trim();if(search){if(search.length>160)throw new Error('Invalid search');query=query.textSearch('search_document',search,{type:'websearch',config:'simple'});}
  if(params.get('category'))query=query.eq('category',params.get('category')!.slice(0,80));
  if(params.has('min'))query=query.gte('starting_price',z.coerce.number().nonnegative().max(1000000).parse(params.get('min')));
  if(params.has('max'))query=query.lte('starting_price',z.coerce.number().nonnegative().max(1000000).parse(params.get('max')));
  const {data,error,count}=await query.order('created_at',{ascending:false}).range(page*24,page*24+23);if(error)throw new Error('Database operation failed');
  const categories=await db.rpc('catalog_categories');if(categories.error)throw new Error('Database operation failed');return json({data:data.map(publicModel),count,categories:categories.data,page});
 }
 const m=await selectedCatalog(db,z.uuid().parse(path[2]));
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
