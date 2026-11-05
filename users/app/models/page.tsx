import {Catalog} from '@mfu/ui/catalog.tsx';
import {pageMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return pageMetadata('catalog.title');}
export default function Page(){return <Catalog/>;}
