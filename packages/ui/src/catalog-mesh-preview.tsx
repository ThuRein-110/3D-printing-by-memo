'use client';
import dynamic from 'next/dynamic';
import {useState,useEffect} from 'react';
import {measurePositions,type MeshData} from '@mfu/three/geometry.ts';
import {ApiError} from './api';
import {ErrorMessage,useViewerLabels} from './common';
const Viewer=dynamic(()=>import('@mfu/three/Preview.tsx'),{ssr:false});
export function CatalogMeshPreview({id}:{id:string}){
 const labels=useViewerLabels(),[mesh,setMesh]=useState<MeshData>(),[error,setError]=useState<unknown>();
 useEffect(()=>{let active=true;const controller=new AbortController();setMesh(undefined);setError(undefined);void(async()=>{try{const res=await fetch(`/api/catalog/assets/${id}/preview`,{signal:controller.signal});if(!res.ok||res.headers.get('content-type')!=='application/vnd.memo.mesh')throw new ApiError('file');const bytes=await res.arrayBuffer();if(bytes.byteLength>3600000||bytes.byteLength%36||!bytes.byteLength)throw new ApiError('file');const view=new DataView(bytes),positions:number[]=[];for(let i=0;i<bytes.byteLength;i+=4){const n=view.getFloat32(i,true);if(!Number.isFinite(n)||Math.abs(n)>1e6)throw new ApiError('file');positions.push(n);}if(active)setMesh(measurePositions(positions));}catch(e){if(active)setError(e);}})();return()=>{active=false;controller.abort();};},[id]);
 return <><ErrorMessage error={error}/><Viewer positions={mesh?.positions} dimensions={mesh?.dimensions??{x:60,y:60,z:60}} color="#858d86" labels={labels} allowExport={false}/></>;
}
