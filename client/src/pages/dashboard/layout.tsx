import { Route, Switch, useLocation, Redirect, Link } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIHelpBubble } from "@/components/ai-help-bubble";
import { ChevronRight, Home } from "lucide-react";
import DashboardOverview from "./overview";
import SessionsPage from "./sessions";
import KnowledgePage from "./knowledge";
import TriggersPage from "./triggers";
import WidgetPage from "./widget";
import SupervisorsPage from "./supervisors";
import SettingsPage from "./settings";
import PlansPage from "./billing";
import BillingDetailsPage from "./billing-details";
import AgentsPage from "./agents";
import SourcesPage from "./sources";
import AnalyticsPage from "./analytics";

const pageNames: Record<string, string> = {
  "": "Overview",
  "agents": "Agents",
  "sources": "Sources",
  "analytics": "Analytics",
  "sessions": "Chat Sessions",
  "knowledge": "Knowledge Base",
  "triggers": "Triggers",
  "widget": "Widget",
  "supervisors": "Supervisors",
  "plans": "Plans",
  "billing": "Billing",
  "settings": "Settings",
};

function Breadcrumb({ location }: { location: string }) {
  const pathParts = location.replace("/dashboard", "").split("/").filter(Boolean);
  const currentPage = pathParts[0] || "";
  const pageName = pageNames[currentPage] || "Dashboard";

  return (
    <nav className="flex items-center gap-1 text-sm" data-testid="nav-breadcrumb">
      <Link href="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {currentPage && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground" data-testid="text-current-page">{pageName}</span>
        </>
      )}
    </nav>
  );
}

export default function DashboardLayout() {
  const [location] = useLocation();
  const merchantId = localStorage.getItem("merchantId");

  if (!merchantId) {
    return <Redirect to="/login" />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 border-b border-border h-14">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Breadcrumb location={location} />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Switch>
              <Route path="/dashboard" component={DashboardOverview} />
              <Route path="/dashboard/agents" component={AgentsPage} />
              <Route path="/dashboard/sources" component={SourcesPage} />
              <Route path="/dashboard/analytics" component={AnalyticsPage} />
              <Route path="/dashboard/sessions" component={SessionsPage} />
              <Route path="/dashboard/knowledge" component={KnowledgePage} />
              <Route path="/dashboard/triggers" component={TriggersPage} />
              <Route path="/dashboard/widget" component={WidgetPage} />
              <Route path="/dashboard/supervisors" component={SupervisorsPage} />
              <Route path="/dashboard/plans" component={PlansPage} />
              <Route path="/dashboard/billing" component={BillingDetailsPage} />
              <Route path="/dashboard/settings" component={SettingsPage} />
            </Switch>
          </main>
          <AIHelpBubble />
        </div>
      </div>
    </SidebarProvider>
  );
}
