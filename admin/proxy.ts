import type {NextRequest} from 'next/server';
import {refreshSession} from '@mfu/database/refresh.ts';
export async function proxy(request:NextRequest){return refreshSession(request);}
export const config={matcher:['/((?!api|_next/static|_next/image|favicon.ico|login).*)']};
