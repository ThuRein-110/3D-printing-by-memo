import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
type PdfData={id:string;service:string;status:string;total:number|null;notes:string;kind:string};
export async function quotationPdf(data:PdfData){return renderQuotation(data,await readFile(path.join(process.cwd(),'public/fonts/NotoSansThai.ttf')));}
export async function renderQuotation(data:PdfData,fontBytes:Uint8Array) {
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:true});
 let page=pdf.addPage([595,842]),y=780;
 const line=(text:string,size=12)=>{if(y<60){page=pdf.addPage([595,842]);y=780;}page.drawText(text,{x:50,y,size,font,color:rgb(.09,.24,.19)});y-=size+16;};
 const wrap=(text:string,size=11)=>{let current='';for(const char of text){if(char==='\n'){line(current,size);current='';continue;}if((char.codePointAt(0)??0)<32)continue;if(font.widthOfTextAtSize(current+char,size)>490){line(current,size);current='';}current+=char;}if(current)line(current,size);};
 line('3D Printing MFU By Memo',22);line(data.kind==='receipt'?'ใบเสร็จรับเงิน / RECEIPT':data.kind==='invoice'?'ใบแจ้งหนี้ / INVOICE':'ใบเสนอราคา / QUOTATION',17);
 wrap('เลขอ้างอิง / Reference: '+data.id);line('บริการ / Service: '+data.service);line('สถานะ / Status: '+data.status);
 line(data.total===null?'ราคาประเมิน ยังไม่ใช่ใบเสนอราคาสุดท้าย / ESTIMATE':`ยอดรวม / Total: THB ${data.total.toFixed(2)}`,15);
 wrap(data.kind==='receipt'?'ตรวจสอบหลักฐานโอนโดยผู้ดูแลแล้ว / Transfer manually verified.':'เอกสารนี้ไม่ยืนยันการชำระเงิน / This document does not confirm payment.');
 wrap('ราคาประเมินต้องตรวจสอบโดยผู้ดูแล / Estimates require admin validation.');
 wrap('เงื่อนไข มัดจำ และระยะเวลาผลิต: กรุณายืนยันกับร้าน / Confirm terms, deposit and timing with the shop.');
 line('หมายเหตุ / Notes',12);wrap(data.notes);
 pdf.setTitle(`Memo ${data.kind} ${data.id}`);return pdf.save();
}
