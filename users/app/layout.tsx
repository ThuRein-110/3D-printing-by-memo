import './globals.css';
import {Shell} from '@mfu/ui/Shell.tsx';
import {BOOTSTRAP} from '@mfu/ui/settings-script.ts';
import {preferences,localizedMetadata} from '@mfu/ui/server-locale.ts';
export async function generateMetadata(){return localizedMetadata(false);}
export default async function Layout({children}:{children:React.ReactNode}){const settings=await preferences();return <html lang={settings.locale} data-theme={settings.theme} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:BOOTSTRAP}}/></head><body><Shell admin={false} {...settings}>{children}</Shell></body></html>;}
