import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const missing=[...(!url?['SUPABASE_URL']:[]),...(!key?['SUPABASE_ANON_KEY']:[])];
if(missing.length){console.log(JSON.stringify({connected:false,missing,productionDataModified:false}));process.exit(2);}
const publicDb=createClient(url,key,{auth:{persistSession:false}});
const publicResult=await publicDb.from('materials').select('id',{count:'exact',head:true}).eq('visible',true).gt('available_grams',0);
const report={connected:!publicResult.error,publicStockColors:publicResult.count??0,productionDataModified:false};
if(process.env.SUPABASE_SERVICE_ROLE_KEY){const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});const [stock,config]=await Promise.all([admin.from('materials').select('visible,available_grams'),admin.from('generation_settings').select('enabled').eq('id',true).maybeSingle()]);Object.assign(report,{materialRows:stock.data?.length??0,disabledColors:stock.data?.filter(m=>!m.visible).length??0,zeroStockColors:stock.data?.filter(m=>Number(m.available_grams)<=0).length??0,migration009Available:!config.error,generationEnabled:config.data?.enabled??false});}
console.log(JSON.stringify(report));process.exit(publicResult.error?1:0);
