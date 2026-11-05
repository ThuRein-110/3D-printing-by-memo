import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './generated';
export const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY);
export async function session() {
 if(!configured())throw new Error('Backend is not configured');
 const store=await cookies();
 return createServerClient<Database>(process.env.SUPABASE_URL!,process.env.SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:(items)=>{try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Server components cannot refresh cookies; request handlers can. */}}}});
}
export function serviceClient() {
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Server write credentials are not configured');
 return createClient<Database>(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser() {
 const db=await session();const {data,error}=await db.auth.getUser();
 if(error||!data.user)throw new Error('Authentication required');return {db,user:data.user};
}
export async function requireAdmin() {
 const ctx=await requireUser();const {data,error}=await ctx.db.rpc('is_admin');
 if(error||data!==true)throw new Error('Admin role and verified MFA required');return ctx;
}
