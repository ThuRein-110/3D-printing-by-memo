export function binaryStl(positions:readonly number[],scale={x:1,y:1,z:1}):Uint8Array{
 if(!positions.length||positions.length%9||positions.length>900000||!Object.values(scale).every(n=>Number.isFinite(n)&&n>0&&n<=1e6))throw new Error('Invalid STL export');
 const bytes=new Uint8Array(84+positions.length/9*50),view=new DataView(bytes.buffer);view.setUint32(80,positions.length/9,true);
 for(let i=0;i<positions.length;i+=9)for(let j=0;j<9;j++){const value=positions[i+j]*[scale.x,scale.y,scale.z][j%3];if(!Number.isFinite(value))throw new Error('Invalid STL position');view.setFloat32(84+i/9*50+12+j*4,value,true);}return bytes;
}
