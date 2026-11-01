import { useEffect, useState } from "react";
import { Paperclip, FileDown, RefreshCcw, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MAX_MAIL_ATTACHMENT_BYTES } from "@shared/mail-policy";

type Attachment = {
  id:string;original_filename:string;media_type:string;
  size_bytes:string|number;scan_status:"pending"|"clean"|"blocked";
};
type Props = {messageId:string;allowUpload?:boolean;compact?:boolean};
export default function MailAttachments({messageId,allowUpload=false,compact=false}:Props){
 const [files,setFiles]=useState<Attachment[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const refresh=async()=>{
  const r=await apiRequest("GET",`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`);
  setFiles(await r.json());
 };
 useEffect(()=>{let active=true;
  apiRequest("GET",`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`)
   .then(r=>r.json()).then(data=>{if(active)setFiles(data)})
   .catch(()=>{if(active)setError("Attachment list unavailable")});
  return()=>{active=false};
 },[messageId]);
 const perform=async(fn:()=>Promise<void>)=>{
  setBusy(true);setError("");
  try{await fn();await refresh()}catch(e:any){setError(e.message||"Attachment operation failed")}
  finally{setBusy(false)}
 };
 async function upload(file:File){
  if(file.size>MAX_MAIL_ATTACHMENT_BYTES){setError("File limit: 16 MiB");return;}
  await perform(async()=>{
    const data=new FormData();data.set("file",file,file.name);
    const response=await fetch(`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`,{
      method:"POST",credentials:"same-origin",body:data,cache:"no-store"
    });
    if(!response.ok)throw new Error(response.status===413?"Attachment too large":"Upload rejected");
  });
 }
 return <section className={`mail-attachment-list ${compact?"mail-attachment-compact":""}`}>
  {(files.length>0||allowUpload)&&<div className="mail-attachment-heading">
   <div ><Paperclip size={15}/>{files.length} attachments</div>
   {allowUpload&&<label className="mail-button">
    <Upload size={14}/> Add file
    <input type="file" disabled={busy} className="sr-only" onChange={e=>{
      const file=e.target.files?.[0];if(file)void upload(file);e.currentTarget.value="";
    }}/>
   </label>}
  </div>}
  {files.map(a=><div key={a.id} className="mail-file">
   <div >
    <p  title={a.original_filename}>{a.original_filename}</p>
    <small>{Math.ceil(Number(a.size_bytes)/1024)} KB · {a.scan_status==="clean"?"Security checked":a.scan_status==="blocked"?"Blocked":"Scan pending"}</small>
   </div>
   {a.scan_status==="clean"?<a href={`/api/mail/attachments/${a.id}/download`} title="Download privately" className="mail-icon-btn"><FileDown size={18}/></a>:
    a.scan_status==="blocked"?<ShieldAlert className="mail-file-blocked" size={18}/>:
    <button disabled={busy} title="Retry security scan" onClick={()=>perform(async()=>{await apiRequest("POST",`/api/mail/attachments/${a.id}/rescan`,{})})} className="mail-icon-btn"><RefreshCcw size={18}/></button>}
  </div>)}
  {error&&<p role="alert" className="mail-alert">{error}</p>}
  {files.some(x=>x.scan_status==="pending")&&<p className="mail-file-help"><ShieldCheck size={13}/> Pending files cannot be downloaded or sent until verified.</p>}
 </section>;
}

