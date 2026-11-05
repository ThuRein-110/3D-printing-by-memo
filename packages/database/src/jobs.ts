import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Row} from './generated';
import type {ReconstructionProvider} from './provider';
import {nextJobAction} from './provider';
import {parseMesh} from '@mfu/three';
import {validateHeader} from '@mfu/validation';
import {createHash} from 'node:crypto';
export async function processGeneration(db:SupabaseClient<Database>,provider:ReconstructionProvider,job:Row<'preview_jobs'>){
 const update=async(values:Database['public']['Tables']['preview_jobs']['Update'])=>{const {error}=await db.from('preview_jobs').update(values).eq('id',job.id).eq('state','processing');if(error)throw new Error('JOB_PERSIST_FAILED');};
 try{
  if(job.cancel_requested){if(!job.provider_id&&job.attempts===0){await update({state:'cancelled',lease_until:null});return;}if(job.provider_id&&await provider.cancel(job.provider_id)){await update({state:'cancelled',lease_until:null});return;}await update({cancel_requested:false,error_code:'REMOTE_CANCELLATION_UNAVAILABLE'});}
  const action=nextJobAction(job);
  if(action==='reconcile'){await update({state:'failed',error_code:'SUBMISSION_UNCERTAIN_RECONCILE_MANUALLY',lease_until:null});return;}
  if(action==='timeout'){await update({state:'failed',error_code:'TIMEOUT_REMOTE_MAY_STILL_RUN',lease_until:null});return;}
  if(action==='submit'){
   const {data:file}=await db.from('customer_files').select('*').eq('id',job.file_id).eq('owner_id',job.owner_id).single();if(!file||file.kind!=='reference')throw new Error('REFERENCE_MISSING');
   const download=await db.storage.from('customer-private').download(file.path);if(!download.data)throw new Error('REFERENCE_MISSING');const bytes=new Uint8Array(await download.data.arrayBuffer());validateHeader(file.original_name,bytes);
   const reservation=await db.rpc('start_generation',{p_job:job.id});if(reservation.error||reservation.data!==true){await update({state:'failed',error_code:'BUDGET_OR_CANCELLATION',lease_until:null});return;}
   job.attempts=1; // SQL persists the at-most-once guard before the paid POST.
   const id=await provider.submit(`data:${file.mime};base64,${Buffer.from(bytes).toString('base64')}`,job.id);
   await update({provider_id:id,lease_until:null,next_attempt_at:new Date(Date.now()+15000).toISOString()});return;
  }
  if(!job.provider_id)throw new Error('JOB_ID_MISSING');const task=await provider.status(job.provider_id);
  await update({progress:task.progress??null,consumed_credits:task.consumedCredits??null,poll_failures:0});
  if(task.state==='succeeded'){
   const bytes=await provider.retrieve(task),format=task.format??'glb',mesh=parseMesh(bytes,format);
   // Deterministic output ID/path makes output persistence retries idempotent.
   const id=job.id,path=`${job.owner_id}/generated/${id}.${format}`;
   const {data:existing}=await db.from('customer_files').select('id').eq('id',id).eq('owner_id',job.owner_id).maybeSingle();
   if(!existing){const upload=await db.storage.from('customer-private').upload(path,bytes,{contentType:format==='glb'?'model/gltf-binary':'application/octet-stream',upsert:true});if(upload.error)throw new Error('OUTPUT_UPLOAD_FAILED');
    const insert=await db.from('customer_files').insert({id,owner_id:job.owner_id,path,sha256:createHash('sha256').update(bytes).digest('hex'),original_name:`reconstructed.${format}`,mime:format==='glb'?'model/gltf-binary':'application/octet-stream',bytes:bytes.length,kind:'mesh',generated:true,source_job_id:job.id,analysis:{dimensions:mesh.dimensions,volumeMm3:mesh.volumeMm3,surfaceMm2:mesh.surfaceMm2,triangles:mesh.triangles,closed:mesh.closed,scale:'gltf-metres-to-mm; physical subject size unknown'}});if(insert.error)throw new Error('OUTPUT_RECORD_FAILED');}
   await update({state:'succeeded',output_file_id:id,lease_until:null,error_code:null});
  }else if(['failed','cancelled'].includes(task.state))await update({state:task.state,lease_until:null,error_code:'PROVIDER_TERMINAL'});
  else await update({lease_until:null,next_attempt_at:new Date(Date.now()+15000).toISOString()});
 }catch(error){
  const polling=Boolean(job.provider_id),retry=polling&&job.poll_failures<5&&(provider.classify(error)!=='permanent'||(error instanceof Error&&error.message.startsWith('OUTPUT_')));
  await update(retry?{poll_failures:job.poll_failures+1,lease_until:null,next_attempt_at:new Date(Date.now()+Math.min(300000,15000*2**job.poll_failures)).toISOString(),error_code:'POLL_RETRY'}:{state:'failed',lease_until:null,error_code:polling?'PROCESSING_FAILED':job.attempts?'SUBMISSION_UNCERTAIN_RECONCILE_MANUALLY':'REFERENCE_MISSING'});
 }
}
