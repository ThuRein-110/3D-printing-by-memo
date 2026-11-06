'use client';
import {useEffect,useState} from 'react';
import {api} from './api';
import type {CatalogModel} from './catalog-types';
type Feed={data:CatalogModel[];count:number;categories:string[];page:number;seed:string};
export function useCatalogFeed(path:string,page:number,ready:boolean){
 const [data,setData]=useState<Feed>(),[error,setError]=useState<unknown>(),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!ready)return;const controller=new AbortController();setLoading(true);setError(undefined);
  api<Feed>(path,{signal:controller.signal}).then(result=>{
   if(controller.signal.aborted)return;
   setData(previous=>page===0?result:{...result,data:[...(previous?.data??[]),...result.data].filter((model,index,all)=>all.findIndex(item=>item.id===model.id)===index)});
  }).catch(e=>{if(!controller.signal.aborted)setError(e);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[path,page,ready,revision]);
 return {data,error,loading:loading&&page===0,loadingMore:page>0&&(loading||data?.page!==page),retry:()=>setRevision(v=>v+1)};
}
