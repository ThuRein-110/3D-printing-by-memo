import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('ships the exact uploaded logo in both independent deployments',()=>{
 const supplied=readFileSync('logo.jpg');expect(supplied.subarray(0,3)).toEqual(Buffer.from([255,216,255]));
 for(const app of ['users','admin'])expect(readFileSync(`${app}/public/brand/memo-logo.jpg`)).toEqual(supplied);
});
