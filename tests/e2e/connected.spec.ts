import {test,expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
const enabled=process.env.RUN_CONNECTED_E2E==='1';
test.describe('real Supabase customer → admin quotation flow',()=>{
 test.skip(!enabled,'Requires configured non-production Supabase, stocked material, verified test identities and admin TOTP seed.');
 test('private upload, estimate, review and final issue',async({browser})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({baseURL:'http://localhost:3000'}),page=await context.newPage();
  await page.goto('/login');await page.getByLabel('อีเมล',{exact:true}).fill(process.env.E2E_CUSTOMER_EMAIL!);await page.getByLabel(/รหัสผ่าน/).fill(process.env.E2E_CUSTOMER_PASSWORD!);await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await expect(page).toHaveURL(/account/);
  await page.goto('/configure');
  const mesh='v 0 0 0\nv 10 0 0\nv 0 10 0\nv 0 0 10\nf 1 3 2\nf 1 2 4\nf 2 3 4\nf 3 1 4\n';
  await page.getByLabel('Upload reference or mesh').setInputFiles({name:'test-tetra.obj',mimeType:'application/octet-stream',buffer:Buffer.from(mesh)});
  await page.getByRole('button',{name:/คำนวณและบันทึก/}).click();await expect(page).toHaveURL(/quote\/[a-f0-9-]+/);
  const quoteId=page.url().split('/').pop()!;const quote=await context.request.get(`/api/quotes/${quoteId}`);expect(quote.ok()).toBe(true);const q=(await quote.json()).data;
  await page.getByRole('button',{name:'ขอใบเสนอราคาสุดท้าย'}).click();await expect(page).toHaveURL(/orders\/[a-f0-9-]+/);const orderId=page.url().split('/').pop()!;
  const adminContext=await browser.newContext({baseURL:'http://localhost:3001'}),admin=await adminContext.newPage();await admin.goto('/login');await admin.getByLabel('อีเมล',{exact:true}).fill(process.env.E2E_ADMIN_EMAIL!);await admin.getByLabel(/รหัสผ่าน/).fill(process.env.E2E_ADMIN_PASSWORD!);await admin.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await admin.getByLabel('Verification code').fill(totp(process.env.E2E_ADMIN_TOTP_SECRET!));await admin.getByRole('button',{name:'Verify',exact:true}).click();await expect(admin).toHaveURL(/dashboard/);
  const response=await adminContext.request.post('/api/final-quote',{headers:{Origin:'http://localhost:3001'},data:{id:quoteId,total:300,notes:'Synthetic acceptance test final quotation',designFileId:q.configuration.fileId}});expect(response.ok()).toBe(true);
  const transition=await adminContext.request.post('/api/transition',{headers:{Origin:'http://localhost:3001'},data:{id:orderId,to:'reviewing',note:'Acceptance test review'}});expect(transition.ok()).toBe(true);
  await adminContext.request.post('/api/transition',{headers:{Origin:'http://localhost:3001'},data:{id:orderId,to:'awaiting_customer_approval',note:'Actual uploaded mesh attached'}});
  await page.reload();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Accept final design and quote'}).click();await expect(page.getByText('approved',{exact:true})).toBeVisible();
  await adminContext.close();await context.close();
 });
});
function totp(secret:string){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const char of secret.toUpperCase().replace(/=+$/,'')){const i=alphabet.indexOf(char);if(i<0)throw new Error('Invalid configured TOTP secret');bits+=i.toString(2).padStart(5,'0');}const key=Buffer.from((bits.match(/.{8}/g)??[]).map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',key).update(counter).digest(),offset=hash[19]&15;return ((hash.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');}
