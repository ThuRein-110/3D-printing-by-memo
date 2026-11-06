import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {inspirationImages} from '../packages/types/src/inspiration';
const sharp=createRequire(new URL('../packages/database/package.json',import.meta.url))('sharp') as typeof import('../packages/database/node_modules/sharp').default;
it('ships actual licensed, optimized images in both independent deployments with exact source evidence',async()=>{
 expect(inspirationImages).toHaveLength(6);
 for(const image of inspirationImages){
  const bytes=readFileSync('users/public'+image.image);expect(createHash('sha256').update(bytes).digest('hex')).toBe(image.sha256);expect(readFileSync('admin/public'+image.image)).toEqual(bytes);
  const meta=await sharp(bytes).metadata();expect(meta.format).toBe('webp');expect(meta.width).toBe(image.width);expect(meta.height).toBe(image.height);expect(bytes.length).toBeLessThan(160000);expect(meta.exif).toBeUndefined();
  const evidence=JSON.parse(readFileSync(`docs/image-licenses/${image.id}.json`,'utf8'));expect(evidence.sha1).toBe(image.sourceSha1);expect(evidence.extmetadata.LicenseShortName.value).toBe(image.license);expect(evidence.extmetadata.Artist.value).toContain(image.creator.split(' from ')[0]);expect(new URL(image.downloadUrl).hostname).toBe('upload.wikimedia.org');expect(image.license).not.toMatch(/NC|ND/);expect(image.attribution).toContain(image.creator);expect(image.changes).toContain('WebP');
 }
});
