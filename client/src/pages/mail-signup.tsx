import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link} from "wouter";
import {ArrowRight,CheckCircle2,LockKeyhole,Mail,ShieldCheck} from "lucide-react";
import {MailBrand} from "./mail-landing";
import MailTheme from "../components/mail-theme";

type Config={enabled:boolean;domain:string|null;siteKey:string|null};
type TurnstileWidget={
  render:(element:HTMLElement,options:{
    sitekey:string;action:string;callback:(token:string)=>void;
    "expired-callback":()=>void;"error-callback":()=>void;
  })=>string|number;
  reset:(id?:string|number)=>void;
  remove:(id?:string|number)=>void;
};
declare global {interface Window {turnstile?:TurnstileWidget}}

export default function MailSignup(){
  const [config,setConfig]=useState<Config|null>(null),[error,setError]=useState("");
  const [busy,setBusy]=useState(false),[sent,setSent]=useState(false);
  const [contactEmail,setContactEmail]=useState(""),[localPart,setLocalPart]=useState("");
  const [displayName,setDisplayName]=useState(""),[captcha,setCaptcha]=useState("");
  const target=useRef<HTMLDivElement>(null),widget=useRef<string|number|null>(null);
  useEffect(()=>{
    const abort=new AbortController();
    fetch("/api/mail-auth/signup/config",{credentials:"same-origin",cache:"no-store",signal:abort.signal})
      .then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Config>;})
      .then(d=>{if(!abort.signal.aborted)setConfig(d);})
      .catch(()=>{if(!abort.signal.aborted)setError("Unable to check signup availability.");});
    return()=>abort.abort();
  },[]);
  useEffect(()=>{
    if(!config?.enabled||!config.siteKey||sent)return;
    let active=true;
    const render=()=>{
      if(!active||!target.current||!window.turnstile||widget.current!==null)return;
      widget.current=window.turnstile.render(target.current,{
        sitekey:config.siteKey!,action:"mail_signup",
        callback:setCaptcha,
        "expired-callback":()=>setCaptcha(""),
        "error-callback":()=>{setCaptcha("");setError("Verification unavailable. Please retry.");}
      });
    };
    let script=document.querySelector<HTMLScriptElement>('script[data-chatvice-mail-turnstile]');
    if(!script){
      script=document.createElement("script");
      script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.defer=true;script.dataset.chatviceMailTurnstile="1";
      document.head.appendChild(script);
    }
    script.addEventListener("load",render);render();
    return()=>{
      active=false;
      script?.removeEventListener("load",render);
      if(widget.current!==null){window.turnstile?.remove(widget.current);widget.current=null;}
    };
  },[config?.enabled,config?.siteKey,sent]);
  async function submit(e:FormEvent){
    e.preventDefault();if(busy||!config?.enabled||!captcha)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/mail-auth/signup/request",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({contactEmail:contactEmail.trim(),localPart:localPart.trim().toLowerCase(),
          displayName:displayName.trim(),turnstileToken:captcha}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(typeof data.error==="string"?data.error:"Signup unavailable. Please try again.");
      setSent(true);
    }catch(e:any){
      setError(e?.message||"Signup unavailable. Please try again.");setCaptcha("");
      if(widget.current!==null)window.turnstile?.reset(widget.current);
    }finally{setBusy(false);}
  }
  return <main className="cm-login cm-public-signup">
    <header><MailBrand/><MailTheme/></header>
    <div className="cm-login-layout">
      <section className="cm-login-intro">
        <span className="cm-eyebrow">YOUR OWN INBOX / CHATVICE MAIL</span>
        <h1>MAKE YOUR<br/><em>ADDRESS_</em></h1>
        <p>Choose an email address and verify an existing contact email. Your mailbox remains private to your account.</p>
        <Link href="/login" className="cm-text-link">Already have an account? Sign in <ArrowRight size={15}/></Link>
      </section>
      <section className="cm-login-card cm-public-signup-card">
        {sent?<><CheckCircle2 size={32}/><h2>CHECK YOUR EMAIL_</h2>
          <p role="status">If this address is eligible, we sent a verification link to your contact email. The link expires in 30 minutes. Check spam too.</p>
          <p className="cm-login-help">Your new mailbox is created only after you verify your email address.</p>
          <Link href="/login" className="cm-button cm-primary">Go to sign in <ArrowRight size={16}/></Link>
        </>:<>
          <span className="cm-login-lock"><Mail size={24}/></span>
          <h2>CREATE ACCOUNT_</h2>
          <p>Start with an <strong>@{config?.domain||"chatvice.app"}</strong> address. Custom domains and paid plans are not yet offered through this form.</p>
          {!config&&!error&&<p role="status">Checking availability…</p>}
          {config&&!config.enabled&&<p role="status" className="mail-alert">Public signup is not yet enabled. Please contact your workspace administrator.</p>}
          <form onSubmit={submit}>
            <label>Mailbox username
              <span className="cm-mail-address"><input required minLength={3} maxLength={32} autoComplete="off"
                pattern="[a-z][a-z0-9._-]{2,31}" placeholder="yourname" value={localPart}
                onChange={e=>setLocalPart(e.target.value.toLowerCase())} disabled={busy||!config?.enabled}/>
                <strong>@{config?.domain||"chatvice.app"}</strong></span>
            </label>
            <label>Display name <input maxLength={80} autoComplete="name" placeholder="Your name"
              value={displayName} onChange={e=>setDisplayName(e.target.value)} disabled={busy||!config?.enabled}/></label>
            <label>Existing contact email <input required type="email" maxLength={254} autoComplete="email"
              placeholder="you@your-current-email.com" value={contactEmail}
              onChange={e=>setContactEmail(e.target.value)} disabled={busy||!config?.enabled}/></label>
            <p className="cm-login-help"><ShieldCheck size={14}/> We will send a confirmation link to this address. It must not be a Chatvice Mail address.</p>
            {config?.enabled&&<div ref={target} aria-label="Human verification" className="cm-mail-captcha"/>}
            {error&&<p role="alert" className="mail-alert">{error}</p>}
            <button className="cm-button cm-primary" disabled={busy||!config?.enabled||!captcha}>
              {busy?"Sending verification…":"Continue with email verification"}<ArrowRight size={17}/>
            </button>
          </form>
          <p className="cm-login-help">One starter mailbox per verified contact email. Outbound sends are limited during the initial public pilot.</p>
        </>}
      </section>
    </div>
  </main>;
}

export function MailSignupVerify(){
  const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get("token")||"");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function complete(){
    if(busy||!/^[0-9a-f]{64}$/.test(token))return;
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/mail-auth/signup/verify",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(typeof data.error==="string"?data.error:"Verification failed.");
      if(typeof data.activationUrl!=="string"||!data.activationUrl.startsWith(window.location.origin+"/activate#token="))
        throw Error("Unexpected activation link. Contact support.");
      window.location.replace(data.activationUrl);
    }catch(e:any){setError(e.message||"Please try again.");setBusy(false);}
  }
  const valid=/^[0-9a-f]{64}$/.test(token);
  return <main className="cm-login cm-public-signup">
    <header><MailBrand/><MailTheme/></header><div className="cm-login-layout">
      <section className="cm-login-intro">
        <span className="cm-eyebrow">CONFIRM YOUR NEW ADDRESS</span>
        <h1>ALMOST<br/><em>THERE_</em></h1>
        <p>Your contact email has the link to finish creating your Chatvice Mail account.</p>
      </section>
      <section className="cm-login-card cm-public-signup-card">
        <span className="cm-login-lock"><LockKeyhole size={23}/></span>
        <h2>VERIFY CONTACT_</h2>
        <p>Confirm your email to create the mailbox. Then choose your private login password.</p>
        {!valid?<p role="alert" className="mail-alert">This verification link is invalid. Please start a new signup.</p>:<>
          {error&&<p role="alert" className="mail-alert">{error}</p>}
          <button disabled={busy} onClick={()=>void complete()} className="cm-button cm-primary">
            {busy?"Verifying…":"Verify and create mailbox"}<ArrowRight size={17}/>
          </button>
        </>}
        <Link href="/signup" className="cm-text-link">Return to signup</Link>
      </section>
    </div>
  </main>;
}
