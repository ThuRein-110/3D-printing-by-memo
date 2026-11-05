import {pageMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return pageMetadata('studio.title',false);}
import {Configurator} from '@mfu/ui/configurator.tsx';
import {CatalogOrder} from '@mfu/ui/catalog.tsx';
export default async function Page({searchParams}:{searchParams:Promise<{model?:string}>}){const {model}=await searchParams;return model?<CatalogOrder id={model}/>:<Configurator/>;}
