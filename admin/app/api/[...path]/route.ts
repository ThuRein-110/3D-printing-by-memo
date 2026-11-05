import { handle } from '@mfu/database/http.ts';
export const runtime='nodejs';
export const maxDuration=60;
async function handler(req:Request,ctx:{params:Promise<{path:string[]}>}){return handle(req,(await ctx.params).path,true);}
export {handler as GET,handler as POST};
