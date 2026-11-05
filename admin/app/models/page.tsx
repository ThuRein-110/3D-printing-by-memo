import {requireAdmin} from '@mfu/database';
import {redirect} from 'next/navigation';
import {AdminCatalog} from '@mfu/ui/admin-catalog.tsx';
export default async function Page(){try{await requireAdmin();}catch{redirect('/login');}return <AdminCatalog/>;}
