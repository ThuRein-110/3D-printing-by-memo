'use client';
import {useEffect,useState} from 'react';
import {api} from './api';
import {localError,label} from './i18n';
import {useLanguage} from './settings';
export function ErrorMessage({error}:{error:unknown}){const {t}=useLanguage();return error?<p role="alert" className="error">{localError(t,error)}</p>:null;}
export function useResource<T>(path:string,revision=0){const [data,setData]=useState<T>(),[error,setError]=useState<unknown>(),[loading,setLoading]=useState(true);useEffect(()=>{const controller=new AbortController();setLoading(true);api<T>(path,{signal:controller.signal}).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[path,revision]);return {data,error,loading};}
export function Status({value}:{value:string}){const {t}=useLanguage();return <span className={`badge status-${value}`}>{label(t,value)}</span>;}
export function useViewerLabels(){const {t}=useLanguage();return {title:t('viewer.title'),empty:t('viewer.empty'),controls:t('viewer.controls'),screenshot:t('viewer.screenshot'),scale:t('viewer.scale'),export:t('viewer.export')};}
