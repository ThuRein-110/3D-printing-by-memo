'use client';

import {useRef, useState} from 'react';
import {everydayPrints, type EverydayPrint} from './everyday-prints';
import {InspirationCredit, InspirationPhoto} from './inspiration';
import {HeroModel} from './hero-model';
import {memoContact} from './memo-brand';
import {usePricingMinimums} from './pricing-minimums';
import {useLanguage} from './settings';

export function ServicePrices({standalone = false}: {standalone?: boolean} = {}) {
 const {t, money} = useLanguage();
 const prices = usePricingMinimums();
 const Heading = standalone ? 'h1' : 'h2';
 const services = [
  {id: 'ready', title: 'brochure.basicTitle', minimum: prices.basicMinimum},
  {id: 'custom', title: 'brochure.customTitle', minimum: prices.customMinimum},
 ] as const;

 return (
  <section id="services" className="wrap brochure-section">
   <div className="brochure-section-heading"><Heading>{t('brochure.services')}</Heading></div>
   <div className="brochure-services">
    {services.map(({id, title, minimum}) => (
     <article className="brochure-service" key={id}>
      <h3>{t(title)}</h3>
      <p>{t(`brochure.${id}`)}</p>
      <div className="brochure-price">
       <span>{t('home.from')}</span>
       <strong>{money(minimum, 0)}</strong>
      </div>
      <a href="#contact" className="text-link">{t('brochure.contact')}</a>
     </article>
    ))}
   </div>
   <p className="brochure-price-note">{t('brochure.pricingNote')}</p>
  </section>
 );
}

export function OrderingProcess() {
 const {t} = useLanguage();
 return (
  <section id="how-it-works" className="wrap brochure-section">
   <div className="brochure-section-heading"><h2>{t('brochure.process')}</h2></div>
   <ol className="brochure-process" role="list">
    {([1, 2, 3] as const).map(step => (
     <li key={step}>
      <span aria-hidden="true">0{step}</span>
      <h3>{t(`brochure.step${step}`)}</h3>
      <p>{t(`brochure.step${step}Body`)}</p>
     </li>
    ))}
   </ol>
  </section>
 );
}

export function ShowcaseGallery({standalone = false}: {standalone?: boolean} = {}) {
 const {t} = useLanguage();
 const Heading = standalone ? 'h1' : 'h2';
 const dialog = useRef<HTMLDialogElement>(null);
 const [selected, setSelected] = useState<EverydayPrint>();

 return (
  <section id="gallery" className="wrap brochure-section brochure-gallery">
   <div className="brochure-section-heading">
    <Heading>{t('brochure.everydayTitle')}</Heading>
    <p>{t('brochure.everydayIntro')}</p>
   </div>
   <div className="brochure-gallery-grid">
    {everydayPrints.map(image => (
     <article className="brochure-gallery-card" key={image.id}>
      <button
       type="button"
       className="brochure-image-button"
       aria-label={`${t('gallery.preview')}: ${t(`everyday.${image.id}`)}`}
       onClick={() => {
        setSelected(image);
        dialog.current?.showModal();
       }}
      >
       <InspirationPhoto image={image} alt={t(`everyday.${image.id}`)}/>
       <span className="brochure-image-caption">
        {t(`everyday.${image.id}`)}
        <span className="brochure-image-use">{t(`everyday.${image.id}Use`)}</span>
       </span>
      </button>
      <InspirationCredit image={image}/>
     </article>
    ))}
   </div>
   <dialog ref={dialog} className="brochure-image-dialog" aria-label={t('brochure.everydayTitle')}>
    <button type="button" className="choice" onClick={() => dialog.current?.close()}>{t('carousel.close')}</button>
    {selected && (
     <>
      <InspirationPhoto key={selected.id} image={selected} alt={t(`everyday.${selected.id}`)}/>
      <h3>{t(`everyday.${selected.id}`)}</h3>
      <p>{t(`everyday.${selected.id}Use`)}</p>
      <InspirationCredit image={selected}/>
     </>
    )}
   </dialog>
  </section>
 );
}

export function ContactSection({standalone = false}: {standalone?: boolean} = {}) {
 const {t} = useLanguage();
 const Heading = standalone ? 'h1' : 'h2';

 return (
  <section id="contact" className="wrap brochure-section">
   <div className="brochure-contact">
    <div>
     <Heading>{t('brochure.contactTitle')}</Heading>
     <p>{t('brochure.contactBody')}</p>
     <p className="brochure-location">{t('brochure.location')}</p>
    </div>
    <div className="brochure-contact-links">
     <a className="button" href={memoContact.facebook} target="_blank" rel="noopener noreferrer">{t('brochure.facebook')}</a>
     <a className="choice" href={`tel:${memoContact.phone}`}>{t('brochure.call')} &middot; {memoContact.displayPhone}</a>
     <small>{t('brochure.contactHint')}</small>
    </div>
   </div>
  </section>
 );
}

export function BrochureHome() {
 const {t} = useLanguage();

 return (
  <div className="brochure-site">
   <section className="wrap brochure-hero">
    <div className="brochure-hero-copy">
     <p className="eyebrow">3D Printing MFU by MEMO</p>
     <h1>
      <span>{t('home.title')}</span>{' '}
      <span className="brochure-hero-highlight">{t('home.highlight')}</span>
     </h1>
     <p className="brochure-intro">{t('brochure.intro')}</p>
     <div className="brochure-hero-actions">
      <a className="button" href="#contact">{t('brochure.contact')}</a>
      <a className="choice" href="#services">{t('brochure.services')}</a>
     </div>
    </div>
    <div className="brochure-hero-stage">
     <div className="brochure-hero-float">
      <HeroModel/>
     </div>
    </div>
   </section>
   <ServicePrices/>
   <OrderingProcess/>
   <ShowcaseGallery/>
   <ContactSection/>
  </div>
 );
}
