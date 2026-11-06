import {z} from 'zod';
export function safeSourceUrl(value:string,creality=false):string {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||value.includes('\\')||!/^https:\/\//.test(value)||!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)||/\.(?:local|localhost|internal)$/i.test(url.hostname))throw new Error('Invalid source URL');
 if(creality&&(!['www.crealitycloud.com','crealitycloud.com','m.crealitycloud.com'].includes(url.hostname)||!/^\/(?:[a-z]{2}\/)?model-detail(?:s)?\/[a-zA-Z0-9-]+\/?$/.test(url.pathname)||url.search))throw new Error('Invalid Creality Cloud model detail URL');
 return url.href;
}
const optionalUrl=z.union([z.literal(''),z.string().max(2000).transform(v=>safeSourceUrl(v))]).default('');
export const catalogSchema=z.object({
 name:z.string().trim().min(2).max(160),description:z.string().max(5000),source_kind:z.enum(['creality','owned','licensed']),source_url:optionalUrl,
 creator:z.string().trim().min(1).max(160),creator_url:optionalUrl,category:z.string().trim().min(1).max(80),tags:z.array(z.string().trim().min(1).max(40)).max(20),
 license_name:z.string().trim().min(1).max(160),license_url:optionalUrl,commercial_allowed:z.boolean(),license_approved:z.boolean(),preview_allowed:z.boolean(),
 printability:z.enum(['pending','approved','rejected']),visible:z.boolean(),available:z.boolean(),mesh_asset_id:z.uuid().nullable(),image_asset_id:z.uuid().nullable(),
 starting_price:z.number().min(100).max(1000000).nullable(),lead_time_days:z.number().int().min(1).max(365).nullable(),
 review_note:z.string().trim().min(1).max(4000),showcase_visible:z.boolean().default(false)
}).superRefine((v,ctx)=>{
 if(v.source_kind==='creality'){try{safeSourceUrl(v.source_url,true);}catch{ctx.addIssue({code:'custom',message:'Invalid Creality Cloud model detail URL',path:['source_url']});}}
 if(v.visible&&(!v.commercial_allowed||!v.license_approved||v.printability!=='approved'))ctx.addIssue({code:'custom',message:'Commercial license and printability approval required',path:['visible']});
 if(v.source_kind==='owned'&&v.visible&&!v.mesh_asset_id)ctx.addIssue({code:'custom',message:'Shop-owned model file required',path:['mesh_asset_id']});
 if(v.showcase_visible&&(v.source_kind!=='creality'||v.visible||v.available||v.commercial_allowed||v.license_approved||v.preview_allowed||v.mesh_asset_id||v.image_asset_id||v.starting_price!==null||v.lead_time_days!==null))ctx.addIssue({code:'custom',message:'Reference-only showcase cannot offer sales, assets or pricing',path:['showcase_visible']});
});
export type CatalogInput=z.infer<typeof catalogSchema>;
