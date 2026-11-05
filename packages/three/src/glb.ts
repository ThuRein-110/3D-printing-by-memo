import {Matrix4,Quaternion,Vector3} from 'three';
import {z} from 'zod';
const integer=z.number().int().min(0).max(16_000_000),finite=z.number().finite().min(-1e6).max(1e6);
const schema=z.object({
 asset:z.object({version:z.literal('2.0')}),
 buffers:z.array(z.object({byteLength:integer,uri:z.never().optional()})).length(1),
 bufferViews:z.array(z.object({buffer:z.literal(0),byteOffset:integer.default(0),byteLength:integer,byteStride:z.number().int().min(4).max(252).optional()})).max(10000),
 accessors:z.array(z.object({bufferView:integer,byteOffset:integer.default(0),componentType:z.number().int(),count:z.number().int().min(1).max(300000),type:z.enum(['SCALAR','VEC3','VEC2','VEC4','MAT4']),sparse:z.never().optional(),normalized:z.literal(false).optional()})).max(10000),
 meshes:z.array(z.object({primitives:z.array(z.object({mode:z.literal(4).optional(),attributes:z.object({POSITION:integer}),indices:integer.optional(),extensions:z.never().optional(),targets:z.never().optional()})).min(1).max(1000)})).min(1).max(1000),
 nodes:z.array(z.object({mesh:integer.optional(),children:z.array(integer).max(1000).optional(),matrix:z.array(finite).length(16).optional(),translation:z.array(finite).length(3).optional(),rotation:z.array(finite).length(4).optional(),scale:z.array(finite).length(3).optional(),skin:z.never().optional()})).max(10000).optional(),
 scenes:z.array(z.object({nodes:z.array(integer).max(10000)})).max(100).optional(),scene:integer.optional(),
 images:z.array(z.unknown()).max(0).optional(),animations:z.array(z.unknown()).max(0).optional(),extensionsUsed:z.array(z.string()).max(0).optional()
});
/** GLB 2 triangles only; embedded buffers; no loader, network, textures, animation or decompression. */
export function glbPositions(bytes:Uint8Array):number[]{
 if(bytes.length<28||bytes.length>4194304)throw new Error('Invalid GLB size');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length||view.getUint32(16,true)!==0x4e4f534a)throw new Error('Invalid GLB header');
 const length=view.getUint32(12,true);if(length>1000000||length%4||28+length>bytes.length)throw new Error('Invalid GLB JSON chunk');
 const doc=schema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(20,20+length))));
 const binStart=28+length,binLength=view.getUint32(20+length,true);
 if(view.getUint32(24+length,true)!==0x004e4942||binStart+binLength!==bytes.length||doc.buffers[0].byteLength>binLength||binLength-doc.buffers[0].byteLength>3)throw new Error('Invalid GLB buffer');
 const cache=new Map<string,number[]>();let decoded=0;
 const read=(index:number,position:boolean):number[]=>{const key=`${index}:${position}`;const cached=cache.get(key);if(cached)return cached;const a=doc.accessors[index],b=doc.bufferViews[a?.bufferView];if(!a||!b||a.type!==(position?'VEC3':'SCALAR'))throw new Error('Unsupported GLB accessor');const size=a.componentType===5126?4:a.componentType===5125?4:a.componentType===5123?2:a.componentType===5121?1:0;if(!size||(position&&a.componentType!==5126)||(!position&&a.componentType===5126))throw new Error('Invalid GLB component');
  const width=position?3:1,stride=b.byteStride??width*size,start=b.byteOffset+a.byteOffset;
  if(stride<width*size||stride%size||start%size||a.byteOffset+(a.count-1)*stride+width*size>b.byteLength||b.byteOffset+b.byteLength>doc.buffers[0].byteLength)throw new Error('Out of bounds GLB accessor');
  decoded+=a.count*width;if(decoded>1200000)throw new Error('GLB decoding budget exceeded');
  const output:number[]=[];for(let i=0;i<a.count;i++)for(let j=0;j<width;j++){const offset=binStart+start+i*stride+j*size;const value=a.componentType===5126?view.getFloat32(offset,true):size===4?view.getUint32(offset,true):size===2?view.getUint16(offset,true):view.getUint8(offset);if(!Number.isFinite(value))throw new Error('Nonfinite GLB coordinate');output.push(value);}cache.set(key,output);return output;
 };
 const output:number[]=[];const v=new Vector3();
 const mesh=(index:number,world:Matrix4)=>{const m=doc.meshes[index];if(!m)throw new Error('Invalid GLB mesh');for(const primitive of m.primitives){const vs=read(primitive.attributes.POSITION,true),indices=primitive.indices===undefined?Array.from({length:vs.length/3},(_,i)=>i):read(primitive.indices,false);if(indices.length%3||output.length+indices.length*3>900000)throw new Error('Mesh exceeds 100,000 triangles');for(const idx of indices){if(!Number.isInteger(idx)||idx*3+2>=vs.length)throw new Error('Invalid GLB index');v.set(vs[idx*3],vs[idx*3+1],vs[idx*3+2]).applyMatrix4(world).multiplyScalar(1000);if(![v.x,v.y,v.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6))throw new Error('Invalid GLB transform');output.push(v.x,v.y,v.z);}}};
 const visited=new Set<number>();
 const visit=(index:number,parent:Matrix4,depth:number)=>{const node=doc.nodes?.[index];if(!node||depth>64||visited.has(index))throw new Error('Invalid/cyclic GLB scene');visited.add(index);const transform=new Matrix4();if(node.matrix){if(node.translation||node.rotation||node.scale)throw new Error('Ambiguous GLB transform');transform.fromArray(node.matrix);if(node.matrix[3]!==0||node.matrix[7]!==0||node.matrix[11]!==0||node.matrix[15]!==1)throw new Error('Non-affine transform');}else{const q=new Quaternion().fromArray(node.rotation??[0,0,0,1]);if(Math.abs(q.length()-1)>.001)throw new Error('Invalid quaternion');transform.compose(new Vector3().fromArray(node.translation??[0,0,0]),q,new Vector3().fromArray(node.scale??[1,1,1]));}const world=new Matrix4().multiplyMatrices(parent,transform);if(node.mesh!==undefined)mesh(node.mesh,world);for(const child of node.children??[])visit(child,world,depth+1);};
 if(doc.nodes?.length){const childIds=new Set(doc.nodes.flatMap(n=>n.children??[]));const roots=doc.scenes?.[doc.scene??0]?.nodes??doc.nodes.map((_,i)=>i).filter(i=>!childIds.has(i));if(!roots.length)throw new Error('Missing GLB scene');roots.forEach(i=>visit(i,new Matrix4(),0));}else doc.meshes.forEach((_,i)=>mesh(i,new Matrix4()));
 if(!output.length)throw new Error('Empty GLB mesh');return output;
}
