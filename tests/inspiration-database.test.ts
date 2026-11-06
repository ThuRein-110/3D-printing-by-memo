import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {inspirationImages} from '../packages/types/src/inspiration';
let db:PGlite;
const admin='a1111111-1111-4111-8111-111111111111',owner='b1111111-1111-4111-8111-111111111111',other='c1111111-1111-4111-8111-111111111111';
const customer={name:'Synthetic customer',email:'synthetic@example.com',accountEmail:'forged',password:'discard'},selection={dimensions:{x:60,y:50,z:40},color:'grey',quantity:2,notes:'Original design please',price:1};
async function user(id:string,aal='aal1'){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claims','{"aal":"${aal}","email":"verified@example.com"}',false);set role authenticated;`);}
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 // Seed the old public references before the additive migration to verify withdrawal without deletion.
 for(const p of readdirSync('supabase/migrations').sort()){
  if(p==='202611060017_inspiration.sql')await db.exec(readFileSync('supabase/seed/creality-showcase.sql','utf8').replaceAll("'pending',false,false,false)","'pending',false,false,true)"));
  await db.exec(readFileSync('supabase/migrations/'+p,'utf8').replace('create extension if not exists pgcrypto;',''));
 }
 await db.exec(`insert into auth.users values('${admin}'),('${owner}'),('${other}');insert into public.roles values('${admin}','admin');`);
});
afterAll(async()=>{await db?.close();});
it('withdraws all 16 unlicensed references without removing records and seeds exact reviewed photo metadata',async()=>{
 expect((await db.query("select id from public.catalog_models where source_kind='creality'")).rows).toHaveLength(16);expect((await db.query('select id from public.catalog_models where showcase_visible or visible')).rows).toHaveLength(0);
 const rows=await db.query<{id:string;metadata:unknown}>('select id,metadata from public.inspiration_images');for(const image of inspirationImages)expect(rows.rows.find(r=>r.id===image.id)?.metadata).toEqual(image);
});
it('stores immutable authoritative image snapshots and private customer selections idempotently, without creating an order',async()=>{
 const request='e1111111-1111-4111-8111-111111111111';await user(owner);const submit=()=>db.query<{id:string}>('select public.submit_inspiration_inquiry($1,$2,$3,$4) id',['cat',request,customer,selection]);const first=(await submit()).rows[0].id;expect((await submit()).rows[0].id).toBe(first);
 const row=(await db.query<{image_snapshot:{sourceUrl:string;printing_permission_granted:boolean;example_only:boolean};customer:Record<string,unknown>;selection:Record<string,unknown>}>('select image_snapshot,customer,selection from public.inspiration_inquiries')).rows[0];expect(row.image_snapshot.sourceUrl).toBe(inspirationImages[0].sourceUrl);expect(row.image_snapshot.printing_permission_granted).toBe(false);expect(row.image_snapshot.example_only).toBe(true);expect(row.customer.accountEmail).toBe('verified@example.com');expect(row.customer).not.toHaveProperty('password');expect(row.selection).not.toHaveProperty('price');
 await user(other);expect((await db.query('select * from public.inspiration_inquiries')).rows).toHaveLength(0);await expect(db.query("insert into public.inspiration_inquiries(owner_id,request_key,inspiration_id,image_snapshot,customer,selection)values($1,$2,'cat','{}','{}','{}')",[other,request])).rejects.toThrow('permission denied');await user(admin);expect((await db.query('select * from public.inspiration_inquiries')).rows).toHaveLength(0);await user(admin,'aal2');expect((await db.query('select * from public.inspiration_inquiries')).rows).toHaveLength(1);
 await db.exec('reset role');await expect(db.exec("update public.inspiration_inquiries set image_snapshot='{}'")).rejects.toThrow('Immutable');expect((await db.query('select * from public.orders')).rows).toHaveLength(0);expect((await db.query('select * from public.quotes')).rows).toHaveLength(0);
});
it('rejects unknown/inactive inspiration, invalid dimensions and quantities, null identity fields, and over-limit usage at the database boundary',async()=>{
 await user(other);const submit=(id='cat',s:unknown=selection,c:unknown=customer)=>db.query('select public.submit_inspiration_inquiry($1,gen_random_uuid(),$2,$3)',[id,c,s]);
 await expect(submit('unknown')).rejects.toThrow('Inspiration unavailable');await expect(submit('cat',{...selection,dimensions:{x:0,y:10,z:10}})).rejects.toThrow('Invalid dimensions');await expect(submit('cat',{...selection,quantity:1.5})).rejects.toThrow('Invalid inquiry');await expect(submit('cat',selection,{email:customer.email})).rejects.toThrow('Invalid inquiry');
 await db.exec("reset role;update public.inspiration_images set active=false where id='flowers'");await user(other);await expect(submit('flowers')).rejects.toThrow('Inspiration unavailable');for(let i=0;i<20;i++)await submit();await expect(submit()).rejects.toThrow('Rate limit');
 await db.exec('reset role;set role anon');await expect(submit()).rejects.toThrow('permission denied');await expect(db.query('select * from public.inspiration_inquiries')).rejects.toThrow('permission denied');
});
