import { Route, Switch, useLocation, Redirect, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIHelpBubble } from "@/components/ai-help-bubble";
import { ChevronRight, Home, Loader2, Bell, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  createdAt: string;
  expiresAt: string | null;
  isRead: boolean;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const merchantId = localStorage.getItem("merchantId");

  const { data: broadcasts = [], isLoading, refetch } = useQuery<Broadcast[]>({
    queryKey: ["/api/merchant/notifications", merchantId],
    enabled: !!merchantId,
    refetchInterval: 60000,
  });

  const unreadCount = broadcasts.filter((b) => !b.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: async (broadcastId: string) => {
      return apiRequest("POST", `/api/merchant/notifications/${broadcastId}/read`);
    },
    onSuccess: () => {
      refetch();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/notifications/mark-all-read");
    },
    onSuccess: () => {
      refetch();
    },
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "announcement": return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs">Announcement</Badge>;
      case "marketing": return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Marketing</Badge>;
      case "system": return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">System</Badge>;
      case "update": return <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs">Update</Badge>;
      default: return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" data-testid="popover-notifications">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Bell className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {broadcasts.map((broadcast) => (
                <div 
                  key={broadcast.id} 
                  className={`p-3 hover-elevate cursor-pointer ${!broadcast.isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    if (!broadcast.isRead) {
                      markReadMutation.mutate(broadcast.id);
                    }
                  }}
                  data-testid={`notification-${broadcast.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!broadcast.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">{broadcast.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{broadcast.message}</p>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(broadcast.type)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(broadcast.createdAt), 'dd MMM, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
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
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
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
