import {requireAdmin} from '@mfu/database';
import {redirect} from 'next/navigation';
import {AdminCatalog} from '@mfu/ui/admin-catalog.tsx';
export default async function Page({params}:{params:Promise<{id:string}>}){try{await requireAdmin();}catch{redirect('/login');}return <AdminCatalog id={(await params).id}/>;}
