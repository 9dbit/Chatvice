import { useMerchantUI } from "@/hooks/use-merchant-ui";
import { Component, type ReactNode } from "react";
import { Route, Switch, useLocation, Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIHelpBubble } from "@/components/ai-help-bubble";
import { MerchantNotificationCenter } from "@/components/merchant-notification-center";
import { ChevronRight, Home, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { HeaderLanguageSwitcher } from "@/components/dashboard-language-switcher";

class PageErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error).message || "Unknown error";
      const lang = typeof localStorage !== "undefined" ? localStorage.getItem("chatvice_language") || "en" : "en";
      const translations: Record<string, Record<string, string>> = {
        en: { errorText: "Something went wrong loading this page.", reloadText: "Reload page" },
        id: { errorText: "Terjadi kesalahan saat memuat halaman ini.", reloadText: "Muat ulang halaman" }
      };
      const tr = translations[lang] || translations["en"];
      const errorText = tr.errorText;
      const reloadText = tr.reloadText;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <div>
            <p className="font-semibold text-lg">{errorText}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md font-mono break-all">{msg}</p>
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            {reloadText}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
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
import UserDataPage from "./user-data";
import WorkSchedulerPage from "./work-scheduler";
import QuickRepliesPage from "./quick-replies";
import WelcomeBubblePage from "./welcome-bubble";
import ProductCardsPage from "./product-cards";
import TeamActivityPage from "./team-activity";
import ChatButtonsPage from "./chat-buttons";
import LivePreviewPage from "./live-preview";
import CheckoutPage from "./checkout";
import ChatMonitoringPage from "./chat-monitoring";
import ProfilePage from "./profile";
import AffiliatePage from "./affiliate";
import LeadsPage from "./leads";
import DataUsagePage from "./data-usage";
import ProactiveChatPage from "./proactive-chat";
import AdditionalServicesPage from "./additional-services";
import MarketplacePage from "./marketplace";
import MarketplaceProductDetailPage from "./marketplace-product-detail";
import AppointmentsPage from "./appointments";
import CustomDataSourcePage from "./custom-data-source";
import CustomDataSourceChecklistPage from "./custom-data-source-checklist";
import type { Merchant } from "@shared/schema";

const pageTranslationKeys: Record<string, string> = {
  "": "dashboard.overview.title",
  "profile": "dashboard.profile.title",
  "affiliate": "dashboard.affiliate.title",
  "agents": "dashboard.agents.title",
  "leads": "dashboard.leads.title",
  "sources": "dashboard.sources.title",
  "analytics": "dashboard.analytics.title",
  "sessions": "dashboard.sessions.title",
  "chat-logs": "dashboard.chatLogs.title",
  "user-data": "dashboard.userData.title",
  "knowledge": "dashboard.knowledge.title",
  "triggers": "dashboard.triggers.title",
  "widget": "dashboard.widget.title",
  "supervisors": "dashboard.supervisors.title",
  "integrations": "dashboard.integrations.title",
  "plans": "dashboard.plans.title",
  "billing": "dashboard.billing.title",
  "settings": "dashboard.settings.title",
  "work-scheduler": "dashboard.workScheduler.title",
  "quick-replies": "dashboard.quickReplies.title",
  "welcome-bubble": "dashboard.welcomeBubble.title",
  "product-cards": "dashboard.productCards.title",
  "team-activity": "dashboard.teamActivity.title",
  "chat-buttons": "dashboard.chatButtons.title",
  "live-preview": "dashboard.livePreview.title",
  "checkout": "dashboard.billing.checkout",
  "chat-monitoring": "dashboard.chatMonitoring.title",
  "data-usage": "dashboard.dataUsage.title",
  "proactive-chat": "dashboard.proactiveChat.title",
  "additional-services": "dashboard.additionalServices.title",
  "marketplace": "dashboard.marketplace.title",
  "appointments": "dashboard.appointments.title",
};

function Breadcrumb({ location }: { location: string }) {
  const { t } = useLanguage();
  const pathParts = location.replace("/dashboard", "").split("/").filter(Boolean);
  const currentPage = pathParts[0] || "";
  const tKey = pageTranslationKeys[currentPage];
  const pageName = currentPage === "custom-data-source" ? (pathParts[1] === "integration-checklist" ? "Integration Checklist" : "Custom Data Source") : tKey ? t(tKey) : "Page not found";

  return (
    <nav className="flex items-center gap-1 text-sm" data-testid="nav-breadcrumb">
      <Link href="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">{t("dashboard.overview.title")}</span>
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
  useMerchantUI();
  const [location] = useLocation();
  const merchantId = localStorage.getItem("merchantId");

  const { data: merchant, isLoading, isFetched, isError, refetch } = useQuery<Merchant | null>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  if (!merchantId) {
    return <Redirect to="/login" />;
  }

  // If the server returned 401 (returnNull), our auth cookie is gone.
  // Clear stale localStorage and bounce to login so users don't sit on a
  // broken dashboard.
  if (isFetched && merchant === null) {
    localStorage.removeItem("merchantId");
    localStorage.removeItem("userType");
    return <Redirect to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <div className="min-h-screen grid place-items-center bg-background p-6">
      <div role="alert" className="max-w-md rounded-3xl bg-card p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold">Unable to load your workspace</h1>
        <p className="text-muted-foreground">Your connection may have been interrupted. Please try again.</p>
        <button className="rounded-full bg-primary px-6 py-3 text-primary-foreground" onClick={() => refetch()}>Try again</button>
        <Link href="/login" className="block text-sm text-primary">Back to sign in</Link>
      </div>
    </div>;
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
      <div className="merchant-dashboard flex h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-50 shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 bg-background h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Breadcrumb location={location} />
            </div>
            <div className="flex items-center gap-1">
              <HeaderLanguageSwitcher />
              <MerchantNotificationCenter />
              <ThemeToggle />
            </div>
          </header>
          <main className="merchant-page flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-background" data-page={location.split("/")[2] || "overview"}>
            <PageErrorBoundary key={location}>
            <Switch>
              <Route path="/dashboard" component={DashboardOverview} />
              <Route path="/dashboard/profile" component={ProfilePage} />
              <Route path="/dashboard/affiliate" component={AffiliatePage} />
              <Route path="/dashboard/agents" component={AgentsPage} />
              <Route path="/dashboard/sources" component={SourcesPage} />
              <Route path="/dashboard/analytics" component={AnalyticsPage} />
              <Route path="/dashboard/sessions" component={SessionsPage} />
              <Route path="/dashboard/chat-logs" component={ChatLogsPage} />
              <Route path="/dashboard/user-data" component={UserDataPage} />
              <Route path="/dashboard/knowledge" component={KnowledgePage} />
              <Route path="/dashboard/triggers" component={TriggersPage} />
              <Route path="/dashboard/widget" component={WidgetPage} />
              <Route path="/dashboard/supervisors" component={SupervisorsPage} />
              <Route path="/dashboard/integrations" component={IntegrationsPage} />
              <Route path="/dashboard/custom-data-source/integration-checklist" component={CustomDataSourceChecklistPage} />
              <Route path="/dashboard/custom-data-source" component={CustomDataSourcePage} />
              <Route path="/dashboard/work-scheduler" component={WorkSchedulerPage} />
              <Route path="/dashboard/quick-replies" component={QuickRepliesPage} />
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
              <Route path="/dashboard/data-usage" component={DataUsagePage} />
              <Route path="/dashboard/proactive-chat" component={ProactiveChatPage} />
              <Route path="/dashboard/leads" component={LeadsPage} />
              <Route path="/dashboard/additional-services" component={AdditionalServicesPage} />
              <Route path="/dashboard/marketplace/:productId" component={MarketplaceProductDetailPage} />
              <Route path="/dashboard/marketplace" component={MarketplacePage} />
              <Route path="/dashboard/appointments" component={AppointmentsPage} />
              <Route path="/dashboard/help-articles">
                <Redirect to="/dashboard/knowledge?tab=articles" />
              </Route>
              <Route>
                <div className="max-w-xl rounded-3xl bg-card p-8 space-y-4">
                  <h1 className="text-2xl font-semibold">Page not found</h1>
                  <p className="text-muted-foreground">This dashboard link may have changed. Choose a page from the menu or return to Overview.</p>
                  <Link href="/dashboard" className="inline-flex rounded-full bg-primary px-5 py-3 text-primary-foreground">Back to Overview</Link>
                </div>
              </Route>
            </Switch>
            </PageErrorBoundary>
          </main>
          {location !== "/dashboard/live-preview" && <AIHelpBubble showWelcomeOnLoad={false} />}
        </div>
      </div>
    </SidebarProvider>
  );
}
