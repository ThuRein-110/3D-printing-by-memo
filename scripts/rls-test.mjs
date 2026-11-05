import {spawnSync} from 'node:child_process';
const r=spawnSync('pnpm',['exec','vitest','run','tests/database.test.ts'],{stdio:'inherit',shell:process.platform==='win32'});process.exit(r.status??1);
