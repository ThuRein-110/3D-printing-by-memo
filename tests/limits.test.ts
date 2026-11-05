import {it,expect} from 'vitest';
import {readLimited} from '@mfu/database/limits.ts';
it('bounds streaming bodies without trusting content-length',async()=>{const r=new Request('http://localhost',{method:'POST',body:'x'.repeat(1000)});await expect(readLimited(r,100)).rejects.toThrow('too large');});
it('reads permitted request bytes intact',async()=>{const bytes=await readLimited(new Request('http://localhost',{method:'POST',body:'hello'}),10);expect(new TextDecoder().decode(bytes)).toBe('hello');});
