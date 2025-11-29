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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Receipt } from "lucide-react";

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

  const { data: merchant } = useQuery<{ online?: boolean; companyName?: string }>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    enabled: !!merchantId,
  });

  useEffect(() => {
    if (merchant) {
      setOnline(merchant.online ?? true);
    }
  }, [merchant]);

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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold">Jeany AI</span>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
              {merchant?.companyName || "Dashboard"}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/dashboard" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                    >
                      <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
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
