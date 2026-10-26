import { createRoot } from "react-dom/client";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import MailPage from "./pages/dashboard/mail";
import MailAdminPage from "./pages/dashboard/mail-admin";
import { queryClient } from "./lib/queryClient";
import "./mail-qa.css";

function App(){
 return <Router><main className="min-h-screen bg-[#050608] p-3 sm:p-6">
  <div className="mx-auto max-w-[1720px]">
   <header className="mb-4 flex items-center justify-between text-xs text-white/45">
    <span>CHATVICE / PRIVATE MAIL</span>
    <div className="flex items-center gap-3">
     <span className="hidden sm:inline">Isolated QA · No customer data</span>
     <form action="/qa/logout" method="post">
       <button type="submit" className="rounded-full border border-white/20 px-3 py-2 hover:bg-white/10 text-white/70">Sign out</button>
     </form>
    </div>
   </header>
   <Switch>
    <Route path="/dashboard/mail/admin" component={MailAdminPage}/>
    <Route path="/dashboard/mail" component={MailPage}/>
    <Route><Redirect to="/dashboard/mail"/></Route>
   </Switch>
  </div></main></Router>;
}
createRoot(document.getElementById("root")!).render(
 <QueryClientProvider client={queryClient}><App/></QueryClientProvider>
);