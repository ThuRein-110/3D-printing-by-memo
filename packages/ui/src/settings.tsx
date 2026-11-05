'use client';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {translate,type Locale,type Translate,intlLocale,isLocale} from './i18n';
export type Theme='light'|'dark'|'system';
type Settings={locale:Locale;theme:Theme;t:Translate;setLocale:(locale:Locale)=>void;setTheme:(theme:Theme)=>void;money:(value:number,digits?:number)=>string;number:(value:number)=>string;date:(value:string)=>string};
const Context=createContext<Settings|null>(null);
export function Preferences({children,locale:initialLocale,theme:initialTheme}:{children:React.ReactNode;locale:Locale;theme:Theme}){
 const [locale,setLanguage]=useState(initialLocale),[theme,setAppearance]=useState(initialTheme);
 useEffect(()=>{const apply=()=>{document.documentElement.dataset.theme=theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme;};apply();const media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[theme]);
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 const value=useMemo<Settings>(()=>({locale,theme,t:(key,vars)=>translate(locale,key,vars),
  setLocale:(v)=>{if(!isLocale(v))return;setLanguage(v);document.cookie=`memo-locale=${v}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;try{localStorage.setItem('memo.locale',v);}catch{/* Cookie persistence remains available if local storage is blocked. */};const url=new URL(location.href);url.searchParams.set('lang',v);history.replaceState(null,'',url);},
  setTheme:(v)=>{setAppearance(v);try{localStorage.setItem('memo.theme',v);}catch{/* Cookie persistence remains available if local storage is blocked. */};document.cookie=`memo-theme=${v}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;},
  money:(v,digits=2)=>new Intl.NumberFormat(intlLocale[locale],{style:'currency',currency:'THB',currencyDisplay:'narrowSymbol',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v),
  number:(v)=>new Intl.NumberFormat(intlLocale[locale],{maximumFractionDigits:2}).format(v),
  date:(v)=>new Intl.DateTimeFormat(intlLocale[locale],{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(v))
 }),[locale,theme]);return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage(){const context=useContext(Context);if(!context)throw new Error('Preferences provider required');return context;}
