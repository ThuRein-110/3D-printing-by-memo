import {PreviewJob} from '@mfu/ui/preview-job.tsx';
export default async function Page({params}:{params:Promise<{id:string}>}){return <PreviewJob id={(await params).id}/>;}
