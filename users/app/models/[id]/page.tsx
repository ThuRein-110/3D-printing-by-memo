import {CatalogOrder} from '@mfu/ui/catalog.tsx';
import {pageMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return pageMetadata('catalog.preview');}
export default async function Page({params}:{params:Promise<{id:string}>}){return <CatalogOrder id={(await params).id}/>;}
