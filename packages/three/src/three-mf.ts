import {Unzip,UnzipInflate} from 'fflate';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {z} from 'zod';

// Supported subset: one standard core model part, mesh objects and affine build
// transforms. No component graphs, materials, extensions or external resources.
export function threeMfPositions(bytes:Uint8Array):number[]{
 if(bytes.length>4194304)throw new Error('3MF archive too large');
 const chunks:Uint8Array[]=[],seen=new Set<string>();let total=0,complete=false,modelFound=false,files=0;
 const archive=new Unzip(file=>{
  if(++files>64||file.name.length>240||file.name.startsWith('/')||file.name.includes('\\')||file.name.split('/').some(p=>p==='..'||p==='.')||seen.has(file.name))throw new Error('Unsafe 3MF archive');seen.add(file.name);
  if(file.name!=='3D/3dmodel.model')return;
  modelFound=true;if(file.originalSize&&file.originalSize>4194304)throw new Error('3MF XML too large');
  file.ondata=(error,data,final)=>{if(error)throw error;total+=data.length;if(total>4194304){file.terminate();throw new Error('3MF XML too large');}chunks.push(data);if(final)complete=true;};file.start();
 });archive.register(UnzipInflate);
 // Small compressed chunks bound the allocation made by a single inflate call.
 for(let i=0;i<bytes.length;i+=256)archive.push(bytes.subarray(i,i+256),i+256>=bytes.length);
 if(!modelFound||!complete)throw new Error('Missing core 3MF model');
 const xmlBytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){xmlBytes.set(chunk,offset);offset+=chunk.length;}
 const xml=new TextDecoder('utf-8',{fatal:true}).decode(xmlBytes);
 let depth=0;for(const tag of xml.matchAll(/<([^>]+)>/g)){const text=tag[1];if(text.startsWith('?')||text.startsWith('!'))continue;if(text.startsWith('/'))depth--;else if(!text.endsWith('/'))depth++;if(depth>32||depth<0)throw new Error('3MF XML depth limit');}
 if(/<!|&|<\/?(?:\w+:)?(?:components|texture2d|compositematerials|beamlattice|slice)\b|\brequiredextensions\s*=/i.test(xml)||XMLValidator.validate(xml)!==true)throw new Error('Unsupported 3MF XML');
 const point=z.object({'@_x':z.coerce.number().finite(),'@_y':z.coerce.number().finite(),'@_z':z.coerce.number().finite()});
 const triangle=z.object({'@_v1':z.coerce.number().int().nonnegative(),'@_v2':z.coerce.number().int().nonnegative(),'@_v3':z.coerce.number().int().nonnegative()});
 const array=<T extends z.ZodType>(item:T)=>z.union([z.array(item),item]).transform(v=>Array.isArray(v)?v:[v]);
 const document=z.object({model:z.object({'@_xmlns':z.literal('http://schemas.microsoft.com/3dmanufacturing/core/2015/02'),'@_unit':z.enum(['micron','millimeter','centimeter','inch','foot','meter']).default('millimeter'),resources:z.object({object:array(z.object({'@_id':z.coerce.number().int().positive(),mesh:z.object({vertices:z.object({vertex:array(point)}),triangles:z.object({triangle:array(triangle)})})}))}),build:z.object({item:array(z.object({'@_objectid':z.coerce.number().int().positive(),'@_transform':z.string().optional()}))})})}).parse(new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,processEntities:false,removeNSPrefix:false}).parse(xml));
 const model=document.model,scale={micron:.001,millimeter:1,centimeter:10,inch:25.4,foot:304.8,meter:1000}[model['@_unit']],objects=new Map(model.resources.object.map(o=>[o['@_id'],o]));
 if(objects.size!==model.resources.object.length||objects.size>64||model.build.item.length>128)throw new Error('3MF object limit');
 let vertices=0;for(const object of objects.values()){vertices+=object.mesh.vertices.vertex.length;if(vertices>300000||object.mesh.triangles.triangle.length>100000)throw new Error('3MF geometry limit');}
 const result:number[]=[];
 for(const item of model.build.item){
  const object=objects.get(item['@_objectid']);if(!object)throw new Error('Missing 3MF object');
  const matrix=item['@_transform']?item['@_transform'].trim().split(/\s+/).map(Number):[1,0,0,0,1,0,0,0,1,0,0,0];
  if(matrix.length!==12||matrix.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6))throw new Error('Invalid 3MF transform');
  for(const tri of object.mesh.triangles.triangle){for(const idx of [tri['@_v1'],tri['@_v2'],tri['@_v3']]){const vertex=object.mesh.vertices.vertex[idx];if(!vertex)throw new Error('Invalid 3MF vertex');const x=vertex['@_x'],y=vertex['@_y'],z=vertex['@_z'];result.push((x*matrix[0]+y*matrix[3]+z*matrix[6]+matrix[9])*scale,(x*matrix[1]+y*matrix[4]+z*matrix[7]+matrix[10])*scale,(x*matrix[2]+y*matrix[5]+z*matrix[8]+matrix[11])*scale);if(result.length>900000)throw new Error('3MF geometry limit');}}
 }
 return result;
}
