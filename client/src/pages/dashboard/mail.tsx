import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Inbox, Send, FileText, Archive, Trash2, Star, Mail, Plus, Search, Reply, ReplyAll, ArrowLeft, Settings, UserRoundPlus, ShieldCheck, Sparkles, RefreshCw, ChevronLeft, ChevronRight, MailOpen, Check, LockKeyhole, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MailAttachments from "./mail-attachments";
import { mailReplyRecipients, parseMailRecipients } from "@shared/mail-recipients";
import "./mail-workspace.css";

type Box = {id:string;local_part:string;domain:string;display_name:string;enabled:boolean;can_write:boolean;aliases?:string[]};
type Thread = {id:string;subject:string;from_email:string;text_body:string;created_at:string;is_read:boolean;is_starred:boolean;message_count:number};
type Message = {id:string;status:string;direction:string;from_email:string;to_emails:string[];cc_emails?:string[];subject:string;text_body:string;created_at:string;is_read:boolean;is_starred:boolean};
type Context = {sender:string|null;lead:{id:string;customer_name:string|null;customer_email:string;stage:string;score:number;source:string}|null};
type Capabilities = {admin:boolean;outbound:boolean;ai:boolean;attachments:boolean};
type Stat = {folder:string;total:number;unread:number};
type Editor = {to:string;cc:string;bcc:string;subject:string;body:string;draftId?:string;replyToId?:string};
type SavedDraft = {id:string;mailboxId:string;to:string[];cc:string[];bcc:string[];subject:string;text:string};
type Change = {isRead?:boolean;isStarred?:boolean;folder?:string};
const folders=[{name:"inbox",label:"Inbox",icon:Inbox},{name:"sent",label:"Sent",icon:Send},{name:"drafts",label:"Drafts",icon:FileText},{name:"archive",label:"Archive",icon:Archive},{name:"spam",label:"Spam",icon:AlertCircle},{name:"trash",label:"Trash",icon:Trash2}];
const PAGE_SIZE=40;
const blankEditor=():Editor=>({to:"",cc:"",bcc:"",subject:"",body:""});
const snapshot=(e:Editor)=>JSON.stringify([e.to,e.cc,e.bcc,e.subject,e.body]);
async function request<T>(url:string,method="GET",data?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",signal,
  headers:data===undefined?undefined:{"Content-Type":"application/json"},
  body:data===undefined?undefined:JSON.stringify(data)});
 if(!response.ok){
  const problem=await response.json().catch(()=>null);
  const fallback=response.status===401?"Your session has expired. Sign in again.":response.status===403?"You do not have permission for this action.":"Mail is unavailable. Please try again.";
  throw new Error(typeof problem?.error==="string"?problem.error.slice(0,200):fallback);
 }
 return response.json();
}
function dateLabel(value:string){
 const d=new Date(value);
 return d.toDateString()===new Date().toDateString()?d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString([],{month:"short",day:"numeric"});
}
export default function MailPage(){
 const [boxes,setBoxes]=useState<Box[]>([]),[box,setBox]=useState("");
 const [cap,setCap]=useState<Capabilities>({admin:false,outbound:false,ai:false,attachments:false});
 const [folder,setFolder]=useState("inbox"),[filter,setFilter]=useState("all"),[page,setPage]=useState(0);
 const [threads,setThreads]=useState<Thread[]>([]),[hasNext,setHasNext]=useState(false),[stats,setStats]=useState<Stat[]>([]);
 const [selected,setSelected]=useState<Thread|null>(null),[messages,setMessages]=useState<Message[]>([]),[context,setContext]=useState<Context|null>(null);
 const [loading,setLoading]=useState(true),[reading,setReading]=useState(false),[initializing,setInitializing]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[search,setSearch]=useState("");
 const [editor,setEditor]=useState<Editor|null>(null),[savedSnapshot,setSavedSnapshot]=useState("");
 const [saving,setSaving]=useState(false),[acting,setActing]=useState(false),[aiLoading,setAiLoading]=useState(false);
 const [openingDraft,setOpeningDraft]=useState(false),[showCopies,setShowCopies]=useState(false);
 const [aiSummary,setAiSummary]=useState(""),[reload,setReload]=useState(0);
 const searchRef=useRef<HTMLInputElement>(null),selectionRef=useRef("");
 selectionRef.current=selected?.id||"";
 const currentBox=boxes.find(b=>b.id===box);
 const canWrite=Boolean(currentBox?.can_write&&currentBox.enabled);
 const dirty=Boolean(editor&&snapshot(editor)!==savedSnapshot);
 const folderLabel=folders.find(f=>f.name===folder)?.label||"Inbox";
 const folderStat=stats.find(s=>s.folder===folder);
 const incoming=messages.filter(m=>m.direction==="inbound").at(-1);
 const ownAddresses=currentBox?[`${currentBox.local_part}@${currentBox.domain}`,...(currentBox.aliases||[])]:[];
 const replyAllRecipients=incoming?mailReplyRecipients(incoming,ownAddresses,true):{to:[],cc:[]};
 const hasReplyAll=replyAllRecipients.to.length+replyAllRecipients.cc.length>1;
 const visible=threads.filter(t=>(t.subject+" "+t.from_email+" "+t.text_body).toLowerCase().includes(search.toLowerCase()));
 useEffect(()=>{
  const abort=new AbortController();
  Promise.all([request<Box[]>("/api/mail/mailboxes","GET",undefined,abort.signal),request<Capabilities>("/api/mail/capabilities","GET",undefined,abort.signal)])
   .then(([b,c])=>{setBoxes(b);setCap(c);setBox(b.find(x=>x.enabled)?.id||"");})
   .catch(e=>{if(!abort.signal.aborted)setError(e.message);})
   .finally(()=>{if(!abort.signal.aborted){setInitializing(false);setLoading(false);}});
  return()=>abort.abort();
 },[]);
 useEffect(()=>{
  if(!box)return;
  const abort=new AbortController();setLoading(true);setThreads([]);setHasNext(false);
  const query=new URLSearchParams({mailboxId:box,folder,filter,limit:String(PAGE_SIZE+1),offset:String(page*PAGE_SIZE)});
  request<Thread[]>(`/api/mail/threads?${query}`,"GET",undefined,abort.signal)
   .then(data=>{setThreads(data.slice(0,PAGE_SIZE));setHasNext(data.length>PAGE_SIZE);})
   .catch(e=>{if(!abort.signal.aborted)setError(e.message);})
   .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[box,folder,filter,page,reload]);
 useEffect(()=>{
  if(!box)return;
  const abort=new AbortController();setStats([]);
  request<Stat[]>(`/api/mail/mailboxes/${box}/stats`,"GET",undefined,abort.signal)
   .then(setStats).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
  return()=>abort.abort();
 },[box,reload]);
 useEffect(()=>{
  setMessages([]);setContext(null);setAiSummary("");
  if(!selected){setReading(false);return;}
  const abort=new AbortController();setReading(true);
  request<Message[]>(`/api/mail/threads/${selected.id}`,"GET",undefined,abort.signal)
   .then(setMessages).catch(e=>{if(!abort.signal.aborted)setError(e.message);})
   .finally(()=>{if(!abort.signal.aborted)setReading(false);});
  request<Context>(`/api/mail/threads/${selected.id}/context`,"GET",undefined,abort.signal)
   .then(setContext).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
  return()=>abort.abort();
 },[selected?.id,reload]);
 function closeEditor(){
  if(saving)return;
  if(dirty&&!window.confirm("Discard your unsaved changes? Saved drafts will remain in Drafts."))return;
  setEditor(null);
 }
 function openEditor(next:Editor){
  if(!canWrite||saving)return;
  if(dirty&&!window.confirm("Discard your unsaved changes and open another message?"))return;
  setEditor(next);setShowCopies(Boolean(next.cc||next.bcc));setSavedSnapshot(snapshot(next.draftId?next:blankEditor()));setError("");setNotice("");
 }
 async function openDraft(id:string){
  if(!canWrite||saving||openingDraft)return;
  const target=selectionRef.current;setOpeningDraft(true);setError("");
  try{
   const draft=await request<SavedDraft>(`/api/mail/drafts/${id}`);
   if(selectionRef.current!==target||draft.mailboxId!==box)return;
   openEditor({draftId:draft.id,to:draft.to.join(", "),cc:draft.cc.join(", "),bcc:draft.bcc.join(", "),subject:draft.subject,body:draft.text});
  }catch(e:any){if(selectionRef.current===target)setError(e.message);}finally{setOpeningDraft(false);}
 }
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);
  return()=>window.removeEventListener("beforeunload",warn);
 },[dirty]);
 useEffect(()=>{
  const keyboard=(event:KeyboardEvent)=>{
   if(event.ctrlKey||event.metaKey||event.altKey||event.defaultPrevented)return;
   const target=event.target as HTMLElement;
   if(target.closest("input,textarea,select,[contenteditable=true]")||editor)return;
   if(event.key==="/"){event.preventDefault();searchRef.current?.focus();}
   if(event.key.toLowerCase()==="n"&&canWrite){event.preventDefault();openEditor(blankEditor());}
  };
  window.addEventListener("keydown",keyboard);
  return()=>window.removeEventListener("keydown",keyboard);
 },[editor,canWrite]);
 function changeMailbox(next:string){
  if(saving||acting||next===box)return;
  if(dirty&&!window.confirm("Discard unsaved changes and switch mailboxes? Saved drafts stay in their original mailbox."))return;
  setEditor(null);setSelected(null);setBox(next);setPage(0);setSearch("");setError("");setNotice("");
 }
 function navigate(nextFolder=folder,nextFilter=filter,nextPage=0){
  if(acting)return;
  setFolder(nextFolder);setFilter(nextFilter);setPage(nextPage);setSelected(null);setSearch("");setError("");setNotice("");
 }
 async function changeThread(change:Change){
  if(!selected||!canWrite||acting)return;
  const target=selected;setActing(true);setError("");setNotice("");
  try{
   await request(`/api/mail/threads/${target.id}`,"PATCH",{mailboxId:box,sourceFolder:folder,...change});
   if(change.folder||(filter==="unread"&&change.isRead)||(filter==="starred"&&change.isStarred===false))setSelected(null);
   else setSelected({...target,...(change.isRead!==undefined?{is_read:change.isRead}:{}),...(change.isStarred!==undefined?{is_starred:change.isStarred}:{})});
   setReload(x=>x+1);
   setNotice(change.folder?`Conversation moved to ${change.folder}.`:"Conversation updated.");
  }catch(e:any){setError(e.message);}finally{setActing(false);}
 }
 async function submit(draft:boolean){
  if(!editor||!box||!canWrite||saving)return;
  if(!draft&&!parseMailRecipients(editor.to).length){setError("Add at least one To recipient before sending.");return;}
  if(!draft&&!cap.outbound)return;
  const value=editor;setSaving(true);setError("");
  const recipients={to:parseMailRecipients(value.to),cc:parseMailRecipients(value.cc),bcc:parseMailRecipients(value.bcc)};
  try{
   let id=value.draftId;
   if(id){
    await request(`/api/mail/drafts/${id}`,"PATCH",{...recipients,subject:value.subject,text:value.body});
   }else{
    const created=await request<{id:string}>("/api/mail/compose","POST",{mailboxId:box,...recipients,subject:value.subject,text:value.body,draft:true,replyToId:value.replyToId});
    id=created.id;
   }
   // Keep the saved message ID if queuing fails; a retry must not create a
   // second outbound message. Sending still uses the server's atomic guard.
   setEditor({...value,draftId:id});setSavedSnapshot(snapshot(value));
   if(draft){setNotice("Draft saved privately.");}
   else {await request(`/api/mail/drafts/${id}/send`,"POST",{});setEditor(null);navigate("sent","all");setNotice("Message queued. Delivery status will update after the provider responds.");}
   setReload(x=>x+1);
  }catch(e:any){setError(e.message);}finally{setSaving(false);}
 }
 function reply(text="",all=false){
  if(!incoming||!selected)return;
  const recipients=mailReplyRecipients(incoming,ownAddresses,all);
  openEditor({to:recipients.to.join(", "),cc:recipients.cc.join(", "),bcc:"",subject:/^re:/i.test(selected.subject)?selected.subject:`Re: ${selected.subject}`,body:text,replyToId:incoming.id});
 }
 async function aiTask(task:"summary"|"draft"){
  if(!selected||aiLoading)return;
  if(!window.confirm("Send a shortened excerpt to the external AI provider? Email addresses and phone numbers are redacted, but other personal information may remain."))return;
  const id=selected.id;setAiLoading(true);setError("");
  try{
   const data=await request<{text:string}>(`/api/mail/threads/${id}/ai`,"POST",{task,acknowledgeExternalProcessing:true,tone:"professional"});
   if(selectionRef.current!==id)return;
   if(task==="summary")setAiSummary(data.text);else reply(data.text);
  }catch(e:any){if(selectionRef.current===id)setError(e.message);}finally{setAiLoading(false);}
 }
 async function convertLead(){
  if(!selected||acting)return;
  const id=selected.id;setActing(true);setError("");
  try{
   await request(`/api/mail/threads/${id}/convert-to-lead`,"POST",{});
   const data=await request<Context>(`/api/mail/threads/${id}/context`);
   if(selectionRef.current===id)setContext(data);
  }catch(e:any){setError(e.message);}finally{setActing(false);}
 }
 return <section className="mail-workspace" aria-label="Chatvice Mail">
  <header className="mail-topbar">
   <div className="mail-brand"><span className="mail-brand-icon"><Mail size={21}/></span><div><h1>Chatvice <span>Mail</span></h1><p>Your conversations, connected.</p></div></div>
   <div className="mail-header-actions">
    <span className="mail-private"><LockKeyhole size={12}/> Private workspace</span>
    {cap.admin&&<Link href="/dashboard/mail/admin" className="mail-icon-btn" aria-label="Mail settings"><Settings size={18}/></Link>}
    <button className="mail-button mail-primary" disabled={!canWrite||saving} onClick={()=>openEditor(blankEditor())}><Plus size={17}/> Compose<span className="mail-key">N</span></button>
   </div>
  </header>
  {error&&!editor&&<div className="mail-alert" role="alert"><AlertCircle size={16}/>{error}<button aria-label="Dismiss error" onClick={()=>setError("")}>×</button></div>}
  {notice&&!editor&&<div className="mail-notice" role="status"><Check size={15}/>{notice}</div>}
  <div className="mail-grid">
   <nav className="mail-sidebar" aria-label="Mail folders">
    <div className="mail-account"><label htmlFor="mailbox-select">WORKSPACE</label><select id="mailbox-select" value={box} disabled={saving||acting||initializing} onChange={e=>changeMailbox(e.target.value)}>
     {!box&&<option value="">{initializing?"Loading…":"No active mailbox"}</option>}
     {boxes.map(b=><option key={b.id} value={b.id} disabled={!b.enabled}>{b.local_part}@{b.domain}{!b.enabled?" (disabled)":""}</option>)}
    </select><span className="mail-access">{box?(canWrite?"Mailbox member":"Read-only access"):"Assign a mailbox to get started"}</span></div>
    <div className="mail-folder-links">{folders.map(f=>{
     const stat=stats.find(s=>s.folder===f.name);
     return <button key={f.name} disabled={acting} onClick={()=>navigate(f.name,"all")} aria-current={folder===f.name?"page":undefined} className={`mail-folder ${folder===f.name?"active":""}`}><f.icon size={17}/><span>{f.label}</span>{Boolean(stat?.total)&&<span className="mail-folder-count">{stat?.total}</span>}</button>;
    })}</div>
    <div className="mail-sidebar-footer"><ShieldCheck size={19}/><strong>A private place to work</strong><p>Messages stay within your authorized mailboxes.</p><span>Press / to search this page</span></div>
   </nav>
   <div className={`mail-thread-list ${selected?"mail-mobile-hidden":""}`}>
    <div className="mail-list-heading"><div><h2>{folderLabel}</h2><p>{folderStat?`${folderStat.total} conversations · ${folderStat.unread} unread`:"Your mailbox conversations"}</p></div><button className="mail-icon-btn" aria-label="Refresh mailbox" disabled={loading||acting} onClick={()=>{setError("");setReload(x=>x+1);}}><RefreshCw size={16} className={loading?"animate-spin":""}/></button></div>
    <label className="mail-search"><Search size={16}/><input ref={searchRef} aria-label="Search this page" placeholder="Search this page" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="Clear search" onClick={()=>setSearch("")}>×</button>}<kbd>/</kbd></label>
    <div className="mail-filter-tabs" aria-label="Conversation filters">{["all","unread","starred"].map(f=><button key={f} disabled={acting} aria-pressed={filter===f} className={filter===f?"active":""} onClick={()=>navigate(folder,f)}>{f==="starred"&&<Star size={12}/>}<span>{f[0].toUpperCase()+f.slice(1)}</span></button>)}</div>
    <div className="mail-thread-scroll" aria-busy={loading}>
     {loading?<div className="mail-skeletons" aria-label="Loading conversations">{[1,2,3,4].map(x=><div key={x}><span/><span/><span/></div>)}</div>:!visible.length?<div className="mail-empty-list"><Inbox size={30}/><h3>{search?"No matches on this page":!box?"Your mailbox starts here":"You're all caught up"}</h3><p>{search?"Try another term or clear the search to browse more pages.":!box?"Ask your administrator to assign a mailbox.":`No ${filter==="all"?"":filter+" "}conversations in ${folderLabel.toLowerCase()}.`}</p>{search&&<button className="mail-button" onClick={()=>setSearch("")}>Clear search</button>}</div>:visible.map(t=><button key={t.id} disabled={acting} aria-pressed={selected?.id===t.id} onClick={()=>{setSelected(t);setError("");setNotice("");}} className={`mail-thread ${selected?.id===t.id?"selected":""} ${!t.is_read?"unread":""}`}>
      <div className="mail-thread-line"><span className="mail-sender">{t.from_email.split("@")[0]||t.from_email}</span><time dateTime={t.created_at}>{dateLabel(t.created_at)}</time></div>
      <div className="mail-thread-subject"><span>{!t.is_read&&<i aria-label="Unread"/>}{t.subject||"(No subject)"}</span>{t.is_starred&&<Star size={13} fill="currentColor"/>}</div>
      <p>{t.text_body||"No message text"}</p><div className="mail-thread-meta"><span>{t.from_email}</span>{t.message_count>1&&<span>{t.message_count} messages</span>}</div>
     </button>)}
    </div>
    <div className="mail-pagination"><span>Page {page+1}{search?" · filtered locally":""}</span><div><button className="mail-icon-btn" aria-label="Previous page" disabled={!page||loading||acting} onClick={()=>navigate(folder,filter,page-1)}><ChevronLeft size={17}/></button><button className="mail-icon-btn" aria-label="Next page" disabled={!hasNext||loading||acting} onClick={()=>navigate(folder,filter,page+1)}><ChevronRight size={17}/></button></div></div>
   </div>
   <article className={`mail-reader ${!selected?"mail-mobile-hidden":""}`} aria-label="Conversation">
    {selected?<>
     <div className="mail-reader-toolbar"><button className="mail-icon-btn mail-back" aria-label="Back to messages" onClick={()=>setSelected(null)}><ArrowLeft size={18}/></button><span className="mail-reader-label">CONVERSATION</span><div>
      <button className={`mail-icon-btn ${selected.is_starred?"mail-starred":""}`} disabled={!canWrite||acting} aria-label={selected.is_starred?"Remove star":"Star conversation"} onClick={()=>changeThread({isStarred:!selected.is_starred})}><Star size={17} fill={selected.is_starred?"currentColor":"none"}/></button>
      <button className="mail-icon-btn" disabled={!canWrite||acting} aria-label={selected.is_read?"Mark unread":"Mark read"} onClick={()=>changeThread({isRead:!selected.is_read})}>{selected.is_read?<Mail size={17}/>:<MailOpen size={17}/>}</button>
      {folder!=="drafts"&&<><button className="mail-icon-btn" disabled={!canWrite||acting} aria-label={folder==="archive"||folder==="trash"||folder==="spam"?"Move to inbox":"Archive conversation"} onClick={()=>changeThread({folder:["archive","trash","spam"].includes(folder)?"inbox":"archive"})}>{["archive","trash","spam"].includes(folder)?<Inbox size={17}/>:<Archive size={17}/>}</button>{folder!=="trash"&&<button className="mail-icon-btn" disabled={!canWrite||acting} aria-label="Move to trash" onClick={()=>changeThread({folder:"trash"})}><Trash2 size={17}/></button>}</>}
     </div></div>
     <div className="mail-reader-content"><div className="mail-conversation-heading"><span className="mail-eyebrow">{folderLabel}</span><h2>{selected.subject||"(No subject)"}</h2><p>{messages.length} messages{!canWrite?" · Read-only access":""}</p></div>
      {cap.ai&&<div className="mail-ai-actions"><button className="mail-button" disabled={aiLoading||reading} onClick={()=>aiTask("summary")}><Sparkles size={14}/> Summarize</button>{canWrite&&incoming&&<button className="mail-button" disabled={aiLoading||reading} onClick={()=>aiTask("draft")}><Sparkles size={14}/> Draft a reply</button>}</div>}
      {aiSummary&&<div className="mail-ai-summary"><strong>AI summary · Review before use</strong><p>{aiSummary}</p></div>}
      {reading?<div className="mail-reading" role="status">Loading conversation…</div>:messages.map(m=><section className="mail-message" key={m.id}>
       <div className="mail-message-header"><span className="mail-avatar">{m.from_email.slice(0,1).toUpperCase()}</span><div><h3>{m.from_email}</h3><p>To {m.to_emails.join(", ")||"(No recipients yet)"}</p>{Boolean(m.cc_emails?.length)&&<p>CC {m.cc_emails?.join(", ")}</p>}</div><div className="mail-message-date"><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time><span className={`mail-delivery ${m.status==="failed"||m.status==="bounced"?"failed":""}`}>{m.status==="delivered"?"Delivered to all recipients":m.status==="bounced"?"Delivery issue":m.status==="failed"?"Delivery failed":m.status}</span></div></div>
       <p className="mail-message-body">{m.text_body||"This message has no readable text content."}</p>
       {cap.attachments&&<MailAttachments messageId={m.id} compact/>}
       {m.status==="draft"&&canWrite&&<button className="mail-button" disabled={openingDraft} onClick={()=>openDraft(m.id)}><FileText size={15}/>{openingDraft?"Opening draft…":"Continue editing"}</button>}
      </section>)}
      {!reading&&incoming&&canWrite&&<div className="mail-reply-actions"><button className="mail-button mail-reply" onClick={()=>reply()}><Reply size={17}/> Reply to {incoming.from_email.split("@")[0]}</button>{hasReplyAll&&<button className="mail-button mail-reply" onClick={()=>reply("",true)}><ReplyAll size={17}/> Reply all</button>}</div>}
      {context?.sender&&<aside className="mail-contact"><div><span className="mail-eyebrow">CUSTOMER 360</span><h3>{context.lead?.customer_name||context.sender}</h3><p>{context.lead?`${context.lead.stage} · Lead score ${context.lead.score??0}/100`:"Connect this conversation with your customer records."}</p></div>{context.lead?<span className="mail-linked"><Check size={13}/> CRM linked</span>:canWrite&&<button className="mail-button" disabled={acting} onClick={convertLead}><UserRoundPlus size={15}/> Add to CRM</button>}</aside>}
     </div>
    </>:<div className="mail-reader-empty"><div className="mail-empty-orbit"><Mail size={36}/><span><ShieldCheck size={17}/></span></div><span className="mail-eyebrow">MAKE ROOM FOR FOCUS</span><h2>Good conversations<br/>start here.</h2><p>Select a conversation to read, reply,<br/>and keep your customers connected.</p><div><span><LockKeyhole size={13}/> Private mailboxes</span><span><UserRoundPlus size={13}/> Connected to CRM</span></div>{canWrite&&<button className="mail-button" onClick={()=>openEditor(blankEditor())}><Plus size={16}/> Start a conversation</button>}</div>}
   </article>
  </div>
  <Dialog open={Boolean(editor)} onOpenChange={open=>{if(!open)closeEditor();}}><DialogContent className="mail-composer sm:max-w-2xl" onInteractOutside={event=>event.preventDefault()} onEscapeKeyDown={event=>{event.preventDefault();closeEditor();}}>
   <DialogTitle>{editor?.draftId?"Edit draft":"New message"}</DialogTitle><DialogDescription>From {currentBox?.local_part}@{currentBox?.domain}</DialogDescription>
   {editor&&<><label className="mail-compose-field">To<input autoFocus aria-label="Recipients" placeholder="address@example.com, another@example.com" disabled={saving} value={editor.to} onChange={e=>setEditor({...editor,to:e.target.value})}/>{!showCopies&&<button className="mail-copy-toggle" type="button" disabled={saving} onClick={()=>setShowCopies(true)}>CC / BCC</button>}</label>
    {showCopies&&<><label className="mail-compose-field">CC<input aria-label="CC recipients" placeholder="Copy recipients" disabled={saving} value={editor.cc} onChange={e=>setEditor({...editor,cc:e.target.value})}/></label><label className="mail-compose-field">BCC<input aria-label="BCC recipients" placeholder="Hidden from other recipients" disabled={saving} value={editor.bcc} onChange={e=>setEditor({...editor,bcc:e.target.value})}/></label></>}
    <label className="mail-compose-field">Subject<input aria-label="Subject" placeholder="Give your message a subject" disabled={saving} value={editor.subject} onChange={e=>setEditor({...editor,subject:e.target.value})}/></label>
    <textarea className="mail-compose-body" aria-label="Message" placeholder="Write something thoughtful…" disabled={saving} value={editor.body} onChange={e=>setEditor({...editor,body:e.target.value})}/>
    {error&&<div className="mail-alert" role="alert">{error}</div>}
    {cap.attachments&&(editor.draftId?<div className="mail-compose-attachments"><MailAttachments key={editor.draftId} messageId={editor.draftId} allowUpload={!saving}/></div>:<p className="mail-compose-help">Save a draft to add private attachments.</p>)}
    {!cap.outbound&&<p className="mail-compose-help"><LockKeyhole size={13}/> Sending is unavailable for this workspace. You can save drafts.</p>}
    <footer className="mail-compose-footer"><span role="status">{saving?"Saving…":editor.draftId&&!dirty?"Draft saved privately":dirty?"Unsaved changes":"Private message"}</span><button className="mail-button" disabled={saving} onClick={()=>submit(true)}><FileText size={15}/> Save draft</button><button className="mail-button mail-primary" title={!cap.outbound?"Sending is not configured for this workspace":undefined} disabled={saving||!parseMailRecipients(editor.to).length||!cap.outbound} onClick={()=>submit(false)}><Send size={15}/> Queue send</button></footer>
   </>}
  </DialogContent></Dialog>
 </section>;
}
