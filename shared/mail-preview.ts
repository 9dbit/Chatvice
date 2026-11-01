/** Ignore claimed MIME types. Only inert raster/media signatures are embedded. */
export function mailPreviewType(bytes:Uint8Array,filename:string):string|null {
 const starts=(signature:number[])=>signature.every((v,i)=>bytes[i]===v);
 const ascii=(start:number,end:number)=>String.fromCharCode(...Array.from(bytes.slice(start,end)));
 if(starts([137,80,78,71,13,10,26,10]))return "image/png";
 if(starts([255,216,255]))return "image/jpeg";
 if(ascii(0,6)==="GIF87a"||ascii(0,6)==="GIF89a")return "image/gif";
 if(ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP")return "image/webp";
 if(ascii(4,8)==="ftyp"&&["isom","iso2","mp41","mp42","avc1","M4V "].includes(ascii(8,12)))return "video/mp4";
 if(starts([0x1a,0x45,0xdf,0xa3])&&ascii(0,256).includes("webm"))return "video/webm";
 if(ascii(0,5)==="%PDF-")return "application/pdf";
 if(/\.(txt|csv|md|log|json)$/i.test(filename)&&!bytes.slice(0,4096).includes(0))return "text/plain";
 return null;
}
