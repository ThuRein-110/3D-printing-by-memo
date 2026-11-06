import 'server-only';
import sharp from 'sharp';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Row} from './generated';
export function thumbnailAllowed(model:Pick<Row<'catalog_models'>,'image_asset_id'|'showcase_visible'|'image_permission'>){return !!model.image_asset_id&&model.image_permission.trim().length>=20;}
export function thumbnailStatus(model:Pick<Row<'catalog_models'>,'image_asset_id'|'showcase_visible'|'image_permission'>){return !model.image_asset_id?'not_uploaded':thumbnailAllowed(model)?'available':'permission_required';}
export async function storedCatalogImage(db:SupabaseClient<Database>,id:string){
 const {data:asset,error}=await db.from('catalog_assets').select('path,mime,kind').eq('id',id).eq('kind','image').single();
 if(error||!asset||asset.mime!=='image/jpeg')return null;
 const result=await db.storage.from('catalog-private').download(asset.path);if(result.error||!result.data||result.data.size>4194304)return null;
 const bytes=await result.data.arrayBuffer();try{const metadata=await sharp(Buffer.from(bytes),{limitInputPixels:20_000_000}).metadata();if(metadata.format!=='jpeg'||!metadata.width||!metadata.height)return null;return {bytes,width:metadata.width,height:metadata.height};}catch{return null;}
}
export async function catalogImageResponse(db:SupabaseClient<Database>,id:string,publicImage=false){
 const image=await storedCatalogImage(db,id);if(!image)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
 return new Response(image.bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':publicImage?'public,max-age=60':'private,no-store','X-Content-Type-Options':'nosniff'}});
}
