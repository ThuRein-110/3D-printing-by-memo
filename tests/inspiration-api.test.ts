import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),requireUser:vi.fn(),requireAdmin:vi.fn()}));
vi.mock('../packages/database/src/server',()=>({configured:()=>true,session:vi.fn(),requireUser:mocks.requireUser,requireAdmin:mocks.requireAdmin,serviceClient:()=>({})}));
import {handle} from '../packages/database/src/http';
const origin='https://memo.test',payload={inspirationId:'cat',requestKey:'a0611000-0000-4000-8000-000000000001',customer:{name:'Synthetic customer',email:'synthetic@example.com'},selection:{dimensions:{x:60,y:50,z:40},color:'grey',quantity:2,notes:'Original design, please'}};
const post=(value:unknown,browserOrigin=origin)=>new Request(origin+'/api/inspiration-inquiries',{method:'POST',headers:{origin:browserOrigin,host:'memo.test','content-type':'application/json'},body:JSON.stringify(value)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('APP_ORIGIN',origin);vi.stubEnv('ALLOWED_ORIGINS','');mocks.requireUser.mockResolvedValue({user:{id:'actual-owner'},db:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:'saved-inquiry',error:null});});
afterEach(()=>vi.unstubAllEnvs());
it('sends only validated selection and identity fields to the authenticated RPC; source and licensing are server-owned',async()=>{
 const r=await handle(post({...payload,image_snapshot:{image:'https://evil.test/image.jpg',license:'forged'},owner_id:'forged',customer:{...payload.customer,password:'discard'}}),['inspiration-inquiries']);expect(r.status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('submit_inspiration_inquiry',{p_inspiration:'cat',p_request:payload.requestKey,p_customer:payload.customer,p_selection:payload.selection});
});
it('rejects invalid selections, foreign origins, anonymous customers and non-MFA administrators',async()=>{
 expect((await handle(post({...payload,selection:{...payload.selection,quantity:0}}),['inspiration-inquiries'])).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();expect((await handle(post(payload,'https://evil.test'),['inspiration-inquiries'])).status).toBe(403);
 mocks.requireUser.mockRejectedValue(Error('Authentication required'));expect((await handle(post(payload),['inspiration-inquiries'])).status).toBe(401);
 mocks.requireAdmin.mockRejectedValue(Error('Admin role and verified MFA required'));expect((await handle(new Request(origin+'/api/inspiration-inquiries'),['inspiration-inquiries'],true)).status).toBe(403);
});
it('bounds multilingual notes and exposes safe rate-limit errors',async()=>{
 expect((await handle(post({...payload,selection:{...payload.selection,notes:'\u1000'.repeat(4000)}}),['inspiration-inquiries'])).status).toBe(200);
 mocks.rpc.mockResolvedValue({data:null,error:{message:'Rate limit exceeded'}});const r=await handle(post(payload),['inspiration-inquiries']);expect(await r.json()).toMatchObject({errorCode:'limit'});
});
