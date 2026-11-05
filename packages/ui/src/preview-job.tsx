'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useState} from 'react';
import {useLanguage} from './settings';
import {useGeneration} from './use-generation';
import {useViewerLabels,ErrorMessage,Status} from './common';
const Viewer=dynamic(()=>import('@mfu/three/Preview.tsx'),{ssr:false});
export function PreviewJob({id,admin=false}:{id:string;admin?:boolean}){const {t,number}=useLanguage(),labels=useViewerLabels(),{job,mesh,error,retry,cancel}=useGeneration(id);const [actionError,setActionError]=useState<unknown>();return <section className="wrap section page"><div className="eyebrow">MEMO / AI</div><h1>{t('generation.title')}</h1><ErrorMessage error={error??actionError}/>{job?<><Status value={job.state}/>{job.progress!==null&&<div className="job-progress"><progress max={100} value={job.progress}/><span>{number(job.progress)}%</span></div>}{job.state==='failed'&&<p className="notice">{job.error_code?.includes('UNCERTAIN')?t('generation.reconcile'):t('generation.failed')}</p>}{!['succeeded','failed','cancelled'].includes(job.state)&&<button className="choice" onClick={()=>cancel().catch(setActionError)}>{t('common.cancel')}</button>}{job.cancel_requested&&<p>{t('generation.cancelNote')}</p>}{job.state==='failed'&&<button className="choice" onClick={()=>retry().catch(setActionError)}>{t('common.retry')}</button>}</>:<p role="status">{t('common.loading')}</p>}{mesh?<Viewer positions={mesh.positions} dimensions={mesh.dimensions} color="#858d86" labels={labels}/>:<p>{t('studio.reference')}</p>}<p className="fine">{t('studio.aiNotice')}</p><Link className="button" href={admin?'/orders':`/configure?job=${id}`}>{t('studio.step4')} ↗</Link></section>;}
