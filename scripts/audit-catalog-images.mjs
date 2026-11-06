// Read-only audit. Exit 2 means product imagery is incomplete, not "fixed by fallback".
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
const base=new URL(process.env.CATALOG_BASE_URL??'https://3d-printing-by-memo-mfu-two.vercel.app');
if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('Use an application origin');
const models=[],seed=randomUUID();
for(let page=0;page<=1000;page++){
 const response=await fetch(new URL(`/api/public/catalog?seed=${seed}&page=${page}`,base));if(!response.ok)throw new Error('Catalog unavailable');
 const batch=await response.json();models.push(...batch.data);if(models.length>=batch.count||!batch.data.length)break;
}
models.sort((a,b)=>a.id.localeCompare(b.id));
const browser=await chromium.launch(),results=[];
try{
 const page=await browser.newPage();
 for(const model of models){
  const result={id:model.id,model:model.name,creator:model.creator,modelSource:model.source_url,imageSource:model.imageUrl?new URL(model.imageUrl,base).href:null,permission:model.imagePermissionRecorded||model.imageUrl?'recorded_by_admin':'not_recorded',result:'not_uploaded',rendered:false};
  if(model.imageUrl){
   if(new URL(model.imageUrl,base).origin!==base.origin){result.result='unexpected_external_source';}
   else try{
    await page.goto(new URL(`/models/${model.id}?lang=en`,base).href);const img=page.getByRole('img',{name:model.name,exact:true}).first();await img.waitFor({state:'visible',timeout:15000});
    await page.waitForFunction(name=>Array.from(globalThis.document.images).some(i=>i.alt===name&&i.getClientRects().length>0&&i.complete),model.name,{timeout:15000});
    const pixels=await img.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight,currentSrc:i.currentSrc}));result.rendered=pixels.width>0&&pixels.height>0;result.result=result.rendered?'rendered_original_asset':'decode_failed';result.pixels=pixels;
   }catch{result.result='image_request_or_render_failed';}
  }else if(model.thumbnailStatus==='permission_required')result.result='permission_required';
  results.push(result);
 }
}finally{await browser.close();}
const rendered=results.filter(r=>r.rendered).length;
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin:base.origin,total:results.length,rendered,complete:rendered===results.length&&results.length>0,models:results},null,2));
if(rendered!==results.length||!results.length)process.exitCode=2;
