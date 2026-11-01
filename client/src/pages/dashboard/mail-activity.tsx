import {useEffect,useState} from "react";
import {Pause,Play,Bell,ArrowUpRight,Check,Plus,Inbox,ShieldAlert,FileText} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/mail-dialog";
export type ActivityMail={id:string;thread_id:string;subject:string;from_email:string;text_body:string;created_at:string};
type Activity={counts:{unread:number;spam:number;drafts:number};unread:ActivityMail[];drafts:{id:string;subject:string}[];reminders:{id:string;title:string;due_date:string}[]};
type Props={mailboxId:string;canWrite:boolean;reload:number;onFolder:(folder:string,filter?:string)=>void;onMessage:(message:ActivityMail)=>void;onDraft:(id:string)=>void};
async function api(path:string,method="GET",data?:unknown,signal?:AbortSignal){
 const r=await fetch(path,{method,credentials:"same-origin",cache:"no-store",signal,headers:data?{"Content-Type":"application/json"}:undefined,body:data?JSON.stringify(data):undefined});
 if(!r.ok){const problem=await r.json().catch(()=>null);throw Error(problem?.error||"Activity is unavailable. Try again.");}return r.json();
}
function dateText(value:string){const today=new Date();today.setHours(0,0,0,0);const due=new Date(value+"T00:00:00"),days=Math.round((due.getTime()-today.getTime())/86400000);return days<0?`Overdue · ${due.toLocaleDateString()}`:days===0?"Due today":`Due ${due.toLocaleDateString()}`;}
export default function MailActivity({mailboxId,canWrite,reload,onFolder,onMessage,onDraft}:Props){
 const [data,setData]=useState<Activity|null>(null),[error,setError]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [paused,setPaused]=useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 const [title,setTitle]=useState(""),[date,setDate]=useState("");
 useEffect(()=>{setData(null);setOpen(false);setTitle("");setDate("");},[mailboxId]);
 useEffect(()=>{
  if(!mailboxId)return;
  const controller=new AbortController();let fetching=false;
  const update=async()=>{if(fetching||document.hidden)return;fetching=true;try{const next=await api(`/api/mail/mailboxes/${encodeURIComponent(mailboxId)}/activity`,"GET",undefined,controller.signal);if(!controller.signal.aborted){setData(next);setError("");}}catch(e:any){if(!controller.signal.aborted)setError(e.message);}finally{fetching=false;}};
  void update();const interval=setInterval(update,60000);document.addEventListener("visibilitychange",update);
  return()=>{controller.abort();clearInterval(interval);document.removeEventListener("visibilitychange",update);};
 },[mailboxId,reload,refresh]);
 async function reminder(method:"POST"|"DELETE",id?:string){
  if(busy||!canWrite)return;setBusy(true);setError("");
  try{await api(`/api/mail/mailboxes/${encodeURIComponent(mailboxId)}/reminders${id?"/"+encodeURIComponent(id):""}`,method,method==="POST"?{title,dueDate:date}:undefined);if(method==="POST"){setTitle("");setDate("");}setRefresh(n=>n+1);}catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 const items=data?[
  ...data.unread.map(m=>({id:m.id,label:`UNREAD / ${m.from_email.split("@")[0]} — ${m.subject||"(No subject)"} · ${m.text_body.replace(/\s+/g," ")}`,click:()=>onMessage(m)})),
  ...data.reminders.map(r=>({id:r.id,label:`REMINDER / ${r.title} — ${dateText(r.due_date)}`,click:()=>setOpen(true)})),
  ...data.drafts.map(d=>({id:d.id,label:`CONTINUE DRAFT / ${d.subject||"Untitled message"}`,click:()=>canWrite?onDraft(d.id):onFolder("drafts")}))
 ]:[];
 return <>
  <footer className="mail-activity" aria-label="Mailbox activity">
   <div className="mail-activity-counts"><button aria-label={`Inbox unread: ${data?.counts.unread??"loading"}`} onClick={()=>onFolder("inbox","unread")}><Inbox size={14}/><b>{data?.counts.unread??"—"}</b><span>Unread</span></button><button aria-label={`Spam emails: ${data?.counts.spam??"loading"}`} onClick={()=>onFolder("spam")}><ShieldAlert size={14}/><b>{data?.counts.spam??"—"}</b><span>Spam</span></button><button aria-label={`Unfinished drafts: ${data?.counts.drafts??"loading"}`} onClick={()=>onFolder("drafts")}><FileText size={14}/><b>{data?.counts.drafts??"—"}</b><span>Drafts</span></button></div>
   <div className={`mail-ticker ${paused||open?"paused":""}`} aria-label="Unread previews and reminders"><div className="mail-ticker-track">{items.length?[0,1].map(copy=><div className="mail-ticker-copy" key={copy} aria-hidden={copy===1?true:undefined}>{items.map(item=><button key={item.id} tabIndex={-1} onClick={item.click}><span aria-hidden="true">▪</span>{item.label}</button>)}</div>):<span>{error?"Activity could not refresh. Open activity to retry.":!mailboxId?"Select a mailbox to see activity.":data?"ALL CLEAR_ No unread mail, reminders or unfinished drafts.":"Loading mailbox activity…"}</span>}</div></div>
   <div className="mail-activity-actions"><button aria-label={paused?"Play activity ticker":"Pause activity ticker"} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button><button className="mail-activity-open" disabled={!mailboxId} aria-label="Open activity and subscription reminders" onClick={()=>setOpen(true)}><Bell size={15}/><span>Activity</span><ArrowUpRight size={14}/></button></div>
  </footer>
  <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent variant="drawer" closeDisabled={busy} className="mail-activity-drawer"><DialogTitle>Mailbox activity_</DialogTitle><DialogDescription>Latest 10 unread emails, unfinished drafts, and your subscription reminders. Updated every minute while this tab is visible.</DialogDescription>
   {error&&<div className="mail-alert" role="alert">{error}<button className="mail-button" onClick={()=>setRefresh(n=>n+1)}>Retry</button></div>}
   <section><h3>Subscription reminders</h3><p className="mail-admin-help">Set renewal dates for this mailbox. These are your reminders; they do not change or cancel a subscription.</p>
    {data?.reminders.map(r=><div className="mail-reminder" key={r.id}><div><strong>{r.title}</strong><span>{dateText(r.due_date)}</span></div>{canWrite&&<button className="mail-icon-btn" disabled={busy} aria-label={`Complete reminder ${r.title}`} onClick={()=>reminder("DELETE",r.id)}><Check size={16}/></button>}</div>)}
    {data&&!data.reminders.length&&<p className="mail-activity-empty">No reminders yet.</p>}
    {canWrite&&<form className="mail-admin-form" onSubmit={e=>{e.preventDefault();void reminder("POST");}}><label>Subscription<input required maxLength={120} placeholder="e.g. Domain renewal" aria-label="Subscription name" value={title} disabled={busy} onChange={e=>setTitle(e.target.value)}/></label><label>Renewal date<input required type="date" aria-label="Renewal date" min="2000-01-01" max="2100-12-31" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label><button className="mail-button mail-primary" disabled={busy||!title.trim()||!date}><Plus size={15}/> Add reminder</button></form>}
   </section>
   <section><h3>Top 10 unread emails</h3>{data?.unread.map(m=><button className="mail-activity-row" key={m.id} onClick={()=>{setOpen(false);onMessage(m);}}><span>{m.from_email}</span><strong>{m.subject||"(No subject)"}</strong><small>{m.text_body}</small></button>)}{data&&!data.unread.length&&<p className="mail-activity-empty">You're all caught up.</p>}</section>
   <section><h3>Continue a draft {data?`(${data.counts.drafts})`:""}</h3>{data?.drafts.map(d=><button key={d.id} className="mail-activity-row" onClick={()=>{setOpen(false);canWrite?onDraft(d.id):onFolder("drafts");}}><strong>{d.subject||"Untitled message"}</strong><small>Saved in this mailbox · Continue editing →</small></button>)}{data&&!data.drafts.length&&<p className="mail-activity-empty">No unfinished drafts.</p>}{Boolean(data&&data.counts.drafts>5)&&<button className="mail-button" onClick={()=>{setOpen(false);onFolder("drafts");}}>View all drafts</button>}</section>
  </DialogContent></Dialog>
 </>;
}
