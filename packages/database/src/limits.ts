export async function readLimited(request:Request,maxBytes:number):Promise<Uint8Array>{
 if(Number(request.headers.get('content-length')??0)>maxBytes)throw new Error('Request too large');
 const chunks:Uint8Array[]=[];let length=0;const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new Error('Request too large');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
