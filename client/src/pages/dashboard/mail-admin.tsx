import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Copy, Plus, RefreshCw, ShieldCheck, Mail, Settings, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type Domain = {id:string;domain:string;status:string};
type Mailbox = {id:string;local_part:string;domain:string;display_name:string;enabled:boolean};
type Dns = {type:string;host:string;value:string;status:string};
export default function MailAdminPage(){
 const [domains,setDomains]=useState<Domain[]>([]);
 const [boxes,setBoxes]=useState<Mailbox[]>([]);
 const [newDomain,setNewDomain]=useState("");
 const [domainId,setDomainId]=useState("");
 const [local,setLocal]=useState("");
 const [display,setDisplay]=useState("");
 const [dns,setDns]=useState<Dns|null>(null);
 const [selected,setSelected]=useState("");
 const [alias,setAlias]=useState("");
 const [aliases,setAliases]=useState<{id:string;local_part:string;domain:string}[]>([]);
 const [memberId,setMemberId]=useState("");
 const [role,setRole]=useState("member");
 const [members,setMembers]=useState<{user_id:string;role:string}[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function refresh(){
  const [d,b]=await Promise.all([apiRequest("GET","/api/mail/domains"),apiRequest("GET","/api/mail/mailboxes")]);
  setDomains(await d.json());setBoxes(await b.json());
 }
 useEffect(()=>{refresh().catch((e:Error)=>setError(e.message))},[]);
 async function task(fn:()=>Promise<void>){
  setBusy(true);setError("");setNotice("");
  try{await fn();await refresh();setNotice("Changes saved.");}
  catch(e:any){setError(e.message||"Mail admin request failed");}finally{setBusy(false);}
 }
 async function selectBox(id:string){
  setSelected(id);setError("");
  try{
   const [a,m]=await Promise.all([
    apiRequest("GET",`/api/mail/mailboxes/${id}/aliases`),
    apiRequest("GET",`/api/mail/mailboxes/${id}/members`)
   ]);
   setAliases(await a.json());setMembers(await m.json());
  }catch(e:any){setError(e.message)}
 }
 const input="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/60";
 const action="px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-black font-semibold text-sm inline-flex items-center justify-center gap-2";
 return <section className="min-h-[75vh] bg-[#090b0f] text-white rounded-2xl border border-white/10 p-5 md:p-7 space-y-8">
   <header className="flex items-center justify-between gap-4">
    <div><Link href="/dashboard/mail" className="inline-flex items-center gap-2 text-white/50 text-xs mb-3 hover:text-white"><ArrowLeft size={14}/> Back to inbox</Link>
      <h1 className="text-2xl font-semibold">Chatvice <span className="text-orange-500">Mail Admin</span></h1>
      <p className="text-sm text-white/50">Private domains, mailboxes, and access management</p></div>
    <button onClick={()=>task(refresh)} disabled={busy} className="p-3 rounded-full bg-white/10" aria-label="Refresh"><RefreshCw size={18}/></button>
   </header>
   {error&&<p role="alert" className="bg-red-950/40 text-red-300 p-3 rounded-lg">{error}</p>}
   {notice&&<p role="status" className="bg-white/5 text-green-300 p-3 rounded-lg">{notice}</p>}
   <div className="grid lg:grid-cols-2 gap-6">
    <div className="bg-white/[.025] rounded-2xl p-5 border border-white/10 space-y-5">
     <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-orange-400"/> Domain Verification</h2>
     <div className="flex gap-2"><input className={input} aria-label="New mail domain" placeholder="example.com" value={newDomain} onChange={e=>setNewDomain(e.target.value)}/>
      <button disabled={busy||!newDomain.trim()} className={action} onClick={()=>task(async()=>{await apiRequest("POST","/api/mail/domains",{domain:newDomain});setNewDomain("")})}><Plus size={16}/> Add</button>
     </div>
     <div className="space-y-2">{domains.map(d=><div key={d.id} className="p-3 rounded-xl border border-white/10">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{d.domain}</span><span className={`text-xs ${d.status==="verified"?"text-green-400":"text-yellow-400"}`}>{d.status}</span></div>
      <div className="flex gap-3 mt-3 text-xs"><button className="text-orange-400" onClick={()=>task(async()=>{const r=await apiRequest("GET",`/api/mail/domains/${d.id}/dns`);setDns(await r.json());setDomainId(d.id)})}>View TXT setup</button>
      <button className="text-white/70" disabled={busy} onClick={()=>task(async()=>{await apiRequest("POST",`/api/mail/domains/${d.id}/verify`,{});})}>Verify DNS</button></div>
     </div>)}</div>
     {dns&&<div className="rounded-xl bg-white/5 p-4 text-xs space-y-2"><p className="text-orange-400">Add this TXT record to your DNS provider</p>
      <p className="break-all">Host: {dns.host}</p><p className="break-all">Value: {dns.value}</p>
      <button onClick={()=>navigator.clipboard.writeText(dns.value)} className="flex items-center gap-2 text-white/70"><Copy size={13}/> Copy value</button>
      <p className="text-white/40">TXT proof alone does not configure MX, SPF, DKIM or sending provider.</p></div>}
    </div>
    <div className="bg-white/[.025] rounded-2xl p-5 border border-white/10 space-y-5">
     <h2 className="font-semibold flex items-center gap-2"><Mail size={18} className="text-orange-400"/> Create Mailbox</h2>
     <select className={input} aria-label="Choose domain" value={domainId} onChange={e=>setDomainId(e.target.value)}>
      <option className="bg-neutral-900" value="">Choose domain</option>
      {domains.map(d=><option className="bg-neutral-900" key={d.id} value={d.id}>{d.domain} ({d.status})</option>)}
     </select>
     <input className={input} aria-label="Mailbox username" placeholder="Mailbox name: hello, master, support..." value={local} onChange={e=>setLocal(e.target.value)}/>
     <input className={input} aria-label="Display name" placeholder="Display name" value={display} onChange={e=>setDisplay(e.target.value)}/>
     <button className={action} disabled={busy||!domainId||!local} onClick={()=>task(async()=>{await apiRequest("POST","/api/mail/mailboxes",{domainId,localPart:local,displayName:display});setLocal("");setDisplay("")})}><Plus size={16}/> Create Mailbox</button>
     <p className="text-xs text-white/40">New addresses become receiving mailboxes only after inbound routing and provider configuration.</p>
    </div>
   </div>
   <div className="grid lg:grid-cols-[minmax(250px,0.75fr)_1fr] gap-6">
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 space-y-4">
     <h2 className="font-semibold">Mailboxes</h2>
     {boxes.length===0&&<p className="text-white/40 text-sm">No mailboxes configured.</p>}
     {boxes.map(b=><button key={b.id} onClick={()=>selectBox(b.id)} className={`w-full rounded-xl p-3 text-left border ${selected===b.id?"border-orange-500/40 bg-orange-500/10":"border-white/10"}`}>
      <p className="text-sm font-medium">{b.local_part}@{b.domain}</p><p className="text-xs text-white/40 mt-1">{b.display_name||"Mailbox"} · {b.enabled?"Enabled":"Disabled"}</p>
     </button>)}
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 space-y-5">
     <h2 className="font-semibold flex items-center gap-2"><Settings size={18}/> Mailbox Settings</h2>
     {!selected?<p className="text-white/40 text-sm">Select a mailbox to manage its aliases and supervisor access.</p>:<>
      <div className="flex justify-between text-sm">
       <span>Mailbox status</span><button className="text-orange-400" disabled={busy} onClick={()=>task(async()=>{const b=boxes.find(x=>x.id===selected);await apiRequest("PATCH",`/api/mail/mailboxes/${selected}`,{enabled:!b?.enabled})})}>
        {boxes.find(b=>b.id===selected)?.enabled?"Disable mailbox":"Enable mailbox"}
       </button>
      </div>
      <div className="border-t border-white/10 pt-4"><h3 className="text-sm font-medium mb-3">Aliases</h3>
       <div className="flex gap-2"><input className={input} value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Alias name"/>
        <button className={action} disabled={busy||!alias} onClick={()=>task(async()=>{await apiRequest("POST",`/api/mail/mailboxes/${selected}/aliases`,{localPart:alias});setAlias("");await selectBox(selected)})}><Plus size={16}/></button></div>
       {aliases.map(a=><div key={a.id} className="flex justify-between mt-2 text-xs text-white/60"><span>{a.local_part}@{a.domain}</span><button className="text-red-300" onClick={()=>task(async()=>{await apiRequest("DELETE",`/api/mail/mailboxes/${selected}/aliases/${a.id}`);await selectBox(selected)})}>Remove</button></div>)}
      </div>
      <div className="border-t border-white/10 pt-4"><h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Users size={15}/> Team Access</h3>
       <p className="text-xs text-white/40 mb-3">Assign an existing Chatvice supervisor by their user ID.</p>
       <div className="flex flex-col sm:flex-row gap-2"><input className={input} value={memberId} onChange={e=>setMemberId(e.target.value)} placeholder="Supervisor ID"/>
        <select aria-label="Permission" className={input} value={role} onChange={e=>setRole(e.target.value)}>{["member","viewer","owner"].map(x=><option className="bg-neutral-900" key={x} value={x}>{x}</option>)}</select>
        <button className={action} disabled={busy||!memberId} onClick={()=>task(async()=>{await apiRequest("POST",`/api/mail/mailboxes/${selected}/members`,{userId:memberId,role});setMemberId("");await selectBox(selected)})}><Check size={16}/></button></div>
       {members.map(m=><div key={m.user_id} className="flex justify-between mt-2 text-xs text-white/60"><span>{m.user_id} · {m.role}</span>
         <button className="text-red-300" onClick={()=>task(async()=>{await apiRequest("DELETE",`/api/mail/mailboxes/${selected}/members/${encodeURIComponent(m.user_id)}`);await selectBox(selected)})}>Revoke</button></div>)}
      </div>
     </>}
    </div>
   </div>
 </section>;
}
