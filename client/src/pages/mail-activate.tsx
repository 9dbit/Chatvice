import {useState,type FormEvent} from "react";
import {Link} from "wouter";
import {ArrowRight,LockKeyhole} from "lucide-react";
import {MailBrand} from "./mail-landing";
import MailTheme from "../components/mail-theme";
export default function MailActivate(){
  const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get("token")||"");
  const [password,setPassword]=useState(""),[confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[email,setEmail]=useState("");
  async function activate(e:FormEvent){
    e.preventDefault();if(busy)return;
    if(password!==confirmation){setError("Passwords do not match.");return;}
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/mail-auth/activate",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||"Activation unavailable. Please try again.");
      setEmail(data.email);setPassword("");setConfirmation("");history.replaceState(null,"","/activate");
    }catch(e:any){setError(e.message||"Unable to connect to Mail.");}finally{setBusy(false);}
  }
  const valid=/^[0-9a-f]{64}$/.test(token);
  return <main className="cm-login"><header><MailBrand/><MailTheme/></header><div className="cm-login-layout"><section className="cm-login-intro"><span className="cm-eyebrow">YOUR PRIVATE INBOX</span><h1>HELLO, MAIL.<br/><em>MAKE IT YOURS_</em></h1><p>Create your password to activate your own mailbox account.</p></section><section className="cm-login-card"><span className="cm-login-lock"><LockKeyhole size={24}/></span><h2>{email?"ACCOUNT ACTIVATED_":"ACTIVATE ACCOUNT_"}</h2>
    {email?<><p role="status">Your password is ready for {email}. Sign in to open your inbox.</p><Link href="/login" className="cm-button cm-primary">Sign in <ArrowRight size={18}/></Link></>:!valid?<p role="alert" className="mail-alert">An activation link is required. Ask your workspace administrator for a new link, or start a new public signup.</p>:<><p>This link can be used once and expires after 24 hours.</p><form onSubmit={activate}><label>New password<input type="password" autoComplete="new-password" minLength={16} maxLength={256} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={16} maxLength={256} required disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><p className="cm-login-help">Use at least 16 characters. A long, unique passphrase works well.</p>{error&&<p role="alert" className="mail-alert">{error}</p>}<button className="cm-button cm-primary" disabled={busy}>{busy?"Activating…":"Activate account"}<ArrowRight size={18}/></button></form></>}
  </section></div></main>;
}
