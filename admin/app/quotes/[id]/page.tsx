import {requireAdmin} from '@mfu/database';
import {redirect} from 'next/navigation';
import { Detail } from '@mfu/ui/workflows.tsx';
export default async function Page({params}:{params:Promise<{id:string}>}){try{await requireAdmin();}catch{redirect('/login');}const {id}=await params;return <Detail id={id} resource="quotes" admin={true}/>;}
