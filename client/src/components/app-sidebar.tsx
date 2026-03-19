import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  MessageSquare,
  Database,
  Zap,
  Settings,
  Palette,
  Bot,
  LogOut,
  Users,
  CreditCard,
  Coins,
  BarChart3,
  FileText,
  Plug2,
  Clock,
  Reply,
  Bell,
  MessageCircle,
  Package,
  Activity,
  MousePointer2,
  Eye,
  ChevronDown,
  Receipt,
  ShieldAlert,
  BookOpen,
  User,
  DollarSign,
  Target,
  HardDrive,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/components/theme-provider";
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";

import { rolePermissions } from "@shared/schema";

interface Session {
  id: string;
  mode: "AI" | "HUMAN";
  merchantId: string;
  needsSupervisorAttention?: boolean;
}

function BlinkingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
  );
}

type PermissionKey = keyof typeof rolePermissions.administrator;

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permission: PermissionKey;
  id?: string;
}

interface MenuGroup {
  title: string;
  icon: any;
  items: MenuItem[];
}

interface MenuItemConfig {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
  group?: "main" | "widgetSetting" | "messageSetting" | "management";
}

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Bot,
  Reply,
  MousePointer2,
  FileText,
  Database,
  Zap,
  BarChart3,
  Bell,
  Eye,
  Settings,
  Palette,
  MessageCircle,
  Package,
  Users,
  Activity,
  Clock,
  Plug2,
  CreditCard,
  Receipt,
  ShieldAlert,
  DollarSign,
  HardDrive,
};

const menuItemsMap: Record<string, MenuItem> = {
  "overview": { id: "overview", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permission: "overview" },
  "profile": { id: "profile", title: "Profile", url: "/dashboard/profile", icon: User, permission: "overview" },
  "agents": { id: "agents", title: "Agents", url: "/dashboard/agents", icon: Bot, permission: "agents" },
  "leads": { id: "leads", title: "Sales Leads", url: "/dashboard/leads", icon: Target, permission: "agents" },
  "quick-replies": { id: "quick-replies", title: "Quick Replies", url: "/dashboard/quick-replies", icon: Reply, permission: "quickReplies" },
  "chat-buttons": { id: "chat-buttons", title: "Chat Buttons", url: "/dashboard/chat-buttons", icon: MousePointer2, permission: "widgetSettings" },
  "knowledge-base": { id: "knowledge-base", title: "Knowledge Base", url: "/dashboard/knowledge", icon: Database, permission: "knowledgeBase" },
  "triggers": { id: "triggers", title: "Triggers", url: "/dashboard/triggers", icon: Zap, permission: "settings" },
  "analytics": { id: "analytics", title: "Analytics", url: "/dashboard/analytics", icon: BarChart3, permission: "analytics" },
  "chat-logs": { id: "chat-logs", title: "Chat Logs", url: "/dashboard/chat-logs", icon: FileText, permission: "chatLogs" },
  "user-data": { id: "user-data", title: "User Data", url: "/dashboard/user-data", icon: Users, permission: "chatLogs" },
  "live-preview": { id: "live-preview", title: "Live Preview", url: "/dashboard/live-preview", icon: Eye, permission: "livePreview" },
  "settings": { id: "settings", title: "Settings", url: "/dashboard/settings", icon: Settings, permission: "settings" },
  "widget": { id: "widget", title: "Widget", url: "/dashboard/widget", icon: Palette, permission: "widgetSettings" },
  "welcome-bubble": { id: "welcome-bubble", title: "Welcome Bubble", url: "/dashboard/welcome-bubble", icon: MessageCircle, permission: "widgetSettings" },
  "proactive-chat": { id: "proactive-chat", title: "Proactive Chat", url: "/dashboard/proactive-chat", icon: Radio, permission: "widgetSettings" },
  "product-cards": { id: "product-cards", title: "Product Cards", url: "/dashboard/product-cards", icon: Package, permission: "productCards" },
  "supervisors": { id: "supervisors", title: "Supervisors", url: "/dashboard/supervisors", icon: Users, permission: "supervisors" },
  "team-activity": { id: "team-activity", title: "Team Activity", url: "/dashboard/team-activity", icon: Activity, permission: "teamActivity" },
  "work-scheduler": { id: "work-scheduler", title: "Work Scheduler", url: "/dashboard/work-scheduler", icon: Clock, permission: "workScheduler" },
  "integrations": { id: "integrations", title: "Integrations", url: "/dashboard/integrations", icon: Plug2, permission: "settings" },
  "plans": { id: "plans", title: "Plans", url: "/dashboard/plans", icon: CreditCard, permission: "billing" },
  "billing": { id: "billing", title: "Billing", url: "/dashboard/billing", icon: Receipt, permission: "billing" },
  "chat-monitoring": { id: "chat-monitoring", title: "Chat Monitoring", url: "/dashboard/chat-monitoring", icon: ShieldAlert, permission: "settings" },
  "affiliate": { id: "affiliate", title: "Affiliate", url: "/dashboard/affiliate", icon: DollarSign, permission: "overview" },
  "data-usage": { id: "data-usage", title: "Data Usage", url: "/dashboard/data-usage", icon: HardDrive, permission: "billing" },
};

const defaultMainMenuItems: MenuItem[] = [
  menuItemsMap["overview"],
  menuItemsMap["profile"],
  menuItemsMap["affiliate"],
  menuItemsMap["agents"],
  menuItemsMap["knowledge-base"],
  menuItemsMap["analytics"],
  menuItemsMap["chat-logs"],
  menuItemsMap["live-preview"],
  menuItemsMap["settings"],
];

const defaultWidgetSettingItems: MenuItem[] = [
  menuItemsMap["widget"],
  menuItemsMap["welcome-bubble"],
  menuItemsMap["proactive-chat"],
  menuItemsMap["product-cards"],
];

const defaultMessageSettingItems: MenuItem[] = [
  menuItemsMap["quick-replies"],
  menuItemsMap["chat-buttons"],
  menuItemsMap["triggers"],
];

const defaultManagementItems: MenuItem[] = [
  menuItemsMap["supervisors"],
  menuItemsMap["team-activity"],
  menuItemsMap["work-scheduler"],
  menuItemsMap["user-data"],
  menuItemsMap["integrations"],
  menuItemsMap["chat-monitoring"],
  menuItemsMap["data-usage"],
  menuItemsMap["plans"],
  menuItemsMap["billing"],
];

const defaultGroupForItem: Record<string, "main" | "widgetSetting" | "messageSetting" | "management"> = {
  "overview": "main",
  "profile": "main",
  "affiliate": "main",
  "agents": "main",
  "knowledge-base": "main",
  "analytics": "main",
  "chat-logs": "main",
  "notifications": "main",
  "live-preview": "main",
  "settings": "main",
  "widget": "widgetSetting",
  "welcome-bubble": "widgetSetting",
  "proactive-chat": "widgetSetting",
  "product-cards": "widgetSetting",
  "quick-replies": "messageSetting",
  "chat-buttons": "messageSetting",
  "triggers": "messageSetting",
  "supervisors": "management",
  "team-activity": "management",
  "work-scheduler": "management",
  "user-data": "management",
  "integrations": "management",
  "chat-monitoring": "management",
  "data-usage": "management",
  "plans": "management",
  "billing": "management",
};

interface BillingStatus {
  status: string;
  planId: string;
  planName: string;
  conversationsUsed: number;
  conversationsLimit: number;
  agentsUsed: number;
  agentsLimit: number;
  supervisorsUsed: number;
  supervisorsLimit: number;
  sourcesUsed: number;
  sourcesLimit: number;
  domainsUsed: number;
  domainsLimit: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isTrialExpired: boolean;
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const merchantId = localStorage.getItem("merchantId") || "";
  const userType = localStorage.getItem("userType") || "merchant";
  const [online, setOnline] = useState(true);
  const [widgetSettingOpen, setWidgetSettingOpen] = useState(false);
  const [messageSettingOpen, setMessageSettingOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const prevEscalatedCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedInitialRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const chatviceLogo = resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  const isAdmin = userType === "merchant";
  const permissions = isAdmin ? rolePermissions.administrator : rolePermissions.supervisor;

  const { data: platformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const menuConfig = useMemo(() => {
    if (platformSettings?.merchant_menu_order) {
      try {
        const savedConfig: MenuItemConfig[] = JSON.parse(platformSettings.merchant_menu_order);
        if (Array.isArray(savedConfig) && savedConfig.length > 0) {
          return savedConfig;
        }
      } catch (e) {
        console.error("Failed to parse menu config:", e);
      }
    }
    return null;
  }, [platformSettings]);

  const { mainItems, widgetItems, messageItems, managementItems } = useMemo(() => {
    if (!menuConfig) {
      return {
        mainItems: defaultMainMenuItems,
        widgetItems: defaultWidgetSettingItems,
        messageItems: defaultMessageSettingItems,
        managementItems: defaultManagementItems,
      };
    }

    const enabledMainItems: MenuItem[] = [];
    const enabledWidgetItems: MenuItem[] = [];
    const enabledMessageItems: MenuItem[] = [];
    const enabledManagementItems: MenuItem[] = [];
    const configuredIds = new Set(menuConfig.map(c => c.id));

    for (const config of menuConfig) {
      if (!config.enabled) continue;
      
      const menuItem = menuItemsMap[config.id];
      if (!menuItem) continue;

      const group = defaultGroupForItem[config.id] || config.group || "main";

      if (group === "main") {
        enabledMainItems.push(menuItem);
      } else if (group === "widgetSetting") {
        enabledWidgetItems.push(menuItem);
      } else if (group === "messageSetting") {
        enabledMessageItems.push(menuItem);
      } else if (group === "management") {
        enabledManagementItems.push(menuItem);
      }
    }

    // Add new menu items that exist in defaults but not in saved config
    for (const item of defaultMainMenuItems) {
      if (item.id && !configuredIds.has(item.id)) {
        enabledMainItems.push(item);
      }
    }
    for (const item of defaultWidgetSettingItems) {
      if (item.id && !configuredIds.has(item.id)) {
        enabledWidgetItems.push(item);
      }
    }
    for (const item of defaultMessageSettingItems) {
      if (item.id && !configuredIds.has(item.id)) {
        enabledMessageItems.push(item);
      }
    }
    for (const item of defaultManagementItems) {
      if (item.id && !configuredIds.has(item.id)) {
        enabledManagementItems.push(item);
      }
    }

    return {
      mainItems: enabledMainItems,
      widgetItems: enabledWidgetItems,
      messageItems: enabledMessageItems,
      managementItems: enabledManagementItems,
    };
  }, [menuConfig]);

  const filteredMainItems = mainItems.filter(item => permissions[item.permission]);
  const filteredWidgetItems = widgetItems.filter(item => permissions[item.permission]);
  const filteredMessageItems = messageItems.filter(item => permissions[item.permission]);
  const filteredManagementItems = managementItems.filter(item => permissions[item.permission]);

  const { data: merchant } = useQuery<{ online?: boolean; companyName?: string }>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    enabled: !!merchantId,
    staleTime: 60000,
    refetchOnMount: true,
    retry: 1,
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
    refetchInterval: 5000,
  });

  const escalatedCount = sessions?.filter(s => s.mode === "HUMAN" || s.needsSupervisorAttention === true).length || 0;

  const playAlertSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVX/EUKQydujgQBAk9zomXcaQ6br8JhfFka28fCRVB5NwPjvhkoiWMz98n88J2XZ//RxMi5z4v/0Zi03e+T/8Vs0Q4Tk/+xQN0qJ5P/oRjpQjuT/40E9VpLk/987QFqW5P/aOENemuf/1TZGYZ/o/9IzR2Wi6v/OMkhrpev/yjBJbqfu/8YuSnGq8P/DLUxzrPL/wCxNda/0/70rTnix9v+6KlB6s/j/tiZRfLX6/7MlU367/P+wJFWBvv3/rCJWg8D+/6ggV4XC//+lH1mHxP//oh1ai8b//58dW43H//+cHFyPyf//mRtdkcv//5YaXpPN//+TGV+Uzv//kBhglc///40XX5fR//+KFmCY0v//hxVhmdP//4QUYprU//+BE2Ob1f/+fhJkndX//nsSZJ7W//54EWWf1//+dRBlodj//nMPZqHY//5wDmel2f/+bg5npdv//mwNZ6bc//5pDGio3f/+ZwxpqN7//mQLaKnf//5iCmiq3//+YAppq+D//l4Jaqvg//5cCWqs4f/+Wghrruz//lkIa67t//5XB2yv7v/+VQdtsfD//lMGbbLx//5SBm2y8v/+UAVusvP//k4FbrP0//5MBXC09f/+SwRxtPf//kkEcbb4//5IBHG2+f/+RgNyuPr//kUDcrj7//5DA3O5/P/+QgJzuv3//kACc7r+//4/AnS7///+PQF0u///");
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (merchant) {
      setOnline(merchant.online ?? true);
    }
  }, [merchant]);

  useEffect(() => {
    if (!hasPlayedInitialRef.current && sessions) {
      hasPlayedInitialRef.current = true;
      prevEscalatedCountRef.current = escalatedCount;
      return;
    }
    
    if (escalatedCount > prevEscalatedCountRef.current) {
      playAlertSound();
    }
    prevEscalatedCountRef.current = escalatedCount;
  }, [escalatedCount, sessions, playAlertSound]);

  useEffect(() => {
    const widgetUrls = filteredWidgetItems.map(i => i.url);
    const messageUrls = filteredMessageItems.map(i => i.url);
    const managementUrls = filteredManagementItems.map(i => i.url);
    
    if (widgetUrls.some(url => location === url || location.startsWith(url + "/"))) {
      setWidgetSettingOpen(true);
    }
    if (messageUrls.some(url => location === url || location.startsWith(url + "/"))) {
      setMessageSettingOpen(true);
    }
    if (managementUrls.some(url => location === url || location.startsWith(url + "/"))) {
      setManagementOpen(true);
    }
  }, [location, filteredWidgetItems, filteredMessageItems, filteredManagementItems]);

  const updateStatusMutation = useMutation({
    mutationFn: async (newOnline: boolean) => {
      return apiRequest("POST", "/api/merchant/config", {
        merchantId,
        online: newOnline,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
    },
  });

  const handleOnlineToggle = (checked: boolean) => {
    setOnline(checked);
    updateStatusMutation.mutate(checked);
  };

  const handleLogout = () => {
    localStorage.removeItem("merchantId");
    localStorage.removeItem("userType");
    setLocation("/");
  };

  const isItemActive = (url: string) => {
    return location === url || (url !== "/dashboard" && location.startsWith(url));
  };

  const isChatSessionsActive = location === "/dashboard/sessions" || location.startsWith("/dashboard/sessions/");

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex flex-col items-start gap-2 hover:opacity-80 transition-opacity cursor-pointer" data-testid="link-sidebar-logo">
          <img src={chatviceLogo} alt="Chatvice" className="h-8 w-auto object-contain object-left" />
          <p className="text-sm font-semibold truncate max-w-full">
            {merchant?.companyName || "Dashboard"}
          </p>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Render items before Widget/Message Settings (Overview, Agents) */}
              {filteredMainItems.filter(item => item.id === "overview" || item.id === "agents").map((item) => {
                const isActive = isItemActive(item.url);
                return (
                  <SidebarMenuItem key={item.id || item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                    >
                      <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Widget Setting dropdown - positioned after Agents */}
              {filteredWidgetItems.length > 0 && (
                <Collapsible open={widgetSettingOpen} onOpenChange={setWidgetSettingOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between" data-testid="button-sidebar-widget-setting">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          <span>Widget Setting</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${widgetSettingOpen ? "rotate-180" : ""}`} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    {filteredWidgetItems.map((item) => {
                      const isActive = isItemActive(item.url);
                      return (
                        <SidebarMenuItem key={item.id || item.title} className="pl-4">
                          <SidebarMenuButton
                            asChild
                            className={isActive ? "bg-sidebar-accent" : ""}
                          >
                            <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                              <item.icon className="w-4 h-4" />
                              <span className="flex-1">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {filteredMessageItems.length > 0 && (
                <Collapsible open={messageSettingOpen} onOpenChange={setMessageSettingOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between" data-testid="button-sidebar-message-setting">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Message Setting</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${messageSettingOpen ? "rotate-180" : ""}`} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    {filteredMessageItems.map((item) => {
                      const isActive = isItemActive(item.url);
                      return (
                        <SidebarMenuItem key={item.id || item.title} className="pl-4">
                          <SidebarMenuButton
                            asChild
                            className={isActive ? "bg-sidebar-accent" : ""}
                          >
                            <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                              <item.icon className="w-4 h-4" />
                              <span className="flex-1">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Remaining main items after Widget/Message Settings */}
              {filteredMainItems.filter(item => item.id !== "overview" && item.id !== "agents").map((item) => {
                const isActive = isItemActive(item.url);
                return (
                  <SidebarMenuItem key={item.id || item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                    >
                      <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {filteredManagementItems.length > 0 && (
                <Collapsible open={managementOpen} onOpenChange={setManagementOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between" data-testid="button-sidebar-management">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Management</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${managementOpen ? "rotate-180" : ""}`} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    {filteredManagementItems.map((item) => {
                      const isActive = isItemActive(item.url);
                      return (
                        <SidebarMenuItem key={item.id || item.title} className="pl-4">
                          <SidebarMenuButton
                            asChild
                            className={isActive ? "bg-sidebar-accent" : ""}
                          >
                            <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                              <item.icon className="w-4 h-4" />
                              <span className="flex-1">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {permissions.sessions && (
          <Link 
            href="/dashboard/sessions"
            data-testid="link-sidebar-chat-sessions-static"
            className="block w-full"
          >
            <button 
              type="button"
              className={`flex items-center gap-3 p-3 w-full rounded-lg transition-all duration-200 ${
                isChatSessionsActive 
                  ? "bg-primary text-white" 
                  : "bg-primary/90 text-white hover:bg-primary hover:scale-[1.02] active:scale-[0.98]"
              }`}
              style={{ 
                boxShadow: isChatSessionsActive 
                  ? "inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(107, 92, 246, 0.4)" 
                  : "0 4px 12px rgba(107, 92, 246, 0.3)"
              }}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium flex-1 text-left">Chat Sessions</span>
              {escalatedCount > 0 && <BlinkingDot />}
            </button>
          </Link>
        )}
        
        {billingStatus && (
          <Collapsible defaultOpen={true}>
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <CollapsibleTrigger className="w-full" data-testid="trigger-usage-plan">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    <span>Usage & Plan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {billingStatus.planName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ease-out data-[state=open]:rotate-180" />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <div className="text-xs space-y-2">
                {/* Conversations - Always visible */}
                <div className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Conversations</span>
                    <span className="font-medium">{billingStatus.conversationsUsed} / {billingStatus.conversationsLimit === -1 ? "∞" : billingStatus.conversationsLimit}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ 
                        width: billingStatus.conversationsLimit === -1 
                          ? "10%" 
                          : `${Math.min((billingStatus.conversationsUsed / billingStatus.conversationsLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                
                <CollapsibleContent className="space-y-2 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-300">
                  {/* AI Agents */}
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">AI Agents</span>
                      <span className="font-medium">{billingStatus.agentsUsed} / {billingStatus.agentsLimit === -1 ? "∞" : billingStatus.agentsLimit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ 
                          width: billingStatus.agentsLimit === -1 
                            ? "10%" 
                            : `${Math.min((billingStatus.agentsUsed / billingStatus.agentsLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Supervisors */}
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Supervisors</span>
                      <span className="font-medium">{billingStatus.supervisorsUsed} / {billingStatus.supervisorsLimit === -1 ? "∞" : billingStatus.supervisorsLimit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ 
                          width: billingStatus.supervisorsLimit === -1 
                            ? "10%" 
                            : `${Math.min((billingStatus.supervisorsUsed / billingStatus.supervisorsLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Knowledge Sources */}
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Knowledge Sources</span>
                      <span className="font-medium">{billingStatus.sourcesUsed} / {billingStatus.sourcesLimit === -1 ? "∞" : billingStatus.sourcesLimit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ 
                          width: billingStatus.sourcesLimit === -1 
                            ? "10%" 
                            : `${Math.min((billingStatus.sourcesUsed / billingStatus.sourcesLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Domains */}
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Domains</span>
                      <span className="font-medium">{billingStatus.domainsUsed} / {billingStatus.domainsLimit === -1 ? "∞" : billingStatus.domainsLimit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-purple-500 h-1.5 rounded-full transition-all"
                        style={{ 
                          width: billingStatus.domainsLimit === -1 
                            ? "10%" 
                            : `${Math.min((billingStatus.domainsUsed / billingStatus.domainsLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {billingStatus.status === "trial" && billingStatus.trialEndsAt && (
                    <div className="flex justify-between gap-2 pt-1 border-t border-muted">
                      <span className="text-muted-foreground">Trial Ends</span>
                      <span className="font-medium">{new Date(billingStatus.trialEndsAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {billingStatus.status === "active" && billingStatus.currentPeriodEnd && (
                    <div className="flex justify-between gap-2 pt-1 border-t border-muted">
                      <span className="text-muted-foreground">Renews</span>
                      <span className="font-medium">{new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}</span>
                    </div>
                  )}
                </CollapsibleContent>
              </div>
              
              {/* Upgrade CTA Button */}
              {billingStatus.planId !== "enterprise" && billingStatus.planId !== "custom" && (
                <Link href="/dashboard/plans" className="block">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full mt-2"
                    data-testid="button-upgrade-plan"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade Plan
                  </Button>
                </Link>
              )}
            </div>
          </Collapsible>
        )}
        {isAdmin && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${online ? "bg-status-online" : "bg-status-offline"}`} />
              <span className="text-sm">{online ? "Online" : "Offline"}</span>
            </div>
            <Switch
              checked={online}
              onCheckedChange={handleOnlineToggle}
              data-testid="switch-online-status"
            />
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
