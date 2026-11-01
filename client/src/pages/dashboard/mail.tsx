import { useEffect, useRef, useState } from "react";
import { Link, type RouteComponentProps } from "wouter";
import { Inbox, Send, FileText, Archive, Trash2, Star, Mail, Plus, Search, Reply, ReplyAll, ArrowLeft, Settings, UserRoundPlus, ShieldCheck, Sparkles, RefreshCw, ChevronLeft, ChevronRight, MailOpen, Check, LockKeyhole, AlertCircle, LogOut, Menu, Bell, X, PanelLeftClose, PanelLeftOpen, Boxes } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, useMailConfirm } from "@/components/mail-dialog";
import MailArt from "@/components/mail-art";
import MailTheme from "@/components/mail-theme";
import MailAttachments from "./mail-attachments";
import {useDesktopMail,useMailParallax} from "@/components/mail-motion";
import "../../mail-motion.css";
import MailActivity from "./mail-activity";
import MailMessageBody from "./mail-message-body";
import { mailReplyRecipients, parseMailRecipients } from "@shared/mail-recipients";
import "./mail-workspace.css";
import "../../mail-retro.css";
import "./mail-compact.css";

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
type MailPageProps=Partial<RouteComponentProps>&{accountEmail?:string;onSignOut?:()=>void;signingOut?:boolean};
export default function MailPage({accountEmail,onSignOut,signingOut=false}:MailPageProps={}){
 const {confirm,confirmation}=useMailConfirm();
 const [boxes,setBoxes]=useState<Box[]>([]),[box,setBox]=useState("");
 const [cap,setCap]=useState<Capabilities>({admin:false,outbound:false,ai:false,attachments:false});
 const [folder,setFolder]=useState("inbox"),[filter,setFilter]=useState("all"),[page,setPage]=useState(0);
 const [threads,setThreads]=useState<Thread[]>([]),[hasNext,setHasNext]=useState(false),[stats,setStats]=useState<Stat[]>([]);
 const [selected,setSelected]=useState<Thread|null>(null),[messages,setMessages]=useState<Message[]>([]),[context,setContext]=useState<Context|null>(null);
 const [loading,setLoading]=useState(true),[reading,setReading]=useState(false),[initializing,setInitializing]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[search,setSearch]=useState("");
 const [editor,setEditor]=useState<Editor|null>(null),[savedSnapshot,setSavedSnapshot]=useState("");
 const [saving,setSaving]=useState(false),[acting,setActing]=useState(false),[aiLoading,setAiLoading]=useState(false);
 const [uploading,setUploading]=useState(false),[attachmentsReady,setAttachmentsReady]=useState(true);
 const draftOperation=useRef<Promise<string>|null>(null);
 const [openingDraft,setOpeningDraft]=useState(false),[showCopies,setShowCopies]=useState(false);
 const [aiSummary,setAiSummary]=useState(""),[reload,setReload]=useState(0);
 const desktop=useDesktopMail();
 const motionRef=useMailParallax<HTMLElement>(selected?.id);
 const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem("chatvice-mail-sidebar")==="collapsed";}catch{return false;}});
 const workspaceRef=useRef<HTMLSelectElement>(null),focusWorkspace=useRef(false);
 useEffect(()=>{try{localStorage.setItem("chatvice-mail-sidebar",collapsed?"collapsed":"expanded");}catch{}if(!collapsed&&focusWorkspace.current){workspaceRef.current?.focus();focusWorkspace.current=false;}},[collapsed]);
 useEffect(()=>{if(desktop)setPanel(current=>current==="menu"?null:current);},[desktop]);
 const searchRef=useRef<HTMLInputElement>(null),selectionRef=useRef("");
 const menuRef=useRef<HTMLButtonElement>(null),searchButtonRef=useRef<HTMLButtonElement>(null);
 const listScrollRef=useRef<HTMLDivElement>(null),readerScrollRef=useRef<HTMLDivElement>(null);
 const [panel,setPanel]=useState<"menu"|"activity"|null>(null),[searchOpen,setSearchOpen]=useState(false),[headerCompact,setHeaderCompact]=useState(false);
 useEffect(()=>{if(searchOpen)searchRef.current?.focus();},[searchOpen]);
 useEffect(()=>{setHeaderCompact(false);if(listScrollRef.current)listScrollRef.current.scrollTop=0;},[box,folder,filter,page]);
 useEffect(()=>{if(selected&&readerScrollRef.current)readerScrollRef.current.scrollTop=0;setHeaderCompact(((selected?readerScrollRef.current:listScrollRef.current)?.scrollTop??0)>32);},[selected?.id]);
 function updateHeader(top:number){if(top<=0)setHeaderCompact(false);else if(top>32)setHeaderCompact(true);}
 function closeSearch(){setSearchOpen(false);searchButtonRef.current?.focus();}
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
 async function closeEditor(){
  if(saving||uploading)return;
  if(dirty&&!await confirm({description:"Only your unsaved edits will be discarded. Saved drafts will remain in Drafts."}))return;
  setEditor(null);
 }
 async function openEditor(next:Editor){
  if(!canWrite||saving||uploading)return;
  if(dirty&&!await confirm({description:"Discard your unsaved edits and open another message? Saved drafts will remain in Drafts."}))return;
  setPanel(null);setAttachmentsReady(!next.draftId||!cap.attachments);setEditor(next);setShowCopies(Boolean(next.cc||next.bcc));setSavedSnapshot(snapshot(next.draftId?next:blankEditor()));setError("");setNotice("");
 }
 async function openDraft(id:string){
  if(!canWrite||saving||uploading||openingDraft)return;
  const target=selectionRef.current;setOpeningDraft(true);setError("");
  try{
   const draft=await request<SavedDraft>(`/api/mail/drafts/${id}`);
   if(selectionRef.current!==target||draft.mailboxId!==box)return;
   openEditor({draftId:draft.id,to:draft.to.join(", "),cc:draft.cc.join(", "),bcc:draft.bcc.join(", "),subject:draft.subject,body:draft.text});
  }catch(e:any){if(selectionRef.current===target)setError(e.message);}finally{setOpeningDraft(false);}
 }
 useEffect(()=>{
  if(!dirty&&!uploading)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  window.addEventListener("beforeunload",warn);
  return()=>window.removeEventListener("beforeunload",warn);
 },[dirty,uploading]);
 useEffect(()=>{
  const keyboard=(event:KeyboardEvent)=>{
   if(event.ctrlKey||event.metaKey||event.altKey||event.defaultPrevented)return;
   const target=event.target as HTMLElement;
   if(target.closest("input,textarea,select,[contenteditable=true]")||editor||panel||target.closest("[role=dialog]"))return;
   if(event.key==="/"){event.preventDefault();setSearchOpen(true);searchRef.current?.focus();}
   if(event.key.toLowerCase()==="n"&&canWrite){event.preventDefault();openEditor(blankEditor());}
  };
  window.addEventListener("keydown",keyboard);
  return()=>window.removeEventListener("keydown",keyboard);
 },[editor,canWrite,panel]);
 async function changeMailbox(next:string){
  if(saving||uploading||acting||next===box)return;
  if(dirty&&!await confirm({description:"Discard unsaved edits and switch mailboxes? Saved drafts stay in their original mailbox."}))return;
  setPanel(null);setEditor(null);setSelected(null);setBox(next);setPage(0);setSearch("");setError("");setNotice("");
 }
 function navigate(nextFolder=folder,nextFilter=filter,nextPage=0){
  if(acting)return;
  setPanel(null);setFolder(nextFolder);setFilter(nextFilter);setPage(nextPage);setSelected(null);setSearch("");setError("");setNotice("");
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
 async function persistDraft():Promise<string>{
  if(draftOperation.current)return draftOperation.current;
  if(!editor||!box||!canWrite)throw Error("No writable draft");
  const value=editor;setSaving(true);setError("");
  const operation=(async()=>{
   const recipients={to:parseMailRecipients(value.to),cc:parseMailRecipients(value.cc),bcc:parseMailRecipients(value.bcc)};
   let id=value.draftId;
   if(id)await request(`/api/mail/drafts/${id}`,"PATCH",{...recipients,subject:value.subject,text:value.body});
   else id=(await request<{id:string}>("/api/mail/compose","POST",{mailboxId:box,...recipients,subject:value.subject,text:value.body,draft:true,replyToId:value.replyToId})).id;
   setEditor({...value,draftId:id});setSavedSnapshot(snapshot(value));setReload(n=>n+1);return id;
  })();
  draftOperation.current=operation;
  try{return await operation;}finally{draftOperation.current=null;setSaving(false);}
 }
 async function submit(draft:boolean){
  if(!editor||!box||!canWrite||saving||uploading||draftOperation.current)return;
  if(!draft&&!parseMailRecipients(editor.to).length){setError("Add at least one To recipient before sending.");return;}
  if(!draft&&(!cap.outbound||!attachmentsReady))return;
  try{
   const id=await persistDraft();
   if(draft)setNotice("Draft saved privately.");
   else{setSaving(true);await request(`/api/mail/drafts/${id}/send`,"POST",{});setEditor(null);navigate("sent","all");setNotice("Message queued. Delivery status will update after the provider responds.");setReload(n=>n+1);}
  }catch(e:any){setError(e.message);}finally{setSaving(false);}
 }
 function reply(text="",all=false){
  if(!incoming||!selected)return;
  const recipients=mailReplyRecipients(incoming,ownAddresses,all);
  openEditor({to:recipients.to.join(", "),cc:recipients.cc.join(", "),bcc:"",subject:/^re:/i.test(selected.subject)?selected.subject:`Re: ${selected.subject}`,body:text,replyToId:incoming.id});
 }
 async function aiTask(task:"summary"|"draft"){
  if(!selected||aiLoading)return;
  if(!await confirm({title:"Share an excerpt with AI?",description:"Send a shortened excerpt to the external AI provider? Email addresses and phone numbers are redacted, but other personal information may remain.",confirm:"Share excerpt",cancel:"Cancel"}))return;
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
 const navigation=()=>(<nav id={desktop?"mail-desktop-menu":"mail-mobile-menu"} className={`mail-sidebar ${desktop?"mail-desktop-sidebar":"mail-menu-sidebar"} ${desktop&&collapsed?"is-collapsed":""}`} aria-label="Mail folders">
    {desktop&&<div className="mail-sidebar-heading"><span>WORKSPACE</span><button ref={menuRef} className="mail-icon-btn" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} title={collapsed?"Expand sidebar":"Collapse sidebar"} aria-expanded={!collapsed} aria-controls="mail-desktop-menu" onClick={()=>setCollapsed(value=>!value)}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div>}
    {desktop&&collapsed?<button className="mail-folder mail-workspace-picker" aria-label="Choose workspace" title={currentBox?`${currentBox.local_part}@${currentBox.domain}`:"Choose workspace"} onClick={()=>{focusWorkspace.current=true;setCollapsed(false);}}><Boxes size={18}/></button>:<div className="mail-account"><label htmlFor="mailbox-select">WORKSPACE</label><select ref={workspaceRef} id="mailbox-select" value={box} disabled={saving||uploading||acting||initializing} onChange={e=>changeMailbox(e.target.value)}>
     {!box&&<option value="">{initializing?"Loading…":"No active mailbox"}</option>}
     {boxes.map(b=><option key={b.id} value={b.id} disabled={!b.enabled}>{b.local_part}@{b.domain}{!b.enabled?" (disabled)":""}</option>)}
    </select><span className={`mail-access ${box&&!canWrite?"mail-readonly":""}`}>{box?(canWrite?"Mailbox member":"Read-only access"):"Assign a mailbox to get started"}</span></div>}
    <div className="mail-folder-links">{folders.map(f=>{
     const stat=stats.find(s=>s.folder===f.name);
     return <button key={f.name} aria-label={f.label} title={collapsed&&desktop?`${f.label}${stats.find(s=>s.folder===f.name)?.total?` (${stats.find(s=>s.folder===f.name)?.total})`:""}`:undefined} disabled={acting} onClick={()=>navigate(f.name,"all")} aria-current={folder===f.name?"page":undefined} className={`mail-folder ${folder===f.name?"active":""}`}><f.icon size={17}/><span>{f.label}</span>{Boolean(stat?.total)&&<span className="mail-folder-count">{stat?.total}</span>}</button>;
    })}{cap.admin&&<Link href="/dashboard/mail/admin" className="mail-folder" aria-label="Mail settings" title="Mail settings"><Settings size={17}/><span>Settings</span></Link>}<button className="mail-folder" disabled={!box} title="Activity & reminders" aria-label="Open activity and subscription reminders" onClick={()=>setPanel("activity")}><Bell size={17}/><span>Activity & reminders</span></button></div>
    <div className="mail-menu-theme"><span>Appearance</span><MailTheme/></div>
    <div className="mail-sidebar-footer"><span>Press / to search this page</span>{accountEmail&&<div className="mail-account-profile"><span className="mail-avatar">{accountEmail[0].toUpperCase()}</span><div><strong title={accountEmail}>{accountEmail}</strong><small>Your account</small></div>{onSignOut&&<button className="mail-icon-btn" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={onSignOut}><LogOut size={16}/></button>}</div>}</div>
   </nav>);
 return <section ref={motionRef} className={`mail-workspace ${desktop&&collapsed?"mail-sidebar-collapsed":""} ${selected?"mail-reading-open":""}`} aria-label="Chatvice Mail">
  <header className={`mail-topbar ${headerCompact?"mail-topbar-compact":""}`}>
   <Link href="/" className="mail-brand mail-brand-home" aria-label="Chatvice Mail home"><span className="mail-brand-icon" data-mail-depth=".3"><Mail size={21}/></span><div><h1>Chatvice <span>Mail</span></h1><p>MAIL TERMINAL / CONNECTED_</p></div></Link>
   <div className="mail-header-actions">{!desktop&&<button ref={menuRef} className="mail-button mail-primary" aria-label="Open mail menu" aria-haspopup="dialog" aria-expanded={panel==="menu"} aria-controls="mail-menu" onClick={()=>setPanel("menu")}><Menu size={16}/> Menu</button>}</div>
  </header>
  {error&&!editor&&<div className="mail-alert" role="alert"><AlertCircle size={16}/>{error}<button aria-label="Dismiss error" onClick={()=>setError("")}>×</button></div>}
  <div className="mail-workspace-actions"><span role="status">{notice&&!editor?notice:loading?"Updating conversations…":`${folderLabel} · ${folderStat?.total??0} conversations${box&&!canWrite?" · Read-only access":""}`}</span><button className="mail-button mail-primary" disabled={!canWrite||saving||uploading} onClick={()=>openEditor(blankEditor())}><Plus size={15}/> Compose<span className="mail-key">N</span></button></div>
  <div className="mail-grid">
   {desktop&&navigation()}
   <div className={`mail-thread-list ${selected?"mail-mobile-hidden":""}`}>
    <div className="mail-list-heading"><div><h2>{folderLabel}</h2><p>{folderStat?`${folderStat.total} conversations · ${folderStat.unread} unread`:"Your mailbox conversations"}</p></div></div>
    <div className="mail-list-controls">
     <div className="mail-filter-tabs" aria-label="Conversation filters">{["all","unread","starred"].map(f=><button key={f} disabled={acting} aria-pressed={filter===f} className={filter===f?"active":""} onClick={()=>navigate(folder,f)}><span>{f[0].toUpperCase()+f.slice(1)}</span></button>)}</div>
     <button className="mail-icon-btn" aria-label="Refresh mailbox" disabled={loading||acting} onClick={()=>{setError("");setReload(x=>x+1);}}><RefreshCw size={15} className={loading?"animate-spin":""}/></button>
     <button ref={searchButtonRef} className={`mail-icon-btn ${search?"mail-search-active":""}`} aria-label="Search conversations" aria-expanded={searchOpen} aria-controls="mail-search-panel" onClick={()=>searchOpen?closeSearch():setSearchOpen(true)}><Search size={15}/>{search&&<i aria-label="Search filter active"/>}</button>
    </div>
    {searchOpen&&<div id="mail-search-panel" className="mail-search-drawer" role="region" aria-label="Search conversations" onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();closeSearch();}}}><label className="mail-search"><Search size={15}/><input ref={searchRef} aria-label="Search this page" placeholder="Search this page" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="Clear search" onClick={()=>setSearch("")}>×</button>}<button aria-label="Close search" onClick={closeSearch}><X size={15}/></button></label><small>Searches conversations on this page.</small></div>}
    <div ref={listScrollRef} className="mail-thread-scroll" aria-busy={loading} onScroll={event=>{updateHeader(event.currentTarget.scrollTop);}}>
     {loading?<div className="mail-skeletons" aria-label="Loading conversations">{[1,2,3,4].map(x=><div key={x}><span/><span/><span/></div>)}</div>:!visible.length?<div className="mail-empty-list"><MailArt kind="inbox" className="mail-list-art"/><h3>{search?"No matches on this page":!box?"Your mailbox starts here":"You're all caught up"}</h3><p>{search?"Try another term or clear the search to browse more pages.":!box?"Ask your administrator to assign a mailbox.":`No ${filter==="all"?"":filter+" "}conversations in ${folderLabel.toLowerCase()}.`}</p>{search&&<button className="mail-button" onClick={()=>setSearch("")}>Clear search</button>}</div>:visible.map(t=><button key={t.id} disabled={acting} aria-pressed={selected?.id===t.id} onClick={()=>{setSelected(t);setError("");setNotice("");}} className={`mail-thread ${selected?.id===t.id?"selected":""} ${!t.is_read?"unread":""}`}>
      <div className="mail-thread-line"><span className="mail-thread-avatar" aria-hidden="true">{t.from_email[0]?.toUpperCase()}</span><span className="mail-sender">{t.from_email.split("@")[0]||t.from_email}</span><time dateTime={t.created_at}>{dateLabel(t.created_at)}</time></div>
      <div className="mail-thread-subject"><span>{!t.is_read&&<i aria-label="Unread"/>}{t.subject||"(No subject)"}</span>{t.is_starred&&<Star size={13} fill="currentColor"/>}</div>
      <p>{t.text_body||"No message text"}</p><div className="mail-thread-meta"><span>{t.from_email}</span>{t.message_count>1&&<span>{t.message_count} messages</span>}</div>
     </button>)}
    </div>
    <div className="mail-pagination"><span>Page {page+1}{search?" · filtered locally":""}</span><div><button className="mail-icon-btn" aria-label="Previous page" disabled={!page||loading||acting} onClick={()=>navigate(folder,filter,page-1)}><ChevronLeft size={17}/></button><button className="mail-icon-btn" aria-label="Next page" disabled={!hasNext||loading||acting} onClick={()=>navigate(folder,filter,page+1)}><ChevronRight size={17}/></button></div></div>
   </div>
   <article className={`mail-reader ${!selected?"mail-mobile-hidden":""}`} aria-label="Conversation">
    <div className="mail-inbox-depth" aria-hidden="true"><i data-mail-depth=".45"/><i data-mail-depth="-.7"/><i data-mail-depth="1.2"/></div>
    {selected?<>
     <div className="mail-reader-toolbar"><button className="mail-icon-btn mail-back" aria-label="Back to messages" onClick={()=>setSelected(null)}><ArrowLeft size={18}/></button><span className="mail-reader-label">CONVERSATION</span><div>
      <button className={`mail-icon-btn ${selected.is_starred?"mail-starred":""}`} disabled={!canWrite||acting} aria-label={selected.is_starred?"Remove star":"Star conversation"} onClick={()=>changeThread({isStarred:!selected.is_starred})}><Star size={17} fill={selected.is_starred?"currentColor":"none"}/></button>
      <button className="mail-icon-btn" disabled={!canWrite||acting} aria-label={selected.is_read?"Mark unread":"Mark read"} onClick={()=>changeThread({isRead:!selected.is_read})}>{selected.is_read?<Mail size={17}/>:<MailOpen size={17}/>}</button>
      {folder!=="drafts"&&<><button className="mail-icon-btn" disabled={!canWrite||acting} aria-label={folder==="archive"||folder==="trash"||folder==="spam"?"Move to inbox":"Archive conversation"} onClick={()=>changeThread({folder:["archive","trash","spam"].includes(folder)?"inbox":"archive"})}>{["archive","trash","spam"].includes(folder)?<Inbox size={17}/>:<Archive size={17}/>}</button>{folder!=="trash"&&<button className="mail-icon-btn" disabled={!canWrite||acting} aria-label="Move to trash" onClick={()=>changeThread({folder:"trash"})}><Trash2 size={17}/></button>}</>}
     </div></div>
     <div ref={readerScrollRef} className="mail-reader-content" onScroll={event=>updateHeader(event.currentTarget.scrollTop)}><div className="mail-conversation-heading"><span className="mail-eyebrow">{folderLabel}</span><h2>{selected.subject||"(No subject)"}</h2><p>{messages.length} messages{!canWrite?" · Read-only access":""}</p></div>
      {cap.ai&&<div className="mail-ai-actions"><button className="mail-button" disabled={aiLoading||reading} onClick={()=>aiTask("summary")}><Sparkles size={14}/> Summarize</button>{canWrite&&incoming&&<button className="mail-button" disabled={aiLoading||reading} onClick={()=>aiTask("draft")}><Sparkles size={14}/> Draft a reply</button>}</div>}
      {aiSummary&&<div className="mail-ai-summary"><strong>AI summary · Review before use</strong><p>{aiSummary}</p></div>}
      {reading?<div className="mail-reading" role="status">Loading conversation…</div>:messages.map(m=><section className="mail-message" key={m.id}>
       <div className="mail-message-header"><span className="mail-avatar">{m.from_email.slice(0,1).toUpperCase()}</span><div><h3>{m.from_email}</h3><p>To {m.to_emails.join(", ")||"(No recipients yet)"}</p>{Boolean(m.cc_emails?.length)&&<p>CC {m.cc_emails?.join(", ")}</p>}</div><div className="mail-message-date"><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time><span className={`mail-delivery ${m.status==="failed"||m.status==="bounced"?"failed":""}`}>{m.status==="delivered"?"Delivered to all recipients":m.status==="bounced"?"Delivery issue":m.status==="failed"?"Delivery failed":m.status}</span></div></div>
       <MailMessageBody text={m.text_body}/>
       {cap.attachments&&<MailAttachments messageId={m.id} compact/>}
       {m.status==="draft"&&canWrite&&<button className="mail-button" disabled={openingDraft} onClick={()=>openDraft(m.id)}><FileText size={15}/>{openingDraft?"Opening draft…":"Continue editing"}</button>}
      </section>)}
      {!reading&&incoming&&canWrite&&<div className="mail-reply-actions"><button className="mail-button mail-reply" onClick={()=>reply()}><Reply size={17}/> Reply to {incoming.from_email.split("@")[0]}</button>{hasReplyAll&&<button className="mail-button mail-reply" onClick={()=>reply("",true)}><ReplyAll size={17}/> Reply all</button>}</div>}
      {context?.sender&&<aside className="mail-contact"><div><span className="mail-eyebrow">CUSTOMER 360</span><h3>{context.lead?.customer_name||context.sender}</h3><p>{context.lead?`${context.lead.stage} · Lead score ${context.lead.score??0}/100`:"Connect this conversation with your customer records."}</p></div>{context.lead?<span className="mail-linked"><Check size={13}/> CRM linked</span>:canWrite&&<button className="mail-button" disabled={acting} onClick={convertLead}><UserRoundPlus size={15}/> Add to CRM</button>}</aside>}
     </div>
    </>:<div className="mail-reader-empty"><MailArt kind="inbox" depth={1} className="mail-empty-art"/><span className="mail-eyebrow">MAKE ROOM FOR FOCUS</span><h2>Good conversations<br/>start here.</h2><p>Select a conversation to read, reply,<br/>and keep your customers connected.</p><div><span><LockKeyhole size={13}/> Private mailboxes</span><span><UserRoundPlus size={13}/> Connected to CRM</span></div>{canWrite&&<button className="mail-button" onClick={()=>openEditor(blankEditor())}><Plus size={16}/> Start a conversation</button>}</div>}
   </article>
  </div>
  <Dialog open={!desktop&&panel==="menu"} onOpenChange={open=>setPanel(open?"menu":null)}><DialogContent id="mail-menu" variant="drawer" className="mail-menu-drawer" onCloseAutoFocus={event=>{event.preventDefault();menuRef.current?.focus();}}><DialogTitle>Workspace menu_</DialogTitle><DialogDescription>Choose a mailbox, browse folders, or manage your workspace.</DialogDescription>
   {navigation()}
  </DialogContent></Dialog>
  <MailActivity key={box} desktop={desktop} open={panel==="activity"} onOpenChange={open=>setPanel(open?"activity":null)} returnFocusRef={menuRef} mailboxId={box} canWrite={canWrite} reload={reload} onFolder={(next,nextFilter="all")=>navigate(next,nextFilter)} onDraft={id=>{void openDraft(id);}} onMessage={m=>{navigate("inbox","all");setSelected({...m,id:m.thread_id,is_read:false,is_starred:false,message_count:1});}}/>
  <Dialog open={Boolean(editor)} onOpenChange={open=>{if(!open)closeEditor();}}><DialogContent className="mail-composer" closeDisabled={saving||uploading} onInteractOutside={event=>event.preventDefault()} onEscapeKeyDown={event=>{event.preventDefault();closeEditor();}}>
   <DialogTitle>{editor?.draftId?"Edit draft":"New message"}</DialogTitle><DialogDescription>From {currentBox?.local_part}@{currentBox?.domain}</DialogDescription>
   {editor&&<><div className={`mail-compose-layout ${cap.attachments?"has-attachments":""}`}><div className="mail-compose-writing"><label className="mail-compose-field">To<input autoFocus aria-label="Recipients" placeholder="address@example.com, another@example.com" disabled={saving||uploading} value={editor.to} onChange={e=>setEditor({...editor,to:e.target.value})}/>{!showCopies&&<button className="mail-copy-toggle" type="button" disabled={saving||uploading} onClick={()=>setShowCopies(true)}>CC / BCC</button>}</label>
    {showCopies&&<><label className="mail-compose-field">CC<input aria-label="CC recipients" placeholder="Copy recipients" disabled={saving||uploading} value={editor.cc} onChange={e=>setEditor({...editor,cc:e.target.value})}/></label><label className="mail-compose-field">BCC<input aria-label="BCC recipients" placeholder="Hidden from other recipients" disabled={saving||uploading} value={editor.bcc} onChange={e=>setEditor({...editor,bcc:e.target.value})}/></label></>}
    <label className="mail-compose-field">Subject<input aria-label="Subject" placeholder="Give your message a subject" disabled={saving||uploading} value={editor.subject} onChange={e=>setEditor({...editor,subject:e.target.value})}/></label>
    <textarea className="mail-compose-body" aria-label="Message" placeholder="Write something thoughtful…" disabled={saving||uploading} value={editor.body} onChange={e=>setEditor({...editor,body:e.target.value})}/>
    {error&&<div className="mail-alert" role="alert">{error}</div>}
    </div>{cap.attachments&&<MailAttachments messageId={editor.draftId} allowUpload={!saving} ensureDraft={persistDraft} onBusyChange={setUploading} onSendReady={setAttachmentsReady} onChanged={()=>setReload(n=>n+1)}/>}</div>
    {cap.attachments&&!attachmentsReady&&!uploading&&editor.draftId&&<p className="mail-compose-help">Check pending or blocked attachments before sending.</p>}
    {!cap.outbound&&<p className="mail-compose-help"><LockKeyhole size={13}/> Sending is unavailable for this workspace. You can save drafts.</p>}
    <footer className="mail-compose-footer"><span role="status">{uploading?"Uploading files…":saving?"Saving…":editor.draftId&&!dirty?"Draft saved privately":dirty?"Unsaved changes":"Private message"}</span><button className="mail-button" disabled={saving||uploading} onClick={()=>submit(true)}><FileText size={15}/> Save draft</button><button className="mail-button mail-primary" title={!cap.outbound?"Sending is not configured for this workspace":undefined} disabled={saving||uploading||!attachmentsReady||!parseMailRecipients(editor.to).length||!cap.outbound} onClick={()=>submit(false)}><Send size={15}/> Send message</button></footer>
   </>}
  </DialogContent></Dialog>
  {confirmation}
 </section>;
}


