import { MAX_MAIL_ATTACHMENT_BYTES, MAX_MAIL_ATTACHMENTS } from "./object-store";

export type ResendReceivedAttachment = {
  providerId:string;filename:string;mediaType:string;bytes:Buffer;
};
const MAX_EMAIL_TOTAL=16*1024*1024;
function validProviderId(id:unknown):id is string {
  return typeof id==="string" && /^[a-z\d-]{8,128}$/i.test(id);
}
export function cleanMailFilename(value:unknown):string {
  const original=typeof value==="string"?value:"attachment";
  return (original.replace(/[\\/\x00-\x1f\x7f]/g,"_").trim().slice(0,180) || "attachment");
}
async function boundedDownload(response:Response):Promise<Buffer>{
  if(response.status!==200 || !response.body)throw new Error("Provider attachment download unavailable");
  const length=Number(response.headers.get("content-length")||0);
  if(length>MAX_MAIL_ATTACHMENT_BYTES)throw new Error("Provider attachment exceeds size limit");
  const reader=response.body.getReader();
  const chunks:Buffer[]=[];let total=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_MAIL_ATTACHMENT_BYTES)throw new Error("Provider attachment exceeds size limit");
      chunks.push(Buffer.from(value));
    }
  }catch(err){await reader.cancel().catch(()=>{});throw err;}
  if(!total)throw new Error("Empty provider attachment rejected");
  return Buffer.concat(chunks,total);
}
function approvedUrl(raw:string):string {
  let url:URL;
  try{url=new URL(raw);}catch{throw new Error("Invalid attachment download URL");}
  const allowed=(process.env.CHATVICE_MAIL_ATTACHMENT_DOWNLOAD_HOSTS||"")
    .split(",").map(h=>h.trim().toLowerCase()).filter(Boolean);
  // Resend may serve expiring download URLs from a distinct CDN. Only explicitly
  // configured exact hosts can be fetched. No redirects, IPs, userinfo, or ports.
  if(url.protocol!=="https:" || url.port || url.username || url.password || url.hash ||
     !allowed.includes(url.hostname.toLowerCase()) ||
     !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) {
    throw new Error("Provider attachment host is not allowlisted");
  }
  return url.toString();
}
export async function loadResendReceivedAttachments(emailId:string,key:string):Promise<ResendReceivedAttachment[]> {
  if(!validProviderId(emailId) || !key || key.length<12)throw new Error("Provider attachment API not configured");
  let result:Response;
  try{
    result=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`,{
      headers:{Authorization:`Bearer ${key}`,Accept:"application/json"},
      redirect:"error",signal:AbortSignal.timeout(15000)
    });
  }catch{throw new Error("Provider attachment inventory unavailable");}
  if(!result.ok)throw new Error("Provider attachment inventory unavailable");
  const data=await result.json() as {data?:unknown;has_more?:unknown};
  if(!Array.isArray(data.data))throw new Error("Unexpected provider attachment inventory");
  if(data.has_more===true)throw new Error("Provider attachment inventory is incomplete");
  if(data.data.length>MAX_MAIL_ATTACHMENTS)throw new Error("Too many inbound attachments");
  const out:ResendReceivedAttachment[]=[];let total=0;
  for(const item of data.data){
    if(!item || typeof item!=="object")throw new Error("Invalid provider attachment");
    const a=item as Record<string,unknown>;
    if(!validProviderId(a.id) || typeof a.download_url!=="string")throw new Error("Incomplete provider attachment");
    const url=approvedUrl(a.download_url);
    let file:Response;
    try{file=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(20000)});}
    catch{throw new Error("Provider attachment download unavailable");}
    const bytes=await boundedDownload(file);
    total+=bytes.length;
    if(total>MAX_EMAIL_TOTAL)throw new Error("Inbound attachment message exceeds size limit");
    out.push({
      providerId:a.id,filename:cleanMailFilename(a.filename),
      mediaType:typeof a.content_type==="string" ? a.content_type.slice(0,100) : "application/octet-stream",
      bytes
    });
  }
  return out;
}
