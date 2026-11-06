import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './generated';
import {authFetch} from './auth-fetch';
export const sessionCookies=cookies;
export const backendConfig=()=>({url:process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY});
export const configured=()=>Boolean(backendConfig().url&&backendConfig().key);
export async function session() {
 if(!configured())throw new Error('Backend is not configured');
 const store=await cookies();
 return createServerClient<Database>(backendConfig().url!,backendConfig().key!,{global:{fetch:authFetch},cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},cookies:{getAll:()=>store.getAll(),setAll:(items)=>{try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Server components cannot refresh cookies; request handlers can. */}}}});
}
export function serviceClient() {
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Server write credentials are not configured');
 return createClient<Database>(backendConfig().url!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser(allowMfaChallenge=false) {
 const db=await session();const {data,error}=await db.auth.getUser();
 if(error||!data.user)throw new Error('Authentication required');
 const claims=await db.auth.getClaims();const sid=claims.data?.claims.session_id;
 if(typeof sid!=='string')throw new Error('Authentication required');
 const active=await serviceClient().rpc('customer_session_active',{p_session:sid,p_owner:data.user.id});
 if(active.error||!active.data)throw new Error('Authentication required');
 // getUser provides fresh factors; the cookie's cached user can predate enrollment.
 if(!allowMfaChallenge&&data.user.factors?.some(f=>f.status==='verified')&&claims.data?.claims.aal!=='aal2')throw new Error('Authentication required: MFA verification');
 return {db,user:data.user};
}
export async function requireAdmin() {
 const ctx=await requireUser();const {data,error}=await ctx.db.rpc('is_admin');
 if(error||data!==true)throw new Error('Admin role and verified MFA required');return ctx;
}
