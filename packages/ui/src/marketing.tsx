'use client';
import {useLanguage} from './settings';
import {ServicePrices,OrderingProcess,ShowcaseGallery,ContactSection} from './brochure';
import type {TranslationKey} from './i18n';
export {BrochureHome as Home} from './brochure';
const pages:Record<string,[TranslationKey,TranslationKey]>={services:['nav.services','home.intro'],faq:['nav.faq','content.faq'],contact:['nav.contact','content.contact'],privacy:['nav.privacy','content.privacy'],terms:['nav.terms','content.terms']};
export function ContentPage({slug}:{slug:string}){
 const {t}=useLanguage();
 if(slug==='gallery')return <div className="brochure-site brochure-page"><ShowcaseGallery standalone/><ContactSection/></div>;
 if(slug==='services')return <div className="brochure-site brochure-page"><ServicePrices standalone/><OrderingProcess/><ContactSection/></div>;
 if(slug==='contact')return <div className="brochure-site brochure-page"><ContactSection standalone/></div>;
 const [title,body]=pages[slug]??pages.services;return <article className="wrap section page prose"><div className="eyebrow">3D PRINTING MFU BY MEMO</div><h1>{t(title)}</h1><p>{t(body)}</p></article>;
}
