import {beforeEach,afterEach,it,expect,vi} from 'vitest';

const auth=vi.hoisted(()=>({
 signInWithPassword:vi.fn(),signOut:vi.fn(),listFactors:vi.fn(),role:vi.fn(),requireAdmin:vi.fn(),
}));
vi.mock('../packages/database/src/server',()=>({
 configured:()=>true,
 session:async()=>({auth:{signInWithPassword:auth.signInWithPassword,signOut:auth.signOut,mfa:{listFactors:auth.listFactors}}}),
 serviceClient:()=>({rpc:async()=>({data:true,error:null}),from:()=>({select:()=>({eq:()=>({maybeSingle:auth.role})})})}),
 requireAdmin:auth.requireAdmin,requireUser:vi.fn(),
}));
vi.mock('../packages/database/src/customer-security',()=>({securityEvent:vi.fn(),customerRate:vi.fn(),privateHash:()=> 'synthetic-network-hash'}));
import {handle} from '@mfu/database/http.ts';

const origin='https://3d-printing-by-memo-admin-pearl.vercel.app';
function login(browserOrigin=origin){return new Request(`${origin}/api/auth`,{
 method:'POST',headers:{origin:browserOrigin,host:new URL(origin).host,'content-type':'application/json'},
 body:JSON.stringify({action:'login',email:'synthetic@example.com',password:'synthetic-password'}),
});}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('ADMIN_ORIGIN',origin);vi.stubEnv('APP_ORIGIN','https://customer.example.com');vi.stubEnv('ALLOWED_ORIGINS','');
 auth.signInWithPassword.mockResolvedValue({data:{user:{id:'test-admin'}},error:null});
 auth.role.mockResolvedValue({data:{role:'admin'},error:null});auth.listFactors.mockResolvedValue({data:{totp:[{id:'factor'}]},error:null});
});
afterEach(()=>vi.unstubAllEnvs());
it('production admin POST /api/auth reaches password authentication and still requires MFA',async()=>{
 const response=await handle(login(),['auth'],true);
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,mfaRequired:true,factors:[{id:'factor'}]});
 expect(auth.signInWithPassword).toHaveBeenCalledOnce();expect(auth.role).toHaveBeenCalledOnce();
});
it('rejects a foreign login origin before authenticating',async()=>{
 const response=await handle(login('https://evil.example'),['auth'],true);
 expect(response.status).toBe(403);expect(await response.json()).toMatchObject({error:'Origin rejected'});
 expect(auth.signInWithPassword).not.toHaveBeenCalled();
});
it('does not grant admin access to a customer with a valid origin',async()=>{
 auth.role.mockResolvedValue({data:{role:'customer'},error:null});
 const response=await handle(login(),['auth'],true);
 expect(response.status).toBe(403);expect(auth.signOut).toHaveBeenCalledOnce();
});
it('preserves the authenticated admin/MFA guard on protected API routes',async()=>{
 auth.requireAdmin.mockRejectedValue(new Error('Admin MFA required'));
 const response=await handle(new Request(`${origin}/api/metrics`),['metrics'],true);
 expect(response.status).toBe(403);expect(auth.requireAdmin).toHaveBeenCalledOnce();
});
