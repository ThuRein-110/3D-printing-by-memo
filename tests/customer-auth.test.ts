import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({store:new Map<string,string>(),exchange:vi.fn(),oauth:vi.fn(),sso:vi.fn(),reset:vi.fn(),update:vi.fn(),signOut:vi.fn(),getUser:vi.fn(),aal:vi.fn(),requireUser:vi.fn(),requireAdmin:vi.fn(),rpc:vi.fn(),event:vi.fn()}));
vi.mock('../packages/database/src/server',()=>({sessionCookies:async()=>({get:(key:string)=>mocks.store.has(key)?{value:mocks.store.get(key)}:undefined,set:(key:string,value:string)=>mocks.store.set(key,value),delete:(key:string)=>mocks.store.delete(key)}),session:async()=>({auth:{exchangeCodeForSession:mocks.exchange,signInWithOAuth:mocks.oauth,signInWithSSO:mocks.sso,resetPasswordForEmail:mocks.reset,updateUser:mocks.update,signOut:mocks.signOut,getUser:mocks.getUser,mfa:{getAuthenticatorAssuranceLevel:mocks.aal}}}),serviceClient:()=>({rpc:mocks.rpc}),requireUser:mocks.requireUser,requireAdmin:mocks.requireAdmin}));
vi.mock('../packages/database/src/customer-security',()=>({customerRate:vi.fn(),securityEvent:mocks.event,privateHash:(value:string)=>'synthetic-hash:'+value}));
import {customerAuth} from '../packages/database/src/customer-auth';
const origin='https://memo.test';
const request=(action:string,values:Record<string,unknown>={})=>new Request(origin+'/api/auth/customer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...values})});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('APP_ORIGIN',origin);vi.stubEnv('MFU_SSO_AUTHORIZED','false');mocks.store.clear();mocks.exchange.mockResolvedValue({error:null});mocks.oauth.mockResolvedValue({data:{url:'https://project.supabase.co/auth/v1/authorize'},error:null});mocks.aal.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null});mocks.getUser.mockResolvedValue({data:{user:{id:'synthetic-user'}}});mocks.reset.mockResolvedValue({error:null});mocks.rpc.mockResolvedValue({error:null,data:null});mocks.requireUser.mockResolvedValue({user:{id:'synthetic-user',email:'student@lamduan.mfu.ac.th',email_confirmed_at:'2026-01-01'},db:{}});});
afterEach(()=>vi.unstubAllEnvs());
it('uses a fixed redirect, opaque browser state and PKCE broker exchange exactly once',async()=>{
 const start=await customerAuth(request('google'),['auth','customer'],false);expect(start?.status).toBe(200);
 const target=mocks.oauth.mock.calls[0][0].options.redirectTo;expect(new URL(target).origin).toBe(origin);expect(mocks.store.get('memo-auth-flow')).toHaveLength(64);
 const callback=new Request(target+'&code=one-time-code&next=https://evil.test');const response=await customerAuth(callback,['auth','callback'],false);expect(response?.headers.get('location')).toBe(origin+'/account');expect(mocks.exchange).toHaveBeenCalledWith('one-time-code');expect(mocks.store.has('memo-auth-flow')).toBe(false);
 const replay=await customerAuth(callback,['auth','callback'],false);expect(replay?.headers.get('location')).toBe(origin+'/login?authError=1');expect(mocks.exchange).toHaveBeenCalledOnce();
});
it('rejects callback state mismatch before exchanging and treats broker failures as safe errors',async()=>{
 await customerAuth(request('google'),['auth','customer'],false);const flow=mocks.store.get('memo-auth-flow');const response=await customerAuth(new Request(origin+'/api/auth/callback?flow='+('0'.repeat(64))+'&code=bad'),['auth','callback'],false);expect(response?.status).toBe(303);expect(mocks.exchange).not.toHaveBeenCalled();
 mocks.store.set('memo-auth-flow',flow!);mocks.exchange.mockResolvedValue({error:{message:'private-provider-details'}});const fail=await customerAuth(new Request(origin+'/api/auth/callback?flow='+flow+'&code=bad'),['auth','callback'],false);expect(fail?.headers.get('location')).toBe(origin+'/login?authError=1');
});
it('conceals password-recovery account existence and uses the recovery callback',async()=>{
 mocks.reset.mockResolvedValue({error:{message:'user not found'}});const r=await customerAuth(request('recover',{email:'synthetic@example.com'}),['auth','customer'],false);expect(await r?.json()).toEqual({ok:true});expect(mocks.store.get('memo-auth-purpose')).toBe('recovery');expect(mocks.reset.mock.calls[0][1].redirectTo).toContain(origin+'/api/auth/callback?flow=');
});
it('blocks unapproved MFU SSO, accepts no institutional credentials and requires verified email',async()=>{
 await expect(customerAuth(request('mfu'),['auth','customer'],false)).rejects.toThrow('not authorized');expect(mocks.sso).not.toHaveBeenCalled();
 mocks.requireUser.mockResolvedValue({user:{id:'synthetic-user',email:'student@lamduan.mfu.ac.th',email_confirmed_at:null}});
 await expect(customerAuth(request('current'),['student','verify'],false)).rejects.toThrow('confirmed');expect(mocks.rpc).not.toHaveBeenCalled();
});
it('takes student identity from the authenticated account rather than browser eligibility fields',async()=>{
 const r=await customerAuth(request('current',{email:'attacker@lamduan.mfu.ac.th',enrollment_status:'active',discount:100}),['student','verify'],false);expect(r?.status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('verify_student',{p_owner:'synthetic-user',p_email:'student@lamduan.mfu.ac.th',p_method:'email'});
});
it('requires audited admin authorization and protects the retention endpoint with a bearer secret',async()=>{
 mocks.requireAdmin.mockRejectedValue(new Error('Admin MFA required'));await expect(customerAuth(new Request(origin+'/api/customer-security'),['customer-security'],true)).rejects.toThrow('Admin MFA');
 vi.stubEnv('CRON_SECRET','synthetic-cron-secret');expect((await customerAuth(new Request(origin+'/api/security-retention'),['security-retention'],false))?.status).toBe(401);expect((await customerAuth(new Request(origin+'/api/security-retention',{headers:{authorization:'Bearer synthetic-cron-secret'}}),['security-retention'],false))?.status).toBe(200);
});
