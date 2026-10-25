import { useEffect, useState } from "react";
import { Inbox, Send, FileText, Archive, Trash2, Star, Mail, Plus, Search, Reply, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type Box = {id:string;local_part:string;domain:string;display_name:string};
type Thread = {id:string;subject:string;from_email:string;text_body:string;created_at:string;is_read:boolean;is_starred:boolean};
type Message = {id:string;from_email:string;to_emails:string[];subject:string;text_body:string;created_at:string};
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
 useEffect(()=>{apiRequest("GET","/api/mail/mailboxes").then(r=>r.json()).then((x:Box[])=>{setBoxes(x);if(x.length)setBox(x[0].id)}).catch(e=>setError(e.message))},[]);
 useEffect(()=>{if(!box)return;setLoading(true);setError("");setSelected("");apiRequest("GET",`/api/mail/threads?mailboxId=${encodeURIComponent(box)}&folder=${folder}`).then(r=>r.json()).then(setThreads).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[box,folder]);
 useEffect(()=>{if(!selected)return;apiRequest("GET",`/api/mail/threads/${selected}`).then(r=>r.json()).then(setMessages).catch(e=>setError(e.message))},[selected]);
 const current=threads.find(t=>t.id===selected);
 async function submit(draft:boolean){
  if(!box||!to.trim())return;
  setSaving(true);setError("");
  try{await apiRequest("POST","/api/mail/compose",{mailboxId:box,to:to.split(",").map(s=>s.trim()).filter(Boolean),subject,text:body,draft});
   setCompose(false);setTo("");setSubject("");setBody("");setFolder(draft?"drafts":"sent");
  }catch(e:any){setError(e.message)}finally{setSaving(false)}
 }
 const filtered=threads.filter(t=>(t.subject+" "+t.from_email+" "+t.text_body).toLowerCase().includes(search.toLowerCase()));
 return <section className="flex flex-col min-h-[75vh] overflow-hidden rounded-2xl border border-white/10 bg-[#090b0f] text-white">
  <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
   <div><h1 className="text-xl font-semibold">Chatvice <span className="text-orange-500">Mail</span></h1><p className="text-xs text-white/40">Private unified communications</p></div>
   <button onClick={()=>setCompose(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"><Plus size={16}/> Compose</button>
  </header>
  {error&&<div role="alert" className="bg-red-950/40 px-5 py-3 text-red-300 text-sm">{error}</div>}
  <div className="flex flex-col md:flex-row flex-1 min-h-[65vh]">
   <nav className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-3">
    <select aria-label="Mailbox" value={box} onChange={e=>setBox(e.target.value)} className="bg-white/10 text-white w-full rounded-lg p-2 text-xs mb-5">
    {boxes.map(b=><option className="bg-neutral-900" key={b.id} value={b.id}>{b.local_part}@{b.domain}</option>)}</select>
    {folders.map(f=><button key={f.name} onClick={()=>setFolder(f.name)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm text-left ${folder===f.name?"bg-orange-500/15 text-orange-400":"text-white/60 hover:bg-white/5"}`}><f.icon size={17}/>{f.label}</button>)}
    {!boxes.length&&<p className="text-xs text-white/40 px-3 mt-4">No mailbox assigned. Configure one in Mail Admin.</p>}
   </nav>
   <div className={`md:w-[35%] border-b md:border-b-0 md:border-r border-white/10 ${selected?"hidden md:block":""}`}>
    <label className="flex items-center gap-2 mx-3 my-4 px-3 py-2 bg-white/5 rounded-full"><Search size={16} className="text-white/40"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search loaded messages" className="w-full bg-transparent text-sm outline-none"/></label>
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
     {messages.map(m=><div key={m.id} className="border-b border-white/10 mb-5 pb-5"><p className="font-medium">{m.from_email}</p><p className="text-xs text-white/40 mb-4">{new Date(m.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap text-sm leading-7 text-white/80">{m.text_body}</p></div>)}
     <button onClick={()=>{setCompose(true);setSubject(current?.subject?.startsWith("Re:")?current.subject:"Re: "+(current?.subject||""));setTo(messages[messages.length-1]?.from_email||"")}} className="flex items-center gap-2 text-orange-400 text-sm"><Reply size={16}/> Reply</button>
    </>:<div className="h-full min-h-72 flex flex-col items-center justify-center text-white/35 gap-3"><Mail size={40}/><p>Select an email to read</p></div>}
   </article>
  </div>
  {compose&&<div className="fixed inset-0 bg-black/80 z-[100] flex justify-end"><div className="w-full max-w-2xl bg-[#111318] h-full p-6 flex flex-col gap-4">
   <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">New Message</h2><button onClick={()=>setCompose(false)} aria-label="Close compose">✕</button></div>
   <p className="text-sm text-white/40">From: {boxes.find(b=>b.id===box)?.local_part}@{boxes.find(b=>b.id===box)?.domain}</p>
   <input aria-label="Recipients" className="bg-white/5 p-3 rounded-xl" placeholder="To: address@example.com" value={to} onChange={e=>setTo(e.target.value)}/>
   <input aria-label="Subject" className="bg-white/5 p-3 rounded-xl" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)}/>
   <textarea aria-label="Message" className="flex-1 bg-white/5 p-4 rounded-xl resize-none" placeholder="Write a message..." value={body} onChange={e=>setBody(e.target.value)}/>
   <div className="flex justify-end gap-3"><button disabled={saving} onClick={()=>submit(true)} className="px-4 py-2 rounded-full bg-white/10">Save Draft</button><button disabled={saving} onClick={()=>submit(false)} className="px-6 py-2 rounded-full bg-orange-500 text-black font-semibold">Queue Send</button></div>
  </div></div>}
 </section>;
}
