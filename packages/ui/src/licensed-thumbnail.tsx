'use client';
import {useState} from 'react';
import {api,post} from './api';
import {ErrorMessage} from './common';
import {CatalogImage} from './catalog-carousel';
import type {CatalogModel} from './catalog-types';
import {useLanguage} from './settings';
export function LicensedThumbnail({modelId,onPublished}:{modelId:string;onPublished:(assetId:string,permission:string)=>void}){
 const {t}=useLanguage();const [asset,setAsset]=useState(''),[permission,setPermission]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[saved,setSaved]=useState(false);
 const preview={id:modelId,name:t('thumbnail.privatePreview'),imageUrl:asset?`/api/catalog/assets/${asset}/image`:null} as CatalogModel;
 return <form className="panel subform licensed-thumbnail" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,file=(new FormData(form)).get('thumbnail');if(!(file instanceof File)||!file.size)return;setBusy(true);setError(undefined);setSaved(false);try{let id=asset;if(!id){const data=new FormData();data.set('file',file);data.set('authorized','true');const upload=await api<{id:string}>('/catalog/assets',{method:'POST',body:data});id=upload.id;setAsset(id);}await post(`/catalog/${modelId}/thumbnail`,{assetId:id,permission,reviewNote:note});setSaved(true);onPublished(id,permission);}catch(e){setError(e);}finally{setBusy(false);}}}><h2>{t('thumbnail.upload')}</h2><p>{t('thumbnail.instructions')}</p><label>{t('catalog.image')}<input name="thumbnail" type="file" accept=".jpg,.jpeg,.png,.webp" required onChange={()=>{setAsset('');setSaved(false);}}/></label><label>{t('carousel.imagePermission')}<textarea required minLength={20} maxLength={4000} value={permission} onChange={e=>setPermission(e.target.value)}/></label><label>{t('catalog.reviewNote')}<textarea required minLength={1} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><label className="checkbox"><input type="checkbox" required/>{t('catalog.uploadPermission')}</label><button className="button" disabled={busy||saved}>{t(busy?'common.loading':'thumbnail.publish')}</button><ErrorMessage error={error}/>{asset&&<><p>{t('thumbnail.privatePreview')}</p><div className="thumbnail-admin-preview"><CatalogImage key={asset} model={preview}/></div></>}{saved&&<p role="status">{t('thumbnail.published')}</p>}</form>;
}
