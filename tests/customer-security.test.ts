import {it,expect,vi,afterEach} from 'vitest';
import {eligibleStudentEmail,customerOrigin,mfuProvider,validCallback,trustedEnrollment} from '../packages/database/src/customer-auth-policy';
import {authFetch} from '../packages/database/src/auth-fetch';
afterEach(()=>vi.unstubAllGlobals());
it('accepts only the institution-confirmed student domain with exact matching',()=>{
 expect(eligibleStudentEmail(' Student@lamduan.mfu.ac.th ')).toBe(true);
 for(const email of ['student+alias@lamduan.mfu.ac.th','staff@mfu.ac.th','student@lamduan.mfu.ac.th.evil.test','student@evil.lamduan.mfu.ac.th','student@gmail.com','a..b@lamduan.mfu.ac.th'])expect(eligibleStudentEmail(email)).toBe(false);
});
it('requires explicit university authorization and a configured broker adapter',()=>{
 expect(mfuProvider({MFU_SSO_KIND:'oidc',MFU_SSO_PROVIDER_ID:'custom:mfu'})).toBeNull();
 expect(mfuProvider({MFU_SSO_AUTHORIZED:'true',MFU_SSO_KIND:'oidc',MFU_SSO_PROVIDER_ID:'https://evil.test'})).toBeNull();
 expect(mfuProvider({MFU_SSO_AUTHORIZED:'true',MFU_SSO_KIND:'oidc',MFU_SSO_PROVIDER_ID:'custom:mfu'})).toEqual({kind:'oidc',id:'custom:mfu'});
});
it('validates callback state, rejects missing/error/replayed state and fixes redirect origin',()=>{
 const state='a'.repeat(64),url=new URL('https://memo.test/api/auth/callback?flow='+state+'&code=opaque');
 expect(validCallback(url,state)).toBe(true);expect(validCallback(url,undefined)).toBe(false);expect(validCallback(url,'b'.repeat(64))).toBe(false);
 url.searchParams.set('error','invalid');expect(validCallback(url,state)).toBe(false);
 for(const origin of ['https://memo.test/evil','https://user:password@memo.test','javascript:evil','http://memo.test'])expect(()=>customerOrigin(origin)).toThrow();
 expect(customerOrigin('https://memo.test/')).toBe('https://memo.test');
});
it('never derives active enrollment from user metadata, Google identity, or an expired claim',()=>{
 const env={MFU_SSO_AUTHORIZED:'true',MFU_SSO_KIND:'oidc',MFU_SSO_PROVIDER_ID:'custom:mfu',MFU_SSO_TRUST_ENROLLMENT_CLAIM:'true'};
 const claim={providerId:'custom:mfu',email:'student@lamduan.mfu.ac.th',status:'active',expiresAt:new Date(Date.now()+86400000).toISOString()};
 expect(trustedEnrollment({identities:[{provider:'google'}],app_metadata:{mfu_enrollment:claim}},env)).toBeNull();
 const user={identities:[{provider:'custom:mfu'}],app_metadata:{mfu_enrollment:claim}};
 expect(trustedEnrollment(user,env)?.status).toBe('active');expect(trustedEnrollment(user,{...env,MFU_SSO_TRUST_ENROLLMENT_CLAIM:'false'})).toBeNull();
 expect(trustedEnrollment({...user,app_metadata:{mfu_enrollment:{...claim,expiresAt:'2000-01-01'}}},env)).toBeNull();
});
it('removes upstream provider credentials before Supabase can persist cookies',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({access_token:'memo-token',provider_token:'synthetic-provider',provider_refresh_token:'synthetic-refresh',session:{provider_token:'synthetic-provider',refresh_token:'memo-refresh'}})));
 const result=await authFetch('https://project.supabase.co/auth/v1/token');const json=await result.json();expect(json.access_token).toBe('memo-token');expect(json.provider_token).toBeUndefined();expect(json.provider_refresh_token).toBeUndefined();expect(json.session.provider_token).toBeUndefined();expect(json.session.refresh_token).toBe('memo-refresh');
});
