'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import { BufferGeometry,Float32BufferAttribute,Box3,Vector3 } from 'three';
import { useMemo,useRef } from 'react';
function Part({positions,dimensions,color}:{positions?:number[];dimensions:{x:number;y:number;z:number};color:string}){
 const geometry=useMemo(()=>{if(!positions)return undefined;const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.computeVertexNormals();g.center();const box=new Box3().setFromBufferAttribute(g.getAttribute('position') as import('three').BufferAttribute);const size=box.getSize(new Vector3());g.scale(dimensions.x/(size.x||1),dimensions.y/(size.y||1),dimensions.z/(size.z||1));return g;},[positions,dimensions.x,dimensions.y,dimensions.z]);
 return <mesh geometry={geometry} position={[0,dimensions.y/2,0]}>{!geometry&&<boxGeometry args={[dimensions.x,dimensions.y,dimensions.z]}/>}<meshStandardMaterial color={color} roughness={0.58} metalness={0.05} wireframe={!positions}/></mesh>;
}
export default function Preview({positions,dimensions,color}:{positions?:number[];dimensions:{x:number;y:number;z:number};color:string}){
 const canvasRef=useRef<HTMLCanvasElement|null>(null);const size=Math.max(dimensions.x,dimensions.y,dimensions.z,60);
 return <div className="viewer"><div className="viewer-label">{positions?'MESH PREVIEW · mm':'ILLUSTRATION · NOT RECONSTRUCTED GEOMETRY'}</div>
 <Canvas camera={{position:[size*1.6,size*1.4,size*1.8],near:0.1,far:10000}} dpr={[1,1.5]} gl={{preserveDrawingBuffer:true,antialias:true}} onCreated={({gl})=>{canvasRef.current=gl.domElement;}}>
  <color attach="background" args={['#edf0ec']}/><ambientLight intensity={1.5}/><directionalLight position={[200,400,200]} intensity={3}/>
  <Part positions={positions} dimensions={dimensions} color={color}/><Grid args={[600,600]} cellSize={10} sectionSize={50} cellColor="#c5cec9" sectionColor="#98a9a0" fadeDistance={1200}/>
  <Line points={[[0,0.2,-size],[100,0.2,-size]]} color="#316351" lineWidth={2}/><OrbitControls makeDefault target={[0,dimensions.y/2,0]} minDistance={10} maxDistance={3000}/>
 </Canvas><div className="viewer-bottom"><span>100 mm ruler · Drag to rotate · Scroll to zoom</span><button type="button" className="small" onClick={()=>{const a=document.createElement('a');a.download='my-preview.png';a.href=canvasRef.current?.toDataURL('image/png')??'';a.click();}}>Save screenshot</button></div></div>;
}
