import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import { LoginPage, RegisterPage } from "@/pages/auth";
import DashboardLayout from "@/pages/dashboard/layout";
import SupervisorPanel from "@/pages/supervisor";
import WidgetDemoPage from "@/pages/widget-demo";
import ChatWidget from "@/pages/chat-widget";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardLayout} />
      <Route path="/dashboard/:page*" component={DashboardLayout} />
      <Route path="/supervisor" component={SupervisorPanel} />
      <Route path="/widget-demo" component={WidgetDemoPage} />
      <Route path="/widget/:merchantId">
        {(params) => (
          <div className="min-h-screen flex items-center justify-center bg-muted">
            <ChatWidget merchantId={params.merchantId} embedded />
          </div>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="jeany-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
