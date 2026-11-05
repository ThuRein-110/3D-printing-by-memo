export function errorCode(message:string){
 const text=message.toLowerCase();
 if(text.includes('not configured')||text.includes('migration 009'))return 'backend';
 if(text.includes('authentication required'))return 'auth';
 if(text.includes('admin'))return 'admin';
 if(text.includes('daily')||text.includes('rate limit'))return 'limit';
 if(text.includes('generation unavailable')||text.includes('provider budget')||text.includes('reconstruction is not configured'))return 'generation';
 if(text.includes('stock')||text.includes('color is unavailable'))return 'stock';
 if(text.includes('reconciliation')||text.includes('unsafe retry'))return 'reconcile';
 if(text.includes('authentication failed'))return 'credentials';
 if(text.includes('origin'))return 'origin';
 if(text.includes('file')||text.includes('mesh')||text.includes('glb')||text.includes('obj')||text.includes('image'))return 'file';
 if(text.includes('not found'))return 'missing';return 'request';
}
