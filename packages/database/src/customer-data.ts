import type {Row} from './generated';
const visible=['total','subtotal','tax','shipping','original','discount','minimum','confidence','range','assumptions','ratesPublished','promotion','productionWindow','studentDiscount'] as const;
export function customerEstimate(value:unknown){const estimate=typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:{};return Object.fromEntries(visible.map(key=>[key,key==='studentDiscount'&&estimate[key]&&typeof estimate[key]==='object'?Object.fromEntries(['kind','value','amount','expiresAt'].map(k=>[k,(estimate[key] as Record<string,unknown>)[k]])):estimate[key]]));}
export function customerQuote(row:Row<'quotes'>){
 const {snapshot:_snapshot,estimate:_estimate,...record}=row;void _snapshot;void _estimate;
 return {...record,estimate:customerEstimate(row.estimate)};
}
export function customerJob(row:Row<'preview_jobs'>){return {id:row.id,file_id:row.file_id,state:row.state,progress:row.progress??null,error_code:row.error_code,output_file_id:row.output_file_id,created_at:row.created_at,cancel_requested:row.cancel_requested,consumed_credits:row.consumed_credits??null};}
