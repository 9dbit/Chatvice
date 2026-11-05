import {useEffect, useRef, useState} from "react";
import {Link} from "wouter";
import {ArrowLeft, ArrowUpRight, Check, Copy, Plus, RefreshCw, ShieldCheck, Mail, Settings, Users, Globe, ChevronRight} from "lucide-react";
import {apiRequest} from "@/lib/queryClient";
import {Dialog, DialogContent, DialogTitle, DialogDescription, useMailConfirm} from "@/components/mail-dialog";
import MailArt from "@/components/mail-art";
import "./mail-workspace.css";
import "../../mail-retro.css";

type Domain={id:string;domain:string;status:string};
type Mailbox={id:string;local_part:string;domain:string;display_name:string;enabled:boolean};
type Dns={type:string;host:string;value:string;status:string};
type Alias={id:string;local_part:string;domain:string};
type Member={user_id:string;role:string};
type Setup={mailbox_id:string;status:string;state:string;last_error:string|null;login_enabled:boolean;invitation_valid:boolean};
type Onboarding={enabled:boolean;domains:string[];mailboxes:Setup[]};
type Invitation={activationUrl:string;expiresAt:string;address?:string};
const setupLabel=(s?:Setup)=>s?({pending:"Setup queued",checking:"Checking delivery",failed:"Setup needs attention",ready:"Ready",awaiting_activation:"Awaiting activation",disabled:"Disabled",domain_unavailable:"Domain setup unavailable"}[s.status]||s.status):"";
export default function MailAdminPage(){
 const [onboarding,setOnboarding]=useState<Onboarding>({enabled:false,domains:[],mailboxes:[]});
 const [standalone,setStandalone]=useState(true),[invitation,setInvitation]=useState<Invitation|null>(null),[linkCopied,setLinkCopied]=useState(false);
 const [domains,setDomains]=useState<Domain[]>([]),[boxes,setBoxes]=useState<Mailbox[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [modal,setModal]=useState<"domain"|"mailbox"|null>(null),[drawer,setDrawer]=useState<"dns"|"mailbox"|null>(null);
 const [newDomain,setNewDomain]=useState(""),[domainId,setDomainId]=useState(""),[local,setLocal]=useState(""),[display,setDisplay]=useState("");
 const [dns,setDns]=useState<Dns|null>(null),[dnsDomain,setDnsDomain]=useState<Domain|null>(null),[copied,setCopied]=useState(false);
 const [selected,setSelected]=useState(""),[detailLoading,setDetailLoading]=useState(false),[mailboxName,setMailboxName]=useState("");
 const [alias,setAlias]=useState(""),[aliasDomainId,setAliasDomainId]=useState(""),[aliases,setAliases]=useState<Alias[]>([]);
 const [memberId,setMemberId]=useState(""),[role,setRole]=useState("member"),[members,setMembers]=useState<Member[]>([]);
 const detailVersion=useRef(0),alive=useRef(true);const {confirm,confirmation}=useMailConfirm();
 const selectedBox=boxes.find(b=>b.id===selected);
 const selectedSetup=onboarding.mailboxes.find(s=>s.mailbox_id===selected);
 async function refreshSetup(){const r=await apiRequest("GET","/api/mail/onboarding/status");const data=await r.json();if(alive.current)setOnboarding(data);}
 async function refresh(){
  const [d,b]=await Promise.all([apiRequest("GET","/api/mail/domains"),apiRequest("GET","/api/mail/mailboxes")]);
  const [domainData,boxData]=await Promise.all([d.json(),b.json()]);
  if(alive.current){setDomains(domainData);setBoxes(boxData);}
  await refreshSetup();
 }
 useEffect(()=>{alive.current=true;refresh().catch((e:Error)=>{if(alive.current)setError(e.message)}).finally(()=>{if(alive.current)setLoading(false)});return()=>{alive.current=false;detailVersion.current++;};},[]);
 useEffect(()=>{
  if(!onboarding.mailboxes.some(s=>["pending","checking","awaiting_activation"].includes(s.status)))return;
  const timer=setInterval(()=>{void refreshSetup().catch(()=>{});},5000);return()=>clearInterval(timer);
 },[onboarding.mailboxes]);
 async function task(fn:()=>Promise<void>){
  setBusy(true);setError("");setNotice("");
  try{await fn();await refresh();if(alive.current)setNotice("Changes saved.");return true;}
  catch(e:any){if(alive.current)setError(e.message||"Mail admin request failed");return false;}
  finally{if(alive.current)setBusy(false);}
 }
 async function loadDetails(id:string){
  const version=++detailVersion.current;setDetailLoading(true);
  try{
   const [a,m]=await Promise.all([apiRequest("GET",`/api/mail/mailboxes/${id}/aliases`),apiRequest("GET",`/api/mail/mailboxes/${id}/members`)]);
   const [aliasData,memberData]=await Promise.all([a.json(),m.json()]);
   if(alive.current&&detailVersion.current===version){setAliases(aliasData);setMembers(memberData);}
  }catch(e:any){if(alive.current&&detailVersion.current===version)setError(e.message||"Mailbox details unavailable");}
  finally{if(alive.current&&detailVersion.current===version)setDetailLoading(false);}
 }
 function selectBox(box:Mailbox){
  setSelected(box.id);setMailboxName(box.display_name||"");setAlias("");setMemberId("");setRole("member");setAliases([]);setMembers([]);setError("");setNotice("");setDrawer("mailbox");
  setAliasDomainId(domains.find(d=>d.domain===box.domain&&d.status==="verified")?.id||"");void loadDetails(box.id);
 }
 async function showDns(domain:Domain){
  const version=++detailVersion.current;setDrawer("dns");setDnsDomain(domain);setDns(null);setCopied(false);setError("");setDetailLoading(true);
  try{const r=await apiRequest("GET",`/api/mail/domains/${domain.id}/dns`);const data=await r.json();if(alive.current&&version===detailVersion.current)setDns(data);}
  catch(e:any){if(alive.current&&version===detailVersion.current)setError(e.message||"DNS setup unavailable");}
  finally{if(alive.current&&version===detailVersion.current)setDetailLoading(false);}
 }
 function closeDrawer(){if(busy)return;detailVersion.current++;setDrawer(null);setError("");}
 function openCreate(next:"domain"|"mailbox"){setError("");setNotice("");setModal(next);}
 const problem=error?<p role="alert" className="mail-alert">{error}</p>:null;
 return <section className="mail-admin">
  <header className="mail-admin-heading"><div><Link href="/dashboard/mail" className="mail-admin-back"><ArrowLeft size={15}/> Back to inbox</Link><span className="mail-eyebrow">YOUR WORKSPACE, TOGETHER</span><h1>Mail settings</h1><p>Manage your domains, mailboxes, and the people who use them.</p></div><button className="mail-icon-btn" aria-label="Refresh settings" disabled={busy||loading} onClick={()=>{setError("");setLoading(true);refresh().catch((e:Error)=>setError(e.message)).finally(()=>setLoading(false));}}><RefreshCw size={18}/></button></header>
  {!modal&&!drawer&&problem}{notice&&!modal&&!drawer&&<p role="status" className="mail-notice"><Check size={16}/>{notice}</p>}
  <div className="mail-admin-overview"><div className="mail-admin-welcome"><div><span className="mail-eyebrow">A SPACE OF YOUR OWN</span><h2>Good conversations<br/>start with a connected team.</h2><p>Your addresses and access, all in one place.</p></div><MailArt kind="secure" className="mail-admin-art"/></div><div className="mail-admin-stat"><Globe size={22}/><strong>{domains.length}<span>Domains</span></strong><small>{domains.filter(d=>d.status==="verified").length} verified</small></div><div className="mail-admin-stat"><Mail size={22}/><strong>{boxes.length}<span>Mailboxes</span></strong><small>{boxes.filter(b=>b.enabled).length} enabled</small></div></div>
  <div className="mail-admin-grid"><section className="mail-admin-card"><header><div><span className="mail-admin-section-icon"><Globe size={19}/></span><h2>Domains</h2></div><button className="mail-button" onClick={()=>openCreate("domain")}><Plus size={16}/> Add domain</button></header><p className="mail-admin-description">Connect a domain your business calls home.</p>
   {loading?<p role="status" className="mail-admin-empty">Loading domains…</p>:!domains.length?<div className="mail-admin-empty"><Globe size={28}/><h3>Your first domain belongs here.</h3><p>Add your business domain to start setting up mailboxes.</p></div>:<div className="mail-admin-rows">{domains.map(d=><div className="mail-domain-row" key={d.id}><div><strong>{d.domain}</strong><span className={`mail-status ${d.status==="verified"?"is-verified":""}`}>{d.status==="verified"&&<Check size={11}/>} {d.status}</span></div><button className="mail-admin-text-button" onClick={()=>showDns(d)}>DNS setup <ArrowUpRight size={15}/></button></div>)}</div>}
   <p className="mail-admin-footnote"><ShieldCheck size={14}/> Verify ownership before adding aliases.</p>
  </section><section className="mail-admin-card"><header><div><span className="mail-admin-section-icon"><Mail size={19}/></span><h2>Mailboxes</h2></div><button className="mail-button mail-primary" onClick={()=>openCreate("mailbox")}><Plus size={16}/> New mailbox</button></header><p className="mail-admin-description">A clear place for every business conversation.</p>
   {loading?<p role="status" className="mail-admin-empty">Loading mailboxes…</p>:!boxes.length?<div className="mail-admin-empty"><MailArt kind="inbox"/><h3>Make room for your mail.</h3><p>Create a mailbox, then assign your team.</p></div>:<div className="mail-admin-rows">{boxes.map(b=><button key={b.id} className="mail-mailbox-row" onClick={()=>selectBox(b)}><span className="mail-avatar">{(b.display_name||b.local_part)[0]?.toUpperCase()}</span><span><strong>{b.local_part}@{b.domain}</strong><small>{b.display_name||"Mailbox"} · {setupLabel(onboarding.mailboxes.find(s=>s.mailbox_id===b.id))||(b.enabled?"Enabled":"Disabled")}</small></span><ChevronRight size={17}/></button>)}</div>}
  </section></div>
  <Dialog open={Boolean(modal)} onOpenChange={open=>{if(!open&&!busy){setModal(null);setError("");}}}><DialogContent className="mail-admin-modal" closeDisabled={busy} onInteractOutside={e=>{if(busy)e.preventDefault();}}>
   <span className="mail-dialog-symbol">{modal==="domain"?<Globe size={24}/>:<Mail size={24}/>}</span><DialogTitle>{modal==="domain"?"Connect your domain":"Create a mailbox"}</DialogTitle><DialogDescription>{modal==="domain"?"Add a domain you own, then verify it with a TXT record.":"Give your next conversation a home."}</DialogDescription>
   <form className="mail-admin-form" onSubmit={async e=>{e.preventDefault();if(busy)return;const ok=await task(async()=>{if(modal==="domain"){await apiRequest("POST","/api/mail/domains",{domain:newDomain.trim()});setNewDomain("");}else{const r=await apiRequest("POST","/api/mail/mailboxes",{domainId,localPart:local.trim(),displayName:display.trim(),...(onboarding.enabled&&standalone?{accountMode:"standalone"}:{})});const result=await r.json();if(result.activationUrl){setInvitation(result);setLinkCopied(false);}setLocal("");setDisplay("");}});if(ok)setModal(null);}}>
    {modal==="domain"?<label>Domain name<input aria-label="New mail domain" placeholder="yourcompany.com" autoCapitalize="none" autoCorrect="off" required value={newDomain} disabled={busy} onChange={e=>setNewDomain(e.target.value)}/></label>:<>
     <label>Domain<select aria-label="Choose domain" required value={domainId} disabled={busy} onChange={e=>setDomainId(e.target.value)}><option value="">Choose domain</option>{domains.map(d=><option key={d.id} value={d.id}>{d.domain} ({d.status})</option>)}</select></label>
     <label>Mailbox name<input aria-label="Mailbox username" placeholder="hello" required maxLength={64} pattern="[a-z0-9][a-z0-9._+\-]*" autoCapitalize="none" autoCorrect="off" value={local} disabled={busy} onChange={e=>setLocal(e.target.value)}/></label>
     <label>Display name<input aria-label="Display name" placeholder="Your team name" maxLength={120} value={display} disabled={busy} onChange={e=>setDisplay(e.target.value)}/></label>
     {onboarding.enabled&&<label>Account access<select aria-label="Account access" disabled={busy} value={standalone?"standalone":"shared"} onChange={e=>setStandalone(e.target.value==="standalone")}><option value="standalone">Independent account and inbox</option><option value="shared">Shared mailbox for existing members</option></select></label>}
     <p className="mail-admin-help">{onboarding.enabled&&standalone?"Creates a private inbox and a one-time activation link. Delivery is checked automatically; Ready appears after delivery and account activation succeed.":"New addresses receive mail after inbound routing and provider configuration are complete."}</p>
     {onboarding.enabled&&standalone&&domainId&&!onboarding.domains.includes(domains.find(d=>d.id===domainId)?.domain||"")&&<p role="alert" className="mail-alert">Automatic setup is not connected for this domain yet.</p>}
    </>}{problem}<div className="mail-modal-actions"><button type="button" className="mail-button" disabled={busy} onClick={()=>{setModal(null);setError("");}}>Cancel</button><button className="mail-button mail-primary" disabled={busy||(modal==="mailbox"&&(!domains.length||(onboarding.enabled&&standalone&&!onboarding.domains.includes(domains.find(d=>d.id===domainId)?.domain||""))))}>{busy?"Saving…":modal==="domain"?"Add domain":"Create mailbox"}<Plus size={16}/></button></div>
   </form>
  </DialogContent></Dialog>
  <Dialog open={Boolean(invitation)} onOpenChange={open=>{if(!open)setInvitation(null);}}><DialogContent className="mail-admin-modal"><DialogTitle>Mailbox account created</DialogTitle><DialogDescription>{invitation?.address||"Share this private activation link with the mailbox owner."}</DialogDescription><p>The owner sets their own password. This link expires in 24 hours and works once. Copy it now; it is not stored in readable form.</p><input aria-label="Activation link" readOnly value={invitation?.activationUrl||""} onFocus={e=>e.target.select()} style={{width:"100%"}}/><div className="mail-modal-actions"><button className="mail-button mail-primary" onClick={async()=>{try{await navigator.clipboard.writeText(invitation?.activationUrl||"");setLinkCopied(true);}catch{setLinkCopied(false);}}}><Copy size={16}/>{linkCopied?"Copied":"Copy activation link"}</button><button className="mail-button" onClick={()=>setInvitation(null)}>Done</button></div></DialogContent></Dialog>
  <Dialog open={Boolean(drawer)} onOpenChange={open=>{if(!open)closeDrawer();}}><DialogContent variant="drawer" className="mail-admin-drawer" closeDisabled={busy} onInteractOutside={e=>{if(busy)e.preventDefault();}}>
   <span className="mail-dialog-symbol">{drawer==="dns"?<Globe size={24}/>:<Settings size={24}/>}</span><DialogTitle>{drawer==="dns"?"Domain setup":"Mailbox settings"}</DialogTitle><DialogDescription>{drawer==="dns"?dnsDomain?.domain:selectedBox?`${selectedBox.local_part}@${selectedBox.domain}`:""}</DialogDescription>
   {problem}{notice&&<p role="status" className="mail-notice"><Check size={16}/>{notice}</p>}
   {detailLoading?<p role="status" className="mail-admin-help">Loading details…</p>:drawer==="dns"?dns&&<>
    <div className="mail-drawer-section"><h3>Verify your domain</h3><p>Add this TXT record at your DNS provider.</p><div className="mail-dns-value"><span>TYPE</span><code>{dns.type||"TXT"}</code></div><div className="mail-dns-value"><span>HOST</span><code>{dns.host}</code></div><div className="mail-dns-value"><span>VALUE</span><code>{dns.value}</code></div><button className="mail-button" onClick={async()=>{try{await navigator.clipboard.writeText(dns.value);setCopied(true);}catch{setError("Could not copy. Select and copy the TXT value above.");}}}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copied":"Copy value"}</button></div>
    <button className="mail-button mail-primary" disabled={busy} onClick={()=>task(async()=>{await apiRequest("POST",`/api/mail/domains/${dnsDomain?.id}/verify`,{});})}><ShieldCheck size={16}/>{busy?"Checking…":"Verify DNS"}</button><p className="mail-admin-help">TXT verification confirms ownership. MX, SPF, DKIM, and your sending provider still need their own configuration.</p>
   </>:selectedBox&&<>
    {selectedSetup&&<div className="mail-drawer-section"><h3>Independent account</h3><p role="status">{setupLabel(selectedSetup)} · Login {selectedSetup.login_enabled?"activated":"awaiting activation"}</p>{selectedSetup.last_error&&<p className="mail-alert">{selectedSetup.last_error}</p>}{!selectedSetup.login_enabled&&<button className="mail-button" disabled={busy} onClick={()=>task(async()=>{const r=await apiRequest("POST",`/api/mail/mailboxes/${selected}/onboarding/invitation`,{});setInvitation({...await r.json(),address:`${selectedBox.local_part}@${selectedBox.domain}`});setLinkCopied(false);})}>Create new activation link</button>}{selectedSetup.state==="failed"&&<button className="mail-button" disabled={busy} onClick={()=>task(async()=>{await apiRequest("POST",`/api/mail/mailboxes/${selected}/onboarding/retry`,{});})}>Retry delivery check</button>}<p className="mail-admin-help">The app attachment setting remains 40 MB. The current Cloudflare inbound route accepts at most 25 MiB per complete email.</p></div>}
    <div className="mail-drawer-section"><div className="mail-setting-row"><div><h3>Mailbox status</h3><p>{selectedBox.enabled?"Available to assigned members":"Access is disabled"}</p></div><button className="mail-toggle" role="switch" aria-checked={selectedBox.enabled} aria-label="Mailbox enabled" disabled={busy} onClick={async()=>{if(selectedBox.enabled&&!await confirm({title:"Disable this mailbox?",description:"Assigned members will lose access until this mailbox is enabled again.",confirm:"Disable mailbox",cancel:"Cancel"}))return;await task(async()=>{await apiRequest("PATCH",`/api/mail/mailboxes/${selected}`,{enabled:!selectedBox.enabled});});}}><span/></button></div>
     <form className="mail-admin-form" onSubmit={e=>{e.preventDefault();if(!busy)void task(async()=>{await apiRequest("PATCH",`/api/mail/mailboxes/${selected}`,{displayName:mailboxName.trim()});});}}><label>Display name<input aria-label="Mailbox display name" maxLength={120} disabled={busy} value={mailboxName} onChange={e=>setMailboxName(e.target.value)}/></label><button className="mail-button" disabled={busy||mailboxName.trim()===(selectedBox.display_name||"")}><Check size={15}/> Save name</button></form>
    </div>
    <div className="mail-drawer-section"><h3>Aliases</h3><p>Receive mail from another verified domain. Replies use this mailbox’s address.</p><form className="mail-admin-form" onSubmit={e=>{e.preventDefault();if(!busy)void task(async()=>{await apiRequest("POST",`/api/mail/mailboxes/${selected}/aliases`,{localPart:alias.trim(),domainId:aliasDomainId});setAlias("");await loadDetails(selected);});}}><label>Alias name<input aria-label="Alias name" placeholder="support" required maxLength={64} disabled={busy} value={alias} onChange={e=>setAlias(e.target.value)}/></label><label>Verified domain<select aria-label="Alias domain" required disabled={busy} value={aliasDomainId} onChange={e=>setAliasDomainId(e.target.value)}><option value="">Choose verified domain</option>{domains.filter(d=>d.status==="verified").map(d=><option key={d.id} value={d.id}>@{d.domain}</option>)}</select></label><button className="mail-button" disabled={busy||!alias.trim()||!aliasDomainId}><Plus size={15}/> Add alias</button></form>
     {aliases.map(a=><div className="mail-member-row" key={a.id}><span>{a.local_part}@{a.domain}</span><button className="mail-admin-text-button" disabled={busy} onClick={()=>task(async()=>{await apiRequest("DELETE",`/api/mail/mailboxes/${selected}/aliases/${a.id}`);await loadDetails(selected);})}>Remove</button></div>)}
    </div>
    <div className="mail-drawer-section"><h3><Users size={17}/> Team access</h3><p>Assign an existing Chatvice supervisor using their user ID.</p><form className="mail-admin-form" onSubmit={e=>{e.preventDefault();if(!busy)void task(async()=>{await apiRequest("POST",`/api/mail/mailboxes/${selected}/members`,{userId:memberId.trim(),role});setMemberId("");await loadDetails(selected);});}}><label>Supervisor ID<input aria-label="Supervisor ID" required disabled={busy} placeholder="User ID" value={memberId} onChange={e=>setMemberId(e.target.value)}/></label><label>Permission<select aria-label="Permission" disabled={busy} value={role} onChange={e=>setRole(e.target.value)}>{["member","viewer","owner"].map(x=><option key={x} value={x}>{x}</option>)}</select></label><button className="mail-button" disabled={busy||!memberId.trim()}><Plus size={15}/> Add member</button></form>
     {members.map(m=><div className="mail-member-row" key={m.user_id}><span>{m.user_id}<small>{m.role}</small></span><button className="mail-admin-text-button" disabled={busy} onClick={()=>task(async()=>{await apiRequest("DELETE",`/api/mail/mailboxes/${selected}/members/${encodeURIComponent(m.user_id)}`);await loadDetails(selected);})}>Revoke</button></div>)}
    </div>
   </>}
  </DialogContent></Dialog>{confirmation}
 </section>;
}
