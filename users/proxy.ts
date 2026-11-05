import type {NextRequest} from 'next/server';
import {refreshSession} from '@mfu/database/refresh.ts';
export async function proxy(request:NextRequest){return refreshSession(request);}
export const config={matcher:['/account','/orders/:path*','/quote/:path*','/preview/:path*']};
