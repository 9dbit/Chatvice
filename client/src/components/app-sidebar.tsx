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
  Calendar,
  BarChart3,
  FileText,
  Plug2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Receipt } from "lucide-react";

interface Session {
  id: string;
  mode: "AI" | "HUMAN";
  merchantId: string;
}

function BlinkingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
  );
}

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", url: "/dashboard/agents", icon: Bot },
  { title: "Sources", url: "/dashboard/sources", icon: FileText },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Chat Sessions", url: "/dashboard/sessions", icon: MessageSquare },
  { title: "Knowledge Base", url: "/dashboard/knowledge", icon: Database },
  { title: "Triggers", url: "/dashboard/triggers", icon: Zap },
  { title: "Widget", url: "/dashboard/widget", icon: Palette },
  { title: "Supervisors", url: "/dashboard/supervisors", icon: Users },
  { title: "Integrations", url: "/dashboard/integrations", icon: Plug2 },
  { title: "Plans", url: "/dashboard/plans", icon: CreditCard },
  { title: "Billing", url: "/dashboard/billing", icon: Receipt },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

interface BillingStatus {
  status: string;
  planId: string;
  planName: string;
  conversationsUsed: number;
  conversationsLimit: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isTrialExpired: boolean;
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const merchantId = localStorage.getItem("merchantId") || "";
  const [online, setOnline] = useState(true);
  const prevEscalatedCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedInitialRef = useRef(false);

  const { data: merchant } = useQuery<{ online?: boolean; companyName?: string }>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    enabled: !!merchantId,
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
    refetchInterval: 5000,
  });

  const escalatedCount = sessions?.filter(s => s.mode === "HUMAN").length || 0;

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

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer" data-testid="link-sidebar-logo">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold">Jeany AI</span>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
              {merchant?.companyName || "Dashboard"}
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/dashboard" && location.startsWith(item.url));
                const showNotification = item.title === "Chat Sessions" && escalatedCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                    >
                      <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                        {showNotification && <BlinkingDot />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {billingStatus && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span>Usage & Plan</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credits Used</span>
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
              {billingStatus.status === "trial" && billingStatus.trialEndsAt && (
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Trial Ends</span>
                  <span className="font-medium">{new Date(billingStatus.trialEndsAt).toLocaleDateString()}</span>
                </div>
              )}
              {billingStatus.status === "active" && billingStatus.currentPeriodEnd && (
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Renews</span>
                  <span className="font-medium">{new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
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
