import { createClient } from '@supabase/supabase-js';
import { MeshyProvider } from '@mfu/database/provider.ts';
import {processGeneration} from '@mfu/database/jobs.ts';
import type {Database} from '@mfu/database/generated.ts';
if(process.env.PREVIEW_PROVIDER!=='meshy'||!process.env.MESHY_API_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Worker requires explicit Meshy configuration and backend credentials');
const db=createClient<Database>(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const provider=new MeshyProvider(process.env.MESHY_API_KEY,(process.env.PROVIDER_ASSET_HOSTS??'assets.meshy.ai').split(','));
const schemaCheck=await db.from('generation_settings').select('id').limit(1);if(schemaCheck.error)throw new Error('Apply reviewed migration 009 before starting the upgraded worker');
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function tick(){
 const {data,error}=await db.rpc('claim_preview_job');if(error)throw new Error('JOB_CLAIM_FAILED');const job=data?.[0];if(!job)return false;
 await processGeneration(db,provider,job);return true;
}
while(!stopping){try{const worked=await tick();if(!worked)await new Promise(r=>setTimeout(r,5000));}catch{console.error(JSON.stringify({event:'worker_error',code:'BACKEND_UNAVAILABLE'}));await new Promise(r=>setTimeout(r,5000));}}
