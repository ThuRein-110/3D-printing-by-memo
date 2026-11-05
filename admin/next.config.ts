import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
 transpilePackages: ['@mfu/database','@mfu/pricing','@mfu/types','@mfu/ui','@mfu/validation','@mfu/three'],
 outputFileTracingRoot: path.resolve(process.cwd(), '..'),
 outputFileTracingIncludes: {'/api/*':['./public/fonts/*']},
 serverExternalPackages: ['sharp'],
 async headers() { return [{source: '/:path*',headers: [
 {key:'X-Content-Type-Options',value:'nosniff'}, {key:'Referrer-Policy',value:'same-origin'},
 {key:'X-Frame-Options',value:'DENY'}, {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
 {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; connect-src 'self' https://*.supabase.co; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}
 ]}]; }
};
export default config;
