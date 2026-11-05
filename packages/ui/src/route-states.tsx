'use client';
import Link from 'next/link';
import {useLanguage} from './settings';
export function LoadingState(){const {t}=useLanguage();return <section className="wrap section" role="status" aria-label={t('common.loading')}><p>{t('common.loading')}</p><div className="skeleton"/></section>;}
export function RouteError({reset}:{reset:()=>void}){const {t}=useLanguage();return <section className="wrap section page"><h1>{t('error.request')}</h1><button className="button" onClick={reset}>{t('common.retry')}</button></section>;}
export function NotFound(){const {t}=useLanguage();return <section className="wrap section page"><h1>{t('error.missing')}</h1><Link className="button" href="/">{t('common.back')}</Link></section>;}
