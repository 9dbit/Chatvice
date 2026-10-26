import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Inbox, Send, FileText, Archive, Trash2, Star, Mail, Plus, Search, Reply, ArrowLeft, Settings, UserRoundPlus, ShieldCheck, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import MailAttachments from "./mail-attachments";

type Box = {id:string;local_part:string;domain:string;display_name:string};
type Thread = {id:string;subject:string;from_email:string;text_body:string;created_at:string;is_read:boolean;is_starred:boolean};
type Message = {id:string;status:string;direction:string;from_email:string;to_emails:string[];subject:string;text_body:string;created_at:string;is_read:boolean;is_starred:boolean};
type Context = {sender:string|null;lead:{id:string;customer_name:string|null;customer_email:string;stage:string;score:number;source:string;last_contact_at:string|null}|null};
const folders=[{name:"inbox",label:"Inbox",icon:Inbox},{name:"sent",label:"Sent",icon:Send},{name:"drafts",label:"Drafts",icon:FileText},{name:"archive",label:"Archive",icon:Archive},{name:"trash",label:"Trash",icon:Trash2}];
export default function MailPage(){
 const [boxes,setBoxes]=useState<Box[]>([]);
 const [box,setBox]=useState("");
 const [folder,setFolder]=useState("inbox");
 const [threads,setThreads]=useState<Thread[]>([]);
 const [selected,setSelected]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [compose,setCompose]=useState(false);
 const [to,setTo]=useState("");
 const [subject,setSubject]=useState("");
 const [body,setBody]=useState("");
 const [saving,setSaving]=useState(false);
 const [search,setSearch]=useState("");
 const [context,setContext]=useState<Context|null>(null);
 const [replyToId,setReplyToId]=useState<string|undefined>();
 const [aiSummary,setAiSummary]=useState("");
 const [aiLoading,setAiLoading]=useState(false);
 const [draftId,setDraftId]=useState<string|undefined>();
 const [draftSaved,setDraftSaved]=useState(false);
 const [reload,setReload]=useState(0);
 useEffect(()=>{apiRequest("GET","/api/mail/mailboxes").then(r=>r.json()).then((x:Box[])=>{setBoxes(x);if(x.length)setBox(x[0].id)}).catch(e=>setError(e.message))},[]);
 useEffect(()=>{
  if(!box)return;
  let active=true;setLoading(true);setError("");setSelected("");setThreads([]);
  apiRequest("GET",`/api/mail/threads?mailboxId=${encodeURIComponent(box)}&folder=${folder}`)
   .then(r=>r.json()).then(x=>{if(active)setThreads(x)})
   .catch(e=>{if(active)setError(e.message)})
   .finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[box,folder,reload]);
 function changeMailbox(next:string){
  if(saving || next===box)return;
  if(compose&&!window.confirm("Switching mailboxes closes the current editor. Saved drafts stay in the original mailbox. Continue?"))return;
  setCompose(false);setDraftId(undefined);setDraftSaved(false);setReplyToId(undefined);
  setTo("");setSubject("");setBody("");setMessages([]);setContext(null);setAiSummary("");
  setBox(next);
 }
 useEffect(()=>{
  if(!selected){setMessages([]);setContext(null);return;}
  setMessages([]);setContext(null);setAiSummary("");
  let active=true;
  Promise.all([
   apiRequest("GET",`/api/mail/threads/${selected}`).then(r=>r.json()),
   apiRequest("GET",`/api/mail/threads/${selected}/context`).then(r=>r.json()),
  ]).then(([m,c])=>{if(active){setMessages(m);setContext(c)}})
   .catch(e=>{if(active)setError(e.message)});
  return ()=>{active=false};
 },[selected]);
 const current=threads.find(t=>t.id===selected);
 async function submit(draft:boolean){
  if(!box||!to.trim())return;
  const toEmails=to.split(",").map(s=>s.trim()).filter(Boolean);
  setSaving(true);setError("");
  try {
   if(draftId){
    await apiRequest("PATCH",`/api/mail/drafts/${draftId}`,{to:toEmails,subject,text:body});
    if(!draft)await apiRequest("POST",`/api/mail/drafts/${draftId}/send`,{});
   }else{
    const result=await apiRequest("POST","/api/mail/compose",{
      mailboxId:box,to:toEmails,subject,text:body,draft,replyToId
    });
    const saved:{id:string}=await result.json();
    if(draft)setDraftId(saved.id);
   }
   setReload(x=>x+1);
   if(draft){setDraftSaved(true);return;}
   setCompose(false);setTo("");setSubject("");setBody("");
   setReplyToId(undefined);setDraftId(undefined);setDraftSaved(false);setFolder("sent");
  }catch(e:any){setError(e.message||"Mail request failed")}finally{setSaving(false)}
 }
 function openDraft(message:Message){
  setDraftId(message.id);setDraftSaved(true);
  setReplyToId(undefined);setCompose(true);
  setTo(Array.isArray(message.to_emails)?message.to_emails.join(", "):"");
  setSubject(message.subject);setBody(message.text_body);
 }
 async function aiTask(task:"summary"|"draft"){
  if(!selected||!window.confirm("AI Mail sends a shortened email excerpt to an external AI provider. Common email addresses and phone numbers are redacted, but other personal information may remain. Continue?"))return;
  setAiLoading(true);setError("");
  try{
   const res=await apiRequest("POST",`/api/mail/threads/${selected}/ai`,{task,acknowledgeExternalProcessing:true,tone:"professional"});
   const data:{text:string}=await res.json();
   if(task==="summary")setAiSummary(data.text);
   else {
    const incoming=messages.filter(m=>m.direction==="inbound").at(-1);
    setReplyToId(incoming?.id);
    setTo(incoming?.from_email||"");
    setSubject(current?.subject?.startsWith("Re:")?current.subject:"Re: "+(current?.subject||""));
    setBody(data.text);setDraftId(undefined);setDraftSaved(false);setCompose(true);
   }
  }catch(e:any){setError(e.message)}finally{setAiLoading(false)}
 }
 const filtered=threads.filter(t=>(t.subject+" "+t.from_email+" "+t.text_body).toLowerCase().includes(search.toLowerCase()));
 return <section className="flex flex-col min-h-[75vh] overflow-hidden rounded-2xl border border-white/10 bg-[#090b0f] text-white">
  <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
   <div><h1 className="text-xl font-semibold">Chatvice <span className="text-orange-500">Mail</span></h1><p className="text-xs text-white/40">Private unified communications</p></div>
   <div className="flex items-center gap-2"><Link href="/dashboard/mail/admin" className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-white/75 text-sm hover:bg-white/10"><Settings size={16}/><span className="hidden sm:inline">Mail Admin</span></Link>
   <button onClick={()=>{setCompose(true);setReplyToId(undefined);setDraftId(undefined);setDraftSaved(false);setTo("");setSubject("");setBody("")}} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"><Plus size={16}/> Compose</button></div>
  </header>
  {error&&<div role="alert" className="bg-red-950/40 px-5 py-3 text-red-300 text-sm">{error}</div>}
  <div className="flex flex-col md:flex-row flex-1 min-h-[65vh]">
   <nav className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-3">
    <select aria-label="Mailbox" value={box} disabled={saving} onChange={e=>changeMailbox(e.target.value)} className="bg-white/10 text-white w-full rounded-lg p-2 text-xs mb-5">
    {boxes.map(b=><option className="bg-neutral-900" key={b.id} value={b.id}>{b.local_part}@{b.domain}</option>)}</select>
    {folders.map(f=><button key={f.name} onClick={()=>setFolder(f.name)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm text-left ${folder===f.name?"bg-orange-500/15 text-orange-400":"text-white/60 hover:bg-white/5"}`}><f.icon size={17}/>{f.label}</button>)}
    {!boxes.length&&<p className="text-xs text-white/40 px-3 mt-4">No mailbox assigned. Configure one in Mail Admin.</p>}
   </nav>
   <div className={`md:w-[35%] border-b md:border-b-0 md:border-r border-white/10 ${selected?"hidden md:block":""}`}>
    <label className="flex items-center gap-2 mx-3 my-4 px-3 py-2 bg-white/5 rounded-full"><Search size={16} className="text-white/40"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search loaded messages" className="w-full bg-transparent text-sm outline-none"/></label>
    <div className="px-4 pb-3 text-xs text-white/45 flex gap-4"><span>{filtered.length} loaded threads</span><span>{filtered.filter(t=>!t.is_read).length} unread previews</span></div>
    {loading&&<p className="p-5 text-white/50">Loading inbox...</p>}
    {!loading&&!filtered.length&&<p className="p-5 text-white/50 text-sm">No messages in this folder.</p>}
    <div className="max-h-[65vh] overflow-auto">{filtered.map(t=><button key={t.id} onClick={()=>setSelected(t.id)} className={`w-full text-left px-4 py-4 border-b border-white/10 hover:bg-white/5 ${selected===t.id?"bg-orange-500/10":""}`}>
     <div className="flex justify-between gap-2 text-sm"><span className={t.is_read?"text-white/80":"font-bold"}>{t.from_email}</span><span className="text-white/40 text-xs shrink-0">{new Date(t.created_at).toLocaleDateString()}</span></div>
     <p className="text-sm font-semibold mt-1 truncate">{t.subject||"(No subject)"}</p><p className="text-xs text-white/50 mt-1 truncate">{t.text_body}</p>
    </button>)}</div>
   </div>
   <article className="flex-1 min-w-0 p-5">
    {selected?<><button className="md:hidden flex items-center gap-2 text-orange-400 mb-4" onClick={()=>setSelected("")}><ArrowLeft size={18}/> Back</button>
     <h2 className="text-xl font-semibold mb-5">{current?.subject||"Conversation"}</h2>
     <div className="flex flex-wrap gap-2 mb-5">
      <button disabled={aiLoading} onClick={()=>aiTask("summary")} className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-orange-300"><Sparkles size={14}/> AI Summary</button>
      <button disabled={aiLoading} onClick={()=>aiTask("draft")} className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-orange-300"><Sparkles size={14}/> Draft Reply</button>
     </div>
     {aiSummary&&<div className="p-4 mb-5 bg-orange-500/10 border border-orange-500/20 rounded-xl"><p className="font-semibold text-orange-300 mb-2 text-sm">AI Summary · Review before use</p><p className="whitespace-pre-wrap text-sm text-white/75">{aiSummary}</p></div>}
     {messages.map(m=><div key={m.id} className="border-b border-white/10 mb-5 pb-5"><p className="font-medium">{m.from_email}</p><p className="text-xs text-white/40 mb-4">{new Date(m.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap text-sm leading-7 text-white/80">{m.text_body}</p>
      <div className="mt-4"><MailAttachments messageId={m.id} compact/></div>
      {m.status==="draft"&&<button className="mt-4 text-orange-400 text-sm" onClick={()=>openDraft(m)}>Edit draft & attachments</button>}
     </div>)}
     <button onClick={()=>{
      const incoming=messages.filter(m=>m.direction==="inbound").at(-1);
      if(!incoming)return;
      setReplyToId(incoming.id);setDraftId(undefined);setDraftSaved(false);setCompose(true);setBody("");
      setSubject(current?.subject?.startsWith("Re:")?current.subject:"Re: "+(current?.subject||""));
      setTo(incoming.from_email);
     }} className="flex items-center gap-2 text-orange-400 text-sm"><Reply size={16}/> Reply</button>
    </>:<div className="h-full min-h-72 flex flex-col items-center justify-center text-white/35 gap-3"><Mail size={40}/><p>Select an email to read</p></div>}
   </article>
   {selected&&<aside className="hidden xl:flex xl:w-64 shrink-0 flex-col border-l border-white/10 p-4 gap-5">
    <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-medium"><ShieldCheck size={16} className="text-orange-400"/> Customer 360</div>
    {context?.sender&&<div className="space-y-2">
     <div className="h-12 w-12 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-300 font-semibold">{context.sender.slice(0,1).toUpperCase()}</div>
     <p className="break-all text-sm">{context.sender}</p>
     <p className="text-xs text-white/40">Email contact</p>
    </div>}
    {context?.lead?<div className="rounded-xl bg-white/5 p-3 space-y-2 text-sm">
      <p className="font-semibold">{context.lead.customer_name||"Customer Lead"}</p>
      <p className="text-xs text-white/50">CRM linked · {context.lead.source||"mail"}</p>
      <p>Stage: <span className="text-orange-300">{context.lead.stage}</span></p>
      <p>Lead score: {context.lead.score??0}/100</p>
    </div>:context?.sender?<button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-orange-500/15 text-orange-300 text-sm" onClick={async()=>{
      try{
       await apiRequest("POST",`/api/mail/threads/${selected}/convert-to-lead`,{});
       const res=await apiRequest("GET",`/api/mail/threads/${selected}/context`);
       setContext(await res.json());
      }catch(e:any){setError(e.message)}
    }}><UserRoundPlus size={16}/> Convert to Lead</button>:<p className="text-xs text-white/40">No linked contact</p>}
    <div className="border-t border-white/10 pt-4 text-xs text-white/40">Customer data is visible only to authorized mailbox members. AI analysis is disabled by default.</div>
   </aside>}
  </div>
  {compose&&<div className="fixed inset-0 bg-black/80 z-[100] flex justify-end"><div className="w-full max-w-2xl bg-[#111318] h-full p-6 flex flex-col gap-4">
   <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">{draftId?"Edit Draft":"New Message"}</h2><button onClick={()=>setCompose(false)} aria-label="Close compose">✕</button></div>
   <p className="text-sm text-white/40">From: {boxes.find(b=>b.id===box)?.local_part}@{boxes.find(b=>b.id===box)?.domain}</p>
   <input aria-label="Recipients" className="bg-white/5 p-3 rounded-xl" placeholder="To: address@example.com" value={to} onChange={e=>setTo(e.target.value)}/>
   <input aria-label="Subject" className="bg-white/5 p-3 rounded-xl" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)}/>
   <textarea aria-label="Message" className="flex-1 bg-white/5 p-4 rounded-xl resize-none" placeholder="Write a message..." value={body} onChange={e=>setBody(e.target.value)}/>
   {draftId&&<div className="rounded-xl border border-white/10 p-3"><MailAttachments messageId={draftId} allowUpload/></div>}
   {!draftId&&<p className="text-xs text-white/40">Save as Draft first to add private attachments. File access is locked until malware scanning passes.</p>}
   {draftSaved&&<p role="status" className="text-xs text-green-400">Draft saved privately</p>}
   <div className="flex justify-end gap-3"><button disabled={saving} onClick={()=>submit(true)} className="px-4 py-2 rounded-full bg-white/10">Save Draft</button><button disabled={saving} onClick={()=>submit(false)} className="px-6 py-2 rounded-full bg-orange-500 text-black font-semibold">Queue Send</button></div>
  </div></div>}
 </section>;
}

