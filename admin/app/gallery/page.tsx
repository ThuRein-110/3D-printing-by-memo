import {pageMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return pageMetadata('nav.gallery',true);}
import {requireAdmin} from '@mfu/database';
import {redirect} from 'next/navigation';
import {AdminWorkspace} from '@mfu/ui/workflows.tsx';
export const dynamic='force-dynamic';
export default async function Page(){try{await requireAdmin();}catch{redirect('/login');}return <AdminWorkspace slug="gallery"/>;}
