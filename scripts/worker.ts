import { createClient } from '@supabase/supabase-js';
import { createHash,randomUUID } from 'node:crypto';
import { MeshyProvider,nextJobAction } from '@mfu/database/provider.ts';
import { parseMesh } from '@mfu/three';
import type {Database} from '@mfu/database/generated.ts';
if(process.env.PREVIEW_PROVIDER!=='meshy'||!process.env.MESHY_API_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Worker requires explicit Meshy configuration and backend credentials');
const db=createClient<Database>(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const provider=new MeshyProvider(process.env.MESHY_API_KEY,(process.env.PROVIDER_ASSET_HOSTS??'assets.meshy.ai').split(','));
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function tick(){
 const {data,error}=await db.rpc('claim_preview_job');if(error)throw new Error('JOB_CLAIM_FAILED');const job=data?.[0];if(!job)return false;
 const update=async(values:Database['public']['Tables']['preview_jobs']['Update'])=>{const {error}=await db.from('preview_jobs').update(values).eq('id',job.id);if(error)throw new Error('JOB_PERSIST_FAILED');};
 try{
  if(job.cancel_requested){if(!job.provider_id&&job.attempts===0){await update({state:'cancelled',lease_until:null});return true;}if(job.provider_id&&await provider.cancel(job.provider_id)){await update({state:'cancelled',lease_until:null});return true;}await update({cancel_requested:false,error_code:'REMOTE_CANCELLATION_UNAVAILABLE'});}
  const action=nextJobAction(job);
  if(action==='reconcile'){await update({state:'failed',error_code:'SUBMISSION_UNCERTAIN_RECONCILE_MANUALLY',lease_until:null});return true;}
  if(action==='timeout'){await update({state:'failed',error_code:'TIMEOUT_REMOTE_MAY_STILL_RUN',lease_until:null});return true;}
  if(action==='submit'){
   // Reserve configured worst-case budget atomically before any paid request. No automatic POST retries.
   const budget=await db.rpc('reserve_provider_budget',{p_job:job.id});if(budget.error||budget.data!==true){await update({state:'failed',error_code:'BUDGET_EXHAUSTED',lease_until:null});return true;}
   const {data:file}=await db.from('customer_files').select('*').eq('id',job.file_id).eq('owner_id',job.owner_id).single();if(!file||file.kind!=='reference')throw new Error('REFERENCE_MISSING');
   const download=await db.storage.from('customer-private').download(file.path);if(!download.data)throw new Error('REFERENCE_MISSING');
   await update({attempts:1}); // Crash after this point never resubmits a potentially paid task.
   const id=await provider.submit(`data:${file.mime};base64,${Buffer.from(await download.data.arrayBuffer()).toString('base64')}`);
   await update({provider_id:id,lease_until:null,next_attempt_at:new Date(Date.now()+15000).toISOString()});return true;
  }
  if(!job.provider_id)throw new Error('JOB_ID_MISSING');
  const task=await provider.status(job.provider_id);
  if(task.state==='succeeded'){
   const bytes=await provider.retrieve(task),mesh=parseMesh(bytes,'stl'),id=randomUUID(),path=`${job.owner_id}/${id}.stl`;
   const up=await db.storage.from('customer-private').upload(path,bytes,{contentType:'application/octet-stream'});if(up.error)throw new Error('OUTPUT_UPLOAD_FAILED');
   const insert=await db.from('customer_files').insert({id,owner_id:job.owner_id,path,sha256:createHash('sha256').update(bytes).digest('hex'),original_name:'reconstructed.stl',mime:'application/octet-stream',bytes:bytes.length,kind:'mesh',analysis:{...mesh,positions:undefined}});if(insert.error)throw new Error('OUTPUT_RECORD_FAILED');
   await update({state:'succeeded',output_file_id:id,lease_until:null,error_code:null});
  }else if(['failed','cancelled'].includes(task.state))await update({state:task.state,lease_until:null,error_code:'PROVIDER_TERMINAL'});
  else await update({lease_until:null,next_attempt_at:new Date(Date.now()+15000).toISOString()});
 }catch(e){
  // Polling retries are safe; paid submit errors are never blindly retried.
  const retry=!!job.provider_id&&provider.classify(e)!=='permanent';
  await update(retry?{lease_until:null,next_attempt_at:new Date(Date.now()+60000).toISOString(),error_code:'POLL_RETRY'}:{state:'failed',lease_until:null,error_code:job.provider_id?'PROCESSING_FAILED':'SUBMISSION_UNCERTAIN_RECONCILE_MANUALLY'});
 }
 return true;
}
while(!stopping){try{const worked=await tick();if(!worked)await new Promise(r=>setTimeout(r,5000));}catch{console.error(JSON.stringify({event:'worker_error',code:'BACKEND_UNAVAILABLE'}));await new Promise(r=>setTimeout(r,5000));}}
