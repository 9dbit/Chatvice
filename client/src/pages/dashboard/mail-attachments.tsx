import {useEffect, useRef, useState} from "react";
import {Paperclip, FileDown, FileText, RefreshCcw, ShieldAlert, ShieldCheck, Upload, ChevronRight} from "lucide-react";
import {apiRequest} from "@/lib/queryClient";
import {MAX_MAIL_ATTACHMENT_BYTES} from "@shared/mail-policy";
import {Dialog, DialogContent, DialogTitle, DialogDescription} from "@/components/mail-dialog";

type Attachment = {id:string;original_filename:string;media_type:string;size_bytes:string|number;scan_status:"pending"|"clean"|"blocked"};
type Props = {messageId:string;allowUpload?:boolean;compact?:boolean};
export default function MailAttachments({messageId,allowUpload=false,compact=false}:Props){
 const [files,setFiles]=useState<Attachment[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[open,setOpen]=useState(false);
 const current=useRef(messageId);current.current=messageId;
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false};},[]);
 useEffect(()=>{let active=true;setFiles([]);setError("");setOpen(false);setBusy(false);
  apiRequest("GET",`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`).then(r=>r.json())
   .then(data=>{if(active)setFiles(data)}).catch(()=>{if(active)setError("Attachment list unavailable")});
  return()=>{active=false};
 },[messageId]);
 const perform=async(fn:()=>Promise<void>)=>{
  const target=messageId;setBusy(true);setError("");
  try{
   await fn();const r=await apiRequest("GET",`/api/mail/messages/${encodeURIComponent(target)}/attachments`);const data=await r.json();
   if(mounted.current&&current.current===target)setFiles(data);
  }catch(e:any){if(mounted.current&&current.current===target)setError(e.message||"Attachment operation failed")}
  finally{if(mounted.current&&current.current===target)setBusy(false)}
 };
 async function upload(file:File){
  if(file.size>MAX_MAIL_ATTACHMENT_BYTES){setError("File limit: 16 MiB");return;}
  await perform(async()=>{
   const data=new FormData();data.set("file",file,file.name);
   const response=await fetch(`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`,{method:"POST",credentials:"same-origin",body:data,cache:"no-store"});
   if(!response.ok)throw new Error(response.status===413?"Attachment too large":"Upload rejected");
  });
 }
 const list=<div className="mail-attachment-list">
  {files.map(a=><div key={a.id} className="mail-file">
   <span className="mail-file-symbol"><FileText size={23}/></span><div>
    <p title={a.original_filename}>{a.original_filename}</p>
    <small>{Math.ceil(Number(a.size_bytes)/1024)} KB · {a.scan_status==="clean"?"Security checked":a.scan_status==="blocked"?"Blocked":"Scan pending"}</small>
   </div>
   {a.scan_status==="clean"?<a href={`/api/mail/attachments/${encodeURIComponent(a.id)}/download`} title="Download privately" aria-label={`Download ${a.original_filename}`} className="mail-icon-btn"><FileDown size={18}/></a>:
    a.scan_status==="blocked"?<ShieldAlert aria-label="File blocked" className="mail-file-blocked" size={18}/>:
    <button disabled={busy} title="Retry security scan" aria-label={`Retry scan for ${a.original_filename}`} onClick={()=>perform(async()=>{await apiRequest("POST",`/api/mail/attachments/${encodeURIComponent(a.id)}/rescan`,{})})} className="mail-icon-btn"><RefreshCcw size={18}/></button>}
  </div>)}
  {error&&<p role="alert" className="mail-alert">{error}</p>}
  {files.some(x=>x.scan_status==="pending")&&<p className="mail-file-help"><ShieldCheck size={14}/> Pending files cannot be downloaded or sent until verified.</p>}
 </div>;
 if(compact)return <section className="mail-attachment-compact">
  {files.length>0&&<button className="mail-attachment-summary" onClick={()=>setOpen(true)}><span className="mail-file-symbol"><Paperclip size={21}/></span><span><strong>{files.length} {files.length===1?"attachment":"attachments"}</strong><small>View files & security status</small></span><ChevronRight size={18}/></button>}
  {error&&!open&&<p role="alert" className="mail-alert">{error}</p>}
  <Dialog open={open} onOpenChange={setOpen}><DialogContent variant="drawer" className="mail-attachment-drawer">
   <span className="mail-dialog-symbol"><Paperclip size={24}/></span><DialogTitle>Conversation files</DialogTitle>
   <DialogDescription>{files.length} {files.length===1?"attachment":"attachments"} · Private to this mailbox</DialogDescription>
   {list}<p className="mail-drawer-note"><ShieldCheck size={17}/> Downloads are available after a file passes its security check.</p>
  </DialogContent></Dialog>
 </section>;
 return <section className="mail-attachment-list">
  {(files.length>0||allowUpload)&&<div className="mail-attachment-heading"><div><Paperclip size={15}/>{files.length} attachments</div>
   {allowUpload&&<label className="mail-button"><Upload size={14}/> Add file<input type="file" aria-label="Upload attachment" disabled={busy} className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.currentTarget.value="";}}/></label>}
  </div>}{list}
 </section>;
}
