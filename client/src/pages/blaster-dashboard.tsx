import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Smartphone,
  Users,
  FileText,
  Send,
  BarChart3,
  CreditCard,
  MessageCircle,
  LogOut,
  ChevronDown,
  ExternalLink,
  Home,
  Wallet,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getMainAppUrl } from "@/lib/blaster-routes";

import WABlastChannelsPage from "@/pages/dashboard/wa-blast/channels";
import WABlastContactsPage from "@/pages/dashboard/wa-blast/contacts";
import WABlastTemplatesPage from "@/pages/dashboard/wa-blast/templates";
import WABlastCampaignsPage from "@/pages/dashboard/wa-blast/campaigns";
import BlasterBillingPage from "@/pages/blaster-billing";

interface Merchant {
  id: number;
  email: string;
  username: string;
  companyName?: string;
}

const menuItems = [
  { id: "channels", title: "Channels", icon: Smartphone, path: "/dashboard/channels" },
  { id: "contacts", title: "Contacts", icon: Users, path: "/dashboard/contacts" },
  { id: "templates", title: "Templates", icon: FileText, path: "/dashboard/templates" },
  { id: "campaigns", title: "Campaigns", icon: Send, path: "/dashboard/campaigns" },
  { id: "billing", title: "Billing", icon: Wallet, path: "/dashboard/billing" },
];

function BlasterSidebar() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant/me"],
  });

  const { data: walletData } = useQuery<{ balance: number }>({
    queryKey: ["/api/wa-blast/wallet"],
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.clear();
      window.location.href = getMainAppUrl("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const handleGoToChat = () => {
    window.location.href = getMainAppUrl("/supervisor");
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <SiWhatsapp className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">WA Blast</span>
            <span className="text-xs text-muted-foreground">by Chatvice</span>
          </div>
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + "/");
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.path} data-testid={`sidebar-${item.id}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleGoToChat}
                  className="cursor-pointer"
                  data-testid="button-handle-chat"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Handle Chat Sessions</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href={getMainAppUrl("/dashboard")} data-testid="link-main-dashboard">
                    <Home className="h-4 w-4" />
                    <span>Main Dashboard</span>
                    <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel>Wallet Balance</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Balance</span>
                <Badge variant="secondary" className="font-mono">
                  Rp {(walletData?.balance || 0).toLocaleString("id-ID")}
                </Badge>
              </div>
              <Link href="/dashboard/billing">
                <Button size="sm" className="mt-2 w-full" data-testid="button-topup">
                  <CreditCard className="mr-2 h-3 w-3" />
                  Top Up
                </Button>
              </Link>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2" data-testid="button-user-menu">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {merchant?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {merchant?.username || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {merchant?.email || ""}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <a href={getMainAppUrl("/dashboard/settings")}>
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function BlasterDashboard() {
  const { data: merchant, isLoading, isError } = useQuery<Merchant>({
    queryKey: ["/api/merchant/me"],
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !merchant) {
    window.location.href = getMainAppUrl("/login?redirect=blaster");
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <BlasterSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/dashboard/channels" component={WABlastChannelsPage} />
              <Route path="/dashboard/contacts" component={WABlastContactsPage} />
              <Route path="/dashboard/templates" component={WABlastTemplatesPage} />
              <Route path="/dashboard/campaigns" component={WABlastCampaignsPage} />
              <Route path="/dashboard/billing" component={BlasterBillingPage} />
              <Route path="/dashboard">
                <Redirect to="/dashboard/channels" />
              </Route>
              <Route>
                <Redirect to="/dashboard/channels" />
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
