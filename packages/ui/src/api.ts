export type RecordData=Record<string,unknown>;
export class ApiError extends Error{constructor(public code:string){super(code);}}
export async function api<T=RecordData>(path:string,init?:RequestInit):Promise<T>{let response:Response;try{response=await fetch('/api'+path,{...init,headers:init?.body instanceof FormData?init.headers:{'Content-Type':'application/json',...init?.headers}});}catch{throw new ApiError('backend');}let data:RecordData;try{data=await response.json();}catch{throw new ApiError('request');}if(!response.ok)throw new ApiError(String(data.errorCode??'request'));return data as T;}
export const post=<T=RecordData>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
