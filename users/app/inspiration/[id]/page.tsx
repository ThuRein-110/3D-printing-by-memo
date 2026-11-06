import {notFound} from 'next/navigation';
import {inspirationImages} from '@mfu/types/inspiration.ts';
import {InspirationDetail} from '@mfu/ui/inspiration.tsx';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!inspirationImages.some(i=>i.id===id))notFound();return <InspirationDetail id={id}/>;}
