import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({requireUser:vi.fn(),rate:vi.fn(),upsert:vi.fn(),remove:vi.fn(),eq:vi.fn(),select:vi.fn()}));
vi.mock('../packages/database/src/server',()=>({configured:()=>true,session:vi.fn(),requireUser:state.requireUser,requireAdmin:vi.fn(),serviceClient:()=>({rpc:state.rate})}));
import {handle} from '../packages/database/src/http';
const origin='https://memo.test',model='a1111111-1111-4111-8111-111111111111';
const request=(body:unknown,browserOrigin=origin)=>new Request(origin+'/api/catalog-favorites',{method:'POST',headers:{origin:browserOrigin,host:'memo.test','content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('APP_ORIGIN',origin);vi.stubEnv('ALLOWED_ORIGINS','');const q={eq:state.eq,limit:async()=>({data:[{model_id:model}],error:null})};state.eq.mockReturnValue(q);state.select.mockReturnValue(q);state.remove.mockReturnValue(q);state.upsert.mockResolvedValue({error:null});state.rate.mockResolvedValue({data:true,error:null});state.requireUser.mockResolvedValue({user:{id:'authenticated-owner'},db:{from:()=>({upsert:state.upsert,delete:state.remove,select:state.select})}});});
afterEach(()=>vi.unstubAllEnvs());
it('uses authenticated identity and idempotent writes rather than browser-submitted ownership',async()=>{
 const r=await handle(request({modelId:model,saved:true,owner_id:'forged'}),['catalog-favorites']);expect(r.status).toBe(200);expect(state.upsert).toHaveBeenCalledWith({owner_id:'authenticated-owner',model_id:model},{onConflict:'owner_id,model_id',ignoreDuplicates:true});expect(r.headers.get('Cache-Control')).toBe('private,no-store');
 const read=await handle(new Request(origin+'/api/catalog-favorites'),['catalog-favorites']);expect(await read.json()).toEqual({data:[model]});expect(state.eq).toHaveBeenCalledWith('owner_id','authenticated-owner');
});
it('rejects foreign origins, anonymous writes, invalid IDs and exhausted rate limits',async()=>{
 expect((await handle(request({modelId:model,saved:true},'https://evil.test'),['catalog-favorites'])).status).toBe(403);expect((await handle(request({modelId:'bad',saved:true}),['catalog-favorites'])).status).toBe(400);expect(state.upsert).not.toHaveBeenCalled();state.rate.mockResolvedValue({data:false,error:null});const limited=await handle(request({modelId:model,saved:true}),['catalog-favorites']);expect(await limited.json()).toMatchObject({errorCode:'limit'});expect(state.upsert).not.toHaveBeenCalled();state.requireUser.mockRejectedValue(Error('Authentication required'));expect((await handle(request({modelId:model,saved:true}),['catalog-favorites'])).status).toBe(401);
});
