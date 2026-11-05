import {pageMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return pageMetadata('nav.login',true);}
import {Auth} from '@mfu/ui/workflows.tsx';
export default function Page(){return <Auth admin/>;}
