'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {parseMesh} from '@mfu/three';
import {api} from './workflows';
const Viewer=dynamic(()=>import('@mfu/three/Preview.tsx'),{ssr:false});
export function PreviewJob({id}:{id:string}){
 const [job,setJob]=useState<Record<string,unknown>>(),[error,setError]=useState(''),[mesh,setMesh]=useState<ReturnType<typeof parseMesh>>();
 useEffect(()=>{let active=true;async function load(){try{const r=await api(`/preview-jobs/${id}`);if(active)setJob(r.data as Record<string,unknown>);}catch(e){if(active)setError((e as Error).message);}}void load();const timer=setInterval(load,10000);return()=>{active=false;clearInterval(timer);};},[id]);
 useEffect(()=>{if(!job?.output_file_id)return;let active=true;fetch(`/api/files/${job.output_file_id}`).then(async r=>{if(!r.ok)throw new Error('Generated file is unavailable');const m=parseMesh(new Uint8Array(await r.arrayBuffer()),'stl');if(active)setMesh(m);}).catch(e=>setError(e.message));return()=>{active=false;};},[job?.output_file_id]);
 return <section className="wrap section page"><div className="eyebrow">PHOTO → 3D / RECONSTRUCTION</div><h1>Your preview job</h1><p role="status">{job?String(job.state):'Loading private job…'}</p>{error&&<p className="error" role="alert">{error}</p>}{Boolean(job?.error_code)&&<p className="notice">{String(job?.error_code)} · Contact the shop for review. No automatic resubmission will be made.</p>}{mesh?<Viewer positions={mesh.positions} dimensions={mesh.dimensions} color="#8b9390"/>:<p>There is no reconstructed mesh to display yet. The uploaded reference remains a photograph.</p>}{job&&!['succeeded','failed','cancelled'].includes(String(job.state))&&<button className="choice" onClick={async()=>{try{await api('/cancel-preview',{method:'POST',body:JSON.stringify({id})});setError('Cancellation requested; provider work already in progress may continue and incur cost.');}catch(e){setError((e as Error).message);}}}>Request cancellation</button>}<p className="fine">Generated geometry requires printability and scale review. No exact material or production-time claims are made.</p></section>;
}
