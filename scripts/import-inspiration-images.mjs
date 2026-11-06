// Explicitly reviewed Commons files only. No gallery scraping or model downloads.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {URLSearchParams} from 'node:url';
const sharp=createRequire(new URL('../packages/database/package.json',import.meta.url))('sharp');
const approved=[
 ['cat','3D PRINTED CAT.jpg','Sumanbargavr','CC BY-SA 4.0','8502433b4235f561491622430f4a563fa3d0851d'],
 ['keychain','Marvin Keychain.jpeg','Koenbodewes','CC BY-SA 4.0','cc425bb312b30207f8a7f92326cd36fb837cdb6c'],
 ['vase','3D Printed Vase.jpg','D Eaketts','CC BY-SA 4.0','7f34878817c752d30aa00ac84cff71a0a708ce39'],
 ['flowers','Flores 3D 02.jpg','Mortymore','CC BY 2.0','5b09a17542c690f86ba1762704bd5bc5eb262241'],
 ['gears','Helical planetary gear (40069995811).jpg','Robbie Sproule','CC BY 2.0','27d7b1b67cba1ab4fc4f33eab91c8752c1c38a8d'],
 ['mechanism','Triple Gear.jpg','Saul Schleimer and Henry Segerman','CC BY-SA 3.0','701fde3e02037761fcbfb45f9aa43326ac73c2d1'],
];
const headers={'User-Agent':'MEMO-gallery-license-review/1.0 (https://github.com/ThuRein-110/3D-printing-by-memo)'};
const manifest=[];
for(const [id,title,creator,license,sha1] of approved){
 const api=new URL('https://commons.wikimedia.org/w/api.php');api.search=new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'url|extmetadata|sha1',titles:'File:'+title});
 const response=await fetch(api,{headers});if(!response.ok)throw Error('Commons metadata unavailable');
 const data=await response.json(),page=Object.values(data.query.pages)[0],info=page.imageinfo[0];
 if(info.sha1!==sha1||info.extmetadata.LicenseShortName.value!==license||info.extmetadata.Restrictions?.value)throw Error('Source changed; review license before downloading');
 const downloadUrl=new URL(info.url);downloadUrl.search='';if(downloadUrl.hostname!=='upload.wikimedia.org')throw Error('Unexpected download host');
 const file=await fetch(downloadUrl,{headers});if(!file.ok)throw Error('Licensed image unavailable');const bytes=Buffer.from(await file.arrayBuffer());
 if(createHash('sha1').update(bytes).digest('hex')!==sha1)throw Error('Source checksum mismatch');
 const output=await sharp(bytes).rotate().resize(1200,1200,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
 const sourceUrl='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(title.replaceAll(' ','_'));
 const entry={id,title,creator,sourceUrl,downloadUrl:downloadUrl.href,license,licenseUrl:info.extmetadata.LicenseUrl.value,attribution:`${title} by ${creator}, Wikimedia Commons, ${license}.`,changes:'Resized and converted to WebP; metadata removed. Display may be cropped.',checkedAt:'2026-11-06',sourceSha1:sha1,sha256:createHash('sha256').update(output.data).digest('hex'),image:`/inspiration/${id}.webp`,width:output.info.width,height:output.info.height};manifest.push(entry);
 for(const app of ['users','admin']){await mkdir(`${app}/public/inspiration`,{recursive:true});await writeFile(`${app}/public${entry.image}`,output.data);}
 await mkdir('docs/image-licenses',{recursive:true});await writeFile(`docs/image-licenses/${id}.json`,JSON.stringify({title:page.title,pageid:page.pageid,...info},null,2)+'\n');
 console.log(`${id}: ${output.info.width}x${output.info.height}, ${output.data.length} bytes, ${license}`);
}
await writeFile('packages/types/src/inspiration.ts','// Reviewed image metadata. Re-import only after reviewing source licenses.\nexport const inspirationImages = '+JSON.stringify(manifest,null,2)+' as const;\nexport type InspirationImage=typeof inspirationImages[number];\n');
for(const app of ['users','admin'])await writeFile(`${app}/public/inspiration/licenses.json`,JSON.stringify(manifest,null,2)+'\n');
