import {it,expect} from 'vitest';
import {parseMesh,approximateUsage} from '@mfu/three';
import {validateHeader} from '@mfu/validation';
const enc=(s:string)=>new TextEncoder().encode(s);
export const tetra=enc('v 0 0 0\nv 10 0 0\nv 0 10 0\nv 0 0 10\nf 1 3 2\nf 1 2 4\nf 2 3 4\nf 3 1 4\n');
it('calculates watertight mesh volume, not bounding box volume',()=>{const m=parseMesh(tetra,'obj');expect(m.closed).toBe(true);expect(m.volumeMm3).toBeCloseTo(1000/6);expect(m.volumeMm3).toBeLessThan(1000);expect(approximateUsage(m,1).grams).toBeGreaterThan(0);});
it('rejects external resources, malformed indexes, nonfinite positions and open volume estimates',()=>{expect(()=>parseMesh(enc('mtllib https://evil/file'),'obj')).toThrow();expect(()=>parseMesh(enc('v 0 0 0\nf 1 2 3'),'obj')).toThrow();expect(()=>parseMesh(enc('v NaN 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3'),'obj')).toThrow();const m=parseMesh(enc('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3'),'obj');expect(()=>approximateUsage(m,1)).toThrow();});
it('rejects unsupported formats, spoofed magic bytes and oversized files',()=>{expect(()=>validateHeader('x.svg',enc('<svg/>'))).toThrow();expect(()=>validateHeader('x.3mf',enc('PK'))).toThrow();expect(()=>validateHeader('x.jpg',enc('not jpeg'))).toThrow();expect(()=>validateHeader('x.stl',new Uint8Array(4194305))).toThrow();});
