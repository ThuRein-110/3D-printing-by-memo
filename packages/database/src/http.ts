import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { configureSchema, ratesSchema, validateHeader, MAX_UPLOAD, extension, assertWorkflow } from '@mfu/validation';
import { defaultRates, estimate } from '@mfu/pricing';
import { parseMesh, approximateUsage, resizeMesh } from '@mfu/three';
import { orderStatuses } from '@mfu/types';
import { quotationPdf } from './pdf';
import { readLimited } from './limits';
import {customerQuote,customerJob,customerEstimate} from './customer-data';
import {generationApi} from './generation-api';
import {errorCode} from './error-code';
import {csrf} from './csrf';
import {catalogPublic,catalogAdmin,selectedCatalog} from './catalog-api';
import {adminOrderContext} from './order-context';
import type {Row} from './generated';
import type { Database } from './generated';
import type { Json } from '@mfu/types';
import { configured, session, requireUser, requireAdmin, serviceClient } from './server';
const json=(value:unknown,status=200)=>{const v=value as Record<string,unknown>;return Response.json(v&&typeof v.error==='string'?{...v,errorCode:errorCode(v.error)}:value,{status,headers:{'Cache-Control':'no-store'}});};
function check(error:{message:string}|null){if(error)throw new Error('Database operation failed');}
const toJson=(value:unknown):Json=>JSON.parse(JSON.stringify(value));
const isEnabled=(value:unknown)=>z.object({enabled:z.boolean().optional()}).safeParse(value).data?.enabled===true;
async function body(req:Request) {return JSON.parse(new TextDecoder().decode(await readLimited(req,32000))) as unknown;}
async function rate(key:string,limit:number,seconds=3600){const {data,error}=await serviceClient().rpc('take_rate_limit',{p_key:key,p_limit:limit,p_seconds:seconds});check(error);if(data!==true)throw new Error('Rate limit exceeded');}
const adminTables=['orders','quotes','customers','customer_files','materials','filament_spools','pricing_rules','promotions','preview_jobs','gallery_items','production_jobs','audit_logs','payments','settings','inventory_transactions','inventory_reservations','privacy_requests'] as const;
const publicTables=['materials','gallery_items','promotions'] as const;
const adminSchemas={
 materials:z.object({name:z.string().max(80),color:z.string().max(80),hex:z.string().regex(/^#[a-fA-F0-9]{6}$/),visible:z.boolean(),image_file_id:z.uuid().nullable().optional()}),
 pricing_rules:z.object({rates:ratesSchema,effective_at:z.iso.datetime(),active:z.boolean(),material_id:z.uuid().nullable().optional(),service:z.enum(['ready','custom','photo','reprint']).nullable().optional()}),
 promotions:z.object({name:z.string().max(120),kind:z.enum(['fixed','percentage']),value:z.number().nonnegative(),starts_at:z.iso.datetime(),ends_at:z.iso.datetime(),usage_limit:z.number().int().positive().nullable(),active:z.boolean(),minimum_total:z.number().nonnegative(),allow_below_cost:z.boolean().default(false),authorization_note:z.string().max(2000).default('')}).refine(v=>v.kind!=='percentage'||v.value<=100).refine(v=>new Date(v.ends_at)>new Date(v.starts_at)),
 gallery_items:z.object({title:z.string().max(120),description:z.string().max(2000),public:z.boolean(),consent_record:z.string().min(1).max(2000)}),
 production_jobs:z.object({order_id:z.uuid(),printer_id:z.uuid().nullable(),profile:z.record(z.string(),z.unknown()),slicer_results:z.record(z.string(),z.unknown()),status:z.enum(['queued','printing','failed','completed']),failure_reason:z.string().max(2000).nullable(),internal_notes:z.string().max(4000),actual_cost_thb:z.number().nonnegative().nullable().optional(),actual_labor_thb:z.number().nonnegative().nullable().optional()}),
 settings:z.object({name:z.enum(['bank_transfer','production_window','contact','retention_days']),value:z.record(z.string(),z.unknown())}),
 filament_spools:z.object({material_id:z.uuid(),supplier:z.string().max(200),batch:z.string().max(100),cost_per_kg:z.number().nonnegative(),remaining_grams:z.number().nonnegative(),spool_weight_grams:z.number().nonnegative()})
};
export async function handle(req:Request,path:string[],adminApp=false):Promise<Response> {
 try {
 const route=path.join('/');
 if(route==='health'){if(!configured())return json({backend:false,writes:false,provider:false});const db=await session();const {error}=await db.from('materials').select('id').limit(1);return json({backend:!error,writes:!!process.env.SUPABASE_SERVICE_ROLE_KEY,provider:process.env.PREVIEW_PROVIDER==='meshy'},error?503:200);}
 if(req.method!=='GET')csrf(req,adminApp);
 if(!configured())return json({error:'Supabase is not configured. No data has been saved.'},503);
 const publicCatalog=await catalogPublic(req,path);if(publicCatalog)return publicCatalog;
 if(path[0]==='public'&&path[1]==='material-image'&&req.method==='GET'){
  const id=z.uuid().parse(path[2]),svc=serviceClient();const {data:material}=await svc.from('materials').select('image_file_id').eq('id',id).eq('visible',true).gt('available_grams',0).single();if(!material?.image_file_id)return json({error:'Not found'},404);
  const {data:file}=await svc.from('customer_files').select('path,mime').eq('id',material.image_file_id).eq('purpose','filament').single();if(!file||!file.mime.startsWith('image/'))return json({error:'Not found'},404);
  const {data:blob}=await svc.storage.from('customer-private').download(file.path);if(!blob)throw new Error('File unavailable');
  const bytes=await sharp(new Uint8Array(await blob.arrayBuffer()),{limitInputPixels:20_000_000}).rotate().resize(500,500,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
 }
 if(route==='auth' && req.method==='POST'){
  const p=z.object({action:z.enum(['login','register','guest','guest-verify','logout','mfa-enroll','mfa-verify']),email:z.email().optional(),password:z.string().min(12).max(128).optional(),factorId:z.string().optional(),code:z.string().regex(/^\d{6}$/).optional()}).parse(await body(req));
  const ipHash=createHash('sha256').update(req.headers.get('x-forwarded-for')??'unknown').digest('hex');await rate('auth:'+ipHash,20,900);
  const db=await session();
  if(p.action==='logout'){await db.auth.signOut();return json({ok:true});}
  if(['guest','guest-verify'].includes(p.action)){if(adminApp||!p.email)throw new Error('Customer email required');const result=p.action==='guest'?await db.auth.signInWithOtp({email:p.email,options:{shouldCreateUser:true}}):await db.auth.verifyOtp({email:p.email,token:p.code!,type:'email'});check(result.error);return json({ok:true,verificationRequired:p.action==='guest'});}
  if(p.action==='register'&&adminApp)throw new Error('Admin registration is disabled');
  if(p.action==='mfa-enroll'){const {data,error}=await db.auth.mfa.enroll({factorType:'totp'});check(error);return json(data);}
  if(p.action==='mfa-verify'){const {data,error}=await db.auth.mfa.challengeAndVerify({factorId:p.factorId!,code:p.code!});check(error);return json({verified:!!data});}
  if(!p.email||!p.password)throw new Error('Email and password required');
  const {data,error}=p.action==='register'?await db.auth.signUp({email:p.email,password:p.password}):await db.auth.signInWithPassword({email:p.email,password:p.password});
  if(error)return json({error:'Authentication failed. Check your details or confirm your email.'},400);
  if(adminApp&&data.user){const {data:role}=await serviceClient().from('roles').select('role').eq('user_id',data.user.id).maybeSingle();if(role?.role!=='admin'){await db.auth.signOut();return json({error:'Admin access is not provisioned for this account.'},403);}const {data:factors}=await db.auth.mfa.listFactors();return json({ok:true,factors:factors?.totp??[],mfaRequired:true});}
  return json({ok:true,emailVerification:p.action==='register'&&!data.session});
 }
 if(route.startsWith('public/')&&req.method==='GET'){
  const name=route.slice(7);if(!publicTables.includes(name as typeof publicTables[number]))throw new Error('Unknown resource');
  const db=await session();let query=db.from(name).select(name==='gallery_items'?'id,title,description,public':name==='promotions'?'id,name,kind,value,starts_at,ends_at,usage_limit,used,active,minimum_total':'*').limit(100);
  if(name==='materials')query=query.eq('visible',true).gt('available_grams',0);
  if(name==='gallery_items')query=query.eq('public',true);
  if(name==='promotions')query=query.eq('active',true).lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString());
  // Availability including promotion capacity is checked again before a quote commits.
  const {data,error}=await query;check(error);
  const dataRows=z.array(z.record(z.string(),z.unknown())).parse(data??[]);
  const rows=name==='promotions'?dataRows.filter(p=>p.usage_limit===null||Number(p.used)<Number(p.usage_limit)):dataRows;
  const fields=name==='materials'?['id','name','color','hex','available_grams','visible']:name==='gallery_items'?['id','title','description']:['id','name','kind','value','starts_at','ends_at'];
  return json({data:rows?.map(row=>({...Object.fromEntries(fields.map(field=>[field,row[field]])),...(name==='materials'&&row.image_file_id?{imageUrl:`/api/public/material-image/${row.id}`}:{})}))??[]});
 }
 const ctx=adminApp?await requireAdmin():await requireUser();
 const {user,db}=ctx;const svc=serviceClient();
 if(adminApp){const response=await catalogAdmin(req,path,{db,svc,user});if(response)return response;}
 if(path[0]==='catalog-order-image'&&req.method==='GET'){
  let query=db.from('model_order_snapshots').select('metadata').eq('quote_id',z.uuid().parse(path[1]));if(!adminApp)query=query.eq('owner_id',user.id);
  const {data:s}=await query.single();const image=z.object({model:z.object({image_asset_id:z.uuid()})}).safeParse(s?.metadata);if(!image.success)return json({error:'Not found'},404);
  const {data:a}=await svc.from('catalog_assets').select('path').eq('id',image.data.model.image_asset_id).eq('kind','image').single();if(!a)return json({error:'Not found'},404);
  const {data:blob,error}=await svc.storage.from('catalog-private').download(a.path);check(error);if(!blob)throw new Error('File unavailable');return new Response(await blob.arrayBuffer(),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
 }
 const generationResponse=await generationApi(req,route,{db,svc,user},adminApp,body);if(generationResponse)return generationResponse;
 if(adminApp&&route==='metrics'&&req.method==='GET'){const {data,error}=await db.rpc('operations_metrics');check(error);return json({data});}
 if(route==='export'&&req.method==='GET'){await rate('export:'+user.id,3,86400);const tables=['model_order_snapshots','customer_files','models','model_versions','quotes','orders','order_events','payments','notifications','preview_jobs'] as const;const entries=await Promise.all(tables.map(async table=>{const {data,error}=await (table==='quotes'?svc:db).from(table).select('*').eq('owner_id',user.id).limit(10000);check(error);return [table,table==='quotes'?data?.map(row=>customerQuote(row as Row<'quotes'>)):data] as const;}));return new Response(JSON.stringify({generated_at:new Date().toISOString(),owner_id:user.id,...Object.fromEntries(entries),note:'File bytes remain available through authenticated /api/files/{id}. Export capped at 10,000 rows per table; contact the shop if you need a larger archive.'}),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="memo-data-export.json"','Cache-Control':'private, no-store'}});}
 if(adminApp&&route==='reserve-inventory'&&req.method==='POST'){const p=z.object({orderId:z.uuid(),materialId:z.uuid(),grams:z.number().positive()}).parse(await body(req));const {error}=await db.rpc('reserve_inventory',{p_order:p.orderId,p_material:p.materialId,p_grams:p.grams});check(error);return json({ok:true});}
 if(adminApp&&route==='settle-inventory'&&req.method==='POST'){const p=z.object({id:z.uuid(),consume:z.boolean()}).parse(await body(req));const {error}=await db.rpc('settle_inventory',{p_reservation:p.id,p_consume:p.consume});check(error);return json({ok:true});}
 if(route==='files'&&req.method==='POST'){
  await rate('upload:'+user.id,20);if(Number(req.headers.get('content-length')??0)>MAX_UPLOAD+30000)throw new Error('Maximum upload: 4 MiB');
  const uploadBody=await readLimited(req,MAX_UPLOAD+30000);const form=await new Response(Buffer.from(uploadBody),{headers:{'Content-Type':req.headers.get('content-type')??''}}).formData(),file=form.get('file');if(!(file instanceof File))throw new Error('File required');
  if(form.get('workflow'))assertWorkflow(file.name,String(form.get('workflow')));
  const bytes=new Uint8Array(await file.arrayBuffer()),ext=validateHeader(file.name,bytes);let analysis:unknown=null;
  const image=['jpg','jpeg','png','webp'].includes(ext);
  if(image){const meta=await sharp(bytes,{limitInputPixels:20_000_000}).metadata();if(!meta.width||!meta.height||meta.width<32||meta.height<32)throw new Error('Image must be at least 32 × 32 pixels');await sharp(bytes,{limitInputPixels:20_000_000}).stats();}
  else {const mesh=parseMesh(bytes,ext);analysis={...mesh,positions:undefined};}
  const kind=form.get('kind')==='payment'?'payment':image?'reference':'mesh';
  if(kind==='payment'&&!image)throw new Error('Payment evidence must be an image');
  const purpose=adminApp&&form.get('purpose')==='filament'?'filament':'customer';
  const owner=adminApp&&form.get('ownerId')?z.uuid().parse(form.get('ownerId')):user.id;
  const id=randomUUID(),hash=createHash('sha256').update(bytes).digest('hex'),storagePath=`${owner}/${id}.${ext}`;
  const mime=image?(ext==='jpg'?'image/jpeg':`image/${ext==='jpeg'?'jpeg':ext}`):'application/octet-stream';
  const up=await svc.storage.from('customer-private').upload(storagePath,bytes,{contentType:mime,upsert:false});check(up.error);
  const record={id,owner_id:owner,path:storagePath,sha256:hash,original_name:file.name.slice(0,160),mime,bytes:bytes.length,analysis:toJson(analysis),kind,purpose};
  let {error}=await svc.from('customer_files').insert(record);
  // Keep ordinary uploads working while additive migration 009 is being rolled out.
  if(error&&['PGRST204','42703'].includes(error.code)&&purpose==='customer'){const {purpose:omitted,...legacy}=record;void omitted;({error}=await svc.from('customer_files').insert(legacy));}
  if(error){await svc.storage.from('customer-private').remove([storagePath]);check(error);}
  return json({id,kind,analysis});
 }
 if(path[0]==='files'&&path[1]&&req.method==='GET'){
  const id=z.uuid().parse(path[1]);let query=db.from('customer_files').select('*').eq('id',id);if(!adminApp)query=query.eq('owner_id',user.id);
  const {data,error}=await query.single();if(error||!data)return json({error:'File not found'},404);
  if(new URL(req.url).searchParams.get('metadata')==='true')return json({data:{id:data.id,original_name:data.original_name,kind:data.kind,generated:data.generated??false,analysis:data.analysis}});
  if(new URL(req.url).searchParams.get('signed')==='true'){const result=await svc.storage.from('customer-private').createSignedUrl(data.path,60);check(result.error);return json({url:result.data?.signedUrl,expiresIn:60});}
  // Return authenticated bytes instead of exposing a long-lived storage path.
  const {data:blob,error:downloadError}=await svc.storage.from('customer-private').download(data.path);check(downloadError);
  if(!blob)throw new Error('Download failed');return new Response(blob,{headers:{'Content-Type':data.mime,'Content-Disposition':`attachment; filename="file.${extension(data.original_name)}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(['quotes','estimate'].includes(route)&&req.method==='POST'){
  await rate('quote:'+user.id,30);const p=configureSchema.parse(await body(req));
  const {data:existing}=await svc.from('quotes').select('id').eq('owner_id',user.id).eq('request_key',p.idempotencyKey).maybeSingle();if(existing&&route==='quotes')return json({id:existing.id});
  if(p.materialId){const {data:mat}=await db.from('materials').select('id').eq('id',p.materialId).eq('visible',true).gt('available_grams',0).single();if(!mat)throw new Error('Selected color is unavailable');}else if(['ready','reprint'].includes(p.service))throw new Error('Selected color is unavailable');
  if(Object.values(p.dimensions).some(n=>n>260))throw new Error('Model exceeds printer volume');
  let grams=0,hours=0,confidence='inquiry';
  const catalog=p.catalogModelId?await selectedCatalog(svc,p.catalogModelId):null;
  let catalogFile:{id:string;filename:string}|null=null;
  let catalogMaterial:Record<string,unknown>|null=null;
  if(catalog){
   if(!catalog.available||p.service!=='ready'||p.fileId)throw new Error('Catalog model unavailable');
   const {data:mat}=await svc.from('materials').select('id,name,color,hex,available_grams,visible').eq('id',p.materialId!).single();
   if(!mat||!mat.visible||mat.available_grams<=0||mat.name.toUpperCase()!=='PETG'||!['black','white','grey','gray'].includes(mat.color.toLowerCase()))throw new Error('Selected color is unavailable');catalogMaterial=mat;
   if(catalog.mesh_asset_id){const {data:a}=await svc.from('catalog_assets').select('*').eq('id',catalog.mesh_asset_id).eq('kind','mesh').single();if(!a)throw new Error('Model file unavailable');
    const {data:blob,error}=await svc.storage.from('catalog-private').download(a.path);check(error);if(!blob)throw new Error('Model file unavailable');
    const mesh=parseMesh(new Uint8Array(await blob.arrayBuffer()),extension(a.filename)),scaled=resizeMesh(mesh,p.dimensions);catalogFile={id:a.id,filename:a.filename};
    if(mesh.closed){const usage=approximateUsage(scaled,1);grams=usage.grams;hours=usage.printHours;confidence='approximate';}
   }
  }
  if(p.fileId){const {data:f}=await db.from('customer_files').select('*').eq('id',p.fileId).eq('owner_id',user.id).single();if(!f)throw new Error('File not found');if(f.kind==='payment')throw new Error('Payment evidence cannot be used as a model');
   if(['ready','reprint'].includes(p.service)&&f.kind!=='mesh')throw new Error('Ready-to-print and reprints require an actual mesh');
   if(f.kind==='mesh'){const {data:blob,error}=await svc.storage.from('customer-private').download(f.path);check(error);if(!blob)throw new Error('File unavailable');const mesh=parseMesh(new Uint8Array(await blob.arrayBuffer()),extension(f.original_name));
    const resized=resizeMesh(mesh,p.dimensions);
    if(mesh.closed){const usage=approximateUsage(resized,1);grams=usage.grams;hours=usage.printHours;confidence=f.generated?'ai-approximate':'approximate';}
   }
  } else if(!catalog&&(p.service==='ready'||p.service==='reprint'))throw new Error('A mesh file is required');
  const {data:rules}=await svc.from('pricing_rules').select('*').eq('active',true).lte('effective_at',new Date().toISOString()).or(p.materialId?`and(material_id.is.null,service.is.null),and(material_id.eq.${p.materialId},service.is.null),and(material_id.is.null,service.eq.${p.service}),and(material_id.eq.${p.materialId},service.eq.${p.service})`:`and(material_id.is.null,service.is.null),and(material_id.is.null,service.eq.${p.service})`).order('effective_at',{ascending:false}).limit(100);
  const specificity=(rule:{material_id:string|null;service:string|null})=>(rule.material_id?2:0)+(rule.service?1:0);
  const rule=rules?.sort((a,b)=>specificity(b)-specificity(a)||Date.parse(b.effective_at)-Date.parse(a.effective_at))[0];
  const rates=rule?ratesSchema.parse(rule.rates):defaultRates;
  const usage={service:p.service,grams,printHours:hours*(p.detail==='fine'?1.5:1),designHours:0,finishingHours:p.finishing==='polished'?.5:p.finishing==='clean'?.15:0,laborHours:0,quantity:p.quantity};
  const regular=estimate(usage,rates);
  const {data:promotions}=await svc.from('promotions').select('*').eq('active',true).lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()).order('starts_at').limit(1);
  const promotion=promotions?.[0];
  const eligible=promotion&&regular.subtotal>=Number(promotion.minimum_total);
  const result=eligible?estimate(usage,rates,{kind:z.enum(['fixed','percentage']).parse(promotion.kind),value:Number(promotion.value),allowBelowCost:promotion.allow_below_cost&&!!promotion.authorization_note.trim()}):regular;
  const range=confidence.includes('approximate')?[Math.max(result.minimum,result.productionCost,result.total*0.7),Math.max(result.minimum,result.total*1.5)]:null;
  const details={confidence,range,assumptions:'PETG 1.27 g/cm³; 20% infill; 1.2 mm walls; 6 mm³/s. Supports, orientation and slicer review required.',ratesPublished:!!rule,ratesReviewed:rule?.reviewed??false,pricingRuleId:rule?.id??null,allowBelowCost:!!(eligible&&promotion.allow_below_cost&&promotion.authorization_note.trim())};
  if(route==='estimate')return json({estimate:customerEstimate({...result,...details,promotion:eligible?promotion.name:null})});
  const id=randomUUID();const {data:savedId,error}=await svc.rpc('commit_quote',{p_record:{id,owner_id:user.id,request_key:p.idempotencyKey,service:p.service,configuration:p,snapshot:result.snapshot,estimate:{...result,...details,promotion:eligible?promotion.name:null},catalog_material:toJson(catalogMaterial),catalog_file:catalogFile},p_promo:eligible?promotion.id:null,p_regular:{...regular,...details,allowBelowCost:false,range:confidence.includes('approximate')?[Math.max(regular.minimum,regular.productionCost,regular.total*.7),Math.max(regular.minimum,regular.total*1.5)]:null}});
  if(error){const {data:retry}=await svc.from('quotes').select('id').eq('owner_id',user.id).eq('request_key',p.idempotencyKey).maybeSingle();if(retry)return json({id:retry.id});check(error);}
  return json({id:savedId});
 }
 if(route==='orders'&&req.method==='POST'){
  const p=z.object({quoteId:z.uuid()}).parse(await body(req));const {data:q}=await svc.from('quotes').select('*').eq('id',p.quoteId).eq('owner_id',user.id).single();if(!q)throw new Error('Quote not found');
  const {data:old}=await db.from('orders').select('id').eq('quote_id',q.id).maybeSingle();if(old)return json(old);
  const {data,error}=await svc.from('orders').insert({owner_id:user.id,quote_id:q.id}).select('id').single();if(error){const retry=await db.from('orders').select('id').eq('quote_id',q.id).maybeSingle();if(retry.data)return json(retry.data);check(error);}return json(data);
 }
 if(route==='transition'&&req.method==='POST'){
  const p=z.object({id:z.uuid(),to:z.enum(orderStatuses),note:z.string().max(2000).default('')}).parse(await body(req));const {error}=await db.rpc('transition_order',{p_id:p.id,p_to:p.to,p_note:p.note});check(error);return json({ok:true});
 }
 if(route==='payment'&&req.method==='POST'){
  const p=z.object({orderId:z.uuid(),fileId:z.uuid(),amount:z.number().positive(),idempotencyKey:z.uuid()}).parse(await body(req));
  const {data:o}=await db.from('orders').select('id').eq('id',p.orderId).eq('owner_id',user.id).single();const {data:f}=await db.from('customer_files').select('id').eq('id',p.fileId).eq('owner_id',user.id).eq('kind','payment').single();
  const {data:settings}=await svc.from('settings').select('value').eq('name','bank_transfer').maybeSingle();if(!o||!f||!isEnabled(settings?.value))throw new Error('Manual payment is not enabled or evidence is unavailable');
  const {error}=await svc.from('payments').upsert({owner_id:user.id,order_id:o.id,file_id:f.id,amount:p.amount,request_key:p.idempotencyKey},{onConflict:'request_key',ignoreDuplicates:true});check(error);return json({ok:true,message:'Evidence received. Admin verification is pending.'});
 }
 if(route==='privacy'&&req.method==='POST'){
  const p=z.object({kind:z.enum(['deletion','export'])}).parse(await body(req));const {error}=await svc.from('privacy_requests').insert({owner_id:user.id,kind:p.kind});check(error);return json({ok:true,message:'Request saved for manual processing.'});
 }
 if(path[0]==='document'&&req.method==='GET'){
  const id=z.uuid().parse(path[1]),kind=z.enum(['quotation','invoice','receipt']).parse(new URL(req.url).searchParams.get('kind')??'quotation');
  let query=svc.from('quotes').select('*').eq('id',id);if(!adminApp)query=query.eq('owner_id',user.id);const {data:q}=await query.single();if(!q)throw new Error('Quote not found');
  if(kind!=='quotation'&&q.status!=='accepted')throw new Error('Accepted final quote required');
  if(kind==='receipt'){const {data:o}=await db.from('orders').select('id').eq('quote_id',id).single();const {data:payments}=o?await db.from('payments').select('amount').eq('order_id',o.id).eq('verified',true):{data:null};if(!payments?.length)throw new Error('Verified payments required');const paid=payments.reduce((sum,p)=>sum+Number(p.amount),0);const bytes=await quotationPdf({id,service:q.service,status:'manually verified',total:paid,notes:q.notes,kind});return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="receipt-${id}.pdf"`,'Cache-Control':'private, no-store'}});}
  const bytes=await quotationPdf({id,service:q.service,status:q.status,total:q.final_total===null?null:Number(q.final_total),notes:q.notes,kind});return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${kind}-${id}.pdf"`,'Cache-Control':'private, no-store'}});
 }
 if(route==='payment-instructions'&&req.method==='GET'){const {data}=await svc.from('settings').select('value').eq('name','bank_transfer').maybeSingle();return json({data:isEnabled(data?.value)?data?.value:null});}
 if(route==='preview-jobs'&&req.method==='POST'){
  await rate('ai:'+user.id,10,3600);
  const p=z.object({fileId:z.uuid(),consent:z.literal(true),idempotencyKey:z.uuid()}).parse(await body(req));
  if(process.env.PREVIEW_PROVIDER!=='meshy')throw new Error('Reconstruction is not configured');
  const {data,error}=await svc.rpc('enqueue_generation',{p_owner:user.id,p_file:p.fileId,p_request:p.idempotencyKey});
  if(error)throw new Error(error.message.includes('Daily')?'Daily generation limit':error.message.includes('Reference')?'Reference not found':'Generation unavailable');
  return json({data:{id:data}});
 }
 if(adminApp&&route==='inventory'&&req.method==='POST'){
  const p=z.object({material:z.uuid(),delta:z.number().finite(),kind:z.enum(['receive','reserve','release','consume','adjust']),reason:z.string().min(1).max(1000)}).parse(await body(req));const {error}=await db.rpc('inventory_adjust',{p_material:p.material,p_delta:p.delta,p_kind:p.kind,p_reason:p.reason});check(error);return json({ok:true});
 }
 if(adminApp&&route==='final-quote'&&req.method==='POST'){
  const p=z.object({id:z.uuid(),total:z.number().min(100),notes:z.string().max(4000),designFileId:z.uuid().nullable().default(null),verifiedRates:ratesSchema.optional(),verifiedUsage:z.object({grams:z.number().nonnegative().max(100000),printHours:z.number().nonnegative().max(10000),designHours:z.number().nonnegative().max(10000),finishingHours:z.number().nonnegative().max(10000),laborHours:z.number().nonnegative().max(10000)}).optional()}).parse(await body(req));
  const {data:q}=await svc.from('quotes').select('*').eq('id',p.id).single();if(!q||q.status==='accepted')throw new Error('Quote cannot be revised');
  if(p.designFileId){const {data:f}=await svc.from('customer_files').select('id').eq('id',p.designFileId).eq('owner_id',q.owner_id).eq('kind','mesh').single();if(!f)throw new Error('Final design must be a mesh owned by the customer');}
  if(p.verifiedUsage){const configuration=configureSchema.parse(q.configuration);const calculated=estimate({...p.verifiedUsage,service:z.enum(['ready','photo','custom','reprint']).parse(q.service),quantity:configuration.quantity},p.verifiedRates??ratesSchema.parse(q.snapshot));const {error}=await svc.from('quote_cost_reviews').upsert({quote_id:q.id,reviewer_id:user.id,review:toJson({...calculated,reviewedUsage:p.verifiedUsage})});check(error);}
  const {error}=await db.rpc('issue_final_quote',{p_id:p.id,p_total:p.total,p_notes:p.notes,p_design:p.designFileId});check(error);return json({ok:true});
 }
 if(adminApp&&route==='verify-payment'&&req.method==='POST'){
  const p=z.object({id:z.uuid(),confirmed:z.literal(true)}).parse(await body(req));const {error}=await svc.from('payments').update({verified:true}).eq('id',p.id);check(error);return json({ok:true});
 }
 if(adminApp&&path[0]==='manage'&&req.method==='POST'){
  const table=path[1] as keyof typeof adminSchemas;if(!Object.hasOwn(adminSchemas,table))throw new Error('Unknown editable resource');
  const input=z.object({id:z.uuid().optional(),values:z.unknown(),confirmed:z.literal(true)}).parse(await body(req));const values=adminSchemas[table].parse(input.values);
  if(table==='materials'&&'image_file_id' in values&&values.image_file_id===null)delete values.image_file_id;
  // Pricing is append-only. Publishing new rates never overwrites old snapshots.
  if(table==='pricing_rules'&&input.id)throw new Error('Create a new pricing version');
  // This dynamic editor boundary is schema-validated above; ordinary queries use generated contracts.
  type Editable=keyof typeof adminSchemas;
  const record=toJson({...values,...(table==='pricing_rules'?{reviewed:true}:{})}) as Database['public']['Tables'][Editable]['Insert'];
  async function insertConfig(){switch(table){
   case 'materials': return svc.from('materials').insert(record as Database['public']['Tables']['materials']['Insert']);
   case 'pricing_rules': return svc.from('pricing_rules').insert(record as Database['public']['Tables']['pricing_rules']['Insert']);
   case 'promotions': return svc.from('promotions').insert(record as Database['public']['Tables']['promotions']['Insert']);
   case 'gallery_items': return svc.from('gallery_items').insert(record as Database['public']['Tables']['gallery_items']['Insert']);
   case 'production_jobs': return svc.from('production_jobs').insert(record as Database['public']['Tables']['production_jobs']['Insert']);
   case 'settings': return svc.from('settings').insert(record as Database['public']['Tables']['settings']['Insert']);
   case 'filament_spools': return svc.from('filament_spools').insert(record as Database['public']['Tables']['filament_spools']['Insert']);
  }}
  const {error}=input.id?await svc.from(table).update(record).eq('id',input.id):await insertConfig();check(error);return json({ok:true});
 }
 if(req.method==='GET'&&['quotes','orders','notifications','payments','preview-jobs'].includes(route)){
  let query=(route==='quotes'?svc:db).from(route==='preview-jobs'?'preview_jobs':route).select('*').order('created_at',{ascending:false}).limit(100);if(!adminApp)query=query.eq('owner_id',user.id);const {data,error}=await query;check(error);return json({data:adminApp?data:route==='quotes'?data?.map(row=>customerQuote(row as Row<'quotes'>)):route==='preview-jobs'?data?.map(row=>customerJob(row as Row<'preview_jobs'>)):data});
 }
 if(req.method==='GET'&&path[0]==='preview-jobs'&&path[1]){const id=z.uuid().parse(path[1]);let query=db.from('preview_jobs').select('*').eq('id',id);if(!adminApp)query=query.eq('owner_id',user.id);const {data,error}=await query.single();if(error||!data)return json({error:'Not found'},404);return json({data:adminApp?data:customerJob(data)});}
 if(route==='cancel-preview'&&req.method==='POST'){const p=z.object({id:z.uuid()}).parse(await body(req));let q=db.from('preview_jobs').select('*').eq('id',p.id);if(!adminApp)q=q.eq('owner_id',user.id);const {data}=await q.single();if(!data)throw new Error('Job not found');if(['succeeded','failed','cancelled'].includes(data.state))throw new Error('Job has already ended');const {error}=await svc.from('preview_jobs').update({cancel_requested:true}).eq('id',p.id);check(error);return json({ok:true,message:'Cancellation requested. Running provider work may be non-refundable.'});}
 if(req.method==='GET'&&adminApp&&path[0]==='manage'){
  const table=path[1];if(!adminTables.includes(table as typeof adminTables[number]))throw new Error('Unknown resource');let query=(['gallery_items','pricing_rules','quotes','promotions'].includes(table)?svc:db).from(table).select('*').order('created_at',{ascending:false}).limit(100);const url=new URL(req.url);if(url.searchParams.has('owner')&&['customer_files','payments'].includes(table))query=query.eq('owner_id',z.uuid().parse(url.searchParams.get('owner')));if(url.searchParams.has('orderId')&&table==='payments')query=query.eq('order_id',z.uuid().parse(url.searchParams.get('orderId')));const {data,error}=await query;check(error);return json({data});
 }
 if(req.method==='GET'&&['quotes','orders'].includes(path[0])&&path[1]){
  const id=z.uuid().parse(path[1]);let query=(path[0]==='quotes'?svc:db).from(path[0]).select('*').eq('id',id);if(!adminApp)query=query.eq('owner_id',user.id);const {data,error}=await query.single();if(error||!data)return json({error:'Not found'},404);
  const quoteId=path[0]==='quotes'?id:String((data as Row<'orders'>).quote_id);
  const {data:modelSnapshot}=await db.from('model_order_snapshots').select('metadata').eq('quote_id',quoteId).maybeSingle();
  let finance:unknown=null;
  if(adminApp){
   const [quotation,review]=await Promise.all([
    svc.from('quotes').select('owner_id,estimate,snapshot,configuration,final_total').eq('id',quoteId).single(),
    db.from('quote_cost_reviews').select('review').eq('quote_id',quoteId).maybeSingle()
   ]);check(quotation.error);check(review.error);
   const q=quotation.data;if(!q)throw new Error('Quote not found');
   const selection=z.object({materialId:z.uuid().nullable().optional()}).parse(q.configuration);
   finance={quote:q,verified:review.data?.review??null,...await adminOrderContext(svc,q.owner_id,selection.materialId??null)};
  }
  const {data:events}=path[0]==='orders'?await db.from('order_events').select('*').eq('order_id',id).order('created_at'): {data:null};return json({data:!adminApp&&path[0]==='quotes'?customerQuote(data as Row<'quotes'>):data,events,modelSnapshot:modelSnapshot?.metadata??null,finance});
 }
 return json({error:'Not found'},404);
 } catch(error){
  const message=error instanceof Error?error.message:'Request failed';
  const safe=message.includes('Database')?'The operation could not be completed. Please retry or contact the shop.':message;
  return json({error:safe},message.includes('Authentication')?401:message.includes('Admin')||message.includes('Origin')?403:400);
 }
}
