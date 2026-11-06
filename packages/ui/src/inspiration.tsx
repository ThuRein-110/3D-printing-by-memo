'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import {inspirationImages,type InspirationImage} from '@mfu/types/inspiration.ts';
import {useLanguage} from './settings';
import {CatalogInquiry} from './catalog-inquiry';
import {usePricingMinimums} from './pricing-minimums';

export function InspirationPhoto({image}:{image:InspirationImage}){
 const {t}=useLanguage();const [state,setState]=useState<'loading'|'loaded'|'error'>('loading');
 return <div className="inspiration-photo" data-image-state={state} aria-busy={state==='loading'}>
  {state==='loading'&&<div className="skeleton inspiration-skeleton" role="status" aria-label={t('thumbnail.loading')}/>}
  {state==='error'?<span className="image-fallback">{t('thumbnail.failed')}</span>:<Image src={image.image} alt={t(`inspiration.${image.id}`)} width={image.width} height={image.height} sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw" loading="lazy" onLoad={e=>setState(e.currentTarget.naturalWidth>0?'loaded':'error')} onError={()=>setState('error')}/>}
 </div>;
}
export function InspirationCredit({image}:{image:InspirationImage}){const {t}=useLanguage();return <div className="inspiration-credit"><p><a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">{image.title}</a> &middot; {image.creator} &middot; <a href={image.licenseUrl} target="_blank" rel="license noopener noreferrer">{image.license}</a></p><p>{t('inspiration.changes')}</p></div>;}
export function InspirationGallery(){const {t}=useLanguage();return <section className="wrap section inspiration-section" aria-labelledby="inspiration-heading"><div className="eyebrow">MEMO / {t('inspiration.example')}</div><h2 id="inspiration-heading">{t('inspiration.title')}</h2><p className="inspiration-intro">{t('inspiration.notice')}</p><div className="inspiration-grid">{inspirationImages.map(image=><article className="inspiration-card" key={image.id}><Link href={`/inspiration/${image.id}`} className="inspiration-image-link" aria-label={`${t('inspiration.request')}: ${t(`inspiration.${image.id}`)}`}><InspirationPhoto image={image}/><span className="inspiration-badge">{t('inspiration.example')}</span></Link><div className="inspiration-copy"><h3><Link href={`/inspiration/${image.id}`}>{t(`inspiration.${image.id}`)}</Link></h3><InspirationCredit image={image}/><Link className="text-link" href={`/inspiration/${image.id}`}>{t('inspiration.request')} &#8599;</Link></div></article>)}</div></section>;}
export function InspirationDetail({id}:{id:string}){const {t,money}=useLanguage(),minimums=usePricingMinimums(),image=inspirationImages.find(i=>i.id===id);if(!image)return null;return <section className="wrap section page inspiration-detail"><Link className="text-link" href="/models">{t('inspiration.title')}</Link><p className="eyebrow">{t('inspiration.example')}</p><h1>{t(`inspiration.${image.id}`)}</h1><p className="notice">{t('inspiration.notice')}</p><div className="catalog-detail-grid"><aside><InspirationPhoto image={image}/><InspirationCredit image={image}/><p>{t('service.custom')}: {t('home.from')} {money(minimums.customMinimum,0)}</p><p>{t('catalog.basic')} {money(minimums.basicMinimum,0)}</p></aside><CatalogInquiry key={id} inspiration={image}/></div></section>;}
