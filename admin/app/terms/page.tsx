import {pageMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return pageMetadata('nav.terms',true);}
import {ContentPage} from '@mfu/ui/marketing.tsx';
export default function Page(){return <ContentPage slug="terms"/>;}
