import {lazy,Suspense,useEffect,useRef,useState} from "react";
import {Paperclip,FileDown,FileText,RefreshCcw,ShieldAlert,Upload,ChevronRight,Image as ImageIcon,Film,Trash2,Maximize2} from "lucide-react";
import {apiRequest} from "@/lib/queryClient";
import {MAX_MAIL_ATTACHMENT_BYTES,MAX_MAIL_NATIVE_ATTACHMENT_BYTES,MAIL_SHARE_LINK_DAYS,MAIL_ATTACHMENT_LIMIT_LABEL,mailAttachmentSizeError} from "@shared/mail-policy";
import {mailPreviewType} from "@shared/mail-preview";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/mail-dialog";
const PdfPreview=lazy(()=>import("./mail-pdf-preview"));
type Attachment={id:string;original_filename:string;media_type:string;size_bytes:string|number;scan_status:"pending"|"clean"|"blocked"};
type Preview={url:string;type:string;bytes:Uint8Array;text?:string};
type Props={messageId?:string;allowUpload?:boolean;compact?:boolean;ensureDraft?:()=>Promise<string>;onBusyChange?:(busy:boolean)=>void;onSendReady?:(ready:boolean)=>void;onChanged?:()=>void};
const fileSize=(n:number)=>n<1000000?`${Math.ceil(n/1000)} KB`:`${(n/1000000).toFixed(1)} MB`;

type UploadPhase="uploading"|"checking"|"complete";
type UploadState={percent:number;current:number;count:number;filename:string;phase:UploadPhase};
/** XHR provides actual outbound byte progress; fetch cannot report upload bytes. */
function postAttachmentWithProgress(
  url:string,file:File,onProgress:(fraction:number,phase:"uploading"|"checking")=>void,
  setActive:(request:XMLHttpRequest|null)=>void
):Promise<void>{
  return new Promise<void>((resolve,reject)=>{
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
      if(xhr.status>=200&&xhr.status<300){resolve();return;}
      let message=`Could not upload ${file.name}`;
      try{
        const error=JSON.parse(xhr.responseText);
        if(typeof error?.error==="string")message=error.error.slice(0,240);
      }catch{}
      reject(new Error(message));
    });
    xhr.addEventListener("error",()=>{setActive(null);reject(new Error(`Network error uploading ${file.name}`));});
    xhr.addEventListener("abort",()=>{setActive(null);reject(new Error("Upload interrupted. Please retry this attachment."));});
    setActive(xhr);
    xhr.send(payload);
  });
}

export default function MailAttachments({messageId,allowUpload=false,compact=false,ensureDraft,onBusyChange,onSendReady,onChanged}:Props){
 const [files,setFiles]=useState<Attachment[]>([]),[selected,setSelected]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[drag,setDrag]=useState(false),[loaded,setLoaded]=useState(!messageId);
 const [previews,setPreviews]=useState<Record<string,Preview|null>>({});
 const [uploadProgress,setUploadProgress]=useState<UploadState|null>(null);
 const activeUpload=useRef<XMLHttpRequest|null>(null);
 const current=useRef(messageId);current.current=messageId;
 const mounted=useRef(true),locked=useRef(false),input=useRef<HTMLInputElement>(null);
 const lifecycle=useRef({abort:new AbortController(),urls:[] as string[],pending:new Set<string>()});
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;activeUpload.current?.abort();onBusyChange?.(false);};},[]);
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
 async function upload(chosen:File[]){
  if(!allowUpload||!chosen.length)return;
  if(chosen.some(f=>f.size===0)){setError("Empty files cannot be attached. Choose a file with content.");return;}
  const issue=mailAttachmentSizeError(totalBytes+chosen.reduce((n,f)=>n+f.size,0),files.length+chosen.length);
  if(issue){setError(issue);return;}
  const sum=chosen.reduce((n,file)=>n+file.size,0);
  setUploadProgress({percent:0,current:1,count:chosen.length,filename:chosen[0].name,phase:"uploading"});
  await perform(async()=>{
   let savedId=messageId;
   try{
    const id=messageId||await ensureDraft?.();
    if(!id)throw Error("Save the draft before adding files.");
    savedId=id;
    current.current=id;
    let completed=0;
    for(let i=0;i<chosen.length;i++){
      const file=chosen[i];
      const update=(fraction:number,phase:"uploading"|"checking")=>{
        // 99% means bytes have arrived, but the server may still be scanning
        // and encrypting them. 100% is reserved for confirmed persistence.
        const amount=completed+Math.round(file.size*fraction);
        const percent=Math.min(99,Math.floor(100*amount/sum));
        if(mounted.current)setUploadProgress({percent,current:i+1,count:chosen.length,filename:file.name,phase});
      };
      update(0,"uploading");
      await postAttachmentWithProgress(
        `/api/mail/messages/${encodeURIComponent(id)}/attachments`,file,update,
        request=>{activeUpload.current=request}
      );
      update(1,"checking");
      completed+=file.size;
    }
    const updated=await refresh(id);
    if(mounted.current){
      setSelected(updated.at(-1)?.id||"");
      setUploadProgress({percent:100,current:chosen.length,count:chosen.length,filename:chosen.at(-1)!.name,phase:"complete"});
    }
   }catch(error){
    // A later file can fail after earlier files were saved. Refresh the
    // persisted list so successes stay visible and editable in Drafts.
    if(savedId)await refresh(savedId).catch(()=>undefined);
    if(mounted.current)setUploadProgress(null);
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
  {allowUpload&&uploadProgress&&<div className={`mail-upload-progress is-${uploadProgress.phase}`}>
    <div className="mail-upload-progress-label" aria-live="polite">
      <strong>{uploadProgress.phase==="complete"?"Upload complete":uploadProgress.phase==="checking"?"Scanning and saving file…":`Uploading ${uploadProgress.current} of ${uploadProgress.count} files…`}</strong>
      <span>{uploadProgress.percent}%</span>
    </div>
    <div className="mail-upload-progress-track" role="progressbar" aria-label="Attachment upload progress"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress.percent}>
      <span className="mail-upload-progress-fill" style={{width:`${uploadProgress.percent}%`}}/>
    </div>
    <small className="mail-upload-progress-name" title={uploadProgress.filename}>{uploadProgress.filename}</small>
  </div>}
  <div className="mail-attachment-tiles">{files.map(a=><div key={a.id} className={`mail-file-tile ${a.id===selected?"selected":""}`}>
   <button className="mail-file-select" aria-label={`Preview ${a.original_filename}`} aria-pressed={a.id===selected} onClick={()=>setSelected(a.id)}>
    <span className="mail-file-thumb">{a.scan_status==="clean"&&previews[a.id]?.type.startsWith("image/")?<img src={previews[a.id]!.url} alt=""/>:a.scan_status==="clean"&&previews[a.id]?.type.startsWith("video/")?<video src={previews[a.id]!.url+"#t=0.1"} preload="metadata" muted playsInline aria-hidden="true"/>:/\.(mp4|webm|mov)$/i.test(a.original_filename)?<Film size={26}/>:<FileText size={26}/>}</span><strong title={a.original_filename}>{a.original_filename}</strong><small>{fileSize(Number(a.size_bytes))} · {a.scan_status==="clean"?"Ready":a.scan_status}</small>
   </button><div className="mail-file-tile-actions">{a.scan_status==="clean"&&<a href={`/api/mail/attachments/${encodeURIComponent(a.id)}/download`} aria-label={`Download ${a.original_filename}`} className="mail-icon-btn"><FileDown size={15}/></a>}{a.scan_status==="pending"&&<button disabled={busy} aria-label={`Retry scan for ${a.original_filename}`} className="mail-icon-btn" onClick={()=>perform(async()=>{await apiRequest("POST",`/api/mail/attachments/${encodeURIComponent(a.id)}/rescan`,{});await refresh(messageId!);})}><RefreshCcw size={15}/></button>}{allowUpload&&<button disabled={busy} aria-label={`Remove ${a.original_filename}`} className="mail-icon-btn" onClick={()=>perform(async()=>{await apiRequest("DELETE",`/api/mail/attachments/${encodeURIComponent(a.id)}`);await refresh(messageId!);})}><Trash2 size={15}/></button>}</div>
  </div>)}</div>{busy&&<p role="status" className="mail-file-help">Saving files & checking security…</p>}{error&&<p role="alert" className="mail-alert">{error}</p>}{!loaded&&messageId&&!busy&&<button className="mail-button" onClick={()=>perform(async()=>{await refresh(messageId);})}>Retry attachment list</button>}
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
