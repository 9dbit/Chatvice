import { createConnection } from "node:net";
import { MAX_MAIL_ATTACHMENT_BYTES } from "./object-store";

export type AttachmentScanStatus = "pending" | "clean" | "blocked";
/**
 * ClamAV clamd INSTREAM protocol. Fail closed: unavailable scanner or
 * unrecognized response keeps the attachment in quarantine.
 * Never promote unknown bytes to "clean".
 */
export async function scanMailAttachment(content: Buffer): Promise<AttachmentScanStatus> {
  if(!Buffer.isBuffer(content) || !content.length || content.length>MAX_MAIL_ATTACHMENT_BYTES)
    return "blocked";
  const host=process.env.CHATVICE_MAIL_CLAMAV_HOST || "";
  const port=Number(process.env.CHATVICE_MAIL_CLAMAV_PORT || "3310");
  if(!host || !Number.isSafeInteger(port) || port<1 || port>65535) return "pending";
  return new Promise(resolve=>{
    const socket=createConnection({host,port});
    let finished=false,answer="";
    const finish=(status:AttachmentScanStatus)=>{
      if(finished)return;
      finished=true;socket.destroy();resolve(status);
    };
    socket.setTimeout(12000,()=>finish("pending"));
    socket.on("error",()=>finish("pending"));
    socket.on("close",()=>{if(!finished)finish("pending")});
    socket.on("data",chunk=>{
      answer+=chunk.toString("utf8");
      if(answer.length>2048){finish("pending");return;}
      if(answer.includes("\0") || answer.includes("\n")){
        if(/^stream: OK[\0\n]/.test(answer))finish("clean");
        else if(/^stream: .{1,1024} FOUND[\0\n]/.test(answer))finish("blocked");
        else finish("pending");
      }
    });
    socket.on("connect",()=>{
      socket.write(Buffer.from("zINSTREAM\0"));
      const step=256*1024;
      for(let start=0;start<content.length;start+=step){
        const slice=content.subarray(start,Math.min(content.length,start+step));
        const prefix=Buffer.allocUnsafe(4);prefix.writeUInt32BE(slice.length);
        socket.write(prefix);socket.write(slice);
      }
      socket.write(Buffer.alloc(4)); // zero-length chunk ends stream
    });
  });
}
