// Provider tokens are unnecessary for MEMO. Remove them before the SDK can persist a session.
export async function authFetch(input:RequestInfo|URL,init?:RequestInit){
 const response=await fetch(input,init),url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(!url.pathname.startsWith('/auth/v1/')||!response.headers.get('content-type')?.includes('application/json'))return response;
 const data=await response.json();
 for(const record of [data,data?.session])if(record&&typeof record==='object'){delete record.provider_token;delete record.provider_refresh_token;}
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
}
