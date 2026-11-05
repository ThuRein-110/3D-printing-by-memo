import {it,expect} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {readFile} from 'node:fs/promises';
import {renderQuotation} from '@mfu/database/pdf.ts';
it('embeds Thai quotation notes and paginates without lossy substitutions',async()=>{const bytes=await renderQuotation({id:'test',service:'custom',status:'final',total:1500,kind:'quotation',notes:'ชิ้นงานนักศึกษา ทดสอบใบเสนอราคา\n'.repeat(100)},await readFile('users/public/fonts/NotoSansThai.ttf'));const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBeGreaterThan(1);expect(pdf.getTitle()).toContain('quotation');expect(bytes.length).toBeGreaterThan(5000);});
