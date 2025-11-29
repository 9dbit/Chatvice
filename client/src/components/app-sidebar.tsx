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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chat Sessions", url: "/dashboard/sessions", icon: MessageSquare },
  { title: "Knowledge Base", url: "/dashboard/knowledge", icon: Database },
  { title: "Triggers", url: "/dashboard/triggers", icon: Zap },
  { title: "Widget", url: "/dashboard/widget", icon: Palette },
  { title: "Supervisors", url: "/dashboard/supervisors", icon: Users },
  { title: "Billing", url: "/dashboard/billing", icon: CreditCard },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const merchantId = localStorage.getItem("merchantId") || "";
  const [online, setOnline] = useState(true);

  const { data: merchant } = useQuery<{ online?: boolean; companyName?: string }>({
    queryKey: ["/api/merchant", merchantId],
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
      <SidebarFooter className="p-4 space-y-4">
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
