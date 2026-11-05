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
  // Strict embedded, uncompressed triangle GLB only. Never load external buffers/textures.
  if(bytes.length<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length)throw new Error('Invalid GLB');
  const length=view.getUint32(12,true);if(20+length+8>bytes.length||length>1000000)throw new Error('Invalid GLB JSON');
  const doc=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+length))) as {buffers:{uri?:string}[];images?:unknown[];extensionsUsed?:unknown[];nodes?:{matrix?:unknown;translation?:unknown;rotation?:unknown;scale?:unknown}[];meshes:{primitives:{mode?:number;attributes:{POSITION:number};indices?:number}[]}[];accessors:{bufferView:number;byteOffset?:number;componentType:number;count:number;type:string;sparse?:unknown}[];bufferViews:{buffer:number;byteOffset?:number;byteLength:number;byteStride?:number}[]};
  if(doc.buffers.length!==1||doc.buffers.some(b=>b.uri)||doc.images?.length||doc.extensionsUsed?.length||doc.nodes?.some(n=>n.matrix||n.translation||n.rotation||n.scale))throw new Error('GLB must be embedded untextured geometry without transforms/extensions');
  const binStart=28+length, binLength=view.getUint32(20+length,true);
  if(view.getUint32(24+length,true)!==0x004e4942||binStart+binLength!==bytes.length)throw new Error('Invalid binary chunk');
  const read=(ai:number, vector:boolean)=>{const a=doc.accessors[ai],b=doc.bufferViews[a?.bufferView];if(!a||!b||b.buffer!==0||a.sparse||a.count>300000||a.type!==(vector?'VEC3':'SCALAR'))throw new Error('Unsupported accessor');const size=a.componentType===5126?4:a.componentType===5125?4:a.componentType===5123?2:a.componentType===5121?1:0;if(!size||(vector&&a.componentType!==5126))throw new Error('Invalid component');const width=vector?3:1,stride=b.byteStride??width*size,start=(b.byteOffset??0)+(a.byteOffset??0);if(start+(a.count-1)*stride+width*size>(b.byteOffset??0)+b.byteLength||start+(a.count-1)*stride+width*size>binLength)throw new Error('Out of bounds accessor');const out:number[]=[];for(let i=0;i<a.count;i++)for(let j=0;j<width;j++){const off=binStart+start+i*stride+j*size;out.push(a.componentType===5126?view.getFloat32(off,true):size===4?view.getUint32(off,true):size===2?view.getUint16(off,true):view.getUint8(off));}return out;};
  for(const mesh of doc.meshes)for(const p of mesh.primitives){if(p.mode!==undefined&&p.mode!==4)throw new Error('Triangles only');const vs=read(p.attributes.POSITION,true),indices=p.indices===undefined?Array.from({length:vs.length/3},(_,i)=>i):read(p.indices,false);for(const i of indices){if(!Number.isInteger(i)||i*3+2>=vs.length)throw new Error('Invalid mesh index');for(let j=0;j<3;j++)add(vs[i*3+j]);}}
 } else throw new Error('Unsupported mesh');
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
