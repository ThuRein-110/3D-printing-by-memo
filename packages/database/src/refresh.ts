import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import type {Database} from './generated';
import {authFetch} from './auth-fetch';
export async function refreshSession(request:NextRequest){
 const language=request.nextUrl.searchParams.get('lang'),allowed=language&&['en','th','my','zh-CN'].includes(language);if(allowed)request.cookies.set('memo-locale',language);
 let response=NextResponse.next({request});const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(url&&key&&request.cookies.getAll().some(c=>c.name.startsWith('sb-'))){const db=createServerClient<Database>(url,key,{global:{fetch:authFetch},cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},cookies:{getAll:()=>request.cookies.getAll(),setAll:(values)=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});await db.auth.getUser();}
 if(allowed)response.cookies.set('memo-locale',language,{path:'/',sameSite:'lax',maxAge:31536000,secure:request.nextUrl.protocol==='https:'});response.headers.set('Cache-Control','private, no-store');return response;
}
