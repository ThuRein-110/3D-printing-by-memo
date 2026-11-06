export function customerOrigin(value=process.env.APP_ORIGIN){
 if(!value)throw new Error('Customer origin is not configured');
 const u=new URL(value);if(value.includes('*')||value.includes('\\')||u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))throw new Error('Invalid customer origin');return u.origin;
}
export function eligibleStudentEmail(value:string){const email=value.trim().toLowerCase();return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@lamduan\.mfu\.ac\.th$/.test(email)&&!email.includes('..')&&!email.split('@')[0].includes('+');}
export function mfuProvider(env:NodeJS.ProcessEnv=process.env){
 if(env.MFU_SSO_AUTHORIZED!=='true')return null;
 if(env.MFU_SSO_KIND==='saml'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.MFU_SSO_PROVIDER_ID??''))return {kind:'saml' as const,id:env.MFU_SSO_PROVIDER_ID!};
 if(env.MFU_SSO_KIND==='oidc'&&/^custom:[a-z0-9-]+$/.test(env.MFU_SSO_PROVIDER_ID??''))return {kind:'oidc' as const,id:env.MFU_SSO_PROVIDER_ID!};
 return null;
}
export function validCallback(url:URL,state:string|undefined){const supplied=url.searchParams.get('flow');return !!state&&!!supplied&&state===supplied&&/^[a-f0-9]{64}$/.test(state)&&!url.searchParams.has('error')&&!!url.searchParams.get('code')&&url.searchParams.get('code')!.length<=2048;}
export function trustedEnrollment(user:{identities?:{provider:string}[];app_metadata:Record<string,unknown>},env:NodeJS.ProcessEnv=process.env){
 const p=mfuProvider(env),claim=user.app_metadata.mfu_enrollment;
 if(!p||env.MFU_SSO_TRUST_ENROLLMENT_CLAIM!=='true'||!user.identities?.some(i=>i.provider===(p.kind==='saml'?'sso:'+p.id:p.id))||!claim||typeof claim!=='object')return null;
 const c=claim as Record<string,unknown>;
 if(c.providerId!==p.id||typeof c.email!=='string'||!eligibleStudentEmail(c.email)||!['active','inactive'].includes(String(c.status))||typeof c.expiresAt!=='string'||!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=Date.now()||Date.parse(c.expiresAt)>Date.now()+366*86400000)return null;
 return {email:c.email.toLowerCase(),status:String(c.status),expiresAt:c.expiresAt,method:p.kind};
}
