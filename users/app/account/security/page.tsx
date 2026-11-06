import {requireUser} from '@mfu/database';
import {redirect} from 'next/navigation';
import {CustomerSecurity} from '@mfu/ui/customer-security.tsx';
export const dynamic='force-dynamic';
export default async function Page(){try{await requireUser();}catch{redirect('/login');}return <CustomerSecurity/>;}
