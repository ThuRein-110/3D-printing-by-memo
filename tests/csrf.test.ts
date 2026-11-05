import {describe,it,expect} from 'vitest';
import {csrf} from '@mfu/database/csrf.ts';

const admin='https://3d-printing-by-memo-admin-pearl.vercel.app';
const users='https://3d-printing-by-memo-mfu.vercel.app';
function request(origin:string|null=admin,host=new URL(admin).host){
 const headers=new Headers({host});if(origin!==null)headers.set('origin',origin);
 return new Request(`${admin}/api/auth`,{method:'POST',headers});
}
describe('explicit same-origin CSRF policy',()=>{
 it('accepts the real production admin origin with ADMIN_ORIGIN taking precedence',()=>{
  expect(()=>csrf(request(),true,{ADMIN_ORIGIN:` ${admin}/ `,APP_ORIGIN:users})).not.toThrow();
 });
 it('preserves APP_ORIGIN and localhost with explicit ports',()=>{
  expect(()=>csrf(request(),true,{APP_ORIGIN:admin})).not.toThrow();
  expect(()=>csrf(request('http://localhost:3001','localhost:3001'),true,{APP_ORIGIN:'http://localhost:3001'})).not.toThrow();
 });
 it('allows only explicitly configured aliases on their own host',()=>{
  const alias='https://admin.example.com';
  expect(()=>csrf(request(alias,'admin.example.com'),true,{ADMIN_ORIGIN:admin,ALLOWED_ORIGINS:` ${alias}/, ${admin} `})).not.toThrow();
  expect(()=>csrf(request(alias),true,{ADMIN_ORIGIN:admin,ALLOWED_ORIGINS:alias})).toThrow('Origin rejected');
 });
 it('supports an explicit allowlist without an inferred deployment origin',()=>{
  expect(()=>csrf(request(),true,{ALLOWED_ORIGINS:admin})).not.toThrow();
  expect(()=>csrf(request(),true,{})).toThrow('Origin rejected');
 });
 it.each([null,'null','https://evil.example',users,`${admin}.evil.example`,`${admin}/login`,'http://3d-printing-by-memo-admin-pearl.vercel.app',`${admin}:444`])('rejects untrusted browser Origin %s',origin=>{
  expect(()=>csrf(request(origin),true,{ADMIN_ORIGIN:admin})).toThrow('Origin rejected');
 });
 it.each(['evil.example','admin.example.com','3d-printing-by-memo-admin-pearl.vercel.app:444','admin.example.com, 3d-printing-by-memo-admin-pearl.vercel.app','user@3d-printing-by-memo-admin-pearl.vercel.app','3d-printing-by-memo-admin-pearl.vercel.app/login'])('rejects Host mismatch or malformed authority %s',host=>{
  expect(()=>csrf(request(admin,host),true,{ADMIN_ORIGIN:admin})).toThrow('Origin rejected');
 });
 it('uses URL authority only when Host is absent and never trusts forwarded headers',()=>{
  const req=request();req.headers.delete('host');expect(()=>csrf(req,true,{ADMIN_ORIGIN:admin})).not.toThrow();
  const bad=request(admin,'evil.example');bad.headers.set('x-forwarded-host',new URL(admin).host);
  expect(()=>csrf(bad,true,{ADMIN_ORIGIN:admin})).toThrow('Origin rejected');
 });
 it.each(['*','https://*.vercel.app',`${admin}/login`,`${admin}?q=x`,`${admin}#fragment`,'https://user:password@admin.example.com','not-a-url','"'+admin+'"'])('fails closed for malformed configuration %s',value=>{
  expect(()=>csrf(request(),true,{ADMIN_ORIGIN:value,APP_ORIGIN:admin})).toThrow('Origin rejected');
  expect(()=>csrf(request(),true,{ADMIN_ORIGIN:admin,ALLOWED_ORIGINS:value})).toThrow('Origin rejected');
 });
 it('keeps admin-only configuration out of customer trust',()=>{
  expect(()=>csrf(request(),false,{ADMIN_ORIGIN:admin,APP_ORIGIN:users})).toThrow('Origin rejected');
  expect(()=>csrf(request(users,new URL(users).host),false,{ADMIN_ORIGIN:admin,APP_ORIGIN:users})).not.toThrow();
 });
});
