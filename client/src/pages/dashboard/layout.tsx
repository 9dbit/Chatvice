import { Route, Switch, useLocation, Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIHelpBubble } from "@/components/ai-help-bubble";
import { ChevronRight, Home, Loader2 } from "lucide-react";
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
import IntegrationsPage from "./integrations";
import ChatLogsPage from "./chat-logs";
import WorkSchedulerPage from "./work-scheduler";
import QuickRepliesPage from "./quick-replies";
import NotificationSettingsPage from "./notification-settings";
import WelcomeBubblePage from "./welcome-bubble";
import ProductCardsPage from "./product-cards";
import TeamActivityPage from "./team-activity";
import ChatButtonsPage from "./chat-buttons";
import LivePreviewPage from "./live-preview";
import CheckoutPage from "./checkout";
import ChatMonitoringPage from "./chat-monitoring";
import type { Merchant } from "@shared/schema";

const pageNames: Record<string, string> = {
  "": "Overview",
  "agents": "Agents",
  "sources": "Sources",
  "analytics": "Analytics",
  "sessions": "Chat Sessions",
  "chat-logs": "Chat Logs",
  "knowledge": "Knowledge Base",
  "triggers": "Triggers",
  "widget": "Widget",
  "supervisors": "Supervisors",
  "integrations": "Integrations",
  "plans": "Plans",
  "billing": "Billing",
  "settings": "Settings",
  "work-scheduler": "Work Scheduler",
  "quick-replies": "Quick Replies",
  "notification-settings": "Notification Settings",
  "welcome-bubble": "Welcome Bubble",
  "product-cards": "Product Cards",
  "team-activity": "Team Activity",
  "chat-buttons": "Chat Buttons",
  "live-preview": "Live Preview",
  "checkout": "Checkout",
  "chat-monitoring": "Chat Monitoring",
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

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  if (!merchantId) {
    return <Redirect to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (merchant && !merchant.activeAgentId) {
    return <Redirect to="/select-agent" />;
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
          <header className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 border-b border-border h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Breadcrumb location={location} />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-6 bg-background">
            <Switch>
              <Route path="/dashboard" component={DashboardOverview} />
              <Route path="/dashboard/agents" component={AgentsPage} />
              <Route path="/dashboard/sources" component={SourcesPage} />
              <Route path="/dashboard/analytics" component={AnalyticsPage} />
              <Route path="/dashboard/sessions" component={SessionsPage} />
              <Route path="/dashboard/chat-logs" component={ChatLogsPage} />
              <Route path="/dashboard/knowledge" component={KnowledgePage} />
              <Route path="/dashboard/triggers" component={TriggersPage} />
              <Route path="/dashboard/widget" component={WidgetPage} />
              <Route path="/dashboard/supervisors" component={SupervisorsPage} />
              <Route path="/dashboard/integrations" component={IntegrationsPage} />
              <Route path="/dashboard/work-scheduler" component={WorkSchedulerPage} />
              <Route path="/dashboard/quick-replies" component={QuickRepliesPage} />
              <Route path="/dashboard/notification-settings" component={NotificationSettingsPage} />
              <Route path="/dashboard/welcome-bubble" component={WelcomeBubblePage} />
              <Route path="/dashboard/product-cards" component={ProductCardsPage} />
              <Route path="/dashboard/team-activity" component={TeamActivityPage} />
              <Route path="/dashboard/chat-buttons" component={ChatButtonsPage} />
              <Route path="/dashboard/live-preview" component={LivePreviewPage} />
              <Route path="/dashboard/checkout" component={CheckoutPage} />
              <Route path="/dashboard/plans" component={PlansPage} />
              <Route path="/dashboard/billing" component={BillingDetailsPage} />
              <Route path="/dashboard/settings" component={SettingsPage} />
              <Route path="/dashboard/chat-monitoring" component={ChatMonitoringPage} />
              <Route path="/dashboard/help-articles">
                <Redirect to="/dashboard/knowledge" />
              </Route>
            </Switch>
          </main>
          <AIHelpBubble />
        </div>
      </div>
    </SidebarProvider>
  );
}
