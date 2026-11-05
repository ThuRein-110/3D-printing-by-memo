import {glbPositions} from './glb';
// Bounded parser without network, archive, material or script loading. Units: millimetres.
export interface MeshData {positions:number[];dimensions:{x:number;y:number;z:number};volumeMm3:number;surfaceMm2:number;triangles:number;closed:boolean}
const LIMIT=100_000;
export function parseMesh(bytes:Uint8Array, ext:string): MeshData {
 const positions:number[]=[];
 const add=(n:number)=>{if(!Number.isFinite(n)||Math.abs(n)>1e6)throw new Error('Invalid mesh coordinates');positions.push(n);if(positions.length>LIMIT*9)throw new Error('Mesh exceeds 100,000 triangles');};
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(ext==='stl') {
  const count=bytes.length>=84?view.getUint32(80,true):0;
  if(count>0 && 84+count*50===bytes.length){if(count>LIMIT)throw new Error('Too many triangles');for(let i=0;i<count;i++)for(let j=0;j<9;j++)add(view.getFloat32(84+i*50+12+j*4,true));}
  else {const txt=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!txt.trimStart().startsWith('solid'))throw new Error('Invalid STL'); const re=/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;for(const m of txt.matchAll(re))for(let j=1;j<=3;j++)add(Number(m[j]));}
 } else if(ext==='obj') {
  const vertices:number[][]=[];
  for(const line of new TextDecoder('utf-8',{fatal:true}).decode(bytes).split(/\r?\n/)){
   const p=line.trim().split(/\s+/);
   if(p[0]==='v'){if(p.length!==4||vertices.length>300000)throw new Error('Unsupported OBJ vertices');vertices.push(p.slice(1).map(Number));}
   if(p[0]==='f'){if(p.length!==4)throw new Error('Triangulated OBJ required');for(const item of p.slice(1)){const idx=Number(item.split('/')[0]);if(!Number.isInteger(idx)||idx<1||!vertices[idx-1])throw new Error('Invalid OBJ index');vertices[idx-1].forEach(add);}}
   if(['mtllib','usemtl','call','csh'].includes(p[0]))throw new Error('External OBJ resources disabled');
  }
 } else if(ext==='glb') {
  glbPositions(bytes).forEach(add);
 } else throw new Error('Unsupported mesh');
 return measurePositions(positions);
}
export function measurePositions(positions:number[]):MeshData {
 if(positions.length>900000||positions.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6))throw new Error('Invalid mesh bounds');
 if(!positions.length||positions.length%9)throw new Error('Invalid triangle mesh');
 let vol=0,area=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],edges=new Map<string,number>();
 for(let i=0;i<positions.length;i+=9){const a=positions.slice(i,i+3),b=positions.slice(i+3,i+6),c=positions.slice(i+6,i+9);vol+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;const ab=b.map((v,j)=>v-a[j]),ac=c.map((v,j)=>v-a[j]);area+=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])/2;for(const v of [a,b,c])v.forEach((x,j)=>{min[j]=Math.min(min[j],x);max[j]=Math.max(max[j],x);});for(const [v,w] of [[a,b],[b,c],[c,a]]){const key=[v.join(','),w.join(',')].sort().join('|');edges.set(key,(edges.get(key)??0)+1);}}
 return {positions,dimensions:{x:max[0]-min[0],y:max[1]-min[1],z:max[2]-min[2]},volumeMm3:Math.abs(vol),surfaceMm2:area,triangles:positions.length/9,closed:[...edges.values()].every(n=>n===2)};
}
export function approximateUsage(mesh:MeshData, scale:number, infill=0.2,wallMm=1.2,mm3PerSecond=6) {
 if(!mesh.closed||mesh.volumeMm3<=0)throw new Error('Watertight mesh required for volume estimation');
 if(!Number.isFinite(scale)||scale<=0||scale>100||infill<0||infill>1||wallMm<=0||mm3PerSecond<=0)throw new Error('Invalid geometry assumptions');
 const volume=mesh.volumeMm3*scale**3, shell=Math.min(volume,mesh.surfaceMm2*scale**2*wallMm),extruded=shell+(volume-shell)*infill;
 return {grams:extruded/1000*1.27,printHours:extruded/mm3PerSecond/3600,range:[0.7,1.5],assumptions:{infill,wallMm,mm3PerSecond,density:1.27},confidence:'approximate'};
}

export function resizeMesh(mesh:MeshData,dimensions:{x:number;y:number;z:number}):MeshData {
 const scales=[dimensions.x/mesh.dimensions.x,dimensions.y/mesh.dimensions.y,dimensions.z/mesh.dimensions.z];
 if(!scales.every(v=>Number.isFinite(v)&&v>0&&v<=100000))throw new Error('Invalid geometry scaling');
 return measurePositions(mesh.positions.map((v,i)=>v*scales[i%3]));
}
