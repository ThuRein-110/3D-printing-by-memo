import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),requireUser:vi.fn()}));
vi.mock('../packages/database/src/server',()=>({configured:()=>true,session:vi.fn(),requireUser:mocks.requireUser,requireAdmin:vi.fn(),serviceClient:()=>({})}));
import {handle} from '../packages/database/src/http';
const origin='https://memo.test',model='a0611000-0000-4000-8000-000000000001',request='a0611000-0000-4000-8000-000000000002';
const payload={modelId:model,requestKey:request,customer:{name:'Synthetic customer',email:'synthetic@example.com'},selection:{dimensions:{x:60,y:50,z:40},color:'grey',quantity:2,notes:'Please review permission'}};
function post(value:unknown,browserOrigin=origin){return new Request(origin+'/api/catalog-inquiries',{method:'POST',headers:{origin:browserOrigin,host:'memo.test','content-type':'application/json'},body:JSON.stringify(value)});}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('APP_ORIGIN',origin);vi.stubEnv('ALLOWED_ORIGINS','');mocks.requireUser.mockResolvedValue({user:{id:'actual-owner'},db:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:'saved-inquiry',error:null});});
afterEach(()=>vi.unstubAllEnvs());
it('uses the authenticated database client and strips forged identity, image and approval metadata',async()=>{
 const r=await handle(post({...payload,owner_id:'forged',model_snapshot:{commercial_allowed:true},customer:{...payload.customer,password:'discarded'}}),['catalog-inquiries']);expect(r.status).toBe(200);expect(await r.json()).toEqual({id:'saved-inquiry'});expect(mocks.rpc).toHaveBeenCalledWith('submit_catalog_inquiry',{p_model:model,p_request:request,p_customer:payload.customer,p_selection:payload.selection});
});
it('returns a safe validation error instead of an unhandled route rejection',async()=>{
 const r=await handle(post({...payload,selection:{...payload.selection,quantity:0}}),['catalog-inquiries']);expect(r.status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();
 mocks.rpc.mockResolvedValue({data:null,error:{message:'Rate limit exceeded'}});const limited=await handle(post(payload),['catalog-inquiries']);expect(limited.status).toBe(400);expect(await limited.json()).toMatchObject({errorCode:'limit'});
});
it('accepts the full multilingual note allowance within the bounded body limit',async()=>{
 const notes='\u1000'.repeat(4000),r=await handle(post({...payload,selection:{...payload.selection,notes}}),['catalog-inquiries']);expect(r.status).toBe(200);expect(mocks.rpc.mock.calls[0][1].p_selection.notes).toHaveLength(4000);
});
it('requires login and a matching trusted origin before any inquiry can reach the database',async()=>{
 const foreign=await handle(post(payload,'https://evil.test'),['catalog-inquiries']);expect(foreign.status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();mocks.requireUser.mockRejectedValue(new Error('Authentication required'));const anonymous=await handle(post(payload),['catalog-inquiries']);expect(anonymous.status).toBe(401);expect(mocks.rpc).not.toHaveBeenCalled();
});
