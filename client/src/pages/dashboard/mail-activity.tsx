import {useEffect,useState,type RefObject} from "react";
import {Check,Plus,Inbox,ShieldAlert,FileText} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/mail-dialog";
export type ActivityMail={id:string;thread_id:string;subject:string;from_email:string;text_body:string;created_at:string};
type Activity={counts:{unread:number;spam:number;drafts:number};unread:ActivityMail[];drafts:{id:string;subject:string}[];reminders:{id:string;title:string;due_date:string}[]};
type Props={open:boolean;onOpenChange:(open:boolean)=>void;returnFocusRef:RefObject<HTMLButtonElement>;mailboxId:string;canWrite:boolean;reload:number;onFolder:(folder:string,filter?:string)=>void;onMessage:(message:ActivityMail)=>void;onDraft:(id:string)=>void};
async function api(path:string,method="GET",data?:unknown,signal?:AbortSignal){
 const r=await fetch(path,{method,credentials:"same-origin",cache:"no-store",signal,headers:data?{"Content-Type":"application/json"}:undefined,body:data?JSON.stringify(data):undefined});
 if(!r.ok){const problem=await r.json().catch(()=>null);throw Error(problem?.error||"Activity is unavailable. Try again.");}return r.json();
}
function dateText(value:string){const today=new Date();today.setHours(0,0,0,0);const due=new Date(value+"T00:00:00"),days=Math.round((due.getTime()-today.getTime())/86400000);return days<0?`Overdue · ${due.toLocaleDateString()}`:days===0?"Due today":`Due ${due.toLocaleDateString()}`;}
export default function MailActivity({open,onOpenChange:setOpen,returnFocusRef,mailboxId,canWrite,reload,onFolder,onMessage,onDraft}:Props){
 const [data,setData]=useState<Activity|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [title,setTitle]=useState(""),[date,setDate]=useState("");
 useEffect(()=>{setData(null);setTitle("");setDate("");},[mailboxId]);
 useEffect(()=>{
  if(!mailboxId||!open)return;
  const controller=new AbortController();let fetching=false;
  const update=async()=>{if(fetching||document.hidden)return;fetching=true;try{const next=await api(`/api/mail/mailboxes/${encodeURIComponent(mailboxId)}/activity`,"GET",undefined,controller.signal);if(!controller.signal.aborted){setData(next);setError("");}}catch(e:any){if(!controller.signal.aborted)setError(e.message);}finally{fetching=false;}};
  void update();const interval=setInterval(update,60000);document.addEventListener("visibilitychange",update);
  return()=>{controller.abort();clearInterval(interval);document.removeEventListener("visibilitychange",update);};
 },[mailboxId,reload,refresh,open]);
 async function reminder(method:"POST"|"DELETE",id?:string){
  if(busy||!canWrite)return;setBusy(true);setError("");
  try{await api(`/api/mail/mailboxes/${encodeURIComponent(mailboxId)}/reminders${id?"/"+encodeURIComponent(id):""}`,method,method==="POST"?{title,dueDate:date}:undefined);if(method==="POST"){setTitle("");setDate("");}setRefresh(n=>n+1);}catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 return <>
  <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent variant="drawer" closeDisabled={busy} className="mail-activity-drawer" onCloseAutoFocus={event=>{event.preventDefault();returnFocusRef.current?.focus();}}><DialogTitle>Mailbox activity_</DialogTitle><DialogDescription>Latest 10 unread emails, unfinished drafts, and your subscription reminders. Updated every minute while this panel is open.</DialogDescription>
   <div className="mail-activity-summary"><button className="mail-button" aria-label={`Inbox unread: ${data?.counts.unread??"loading"}`} onClick={()=>onFolder("inbox","unread")}><Inbox size={14}/> {data?.counts.unread??"—"} unread</button><button className="mail-button" aria-label={`Spam emails: ${data?.counts.spam??"loading"}`} onClick={()=>onFolder("spam")}><ShieldAlert size={14}/> {data?.counts.spam??"—"} spam</button><button className="mail-button" aria-label={`Unfinished drafts: ${data?.counts.drafts??"loading"}`} onClick={()=>onFolder("drafts")}><FileText size={14}/> {data?.counts.drafts??"—"} drafts</button></div>
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
