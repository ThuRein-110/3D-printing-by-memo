'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import type {CatalogModel} from './catalog-types';
import {useLanguage} from './settings';
import {usePricingMinimums} from './pricing-minimums';

export function CatalogImage({model}:{model:CatalogModel}){
 const {t}=useLanguage();const [failed,setFailed]=useState(false);
 return model.imageUrl&&!failed?<img src={model.imageUrl} alt={model.name} width={240} height={240} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span className="model-image-fallback"><span aria-hidden="true">◇</span><small>{t('carousel.noImage')}</small></span>;
}
export function CatalogCarousel({models,loading=false,revision}:{models:CatalogModel[];loading?:boolean;revision:string}){
 const {t,money}=useLanguage(),minimums=usePricingMinimums(),id=useId(),rail=useRef<HTMLDivElement>(null);const [edges,setEdges]=useState({start:true,end:false});
 function measure(){const el=rail.current;if(el){const next={start:el.scrollLeft<2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2};setEdges(old=>old.start===next.start&&old.end===next.end?old:next);}}
 useEffect(()=>{const el=rail.current;if(!el)return;const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[models.length,loading]);
 useEffect(()=>{rail.current?.scrollTo({left:0,behavior:'instant'});},[revision]);
 useEffect(()=>{const el=rail.current;if(!el)return;const wheel=(event:WheelEvent)=>{if(!event.shiftKey||event.deltaX||!event.deltaY)return;const before=el.scrollLeft,next=Math.max(0,Math.min(el.scrollWidth-el.clientWidth,before+event.deltaY));if(next!==before){event.preventDefault();el.scrollTo({left:next,behavior:'instant'});}};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[]);
 function move(direction:number){const el=rail.current;if(el)el.scrollBy({left:direction*Math.max(254,Math.floor(el.clientWidth/254)*254),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 return <div className="catalog-carousel" role="region" aria-label={t('catalog.title')} aria-roledescription={t('carousel.region')}><div className="carousel-controls"><button type="button" className="choice" aria-label={t('carousel.previous')} aria-controls={id} disabled={loading||edges.start} onClick={()=>move(-1)}>←</button><button type="button" className="choice" aria-label={t('carousel.next')} aria-controls={id} disabled={loading||edges.end} onClick={()=>move(1)}>→</button></div><div ref={rail} id={id} className="catalog-rail" role="group" tabIndex={0} aria-label={t('carousel.instructions')} aria-busy={loading} onScroll={measure} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}if(e.key==='Home'||e.key==='End'){e.preventDefault();rail.current?.scrollTo({left:e.key==='Home'?0:rail.current.scrollWidth,behavior:'smooth'});}}}>
 {loading?Array.from({length:5},(_,n)=><div key={n} className="skeleton catalog-skeleton"/>):models.map(model=><article className="model-card panel" key={model.id}><Link href={`/models/${model.id}`} className="model-image" aria-label={`${t('common.details')}: ${model.name}`}><CatalogImage key={model.imageUrl??model.id} model={model}/></Link><div className="model-copy"><small className="model-category" title={model.category}>{model.category}</small><h2 title={model.name}><Link href={`/models/${model.id}`}>{model.name}</Link></h2><p className="model-creator" title={model.creator}>{t('catalog.creator')}: {model.creator}</p><p className="model-license fine" title={model.license_name}>{model.license_name}</p><small className="model-status">{model.referenceOnly?t('carousel.inquiryOnly'):model.starting_price?`${t('home.from')} ${money(Math.max(model.starting_price,minimums.basicMinimum),0)}`:t('catalog.quote')}</small><span className="model-card-cta" aria-hidden="true">{t('common.details')} ↗</span></div></article>)}
 </div></div>;
}
