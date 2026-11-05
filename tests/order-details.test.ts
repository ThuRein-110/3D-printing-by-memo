import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const h=vi.hoisted(()=>({user:vi.fn(),admin:vi.fn(),context:vi.fn(),from:vi.fn(),queries:[] as {table:string;column:string;value:string}[],missing:false}));
vi.mock('../packages/database/src/order-context',()=>({adminOrderContext:h.context}));
vi.mock('../packages/database/src/server',()=>({configured:()=>true,session:vi.fn(),serviceClient:()=>({from:h.from}),requireUser:h.user,requireAdmin:h.admin}));
import {handle} from '@mfu/database/http.ts';
const owner='11111111-1111-4111-8111-111111111111',order='22222222-2222-4222-8222-222222222222',quote='33333333-3333-4333-8333-333333333333',material='44444444-4444-4444-8444-444444444444';
beforeEach(()=>{
 vi.clearAllMocks();h.queries=[];h.missing=false;
 h.from.mockImplementation((table:string)=>{
  const result=()=>({data:h.missing?null:table==='orders'?{id:order,quote_id:quote,owner_id:owner}:table==='quotes'?{owner_id:owner,configuration:{materialId:material},estimate:{total:100,productionCost:60},snapshot:{margin:.4},final_total:null}:table==='model_order_snapshots'?{metadata:{model:{name:'Synthetic model'},selection:{quantity:1},price:{total:100}}}:null,error:h.missing?{message:'not found'}:null});
  const chain={select:()=>chain,eq:(column:string,value:string)=>{h.queries.push({table,column,value});return chain;},single:async()=>result(),maybeSingle:async()=>result(),order:async()=>({data:[],error:null})};return chain;
 });
 const db={from:h.from};h.user.mockResolvedValue({user:{id:owner},db});h.admin.mockResolvedValue({user:{id:'staff'},db});h.context.mockResolvedValue({customer:{email:'synthetic@example.com'},materialCurrent:{available_grams:500}});
});
afterEach(()=>vi.unstubAllEnvs());
it('never loads or returns privileged customer contact/financial context on customer order requests',async()=>{
 const response=await handle(new Request(`https://customer.example/api/orders/${order}`),['orders',order]);const result=await response.json();expect(response.status).toBe(200);expect(result.finance).toBeNull();expect(h.context).not.toHaveBeenCalled();expect(h.queries).toContainEqual({table:'orders',column:'owner_id',value:owner});
});
it('uses the authorized quotation owner for admin fulfillment context',async()=>{
 const response=await handle(new Request(`https://admin.example/api/orders/${order}`),['orders',order],true);expect(response.status).toBe(200);expect(h.admin).toHaveBeenCalledOnce();expect(h.context).toHaveBeenCalledWith(expect.anything(),owner,material);expect((await response.json()).finance.customer.email).toBe('synthetic@example.com');
});
it('does not look up customer information for an unavailable or unauthorized order',async()=>{
 h.missing=true;const response=await handle(new Request(`https://customer.example/api/orders/${order}`),['orders',order]);expect(response.status).toBe(404);expect(h.context).not.toHaveBeenCalled();
});
