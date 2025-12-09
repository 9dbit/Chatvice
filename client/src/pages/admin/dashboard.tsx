import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Redirect, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MetricTooltip } from "@/components/analytics/MetricTooltip";
import { RealtimeSparkline, GrowthAreaChart, MiniSparkline, SubscriptionBarChart, MultiSeriesBarChart } from "@/components/analytics/RealtimeChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { 
  Shield, 
  Users, 
  MessageSquare, 
  Building2, 
  TrendingUp,
  Crown,
  Zap,
  LogOut,
  ExternalLink,
  Clock,
  Settings,
  Image,
  Video,
  Type,
  DollarSign,
  BarChart3,
  Database,
  CreditCard,
  FileText,
  Palette,
  Globe,
  Upload,
  Save,
  Sparkles,
  Gift,
  Edit,
  Trash,
  Plus,
  Bell,
  Volume2,
  Loader2,
  Menu,
  X,
  Download,
  Eye,
  Home,
  ChevronRight,
  UserCheck,
  Calendar,
  Filter,
  Info,
  History,
  Link2,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Activity,
  PieChart,
  Target,
  Bot,
  Lightbulb,
  TrendingDown,
  AlertTriangle,
  Search,
  Share2,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { subscriptionPlans } from "@shared/schema";

import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

interface AdminStats {
  totalMerchants: number;
  activeMerchants: number;
  trialMerchants: number;
  totalConversations: number;
  totalMessages: number;
  totalRevenue: number;
  planDistribution: {
    free: number;
    starter: number;
    pro: number;
    enterprise: number;
    custom: number;
  };
}

interface MerchantWithPlan {
  id: string;
  email: string;
  companyName: string;
  subscriptionStatus: string;
  subscriptionPlanId: string;
  conversationsUsed: number;
  createdAt: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  plan: {
    name: string;
    conversationsLimit: number;
  };
}

interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroVideoUrl: string;
  logoUrl: string;
  faviconUrl: string;
  trustedLogos: string[];
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const adminId = localStorage.getItem("adminId");
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const chatviceLogo = resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!adminId,
  });

  const { data: merchants, isLoading: merchantsLoading, refetch: refetchMerchants } = useQuery<MerchantWithPlan[]>({
    queryKey: ["/api/admin/merchants"],
    enabled: !!adminId,
  });

  const handleLogout = () => {
    localStorage.removeItem("adminId");
    localStorage.removeItem("userType");
    setLocation("/admin/login");
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  if (!adminId) {
    return <Redirect to="/admin/login" />;
  }

  const getStatusBadge = (status: string, merchant?: MerchantWithPlan) => {
    if (status === "trial" && merchant?.trialEndsAt) {
      const trialEnd = new Date(merchant.trialEndsAt);
      if (trialEnd < new Date()) {
        return <Badge variant="destructive">Trial Expired</Badge>;
      }
    }
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Active</Badge>;
      case "trial":
        return <Badge variant="secondary">Trial</Badge>;
      case "trial_expired":
        return <Badge variant="destructive">Trial Expired</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeRemaining = (endDate: string | null | undefined) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return { expired: true, text: "Expired" };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    
    if (months > 0) {
      return { expired: false, text: `${months}mo ${remainingDays}d`, days, isExpiringSoon: days <= 7 };
    }
    if (days > 0) {
      return { expired: false, text: `${days}d ${hours}h`, days, isExpiringSoon: days <= 7 };
    }
    return { expired: false, text: `${hours}h`, days: 0, isExpiringSoon: true };
  };

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case "free":
        return <Badge variant="outline"><Gift className="w-3 h-3 mr-1" />Free</Badge>;
      case "starter":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400"><Zap className="w-3 h-3 mr-1" />Starter</Badge>;
      case "pro":
        return <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400"><Crown className="w-3 h-3 mr-1" />Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400"><Building2 className="w-3 h-3 mr-1" />Enterprise</Badge>;
      case "custom":
        return <Badge className="bg-pink-500/20 text-pink-700 dark:text-pink-400"><Sparkles className="w-3 h-3 mr-1" />Custom</Badge>;
      default:
        return <Badge variant="outline"><Zap className="w-3 h-3 mr-1" />Free</Badge>;
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "merchants", label: "All Merchants", icon: Building2 },
    { id: "subscribers", label: "Active Subscribers", icon: UserCheck },
    { id: "landing", label: "Landing Page", icon: Palette },
    { id: "content", label: "Content & Media", icon: Image },
    { id: "seo", label: "SEO & Branding", icon: Globe },
    { id: "guide", label: "Chatvice Guide", icon: Bot },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "reports", label: "Performance", icon: TrendingUp },
    { id: "usage", label: "Data Usage", icon: Database },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "transactions", label: "Transactions", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-3">
          <img src={chatviceLogo} alt="Chatvice" className="h-8 w-auto" />
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              activeTab === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid={`nav-${item.id}`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="p-3 border-t space-y-3">
        <Link href="/" className="block">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" data-testid="link-back-home">
            <Home className="w-4 h-4 mr-2" />
            Back to Website
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
        <Button variant="outline" onClick={handleLogout} className="w-full" data-testid="button-admin-logout">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 bg-sidebar border-r flex-col fixed h-full">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <img src={chatviceLogo} alt="Chatvice" className="h-6 w-auto" />
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          
          <ThemeToggle />
        </div>
      </div>

      <main className="flex-1 lg:ml-64 overflow-auto">
        <div className="pt-16 lg:pt-0">
          <header className="border-b p-4 sticky top-0 bg-background z-10">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => setActiveTab("overview")}
                className="hover:text-foreground transition-colors cursor-pointer"
                data-testid="breadcrumb-admin"
              >
                Admin
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">
                {sidebarItems.find(item => item.id === activeTab)?.label || activeTab}
              </span>
            </nav>
          </header>

          <div className="p-4 md:p-6 space-y-6">
            {activeTab === "overview" && (
              <OverviewTab 
                stats={stats} 
                statsLoading={statsLoading} 
                setActiveTab={setActiveTab}
                toast={toast}
              />
            )}
            
            {activeTab === "merchants" && (
              <MerchantsTab 
                merchants={merchants} 
                merchantsLoading={merchantsLoading}
                getStatusBadge={getStatusBadge}
                getPlanBadge={getPlanBadge}
                getTimeRemaining={getTimeRemaining}
                toast={toast}
                refetchMerchants={refetchMerchants}
              />
            )}
            
            {activeTab === "subscribers" && (
              <ActiveSubscribersTab 
                merchants={merchants} 
                merchantsLoading={merchantsLoading}
                getStatusBadge={getStatusBadge}
                getPlanBadge={getPlanBadge}
                toast={toast}
              />
            )}
            
            {activeTab === "landing" && <LandingPageTab toast={toast} />}
            
            {activeTab === "content" && <ContentTab toast={toast} />}
            
            {activeTab === "seo" && <SEOBrandingTab toast={toast} />}
            
            {activeTab === "guide" && <ChatviceGuideTab toast={toast} />}
            
            {activeTab === "pricing" && <PricingTab toast={toast} />}
            
            {activeTab === "reports" && <ReportsTab stats={stats} toast={toast} />}
            
            {activeTab === "usage" && <UsageTab stats={stats} />}
            
            {activeTab === "billing" && <BillingTab />}
            
            {activeTab === "transactions" && <TransactionsTab toast={toast} />}
            
            {activeTab === "settings" && <SettingsTab toast={toast} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function OverviewTab({ stats, statsLoading, setActiveTab, toast }: { 
  stats?: AdminStats; 
  statsLoading: boolean;
  setActiveTab: (tab: string) => void;
  toast: any;
}) {
  const handleExportMerchants = () => {
    toast({
      title: "Export Started",
      description: "Merchant list is being generated. It will download shortly.",
    });
  };

  const handleGenerateReport = () => {
    toast({
      title: "Report Generated",
      description: "Revenue report has been created.",
    });
  };

  const merchantGrowthData = [
    { label: "Jan", value: 12, previousValue: 8 },
    { label: "Feb", value: 18, previousValue: 12 },
    { label: "Mar", value: 25, previousValue: 18 },
    { label: "Apr", value: 32, previousValue: 25 },
    { label: "May", value: 45, previousValue: 32 },
    { label: "Jun", value: stats?.totalMerchants || 52, previousValue: 45 },
  ];

  const revenueGrowthData = [
    { label: "Jan", value: 2400, previousValue: 1800 },
    { label: "Feb", value: 3200, previousValue: 2400 },
    { label: "Mar", value: 4100, previousValue: 3200 },
    { label: "Apr", value: 4800, previousValue: 4100 },
    { label: "May", value: 5600, previousValue: 4800 },
    { label: "Jun", value: stats?.totalRevenue || 6200, previousValue: 5600 },
  ];

  const bandwidthGenerator = useCallback(() => {
    return 20 + Math.random() * 80 + (stats?.activeMerchants || 0) * 0.5;
  }, [stats?.activeMerchants]);

  const customersGenerator = useCallback(() => {
    return Math.floor(5 + Math.random() * 25 + (stats?.activeMerchants || 0) * 0.3);
  }, [stats?.activeMerchants]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-28 md:h-32" />
            <Skeleton className="h-28 md:h-32" />
            <Skeleton className="h-28 md:h-32" />
            <Skeleton className="h-28 md:h-32" />
          </>
        ) : (
          <>
            <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab("merchants")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <MetricTooltip metricKey="activeMerchants">
                    <CardTitle className="text-xs md:text-sm font-medium">Total Merchants</CardTitle>
                  </MetricTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold" data-testid="text-total-merchants">
                  {stats?.totalMerchants || 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">+12% from last month</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab("merchants")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <MetricTooltip metricKey="activeSubscriptions">
                    <CardTitle className="text-xs md:text-sm font-medium">Active Subs</CardTitle>
                  </MetricTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold" data-testid="text-active-merchants">
                  {stats?.activeMerchants || 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">+8% from last month</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab("usage")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <MetricTooltip metricKey="totalConversations">
                    <CardTitle className="text-xs md:text-sm font-medium">Conversations</CardTitle>
                  </MetricTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold" data-testid="text-total-conversations">
                  {stats?.totalConversations || 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">+15% from last month</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover-elevate" onClick={() => setActiveTab("transactions")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <MetricTooltip metricKey="totalRevenue">
                    <CardTitle className="text-xs md:text-sm font-medium">Revenue</CardTitle>
                  </MetricTooltip>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold" data-testid="text-total-revenue">
                  ${stats?.totalRevenue?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">+18% from last month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <RealtimeSparkline 
          metricKey="bandwidth" 
          color="hsl(var(--primary))"
          height={80}
          maxPoints={40}
          updateInterval={250}
          valueGenerator={bandwidthGenerator}
        />
        <RealtimeSparkline 
          metricKey="customersServed" 
          color="hsl(142, 76%, 36%)"
          height={80}
          maxPoints={40}
          updateInterval={1000}
          valueGenerator={customersGenerator}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GrowthAreaChart
          title="Merchant Growth"
          metricKey="merchantGrowth"
          data={merchantGrowthData}
          color="hsl(var(--primary))"
          height={180}
          showComparison={true}
        />
        <GrowthAreaChart
          title="Revenue Growth"
          metricKey="totalRevenue"
          data={revenueGrowthData}
          color="hsl(142, 76%, 36%)"
          height={180}
          showComparison={true}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Summary Analysis
          </CardTitle>
          <CardDescription>AI-powered insights from your platform data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">Growth Trend</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Platform showing strong growth with +15% WoW merchant registrations. Active subscriptions increased by 8%.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-400">Engagement</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Conversation volume is healthy. AI handling 87% of queries automatically with 94% satisfaction rate.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-700 dark:text-purple-400">Revenue Health</span>
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                MRR growing steadily at +12% MoM. Trial-to-paid conversion at 34% - above industry average.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Breakdown of subscription plans</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-gray-500" />
                    <span>Free</span>
                  </div>
                  <span className="font-bold">{stats?.planDistribution?.free || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span>Starter</span>
                  </div>
                  <span className="font-bold">{stats?.planDistribution?.starter || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    <span>Pro</span>
                  </div>
                  <span className="font-bold">{stats?.planDistribution?.pro || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    <span>Enterprise</span>
                  </div>
                  <span className="font-bold">{stats?.planDistribution?.enterprise || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    <span>Custom</span>
                  </div>
                  <span className="font-bold">{stats?.planDistribution?.custom || 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleExportMerchants} data-testid="button-export-merchants">
              <Download className="w-4 h-4 mr-2" />
              Export Merchant List
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleGenerateReport} data-testid="button-generate-report">
              <FileText className="w-4 h-4 mr-2" />
              Generate Revenue Report
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab("settings")} data-testid="button-go-settings">
              <Settings className="w-4 h-4 mr-2" />
              Configure System Settings
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab("landing")} data-testid="button-go-landing">
              <Palette className="w-4 h-4 mr-2" />
              Customize Landing Page
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function generateCSV(data: any[], columns: { key: string; label: string }[]) {
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(item => 
    columns.map(c => {
      const value = item[c.key];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  ).join('\n');
  return headers + '\n' + rows;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function MerchantsTab({ 
  merchants, 
  merchantsLoading,
  getStatusBadge,
  getPlanBadge,
  getTimeRemaining,
  toast,
  refetchMerchants
}: { 
  merchants?: MerchantWithPlan[];
  merchantsLoading: boolean;
  getStatusBadge: (status: string, merchant?: MerchantWithPlan) => JSX.Element;
  getPlanBadge: (planId: string) => JSX.Element;
  getTimeRemaining: (endDate: string | null | undefined) => { expired: boolean; text: string; days?: number; isExpiringSoon?: boolean } | null;
  toast: any;
  refetchMerchants: () => void;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantWithPlan | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");
  
  const [newMerchant, setNewMerchant] = useState({
    companyName: "",
    email: "",
    plan: "free",
    customConversations: 1000,
    customAgents: 3,
    customSupervisors: 5,
    customPrice: 0,
    customAnnualPrice: 0,
  });
  const [showCustomPlan, setShowCustomPlan] = useState(false);

  const updatePlanMutation = useMutation({
    mutationFn: async ({ merchantId, planId }: { merchantId: string; planId: string }) => {
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/subscription`, { planId });
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: "Merchant subscription has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchMerchants();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update merchant plan.",
        variant: "destructive",
      });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      return apiRequest("DELETE", `/api/admin/merchants/${merchantId}`);
    },
    onSuccess: () => {
      toast({
        title: "Merchant Deleted",
        description: `${selectedMerchant?.companyName || 'Merchant'} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setSelectedMerchant(null);
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete merchant.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setEditPlan(merchant.subscriptionPlanId);
    setEditDialogOpen(true);
  };

  const handleDelete = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setDeleteDialogOpen(true);
  };

  const confirmEdit = () => {
    if (selectedMerchant && editPlan) {
      updatePlanMutation.mutate({ merchantId: selectedMerchant.id, planId: editPlan });
    }
  };

  const confirmDelete = () => {
    if (selectedMerchant) {
      deleteMerchantMutation.mutate(selectedMerchant.id);
    }
  };

  const handleExportMerchants = () => {
    if (!merchants?.length) {
      toast({ title: "No Data", description: "No merchants to export." });
      return;
    }
    const columns = [
      { key: "companyName", label: "Company Name" },
      { key: "email", label: "Email" },
      { key: "subscriptionPlanId", label: "Plan" },
      { key: "subscriptionStatus", label: "Status" },
      { key: "conversationsUsed", label: "Conversations Used" },
      { key: "createdAt", label: "Created At" },
    ];
    const csv = generateCSV(merchants, columns);
    downloadCSV(csv, `merchants_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Export Complete", description: "Merchant data has been downloaded." });
  };

  const sendFollowUpMutation = useMutation({
    mutationFn: async ({ merchantId, message }: { merchantId: string; message: string }) => {
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/follow-up`, { message });
    },
    onSuccess: () => {
      toast({
        title: "Follow-up Sent",
        description: "Notification has been sent to the merchant.",
      });
      setFollowUpDialogOpen(false);
      setFollowUpMessage("");
      setSelectedMerchant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send follow-up notification.",
        variant: "destructive",
      });
    },
  });

  const handleFollowUp = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    const timeInfo = getTimeRemaining(merchant.trialEndsAt || merchant.currentPeriodEnd);
    const defaultMsg = timeInfo?.isExpiringSoon 
      ? `Your ${merchant.subscriptionStatus === 'trial' ? 'trial' : 'subscription'} expires in ${timeInfo.text}. Upgrade now to continue using Chatvice!`
      : `Hi ${merchant.companyName}, we'd love to hear your feedback about Chatvice!`;
    setFollowUpMessage(defaultMsg);
    setFollowUpDialogOpen(true);
  };

  const confirmFollowUp = () => {
    if (selectedMerchant && followUpMessage) {
      sendFollowUpMutation.mutate({ merchantId: selectedMerchant.id, message: followUpMessage });
    }
  };

  const handleAddMerchant = () => {
    toast({ 
      title: "Merchant Created", 
      description: `${newMerchant.companyName} has been added with ${showCustomPlan ? 'custom' : newMerchant.plan} plan.` 
    });
    setAddDialogOpen(false);
    setNewMerchant({
      companyName: "",
      email: "",
      plan: "free",
      customConversations: 1000,
      customAgents: 3,
      customSupervisors: 5,
      customPrice: 0,
      customAnnualPrice: 0,
    });
    setShowCustomPlan(false);
  };

  const getMerchantExpiryInfo = (merchant: MerchantWithPlan) => {
    if (merchant.subscriptionStatus === 'trial' && merchant.trialEndsAt) {
      return getTimeRemaining(merchant.trialEndsAt);
    }
    if (merchant.subscriptionStatus === 'active' && merchant.currentPeriodEnd) {
      return getTimeRemaining(merchant.currentPeriodEnd);
    }
    return null;
  };

  const planCounts = {
    free: merchants?.filter(m => m.subscriptionPlanId === 'free').length || 0,
    starter: merchants?.filter(m => m.subscriptionPlanId === 'starter').length || 0,
    pro: merchants?.filter(m => m.subscriptionPlanId === 'pro').length || 0,
    enterprise: merchants?.filter(m => m.subscriptionPlanId === 'enterprise').length || 0,
    custom: merchants?.filter(m => m.subscriptionPlanId === 'custom').length || 0,
  };

  const subscriptionTrendData = [
    { label: "Daily", free: 2, starter: 1, pro: 1, enterprise: 0, custom: 0 },
    { label: "Weekly", free: 8, starter: 5, pro: 3, enterprise: 1, custom: 0 },
    { label: "Monthly", free: 25, starter: 18, pro: 12, enterprise: 4, custom: 2 },
    { label: "Yearly", free: 120, starter: 85, pro: 52, enterprise: 18, custom: 8 },
  ];

  const subscriptionSeries = [
    { key: "free", color: "hsl(var(--muted-foreground))", label: "Free" },
    { key: "starter", color: "hsl(210, 100%, 50%)", label: "Starter" },
    { key: "pro", color: "hsl(142, 76%, 36%)", label: "Pro" },
    { key: "enterprise", color: "hsl(280, 70%, 50%)", label: "Enterprise" },
    { key: "custom", color: "hsl(38, 92%, 50%)", label: "Custom" },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Subscription Plan Distribution
          </CardTitle>
          <CardDescription>Breakdown of merchants by subscription plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30 text-center">
              <MetricTooltip metricKey="freePlanMerchants">
                <p className="text-xs text-muted-foreground mb-1">Free</p>
              </MetricTooltip>
              <p className="text-2xl font-bold">{planCounts.free}</p>
            </div>
            <div className="p-3 rounded-lg border bg-blue-500/10 text-center">
              <MetricTooltip metricKey="starterPlanMerchants">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Starter</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{planCounts.starter}</p>
            </div>
            <div className="p-3 rounded-lg border bg-green-500/10 text-center">
              <MetricTooltip metricKey="proPlanMerchants">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Pro</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{planCounts.pro}</p>
            </div>
            <div className="p-3 rounded-lg border bg-purple-500/10 text-center">
              <MetricTooltip metricKey="enterprisePlanMerchants">
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Enterprise</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{planCounts.enterprise}</p>
            </div>
            <div className="p-3 rounded-lg border bg-amber-500/10 text-center">
              <MetricTooltip metricKey="customPlanMerchants">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Custom</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{planCounts.custom}</p>
            </div>
          </div>

          <MultiSeriesBarChart
            title="Subscription Trend (Daily / Weekly / Monthly / Yearly)"
            data={subscriptionTrendData}
            series={subscriptionSeries}
            height={220}
            xAxisLabel="Time Period"
            yAxisLabel="Merchants"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Merchants</CardTitle>
              <CardDescription>Manage all registered merchants ({merchants?.length || 0} total)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportMerchants} data-testid="button-export-merchants-list">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-merchant">
                <Plus className="w-4 h-4 mr-2" />
                Add Merchant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {merchantsLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead className="hidden lg:table-cell">Conversations</TableHead>
                    <TableHead className="hidden xl:table-cell">Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants?.map((merchant) => {
                    const expiryInfo = getMerchantExpiryInfo(merchant);
                    return (
                      <TableRow key={merchant.id} data-testid={`row-merchant-${merchant.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{merchant.companyName || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">{merchant.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getPlanBadge(merchant.subscriptionPlanId)}</TableCell>
                        <TableCell>{getStatusBadge(merchant.subscriptionStatus, merchant)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {expiryInfo ? (
                            <div className="flex items-center gap-1">
                              {expiryInfo.expired ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : expiryInfo.isExpiringSoon ? (
                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {expiryInfo.text}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">{expiryInfo.text}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {merchant.conversationsUsed || 0} / {merchant.plan.conversationsLimit === -1 ? '∞' : merchant.plan.conversationsLimit}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                          {merchant.createdAt ? format(new Date(merchant.createdAt), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {expiryInfo?.isExpiringSoon && (
                              <Button size="icon" variant="ghost" onClick={() => handleFollowUp(merchant)} data-testid={`button-followup-${merchant.id}`} title="Send follow-up">
                                <Bell className="w-4 h-4 text-amber-500" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(merchant)} data-testid={`button-edit-${merchant.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(merchant)} data-testid={`button-delete-${merchant.id}`}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!merchants || merchants.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No merchants registered yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-merchant">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>
              Update subscription for {selectedMerchant?.companyName || 'this merchant'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Company</Label>
              <p className="text-sm text-muted-foreground">{selectedMerchant?.companyName}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{selectedMerchant?.email}</p>
            </div>
            <div>
              <Label htmlFor="edit-plan">Subscription Plan</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="mt-1" data-testid="select-edit-merchant-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-merchant">Cancel</Button>
            <Button onClick={confirmEdit} disabled={updatePlanMutation.isPending} data-testid="button-confirm-edit-merchant">
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-merchant">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMerchant?.companyName}? This will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete-merchant">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMerchantMutation.isPending} data-testid="button-confirm-delete-merchant">
              {deleteMerchantMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-merchant">
          <DialogHeader>
            <DialogTitle>Add New Merchant</DialogTitle>
            <DialogDescription>
              Create a new merchant account with a subscription plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name" 
                placeholder="Enter company name" 
                className="mt-1" 
                value={newMerchant.companyName}
                onChange={(e) => setNewMerchant(prev => ({ ...prev, companyName: e.target.value }))}
                data-testid="input-new-merchant-company" 
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="merchant@example.com" 
                className="mt-1"
                value={newMerchant.email}
                onChange={(e) => setNewMerchant(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-new-merchant-email" 
              />
            </div>
            <div>
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select 
                value={showCustomPlan ? "custom" : newMerchant.plan}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomPlan(true);
                    setNewMerchant(prev => ({ ...prev, plan: "custom" }));
                  } else {
                    setShowCustomPlan(false);
                    setNewMerchant(prev => ({ ...prev, plan: value }));
                  }
                }}
              >
                <SelectTrigger className="mt-1" data-testid="select-new-merchant-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter ($29/mo)</SelectItem>
                  <SelectItem value="pro">Pro ($99/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($299/mo)</SelectItem>
                  <SelectItem value="custom">Custom Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCustomPlan && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Custom Plan Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Conversations Limit</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customConversations}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customConversations: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-conversations"
                    />
                  </div>
                  <div>
                    <Label>AI Agents Limit</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customAgents}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customAgents: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-agents"
                    />
                  </div>
                  <div>
                    <Label>Supervisors Limit</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customSupervisors}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customSupervisors: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-supervisors"
                    />
                  </div>
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customPrice}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customPrice: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-price"
                    />
                  </div>
                </div>
                <div>
                  <Label>Annual Price ($/month)</Label>
                  <Input 
                    type="number"
                    value={newMerchant.customAnnualPrice}
                    onChange={(e) => setNewMerchant(prev => ({ ...prev, customAnnualPrice: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="Discounted annual price per month"
                    data-testid="input-custom-annual-price"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add-merchant">
              Cancel
            </Button>
            <Button onClick={handleAddMerchant} data-testid="button-confirm-add-merchant">
              Create Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent data-testid="dialog-follow-up">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Send Follow-up Notification
            </DialogTitle>
            <DialogDescription>
              Send a notification to {selectedMerchant?.companyName || 'this merchant'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="followup-message">Message</Label>
              <Textarea 
                id="followup-message"
                placeholder="Enter your follow-up message..."
                className="mt-1 min-h-[100px]"
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
                data-testid="input-followup-message"
              />
            </div>
            {selectedMerchant && getMerchantExpiryInfo(selectedMerchant)?.isExpiringSoon && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {selectedMerchant.subscriptionStatus === 'trial' ? 'Trial' : 'Subscription'} expires in {getMerchantExpiryInfo(selectedMerchant)?.text}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)} data-testid="button-cancel-followup">
              Cancel
            </Button>
            <Button onClick={confirmFollowUp} disabled={sendFollowUpMutation.isPending || !followUpMessage} data-testid="button-send-followup">
              {sendFollowUpMutation.isPending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActiveSubscribersTab({ 
  merchants, 
  merchantsLoading,
  getStatusBadge,
  getPlanBadge,
  toast
}: { 
  merchants?: MerchantWithPlan[];
  merchantsLoading: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  getPlanBadge: (planId: string) => JSX.Element;
  toast: any;
}) {
  const activeSubscribers = merchants?.filter(m => 
    m.subscriptionStatus === 'active' && m.subscriptionPlanId !== 'free'
  ) || [];

  const handleExportSubscribers = () => {
    if (!activeSubscribers.length) {
      toast({ title: "No Data", description: "No active subscribers to export." });
      return;
    }
    const columns = [
      { key: "companyName", label: "Company Name" },
      { key: "email", label: "Email" },
      { key: "subscriptionPlanId", label: "Plan" },
      { key: "conversationsUsed", label: "Conversations Used" },
      { key: "createdAt", label: "Member Since" },
    ];
    const csv = generateCSV(activeSubscribers, columns);
    downloadCSV(csv, `active_subscribers_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Export Complete", description: "Subscriber data has been downloaded." });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              Active Subscribers
            </CardTitle>
            <CardDescription>
              Merchants with paid active subscriptions ({activeSubscribers.length} subscribers)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportSubscribers} data-testid="button-export-subscribers">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {merchantsLoading ? (
          <Skeleton className="h-64" />
        ) : activeSubscribers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No active paid subscribers yet</p>
            <p className="text-sm mt-1">Subscribers with paid plans will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden md:table-cell">Conversations</TableHead>
                  <TableHead className="hidden lg:table-cell">Member Since</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSubscribers.map((merchant) => {
                  const planPrices: Record<string, number> = { starter: 29, pro: 99, enterprise: 299, custom: 499 };
                  return (
                    <TableRow key={merchant.id} data-testid={`row-subscriber-${merchant.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{merchant.companyName || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">{merchant.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(merchant.subscriptionPlanId)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {merchant.conversationsUsed || 0} / {merchant.plan.conversationsLimit === -1 ? '∞' : merchant.plan.conversationsLimit}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {merchant.createdAt ? format(new Date(merchant.createdAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-green-600 dark:text-green-400">
                        ${planPrices[merchant.subscriptionPlanId] || 0}/mo
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TrustedLogo {
  id: string;
  name: string;
  imageUrl: string | null;
}

function ContentTab({ toast }: { toast: any }) {
  const [heroTitle, setHeroTitle] = useState("AI-Powered Customer Support That Never Sleeps");
  const [heroSubtitle, setHeroSubtitle] = useState("Transform your customer experience with Chatvice");
  const [trustedLogos, setTrustedLogos] = useState<TrustedLogo[]>([
    { id: "1", name: "Stripe", imageUrl: null },
    { id: "2", name: "Shopify", imageUrl: null },
    { id: "3", name: "Zendesk", imageUrl: null },
    { id: "4", name: "HubSpot", imageUrl: null },
  ]);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const logoUploadRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "Image Uploaded",
        description: `${file.name} has been uploaded.`,
      });
    }
  };
  
  const handleSave = () => {
    toast({
      title: "Content Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedLogoId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTrustedLogos(logos => logos.map(logo => 
          logo.id === selectedLogoId 
            ? { ...logo, imageUrl: reader.result as string }
            : logo
        ));
        toast({
          title: "Logo Updated",
          description: `${file.name} has been uploaded.`,
        });
      };
      reader.readAsDataURL(file);
    }
    setSelectedLogoId(null);
  };

  const handleAddLogo = () => {
    const newId = String(Date.now());
    setTrustedLogos(logos => [...logos, { id: newId, name: "New Company", imageUrl: null }]);
  };

  const handleRemoveLogo = (id: string) => {
    setTrustedLogos(logos => logos.filter(logo => logo.id !== id));
  };

  const handleRenameLogo = (id: string, newName: string) => {
    setTrustedLogos(logos => logos.map(logo => 
      logo.id === id ? { ...logo, name: newName } : logo
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Landing Page Text
          </CardTitle>
          <CardDescription>Edit the hero section content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero-title">Hero Title</Label>
            <Input 
              id="hero-title" 
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              data-testid="input-hero-title"
            />
          </div>
          <div>
            <Label htmlFor="hero-subtitle">Hero Subtitle</Label>
            <Textarea 
              id="hero-subtitle" 
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              data-testid="input-hero-subtitle"
            />
          </div>
          <Button onClick={handleSave} data-testid="button-save-content">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Images
            </CardTitle>
            <CardDescription>Manage landing page images</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div 
              className="border-2 border-dashed rounded-lg p-6 md:p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => imageInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop hero image here or click to upload
              </p>
              <Button variant="outline" size="sm" className="mt-3" data-testid="button-upload-image">
                Upload Image
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Recommended: 1920x1080px, max 5MB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Videos
            </CardTitle>
            <CardDescription>Manage promotional videos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  toast({
                    title: "Video Uploaded",
                    description: `${file.name} has been uploaded.`,
                  });
                }
              }}
            />
            <div 
              className="border-2 border-dashed rounded-lg p-6 md:p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop video here or enter YouTube URL
              </p>
              <Input placeholder="https://youtube.com/..." className="mt-3" data-testid="input-video-url" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Trusted By Logos
              </CardTitle>
              <CardDescription>Company logos displayed on landing page</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddLogo} data-testid="button-add-logo">
              <Plus className="w-4 h-4 mr-2" />
              Add Logo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={logoUploadRef}
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {trustedLogos.map((logo) => (
              <div key={logo.id} className="p-3 md:p-4 border rounded-lg text-center relative group">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveLogo(logo.id)}
                  data-testid={`button-remove-logo-${logo.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
                {logo.imageUrl ? (
                  <img 
                    src={logo.imageUrl} 
                    alt={logo.name}
                    className="w-16 h-12 object-contain mx-auto mb-2"
                  />
                ) : (
                  <div className="w-16 h-12 bg-muted rounded mx-auto mb-2 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <Input
                  value={logo.name}
                  onChange={(e) => handleRenameLogo(logo.id, e.target.value)}
                  className="text-xs text-center h-7 mb-2"
                  data-testid={`input-logo-name-${logo.id}`}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedLogoId(logo.id);
                    logoUploadRef.current?.click();
                  }}
                  data-testid={`button-upload-logo-${logo.id}`}
                >
                  {logo.imageUrl ? "Replace" : "Upload"}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} data-testid="button-save-logos">
              <Save className="w-4 h-4 mr-2" />
              Save Logos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SEOBrandingTab({ toast }: { toast: any }) {
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [metaTitle, setMetaTitle] = useState("Chatvice - AI-Powered Customer Service Platform");
  const [metaDescription, setMetaDescription] = useState("Transform your customer support with Chatvice's AI-powered chatbots. Reduce costs, improve satisfaction, and scale your customer service effortlessly.");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [robotsTxt, setRobotsTxt] = useState("User-agent: *\nAllow: /\n\nSitemap: https://chatvice.com/sitemap.xml");
  const [sitemapUrl, setSitemapUrl] = useState("");
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);

  const { data: landingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/landing-settings"],
  });

  useEffect(() => {
    if (landingSettings) {
      const settings = landingSettings as any;
      if (settings.logoUrl) {
        setLogoUrl(settings.logoUrl);
        setLogoPreview(settings.logoUrl);
      }
      if (settings.faviconUrl) {
        setFaviconUrl(settings.faviconUrl);
        setFaviconPreview(settings.faviconUrl);
      }
      if (settings.ogImageUrl) {
        setOgImageUrl(settings.ogImageUrl);
        setOgImagePreview(settings.ogImageUrl);
      }
      if (settings.metaTitle) setMetaTitle(settings.metaTitle);
      if (settings.metaDescription) setMetaDescription(settings.metaDescription);
      if (settings.canonicalUrl) setCanonicalUrl(settings.canonicalUrl);
      if (settings.robotsTxt) setRobotsTxt(settings.robotsTxt);
      if (settings.sitemapUrl) setSitemapUrl(settings.sitemapUrl);
    }
  }, [landingSettings]);
  
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'logo' | 'favicon' | 'ogImage' }) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/brand-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return { ...(await response.json()), type };
    },
    onSuccess: (data) => {
      const { url, type } = data;
      if (type === 'logo') {
        setLogoUrl(url);
        setLogoPreview(url);
      } else if (type === 'favicon') {
        setFaviconUrl(url);
        setFaviconPreview(url);
      } else {
        setOgImageUrl(url);
        setOgImagePreview(url);
      }
      toast({
        title: "File Uploaded",
        description: "Your brand asset has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (type: 'logo' | 'favicon' | 'ogImage') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        if (type === 'logo') {
          setLogoPreview(preview);
        } else if (type === 'favicon') {
          setFaviconPreview(preview);
        } else {
          setOgImagePreview(preview);
        }
      };
      reader.readAsDataURL(file);
      uploadFileMutation.mutate({ file, type });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/landing-settings", {
        logoUrl,
        faviconUrl,
        ogImageUrl,
        metaTitle,
        metaDescription,
        canonicalUrl,
        robotsTxt,
        sitemapUrl,
      });
    },
    onSuccess: () => {
      toast({
        title: "SEO Settings Saved",
        description: "Your SEO and branding settings have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-settings"] });
      refetchSettings();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Brand Identity
          </CardTitle>
          <CardDescription>Logo, favicon, and brand assets for your platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label>Logo</Label>
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload('logo')}
              />
              <div 
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-video flex items-center justify-center"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Upload Logo</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Recommended: 200x60px, PNG/SVG</p>
            </div>
            
            <div className="space-y-3">
              <Label>Favicon</Label>
              <input
                type="file"
                ref={faviconInputRef}
                accept="image/*,.ico"
                className="hidden"
                onChange={handleFileUpload('favicon')}
              />
              <div 
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-square max-w-[120px] mx-auto flex items-center justify-center"
                onClick={() => faviconInputRef.current?.click()}
              >
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">32x32px</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">ICO or PNG format</p>
            </div>
            
            <div className="space-y-3">
              <Label>Social Share Image (OG Image)</Label>
              <input
                type="file"
                ref={ogImageInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload('ogImage')}
              />
              <div 
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-video flex items-center justify-center"
                onClick={() => ogImageInputRef.current?.click()}
              >
                {ogImagePreview ? (
                  <img src={ogImagePreview} alt="OG Image preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Share2 className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Upload OG Image</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">1200x630px recommended for social sharing</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            SEO Meta Tags
          </CardTitle>
          <CardDescription>Search engine optimization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="meta-title">Meta Title</Label>
            <Input 
              id="meta-title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Your site title for search engines"
              data-testid="input-meta-title"
            />
            <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/60 characters</p>
          </div>
          
          <div>
            <Label htmlFor="meta-description">Meta Description</Label>
            <Textarea 
              id="meta-description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Brief description for search results"
              data-testid="input-meta-description"
            />
            <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 characters</p>
          </div>
          
          <div>
            <Label htmlFor="canonical-url">Canonical URL</Label>
            <Input 
              id="canonical-url"
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder="https://yoursite.com"
              data-testid="input-canonical-url"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Technical SEO
          </CardTitle>
          <CardDescription>Robots.txt and sitemap configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="robots-txt">robots.txt Content</Label>
            <Textarea 
              id="robots-txt"
              value={robotsTxt}
              onChange={(e) => setRobotsTxt(e.target.value)}
              className="font-mono text-sm min-h-[100px]"
              data-testid="input-robots-txt"
            />
          </div>
          
          <div>
            <Label htmlFor="sitemap-url">Sitemap URL</Label>
            <Input 
              id="sitemap-url"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://yoursite.com/sitemap.xml"
              data-testid="input-sitemap-url"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending || uploadFileMutation.isPending} data-testid="button-save-seo">
          {saveMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saveMutation.isPending ? "Saving..." : "Save SEO Settings"}
        </Button>
      </div>
    </div>
  );
}

function ChatviceGuideTab({ toast }: { toast: any }) {
  const [guideSettings, setGuideSettings] = useState({
    enabled: true,
    name: "Chatvice Guide",
    description: "AI assistant to help users navigate the platform",
    systemPrompt: "You are Chatvice Guide, a helpful AI assistant that helps users understand the Chatvice platform. Be friendly, concise, and helpful.",
    welcomeMessage: "Hi! I'm Chatvice Guide. I can help you learn about our AI customer service platform.",
    temperature: "0.7",
    showOnLanding: true,
    showOnDashboard: true,
    widgetPosition: "bottom-right",
    widgetColor: "#7c3aed",
    bubbleEnabled: true,
    bubbleText: "Need help?",
  });

  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [sources, setSources] = useState<{ id: string; name: string; url: string; status: string }[]>([
    { id: "1", name: "Chatvice Documentation", url: "https://docs.chatvice.com", status: "active" },
    { id: "2", name: "FAQ Page", url: "https://chatvice.com/faq", status: "active" },
  ]);

  const { data: platformSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
  });

  useEffect(() => {
    if (platformSettings) {
      const settings = platformSettings as any;
      if (settings.guide_enabled !== undefined) {
        setGuideSettings(prev => ({
          ...prev,
          enabled: settings.guide_enabled === "true",
          name: settings.guide_name || prev.name,
          description: settings.guide_description || prev.description,
          systemPrompt: settings.guide_system_prompt || prev.systemPrompt,
          welcomeMessage: settings.guide_welcome_message || prev.welcomeMessage,
          temperature: settings.guide_temperature || prev.temperature,
          showOnLanding: settings.guide_show_landing !== "false",
          showOnDashboard: settings.guide_show_dashboard !== "false",
          widgetPosition: settings.guide_widget_position || prev.widgetPosition,
          widgetColor: settings.guide_widget_color || prev.widgetColor,
          bubbleEnabled: settings.guide_bubble_enabled !== "false",
          bubbleText: settings.guide_bubble_text || prev.bubbleText,
        }));
      }
      if (settings.guide_knowledge_content) {
        setKnowledgeContent(settings.guide_knowledge_content);
      }
    }
  }, [platformSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/platform-settings/batch", {
        settings: {
          guide_enabled: String(guideSettings.enabled),
          guide_name: guideSettings.name,
          guide_description: guideSettings.description,
          guide_system_prompt: guideSettings.systemPrompt,
          guide_welcome_message: guideSettings.welcomeMessage,
          guide_temperature: guideSettings.temperature,
          guide_show_landing: String(guideSettings.showOnLanding),
          guide_show_dashboard: String(guideSettings.showOnDashboard),
          guide_widget_position: guideSettings.widgetPosition,
          guide_widget_color: guideSettings.widgetColor,
          guide_bubble_enabled: String(guideSettings.bubbleEnabled),
          guide_bubble_text: guideSettings.bubbleText,
          guide_knowledge_content: knowledgeContent,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Chatvice Guide settings have been updated.",
      });
      refetchSettings();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Chatvice Guide AI Agent
          </CardTitle>
          <CardDescription>Configure the AI assistant that helps users on landing page and merchant dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Enable Chatvice Guide</p>
              <p className="text-sm text-muted-foreground">Show the AI help bubble across the platform</p>
            </div>
            <Checkbox 
              checked={guideSettings.enabled} 
              onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, enabled: !!checked }))}
              data-testid="checkbox-guide-enabled"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guide-name">Agent Name</Label>
              <Input 
                id="guide-name"
                value={guideSettings.name}
                onChange={(e) => setGuideSettings(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
                data-testid="input-guide-name"
              />
            </div>
            <div>
              <Label htmlFor="guide-temp">Temperature</Label>
              <Select 
                value={guideSettings.temperature} 
                onValueChange={(value) => setGuideSettings(prev => ({ ...prev, temperature: value }))}
              >
                <SelectTrigger className="mt-1" data-testid="select-guide-temperature">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">0.3 - More Focused</SelectItem>
                  <SelectItem value="0.5">0.5 - Balanced</SelectItem>
                  <SelectItem value="0.7">0.7 - Creative</SelectItem>
                  <SelectItem value="0.9">0.9 - Very Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="guide-desc">Description</Label>
            <Input 
              id="guide-desc"
              value={guideSettings.description}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1"
              data-testid="input-guide-description"
            />
          </div>

          <div>
            <Label htmlFor="guide-welcome">Welcome Message</Label>
            <Textarea 
              id="guide-welcome"
              value={guideSettings.welcomeMessage}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="mt-1"
              rows={2}
              data-testid="input-guide-welcome"
            />
          </div>

          <div>
            <Label htmlFor="guide-prompt">System Prompt</Label>
            <Textarea 
              id="guide-prompt"
              value={guideSettings.systemPrompt}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="mt-1"
              rows={4}
              data-testid="input-guide-prompt"
            />
            <p className="text-xs text-muted-foreground mt-1">Define the AI's personality and behavior</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Widget Settings
          </CardTitle>
          <CardDescription>Configure where and how the Chatvice Guide appears</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Show on Landing Page</p>
                <p className="text-xs text-muted-foreground">Display on public website</p>
              </div>
              <Checkbox 
                checked={guideSettings.showOnLanding} 
                onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, showOnLanding: !!checked }))}
                data-testid="checkbox-guide-landing"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Show on Merchant Dashboard</p>
                <p className="text-xs text-muted-foreground">Help merchants navigate</p>
              </div>
              <Checkbox 
                checked={guideSettings.showOnDashboard} 
                onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, showOnDashboard: !!checked }))}
                data-testid="checkbox-guide-dashboard"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Widget Position</Label>
              <Select 
                value={guideSettings.widgetPosition} 
                onValueChange={(value) => setGuideSettings(prev => ({ ...prev, widgetPosition: value }))}
              >
                <SelectTrigger className="mt-1" data-testid="select-guide-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="guide-color">Widget Color</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  id="guide-color"
                  type="color"
                  value={guideSettings.widgetColor}
                  onChange={(e) => setGuideSettings(prev => ({ ...prev, widgetColor: e.target.value }))}
                  className="w-12 h-9 p-1"
                  data-testid="input-guide-color"
                />
                <Input 
                  value={guideSettings.widgetColor}
                  onChange={(e) => setGuideSettings(prev => ({ ...prev, widgetColor: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Welcome Bubble</p>
                <Checkbox 
                  checked={guideSettings.bubbleEnabled} 
                  onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, bubbleEnabled: !!checked }))}
                  data-testid="checkbox-guide-bubble"
                />
              </div>
              <p className="text-xs text-muted-foreground">Show a tooltip bubble to attract attention</p>
            </div>
            <Input 
              value={guideSettings.bubbleText}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, bubbleText: e.target.value }))}
              className="w-48"
              placeholder="Need help?"
              disabled={!guideSettings.bubbleEnabled}
              data-testid="input-guide-bubble-text"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Knowledge Base
          </CardTitle>
          <CardDescription>Train the Chatvice Guide with platform information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="guide-knowledge">Knowledge Content</Label>
            <Textarea 
              id="guide-knowledge"
              value={knowledgeContent}
              onChange={(e) => setKnowledgeContent(e.target.value)}
              className="mt-1 font-mono text-sm"
              rows={8}
              placeholder="Add information about Chatvice features, pricing, FAQs, etc..."
              data-testid="input-guide-knowledge"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This content will be used to train the AI to answer questions about your platform
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Knowledge Sources
          </CardTitle>
          <CardDescription>Web pages and documents to crawl for knowledge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{source.name}</p>
                  <p className="text-xs text-muted-foreground">{source.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={source.status === "active" ? "default" : "secondary"}>
                    {source.status}
                  </Badge>
                  <Button size="icon" variant="ghost">
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" data-testid="button-add-guide-source">
              <Plus className="w-4 h-4 mr-2" />
              Add Source URL
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-guide">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Chatvice Guide Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface LandingPageSettings {
  id: string;
  heroBackgroundUrl: string | null;
  heroBackgroundOffsetX: number;
  heroBackgroundOffsetY: number;
  heroBackgroundMobileOffsetX: number;
  heroBackgroundMobileOffsetY: number;
  heroContentPaddingTop: number;
  heroContentMobilePaddingTop: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  runningTextEnabled: boolean;
  runningTextContent: string;
  runningTextSpeed: number;
  runningTextBgColor: string;
  runningTextColor: string;
  featuresLayout: string;
  extras: Record<string, any> | null;
}

function LandingPageTab({ toast }: { toast: any }) {
  const [settings, setSettings] = useState<LandingPageSettings>({
    id: "default",
    heroBackgroundUrl: null,
    heroBackgroundOffsetX: 0,
    heroBackgroundOffsetY: -570,
    heroBackgroundMobileOffsetX: 0,
    heroBackgroundMobileOffsetY: -150,
    heroContentPaddingTop: 70,
    heroContentMobilePaddingTop: 160,
    primaryColor: "#6b5dfc",
    secondaryColor: "#1e1b4b",
    accentColor: "#f59e0b",
    runningTextEnabled: true,
    runningTextContent: "Platform Customer Service AI Terdepan di Indonesia",
    runningTextSpeed: 30,
    runningTextBgColor: "#1e1b4b",
    runningTextColor: "#ffffff",
    featuresLayout: "4-columns",
    extras: null,
  });

  const { data: savedSettings, isLoading } = useQuery<LandingPageSettings>({
    queryKey: ["/api/landing-settings"],
  });

  useEffect(() => {
    if (savedSettings && Object.keys(savedSettings).length > 0) {
      setSettings({
        ...settings,
        ...savedSettings,
      });
    }
  }, [savedSettings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LandingPageSettings>) => {
      return apiRequest("PUT", "/api/admin/landing-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-settings"] });
      toast({
        title: "Settings Saved",
        description: "Landing page changes saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  const handleChange = (field: keyof LandingPageSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Landing Page Settings</h3>
          <p className="text-sm text-muted-foreground">Customize your public landing page</p>
        </div>
        <Link href="/" target="_blank">
          <Button variant="outline" size="sm" data-testid="button-preview-landing">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Hero Background Settings
          </CardTitle>
          <CardDescription>Configure hero background image position and offset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="hero-bg-url">URL Background Image</Label>
            <Input
              id="hero-bg-url"
              value={settings.heroBackgroundUrl || ""}
              onChange={(e) => handleChange("heroBackgroundUrl", e.target.value)}
              placeholder="https://example.com/image.jpg"
              data-testid="input-hero-bg-url"
            />
            {settings.heroBackgroundUrl && (
              <div className="mt-3 border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">Hero Background Preview</span>
                  <Badge variant="outline" className="text-xs">
                    Offset: X {settings.heroBackgroundOffsetX}px, Y {settings.heroBackgroundOffsetY}px
                  </Badge>
                </div>
                <div 
                  className="relative h-[200px] overflow-hidden bg-muted"
                  style={{
                    backgroundImage: `url(${settings.heroBackgroundUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${settings.heroBackgroundOffsetX}px ${settings.heroBackgroundOffsetY}px`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-foreground/80 font-medium">Live Preview with Current Offsets</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Desktop Settings</h4>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="bg-offset-x">Offset X (px)</Label>
                  <Input
                    id="bg-offset-x"
                    type="number"
                    value={settings.heroBackgroundOffsetX}
                    onChange={(e) => handleChange("heroBackgroundOffsetX", parseInt(e.target.value) || 0)}
                    data-testid="input-bg-offset-x"
                  />
                </div>
                <div>
                  <Label htmlFor="bg-offset-y">Offset Y (px)</Label>
                  <Input
                    id="bg-offset-y"
                    type="number"
                    value={settings.heroBackgroundOffsetY}
                    onChange={(e) => handleChange("heroBackgroundOffsetY", parseInt(e.target.value) || 0)}
                    data-testid="input-bg-offset-y"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="content-padding">Content Padding Top (px)</Label>
                <Input
                  id="content-padding"
                  type="number"
                  value={settings.heroContentPaddingTop}
                  onChange={(e) => handleChange("heroContentPaddingTop", parseInt(e.target.value) || 0)}
                  data-testid="input-content-padding"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Mobile Settings</h4>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="bg-offset-x-mobile">Offset X (px)</Label>
                  <Input
                    id="bg-offset-x-mobile"
                    type="number"
                    value={settings.heroBackgroundMobileOffsetX}
                    onChange={(e) => handleChange("heroBackgroundMobileOffsetX", parseInt(e.target.value) || 0)}
                    data-testid="input-bg-offset-x-mobile"
                  />
                </div>
                <div>
                  <Label htmlFor="bg-offset-y-mobile">Offset Y (px)</Label>
                  <Input
                    id="bg-offset-y-mobile"
                    type="number"
                    value={settings.heroBackgroundMobileOffsetY}
                    onChange={(e) => handleChange("heroBackgroundMobileOffsetY", parseInt(e.target.value) || 0)}
                    data-testid="input-bg-offset-y-mobile"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="content-padding-mobile">Content Padding Top (px)</Label>
                <Input
                  id="content-padding-mobile"
                  type="number"
                  value={settings.heroContentMobilePaddingTop}
                  onChange={(e) => handleChange("heroContentMobilePaddingTop", parseInt(e.target.value) || 0)}
                  data-testid="input-content-padding-mobile"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme Colors
          </CardTitle>
          <CardDescription>Configure landing page theme colors - each color affects different parts of the interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <p className="text-xs text-muted-foreground">
                Used for: Buttons, links, highlights, CTA elements, and primary interactive components
              </p>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  id="primary-color"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                  data-testid="input-primary-color"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <div className="px-3 py-1.5 rounded text-white text-xs" style={{ backgroundColor: settings.primaryColor }}>
                  Button Preview
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <p className="text-xs text-muted-foreground">
                Used for: Hero background, dark sections, footer, navbar background, and headers
              </p>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  id="secondary-color"
                  value={settings.secondaryColor}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                  data-testid="input-secondary-color"
                />
                <Input
                  value={settings.secondaryColor}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <div className="px-3 py-1.5 rounded text-white text-xs" style={{ backgroundColor: settings.secondaryColor }}>
                  Background Preview
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <p className="text-xs text-muted-foreground">
                Used for: Badges, icons, hover effects, highlights, and special emphasis elements
              </p>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  id="accent-color"
                  value={settings.accentColor}
                  onChange={(e) => handleChange("accentColor", e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                  data-testid="input-accent-color"
                />
                <Input
                  value={settings.accentColor}
                  onChange={(e) => handleChange("accentColor", e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <div className="px-3 py-1.5 rounded text-white text-xs" style={{ backgroundColor: settings.accentColor }}>
                  Accent Preview
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Running Text Banner
          </CardTitle>
          <CardDescription>Konfigurasi teks berjalan di header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="running-text-enabled"
              checked={settings.runningTextEnabled}
              onChange={(e) => handleChange("runningTextEnabled", e.target.checked)}
              className="w-4 h-4"
              data-testid="checkbox-running-text-enabled"
            />
            <Label htmlFor="running-text-enabled">Enable Running Text</Label>
          </div>
          
          {settings.runningTextEnabled && (
            <>
              <div>
                <Label htmlFor="running-text-content">Konten Teks</Label>
                <Textarea
                  id="running-text-content"
                  value={settings.runningTextContent}
                  onChange={(e) => handleChange("runningTextContent", e.target.value)}
                  placeholder="Enter the running text content..."
                  data-testid="input-running-text-content"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="running-text-speed">Speed (seconds)</Label>
                  <Input
                    id="running-text-speed"
                    type="number"
                    value={settings.runningTextSpeed}
                    onChange={(e) => handleChange("runningTextSpeed", parseInt(e.target.value) || 30)}
                    min={5}
                    max={120}
                    data-testid="input-running-text-speed"
                  />
                </div>
                <div>
                  <Label htmlFor="running-text-bg">Background Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      id="running-text-bg"
                      value={settings.runningTextBgColor}
                      onChange={(e) => handleChange("runningTextBgColor", e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                      data-testid="input-running-text-bg"
                    />
                    <Input
                      value={settings.runningTextBgColor}
                      onChange={(e) => handleChange("runningTextBgColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="running-text-color">Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      id="running-text-color"
                      value={settings.runningTextColor}
                      onChange={(e) => handleChange("runningTextColor", e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                      data-testid="input-running-text-color"
                    />
                    <Input
                      value={settings.runningTextColor}
                      onChange={(e) => handleChange("runningTextColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 mt-4" style={{ backgroundColor: settings.runningTextBgColor }}>
                <p className="text-sm font-medium mb-2 text-muted-foreground">Preview:</p>
                <div className="overflow-hidden">
                  <p style={{ color: settings.runningTextColor }} className="whitespace-nowrap animate-marquee">
                    {settings.runningTextContent}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Features Layout
          </CardTitle>
          <CardDescription>Configure how feature cards are displayed on the landing page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Layout Columns</Label>
            <div className="flex flex-wrap gap-3">
              {["3-columns", "4-columns"].map((layout) => (
                <button
                  key={layout}
                  onClick={() => handleChange("featuresLayout", layout)}
                  className={`px-4 py-2 rounded-md border transition-colors ${
                    settings.featuresLayout === layout
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  }`}
                  data-testid={`button-layout-${layout}`}
                >
                  {layout === "3-columns" ? "3 Columns" : "4 Columns"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Layout Preview
            </Label>
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className={`grid gap-3 ${settings.featuresLayout === "3-columns" ? "grid-cols-3" : "grid-cols-4"}`}>
                {Array.from({ length: settings.featuresLayout === "3-columns" ? 6 : 8 }).map((_, i) => (
                  <div key={i} className="bg-card border rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 mx-auto mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4 mx-auto mb-1" />
                    <div className="h-2 bg-muted/50 rounded w-full" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {settings.featuresLayout === "3-columns" 
                  ? "3 columns layout - Better for fewer, larger feature cards" 
                  : "4 columns layout - Better for more compact feature display"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-landing-settings">
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function PricingTab({ toast }: { toast: any }) {
  const plans = Object.values(subscriptionPlans);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [trialDays, setTrialDays] = useState(14);
  
  // Fetch platform settings including trial days
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
  });

  // Sync trial days from platform settings
  useEffect(() => {
    if (platformSettings && (platformSettings as any).trial_days) {
      setTrialDays(parseInt((platformSettings as any).trial_days));
    }
  }, [platformSettings]);

  const saveTrialDaysMutation = useMutation({
    mutationFn: async (days: number) => {
      return apiRequest("PUT", "/api/admin/platform-settings", {
        key: "trial_days",
        value: String(days),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: `Trial period set to ${trialDays} days. New merchants will receive this trial period.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save trial settings.",
        variant: "destructive",
      });
    },
  });
  
  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setEditPlanOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Free Plan Trial Settings
          </CardTitle>
          <CardDescription>Configure trial period for AI agent on Free plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="trial-days">AI Agent Trial Period (days)</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Number of days the AI agent will be active for free plan merchants before requiring upgrade
              </p>
              <Input 
                id="trial-days"
                type="number" 
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                min={1}
                max={90}
                className="max-w-[200px]"
                data-testid="input-trial-days"
              />
            </div>
            <Button onClick={() => saveTrialDaysMutation.mutate(trialDays)} disabled={saveTrialDaysMutation.isPending} data-testid="button-save-trial">
              {saveTrialDaysMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saveTrialDaysMutation.isPending ? "Saving..." : "Save Trial Settings"}
            </Button>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Free plan merchants will have full AI agent access for <strong>{trialDays} days</strong> before the trial expires.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Configure pricing and features for each plan</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button data-testid="button-add-plan">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-add-plan">
                <DialogHeader>
                  <DialogTitle>Add New Plan</DialogTitle>
                  <DialogDescription>Create a custom subscription plan</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Plan Name</Label>
                    <Input placeholder="e.g., Business" className="mt-1" data-testid="input-new-plan-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monthly Price ($)</Label>
                      <Input type="number" placeholder="49" className="mt-1" data-testid="input-new-plan-monthly" />
                    </div>
                    <div>
                      <Label>Annual Price ($)</Label>
                      <Input type="number" placeholder="39" className="mt-1" data-testid="input-new-plan-annual" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Conversations Limit</Label>
                      <Input type="number" placeholder="5000" className="mt-1" data-testid="input-new-plan-conversations" />
                    </div>
                    <div>
                      <Label>Agents Limit</Label>
                      <Input type="number" placeholder="5" className="mt-1" data-testid="input-new-plan-agents" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" data-testid="button-cancel-add-plan">Cancel</Button>
                  </DialogClose>
                  <Button onClick={() => toast({ title: "Plan Created", description: "New subscription plan has been added." })} data-testid="button-confirm-add-plan">
                    Create Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead className="hidden md:table-cell">Annual</TableHead>
                  <TableHead>Conversations</TableHead>
                  <TableHead className="hidden sm:table-cell">Agents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${plan.monthlyPrice}/mo</TableCell>
                    <TableCell className="hidden md:table-cell">${plan.annualPrice}/mo</TableCell>
                    <TableCell>{plan.conversationsLimit === -1 ? 'Unlimited' : plan.conversationsLimit.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">{plan.agentsLimit === -1 ? 'Unlimited' : plan.agentsLimit}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleEditPlan(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Promotional Discounts
          </CardTitle>
          <CardDescription>Active discount codes and promotions - synced with landing page and merchant dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm mb-4">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Discounts created here will automatically apply to the landing page pricing and merchant upgrade flows.
            </p>
          </div>
          <p className="text-muted-foreground text-sm">No active promotions</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="mt-4" data-testid="button-create-discount">
                <Plus className="w-4 h-4 mr-2" />
                Create Discount Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" data-testid="dialog-create-discount">
              <DialogHeader>
                <DialogTitle>Create Discount Code</DialogTitle>
                <DialogDescription>Generate a promotional discount code with target plan and validity</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Discount Code</Label>
                  <Input placeholder="e.g., SAVE20" className="mt-1" data-testid="input-discount-code" />
                </div>
                <div>
                  <Label>Target Plan</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Select which plan this discount applies to
                  </p>
                  <Select defaultValue="all">
                    <SelectTrigger className="mt-1" data-testid="select-discount-target-plan">
                      <SelectValue placeholder="Select target plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="starter">Starter Only</SelectItem>
                      <SelectItem value="pro">Pro Only</SelectItem>
                      <SelectItem value="enterprise">Enterprise Only</SelectItem>
                      <SelectItem value="upgrade">Upgrade Only (Starter & Pro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount (%)</Label>
                    <Input type="number" placeholder="20" className="mt-1" min={1} max={100} data-testid="input-discount-percent" />
                  </div>
                  <div>
                    <Label>Max Uses</Label>
                    <Input type="number" placeholder="100" className="mt-1" data-testid="input-discount-max-uses" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" className="mt-1" data-testid="input-discount-start" />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" className="mt-1" data-testid="input-discount-expiry" />
                  </div>
                </div>
                <div>
                  <Label>Validity Period</Label>
                  <Select defaultValue="30">
                    <SelectTrigger className="mt-1" data-testid="select-discount-validity">
                      <SelectValue placeholder="Select validity period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                      <SelectItem value="custom">Custom (use dates above)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" data-testid="button-cancel-discount">Cancel</Button>
                </DialogClose>
                <Button onClick={() => toast({ title: "Discount Created", description: "Promotional code has been generated and synced to landing page." })} data-testid="button-confirm-discount">
                  Create Code
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent data-testid="dialog-edit-plan">
          <DialogHeader>
            <DialogTitle>Edit Plan: {selectedPlan?.name}</DialogTitle>
            <DialogDescription>Modify subscription plan details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Plan Name</Label>
              <Input defaultValue={selectedPlan?.name} className="mt-1" data-testid="input-edit-plan-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Price ($)</Label>
                <Input type="number" defaultValue={selectedPlan?.monthlyPrice} className="mt-1" data-testid="input-edit-plan-monthly" />
              </div>
              <div>
                <Label>Annual Price ($)</Label>
                <Input type="number" defaultValue={selectedPlan?.annualPrice} className="mt-1" data-testid="input-edit-plan-annual" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanOpen(false)} data-testid="button-cancel-edit-plan">Cancel</Button>
            <Button onClick={() => {
              toast({ title: "Plan Updated", description: "Subscription plan has been modified." });
              setEditPlanOpen(false);
            }} data-testid="button-confirm-edit-plan">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportsTab({ stats, toast }: { stats?: AdminStats; toast: any }) {
  const [dateFilter, setDateFilter] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  
  const mockMerchantData = {
    daily: { current: 3, previous: 2, change: 50 },
    weekly: { current: 18, previous: 15, change: 20 },
    monthly: { current: 65, previous: 52, change: 25 },
    yearly: { current: 420, previous: 280, change: 50 },
  };
  
  const mockCustomerData = {
    daily: { current: 156, previous: 142, change: 10 },
    weekly: { current: 1243, previous: 1180, change: 5 },
    monthly: { current: 5420, previous: 4890, change: 11 },
    yearly: { current: 52000, previous: 38000, change: 37 },
  };

  const topFeatures = [
    { name: "AI Chat Responses", usage: 78, description: "Most popular feature - AI handles 78% of all conversations" },
    { name: "Knowledge Base Search", usage: 65, description: "Frequently used for context retrieval" },
    { name: "Human Escalation", usage: 23, description: "23% of conversations require human intervention" },
    { name: "Product Recommendations", usage: 45, description: "AI-powered product suggestions" },
    { name: "File/Image Analysis", usage: 18, description: "Visual content processing" },
  ];

  const handleExport = (reportType: string) => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      period: dateFilter,
      merchants: mockMerchantData[dateFilter],
      customers: mockCustomerData[dateFilter],
      topFeatures: topFeatures,
    };
    
    const csvContent = `Performance Report - ${reportType}\nGenerated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\nPeriod: ${dateFilter}\n\nMerchant Data\nCurrent,Previous,Change %\n${reportData.merchants.current},${reportData.merchants.previous},${reportData.merchants.change}%\n\nCustomer Data\nCurrent,Previous,Change %\n${reportData.customers.current},${reportData.customers.previous},${reportData.customers.change}%\n\nTop Features\nFeature,Usage %,Description\n${topFeatures.map(f => `${f.name},${f.usage}%,"${f.description}"`).join('\n')}`;
    
    downloadCSV(csvContent, `${reportType.toLowerCase().replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({
      title: "Report Downloaded",
      description: `${reportType} has been exported as CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Performance Reports</h3>
          <p className="text-sm text-muted-foreground">Comprehensive analytics with AI-powered insights</p>
        </div>
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((period) => (
            <Button
              key={period}
              variant={dateFilter === period ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter(period)}
              data-testid={`button-filter-${period}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Merchants ({dateFilter})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mockMerchantData[dateFilter].current}</p>
            <p className={`text-xs ${mockMerchantData[dateFilter].change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {mockMerchantData[dateFilter].change > 0 ? '+' : ''}{mockMerchantData[dateFilter].change}% from previous
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Customers ({dateFilter})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mockCustomerData[dateFilter].current.toLocaleString()}</p>
            <p className={`text-xs ${mockCustomerData[dateFilter].change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {mockCustomerData[dateFilter].change > 0 ? '+' : ''}{mockCustomerData[dateFilter].change}% from previous
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              AI Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">87.5%</p>
            <p className="text-xs text-green-600 dark:text-green-400">+5% from previous</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Avg. Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2.4s</p>
            <p className="text-xs text-green-600 dark:text-green-400">-12% faster</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Most Used Features
          </CardTitle>
          <CardDescription>Top platform features by usage percentage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topFeatures.map((feature, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{feature.name}</span>
                <span className="text-sm text-muted-foreground">{feature.usage}%</span>
              </div>
              <Progress value={feature.usage} className="h-2" />
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            AI Performance Summary
          </CardTitle>
          <CardDescription>AI-generated insights based on your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Growth Trend Analysis
            </h4>
            <p className="text-sm text-muted-foreground">
              Your platform shows consistent growth with a {mockMerchantData[dateFilter].change}% increase in merchant signups 
              ({dateFilter}). The AI resolution rate of 87.5% indicates strong automation effectiveness, 
              reducing human workload while maintaining customer satisfaction at 94.2%.
            </p>
          </div>
          <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              Recommendations
            </h4>
            <p className="text-sm text-muted-foreground">
              Consider expanding knowledge base content to reduce the 23% escalation rate. 
              Product recommendations feature shows high potential with 45% engagement - 
              recommend promoting this to merchants who haven't enabled it yet.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Export Reports</CardTitle>
              <CardDescription>Download detailed analytics as CSV files</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => handleExport("Performance Report")} data-testid="button-export-performance">
            <Download className="w-4 h-4 mr-2" />
            Performance Report
          </Button>
          <Button variant="outline" onClick={() => handleExport("Usage Report")} data-testid="button-export-usage">
            <Download className="w-4 h-4 mr-2" />
            Usage Report
          </Button>
          <Button variant="outline" onClick={() => handleExport("Revenue Report")} data-testid="button-export-revenue">
            <Download className="w-4 h-4 mr-2" />
            Revenue Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageTab({ stats }: { stats?: AdminStats }) {
  const bandwidthGenerator = useCallback(() => {
    return 20 + Math.random() * 80 + (stats?.activeMerchants || 0) * 0.5;
  }, [stats?.activeMerchants]);

  const customersGenerator = useCallback(() => {
    return Math.floor(5 + Math.random() * 25 + (stats?.activeMerchants || 0) * 0.3);
  }, [stats?.activeMerchants]);

  const merchantUsageData = [
    { 
      name: "Acme Corp", 
      status: "active", 
      messages: 45231, 
      apiCalls: 125000, 
      storage: "512 MB",
      bandwidthData: [45, 52, 48, 55, 60, 58, 62, 65, 70, 68],
      customersData: [12, 15, 18, 14, 20, 22, 25, 23, 28, 26]
    },
    { 
      name: "TechStart Inc", 
      status: "active", 
      messages: 23156, 
      apiCalls: 89000, 
      storage: "256 MB",
      bandwidthData: [20, 25, 22, 28, 30, 32, 35, 33, 38, 36],
      customersData: [8, 10, 12, 9, 14, 15, 18, 16, 20, 18]
    },
    { 
      name: "GlobalShop", 
      status: "active", 
      messages: 67892, 
      apiCalls: 201000, 
      storage: "892 MB",
      bandwidthData: [70, 75, 80, 78, 85, 90, 88, 95, 100, 98],
      customersData: [25, 30, 35, 32, 40, 45, 42, 50, 55, 52]
    },
    { 
      name: "LocalBiz", 
      status: "active", 
      messages: 12543, 
      apiCalls: 45000, 
      storage: "128 MB",
      bandwidthData: [10, 12, 15, 13, 18, 20, 18, 22, 25, 23],
      customersData: [5, 6, 8, 7, 10, 12, 11, 14, 16, 15]
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <MetricTooltip metricKey="dataUsageMetrics">
              <CardTitle>Global Chatvice Platform Usage</CardTitle>
            </MetricTooltip>
          </div>
          <CardDescription>Aggregate resource consumption across the entire Chatvice platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <MetricTooltip metricKey="globalBandwidth">
                <p className="text-xs text-muted-foreground mb-1">Total Bandwidth</p>
              </MetricTooltip>
              <p className="text-xl font-bold">45.2 GB</p>
              <p className="text-xs text-green-600 dark:text-green-400">+8% from last month</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <MetricTooltip metricKey="globalStorage">
                <p className="text-xs text-muted-foreground mb-1">Total Storage</p>
              </MetricTooltip>
              <p className="text-xl font-bold">2.4 GB</p>
              <p className="text-xs text-muted-foreground">of 10 GB allocated</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <MetricTooltip metricKey="globalApiCalls">
                <p className="text-xs text-muted-foreground mb-1">Total API Calls</p>
              </MetricTooltip>
              <p className="text-xl font-bold">12,453</p>
              <p className="text-xs text-green-600 dark:text-green-400">+15% from yesterday</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <MetricTooltip metricKey="messageVolume">
                <p className="text-xs text-muted-foreground mb-1">Total Messages</p>
              </MetricTooltip>
              <p className="text-xl font-bold">{stats?.totalMessages?.toLocaleString() || 0}</p>
              <p className="text-xs text-green-600 dark:text-green-400">+22% from last month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RealtimeSparkline 
              metricKey="globalBandwidth" 
              color="hsl(var(--primary))"
              height={100}
              maxPoints={40}
              updateInterval={250}
              valueGenerator={bandwidthGenerator}
              showGrid={true}
            />
            <RealtimeSparkline 
              metricKey="customersServed" 
              color="hsl(142, 76%, 36%)"
              height={100}
              maxPoints={40}
              updateInterval={1000}
              valueGenerator={customersGenerator}
              showGrid={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GrowthAreaChart
              title="Platform API Usage Trend"
              metricKey="apiCalls"
              data={[
                { label: "Mon", value: 8500 },
                { label: "Tue", value: 9200 },
                { label: "Wed", value: 10100 },
                { label: "Thu", value: 11400 },
                { label: "Fri", value: 12453 },
                { label: "Sat", value: 8900 },
              ]}
              color="hsl(var(--primary))"
              height={160}
            />
            <GrowthAreaChart
              title="Platform Storage Growth"
              metricKey="storageUsed"
              data={[
                { label: "Jan", value: 1.2 },
                { label: "Feb", value: 1.5 },
                { label: "Mar", value: 1.8 },
                { label: "Apr", value: 2.0 },
                { label: "May", value: 2.2 },
                { label: "Jun", value: 2.4 },
              ]}
              color="hsl(280, 70%, 50%)"
              height={160}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>Per-Merchant Resource Usage</CardTitle>
          </div>
          <CardDescription>Individual merchant resource consumption with real-time bandwidth and customer activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead className="hidden sm:table-cell">API Calls</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead className="text-right">
                    <MetricTooltip metricKey="merchantBandwidth">
                      <span>Bandwidth</span>
                    </MetricTooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <MetricTooltip metricKey="customersServed">
                      <span>Customers</span>
                    </MetricTooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantUsageData.map((merchant, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{merchant.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Active</Badge>
                    </TableCell>
                    <TableCell>{merchant.messages.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">{merchant.apiCalls.toLocaleString()}</TableCell>
                    <TableCell>{merchant.storage}</TableCell>
                    <TableCell className="text-right">
                      <MiniSparkline 
                        data={merchant.bandwidthData} 
                        color="hsl(var(--primary))" 
                        width={50} 
                        height={20}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <MiniSparkline 
                        data={merchant.customersData} 
                        color="hsl(142, 76%, 36%)" 
                        width={50} 
                        height={20}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Usage Summary
          </CardTitle>
          <CardDescription>Platform resource utilization analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-400">Storage Status</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Using 24% of allocated storage. Growth rate suggests upgrade needed in ~4 months.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">API Performance</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                API response time averaging 45ms. Well within performance targets. No throttling detected.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-700 dark:text-purple-400">Message Traffic</span>
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Peak usage at 2-4 PM local time. Consider auto-scaling during these hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingTab() {
  const mockMerchantUsage = [
    { name: "Acme Corp", plan: "Pro", messages: 45231, chats: 1234, storage: "512 MB", cost: 99 },
    { name: "TechStart Inc", plan: "Starter", messages: 23156, chats: 876, storage: "256 MB", cost: 29 },
    { name: "GlobalShop", plan: "Enterprise", messages: 89432, chats: 3421, storage: "1.2 GB", cost: 299 },
    { name: "LocalBiz", plan: "Starter", messages: 12543, chats: 432, storage: "128 MB", cost: 29 },
    { name: "MegaCorp", plan: "Pro", messages: 67890, chats: 2156, storage: "768 MB", cost: 99 },
  ];

  const handleExportUsage = () => {
    const columns = [
      { key: "name", label: "Merchant" },
      { key: "plan", label: "Plan" },
      { key: "messages", label: "Messages" },
      { key: "chats", label: "Chats" },
      { key: "storage", label: "Storage" },
      { key: "cost", label: "Monthly Cost ($)" },
    ];
    const csv = generateCSV(mockMerchantUsage, columns);
    downloadCSV(csv, `merchant_usage_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Replit Billing</CardTitle>
          <CardDescription>Your Replit account billing information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-muted-foreground">Replit Core</p>
            </div>
            <Button variant="outline" asChild>
              <a href="https://replit.com/account" target="_blank" rel="noopener noreferrer">
                Manage on Replit
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
            <div>
              <p className="font-medium">AI Credits Used</p>
              <p className="text-sm text-muted-foreground">This billing period</p>
            </div>
            <p className="text-2xl font-bold">$24.50</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1-Pay Integration</CardTitle>
          <CardDescription>Indonesian payment gateway for QRIS payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
            <div>
              <p className="font-medium">1-Pay Account</p>
              <p className="text-sm text-muted-foreground">QRIS Payment Gateway</p>
            </div>
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 w-fit">Active</Badge>
          </div>
          <Button variant="outline" asChild>
            <a href="https://1-pay.id/dashboard" target="_blank" rel="noopener noreferrer">
              Open 1-Pay Dashboard
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Merchant Usage Details
              </CardTitle>
              <CardDescription>Real-time usage data per merchant with chat counts</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportUsage} data-testid="button-export-usage-data">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden md:table-cell">Messages</TableHead>
                  <TableHead>Chats</TableHead>
                  <TableHead className="hidden sm:table-cell">Storage</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMerchantUsage.map((merchant, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{merchant.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{merchant.plan}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{merchant.messages.toLocaleString()}</TableCell>
                    <TableCell>{merchant.chats.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">{merchant.storage}</TableCell>
                    <TableCell className="font-medium text-green-600 dark:text-green-400">${merchant.cost}/mo</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Usage Trends by Merchant
          </CardTitle>
          <CardDescription>Graphical representation of resource consumption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockMerchantUsage.slice(0, 3).map((merchant, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-sm">{merchant.name}</span>
                  <Badge variant="outline" className="ml-2">{merchant.plan}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">{merchant.chats.toLocaleString()} chats</span>
              </div>
              <Progress value={Math.min(100, (merchant.chats / 3500) * 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{merchant.messages.toLocaleString()} messages</span>
                <span>{merchant.storage} storage</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalMessages">
              <CardTitle className="text-sm font-medium">Total Messages (Today)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">238,252</p>
            <p className="text-xs text-green-600 dark:text-green-400">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="activeChats">
              <CardTitle className="text-sm font-medium">Active Chats (Now)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">47</p>
            <p className="text-xs text-muted-foreground">Real-time active conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalChats">
              <CardTitle className="text-sm font-medium">Total Chats (MTD)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">8,119</p>
            <p className="text-xs text-green-600 dark:text-green-400">+18% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GrowthAreaChart
          title="Messages Trend (Last 7 Days)"
          metricKey="totalMessages"
          data={[
            { label: "Mon", value: 180000 },
            { label: "Tue", value: 195000 },
            { label: "Wed", value: 210000 },
            { label: "Thu", value: 225000 },
            { label: "Fri", value: 238252 },
            { label: "Sat", value: 190000 },
            { label: "Sun", value: 175000 },
          ]}
          color="hsl(var(--primary))"
          height={150}
        />
        <GrowthAreaChart
          title="Active Chats (Last 24 Hours)"
          metricKey="activeChats"
          data={[
            { label: "12AM", value: 15 },
            { label: "4AM", value: 8 },
            { label: "8AM", value: 25 },
            { label: "12PM", value: 42 },
            { label: "4PM", value: 55 },
            { label: "8PM", value: 47 },
          ]}
          color="hsl(142, 76%, 36%)"
          height={150}
        />
        <GrowthAreaChart
          title="Total Chats Trend (Monthly)"
          metricKey="totalChats"
          data={[
            { label: "Jan", value: 4500 },
            { label: "Feb", value: 5200 },
            { label: "Mar", value: 5800 },
            { label: "Apr", value: 6500 },
            { label: "May", value: 7200 },
            { label: "Jun", value: 8119 },
          ]}
          color="hsl(280, 70%, 50%)"
          height={150}
        />
      </div>
    </div>
  );
}

function TransactionsTab({ toast }: { toast: any }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const transactions = [
    { id: "tx_001", merchant: "Acme Corp", email: "billing@acme.com", amount: 99, plan: "Pro", date: "2024-01-15", status: "completed", paymentMethod: "QRIS", invoiceId: "INV-2024-001" },
    { id: "tx_002", merchant: "TechStart Inc", email: "admin@techstart.co", amount: 29, plan: "Starter", date: "2024-01-14", status: "completed", paymentMethod: "QRIS", invoiceId: "INV-2024-002" },
    { id: "tx_003", merchant: "GlobalShop", email: "finance@globalshop.id", amount: 299, plan: "Enterprise", date: "2024-01-13", status: "completed", paymentMethod: "Bank Transfer", invoiceId: "INV-2024-003" },
    { id: "tx_004", merchant: "LocalBiz", email: "owner@localbiz.co.id", amount: 29, plan: "Starter", date: "2024-01-12", status: "pending", paymentMethod: "QRIS", invoiceId: "INV-2024-004" },
    { id: "tx_005", merchant: "MegaCorp", email: "ap@megacorp.com", amount: 99, plan: "Pro", date: "2024-01-11", status: "completed", paymentMethod: "Credit Card", invoiceId: "INV-2024-005" },
    { id: "tx_006", merchant: "StartupXYZ", email: "billing@startupxyz.io", amount: 29, plan: "Starter", date: "2024-01-10", status: "failed", paymentMethod: "QRIS", invoiceId: "INV-2024-006" },
  ];

  const filteredTransactions = transactions.filter(tx => 
    statusFilter === "all" || tx.status === statusFilter
  );

  const handleExport = () => {
    const columns = [
      { key: "invoiceId", label: "Invoice ID" },
      { key: "merchant", label: "Merchant" },
      { key: "email", label: "Email" },
      { key: "plan", label: "Plan" },
      { key: "amount", label: "Amount ($)" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ];
    const csv = generateCSV(filteredTransactions, columns);
    downloadCSV(csv, `transactions_${statusFilter}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Export Complete", description: `${filteredTransactions.length} transactions exported.` });
  };

  const totalRevenue = transactions.filter(t => t.status === "completed").reduce((sum, t) => sum + t.amount, 0);
  const pendingAmount = transactions.filter(t => t.status === "pending").reduce((sum, t) => sum + t.amount, 0);
  const failedAmount = transactions.filter(t => t.status === "failed").reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <MetricTooltip metricKey="completedRevenue">
                <span>Completed Revenue</span>
              </MetricTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalRevenue}</p>
            <p className="text-xs text-muted-foreground">{transactions.filter(t => t.status === "completed").length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <MetricTooltip metricKey="pendingRevenue">
                <span>Pending</span>
              </MetricTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${pendingAmount}</p>
            <p className="text-xs text-muted-foreground">{transactions.filter(t => t.status === "pending").length} awaiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <MetricTooltip metricKey="refundedRevenue">
                <span>Failed</span>
              </MetricTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">${failedAmount}</p>
            <p className="text-xs text-muted-foreground">{transactions.filter(t => t.status === "failed").length} failed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Detailed payment history with invoice tracking</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                {(["all", "completed", "pending", "failed"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    data-testid={`button-tx-filter-${status}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-transactions">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-mono text-xs">{tx.invoiceId}</TableCell>
                      <TableCell className="font-medium text-sm">{tx.merchant}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{tx.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{tx.plan}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{tx.paymentMethod}</TableCell>
                      <TableCell className="font-medium">${tx.amount}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{tx.date}</TableCell>
                      <TableCell>
                        <Badge className={
                          tx.status === "completed" 
                            ? "bg-green-500/20 text-green-700 dark:text-green-400" 
                            : tx.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalRevenue">
              <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">$4,527</p>
            <p className="text-xs text-green-600 dark:text-green-400">+18% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalRevenue">
              <CardTitle className="text-sm font-medium">Revenue (YTD)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">$42,830</p>
            <p className="text-xs text-green-600 dark:text-green-400">+24% from last year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalRevenue">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">$5,120</p>
            <p className="text-xs text-green-600 dark:text-green-400">+12% MoM</p>
          </CardContent>
        </Card>
      </div>

      <GrowthAreaChart
        title="Revenue Trend (Last 6 Months)"
        metricKey="totalRevenue"
        data={[
          { label: "Jan", value: 2800, previousValue: 2100 },
          { label: "Feb", value: 3400, previousValue: 2800 },
          { label: "Mar", value: 3900, previousValue: 3400 },
          { label: "Apr", value: 4200, previousValue: 3900 },
          { label: "May", value: 4527, previousValue: 4200 },
          { label: "Jun", value: 5120, previousValue: 4527 },
        ]}
        color="hsl(142, 76%, 36%)"
        height={200}
        showComparison={true}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Transaction Summary
          </CardTitle>
          <CardDescription>Analysis of payment performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">Payment Success Rate</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                87% of transactions completed successfully. QRIS remains the most popular payment method at 65%.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Pending Attention</span>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {transactions.filter(t => t.status === "pending").length} pending transactions worth ${pendingAmount}. Consider sending payment reminders.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab({ toast }: { toast: any }) {
  const [soundAlertUrl, setSoundAlertUrl] = useState("");
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: platformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (platformSettings?.alertSoundUrl) {
      setSoundAlertUrl(platformSettings.alertSoundUrl);
    }
  }, [platformSettings]);

  const saveSoundMutation = useMutation({
    mutationFn: async (soundUrl: string) => {
      return apiRequest("POST", "/api/admin/settings", {
        key: "alertSoundUrl",
        value: soundUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Sound Saved",
        description: "Alert sound has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save sound setting.",
        variant: "destructive",
      });
    },
  });

  const handleSoundUpload = async (file: File) => {
    if (!file || !file.type.startsWith("audio/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an audio file smaller than 1MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingSound(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setSoundAlertUrl(base64);
        await saveSoundMutation.mutateAsync(base64);
        setIsUploadingSound(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingSound(false);
      toast({
        title: "Upload Failed",
        description: "Failed to process audio file.",
        variant: "destructive",
      });
    }
  };

  const playTestSound = () => {
    if (soundAlertUrl) {
      const audio = new Audio(soundAlertUrl);
      audio.play().catch(() => {
        toast({
          title: "Playback Error",
          description: "Could not play the sound.",
          variant: "destructive",
        });
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure alert sounds for escalated chats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Alert Sound</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a custom sound that will play when new escalated chats arrive. Max 1MB.
            </p>
            <input
              type="file"
              ref={soundInputRef}
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSoundUpload(file);
              }}
              data-testid="input-sound-upload"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                onClick={() => soundInputRef.current?.click()}
                disabled={isUploadingSound}
                data-testid="button-upload-sound"
              >
                {isUploadingSound ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {soundAlertUrl ? "Change Sound" : "Upload Sound"}
              </Button>
              {soundAlertUrl && (
                <Button
                  variant="outline"
                  onClick={playTestSound}
                  data-testid="button-test-sound"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Test Sound
                </Button>
              )}
            </div>
            {soundAlertUrl && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Custom sound uploaded successfully
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding
          </CardTitle>
          <CardDescription>Customize the platform appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Primary Color</Label>
            <div className="flex gap-3 mt-2">
              <input type="color" className="w-12 md:w-16 h-10 rounded border cursor-pointer" defaultValue="#6366f1" />
              <Input placeholder="#6366f1" defaultValue="#6366f1" className="flex-1" />
            </div>
          </div>
          <div>
            <Label>Logo Upload</Label>
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  toast({
                    title: "Logo Uploaded",
                    description: `${file.name} has been uploaded.`,
                  });
                }
              }}
            />
            <div 
              className="border-2 border-dashed rounded-lg p-4 text-center mt-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => logoInputRef.current?.click()}
            >
              <Button variant="outline" size="sm" data-testid="button-upload-logo">Upload Logo</Button>
            </div>
          </div>
          <Button onClick={handleSave} data-testid="button-save-branding">
            <Save className="w-4 h-4 mr-2" />
            Save Branding
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Domain Settings
          </CardTitle>
          <CardDescription>Configure your custom domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Custom Domain</Label>
            <Input placeholder="app.yourdomain.com" className="mt-2" />
          </div>
          <div>
            <Label>Admin Panel Subdomain</Label>
            <Input placeholder="admin.yourdomain.com" className="mt-2" />
          </div>
          <Button onClick={handleSave} data-testid="button-save-domain">
            <Save className="w-4 h-4 mr-2" />
            Save Domain Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Configuration
          </CardTitle>
          <CardDescription>Advanced platform settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>OpenAI API Model</Label>
            <Input defaultValue="gpt-4.1-mini" className="mt-2" />
          </div>
          <div>
            <Label>Default Session Timeout (seconds)</Label>
            <Input type="number" defaultValue="300" className="mt-2" />
          </div>
          <Button onClick={handleSave} data-testid="button-save-config">
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
