import {requireAdmin} from '@mfu/database';
import {redirect} from 'next/navigation';
import {AdminWorkspace} from '@mfu/ui/workflows.tsx';
export const dynamic='force-dynamic';
export default async function Page(){try{await requireAdmin();}catch{redirect('/login');}return <AdminWorkspace slug="orders"/>;}
