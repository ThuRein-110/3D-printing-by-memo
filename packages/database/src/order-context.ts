import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './generated';

// Call only after requireAdmin(). The owner and material IDs come from the
// already-authorized quote, never directly from request parameters.
export async function adminOrderContext(svc:SupabaseClient<Database>,ownerId:string,materialId:string|null){
 const [profile,customer,identity,material]=await Promise.all([
  svc.from('profiles').select('display_name').eq('id',ownerId).maybeSingle(),
  svc.from('customers').select('display_name').eq('owner_id',ownerId).limit(1).maybeSingle(),
  svc.auth.admin.getUserById(ownerId),
  materialId?svc.from('materials').select('id,name,color,visible,available_grams').eq('id',materialId).maybeSingle():Promise.resolve({data:null,error:null})
 ]);
 if(profile.error||customer.error||identity.error||material.error)throw new Error('Database operation failed');
 return {
  customer:{id:ownerId,displayName:profile.data?.display_name??customer.data?.display_name??null,email:identity.data.user?.email??null},
  materialCurrent:material.data
 };
}
