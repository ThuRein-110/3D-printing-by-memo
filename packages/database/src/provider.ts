import { z } from 'zod';
export type ProviderState='queued'|'processing'|'succeeded'|'failed'|'cancelled';
export interface Task {id:string;state:ProviderState;asset?:string;format?:'glb'|'stl';progress?:number;consumedCredits?:number}
export interface ReconstructionProvider {
 submit(imageDataUri:string,jobKey?:string):Promise<string>;
 status(id:string):Promise<Task>;
 cancel(id:string):Promise<boolean>;
 retrieve(task:Task):Promise<Uint8Array>;
 classify(error:unknown):'retryable'|'permanent'|'ambiguous';
}
export class ProviderError extends Error {constructor(public code:string,public httpStatus?:number){super(code);}}
export class MeshyProvider implements ReconstructionProvider {
 constructor(private key:string,private assetHosts:string[]=['assets.meshy.ai'],private request:typeof fetch=fetch){}
 private async call(path:string,method='GET',payload?:unknown,jobKey?:string){
  let response:Response;try{response=await this.request('https://api.meshy.ai/openapi/v1/image-to-3d'+path,{method,headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json',...(jobKey?{'X-Meshy-Metadata':`job=${encodeURIComponent(jobKey)}`}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(20_000),redirect:'error'});}catch{throw new ProviderError('NETWORK_UNCERTAIN');}
  if(!response.ok)throw new ProviderError('PROVIDER_HTTP',response.status);return response;
 }
 async submit(imageDataUri:string,jobKey?:string){if(!/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUri))throw new ProviderError('INVALID_IMAGE');
  const r=await this.call('','POST',{image_url:imageDataUri,ai_model:'meshy-7.1',should_texture:false,should_remesh:true,target_polycount:30000,target_formats:['glb']},jobKey);return z.object({result:z.string().min(1).max(200)}).parse(await r.json()).result;
 }
 async status(id:string):Promise<Task>{const r=await this.call('/'+encodeURIComponent(id));const task=z.object({id:z.string(),status:z.enum(['PENDING','IN_PROGRESS','SUCCEEDED','FAILED','CANCELED']),progress:z.number().int().min(0).max(100).optional(),consumed_credits:z.number().int().nonnegative().optional(),model_urls:z.object({glb:z.string().optional(),stl:z.string().optional()}).optional()}).parse(await r.json());const map={PENDING:'queued',IN_PROGRESS:'processing',SUCCEEDED:'succeeded',FAILED:'failed',CANCELED:'cancelled'} as const;return {id:task.id,state:map[task.status],asset:task.model_urls?.glb??task.model_urls?.stl,format:task.model_urls?.glb?'glb':'stl',progress:task.progress,consumedCredits:task.consumed_credits};}
 async cancel(id:string){try{await this.call('/'+encodeURIComponent(id),'DELETE');return true;}catch(e){if(e instanceof ProviderError&&e.httpStatus===409)return false;throw e;}}
 async retrieve(task:Task){if(task.state!=='succeeded'||!task.asset)throw new ProviderError('NO_GEOMETRY');const url=new URL(task.asset);if(url.protocol!=='https:'||url.username||url.password||url.port||!this.assetHosts.includes(url.hostname))throw new ProviderError('ASSET_HOST_REJECTED');
  const r=await this.request(url,{redirect:'error',signal:AbortSignal.timeout(20_000)});if(!r.ok||!r.body)throw new ProviderError('DOWNLOAD_FAILED');if(Number(r.headers.get('content-length')??0)>4194304)throw new ProviderError('ASSET_TOO_LARGE');
  const reader=r.body.getReader();let size=0;const chunks:Uint8Array[]=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4194304){await reader.cancel();throw new ProviderError('ASSET_TOO_LARGE');}chunks.push(value);}const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;
 }
 classify(error:unknown){if(error instanceof ProviderError){if(error.code==='NETWORK_UNCERTAIN')return 'ambiguous';if(error.httpStatus===429||(error.httpStatus??0)>=500)return 'retryable';}return 'permanent';}
}
export function nextJobAction(job:{provider_id:string|null;attempts:number;started_at:string|null},now=Date.now()){
 if(job.started_at&&now-Date.parse(job.started_at)>30*60_000)return 'timeout';
 if(job.provider_id)return 'poll';if(job.attempts>0)return 'reconcile';return 'submit';
}
