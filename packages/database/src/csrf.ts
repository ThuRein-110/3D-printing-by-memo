type OriginEnvironment = {
 [name:string]:string|undefined;
 APP_ORIGIN?:string;
 ADMIN_ORIGIN?:string;
 ALLOWED_ORIGINS?:string;
};

// Configuration accepts only complete, explicit HTTP(S) origins. A trailing
// slash/outer whitespace is harmless; paths, credentials and wildcards are not.
function parseOrigin(value:string):URL {
 const text=value.trim(),url=new URL(text);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||text.includes('*')||text.includes('\\')||!/^https?:\/\/[^/?#]+\/?$/i.test(text))throw new Error('Origin rejected');
 return url;
}

export function csrf(req:Request,adminApp=false,env:OriginEnvironment=process.env):void {
 try {
  // ADMIN_ORIGIN belongs only to the admin deployment. APP_ORIGIN remains the
  // backward-compatible default; aliases must be explicitly listed per project.
  const primary=(adminApp?env.ADMIN_ORIGIN?.trim():undefined)||env.APP_ORIGIN?.trim();
  const entries=env.ALLOWED_ORIGINS?.trim()?env.ALLOWED_ORIGINS.split(','):[];
  const allowed=new Set([...(primary?[primary]:[]),...entries].map(value=>parseOrigin(value).origin));
  const raw=req.headers.get('origin');
  if(!raw)throw new Error('Origin rejected');
  const origin=parseOrigin(raw);
  if(raw!==origin.origin||!allowed.has(origin.origin))throw new Error('Origin rejected');
  // Never use X-Forwarded-Host to expand trust. Vercel preserves the public
  // Host; the request URL is the fallback for adapters omitting that header.
  const host=req.headers.get('host')??new URL(req.url).host;
  if(parseOrigin(`${origin.protocol}//${host}`).host!==origin.host)throw new Error('Origin rejected');
 } catch {
  // Fail closed for missing/malformed configuration without disclosing it.
  throw new Error('Origin rejected');
 }
}
