import { useEffect, useState } from "react";
import { Paperclip, FileDown, RefreshCcw, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  if(file.size>8*1024*1024){setError("File limit: 8 MB");return;}
  await perform(async()=>{
    const data=new FormData();data.set("file",file,file.name);
    const response=await fetch(`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`,{
      method:"POST",credentials:"same-origin",body:data,cache:"no-store"
    });
    if(!response.ok)throw new Error(response.status===413?"Attachment too large":"Upload rejected");
  });
 }
 return <section className={`space-y-2 ${compact?"text-xs":"text-sm"}`}>
  {(files.length>0||allowUpload)&&<div className="flex flex-wrap items-center justify-between gap-2">
   <div className="flex items-center gap-2 text-white/50"><Paperclip size={15}/>{files.length} attachments</div>
   {allowUpload&&<label className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs cursor-pointer hover:bg-white/15">
    <Upload size={14}/> Add file
    <input type="file" disabled={busy} className="sr-only" onChange={e=>{
      const file=e.target.files?.[0];if(file)void upload(file);e.currentTarget.value="";
    }}/>
   </label>}
  </div>}
  {files.map(a=><div key={a.id} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
   <div className="flex-1 min-w-0">
    <p className="truncate text-white/85" title={a.original_filename}>{a.original_filename}</p>
    <p className="mt-1 text-xs text-white/40">{Math.ceil(Number(a.size_bytes)/1024)} KB · {a.scan_status==="clean"?"Security checked":a.scan_status==="blocked"?"Blocked":"Scan pending"}</p>
   </div>
   {a.scan_status==="clean"?<a href={`/api/mail/attachments/${a.id}/download`} title="Download privately" className="text-green-400 p-2"><FileDown size={18}/></a>:
    a.scan_status==="blocked"?<ShieldAlert className="text-red-400 shrink-0" size={18}/>:
    <button disabled={busy} title="Retry security scan" onClick={()=>perform(async()=>{await apiRequest("POST",`/api/mail/attachments/${a.id}/rescan`,{})})} className="text-amber-400 p-2"><RefreshCcw size={18}/></button>}
  </div>)}
  {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
  {files.some(x=>x.scan_status==="pending")&&<p className="text-xs text-white/40 flex items-center gap-2"><ShieldCheck size={13}/> Pending files cannot be downloaded or sent until verified.</p>}
 </section>;
}
