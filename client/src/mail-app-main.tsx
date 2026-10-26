import {createRoot} from "react-dom/client";
import {useEffect,useState,type FormEvent} from "react";
import {Router,Route,Switch,Redirect} from "wouter";
import {QueryClientProvider} from "@tanstack/react-query";
import MailPage from "./pages/dashboard/mail";
import MailAdminPage from "./pages/dashboard/mail-admin";
import {queryClient} from "./lib/queryClient";
import "./mail-qa.css";
type Identity={email:string;admin:boolean};
function App(){
  const [identity,setIdentity]=useState<Identity|null>(null),[ready,setReady]=useState(false);
  const [email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{fetch("/api/mail-auth/session",{credentials:"same-origin"}).then(async r=>{
    if(r.ok)setIdentity(await r.json());
    else if(r.status!==401)setError("Mail service is temporarily unavailable.");
  }).catch(()=>setError("Unable to connect to Mail.")).finally(()=>setReady(true));},[]);
  async function login(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch("/api/mail-auth/login",{method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      setPassword("");
      if(!r.ok){setError(r.status===429?"Too many attempts. Please try again later.":"Unable to sign in. Check your email and password.");return;}
      queryClient.clear();setIdentity(await r.json());
    }catch{setError("Unable to connect to Mail.");}finally{setBusy(false);}
  }
  async function logout(){
    setBusy(true);
    try{
      const r=await fetch("/api/mail-auth/logout",{method:"POST",credentials:"same-origin"});
      if(!r.ok)throw new Error();
      queryClient.clear();setIdentity(null);setPassword("");
    }catch{setError("Unable to sign out. Please try again.");}finally{setBusy(false);}
  }
  if(!ready)return <main className="p-8">Loading Mail…</main>;
  if(!identity)return <main className="mx-auto mt-24 max-w-md rounded-2xl border border-white/10 p-8">
    <h1 className="mb-2 text-2xl font-semibold">Chatvice Mail</h1>
    <p className="mb-6 text-sm text-white/60">Sign in to your private mailboxes.</p>
    <form onSubmit={login} className="space-y-4">
      <label className="block">Email<input className="mt-1 w-full rounded-lg bg-white/10 p-3" type="email" autoComplete="username" maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label className="block">Password<input className="mt-1 w-full rounded-lg bg-white/10 p-3" type="password" autoComplete="current-password" maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      {error&&<p role="alert" className="text-red-300">{error}</p>}
      <button className="w-full rounded-lg bg-orange-500 p-3 font-semibold text-black disabled:opacity-50" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
    </form></main>;
  return <Router><main className="min-h-screen p-3 sm:p-6"><div className="mx-auto max-w-[1720px]">
    <header className="mb-4 flex items-center justify-between gap-4 text-sm">
      <span>CHATVICE / PRIVATE MAIL · {identity.email}</span>
      <button onClick={logout} disabled={busy} className="rounded-lg border border-white/20 px-4 py-2">Sign out</button>
    </header>
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    <Switch>
      <Route path="/dashboard/mail/admin">{identity.admin?<MailAdminPage/>:<Redirect to="/dashboard/mail"/>}</Route>
      <Route path="/dashboard/mail" component={MailPage}/>
      <Route><Redirect to="/dashboard/mail"/></Route>
    </Switch>
  </div></main></Router>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={queryClient}><App/></QueryClientProvider>);
