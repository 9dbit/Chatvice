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
    <span>Isolated QA environment · No customer data</span>
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