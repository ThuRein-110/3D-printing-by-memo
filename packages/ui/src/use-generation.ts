'use client';
import {useEffect,useState} from 'react';
import {api,ApiError,post} from './api';
import {parseMesh} from '@mfu/three';
import type {MeshData} from '@mfu/three/geometry.ts';
export type GenerationJob={id:string;state:string;progress:number|null;error_code:string|null;output_file_id:string|null;file_id:string;cancel_requested:boolean};
export async function loadPrivateMesh(id:string):Promise<MeshData>{const metadata=await api<{data:{original_name:string}}>(`/files/${id}?metadata=true`);const r=await fetch(`/api/files/${id}`);if(!r.ok)throw new ApiError('file');return parseMesh(new Uint8Array(await r.arrayBuffer()),metadata.data.original_name.split('.').pop()?.toLowerCase()??'glb');}
export function useGeneration(id:string|undefined){const [job,setJob]=useState<GenerationJob>(),[mesh,setMesh]=useState<MeshData>(),[error,setError]=useState<unknown>(),[revision,setRevision]=useState(0);useEffect(()=>{setJob(undefined);setMesh(undefined);setError(undefined);if(!id)return;let active=true,timer:ReturnType<typeof setTimeout>;async function poll(){try{const r=await api<{data:GenerationJob}>(`/preview-jobs/${id}`);if(!active)return;setJob(r.data);setError(undefined);if(!['succeeded','failed','cancelled'].includes(r.data.state))timer=setTimeout(poll,5000);}catch(e){if(active){setError(e);timer=setTimeout(poll,15000);}}}void poll();return()=>{active=false;clearTimeout(timer);};},[id,revision]);
 useEffect(()=>{if(!job?.output_file_id)return;let active=true;loadPrivateMesh(job.output_file_id).then(m=>{if(active)setMesh(m);}).catch(e=>{if(active)setError(e);});return()=>{active=false;};},[job?.output_file_id,revision]);
 return {job,mesh,error,retry:async()=>{if(!id)return;await post('/retry-preview',{id});setRevision(v=>v+1);},cancel:async()=>{if(!id)return;await post('/cancel-preview',{id});setRevision(v=>v+1);}};
}
