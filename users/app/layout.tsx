import './globals.css';
import type { Metadata } from 'next';
import { Shell } from '@mfu/ui/Shell.tsx';
export const metadata: Metadata = {title: '3D Printing MFU By Memo',description: 'Turn Your Ideas into Reality. PETG 3D printing and custom design.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="th"><body><Shell admin={false}>{children}</Shell></body></html>;}
