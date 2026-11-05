import {it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@mfu/database/generated.ts';
import {adminOrderContext} from '@mfu/database/order-context.ts';
function harness(failure=false){
 const queries:{table:string;column:string;value:string}[]=[],identity=vi.fn().mockResolvedValue({data:{user:{id:'owner',email:'synthetic@example.com',phone:'not-for-display',app_metadata:{internal:'private'}}},error:null});
 const svc={auth:{admin:{getUserById:identity}},from:(table:string)=>({select:()=>({eq:(column:string,value:string)=>{queries.push({table,column,value});const data=table==='profiles'?{display_name:'Synthetic customer'}:table==='customers'?{display_name:'Other name'}:{id:'material',name:'PETG',color:'Black',visible:true,available_grams:500};const chain={limit:()=>chain,maybeSingle:async()=>({data,error:failure?{message:'lookup failed'}:null})};return chain;}})})} as unknown as SupabaseClient<Database>;
 return {svc,queries,identity};
}
it('loads only the authorized quote owner and selected material and projects safe contact fields',async()=>{
 const h=harness(),result=await adminOrderContext(h.svc,'owner','material');expect(h.identity).toHaveBeenCalledWith('owner');expect(h.queries).toEqual([{table:'profiles',column:'id',value:'owner'},{table:'customers',column:'owner_id',value:'owner'},{table:'materials',column:'id',value:'material'}]);expect(result.customer).toEqual({id:'owner',displayName:'Synthetic customer',email:'synthetic@example.com'});expect(JSON.stringify(result)).not.toContain('not-for-display');expect(JSON.stringify(result)).not.toContain('app_metadata');
});
it('does not invent stock for an inquiry without a selected material',async()=>{
 const h=harness(),result=await adminOrderContext(h.svc,'owner',null);expect(result.materialCurrent).toBeNull();expect(h.queries).toHaveLength(2);
});
it('reports lookup failures rather than returning fabricated customer information',async()=>{
 const h=harness(true);await expect(adminOrderContext(h.svc,'owner','material')).rejects.toThrow('Database operation failed');
});
