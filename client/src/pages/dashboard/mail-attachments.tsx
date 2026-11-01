import {lazy,Suspense,useEffect,useRef,useState} from "react";
import {Paperclip,FileDown,FileText,RefreshCcw,ShieldAlert,Upload,ChevronRight,Image as ImageIcon,Film,Trash2,Maximize2,X,Check} from "lucide-react";
import {apiRequest} from "@/lib/queryClient";
import {MAX_MAIL_ATTACHMENT_BYTES,MAX_MAIL_NATIVE_ATTACHMENT_BYTES,MAIL_SHARE_LINK_DAYS,MAIL_ATTACHMENT_LIMIT_LABEL,mailAttachmentSizeError} from "@shared/mail-policy";
import {mailPreviewType} from "@shared/mail-preview";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/mail-dialog";
const PdfPreview=lazy(()=>import("./mail-pdf-preview"));
type Attachment={id:string;original_filename:string;media_type:string;size_bytes:string|number;scan_status:"pending"|"clean"|"blocked"};
type Preview={url:string;type:string;bytes:Uint8Array;text?:string};
type Props={messageId?:string;allowUpload?:boolean;compact?:boolean;ensureDraft?:()=>Promise<string>;onBusyChange?:(busy:boolean)=>void;onSendReady?:(ready:boolean)=>void;onChanged?:()=>void};
const fileSize=(n:number)=>n<1000000?`${Math.ceil(n/1000)} KB`:`${(n/1000000).toFixed(1)} MB`;

type UploadPhase="queued"|"uploading"|"checking"|"complete"|"cancelled"|"failed";
type UploadItem={id:string;filename:string;size:number;percent:number;phase:UploadPhase;error?:string};
/** Each uploaded file has its own XHR and real byte progress, and can be aborted independently. */
function postAttachmentWithProgress(
  url:string,file:File,onProgress:(fraction:number,phase:"uploading"|"checking")=>void,
  setActive:(request:XMLHttpRequest|null)=>void
):Promise<{id?:string}>{
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    const payload=new FormData();payload.set("file",file,file.name);
    xhr.open("POST",url,true);
    xhr.withCredentials=true;
    xhr.upload.addEventListener("progress",event=>{
      if(event.lengthComputable&&event.total>0)
        onProgress(Math.min(1,event.loaded/event.total),"uploading");
    });
    xhr.upload.addEventListener("load",()=>onProgress(1,"checking"));
    xhr.addEventListener("load",()=>{
      setActive(null);
      let response:any=null;
      try{response=JSON.parse(xhr.responseText);}catch{}
      if(xhr.status>=200&&xhr.status<300){resolve({id:response?.id});return;}
      reject(new Error(typeof response?.error==="string"?response.error.slice(0,240):`Could not upload ${file.name}`));
    });
    xhr.addEventListener("error",()=>{setActive(null);reject(new Error(`Network error uploading ${file.name}`));});
    xhr.addEventListener("abort",()=>{setActive(null);reject(new Error("Attachment upload cancelled."));});
    setActive(xhr);
    xhr.send(payload);
  });
}

export default function MailAttachments({messageId,allowUpload=false,compact=false,ensureDraft,onBusyChange,onSendReady,onChanged}:Props){
 const [files,setFiles]=useState<Attachment[]>([]),[selected,setSelected]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[drag,setDrag]=useState(false),[loaded,setLoaded]=useState(!messageId);
 const [previews,setPreviews]=useState<Record<string,Preview|null>>({});
 const [uploadItems,setUploadItems]=useState<UploadItem[]>([]);
 const cancelledUploads=useRef(new Set<string>());
 const activeUpload=useRef<{id:string;xhr:XMLHttpRequest}|null>(null);
 const current=useRef(messageId);current.current=messageId;
 const mounted=useRef(true),locked=useRef(false),input=useRef<HTMLInputElement>(null);
 const lifecycle=useRef({abort:new AbortController(),urls:[] as string[],pending:new Set<string>()});
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;activeUpload.current?.xhr.abort();onBusyChange?.(false);};},[]);
 useEffect(()=>{
  const life={abort:new AbortController(),urls:[] as string[],pending:new Set<string>()};lifecycle.current=life;
  setFiles([]);setSelected("");setPreviews({});setError("");setOpen(false);setLoaded(!messageId);
  if(messageId)apiRequest("GET",`/api/mail/messages/${encodeURIComponent(messageId)}/attachments`).then(r=>r.json()).then(data=>{
   if(!life.abort.signal.aborted){setFiles(data);setSelected(data[0]?.id||"");setLoaded(true);}
  }).catch(()=>{if(!life.abort.signal.aborted)setError("Attachment list unavailable. Retry before sending.");});
  return()=>{life.abort.abort();life.urls.forEach(URL.revokeObjectURL);};
 },[messageId]);
 const totalBytes=files.reduce((n,f)=>n+Number(f.size_bytes),0);
 const sizeIssue=mailAttachmentSizeError(totalBytes,files.length);
 useEffect(()=>{onSendReady?.(loaded&&!busy&&!sizeIssue&&files.every(f=>f.scan_status==="clean"));},[loaded,busy,files,sizeIssue,onSendReady]);
 const active=files.find(f=>f.id===selected);
 const previewableIds=useRef(new Set<string>());
 previewableIds.current=new Set(files.filter(f=>f.scan_status==="clean").map(f=>f.id));
 useEffect(()=>{
  setPreviews(previous=>{
   const next={...previous};let changed=false;
   for(const id of Object.keys(next))if(!previewableIds.current.has(id)){
    if(next[id])URL.revokeObjectURL(next[id]!.url);
    delete next[id];lifecycle.current.pending.delete(id);changed=true;
   }
   return changed?next:previous;
  });
 },[files]);
 async function preview(a:Attachment){
  const life=lifecycle.current;
  if(a.scan_status!=="clean"||life.pending.has(a.id))return;
  life.pending.add(a.id);
  try{
   const r=await fetch(`/api/mail/attachments/${encodeURIComponent(a.id)}/download`,{credentials:"same-origin",cache:"no-store",signal:life.abort.signal});
   if(!r.ok)throw Error("Preview unavailable");
   const bytes=new Uint8Array(await r.arrayBuffer());
   if(life.abort.signal.aborted||!previewableIds.current.has(a.id))return;
   if(bytes.length>MAX_MAIL_ATTACHMENT_BYTES)throw Error("File exceeds preview limit");
   const type=mailPreviewType(bytes,a.original_filename);
   const result=type?{url:URL.createObjectURL(new Blob([bytes],{type})),type,bytes,text:type==="text/plain"?new TextDecoder().decode(bytes.slice(0,200000)):undefined}:null;
   if(result)life.urls.push(result.url);
   setPreviews(p=>({...p,[a.id]:result}));
  }catch{if(!life.abort.signal.aborted&&previewableIds.current.has(a.id))setPreviews(p=>({...p,[a.id]:null}));}
 }
 useEffect(()=>{
  files.filter(f=>/\.(png|jpe?g|gif|webp|mp4|webm)$/i.test(f.original_filename)).forEach(f=>void preview(f));
  if(active)void preview(active);
 },[files,selected]);
 async function refresh(id:string){
  const data=await (await apiRequest("GET",`/api/mail/messages/${encodeURIComponent(id)}/attachments`)).json();
  if(mounted.current&&current.current===id){setFiles(data);setLoaded(true);setSelected(previous=>data.some((f:Attachment)=>f.id===previous)?previous:data[0]?.id||"");}
  return data as Attachment[];
 }
 async function perform(fn:()=>Promise<void>){
  if(locked.current)return;locked.current=true;setBusy(true);onBusyChange?.(true);setError("");
  try{await fn();onChanged?.();}catch(e:any){if(mounted.current)setError(e.message||"Attachment operation failed");}
  finally{locked.current=false;if(mounted.current)setBusy(false);onBusyChange?.(false);}
 }
 function cancelUpload(itemId:string){
  // A queued file is never submitted; an active file aborts only its own XHR.
  const item=uploadItems.find(candidate=>candidate.id===itemId);
  if(!item||!["queued","uploading","checking"].includes(item.phase))return;
  cancelledUploads.current.add(itemId);
  setUploadItems(previous=>previous.map(entry=>entry.id===itemId
    ?{...entry,phase:"cancelled",percent:0}:entry));
  if(activeUpload.current?.id===itemId)activeUpload.current.xhr.abort();
 }
 async function upload(chosen:File[]){
  if(!allowUpload||!chosen.length||locked.current)return;
  if(chosen.some(f=>f.size===0)){setError("Empty files cannot be attached. Choose a file with content.");return;}
  const issue=mailAttachmentSizeError(totalBytes+chosen.reduce((n,f)=>n+f.size,0),files.length+chosen.length);
  if(issue){setError(issue);return;}
  const pending:UploadItem[]=chosen.map(file=>({
    id:crypto.randomUUID(),filename:file.name,size:file.size,percent:0,phase:"queued"
  }));
  cancelledUploads.current.clear();
  setUploadItems(pending);
  await perform(async()=>{
   let savedId=messageId;
   try{
    const id=messageId||await ensureDraft?.();
    if(!id)throw Error("Save the draft before adding files.");
    savedId=id;current.current=id;
    for(let i=0;i<chosen.length;i++){
      const item=pending[i],file=chosen[i];
      if(cancelledUploads.current.has(item.id))continue;
      const update=(fraction:number,phase:"uploading"|"checking")=>{
        if(!mounted.current||cancelledUploads.current.has(item.id))return;
        // A server can still scan/encrypt after 100% of request bytes transfer.
        // Therefore 100% only means the server has acknowledged the upload.
        setUploadItems(previous=>previous.map(entry=>entry.id===item.id
          ?{...entry,phase,percent:Math.min(99,Math.floor(fraction*100))}:entry));
      };
      update(0,"uploading");
      try{
        const result=await postAttachmentWithProgress(
          `/api/mail/messages/${encodeURIComponent(id)}/attachments`,
          file,update,xhr=>{activeUpload.current=xhr?{id:item.id,xhr}:null}
        );
        if(cancelledUploads.current.has(item.id)){
          // If cancellation raced with a successful server acknowledgement,
          // remove only the exact attachment ID returned by that upload.
          if(result.id)await apiRequest("DELETE",`/api/mail/attachments/${encodeURIComponent(result.id)}`).catch(()=>{});
        }else if(mounted.current){
          setUploadItems(previous=>previous.map(entry=>entry.id===item.id
            ?{...entry,phase:"complete",percent:100}:entry));
        }
      }catch(error:any){
        if(cancelledUploads.current.has(item.id))continue;
        if(mounted.current)setUploadItems(previous=>previous.map(entry=>entry.id===item.id
          ?{...entry,phase:"failed",error:error?.message||"Upload failed. Please add the file again."}:entry));
      }finally{activeUpload.current=null;}
    }
    const updated=await refresh(id);
    if(mounted.current)setSelected(updated.at(-1)?.id||"");
   }catch(error){
    if(savedId)await refresh(savedId).catch(()=>undefined);
    if(mounted.current)setUploadItems(previous=>previous.map(entry=>
      entry.phase==="queued"||entry.phase==="uploading"||entry.phase==="checking"
        ?{...entry,phase:"failed",error:"Could not save the draft for uploads."}:entry));
    throw error;
   }
  });
 }
 const detail=<div className="mail-file-preview" aria-label="Attachment preview">
  <header><span>FILE PREVIEW_</span>{active&&<button className="mail-icon-btn" aria-label="Expand attachment preview" onClick={()=>setExpanded(true)}><Maximize2 size={16}/></button>}</header>
  {!active?<div className="mail-preview-empty"><ImageIcon size={38}/><strong>Your files, in focus.</strong><p>Add photos, videos or documents.<br/>Select a thumbnail to preview it here.</p></div>:<>
   <div className="mail-preview-content">{active.scan_status!=="clean"?<div className="mail-preview-empty"><ShieldAlert size={32}/><p>{active.scan_status==="blocked"?"This file was blocked. Remove it to send your message.":"Security scan pending. Preview and sending are locked until this file is checked."}</p></div>:previews[active.id]===undefined?<p role="status">Loading preview…</p>:previews[active.id]===null?<div className="mail-preview-empty"><FileText size={42}/><strong>{active.original_filename}</strong><p>Preview is not available for this format. Download to open it in your preferred app.</p></div>:<PreviewContent preview={previews[active.id]!} name={active.original_filename}/>}</div>
   <footer><strong>{active.original_filename}</strong><span>{fileSize(Number(active.size_bytes))} · {active.scan_status==="clean"?"Security checked":active.scan_status}</span>{active.scan_status==="clean"&&<a className="mail-button" href={`/api/mail/attachments/${encodeURIComponent(active.id)}/download`}><FileDown size={15}/> Download</a>}</footer>
  </>}
 </div>;
 const list=<><div className="mail-attachment-heading"><div><Paperclip size={15}/>{files.length} {files.length===1?"file":"files"}</div>{allowUpload&&<button className="mail-button" disabled={busy||!loaded} onClick={()=>input.current?.click()}><Upload size={14}/> Add files</button>}</div>
  {allowUpload&&<><input ref={input} type="file" multiple aria-label="Upload attachments" className="sr-only" disabled={busy||!loaded} onChange={e=>{void upload(Array.from(e.target.files||[]));e.currentTarget.value="";}}/><p className="mail-file-help">Photos, videos & documents · {MAIL_ATTACHMENT_LIMIT_LABEL} total</p><p className="mail-file-help" aria-label="Attachment storage used" aria-live="polite">{totalBytes?(totalBytes/1000000).toFixed(2):"0"} MB / {MAIL_ATTACHMENT_LIMIT_LABEL} used</p>{totalBytes>MAX_MAIL_NATIVE_ATTACHMENT_BYTES&&<p className="mail-file-help" role="status">Secure-link delivery: these files will be shared using expiring download links ({MAIL_SHARE_LINK_DAYS} days) instead of attached directly to the email. Anyone with a link can download that file.</p>}</>}
  {allowUpload&&uploadItems.length>0&&<div className="mail-upload-list" aria-label="File upload progress">
    <div className="mail-upload-list-heading"><span>FILE UPLOADS_</span><small>{uploadItems.filter(item=>item.phase==="complete").length} / {uploadItems.length} completed or processed</small></div>
    {uploadItems.map(item=><div className={`mail-upload-item is-${item.phase}`} key={item.id}>
      <span className="mail-upload-item-icon" aria-hidden="true">{/\.(png|jpe?g|webp|gif)$/i.test(item.filename)?<ImageIcon size={18}/>: /\.(mp4|webm|mov)$/i.test(item.filename)?<Film size={18}/>:<FileText size={18}/>}</span>
      <div className="mail-upload-item-body">
        <div className="mail-upload-progress-label">
          <strong title={item.filename}>{item.filename}</strong>
          <span>{item.phase==="cancelled"?"Cancelled":item.phase==="failed"?"Failed":item.phase==="queued"?"Queued":`${item.percent}%`}</span>
        </div>
        <div className="mail-upload-progress-track" role="progressbar"
          aria-label={`Upload ${item.filename}`} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={item.percent}>
          <span className="mail-upload-progress-fill" style={{width:`${item.percent}%`}}/>
        </div>
        <small className="mail-upload-progress-name" title={item.error||undefined}>
          {item.phase==="queued"?"Waiting for upload":item.phase==="uploading"?`Uploading · ${fileSize(item.size)}`
           :item.phase==="checking"?"Scanning & saving securely…":item.phase==="complete"?"Uploaded successfully"
           :item.phase==="cancelled"?"Upload cancelled. Other files continue.":item.error||"Upload failed"}
        </small>
      </div>
      {(item.phase==="queued"||item.phase==="uploading"||item.phase==="checking")
        ?<button type="button" className="mail-upload-cancel" title={`Cancel upload ${item.filename}`}
           aria-label={`Cancel upload ${item.filename}`} onClick={()=>cancelUpload(item.id)}><X size={16}/></button>
        :item.phase==="complete"?<Check size={16} className="mail-upload-complete-mark" aria-label="Uploaded"/>
        :<button type="button" className="mail-upload-cancel" title={`Dismiss ${item.filename}`}
           aria-label={`Dismiss ${item.filename}`} onClick={()=>setUploadItems(previous=>previous.filter(entry=>entry.id!==item.id))}><X size={16}/></button>}
    </div>)}
  </div>}
  <div className="mail-attachment-tiles">{files.map(a=><div key={a.id} className={`mail-file-tile ${a.id===selected?"selected":""}`}>
   <button className="mail-file-select" aria-label={`Preview ${a.original_filename}`} aria-pressed={a.id===selected} onClick={()=>setSelected(a.id)}>
    <span className="mail-file-thumb">{a.scan_status==="clean"&&previews[a.id]?.type.startsWith("image/")?<img src={previews[a.id]!.url} alt=""/>:a.scan_status==="clean"&&previews[a.id]?.type.startsWith("video/")?<video src={previews[a.id]!.url+"#t=0.1"} preload="metadata" muted playsInline aria-hidden="true"/>:/\.(mp4|webm|mov)$/i.test(a.original_filename)?<Film size={26}/>:<FileText size={26}/>}</span><strong title={a.original_filename}>{a.original_filename}</strong><small>{fileSize(Number(a.size_bytes))} · {a.scan_status==="clean"?"Ready":a.scan_status}</small>
   </button><div className="mail-file-tile-actions">{a.scan_status==="clean"&&<a href={`/api/mail/attachments/${encodeURIComponent(a.id)}/download`} aria-label={`Download ${a.original_filename}`} className="mail-icon-btn"><FileDown size={15}/></a>}{a.scan_status==="pending"&&<button disabled={busy} aria-label={`Retry scan for ${a.original_filename}`} className="mail-icon-btn" onClick={()=>perform(async()=>{await apiRequest("POST",`/api/mail/attachments/${encodeURIComponent(a.id)}/rescan`,{});await refresh(messageId!);})}><RefreshCcw size={15}/></button>}{allowUpload&&<button disabled={busy} aria-label={`Remove ${a.original_filename}`} className="mail-icon-btn" onClick={()=>perform(async()=>{await apiRequest("DELETE",`/api/mail/attachments/${encodeURIComponent(a.id)}`);await refresh(messageId!);})}><Trash2 size={15}/></button>}</div>
  </div>)}</div>{busy&&<p role="status" className="mail-file-help">Processing upload queue…</p>}{error&&<p role="alert" className="mail-alert">{error}</p>}{!loaded&&messageId&&!busy&&<button className="mail-button" onClick={()=>perform(async()=>{await refresh(messageId);})}>Retry attachment list</button>}
 </>;
 return <section className={`mail-attachments ${compact?"mail-attachment-compact":"mail-attachment-workbench"} ${drag?"is-dragging":""}`} onDragOver={e=>{if(allowUpload){e.preventDefault();setDrag(true);}}} onDragLeave={()=>setDrag(false)} onDrop={e=>{if(allowUpload){e.preventDefault();setDrag(false);void upload(Array.from(e.dataTransfer.files));}}}>
  {compact?<>{files.length>0&&<button className="mail-attachment-summary" onClick={()=>setOpen(true)}><Paperclip size={20}/><span><strong>{files.length} {files.length===1?"attachment":"attachments"}</strong><small>View files & previews</small></span><ChevronRight size={18}/></button>}{error&&<p role="alert">{error}</p>}<Dialog open={open} onOpenChange={setOpen}><DialogContent variant="drawer" className="mail-attachment-drawer"><DialogTitle>Conversation files</DialogTitle><DialogDescription>Private to this mailbox · Security checked before preview</DialogDescription>{list}{detail}</DialogContent></Dialog></>:<>{detail}<div className="mail-attachment-controls">{list}{!files.length&&allowUpload&&<button className="mail-upload-drop" disabled={busy} onClick={()=>input.current?.click()}><Upload size={23}/> Drop files here or browse</button>}</div></>}
  <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent elevated className="mail-preview-expanded"><DialogTitle>{active?.original_filename||"File preview"}</DialogTitle><DialogDescription>Private attachment preview</DialogDescription>{active&&previews[active.id]&&active.scan_status==="clean"?<PreviewContent preview={previews[active.id]!} name={active.original_filename}/>:<p>Preview unavailable. Download this file to open it.</p>}</DialogContent></Dialog>
 </section>;
}
function PreviewContent({preview,name}:{preview:Preview;name:string}){
 if(preview.type.startsWith("image/"))return <img className="mail-preview-image" src={preview.url} alt={name}/>;
 if(preview.type.startsWith("video/"))return <video className="mail-preview-video" controls playsInline preload="metadata" src={preview.url} aria-label={name}>Your browser cannot play this video. Download to open it.</video>;
 if(preview.type==="application/pdf")return <Suspense fallback={<p>Loading PDF viewer…</p>}><PdfPreview bytes={preview.bytes}/></Suspense>;
 return <pre className="mail-preview-text">{preview.text}{preview.bytes.length>200000?"\n\n[Preview truncated — download for the complete file]":""}</pre>;
}
