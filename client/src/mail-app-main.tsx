import {createRoot} from "react-dom/client";
import {useEffect,useState,type FormEvent} from "react";
import {Router,Route,Switch,Redirect,Link,useLocation} from "wouter";
import {QueryClientProvider} from "@tanstack/react-query";
import {ArrowRight,ArrowLeft,LockKeyhole,Eye,EyeOff} from "lucide-react";
import MailPage from "./pages/dashboard/mail";
import MailAdminPage from "./pages/dashboard/mail-admin";
import MailLanding,{MailBrand} from "./pages/mail-landing";
import MailTheme from "./components/mail-theme";
import {queryClient} from "./lib/queryClient";
import "./mail-qa.css";
import "./mail-site.css";
type Identity={email:string;admin:boolean};
function App(){
 const [identity,setIdentity]=useState<Identity|null>(null),[ready,setReady]=useState(false);
 const [email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [error,setError]=useState(""),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
 const [location,navigate]=useLocation();
 useEffect(()=>{fetch("/api/mail-auth/session",{credentials:"same-origin"}).then(async r=>{
  if(r.ok)setIdentity(await r.json());else if(r.status!==401)setError("Mail service is temporarily unavailable.");
 }).catch(()=>setError("Unable to connect to Mail.")).finally(()=>setReady(true));},[]);
 async function login(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   const r=await fetch("/api/mail-auth/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
   setPassword("");
   if(!r.ok){setError(r.status===429?"Too many attempts. Please try again later.":"Unable to sign in. Check your email and password.");return;}
   queryClient.clear();setIdentity(await r.json());navigate("/dashboard/mail");
  }catch{setError("Unable to connect to Mail.");}finally{setBusy(false);}
 }
 async function logout(){
  setBusy(true);
  try{
   const r=await fetch("/api/mail-auth/logout",{method:"POST",credentials:"same-origin"});if(!r.ok)throw new Error();
   queryClient.clear();setIdentity(null);setPassword("");setError("");navigate("/login");
  }catch{setError("Unable to sign out. Please try again.");}finally{setBusy(false);}
 }
 if(location==="/")return <MailLanding/>;
 if(!ready)return <main className="cm-loading" role="status">Opening your workspace…</main>;
 if(!identity)return <main className="cm-login"><header><MailBrand/><MailTheme/></header><div className="cm-login-layout"><section className="cm-login-intro"><span className="cm-eyebrow">WELCOME BACK</span><h1>Your mail.<br/>A little more<br/><em>organized.</em></h1><p>A familiar place for your business conversations.<br/>Pick up right where you left off.</p><Link href="/" className="cm-text-link"><ArrowLeft size={16}/> Back to overview</Link></section><section className="cm-login-card"><span className="cm-login-lock"><LockKeyhole size={24}/></span><h2>Make yourself at home.</h2><p>Sign in to your private mailboxes.</p><form onSubmit={login}>
  <label>Email<input type="email" autoComplete="username" inputMode="email" maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yourcompany.com" required/></label>
  <label>Password<span className="cm-password-field"><input type={showPassword?"text":"password"} autoComplete="current-password" maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" required/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
  {error&&<p role="alert" className="mail-alert">{error}</p>}
  <button className="cm-button cm-primary" disabled={busy}>{busy?"Signing in…":"Sign in"}<ArrowRight size={18}/></button>
 </form><p className="cm-login-help">Need access or a password reset?<br/>Contact your workspace administrator.</p></section></div></main>;
 return <main className="mail-standalone">
  {error&&<p role="alert" className="mail-alert">{error}</p>}
  <Switch><Route path="/dashboard/mail/admin">{identity.admin?<div className="cm-admin-shell"><header><MailBrand/><MailTheme/><button onClick={logout} disabled={busy} className="mail-button">Sign out</button></header><MailAdminPage/></div>:<Redirect to="/dashboard/mail"/>}</Route>
   <Route path="/dashboard/mail"><MailPage accountEmail={identity.email} onSignOut={logout} signingOut={busy}/></Route>
   <Route><Redirect to="/dashboard/mail"/></Route>
  </Switch>
 </main>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={queryClient}><Router><App/></Router></QueryClientProvider>);
