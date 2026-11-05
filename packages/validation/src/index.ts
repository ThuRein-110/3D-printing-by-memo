import { z } from 'zod';
export const dimensionSchema = z.object({x:z.number().finite().positive().max(1000),y:z.number().finite().positive().max(1000),z:z.number().finite().positive().max(1000)});
export const configureSchema = z.object({
 service:z.enum(['ready','custom','photo','reprint']), dimensions:dimensionSchema, materialId:z.uuid().nullable(),
 quantity:z.number().int().min(1).max(100), detail:z.enum(['standard','fine']), finishing:z.enum(['none','clean','polished']),
 fileId:z.uuid().nullable(), notes:z.string().trim().max(4000).default(''), idempotencyKey:z.uuid(),
 contactEmail:z.email().optional(),delivery:z.enum(['pickup','shipping','discuss']).default('discuss')
});
export const ratesSchema = z.object({
 filamentKg:z.number().nonnegative(), machineHour:z.number().nonnegative(), electricityKwh:z.number().nonnegative(),
 averageKw:z.number().nonnegative().max(10), laborHour:z.number().nonnegative(), designHour:z.number().nonnegative(),
 finishingHour:z.number().nonnegative(), supportFraction:z.number().min(0).max(2), setup:z.number().nonnegative(),
 basicMinimum:z.number().min(300), customMinimum:z.number().min(1500), packaging:z.number().nonnegative(),
 hardware:z.number().nonnegative(), failureFraction:z.number().min(0).max(1), overheadFraction:z.number().min(0).max(2),
 shipping:z.number().nonnegative(), taxFraction:z.number().min(0).max(1), margin:z.number().min(0).lt(1),
 rushFraction:z.number().min(0).max(2), discountFraction:z.number().min(0).max(1)
});
export const MAX_UPLOAD = 4 * 1024 * 1024; // below Vercel function payload limit, including multipart overhead
export const MAX_TRIANGLES = 100_000;
export const allowedExtensions = ['jpg','jpeg','png','webp','stl','obj','glb'] as const;
export function fileWorkflow(name:string,current:'ready'|'photo'|'custom'|'reprint'){
 const ext=extension(name);if(!allowedExtensions.includes(ext as typeof allowedExtensions[number]))throw new Error('Unsupported file type');
 return current==='custom'?'custom':['jpg','jpeg','png','webp'].includes(ext)?'photo':'ready';
}
export function assertWorkflow(name:string,workflow:string){const kind=['jpg','jpeg','png','webp'].includes(extension(name))?'photo':'ready';if(!['ready','photo','custom','reprint'].includes(workflow)||(workflow!=='custom'&&(workflow==='reprint'?'ready':workflow)!==kind))throw new Error('File does not match the selected workflow');}
export function extension(name: string) { return name.split('.').pop()?.toLowerCase() ?? ''; }
export function validateHeader(name:string, bytes:Uint8Array) {
 const ext=extension(name); if(bytes.length===0 || bytes.length>MAX_UPLOAD) throw new Error('File must be 1 byte–4 MiB');
 if(!allowedExtensions.includes(ext as typeof allowedExtensions[number])) throw new Error('Unsupported file type; 3MF and SVG are disabled');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(['jpg','jpeg'].includes(ext) && !(bytes[0]===255 && bytes[1]===216 && bytes[2]===255)) throw new Error('Invalid JPEG');
 if(ext==='png' && ![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) throw new Error('Invalid PNG');
 if(ext==='webp' && !(new TextDecoder().decode(bytes.slice(0,4))==='RIFF' && new TextDecoder().decode(bytes.slice(8,12))==='WEBP')) throw new Error('Invalid WEBP');
 if(ext==='glb' && (bytes.length<20 || d.getUint32(0,true)!==0x46546c67 || d.getUint32(4,true)!==2 || d.getUint32(8,true)!==bytes.length)) throw new Error('Invalid GLB');
 return ext;
}
