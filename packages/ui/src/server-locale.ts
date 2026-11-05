import {cookies} from 'next/headers';
import type {Metadata} from 'next';
import {isLocale,translate,type TranslationKey} from './i18n';
import type {Locale} from './i18n';
import type {Theme} from './settings';
export async function preferences():Promise<{locale:Locale;theme:Theme}>{const store=await cookies(),language=store.get('memo-locale')?.value,appearance=store.get('memo-theme')?.value;return {locale:isLocale(language)?language:'th',theme:appearance==='light'||appearance==='dark'?appearance:'system'};}
export async function localizedMetadata(admin=false):Promise<Metadata>{const {locale}=await preferences();return {title:admin?`${translate(locale,'brand.admin')} · Memo`:'3D Printing MFU By Memo',description:translate(locale,admin?'auth.adminNote':'home.intro'),...(process.env.APP_ORIGIN?{metadataBase:new URL(process.env.APP_ORIGIN),alternates:{languages:{en:'/?lang=en',th:'/?lang=th',my:'/?lang=my','zh-CN':'/?lang=zh-CN'}}}:{})};}
export async function pageMetadata(key:TranslationKey,privatePage=false):Promise<Metadata>{const {locale}=await preferences();return {title:`${translate(locale,key)} | Memo`,...(privatePage?{robots:{index:false,follow:false}}:{})};}
