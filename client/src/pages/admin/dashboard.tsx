import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Check,
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
  RefreshCw,
  MessageCircle,
  Send,
  ImageIcon,
  EyeOff,
  Trash2,
  GripVertical,
  Layers,
  Wallet,
  Pencil,
  Bitcoin,
  Key,
  Landmark,
  BookOpen,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  websiteUrl?: string;
  picName?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  city?: string;
  region?: string;
  businessCategory?: string;
  staffCount?: string;
  officialWebsiteName?: string;
  officialDomain?: string;
  paymentProvider?: string;
  paymentCustomerId?: string;
  paymentSubscriptionId?: string;
  billingInterval?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string;
  profileCompleted?: boolean;
  username?: string;
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

  // Fetch pending custom requests count for sidebar badge
  const { data: customRequests = [] } = useQuery<{ status: string }[]>({
    queryKey: ["/api/admin/custom-plan-requests"],
    enabled: !!adminId,
  });
  const pendingCustomRequestsCount = customRequests.filter(r => r.status === "submitted" || r.status === "under_review").length;

  // Fetch pending crypto payments count for sidebar badge
  const { data: cryptoPayments = [] } = useQuery<{ status: string }[]>({
    queryKey: ["/api/admin/crypto-payments"],
    enabled: !!adminId,
  });
  const pendingCryptoPaymentsCount = cryptoPayments.filter(p => p.status === "pending").length;
  
  // Fetch pending bank transfer payments count for sidebar badge
  const { data: bankTransferPayments = [] } = useQuery<{ status: string }[]>({
    queryKey: ["/api/admin/bank-transfer-payments"],
    enabled: !!adminId,
  });
  const pendingBankTransferPaymentsCount = bankTransferPayments.filter(p => p.status === "pending").length;
  
  // Fetch pending affiliates count for sidebar badge
  const { data: affiliatesData = [] } = useQuery<{ status: string }[]>({
    queryKey: ["/api/admin/affiliates"],
    enabled: !!adminId,
  });
  const pendingAffiliatesCount = affiliatesData.filter(a => a.status === "pending").length;

  // Fetch pending withdrawal requests count for sidebar badge
  const { data: withdrawalRequests = [] } = useQuery<{ status: string }[]>({
    queryKey: ["/api/admin/withdrawals"],
    enabled: !!adminId,
  });
  const pendingWithdrawalsCount = withdrawalRequests.filter(w => w.status === "pending").length;

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
    { id: "payment", label: "Payment Integration", icon: Zap },
    { id: "menuorder", label: "Menu Order", icon: Layers },
    { id: "crypto-payments", label: "Crypto Payments", icon: Bitcoin },
    { id: "bank-transfers", label: "Bank Transfers", icon: Landmark },
    { id: "custom-requests", label: "Custom Requests", icon: Sparkles },
    { id: "affiliates", label: "Affiliates", icon: Share2 },
    { id: "withdrawals", label: "Withdrawals", icon: Wallet },
    { id: "knowledge-templates", label: "Knowledge Templates", icon: BookOpen },
    { id: "activity-logs", label: "Activity Logs", icon: Activity },
    { id: "user-data", label: "Customer Data", icon: Users },
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
        {sidebarItems.map((item) => {
          // Get badge count for specific items
          let badgeCount = 0;
          if (item.id === "custom-requests") {
            badgeCount = pendingCustomRequestsCount;
          } else if (item.id === "crypto-payments") {
            badgeCount = pendingCryptoPaymentsCount;
          } else if (item.id === "bank-transfers") {
            badgeCount = pendingBankTransferPaymentsCount;
          } else if (item.id === "affiliates") {
            badgeCount = pendingAffiliatesCount;
          } else if (item.id === "withdrawals") {
            badgeCount = pendingWithdrawalsCount;
          }
          
          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTabChange(item.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-md text-sm transition-colors relative ${
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{item.label}</span>
              {badgeCount > 0 && (
                <span className={`min-w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full ${
                  activeTab === item.id 
                    ? "bg-primary-foreground/20 text-primary-foreground" 
                    : "bg-amber-500 text-white"
                }`}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="p-3 border-t space-y-2">
        <Link href="/" className="block">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground min-h-[44px]" data-testid="link-back-home">
            <Home className="w-5 h-5 mr-2" />
            Back to Website
          </Button>
        </Link>
        <div className="flex items-center gap-2 min-h-[44px]">
          <ThemeToggle />
        </div>
        <Button variant="outline" onClick={handleLogout} className="w-full min-h-[44px]" data-testid="button-admin-logout">
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 bg-sidebar border-r flex-col fixed h-full z-40">
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
                refetchMerchants={refetchMerchants}
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
            
            {activeTab === "payment" && <PaymentIntegrationTab toast={toast} />}
            
            {activeTab === "settings" && <SettingsTab toast={toast} />}
            
            {activeTab === "menuorder" && <MenuOrderTab toast={toast} />}
            
            {activeTab === "crypto-payments" && <CryptoPaymentsTab toast={toast} />}
            
            {activeTab === "bank-transfers" && <BankTransferPaymentsTab toast={toast} />}
            
            {activeTab === "custom-requests" && <CustomRequestsTab toast={toast} />}
            
            {activeTab === "affiliates" && <AffiliatesTab toast={toast} />}
            
            {activeTab === "withdrawals" && <WithdrawalsTab toast={toast} />}
            
            {activeTab === "knowledge-templates" && <KnowledgeTemplatesTab toast={toast} />}
            
            {activeTab === "activity-logs" && <ActivityLogsTab toast={toast} />}
            
            {activeTab === "user-data" && <AdminUserDataTab toast={toast} />}
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
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedDetailMerchant, setSelectedDetailMerchant] = useState<MerchantWithPlan | null>(null);
  
  const handleViewDetail = (merchant: MerchantWithPlan) => {
    setSelectedDetailMerchant(merchant);
    setDetailDrawerOpen(true);
  };
  const [editPlan, setEditPlan] = useState("");
  const [editCustomConfig, setEditCustomConfig] = useState({
    customConversationsLimit: 1000,
    customAgentsLimit: 3,
    customSupervisorsLimit: 5,
    customSourcesLimit: 10,
    customSuggestedQuestionsLimit: 5,
    customMonthlyPrice: 0,
    customAnnualPrice: 0,
  });
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [invoiceBillingInterval, setInvoiceBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  
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
  
  // Search state for All Merchants
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter states for All Merchants
  const [showFilters, setShowFilters] = useState(false);
  const [filterJoinDateFrom, setFilterJoinDateFrom] = useState("");
  const [filterJoinDateTo, setFilterJoinDateTo] = useState("");
  const [filterSubscribeDateFrom, setFilterSubscribeDateFrom] = useState("");
  const [filterSubscribeDateTo, setFilterSubscribeDateTo] = useState("");
  const [filterSortBy, setFilterSortBy] = useState(""); // top_spending, agent_rating, supervisor_rating, etc.
  const [filterPaymentMethod, setFilterPaymentMethod] = useState(""); // qris, ewallet, credit_card, paypal, crypto, virtual_account, bank_transfer
  const [filterPromptType, setFilterPromptType] = useState(""); // best, longest, shortest
  const [filterEscalation, setFilterEscalation] = useState(""); // high, medium, low
  const [filterMinAgents, setFilterMinAgents] = useState("");
  const [filterMaxAgents, setFilterMaxAgents] = useState("");
  const [filterMinSupervisors, setFilterMinSupervisors] = useState("");
  const [filterMaxSupervisors, setFilterMaxSupervisors] = useState("");

  const updatePlanMutation = useMutation({
    mutationFn: async ({ merchantId, planId, customConfig }: { 
      merchantId: string; 
      planId: string; 
      customConfig?: typeof editCustomConfig;
    }) => {
      const payload: any = { planId };
      if (planId === 'custom' && customConfig) {
        payload.customConversationsLimit = customConfig.customConversationsLimit;
        payload.customAgentsLimit = customConfig.customAgentsLimit;
        payload.customSupervisorsLimit = customConfig.customSupervisorsLimit;
        payload.customSourcesLimit = customConfig.customSourcesLimit;
        payload.customSuggestedQuestionsLimit = customConfig.customSuggestedQuestionsLimit;
        payload.customMonthlyPrice = customConfig.customMonthlyPrice;
        payload.customAnnualPrice = customConfig.customAnnualPrice;
      }
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/subscription`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: "Merchant subscription has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ 
      merchantId, 
      config, 
      billingInterval 
    }: { 
      merchantId: string; 
      config: typeof editCustomConfig;
      billingInterval: "monthly" | "annual";
    }) => {
      const amount = billingInterval === "monthly" ? config.customMonthlyPrice : config.customAnnualPrice;
      return apiRequest("POST", `/api/admin/custom-invoices`, {
        merchantId,
        description: `Custom Plan - ${billingInterval === "annual" ? "Annual" : "Monthly"}`,
        conversationsLimit: config.customConversationsLimit,
        agentsLimit: config.customAgentsLimit,
        supervisorsLimit: config.customSupervisorsLimit,
        sourcesLimit: config.customSourcesLimit,
        suggestedQuestionsLimit: config.customSuggestedQuestionsLimit,
        amount,
        currency: "IDR",
        billingInterval,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invoice Sent",
        description: data.message || "Invoice has been created and is now visible in merchant's billing page.",
      });
      setInvoiceDialogOpen(false);
      setEditDialogOpen(false);
      refetchMerchants();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invoice.",
        variant: "destructive",
      });
    },
  });

  const handleSendInvoice = () => {
    if (selectedMerchant && editPlan === 'custom') {
      const amount = invoiceBillingInterval === "monthly" 
        ? editCustomConfig.customMonthlyPrice 
        : editCustomConfig.customAnnualPrice;
      
      if (!amount || amount <= 0) {
        toast({
          title: "Invalid Price",
          description: `Please set a valid ${invoiceBillingInterval} price before sending invoice.`,
          variant: "destructive",
        });
        return;
      }
      
      setInvoiceDialogOpen(true);
    }
  };

  const confirmSendInvoice = () => {
    if (selectedMerchant) {
      sendInvoiceMutation.mutate({
        merchantId: selectedMerchant.id,
        config: editCustomConfig,
        billingInterval: invoiceBillingInterval,
      });
    }
  };

  const handleEdit = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setEditPlan(merchant.subscriptionPlanId);
    // Load existing custom config if merchant has custom plan
    setEditCustomConfig({
      customConversationsLimit: (merchant as any).customConversationsLimit ?? 1000,
      customAgentsLimit: (merchant as any).customAgentsLimit ?? 3,
      customSupervisorsLimit: (merchant as any).customSupervisorsLimit ?? 5,
      customSourcesLimit: (merchant as any).customSourcesLimit ?? 10,
      customSuggestedQuestionsLimit: (merchant as any).customSuggestedQuestionsLimit ?? 5,
      customMonthlyPrice: (merchant as any).customMonthlyPrice ?? 0,
      customAnnualPrice: (merchant as any).customAnnualPrice ?? 0,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setDeleteDialogOpen(true);
  };

  const confirmEdit = () => {
    if (selectedMerchant && editPlan) {
      updatePlanMutation.mutate({ 
        merchantId: selectedMerchant.id, 
        planId: editPlan,
        customConfig: editPlan === 'custom' ? editCustomConfig : undefined
      });
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
      { key: "id", label: "Merchant ID" },
      { key: "companyName", label: "Company Name" },
      { key: "email", label: "Email" },
      { key: "websiteUrl", label: "Website URL" },
      { key: "picName", label: "PIC Name" },
      { key: "formattedPhone", label: "Phone" },
      { key: "country", label: "Country" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "subscriptionPlanId", label: "Plan" },
      { key: "subscriptionStatus", label: "Status" },
      { key: "conversationsUsed", label: "Conversations Used" },
      { key: "createdAt", label: "Created At" },
    ];
    const formattedMerchants = merchants.map(m => ({
      ...m,
      formattedPhone: m.phone ? `${m.phoneCountryCode || ''}${m.phone}` : '',
    }));
    const csv = generateCSV(formattedMerchants, columns);
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

  const extendTrialMutation = useMutation({
    mutationFn: async ({ merchantId, days }: { merchantId: string; days: number }) => {
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/extend-trial`, { days });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Trial Extended",
        description: data.message || "Trial period has been extended successfully.",
      });
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to extend trial period.",
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

  // Type for merchant analytics
  type MerchantAnalytics = {
    merchantId: string;
    totalSpending: number;
    agentCount: number;
    supervisorCount: number;
    avgAgentRating: number;
    avgAgentResponseTime: number;
    avgSupervisorRating: number;
    avgSupervisorResponseTime: number;
    escalationRate: number;
    promptLength: number;
    paymentMethods: string[];
  };

  // Fetch merchant analytics data
  const { data: merchantAnalytics } = useQuery<MerchantAnalytics[]>({
    queryKey: ["/api/admin/merchants/analytics"],
  });

  // Create a map for quick lookup
  const analyticsMap = useMemo(() => {
    const map: Record<string, MerchantAnalytics> = {};
    merchantAnalytics?.forEach(a => { map[a.merchantId] = a; });
    return map;
  }, [merchantAnalytics]);

  // Filter and sort merchants
  const filteredMerchants = useMemo(() => {
    if (!merchants) return [];
    
    let result = [...merchants];
    
    // Search by company name or merchant ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(m => 
        m.companyName?.toLowerCase().includes(query) || 
        m.id.toLowerCase().includes(query)
      );
    }
    
    // Filter by join date
    if (filterJoinDateFrom) {
      const fromDate = new Date(filterJoinDateFrom);
      result = result.filter(m => m.createdAt && new Date(m.createdAt) >= fromDate);
    }
    if (filterJoinDateTo) {
      const toDate = new Date(filterJoinDateTo);
      result = result.filter(m => m.createdAt && new Date(m.createdAt) <= toDate);
    }
    
    // Filter by first subscribe date
    if (filterSubscribeDateFrom) {
      const fromDate = new Date(filterSubscribeDateFrom);
      result = result.filter(m => (m as any).firstSubscribedAt && new Date((m as any).firstSubscribedAt) >= fromDate);
    }
    if (filterSubscribeDateTo) {
      const toDate = new Date(filterSubscribeDateTo);
      result = result.filter(m => (m as any).firstSubscribedAt && new Date((m as any).firstSubscribedAt) <= toDate);
    }
    
    // Filter by payment method
    if (filterPaymentMethod) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        return analytics?.paymentMethods?.includes(filterPaymentMethod);
      });
    }
    
    // Filter by agent count
    if (filterMinAgents) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        return (analytics?.agentCount || 0) >= parseInt(filterMinAgents);
      });
    }
    if (filterMaxAgents) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        return (analytics?.agentCount || 0) <= parseInt(filterMaxAgents);
      });
    }
    
    // Filter by supervisor count
    if (filterMinSupervisors) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        return (analytics?.supervisorCount || 0) >= parseInt(filterMinSupervisors);
      });
    }
    if (filterMaxSupervisors) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        return (analytics?.supervisorCount || 0) <= parseInt(filterMaxSupervisors);
      });
    }
    
    // Filter by escalation rate
    if (filterEscalation) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        const rate = analytics?.escalationRate || 0;
        if (filterEscalation === 'high') return rate > 30;
        if (filterEscalation === 'medium') return rate >= 10 && rate <= 30;
        if (filterEscalation === 'low') return rate < 10;
        return true;
      });
    }
    
    // Filter by prompt type
    if (filterPromptType) {
      result = result.filter(m => {
        const analytics = analyticsMap[m.id];
        const len = analytics?.promptLength || 0;
        if (filterPromptType === 'longest') return len > 1000;
        if (filterPromptType === 'shortest') return len < 200;
        if (filterPromptType === 'best') return len >= 200 && len <= 1000;
        return true;
      });
    }
    
    // Sort
    if (filterSortBy) {
      result.sort((a, b) => {
        const aAnalytics = analyticsMap[a.id];
        const bAnalytics = analyticsMap[b.id];
        
        switch (filterSortBy) {
          case 'top_spending':
            return (bAnalytics?.totalSpending || 0) - (aAnalytics?.totalSpending || 0);
          case 'agent_rating':
            return (bAnalytics?.avgAgentRating || 0) - (aAnalytics?.avgAgentRating || 0);
          case 'agent_response':
            return (aAnalytics?.avgAgentResponseTime || 999999) - (bAnalytics?.avgAgentResponseTime || 999999);
          case 'supervisor_rating':
            return (bAnalytics?.avgSupervisorRating || 0) - (aAnalytics?.avgSupervisorRating || 0);
          case 'supervisor_response':
            return (aAnalytics?.avgSupervisorResponseTime || 999999) - (bAnalytics?.avgSupervisorResponseTime || 999999);
          case 'newest':
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case 'oldest':
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          default:
            return 0;
        }
      });
    }
    
    return result;
  }, [merchants, merchantAnalytics, analyticsMap, searchQuery, filterJoinDateFrom, filterJoinDateTo, filterSubscribeDateFrom, filterSubscribeDateTo, filterPaymentMethod, filterMinAgents, filterMaxAgents, filterMinSupervisors, filterMaxSupervisors, filterEscalation, filterPromptType, filterSortBy]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterJoinDateFrom("");
    setFilterJoinDateTo("");
    setFilterSubscribeDateFrom("");
    setFilterSubscribeDateTo("");
    setFilterSortBy("");
    setFilterPaymentMethod("");
    setFilterPromptType("");
    setFilterEscalation("");
    setFilterMinAgents("");
    setFilterMaxAgents("");
    setFilterMinSupervisors("");
    setFilterMaxSupervisors("");
  };

  const hasActiveFilters = searchQuery || filterJoinDateFrom || filterJoinDateTo || filterSubscribeDateFrom || filterSubscribeDateTo || filterSortBy || filterPaymentMethod || filterPromptType || filterEscalation || filterMinAgents || filterMaxAgents || filterMinSupervisors || filterMaxSupervisors;

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
              <CardDescription>
                Manage all registered merchants ({filteredMerchants.length}{hasActiveFilters ? ` of ${merchants?.length || 0}` : ''} total)
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search company name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48 sm:w-64 h-8 text-sm"
                  data-testid="input-search-merchants"
                />
              </div>
              <Button 
                variant={showFilters ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {hasActiveFilters && <Badge variant="secondary" className="ml-1">{[searchQuery, filterJoinDateFrom, filterJoinDateTo, filterSubscribeDateFrom, filterSubscribeDateTo, filterSortBy, filterPaymentMethod, filterPromptType, filterEscalation, filterMinAgents, filterMaxAgents, filterMinSupervisors, filterMaxSupervisors].filter(Boolean).length}</Badge>}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
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
          
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Join Date Range</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={filterJoinDateFrom} 
                      onChange={(e) => setFilterJoinDateFrom(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-join-from"
                    />
                    <Input 
                      type="date" 
                      value={filterJoinDateTo} 
                      onChange={(e) => setFilterJoinDateTo(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-join-to"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium">First Subscribe Date</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={filterSubscribeDateFrom} 
                      onChange={(e) => setFilterSubscribeDateFrom(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-subscribe-from"
                    />
                    <Input 
                      type="date" 
                      value={filterSubscribeDateTo} 
                      onChange={(e) => setFilterSubscribeDateTo(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-subscribe-to"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Sort By</Label>
                  <Select value={filterSortBy} onValueChange={setFilterSortBy}>
                    <SelectTrigger className="text-xs" data-testid="select-filter-sort">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top_spending">Top Spending</SelectItem>
                      <SelectItem value="agent_rating">Agent Rating (Best)</SelectItem>
                      <SelectItem value="agent_response">Agent Response Time (Fastest)</SelectItem>
                      <SelectItem value="supervisor_rating">Supervisor Rating (Best)</SelectItem>
                      <SelectItem value="supervisor_response">Supervisor Response Time (Fastest)</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Payment Method</Label>
                  <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                    <SelectTrigger className="text-xs" data-testid="select-filter-payment">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Methods</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
                      <SelectItem value="ewallet">E-Wallet</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="virtual_account">Virtual Account</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Prompt Quality</Label>
                  <Select value={filterPromptType} onValueChange={setFilterPromptType}>
                    <SelectTrigger className="text-xs" data-testid="select-filter-prompt">
                      <SelectValue placeholder="All Prompts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Prompts</SelectItem>
                      <SelectItem value="best">Best (200-1000 chars)</SelectItem>
                      <SelectItem value="longest">Longest (&gt;1000 chars)</SelectItem>
                      <SelectItem value="shortest">Shortest (&lt;200 chars)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Human Escalation Rate</Label>
                  <Select value={filterEscalation} onValueChange={setFilterEscalation}>
                    <SelectTrigger className="text-xs" data-testid="select-filter-escalation">
                      <SelectValue placeholder="All Rates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Rates</SelectItem>
                      <SelectItem value="high">High (&gt;30%)</SelectItem>
                      <SelectItem value="medium">Medium (10-30%)</SelectItem>
                      <SelectItem value="low">Low (&lt;10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Agent Count</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      value={filterMinAgents} 
                      onChange={(e) => setFilterMinAgents(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-min-agents"
                    />
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      value={filterMaxAgents} 
                      onChange={(e) => setFilterMaxAgents(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-max-agents"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Supervisor Count</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      value={filterMinSupervisors} 
                      onChange={(e) => setFilterMinSupervisors(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-min-supervisors"
                    />
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      value={filterMaxSupervisors} 
                      onChange={(e) => setFilterMaxSupervisors(e.target.value)}
                      className="text-xs"
                      data-testid="input-filter-max-supervisors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {merchantsLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">ID</TableHead>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead className="hidden lg:table-cell">PIC</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Trial/Sub Ends</TableHead>
                    <TableHead className="hidden md:table-cell">Spending</TableHead>
                    <TableHead className="hidden lg:table-cell">Team</TableHead>
                    <TableHead className="hidden xl:table-cell">Performance</TableHead>
                    <TableHead className="hidden xl:table-cell">Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMerchants.map((merchant) => {
                    const analytics = analyticsMap[merchant.id];
                    const expiryInfo = getMerchantExpiryInfo(merchant);
                    return (
                      <TableRow key={merchant.id} data-testid={`row-merchant-${merchant.id}`}>
                        <TableCell>
                          <button 
                            onClick={() => handleViewDetail(merchant)}
                            className="text-xs font-mono text-primary hover:underline cursor-pointer"
                            data-testid={`link-merchant-id-${merchant.id}`}
                          >
                            {merchant.id.substring(0, 8)}...
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <button 
                              onClick={() => handleViewDetail(merchant)}
                              className="font-medium text-sm text-primary hover:underline cursor-pointer text-left"
                              data-testid={`link-merchant-name-${merchant.id}`}
                            >
                              {merchant.companyName || 'Unnamed'}
                            </button>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">{merchant.email}</p>
                            {merchant.websiteUrl && (
                              <a href={merchant.websiteUrl.startsWith('http') ? merchant.websiteUrl : `https://${merchant.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block max-w-[120px] md:max-w-none">
                                {merchant.websiteUrl}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm">{merchant.picName || '-'}</p>
                        </TableCell>
                        <TableCell>{getPlanBadge(merchant.subscriptionPlanId)}</TableCell>
                        <TableCell>{getStatusBadge(merchant.subscriptionStatus, merchant)}</TableCell>
                        <TableCell className="hidden sm:table-cell" data-testid={`cell-trial-info-${merchant.id}`}>
                          {(merchant.subscriptionStatus === 'trial' || merchant.subscriptionStatus === 'trial_expired') && merchant.trialEndsAt ? (
                            <div className="text-xs space-y-0.5">
                              <div className={`font-medium ${new Date(merchant.trialEndsAt) < new Date() ? 'text-red-500' : expiryInfo?.isExpiringSoon ? 'text-amber-500' : 'text-green-600 dark:text-green-400'}`} data-testid={`text-trial-remaining-${merchant.id}`}>
                                {expiryInfo?.text || 'Expired'}
                              </div>
                              <div className="text-muted-foreground" data-testid={`text-trial-enddate-${merchant.id}`}>
                                {format(new Date(merchant.trialEndsAt), 'MMM d, yyyy')}
                              </div>
                            </div>
                          ) : merchant.subscriptionStatus === 'active' && merchant.currentPeriodEnd ? (
                            <div className="text-xs space-y-0.5">
                              <div className={`font-medium ${expiryInfo?.isExpiringSoon ? 'text-amber-500' : 'text-muted-foreground'}`} data-testid={`text-sub-remaining-${merchant.id}`}>
                                {expiryInfo?.text || '-'}
                              </div>
                              <div className="text-muted-foreground" data-testid={`text-sub-enddate-${merchant.id}`}>
                                {format(new Date(merchant.currentPeriodEnd), 'MMM d, yyyy')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground" data-testid={`text-no-expiry-${merchant.id}`}>-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            {analytics?.totalSpending ? (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                Rp {(analytics.totalSpending / 1000).toFixed(0)}K
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Bot className="w-3 h-3 text-blue-500" />
                              <span>{analytics?.agentCount || 0} agents</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-purple-500" />
                              <span>{analytics?.supervisorCount || 0} supervisors</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span>{analytics?.avgAgentRating?.toFixed(1) || '-'}</span>
                              <Clock className="w-3 h-3 text-muted-foreground ml-1" />
                              <span>{analytics?.avgAgentResponseTime ? `${analytics.avgAgentResponseTime}s` : '-'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Esc: {analytics?.escalationRate?.toFixed(0) || 0}%</span>
                            </div>
                          </div>
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
                  {filteredMerchants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        {hasActiveFilters ? 'No merchants match the current filters' : 'No merchants registered yet'}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-merchant">
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
              <Label>Merchant ID</Label>
              <p className="text-xs text-muted-foreground font-mono">{selectedMerchant?.id}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{selectedMerchant?.email}</p>
            </div>
            
            {(selectedMerchant?.subscriptionStatus === 'trial' || selectedMerchant?.subscriptionStatus === 'trial_expired') && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3" data-testid="dialog-trial-info">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Trial Period
                </h4>
                <div className="text-sm">
                  {selectedMerchant?.trialEndsAt ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ends at:</span>
                        <span className="font-medium" data-testid="text-dialog-trial-enddate">{format(new Date(selectedMerchant.trialEndsAt), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className={`font-medium ${new Date(selectedMerchant.trialEndsAt) < new Date() ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`} data-testid="text-dialog-trial-remaining">
                          {(() => {
                            const diff = new Date(selectedMerchant.trialEndsAt).getTime() - new Date().getTime();
                            if (diff <= 0) return 'Expired';
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            return days > 0 ? `${days} days ${hours} hours` : `${hours} hours`;
                          })()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground" data-testid="text-dialog-trial-nodate">No trial date set</p>
                  )}
                </div>
                <div className="pt-2 border-t border-amber-500/20">
                  <Label className="text-xs font-medium mb-2 block">Extend Trial Period</Label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => extendTrialMutation.mutate({ merchantId: selectedMerchant.id, days: 3 })}
                      disabled={extendTrialMutation.isPending}
                      data-testid="button-extend-trial-3"
                    >
                      +3 Days
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => extendTrialMutation.mutate({ merchantId: selectedMerchant.id, days: 7 })}
                      disabled={extendTrialMutation.isPending}
                      data-testid="button-extend-trial-7"
                    >
                      +7 Days
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => extendTrialMutation.mutate({ merchantId: selectedMerchant.id, days: 14 })}
                      disabled={extendTrialMutation.isPending}
                      data-testid="button-extend-trial-14"
                    >
                      +14 Days
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
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
            
            {editPlan === 'custom' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-medium text-sm">Custom Plan Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-conversations">Conversations/month</Label>
                    <Input
                      id="edit-conversations"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customConversationsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customConversationsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-conversations"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-agents">AI Agents</Label>
                    <Input
                      id="edit-agents"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customAgentsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customAgentsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-agents"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-supervisors">Supervisors</Label>
                    <Input
                      id="edit-supervisors"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSupervisorsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSupervisorsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-supervisors"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-sources">Knowledge Sources</Label>
                    <Input
                      id="edit-sources"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSourcesLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSourcesLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-sources"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-questions">Suggested Questions</Label>
                    <Input
                      id="edit-questions"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSuggestedQuestionsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSuggestedQuestionsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-questions"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="edit-monthly-price">Monthly Price (IDR)</Label>
                    <Input
                      id="edit-monthly-price"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={editCustomConfig.customMonthlyPrice}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customMonthlyPrice: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-monthly-price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-annual-price">Annual Price (IDR)</Label>
                    <Input
                      id="edit-annual-price"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={editCustomConfig.customAnnualPrice}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customAnnualPrice: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-annual-price"
                    />
                  </div>
                </div>
                
                <div className="pt-3 border-t">
                  <Label className="mb-2 block">Invoice Billing Interval</Label>
                  <Select value={invoiceBillingInterval} onValueChange={(v) => setInvoiceBillingInterval(v as "monthly" | "annual")}>
                    <SelectTrigger data-testid="select-invoice-billing-interval">
                      <SelectValue placeholder="Select billing interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invoice amount: Rp {(invoiceBillingInterval === "monthly" ? editCustomConfig.customMonthlyPrice : editCustomConfig.customAnnualPrice).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-merchant">Cancel</Button>
            {editPlan === 'custom' && (
              <Button 
                variant="secondary" 
                onClick={handleSendInvoice} 
                disabled={sendInvoiceMutation.isPending}
                data-testid="button-send-invoice"
              >
                <FileText className="w-4 h-4 mr-2" />
                {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice to Merchant"}
              </Button>
            )}
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

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent data-testid="dialog-send-invoice">
          <DialogHeader>
            <DialogTitle>Send Custom Plan Invoice</DialogTitle>
            <DialogDescription>
              Send invoice to {selectedMerchant?.companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
              <h4 className="font-medium text-sm">Invoice Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Billing:</span>
                <span className="font-medium">{invoiceBillingInterval === "annual" ? "Annual" : "Monthly"}</span>
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-purple-600">
                  Rp {(invoiceBillingInterval === "monthly" ? editCustomConfig.customMonthlyPrice : editCustomConfig.customAnnualPrice).toLocaleString("id-ID")}
                </span>
              </div>
              <Separator className="my-2" />
              <h4 className="font-medium text-sm">Plan Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Conversations:</span>
                <span>{editCustomConfig.customConversationsLimit === -1 ? "Unlimited" : editCustomConfig.customConversationsLimit}</span>
                <span className="text-muted-foreground">AI Agents:</span>
                <span>{editCustomConfig.customAgentsLimit === -1 ? "Unlimited" : editCustomConfig.customAgentsLimit}</span>
                <span className="text-muted-foreground">Supervisors:</span>
                <span>{editCustomConfig.customSupervisorsLimit === -1 ? "Unlimited" : editCustomConfig.customSupervisorsLimit}</span>
                <span className="text-muted-foreground">Sources:</span>
                <span>{editCustomConfig.customSourcesLimit === -1 ? "Unlimited" : editCustomConfig.customSourcesLimit}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The invoice will appear in the merchant's billing page. Once paid, the custom plan will be activated automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} data-testid="button-cancel-send-invoice">Cancel</Button>
            <Button onClick={confirmSendInvoice} disabled={sendInvoiceMutation.isPending} data-testid="button-confirm-send-invoice">
              {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}
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

      <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="drawer-merchant-detail">
          {selectedDetailMerchant && (
            <div className="space-y-6 pt-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{selectedDetailMerchant.companyName || 'Unnamed Merchant'}</h2>
                <p className="text-sm text-muted-foreground font-mono">{selectedDetailMerchant.id}</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Business Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Username</p>
                    <p className="font-medium">{selectedDetailMerchant.username || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedDetailMerchant.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website Name</p>
                    <p className="font-medium">{selectedDetailMerchant.officialWebsiteName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website URL</p>
                    {selectedDetailMerchant.websiteUrl ? (
                      <a href={selectedDetailMerchant.websiteUrl.startsWith('http') ? selectedDetailMerchant.websiteUrl : `https://${selectedDetailMerchant.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        {selectedDetailMerchant.websiteUrl}
                      </a>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Official Domain</p>
                    <p className="font-medium">{selectedDetailMerchant.officialDomain || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Business Category</p>
                    <p className="font-medium">{selectedDetailMerchant.businessCategory || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Staff Count</p>
                    <p className="font-medium">{selectedDetailMerchant.staffCount || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Person (PIC)</p>
                    <p className="font-medium">{selectedDetailMerchant.picName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {selectedDetailMerchant.phone 
                        ? `${selectedDetailMerchant.phoneCountryCode || ''} ${selectedDetailMerchant.phone}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="font-medium">{selectedDetailMerchant.country || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">City/Region</p>
                    <p className="font-medium">
                      {[selectedDetailMerchant.city, selectedDetailMerchant.region].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Subscription & Payment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <div className="mt-1">{getPlanBadge(selectedDetailMerchant.subscriptionPlanId)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedDetailMerchant.subscriptionStatus, selectedDetailMerchant)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Billing Interval</p>
                    <p className="font-medium capitalize">{selectedDetailMerchant.billingInterval || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversations Used</p>
                    <p className="font-medium">
                      {selectedDetailMerchant.conversationsUsed || 0} / {selectedDetailMerchant.plan.conversationsLimit === -1 ? '∞' : selectedDetailMerchant.plan.conversationsLimit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Provider</p>
                    <p className="font-medium capitalize">{selectedDetailMerchant.paymentProvider || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer ID</p>
                    <p className="font-medium font-mono text-xs truncate">{selectedDetailMerchant.paymentCustomerId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Subscription ID</p>
                    <p className="font-medium font-mono text-xs truncate">{selectedDetailMerchant.paymentSubscriptionId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trial Ends</p>
                    <p className="font-medium">
                      {selectedDetailMerchant.trialEndsAt 
                        ? format(new Date(selectedDetailMerchant.trialEndsAt), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Period End</p>
                    <p className="font-medium">
                      {selectedDetailMerchant.currentPeriodEnd 
                        ? format(new Date(selectedDetailMerchant.currentPeriodEnd), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedDetailMerchant.isEmailVerified ? "default" : "secondary"}>
                    {selectedDetailMerchant.isEmailVerified ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Email Verified</>
                    ) : (
                      "Email Not Verified"
                    )}
                  </Badge>
                  <Badge variant={selectedDetailMerchant.profileCompleted ? "default" : "secondary"}>
                    {selectedDetailMerchant.profileCompleted ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Profile Complete</>
                    ) : (
                      "Profile Incomplete"
                    )}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {selectedDetailMerchant.createdAt 
                        ? format(new Date(selectedDetailMerchant.createdAt), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email Verified At</p>
                    <p className="font-medium">
                      {selectedDetailMerchant.emailVerifiedAt 
                        ? format(new Date(selectedDetailMerchant.emailVerifiedAt), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleEdit(selectedDetailMerchant)} className="flex-1" data-testid="button-drawer-edit">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Plan
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedDetailMerchant)} data-testid="button-drawer-delete">
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ActiveSubscribersTab({ 
  merchants, 
  merchantsLoading,
  getStatusBadge,
  getPlanBadge,
  toast,
  refetchMerchants
}: { 
  merchants?: MerchantWithPlan[];
  merchantsLoading: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  getPlanBadge: (planId: string) => JSX.Element;
  toast: any;
  refetchMerchants: () => void;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantWithPlan | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editCustomConfig, setEditCustomConfig] = useState({
    customConversationsLimit: 1000,
    customAgentsLimit: 3,
    customSupervisorsLimit: 5,
    customSourcesLimit: 10,
    customSuggestedQuestionsLimit: 5,
    customMonthlyPrice: 0,
    customAnnualPrice: 0,
  });

  const allActiveSubscribers = merchants?.filter(m => 
    m.subscriptionStatus === 'active' && m.subscriptionPlanId !== 'free'
  ) || [];
  
  const activeSubscribers = useMemo(() => {
    if (!searchQuery.trim()) return allActiveSubscribers;
    const query = searchQuery.toLowerCase().trim();
    return allActiveSubscribers.filter(m => 
      m.companyName?.toLowerCase().includes(query) || 
      m.id.toLowerCase().includes(query)
    );
  }, [allActiveSubscribers, searchQuery]);

  const updatePlanMutation = useMutation({
    mutationFn: async ({ merchantId, planId, customConfig }: { 
      merchantId: string; 
      planId: string; 
      customConfig?: typeof editCustomConfig;
    }) => {
      const payload: any = { planId };
      if (planId === 'custom' && customConfig) {
        payload.customConversationsLimit = customConfig.customConversationsLimit;
        payload.customAgentsLimit = customConfig.customAgentsLimit;
        payload.customSupervisorsLimit = customConfig.customSupervisorsLimit;
        payload.customSourcesLimit = customConfig.customSourcesLimit;
        payload.customSuggestedQuestionsLimit = customConfig.customSuggestedQuestionsLimit;
        payload.customMonthlyPrice = customConfig.customMonthlyPrice;
        payload.customAnnualPrice = customConfig.customAnnualPrice;
      }
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/subscription`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Subscription Updated",
        description: "Subscriber plan has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subscriber plan.",
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
        title: "Subscriber Deleted",
        description: `${selectedMerchant?.companyName || 'Subscriber'} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setSelectedMerchant(null);
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete subscriber.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setEditPlan(merchant.subscriptionPlanId);
    setEditCustomConfig({
      customConversationsLimit: (merchant as any).customConversationsLimit ?? 1000,
      customAgentsLimit: (merchant as any).customAgentsLimit ?? 3,
      customSupervisorsLimit: (merchant as any).customSupervisorsLimit ?? 5,
      customSourcesLimit: (merchant as any).customSourcesLimit ?? 10,
      customSuggestedQuestionsLimit: (merchant as any).customSuggestedQuestionsLimit ?? 5,
      customMonthlyPrice: (merchant as any).customMonthlyPrice ?? 0,
      customAnnualPrice: (merchant as any).customAnnualPrice ?? 0,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setDeleteDialogOpen(true);
  };

  const confirmEdit = () => {
    if (selectedMerchant && editPlan) {
      updatePlanMutation.mutate({ 
        merchantId: selectedMerchant.id, 
        planId: editPlan,
        customConfig: editPlan === 'custom' ? editCustomConfig : undefined
      });
    }
  };

  const confirmDelete = () => {
    if (selectedMerchant) {
      deleteMerchantMutation.mutate(selectedMerchant.id);
    }
  };

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
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                Active Subscribers
              </CardTitle>
              <CardDescription>
                Merchants with paid active subscriptions ({activeSubscribers.length}{searchQuery ? ` of ${allActiveSubscribers.length}` : ''} subscribers)
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search company name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48 sm:w-64 h-8 text-sm"
                  data-testid="input-search-subscribers"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportSubscribers} data-testid="button-export-subscribers">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSubscribers.map((merchant) => {
                    const planPrices: Record<string, number> = { starter: 29, pro: 99, enterprise: 299, custom: 499 };
                    const customPrice = (merchant as any).customMonthlyPrice;
                    const displayPrice = merchant.subscriptionPlanId === 'custom' && customPrice ? customPrice : planPrices[merchant.subscriptionPlanId] || 0;
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
                          ${displayPrice}/mo
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(merchant)} data-testid={`button-edit-subscriber-${merchant.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(merchant)} data-testid={`button-delete-subscriber-${merchant.id}`}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-subscriber">
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
            <DialogDescription>
              Update subscription for {selectedMerchant?.companyName || 'this subscriber'}
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
              <Label htmlFor="edit-subscriber-plan">Subscription Plan</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="mt-1" data-testid="select-edit-subscriber-plan">
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
            
            {editPlan === 'custom' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-medium text-sm">Custom Plan Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sub-edit-conversations">Conversations/month</Label>
                    <Input
                      id="sub-edit-conversations"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customConversationsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customConversationsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-conversations"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="sub-edit-agents">AI Agents</Label>
                    <Input
                      id="sub-edit-agents"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customAgentsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customAgentsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-agents"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="sub-edit-supervisors">Supervisors</Label>
                    <Input
                      id="sub-edit-supervisors"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSupervisorsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSupervisorsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-supervisors"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="sub-edit-sources">Knowledge Sources</Label>
                    <Input
                      id="sub-edit-sources"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSourcesLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSourcesLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-sources"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="sub-edit-questions">Suggested Questions</Label>
                    <Input
                      id="sub-edit-questions"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSuggestedQuestionsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSuggestedQuestionsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-questions"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="sub-edit-monthly-price">Monthly Price ($)</Label>
                    <Input
                      id="sub-edit-monthly-price"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={editCustomConfig.customMonthlyPrice}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customMonthlyPrice: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-monthly-price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-edit-annual-price">Annual Price ($)</Label>
                    <Input
                      id="sub-edit-annual-price"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={editCustomConfig.customAnnualPrice}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customAnnualPrice: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-sub-edit-custom-annual-price"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-subscriber">Cancel</Button>
            <Button onClick={confirmEdit} disabled={updatePlanMutation.isPending} data-testid="button-confirm-edit-subscriber">
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-subscriber">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMerchant?.companyName}? This will remove all associated data and cancel their subscription.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete-subscriber">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMerchantMutation.isPending} data-testid="button-confirm-delete-subscriber">
              {deleteMerchantMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [ogImageError, setOgImageError] = useState(false);

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
        setLogoError(false);
      } else if (type === 'favicon') {
        setFaviconUrl(url);
        setFaviconPreview(url);
        setFaviconError(false);
      } else {
        setOgImageUrl(url);
        setOgImagePreview(url);
        setOgImageError(false);
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
              <div className="relative">
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-video flex items-center justify-center"
                  onClick={() => logoInputRef.current?.click()}
                  data-testid="upload-logo-area"
                >
                  {logoPreview && !logoError ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="max-h-full max-w-full object-contain" 
                      onError={() => setLogoError(true)}
                      data-testid="img-logo-preview"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{logoError ? "Image missing - click to re-upload" : "Upload Logo"}</p>
                    </div>
                  )}
                </div>
                {logoUrl && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoUrl("");
                      setLogoPreview("");
                      setLogoError(false);
                    }}
                    data-testid="button-delete-logo"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {logoUrl && (
                <div className="bg-muted/50 rounded p-2" data-testid="logo-url-display">
                  <p className="text-xs text-muted-foreground mb-1">Uploaded URL:</p>
                  <code className="text-xs break-all text-primary">{logoUrl}</code>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  data-testid="button-upload-logo"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {logoUrl ? "Replace" : "Upload"}
                </Button>
                <p className="text-xs text-muted-foreground">200x60px, PNG/SVG</p>
              </div>
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
              <div className="relative max-w-[120px] mx-auto">
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-square flex items-center justify-center"
                  onClick={() => faviconInputRef.current?.click()}
                  data-testid="upload-favicon-area"
                >
                  {faviconPreview && !faviconError ? (
                    <img 
                      src={faviconPreview} 
                      alt="Favicon preview" 
                      className="max-h-full max-w-full object-contain" 
                      onError={() => setFaviconError(true)}
                      data-testid="img-favicon-preview"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{faviconError ? "Missing" : "32x32px"}</p>
                    </div>
                  )}
                </div>
                {faviconUrl && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFaviconUrl("");
                      setFaviconPreview("");
                      setFaviconError(false);
                    }}
                    data-testid="button-delete-favicon"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {faviconUrl && (
                <div className="bg-muted/50 rounded p-2" data-testid="favicon-url-display">
                  <p className="text-xs text-muted-foreground mb-1">Uploaded URL:</p>
                  <code className="text-xs break-all text-primary">{faviconUrl}</code>
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => faviconInputRef.current?.click()}
                  data-testid="button-upload-favicon"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {faviconUrl ? "Replace" : "Upload"}
                </Button>
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
              <div className="relative">
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-video flex items-center justify-center"
                  onClick={() => ogImageInputRef.current?.click()}
                  data-testid="upload-og-image-area"
                >
                  {ogImagePreview && !ogImageError ? (
                    <img 
                      src={ogImagePreview} 
                      alt="OG Image preview" 
                      className="max-h-full max-w-full object-contain" 
                      onError={() => setOgImageError(true)}
                      data-testid="img-og-preview"
                    />
                  ) : (
                    <div className="text-center">
                      <Share2 className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{ogImageError ? "Image missing - click to re-upload" : "Upload OG Image"}</p>
                    </div>
                  )}
                </div>
                {ogImageUrl && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOgImageUrl("");
                      setOgImagePreview("");
                      setOgImageError(false);
                    }}
                    data-testid="button-delete-og-image"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {ogImageUrl && (
                <div className="bg-muted/50 rounded p-2" data-testid="og-image-url-display">
                  <p className="text-xs text-muted-foreground mb-1">Uploaded URL:</p>
                  <code className="text-xs break-all text-primary">{ogImageUrl}</code>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => ogImageInputRef.current?.click()}
                  data-testid="button-upload-og-image"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {ogImageUrl ? "Replace" : "Upload"}
                </Button>
                <p className="text-xs text-muted-foreground">1200x630px recommended</p>
              </div>
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
    buttonIconUrl: "",
    buttonIconWidth: 0,
    buttonIconHeight: 0,
  });

  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [sources, setSources] = useState<{ id: string; name: string; url: string; status: string; content?: string }[]>([]);
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoImageEnabled, setPromoImageEnabled] = useState(false);
  const [iconUploadProgress, setIconUploadProgress] = useState<number | null>(null);
  const [promoUploadProgress, setPromoUploadProgress] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<{ role: string; content: string }[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [isPreviewTyping, setIsPreviewTyping] = useState(false);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);

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
          buttonIconUrl: settings.guide_button_icon_url || "",
          buttonIconWidth: parseInt(settings.guide_button_icon_width || "0") || 0,
          buttonIconHeight: parseInt(settings.guide_button_icon_height || "0") || 0,
        }));
      }
      // Only load knowledge content on initial load to prevent overwriting user input
      if (!hasLoadedInitialContent) {
        if (settings.guide_knowledge_content !== undefined) {
          setKnowledgeContent(settings.guide_knowledge_content);
        }
        if (settings.guide_promo_image_enabled !== undefined) {
          setPromoImageEnabled(settings.guide_promo_image_enabled === "true");
        }
        if (settings.guide_promo_image_url) {
          setPromoImageUrl(settings.guide_promo_image_url);
        }
        setHasLoadedInitialContent(true);
      }
    }
  }, [platformSettings, hasLoadedInitialContent]);

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
          guide_button_icon_url: guideSettings.buttonIconUrl,
          guide_button_icon_width: String(guideSettings.buttonIconWidth),
          guide_button_icon_height: String(guideSettings.buttonIconHeight),
          guide_knowledge_content: knowledgeContent,
          guide_promo_image_enabled: String(promoImageEnabled),
          guide_promo_image_url: promoImageUrl,
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

  // Auto-save after settings changes (debounced)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  useEffect(() => {
    if (!hasLoadedInitialContent) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (1.5 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      saveMutation.mutate(undefined, {
        onSuccess: () => {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        },
        onError: () => {
          setAutoSaveStatus('idle');
        }
      });
    }, 1500);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [guideSettings, promoImageEnabled, promoImageUrl, hasLoadedInitialContent]);

  // Fetch sources
  const { data: sourcesData, refetch: refetchSources } = useQuery({
    queryKey: ["/api/admin/guide/sources"],
  });

  useEffect(() => {
    if (sourcesData) {
      setSources(sourcesData as any);
    }
  }, [sourcesData]);

  // Crawl URL mutation
  const crawlMutation = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      setIsCrawling(true);
      const res = await apiRequest("POST", "/api/admin/guide/crawl", { url, name });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to crawl URL");
      }
      return data;
    },
    onSuccess: (data) => {
      setIsCrawling(false);
      setSources(data.sources);
      // Update local knowledge content with extracted content
      if (data.extractedContent && data.source?.name) {
        setKnowledgeContent(prev => {
          if (prev && prev.trim()) {
            return prev + "\n\n---\n\n" + `[Source: ${data.source.name}]\n${data.extractedContent}`;
          }
          return `[Source: ${data.source.name}]\n${data.extractedContent}`;
        });
      }
      setShowAddSourceDialog(false);
      setNewSourceUrl("");
      setNewSourceName("");
      toast({
        title: "Source Added",
        description: "URL has been crawled and content extracted successfully.",
      });
      refetchSources();
    },
    onError: async (error: any) => {
      setIsCrawling(false);
      let errorMessage = "Failed to extract content from URL.";
      // Try to get error message from response
      if (error?.response) {
        try {
          const data = await error.response.json();
          errorMessage = data.error || errorMessage;
        } catch {}
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Crawl Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete source mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/guide/sources/${sourceId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setSources(data.sources);
      // Update knowledge content to reflect the removal
      if (data.knowledgeContent !== undefined) {
        setKnowledgeContent(data.knowledgeContent);
      }
      toast({
        title: "Source Deleted",
        description: "Knowledge source and its content have been removed.",
      });
      refetchSources();
      refetchSettings();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete source.",
        variant: "destructive",
      });
    },
  });

  const handleAddSource = () => {
    if (!newSourceUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to crawl.",
        variant: "destructive",
      });
      return;
    }
    // Auto-add https:// if no protocol specified
    let urlToProcess = newSourceUrl.trim();
    if (!urlToProcess.startsWith('http://') && !urlToProcess.startsWith('https://')) {
      urlToProcess = 'https://' + urlToProcess;
    }
    crawlMutation.mutate({ url: urlToProcess, name: newSourceName.trim() });
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

          <div className="p-3 border rounded-lg space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium text-sm">Custom Button Icon</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Upload a custom icon for the widget button. Button size will match the image dimensions (no masking/cropping).</p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="button-icon-url" className="text-xs">Image URL or Upload</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      id="button-icon-url"
                      value={guideSettings.buttonIconUrl}
                      onChange={(e) => {
                        const url = e.target.value;
                        setGuideSettings(prev => ({ ...prev, buttonIconUrl: url, buttonIconWidth: 0, buttonIconHeight: 0 }));
                        if (url) {
                          const img = new (window as any).Image();
                          img.onload = () => {
                            setGuideSettings(prev => ({ ...prev, buttonIconWidth: img.width, buttonIconHeight: img.height }));
                          };
                          img.src = url;
                        }
                      }}
                      placeholder="https://example.com/icon.png or upload below"
                      className="flex-1"
                      data-testid="input-guide-button-icon-url"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="button-icon-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("type", "guide_icon");
                          
                          const xhr = new XMLHttpRequest();
                          xhr.upload.addEventListener('progress', (event) => {
                            if (event.lengthComputable) {
                              const percent = Math.round((event.loaded / event.total) * 100);
                              setIconUploadProgress(percent);
                            }
                          });
                          xhr.addEventListener('load', () => {
                            setIconUploadProgress(null);
                            if (xhr.status === 200) {
                              const data = JSON.parse(xhr.responseText);
                              const url = data.url;
                              const img = new (window as any).Image();
                              img.onload = () => {
                                setGuideSettings(prev => ({ 
                                  ...prev, 
                                  buttonIconUrl: url,
                                  buttonIconWidth: img.width, 
                                  buttonIconHeight: img.height 
                                }));
                              };
                              img.src = url;
                            } else {
                              toast({
                                title: "Upload Failed",
                                description: "Failed to upload icon image",
                                variant: "destructive",
                              });
                            }
                          });
                          xhr.addEventListener('error', () => {
                            setIconUploadProgress(null);
                            toast({
                              title: "Upload Failed",
                              description: "Failed to upload icon image",
                              variant: "destructive",
                            });
                          });
                          xhr.open('POST', '/api/admin/brand-upload');
                          xhr.withCredentials = true;
                          xhr.send(formData);
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('button-icon-upload')?.click()}
                      disabled={iconUploadProgress !== null}
                      data-testid="button-upload-icon"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {iconUploadProgress !== null ? `${iconUploadProgress}%` : 'Upload'}
                    </Button>
                  </div>
                  {iconUploadProgress !== null && (
                    <div className="mt-2">
                      <Progress value={iconUploadProgress} className="h-2" />
                    </div>
                  )}
                </div>

                {guideSettings.buttonIconUrl && (
                  <div className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-shrink-0">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <img 
                        src={guideSettings.buttonIconUrl} 
                        alt="Button icon preview" 
                        className="max-w-[100px] max-h-[100px] object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Detected size: {guideSettings.buttonIconWidth} x {guideSettings.buttonIconHeight}px
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setGuideSettings(prev => ({ ...prev, buttonIconUrl: "", buttonIconWidth: 0, buttonIconHeight: 0 }))}
                        className="text-destructive hover:text-destructive"
                        data-testid="button-remove-icon"
                      >
                        <Trash className="w-3 h-3 mr-1" />
                        Remove Icon
                      </Button>
                    </div>
                  </div>
                )}
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

          <div className="p-3 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Promo Image</p>
                  <Checkbox 
                    checked={promoImageEnabled} 
                    onCheckedChange={(checked) => setPromoImageEnabled(!!checked)}
                    data-testid="checkbox-guide-promo-image"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Display a promotional image near the chat bubble</p>
              </div>
            </div>
            {promoImageEnabled && (
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-xs font-medium mb-2">Upload Promo Image</p>
                  <p className="text-xs text-muted-foreground mb-3">Suggested dimensions: 200x100px. Supports JPG, PNG, GIF formats.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      id="promo-image-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                          if (!validTypes.includes(file.type)) {
                            toast({
                              title: "Invalid Format",
                              description: "Please upload JPG, PNG, or GIF image only.",
                              variant: "destructive",
                            });
                            e.target.value = '';
                            return;
                          }
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("type", "promo_image");
                          
                          const xhr = new XMLHttpRequest();
                          xhr.upload.addEventListener('progress', (event) => {
                            if (event.lengthComputable) {
                              const percent = Math.round((event.loaded / event.total) * 100);
                              setPromoUploadProgress(percent);
                            }
                          });
                          xhr.addEventListener('load', () => {
                            setPromoUploadProgress(null);
                            if (xhr.status === 200) {
                              const data = JSON.parse(xhr.responseText);
                              setPromoImageUrl(data.url);
                              toast({
                                title: "Uploaded",
                                description: "Promo image uploaded successfully.",
                              });
                            } else {
                              toast({
                                title: "Upload Failed",
                                description: "Failed to upload promo image",
                                variant: "destructive",
                              });
                            }
                          });
                          xhr.addEventListener('error', () => {
                            setPromoUploadProgress(null);
                            toast({
                              title: "Upload Error",
                              description: "Failed to upload image. Please try again.",
                              variant: "destructive",
                            });
                          });
                          xhr.open('POST', '/api/admin/brand-upload');
                          xhr.withCredentials = true;
                          xhr.send(formData);
                        }
                        e.target.value = '';
                      }}
                      data-testid="input-promo-image-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('promo-image-upload')?.click()}
                      disabled={promoUploadProgress !== null}
                      data-testid="button-upload-promo-image"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {promoUploadProgress !== null ? `${promoUploadProgress}%` : 'Upload Image'}
                    </Button>
                    {promoImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPromoImageUrl("")}
                        data-testid="button-remove-promo-image"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {promoUploadProgress !== null && (
                    <div className="mt-2">
                      <Progress value={promoUploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-image-url">Or Enter Image URL</Label>
                  <Input 
                    id="promo-image-url"
                    value={promoImageUrl}
                    onChange={(e) => setPromoImageUrl(e.target.value)}
                    placeholder="https://example.com/promo-image.png"
                    data-testid="input-guide-promo-image-url"
                  />
                </div>
                {promoImageUrl && (
                  <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <img 
                      src={promoImageUrl} 
                      alt="Promo preview" 
                      className="max-w-[200px] max-h-[100px] object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2 break-all">{promoImageUrl}</p>
                  </div>
                )}
              </div>
            )}
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
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sources added yet. Add a URL to crawl for knowledge content.
              </p>
            ) : (
              sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-sm truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={source.status === "active" ? "default" : "secondary"}>
                      {source.status}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => deleteSourceMutation.mutate(source.id)}
                      disabled={deleteSourceMutation.isPending}
                      data-testid={`button-delete-source-${source.id}`}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowAddSourceDialog(true)}
              data-testid="button-add-guide-source"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source URL
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent data-testid="dialog-add-source">
          <DialogHeader>
            <DialogTitle>Add Knowledge Source</DialogTitle>
            <DialogDescription>
              Enter a URL to crawl and extract content for the Chatvice Guide knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="source-url">URL to Crawl</Label>
              <Input
                id="source-url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="https://example.com/faq"
                className="mt-1"
                data-testid="input-source-url"
              />
            </div>
            <div>
              <Label htmlFor="source-name">Source Name (optional)</Label>
              <Input
                id="source-name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g., FAQ Page, Product Info"
                className="mt-1"
                data-testid="input-source-name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use the domain name automatically
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddSourceDialog(false);
                setNewSourceUrl("");
                setNewSourceName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSource}
              disabled={isCrawling || !newSourceUrl.trim()}
              data-testid="button-crawl-source"
            >
              {isCrawling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Crawl URL
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
              <CardDescription>Test the Chatvice Guide with current settings</CardDescription>
            </div>
            <Button
              variant={showPreview ? "default" : "outline"}
              onClick={() => {
                setShowPreview(!showPreview);
                if (!showPreview) {
                  setPreviewMessages([{ role: "assistant", content: guideSettings.welcomeMessage }]);
                }
              }}
              data-testid="button-toggle-preview"
            >
              {showPreview ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Close Preview
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Preview
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="border rounded-lg overflow-hidden" style={{ maxWidth: "400px" }}>
              <div 
                className="p-3 text-white flex items-center gap-2"
                style={{ backgroundColor: guideSettings.widgetColor }}
              >
                <Bot className="w-5 h-5" />
                <span className="font-medium">{guideSettings.name}</span>
              </div>
              <ScrollArea className="h-[300px] p-4 bg-background">
                <div className="space-y-3">
                  {previewMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isPreviewTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <span className="flex gap-1">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input 
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Type a test message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && previewInput.trim() && !isPreviewTyping) {
                      const userMessage = previewInput.trim();
                      setPreviewMessages(prev => [...prev, { role: "user", content: userMessage }]);
                      setPreviewInput("");
                      setIsPreviewTyping(true);
                      
                      fetch("/api/chatvice-guide/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          message: userMessage,
                          context: "admin_preview"
                        }),
                      })
                        .then(res => res.json())
                        .then(data => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: data.response || "I'm here to help with any questions about Chatvice."
                          }]);
                        })
                        .catch(() => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: "Preview mode: AI response will appear here in production."
                          }]);
                        });
                    }
                  }}
                  data-testid="input-preview-message"
                />
                <Button 
                  size="icon" 
                  disabled={!previewInput.trim() || isPreviewTyping}
                  onClick={() => {
                    if (previewInput.trim() && !isPreviewTyping) {
                      const userMessage = previewInput.trim();
                      setPreviewMessages(prev => [...prev, { role: "user", content: userMessage }]);
                      setPreviewInput("");
                      setIsPreviewTyping(true);
                      
                      fetch("/api/chatvice-guide/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          message: userMessage,
                          context: "admin_preview"
                        }),
                      })
                        .then(res => res.json())
                        .then(data => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: data.response || "I'm here to help with any questions about Chatvice."
                          }]);
                        })
                        .catch(() => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: "Preview mode: AI response will appear here in production."
                          }]);
                        });
                    }
                  }}
                  data-testid="button-send-preview"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {promoImageEnabled && promoImageUrl && (
                <div className="p-3 border-t bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Promo image preview:</p>
                  <img 
                    src={promoImageUrl} 
                    alt="Promo" 
                    className="max-w-full max-h-[80px] object-contain rounded"
                  />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setPreviewMessages([{ role: "assistant", content: guideSettings.welcomeMessage }]);
                }}
                data-testid="button-reset-preview"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Preview
              </Button>
              <p className="text-xs text-muted-foreground">
                Test messages are processed using current knowledge base settings
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end items-center gap-3">
        {autoSaveStatus === 'saving' && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Auto-saving...
          </span>
        )}
        {autoSaveStatus === 'saved' && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
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

interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  maxUses?: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPublic: boolean;
  showUpsell: boolean;
  bgColor?: string | null;
  textColor?: string | null;
  bannerMode?: string | null;
  bannerImageUrl?: string | null;
  createdAt: string;
}

function PricingTab({ toast }: { toast: any }) {
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [trialDays, setTrialDays] = useState(14);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editAnnualPrice, setEditAnnualPrice] = useState(0);
  const [editConversationsLimit, setEditConversationsLimit] = useState(0);
  const [editAgentsLimit, setEditAgentsLimit] = useState(0);
  const [editSupervisorsLimit, setEditSupervisorsLimit] = useState(0);
  const [editSourcesLimit, setEditSourcesLimit] = useState(0);
  const [editSuggestedQuestionsLimit, setEditSuggestedQuestionsLimit] = useState(0);
  const [editDomainsLimit, setEditDomainsLimit] = useState(0);
  const [editChatRetentionHours, setEditChatRetentionHours] = useState(0);
  const [editBgRemovalLimit, setEditBgRemovalLimit] = useState(0);
  
  // Promotions state
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(20);
  const [promoTargetPlans, setPromoTargetPlans] = useState("all");
  const [promoBillingCycle, setPromoBillingCycle] = useState("both");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");
  const [promoIsPublic, setPromoIsPublic] = useState(false);
  const [promoShowUpsell, setPromoShowUpsell] = useState(true);
  const [promoBgColor, setPromoBgColor] = useState("#16a34a");
  const [promoTextColor, setPromoTextColor] = useState("#ffffff");
  const [promoBannerMode, setPromoBannerMode] = useState<"color" | "image" | "overlay">("color");
  const [promoBannerImageUrl, setPromoBannerImageUrl] = useState("");
  const [promoBannerImageMobileUrl, setPromoBannerImageMobileUrl] = useState("");
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [uploadingMobileBannerImage, setUploadingMobileBannerImage] = useState(false);
  
  // Fetch subscription plans from database
  const { data: plans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  // Fetch promotions
  const { data: promotions = [], isLoading: promosLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
  });
  
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
        description: `Trial period set to ${trialDays} days. Existing trial merchants have been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save trial settings.",
        variant: "destructive",
      });
    },
  });
  
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, monthlyPrice, annualPrice, conversationsLimit, agentsLimit, supervisorsLimit, sourcesLimit, suggestedQuestionsLimit, domainsLimit, chatRetentionHours, bgRemovalLimit }: { 
      planId: string; 
      monthlyPrice: number; 
      annualPrice: number;
      conversationsLimit: number;
      agentsLimit: number;
      supervisorsLimit: number;
      sourcesLimit: number;
      suggestedQuestionsLimit: number;
      domainsLimit: number;
      chatRetentionHours: number;
      bgRemovalLimit: number;
    }) => {
      return apiRequest("PUT", `/api/admin/subscription-plans/${planId}`, {
        monthlyPrice,
        annualPrice,
        conversationsLimit,
        agentsLimit,
        supervisorsLimit,
        sourcesLimit,
        suggestedQuestionsLimit,
        domainsLimit,
        chatRetentionHours,
        bgRemovalLimit,
      });
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: "Subscription plan has been modified and synced across the platform.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setEditPlanOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subscription plan.",
        variant: "destructive",
      });
    },
  });
  
  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setEditMonthlyPrice(plan.monthlyPrice);
    setEditAnnualPrice(plan.annualPrice);
    setEditConversationsLimit(plan.conversationsLimit);
    setEditAgentsLimit(plan.agentsLimit);
    setEditSupervisorsLimit(plan.supervisorsLimit || 0);
    setEditSourcesLimit(plan.sourcesLimit || 0);
    setEditSuggestedQuestionsLimit(plan.suggestedQuestionsLimit || 0);
    setEditDomainsLimit(plan.domainsLimit || 0);
    setEditChatRetentionHours(plan.chatRetentionHours || 0);
    setEditBgRemovalLimit(plan.bgRemovalLimit || 0);
    setEditPlanOpen(true);
  };
  
  const handleSavePlan = () => {
    if (selectedPlan) {
      updatePlanMutation.mutate({
        planId: selectedPlan.id,
        monthlyPrice: editMonthlyPrice,
        annualPrice: editAnnualPrice,
        conversationsLimit: editConversationsLimit,
        agentsLimit: editAgentsLimit,
        supervisorsLimit: editSupervisorsLimit,
        sourcesLimit: editSourcesLimit,
        suggestedQuestionsLimit: editSuggestedQuestionsLimit,
        domainsLimit: editDomainsLimit,
        chatRetentionHours: editChatRetentionHours,
        bgRemovalLimit: editBgRemovalLimit,
      });
    }
  };

  // Promotion mutations
  const createPromoMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/admin/promotions", data),
    onSuccess: () => {
      toast({ title: "Promotion Created", description: "Discount code has been created and synced to pricing pages." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      setPromoDialogOpen(false);
      resetPromoForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to create promotion.", variant: "destructive" }),
  });

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/admin/promotions/${id}`, data),
    onSuccess: () => {
      toast({ title: "Promotion Updated", description: "Discount code has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      setPromoDialogOpen(false);
      setEditingPromo(null);
      resetPromoForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update promotion.", variant: "destructive" }),
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/promotions/${id}`),
    onSuccess: () => {
      toast({ title: "Promotion Deleted", description: "Discount code has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete promotion.", variant: "destructive" }),
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => 
      apiRequest("PUT", `/api/admin/promotions/${id}`, { isActive }),
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Promotion status has been changed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update promotion status.", variant: "destructive" }),
  });

  const resetPromoForm = () => {
    setPromoCode("");
    setPromoName("");
    setPromoDescription("");
    setPromoDiscountPercent(20);
    setPromoTargetPlans("all");
    setPromoBillingCycle("both");
    setPromoMaxUses("");
    setPromoStartDate("");
    setPromoEndDate("");
    setPromoIsPublic(false);
    setPromoShowUpsell(true);
    setPromoBgColor("#16a34a");
    setPromoTextColor("#ffffff");
    setPromoBannerMode("color");
    setPromoBannerImageUrl("");
    setPromoBannerImageMobileUrl("");
  };

  const openCreatePromo = () => {
    resetPromoForm();
    setEditingPromo(null);
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    setPromoStartDate(today);
    setPromoEndDate(endDate.toISOString().split('T')[0]);
    setPromoDialogOpen(true);
  };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoCode(promo.code);
    setPromoName(promo.name);
    setPromoDescription(promo.description || "");
    setPromoDiscountPercent(promo.discountPercent);
    setPromoTargetPlans(promo.targetPlans.includes("all") ? "all" : promo.targetPlans[0] || "all");
    setPromoBillingCycle(promo.billingCycle);
    setPromoMaxUses(promo.maxUses?.toString() || "");
    setPromoStartDate(new Date(promo.startDate).toISOString().split('T')[0]);
    setPromoEndDate(new Date(promo.endDate).toISOString().split('T')[0]);
    setPromoIsPublic(promo.isPublic);
    setPromoShowUpsell(promo.showUpsell);
    setPromoBgColor(promo.bgColor || "#16a34a");
    setPromoTextColor(promo.textColor || "#ffffff");
    setPromoBannerMode((promo.bannerMode as "color" | "image" | "overlay") || "color");
    setPromoBannerImageUrl(promo.bannerImageUrl || "");
    setPromoBannerImageMobileUrl((promo as any).bannerImageMobileUrl || "");
    setPromoDialogOpen(true);
  };

  const handleSavePromo = () => {
    // If image/overlay mode is selected but no image uploaded, fall back to color mode
    const needsImage = promoBannerMode === "image" || promoBannerMode === "overlay";
    const effectiveBannerMode = needsImage && !promoBannerImageUrl ? "color" : promoBannerMode;
    
    const data = {
      code: promoCode.toUpperCase(),
      name: promoName,
      description: promoDescription || null,
      discountPercent: promoDiscountPercent,
      targetPlans: promoTargetPlans === "all" ? ["all"] : 
                   promoTargetPlans === "upgrade" ? ["upgrade"] : [promoTargetPlans],
      billingCycle: promoBillingCycle,
      maxUses: promoMaxUses ? parseInt(promoMaxUses) : null,
      startDate: promoStartDate,
      endDate: promoEndDate,
      isActive: true,
      isPublic: promoIsPublic,
      showUpsell: promoShowUpsell,
      bgColor: promoBgColor,
      textColor: promoTextColor,
      bannerMode: effectiveBannerMode,
      bannerImageUrl: promoBannerImageUrl || null,
      bannerImageMobileUrl: promoBannerImageMobileUrl || null,
    };
    if (editingPromo) {
      updatePromoMutation.mutate({ id: editingPromo.id, data });
    } else {
      createPromoMutation.mutate(data);
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingBannerImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-promo-banner', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      setPromoBannerImageUrl(result.url);
      toast({ title: "Success", description: "Banner image uploaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingBannerImage(false);
    }
  };

  const handleMobileBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingMobileBannerImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-promo-banner', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      setPromoBannerImageMobileUrl(result.url);
      toast({ title: "Success", description: "Mobile banner image uploaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingMobileBannerImage(false);
    }
  };

  const getPromoStatus = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);
    if (!promo.isActive) return { text: "Inactive", color: "secondary" as const };
    if (now < start) return { text: "Scheduled", color: "outline" as const };
    if (now > end) return { text: "Expired", color: "destructive" as const };
    return { text: "Active", color: "default" as const };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Promotional Discounts
            </CardTitle>
            <CardDescription>Active discount codes and promotions - synced with landing page and merchant dashboard</CardDescription>
          </div>
          <Button onClick={openCreatePromo} data-testid="button-create-discount">
            <Plus className="w-4 h-4 mr-2" />
            Create Discount
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm mb-4">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Discounts created here will automatically apply to the landing page pricing and merchant upgrade flows.
            </p>
          </div>
          
          {promosLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : promotions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No promotions yet. Create your first discount code.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="hidden sm:table-cell">Target</TableHead>
                    <TableHead className="hidden md:table-cell">Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promo) => {
                    const status = getPromoStatus(promo);
                    return (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                        <TableCell className="text-green-600 font-semibold">{promo.discountPercent}%</TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">
                          {promo.targetPlans.includes("all") ? "All Plans" : promo.targetPlans.join(", ")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                        </TableCell>
                        <TableCell>
                          {promo.usedCount}{promo.maxUses ? `/${promo.maxUses}` : ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color}>{status.text}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditPromo(promo)} data-testid={`button-edit-promo-${promo.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => togglePromoMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                              data-testid={`button-toggle-promo-${promo.id}`}
                            >
                              {promo.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-promo-${promo.id}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the "{promo.code}" discount code. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePromoMutation.mutate(promo.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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

      {/* Create/Edit Promotion Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={(open) => { setPromoDialogOpen(open); if (!open) { setEditingPromo(null); resetPromoForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-discount">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit Discount Code" : "Create Discount Code"}</DialogTitle>
            <DialogDescription>Configure promotional discount with target plan, billing cycle, and validity period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Code</Label>
                <Input 
                  placeholder="e.g., SAVE20" 
                  value={promoCode} 
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                  className="mt-1 uppercase" 
                  data-testid="input-discount-code" 
                />
              </div>
              <div>
                <Label>Promotion Name</Label>
                <Input 
                  placeholder="e.g., New Year Sale" 
                  value={promoName} 
                  onChange={(e) => setPromoName(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-name" 
                />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input 
                placeholder="e.g., Special discount for early adopters" 
                value={promoDescription} 
                onChange={(e) => setPromoDescription(e.target.value)} 
                className="mt-1" 
                data-testid="input-discount-description" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Plan</Label>
                <Select value={promoTargetPlans} onValueChange={setPromoTargetPlans}>
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
              <div>
                <Label>Billing Cycle</Label>
                <Select value={promoBillingCycle} onValueChange={setPromoBillingCycle}>
                  <SelectTrigger className="mt-1" data-testid="select-discount-billing">
                    <SelectValue placeholder="Select billing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Monthly & Annual</SelectItem>
                    <SelectItem value="monthly">Monthly Only</SelectItem>
                    <SelectItem value="annual">Annual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (%)</Label>
                <Input 
                  type="number" 
                  placeholder="20" 
                  value={promoDiscountPercent} 
                  onChange={(e) => setPromoDiscountPercent(parseInt(e.target.value) || 0)} 
                  min={1} 
                  max={100} 
                  className="mt-1" 
                  data-testid="input-discount-percent" 
                />
              </div>
              <div>
                <Label>Max Uses (optional)</Label>
                <Input 
                  type="number" 
                  placeholder="Unlimited" 
                  value={promoMaxUses} 
                  onChange={(e) => setPromoMaxUses(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-max-uses" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={promoStartDate} 
                  onChange={(e) => setPromoStartDate(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-start" 
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={promoEndDate} 
                  onChange={(e) => setPromoEndDate(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-expiry" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="promo-public" 
                  checked={promoIsPublic} 
                  onCheckedChange={setPromoIsPublic}
                  data-testid="switch-promo-public"
                />
                <Label htmlFor="promo-public" className="text-sm">Show publicly on pricing page</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="promo-upsell" 
                  checked={promoShowUpsell} 
                  onCheckedChange={setPromoShowUpsell}
                  data-testid="switch-promo-upsell"
                />
                <Label htmlFor="promo-upsell" className="text-sm">Show upsell info</Label>
              </div>
            </div>
            {promoIsPublic && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">Banner Display Mode</Label>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="banner-color" 
                      name="bannerMode" 
                      checked={promoBannerMode === "color"} 
                      onChange={() => setPromoBannerMode("color")}
                      data-testid="radio-banner-color"
                    />
                    <Label htmlFor="banner-color" className="text-sm cursor-pointer">Color + Text</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="banner-image" 
                      name="bannerMode" 
                      checked={promoBannerMode === "image"} 
                      onChange={() => setPromoBannerMode("image")}
                      data-testid="radio-banner-image"
                    />
                    <Label htmlFor="banner-image" className="text-sm cursor-pointer">Image Only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="banner-overlay" 
                      name="bannerMode" 
                      checked={promoBannerMode === "overlay"} 
                      onChange={() => setPromoBannerMode("overlay")}
                      data-testid="radio-banner-overlay"
                    />
                    <Label htmlFor="banner-overlay" className="text-sm cursor-pointer">Image + Text Overlay</Label>
                  </div>
                </div>

                {promoBannerMode === "color" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Background Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="color" 
                            value={promoBgColor} 
                            onChange={(e) => setPromoBgColor(e.target.value)}
                            className="w-10 h-9 rounded border cursor-pointer"
                            data-testid="input-promo-bgcolor"
                          />
                          <Input 
                            value={promoBgColor} 
                            onChange={(e) => setPromoBgColor(e.target.value)}
                            placeholder="#16a34a"
                            className="flex-1"
                            data-testid="input-promo-bgcolor-text"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Text Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="color" 
                            value={promoTextColor} 
                            onChange={(e) => setPromoTextColor(e.target.value)}
                            className="w-10 h-9 rounded border cursor-pointer"
                            data-testid="input-promo-textcolor"
                          />
                          <Input 
                            value={promoTextColor} 
                            onChange={(e) => setPromoTextColor(e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-promo-textcolor-text"
                          />
                        </div>
                      </div>
                    </div>
                    <div 
                      className="p-4 rounded-md flex flex-col items-center justify-end text-sm font-medium" 
                      style={{ backgroundColor: promoBgColor, color: promoTextColor, aspectRatio: "4/1" }}
                      data-testid="promo-color-preview"
                    >
                      <div className="text-center">
                        <div className="font-bold">{promoName || "Promotion Name"}</div>
                        <div>Save {promoDiscountPercent}% with code {promoCode || "CODE"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {(promoBannerMode === "image" || promoBannerMode === "overlay") && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
                      <div className="font-medium">Recommended Image Sizes:</div>
                      <div>Desktop: 1200x300px (4:1 ratio)</div>
                      <div>Mobile: 426x182px - Optional, will use desktop image if not provided</div>
                      <div>Formats: JPG, PNG, GIF, WebP (max 5MB)</div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Desktop Banner (1200x300px)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerImageUpload}
                          disabled={uploadingBannerImage}
                          className="flex-1"
                          data-testid="input-promo-banner-upload"
                        />
                        {uploadingBannerImage && <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                    {promoBannerImageUrl && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Desktop Preview:</Label>
                        <div className="relative rounded-md overflow-hidden" style={{ aspectRatio: "4/1" }}>
                          <img 
                            src={promoBannerImageUrl} 
                            alt="Desktop banner preview" 
                            className="w-full h-full object-cover"
                            data-testid="promo-banner-preview"
                          />
                          {promoBannerMode === "overlay" && (
                            <div 
                              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col items-start justify-end p-4"
                              style={{ color: promoTextColor }}
                            >
                              <h3 className="font-extrabold text-lg sm:text-xl drop-shadow-lg">{promoName || "Promotion Name"}</h3>
                              <p className="text-sm opacity-95 max-w-xs break-words">Save {promoDiscountPercent}% with code <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">{promoCode || "CODE"}</code></p>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPromoBannerImageUrl("")}
                          data-testid="button-remove-banner"
                        >
                          <X className="w-3 h-3 mr-1" /> Remove Desktop Image
                        </Button>
                      </div>
                    )}
                    {!promoBannerImageUrl && (
                      <div 
                        className="border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground text-sm" 
                        style={{ aspectRatio: "4/1" }}
                      >
                        Upload desktop image to preview
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Mobile Banner (426x182px) - Optional</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleMobileBannerImageUpload}
                          disabled={uploadingMobileBannerImage}
                          className="flex-1"
                          data-testid="input-promo-mobile-banner-upload"
                        />
                        {uploadingMobileBannerImage && <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                    {promoBannerImageMobileUrl && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Mobile Preview:</Label>
                        <div className="relative rounded-md overflow-hidden max-w-[300px]" style={{ aspectRatio: "3/1" }}>
                          <img 
                            src={promoBannerImageMobileUrl} 
                            alt="Mobile banner preview" 
                            className="w-full h-full object-cover"
                            data-testid="promo-mobile-banner-preview"
                          />
                          {promoBannerMode === "overlay" && (
                            <div 
                              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col items-start justify-end p-2"
                              style={{ color: promoTextColor }}
                            >
                              <h4 className="font-extrabold text-xs drop-shadow">{promoName || "Promo"}</h4>
                              <p className="text-[10px] opacity-95 break-words">Save {promoDiscountPercent}%</p>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPromoBannerImageMobileUrl("")}
                          data-testid="button-remove-mobile-banner"
                        >
                          <X className="w-3 h-3 mr-1" /> Remove Mobile Image
                        </Button>
                      </div>
                    )}
                    
                    {promoBannerMode === "overlay" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Text Color (overlay)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              type="color" 
                              value={promoTextColor} 
                              onChange={(e) => setPromoTextColor(e.target.value)}
                              className="w-10 h-9 rounded border cursor-pointer"
                            />
                            <Input 
                              value={promoTextColor} 
                              onChange={(e) => setPromoTextColor(e.target.value)}
                              placeholder="#ffffff"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)} data-testid="button-cancel-discount">Cancel</Button>
            <Button 
              onClick={handleSavePromo} 
              disabled={!promoCode || !promoName || !promoStartDate || !promoEndDate || createPromoMutation.isPending || updatePromoMutation.isPending}
              data-testid="button-confirm-discount"
            >
              {(createPromoMutation.isPending || updatePromoMutation.isPending) && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {editingPromo ? "Update Code" : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent data-testid="dialog-edit-plan">
          <DialogHeader>
            <DialogTitle>Edit Plan: {selectedPlan?.name}</DialogTitle>
            <DialogDescription>Modify subscription plan details. Changes will sync to landing page, dashboard, and payment system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Plan Name</Label>
              <Input value={selectedPlan?.name || ""} disabled className="mt-1 bg-muted" data-testid="input-edit-plan-name" />
              <p className="text-xs text-muted-foreground mt-1">Plan names cannot be changed</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Price ($)</Label>
                <Input 
                  type="number" 
                  value={editMonthlyPrice} 
                  onChange={(e) => setEditMonthlyPrice(parseInt(e.target.value) || 0)}
                  className="mt-1" 
                  data-testid="input-edit-plan-monthly" 
                />
              </div>
              <div>
                <Label>Annual Price ($)</Label>
                <Input 
                  type="number" 
                  value={editAnnualPrice} 
                  onChange={(e) => setEditAnnualPrice(parseInt(e.target.value) || 0)}
                  className="mt-1" 
                  data-testid="input-edit-plan-annual" 
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Feature Limits</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Conversations/Month</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editConversationsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditConversationsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-conversations" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
              <div>
                <Label>AI Agents</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editAgentsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditAgentsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-agents" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supervisors</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editSupervisorsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditSupervisorsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-supervisors" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
              <div>
                <Label>Knowledge Sources</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editSourcesLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditSourcesLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-sources" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Suggested Questions</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editSuggestedQuestionsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditSuggestedQuestionsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-suggested-questions" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
              <div>
                <Label>Allowed Domains</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editDomainsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditDomainsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-domains" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chat History (hours)</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editChatRetentionHours} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditChatRetentionHours(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-chat-retention" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
              <div>
                <Label>BG Removal/Month</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editBgRemovalLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditBgRemovalLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-bg-removal" 
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanOpen(false)} data-testid="button-cancel-edit-plan">Cancel</Button>
            <Button onClick={handleSavePlan} disabled={updatePlanMutation.isPending} data-testid="button-confirm-edit-plan">
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
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

interface PaymentConfig {
  isConfigured: boolean;
  hasClientKey: boolean;
  hasClientSecret: boolean;
  clientKeyPreview: string | null;
  gatewayName: string;
  webhookUrl: string;
  apiBaseUrl: string;
  supportedMethods: string[];
  lastUpdated: string | null;
}

interface PaymentStats {
  totalTransactions: number;
  recentTransactions: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalVolume: number;
  recentVolume: number;
}

interface PaymentGateway {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  environment: string;
  dashboardUrl: string | null;
  config: Record<string, unknown>;
  clientKeyEnvVar: string | null;
  clientSecretEnvVar: string | null;
  supportedMethods: string[] | null;
  feePercentage: number;
  feeFixed: number;
  currency: string;
  description: string | null;
  iconUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

import type { GatewayStats } from "@shared/schema";

const PAYMENT_METHODS = ["QRIS", "VA", "EWALLET", "BANK", "CARD", "CRYPTO"];

function PayPalCredentialsCard({ toast }: { toast: any }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: config, isLoading } = useQuery<{ isConfigured: boolean; hasClientId: boolean; hasClientSecret: boolean; clientIdPreview?: string }>({
    queryKey: ["/api/admin/payment/paypal/config"],
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await apiRequest("POST", "/api/admin/payment/paypal/test");
      const result = await response.json();
      if (response.ok) {
        setTestResult({ success: true, message: result.message || "PayPal connection successful!" });
        toast({ title: "Success", description: "PayPal connection verified." });
      } else {
        setTestResult({ success: false, message: result.error || "PayPal connection test failed." });
        toast({ title: "Error", description: result.error || "PayPal connection test failed.", variant: "destructive" });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Connection test failed." });
      toast({ title: "Error", description: "Failed to test PayPal connection.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-500" />
              PayPal Integration
            </CardTitle>
            <CardDescription>PayPal API credentials for international payments</CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={handleTestConnection}
            disabled={isTesting || !config?.isConfigured}
            data-testid="button-test-paypal-connection"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium">Client ID</p>
              {config?.hasClientId ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                  <XCircle className="w-3 h-3 mr-1" /> Not Set
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable: <code className="px-1 py-0.5 bg-muted rounded">PAYPAL_CLIENT_ID</code>
            </p>
            {config?.clientIdPreview && (
              <p className="text-xs text-muted-foreground mt-1">
                Preview: <code className="px-1 py-0.5 bg-muted rounded">{config.clientIdPreview}</code>
              </p>
            )}
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium">Client Secret</p>
              {config?.hasClientSecret ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                  <XCircle className="w-3 h-3 mr-1" /> Not Set
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable: <code className="px-1 py-0.5 bg-muted rounded">PAYPAL_CLIENT_SECRET</code>
            </p>
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.message}
            </div>
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">How to Configure PayPal</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PayPal Developer Dashboard</a></li>
            <li>Create or select an app to get your credentials</li>
            <li>Open the <strong>Secrets</strong> tab in Replit</li>
            <li>Add <code className="px-1 py-0.5 bg-background rounded">PAYPAL_CLIENT_ID</code> with your Client ID</li>
            <li>Add <code className="px-1 py-0.5 bg-background rounded">PAYPAL_CLIENT_SECRET</code> with your Client Secret</li>
            <li>Restart the application and test the connection</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function GatewayCredentialsCard({ toast }: { toast: any }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: config, isLoading } = useQuery<PaymentConfig>({
    queryKey: ["/api/admin/payment/config"],
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await apiRequest("POST", "/api/admin/payment/test");
      const result = await response.json();
      if (response.ok) {
        setTestResult({ success: true, message: result.message || "Connection successful!" });
        toast({ title: "Success", description: "Payment gateway connection verified." });
      } else {
        setTestResult({ success: false, message: result.error || "Connection test failed." });
        toast({ title: "Error", description: result.error || "Connection test failed.", variant: "destructive" });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Connection test failed." });
      toast({ title: "Error", description: "Failed to test connection.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Gateway Credentials
            </CardTitle>
            <CardDescription>API credentials for payment gateway authentication</CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={handleTestConnection}
            disabled={isTesting || !config?.isConfigured}
            data-testid="button-test-gateway-connection"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium">Client Key</p>
              {config?.hasClientKey ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                  <XCircle className="w-3 h-3 mr-1" /> Not Set
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable: <code className="px-1 py-0.5 bg-muted rounded">KOMPASPAY_CLIENT_KEY</code>
            </p>
            {config?.clientKeyPreview && (
              <p className="text-xs text-muted-foreground mt-1">
                Preview: <code className="px-1 py-0.5 bg-muted rounded">{config.clientKeyPreview}</code>
              </p>
            )}
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium">Client Secret</p>
              {config?.hasClientSecret ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                  <XCircle className="w-3 h-3 mr-1" /> Not Set
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable: <code className="px-1 py-0.5 bg-muted rounded">KOMPASPAY_CLIENT_SECRET</code>
            </p>
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.message}
            </div>
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">How to Update Credentials</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open the <strong>Secrets</strong> tab in Replit (lock icon in the left sidebar)</li>
            <li>Add or update <code className="px-1 py-0.5 bg-background rounded">KOMPASPAY_CLIENT_KEY</code> with your Client Key</li>
            <li>Add or update <code className="px-1 py-0.5 bg-background rounded">KOMPASPAY_CLIENT_SECRET</code> with your Client Secret</li>
            <li>Restart the application to apply changes</li>
            <li>Click "Test Connection" above to verify</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentIntegrationTab({ toast }: { toast: any }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const { data: gateways, isLoading: gatewaysLoading } = useQuery<PaymentGateway[]>({
    queryKey: ["/api/admin/payment/gateways"],
  });

  const { data: stats } = useQuery<PaymentStats>({
    queryKey: ["/api/admin/payment/stats"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PaymentGateway>) => {
      const response = await apiRequest("POST", "/api/admin/payment/gateways", data);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create gateway" }));
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment gateway created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment/gateways"] });
      setIsDialogOpen(false);
      setEditingGateway(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentGateway> }) => {
      const response = await apiRequest("PATCH", `/api/admin/payment/gateways/${id}`, data);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update gateway" }));
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment gateway updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment/gateways"] });
      setIsDialogOpen(false);
      setEditingGateway(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/payment/gateways/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete gateway" }));
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment gateway deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment/gateways"] });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/payment/gateways/${id}/set-default`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to set default" }));
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Default gateway updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment/gateways"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };


  if (gatewaysLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Payment Gateways
          </h2>
          <p className="text-muted-foreground">
            Manage multiple payment gateway integrations
          </p>
        </div>
        <Button onClick={() => { setEditingGateway(null); setIsDialogOpen(true); }} data-testid="button-add-gateway">
          <Plus className="w-4 h-4 mr-2" />
          Add Gateway
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gateways</p>
                <p className="text-2xl font-bold">{gateways?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{gateways?.filter(g => g.isActive).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats?.totalTransactions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Wallet className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume</p>
                <p className="text-lg font-bold">{formatCurrency(stats?.totalVolume || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gateway Credentials Configuration */}
      <GatewayCredentialsCard toast={toast} />
      
      {/* PayPal Integration */}
      <PayPalCredentialsCard toast={toast} />

      {gateways && gateways.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payment Gateways</h3>
            <p className="text-muted-foreground mb-4">
              Add your first payment gateway to start accepting payments.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Gateway
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gateways?.map((gateway) => (
            <Card key={gateway.id} className={gateway.isDefault ? "ring-2 ring-primary" : ""}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-3">
                  {/* Header: Icon, Name, and Action Buttons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 sm:p-3 rounded-lg bg-muted shrink-0">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base">{gateway.name}</h3>
                        {/* Status Badges - always below name */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {gateway.isDefault && (
                            <Badge variant="default" className="text-xs" data-testid={`badge-default-${gateway.id}`}>Default</Badge>
                          )}
                          <Badge variant={gateway.isActive ? "outline" : "secondary"} className="text-xs" data-testid={`badge-status-${gateway.id}`}>
                            {gateway.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-env-${gateway.id}`}>
                            {gateway.environment}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {/* Action Buttons - top right */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingGateway(gateway); setIsDialogOpen(true); }}
                        data-testid={`button-edit-gateway-${gateway.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!gateway.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(gateway.id)}
                          data-testid={`button-delete-gateway-${gateway.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Details Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pl-9 sm:pl-14">
                    <p className="text-sm text-muted-foreground">
                      {gateway.currency}
                      {gateway.feePercentage > 0 && ` • ${gateway.feePercentage / 100}% fee`}
                    </p>
                    {gateway.dashboardUrl && (
                      <a 
                        href={gateway.dashboardUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        data-testid={`link-dashboard-${gateway.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Dashboard
                      </a>
                    )}
                    {!gateway.isDefault && gateway.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() => setDefaultMutation.mutate(gateway.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${gateway.id}`}
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                  
                  {/* Supported Methods */}
                  {gateway.supportedMethods && gateway.supportedMethods.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-9 sm:pl-14">
                      {gateway.supportedMethods.map((method, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{method}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Gateway Statistics Section */}
      {gateways && gateways.length > 0 && (
        <GatewayStatisticsSection gateways={gateways} toast={toast} />
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingGateway(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGateway ? "Edit Gateway" : "Add Payment Gateway"}</DialogTitle>
            <DialogDescription>
              Configure payment gateway settings and credentials
            </DialogDescription>
          </DialogHeader>
          <GatewayForm
            gateway={editingGateway}
            onSubmit={(data) => {
              if (editingGateway) {
                updateMutation.mutate({ id: editingGateway.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => { setIsDialogOpen(false); setEditingGateway(null); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Gateway?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The gateway will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GatewayForm({ 
  gateway, 
  onSubmit, 
  isLoading, 
  onCancel 
}: { 
  gateway: PaymentGateway | null; 
  onSubmit: (data: Partial<PaymentGateway>) => void; 
  isLoading: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState(gateway?.name || "");
  const [dashboardUrl, setDashboardUrl] = useState(gateway?.dashboardUrl || "");
  const [environment, setEnvironment] = useState(gateway?.environment || "sandbox");
  const [isActive, setIsActive] = useState(gateway?.isActive ?? false);
  const [clientKeyEnvVar, setClientKeyEnvVar] = useState(gateway?.clientKeyEnvVar || "");
  const [clientSecretEnvVar, setClientSecretEnvVar] = useState(gateway?.clientSecretEnvVar || "");
  const [supportedMethods, setSupportedMethods] = useState<string[]>(gateway?.supportedMethods || []);
  const [feePercentage, setFeePercentage] = useState((gateway?.feePercentage || 0) / 100);
  const [feeFixed, setFeeFixed] = useState(gateway?.feeFixed || 0);
  const [currency, setCurrency] = useState(gateway?.currency || "IDR");
  const [description, setDescription] = useState(gateway?.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      dashboardUrl: dashboardUrl || null,
      environment,
      isActive,
      clientKeyEnvVar: clientKeyEnvVar || null,
      clientSecretEnvVar: clientSecretEnvVar || null,
      supportedMethods,
      feePercentage: Math.round(feePercentage * 100),
      feeFixed,
      currency,
      description: description || null,
    });
  };

  const toggleMethod = (method: string) => {
    if (supportedMethods.includes(method)) {
      setSupportedMethods(supportedMethods.filter(m => m !== method));
    } else {
      setSupportedMethods([...supportedMethods, method]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Gateway Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., PayPal, Stripe, Midtrans, Xendit"
          required
          data-testid="input-gateway-name"
        />
        <p className="text-xs text-muted-foreground">Enter the payment gateway name (custom)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dashboardUrl">Dashboard Link</Label>
        <Input
          id="dashboardUrl"
          type="url"
          value={dashboardUrl}
          onChange={(e) => setDashboardUrl(e.target.value)}
          placeholder="e.g., https://dashboard.stripe.com"
          data-testid="input-dashboard-url"
        />
        <p className="text-xs text-muted-foreground">Link to the gateway's dashboard for quick access</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="environment">Environment</Label>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger data-testid="select-environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger data-testid="select-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientKey">Client Key Environment Variable</Label>
          <Input
            id="clientKey"
            value={clientKeyEnvVar}
            onChange={(e) => setClientKeyEnvVar(e.target.value)}
            placeholder="e.g., STRIPE_PUBLIC_KEY"
            data-testid="input-client-key-env"
          />
          <p className="text-xs text-muted-foreground">Name of the secret in Replit Secrets</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret Environment Variable</Label>
          <Input
            id="clientSecret"
            value={clientSecretEnvVar}
            onChange={(e) => setClientSecretEnvVar(e.target.value)}
            placeholder="e.g., STRIPE_SECRET_KEY"
            data-testid="input-client-secret-env"
          />
          <p className="text-xs text-muted-foreground">Name of the secret in Replit Secrets</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Supported Payment Methods</Label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => (
            <Badge
              key={method}
              variant={supportedMethods.includes(method) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleMethod(method)}
              data-testid={`badge-method-${method.toLowerCase()}`}
            >
              {method}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feePercentage">Fee Percentage (%)</Label>
          <Input
            id="feePercentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={feePercentage}
            onChange={(e) => setFeePercentage(parseFloat(e.target.value) || 0)}
            data-testid="input-fee-percentage"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="feeFixed">Fixed Fee ({currency})</Label>
          <Input
            id="feeFixed"
            type="number"
            min="0"
            value={feeFixed}
            onChange={(e) => setFeeFixed(parseInt(e.target.value) || 0)}
            data-testid="input-fee-fixed"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for this gateway"
          rows={2}
          data-testid="input-gateway-description"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
          data-testid="switch-gateway-active"
        />
        <Label htmlFor="isActive">Gateway Active</Label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name} data-testid="button-save-gateway">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {gateway ? "Update Gateway" : "Create Gateway"}
        </Button>
      </div>
    </form>
  );
}

function GatewayStatisticsSection({ gateways, toast }: { gateways: PaymentGateway[]; toast: any }) {
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  
  const { data: gatewayStats, isLoading: statsLoading } = useQuery<GatewayStats[]>({
    queryKey: ["/api/admin/payment/gateway-stats"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadCSV = () => {
    if (!gatewayStats || gatewayStats.length === 0) {
      toast({ title: "No Data", description: "No statistics available to download.", variant: "destructive" });
      return;
    }

    const rows = gatewayStats.map(stat => ({
      gatewayName: stat.gatewayName,
      dailyCount: stat.daily.transactions,
      dailyVolume: stat.daily.volume,
      weeklyCount: stat.weekly.transactions,
      weeklyVolume: stat.weekly.volume,
      monthlyCount: stat.monthly.transactions,
      monthlyVolume: stat.monthly.volume,
      yearlyCount: stat.yearly.transactions,
      yearlyVolume: stat.yearly.volume,
    }));

    const columns = [
      { key: "gatewayName", label: "Gateway" },
      { key: "dailyCount", label: "Daily Transactions" },
      { key: "dailyVolume", label: "Daily Volume (IDR)" },
      { key: "weeklyCount", label: "Weekly Transactions" },
      { key: "weeklyVolume", label: "Weekly Volume (IDR)" },
      { key: "monthlyCount", label: "Monthly Transactions" },
      { key: "monthlyVolume", label: "Monthly Volume (IDR)" },
      { key: "yearlyCount", label: "Yearly Transactions" },
      { key: "yearlyVolume", label: "Yearly Volume (IDR)" },
    ];

    const csv = generateCSV(rows, columns);
    downloadCSV(csv, `gateway_statistics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Download Started", description: "Gateway statistics report has been downloaded." });
  };

  const getPeriodData = (stat: GatewayStats) => {
    return stat[selectedPeriod];
  };

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Payment Statistics by Gateway
          </h3>
          <p className="text-sm text-muted-foreground">
            Track payment receipts per gateway (sample data for demo)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-32" data-testid="select-stats-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleDownloadCSV} data-testid="button-download-stats-csv">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gateways.map((gateway) => {
          const stat = gatewayStats?.find(s => s.gatewayId === gateway.id);
          const periodData = stat ? getPeriodData(stat) : { transactions: 0, volume: 0 };
          
          return (
            <Card key={gateway.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {gateway.name}
                  </span>
                  {gateway.dashboardUrl && (
                    <a
                      href={gateway.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardTitle>
                <Badge variant={gateway.isActive ? "outline" : "secondary"} className="w-fit text-xs">
                  {gateway.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <span className="text-lg font-bold" data-testid={`text-txn-count-${gateway.id}`}>
                      {periodData.transactions}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400" data-testid={`text-volume-${gateway.id}`}>
                      {formatCurrency(periodData.volume)}
                    </span>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className={selectedPeriod === "daily" ? "font-bold text-primary" : "text-muted-foreground"}>
                      <div>Daily</div>
                      <div>{stat?.daily.transactions || 0}</div>
                    </div>
                    <div className={selectedPeriod === "weekly" ? "font-bold text-primary" : "text-muted-foreground"}>
                      <div>Weekly</div>
                      <div>{stat?.weekly.transactions || 0}</div>
                    </div>
                    <div className={selectedPeriod === "monthly" ? "font-bold text-primary" : "text-muted-foreground"}>
                      <div>Monthly</div>
                      <div>{stat?.monthly.transactions || 0}</div>
                    </div>
                    <div className={selectedPeriod === "yearly" ? "font-bold text-primary" : "text-muted-foreground"}>
                      <div>Yearly</div>
                      <div>{stat?.yearly.transactions || 0}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface TransactionData {
  id: string;
  merchantId: string;
  merchantEmail: string | null;
  merchantCompanyName: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  paymentMethod: string | null;
  planId: string | null;
  planName: string | null;
  subscriptionMonths: number | null;
  invoiceNumber: string | null;
  externalId: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
}

function TransactionsTab({ toast }: { toast: any }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed" | "expired" | "cancelled">("all");
  
  // Fetch real transaction data from API
  const { data: transactions = [], isLoading } = useQuery<TransactionData[]>({
    queryKey: ["/api/admin/payment/transactions"],
  });

  const filteredTransactions = transactions.filter(tx => {
    const normalizedStatus = tx.status === "completed" ? "paid" : tx.status;
    return statusFilter === "all" || normalizedStatus === statusFilter;
  });

  // Format amount for display
  const formatAmount = (amount: number, currency: string | null) => {
    if (currency === "IDR" || !currency) {
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  };

  const handleExport = () => {
    const exportData = filteredTransactions.map(tx => ({
      invoiceNumber: tx.invoiceNumber || tx.id.slice(0, 12),
      merchant: tx.merchantCompanyName || 'Unknown',
      email: tx.merchantEmail || '',
      plan: tx.planName || '-',
      amount: tx.amount,
      currency: tx.currency || 'IDR',
      paymentMethod: tx.paymentMethod || '-',
      date: tx.createdAt ? format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm') : '',
      status: tx.status || 'unknown',
    }));
    const columns = [
      { key: "invoiceNumber", label: "Invoice Number" },
      { key: "merchant", label: "Merchant" },
      { key: "email", label: "Email" },
      { key: "plan", label: "Plan" },
      { key: "amount", label: "Amount" },
      { key: "currency", label: "Currency" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ];
    const csv = generateCSV(exportData, columns);
    downloadCSV(csv, `transactions_${statusFilter}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Export Complete", description: `${filteredTransactions.length} transactions exported.` });
  };

  const paidTransactions = transactions.filter(t => t.status === "paid" || t.status === "completed");
  const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  const pendingAmount = transactions.filter(t => t.status === "pending").reduce((sum, t) => sum + t.amount, 0);
  const failedAmount = transactions.filter(t => t.status === "failed" || t.status === "expired").reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">Rp {totalRevenue.toLocaleString('id-ID')}</p>
              <p className="text-xs text-muted-foreground">{paidTransactions.length} transactions</p>
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
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">Rp {pendingAmount.toLocaleString('id-ID')}</p>
              <p className="text-xs text-muted-foreground">{transactions.filter(t => t.status === "pending").length} awaiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <MetricTooltip metricKey="refundedRevenue">
                  <span>Failed/Expired</span>
                </MetricTooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">Rp {failedAmount.toLocaleString('id-ID')}</p>
              <p className="text-xs text-muted-foreground">{transactions.filter(t => t.status === "failed" || t.status === "expired").length} transactions</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Detailed payment history with invoice tracking</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {(["all", "paid", "pending", "failed", "expired", "cancelled"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    data-testid={`button-tx-filter-${status}`}
                  >
                    {status === "paid" ? "Paid" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredTransactions.length === 0} data-testid="button-export-transactions">
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
                      <TableCell className="font-mono text-xs">{tx.invoiceNumber || tx.id.slice(0, 12)}</TableCell>
                      <TableCell className="font-medium text-sm">{tx.merchantCompanyName || 'Unknown'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{tx.merchantEmail || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{tx.planName || '-'}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{tx.paymentMethod || '-'}</TableCell>
                      <TableCell className="font-medium">{formatAmount(tx.amount, tx.currency)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          tx.status === "paid" || tx.status === "completed"
                            ? "bg-green-500/20 text-green-700 dark:text-green-400" 
                            : tx.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                            : tx.status === "expired"
                            ? "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }>
                          {tx.status === "paid" || tx.status === "completed" ? "Paid" : 
                           tx.status === "pending" ? "Pending" : 
                           tx.status === "expired" ? "Expired" :
                           tx.status === "cancelled" ? "Cancelled" : "Failed"}
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
              <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            {(() => {
              const now = new Date();
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const mtdRevenue = paidTransactions
                .filter(t => new Date(t.createdAt) >= monthStart)
                .reduce((sum, t) => sum + t.amount, 0);
              return (
                <>
                  <p className="text-xl md:text-2xl font-bold">Rp {mtdRevenue.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-muted-foreground">{paidTransactions.filter(t => new Date(t.createdAt) >= monthStart).length} transactions</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalRevenue">
              <CardTitle className="text-sm font-medium">Revenue (This Year)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            {(() => {
              const yearStart = new Date(new Date().getFullYear(), 0, 1);
              const ytdRevenue = paidTransactions
                .filter(t => new Date(t.createdAt) >= yearStart)
                .reduce((sum, t) => sum + t.amount, 0);
              return (
                <>
                  <p className="text-xl md:text-2xl font-bold">Rp {ytdRevenue.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-muted-foreground">{paidTransactions.filter(t => new Date(t.createdAt) >= yearStart).length} transactions</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <MetricTooltip metricKey="totalRevenue">
              <CardTitle className="text-sm font-medium">Total Revenue (All Time)</CardTitle>
            </MetricTooltip>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            <p className="text-xs text-muted-foreground">{paidTransactions.length} total transactions</p>
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
  
  // Domain and system settings state
  const [settings, setSettings] = useState({
    platformDomain: "",
    widgetSubdomain: "",
    nsPrimary: "",
    nsSecondary: "",
    dnsTtl: 3600,
  });
  
  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

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
            Platform Domain Settings
          </CardTitle>
          <CardDescription>Configure DNS settings for the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="platform-domain">Platform Domain</Label>
            <Input 
              id="platform-domain"
              placeholder="chatvice.com" 
              className="mt-2"
              value={settings.platformDomain || ""}
              onChange={(e) => handleChange("platformDomain", e.target.value)}
              data-testid="input-platform-domain"
            />
            <p className="text-xs text-muted-foreground mt-1">Main domain for the platform</p>
          </div>
          <div>
            <Label htmlFor="widget-subdomain">Widget Subdomain</Label>
            <Input 
              id="widget-subdomain"
              placeholder="widget.chatvice.com" 
              className="mt-2"
              value={settings.widgetSubdomain || ""}
              onChange={(e) => handleChange("widgetSubdomain", e.target.value)}
              data-testid="input-widget-subdomain"
            />
            <p className="text-xs text-muted-foreground mt-1">Subdomain for chat widget deployment</p>
          </div>
          <div>
            <Label htmlFor="ns-primary">Primary Name Server</Label>
            <Input 
              id="ns-primary"
              placeholder="ns1.chatvice-dns.com" 
              className="mt-2"
              value={settings.nsPrimary || ""}
              onChange={(e) => handleChange("nsPrimary", e.target.value)}
              data-testid="input-ns-primary"
            />
          </div>
          <div>
            <Label htmlFor="ns-secondary">Secondary Name Server</Label>
            <Input 
              id="ns-secondary"
              placeholder="ns2.chatvice-dns.com" 
              className="mt-2"
              value={settings.nsSecondary || ""}
              onChange={(e) => handleChange("nsSecondary", e.target.value)}
              data-testid="input-ns-secondary"
            />
          </div>
          <div>
            <Label htmlFor="dns-ttl">Default DNS TTL (seconds)</Label>
            <Input 
              id="dns-ttl"
              type="number"
              placeholder="3600" 
              className="mt-2"
              value={settings.dnsTtl || 3600}
              onChange={(e) => handleChange("dnsTtl", parseInt(e.target.value) || 3600)}
              min={300}
              max={86400}
              data-testid="input-dns-ttl"
            />
            <p className="text-xs text-muted-foreground mt-1">Time to live for DNS records (300-86400 seconds)</p>
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

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MenuItemConfig {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
  group?: "main" | "widgetSetting" | "messageSetting" | "management";
}

const defaultMenuConfig: MenuItemConfig[] = [
  { id: "overview", title: "Overview", icon: "LayoutDashboard", enabled: true, group: "main" },
  { id: "agents", title: "Agents", icon: "Bot", enabled: true, group: "main" },
  { id: "sources", title: "Sources", icon: "FileText", enabled: true, group: "main" },
  { id: "knowledge-base", title: "Knowledge Base", icon: "Database", enabled: true, group: "main" },
  { id: "analytics", title: "Analytics", icon: "BarChart3", enabled: true, group: "main" },
  { id: "chat-logs", title: "Chat Logs", icon: "FileText", enabled: true, group: "main" },
  { id: "notifications", title: "Notifications", icon: "Bell", enabled: true, group: "main" },
  { id: "live-preview", title: "Live Preview", icon: "Eye", enabled: true, group: "main" },
  { id: "settings", title: "Settings", icon: "Settings", enabled: true, group: "main" },
  { id: "widget", title: "Widget", icon: "Palette", enabled: true, group: "widgetSetting" },
  { id: "welcome-bubble", title: "Welcome Bubble", icon: "MessageCircle", enabled: true, group: "widgetSetting" },
  { id: "product-cards", title: "Product Cards", icon: "Package", enabled: true, group: "widgetSetting" },
  { id: "quick-replies", title: "Quick Replies", icon: "Reply", enabled: true, group: "messageSetting" },
  { id: "chat-buttons", title: "Chat Buttons", icon: "MousePointer2", enabled: true, group: "messageSetting" },
  { id: "triggers", title: "Triggers", icon: "Zap", enabled: true, group: "messageSetting" },
  { id: "supervisors", title: "Supervisors", icon: "Users", enabled: true, group: "management" },
  { id: "team-activity", title: "Team Activity", icon: "Activity", enabled: true, group: "management" },
  { id: "work-scheduler", title: "Work Scheduler", icon: "Clock", enabled: true, group: "management" },
  { id: "integrations", title: "Integrations", icon: "Plug2", enabled: true, group: "management" },
  { id: "plans", title: "Plans", icon: "CreditCard", enabled: true, group: "management" },
  { id: "billing", title: "Billing", icon: "Receipt", enabled: true, group: "management" },
];

const defaultGroupForItemAdmin: Record<string, "main" | "widgetSetting" | "messageSetting" | "management"> = {
  "widget": "widgetSetting",
  "welcome-bubble": "widgetSetting",
  "product-cards": "widgetSetting",
  "quick-replies": "messageSetting",
  "chat-buttons": "messageSetting",
  "triggers": "messageSetting",
  "supervisors": "management",
  "team-activity": "management",
  "work-scheduler": "management",
  "integrations": "management",
  "plans": "management",
  "billing": "management",
};

function SortableMenuItem({ item, onToggle }: { item: MenuItemConfig; onToggle: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const getGroupBadge = (group?: string) => {
    switch (group) {
      case "widgetSetting":
        return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs">Widget Setting</Badge>;
      case "messageSetting":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Message Setting</Badge>;
      case "management":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs">Management</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Main Menu</Badge>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${
        isDragging ? "shadow-lg opacity-90 scale-[1.02]" : "hover:shadow-md"
      } ${!item.enabled ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        data-testid={`drag-handle-${item.id}`}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {getGroupBadge(item.group)}
        </div>
        <span className="text-xs text-muted-foreground">{item.icon}</span>
      </div>
      <Switch
        checked={item.enabled}
        onCheckedChange={() => onToggle(item.id)}
        data-testid={`toggle-menu-${item.id}`}
      />
    </div>
  );
}

function MenuOrderTab({ toast }: { toast: any }) {
  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>(defaultMenuConfig);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: platformSettings, isLoading } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
  });

  useEffect(() => {
    if (platformSettings && (platformSettings as any).merchant_menu_order) {
      try {
        const savedConfig = JSON.parse((platformSettings as any).merchant_menu_order);
        if (Array.isArray(savedConfig) && savedConfig.length > 0) {
          const migratedConfig = savedConfig.map((item: MenuItemConfig) => ({
            ...item,
            group: defaultGroupForItemAdmin[item.id] || item.group || "main",
          }));
          setMenuItems(migratedConfig);
        }
      } catch (e) {
        console.error("Failed to parse menu config:", e);
      }
    }
  }, [platformSettings]);

  const saveMutation = useMutation({
    mutationFn: async (config: MenuItemConfig[]) => {
      return apiRequest("PUT", "/api/admin/platform-settings", {
        key: "merchant_menu_order",
        value: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      toast({
        title: "Menu Order Saved",
        description: "Merchant sidebar menu order has been updated.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save menu order.",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  };

  const handleToggle = (id: string) => {
    setMenuItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(menuItems);
  };

  const handleReset = () => {
    setMenuItems(defaultMenuConfig);
    setHasChanges(true);
  };

  const mainItems = menuItems.filter((i) => i.group === "main");
  const widgetItems = menuItems.filter((i) => i.group === "widgetSetting");
  const messageItems = menuItems.filter((i) => i.group === "messageSetting");
  const managementItems = menuItems.filter((i) => i.group === "management");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Merchant Menu Order
          </h2>
          <p className="text-muted-foreground">
            Drag and drop to reorder menu items in the merchant dashboard sidebar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} data-testid="button-reset-menu">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-menu-order"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge variant="outline">Main Menu</Badge>
            </CardTitle>
            <CardDescription>Primary navigation items</CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={mainItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {mainItems.map((item) => (
                    <SortableMenuItem key={item.id} item={item} onToggle={handleToggle} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Widget Setting</Badge>
            </CardTitle>
            <CardDescription>Widget appearance items</CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={widgetItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {widgetItems.map((item) => (
                    <SortableMenuItem key={item.id} item={item} onToggle={handleToggle} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Message Setting</Badge>
            </CardTitle>
            <CardDescription>Message & reply configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={messageItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {messageItems.map((item) => (
                    <SortableMenuItem key={item.id} item={item} onToggle={handleToggle} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">Management</Badge>
            </CardTitle>
            <CardDescription>Team & business management</CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={managementItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {managementItems.map((item) => (
                    <SortableMenuItem key={item.id} item={item} onToggle={handleToggle} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Chat Sessions (Static)
          </CardTitle>
          <CardDescription>
            This menu item is always visible at the bottom of the sidebar with purple background, white text, and drop shadow. It cannot be reordered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-primary text-white flex items-center gap-3" style={{ boxShadow: "0 4px 12px rgba(107, 92, 246, 0.3)" }}>
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Chat Sessions</span>
            <Badge className="bg-white/20 text-white ml-auto">Always visible</Badge>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Info className="w-4 h-4" />
          <span>You have unsaved changes</span>
        </div>
      )}
    </div>
  );
}

interface CryptoPaymentConfirmation {
  id: string;
  merchantId: string;
  merchantEmail: string;
  merchantCompanyName: string;
  planId: string;
  planName: string;
  billingInterval: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
  customInvoiceId: string | null;
  cryptocurrency: string;
  network: string;
  amountUsd: number;
  amountCrypto: string;
  walletAddress: string;
  transactionHash: string;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function CryptoPaymentsTab({ toast }: { toast: any }) {
  const [selectedPayment, setSelectedPayment] = useState<CryptoPaymentConfirmation | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: payments, isLoading, refetch } = useQuery<CryptoPaymentConfirmation[]>({
    queryKey: ['/api/admin/crypto-payments'],
  });

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await apiRequest('PATCH', `/api/admin/crypto-payments/${id}`, {
        status: 'approved',
        reviewNotes,
      });
      toast({ title: "Payment Approved", description: "Subscription has been activated for the merchant." });
      setSelectedPayment(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve payment", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await apiRequest('PATCH', `/api/admin/crypto-payments/${id}`, {
        status: 'rejected',
        reviewNotes,
      });
      toast({ title: "Payment Rejected", description: "Merchant has been notified." });
      setSelectedPayment(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject payment", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPayments = payments?.filter(p => filter === 'all' || p.status === filter) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = payments?.filter(p => p.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bitcoin className="w-6 h-6 text-amber-500" />
            Crypto Payment Confirmations
          </h2>
          <p className="text-muted-foreground">Review and approve cryptocurrency payment submissions</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-500 text-white">{pendingCount} Pending</Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({payments?.length || 0})
        </Button>
        <Button 
          variant={filter === 'pending' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending ({pendingCount})
        </Button>
        <Button 
          variant={filter === 'approved' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('approved')}
        >
          Approved ({payments?.filter(p => p.status === 'approved').length || 0})
        </Button>
        <Button 
          variant={filter === 'rejected' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('rejected')}
        >
          Rejected ({payments?.filter(p => p.status === 'rejected').length || 0})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bitcoin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No crypto payment confirmations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-medium">{payment.customInvoiceId || payment.id.slice(0, 15)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.merchantCompanyName}</p>
                        <p className="text-xs text-muted-foreground">{payment.merchantEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{payment.planName}</span>
                        {payment.customInvoiceId && <Badge className="text-xs bg-purple-500/20 text-purple-600">Custom Invoice</Badge>}
                        {payment.isUpgrade && <Badge className="text-xs bg-green-500/20 text-green-600">Upgrade</Badge>}
                        {payment.isDowngrade && <Badge className="text-xs bg-amber-500/20 text-amber-600">Downgrade</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{payment.billingInterval}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.cryptocurrency}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{payment.network}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">${(payment.amountUsd / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{payment.amountCrypto} {payment.cryptocurrency}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedPayment(payment);
                        setReviewNotes(payment.reviewNotes || "");
                      }}>
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bitcoin className="w-5 h-5 text-amber-500" />
              Review Crypto Payment
            </DialogTitle>
            <DialogDescription>
              Verify the transaction details and proof of payment
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Order/Invoice Number Banner */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Order / Invoice Number</p>
                    <p className="font-mono font-semibold">{selectedPayment.customInvoiceId || selectedPayment.id}</p>
                  </div>
                  <Badge variant={selectedPayment.status === 'pending' ? 'secondary' : selectedPayment.status === 'approved' ? 'default' : 'destructive'}>
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Merchant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedPayment.merchantCompanyName}</p>
                    <p className="text-sm text-muted-foreground">{selectedPayment.merchantEmail}</p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedPayment.merchantId}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{selectedPayment.planName}</p>
                      {selectedPayment.customInvoiceId && <Badge className="text-xs bg-purple-500/20 text-purple-600">Custom Invoice</Badge>}
                      {selectedPayment.isUpgrade && <Badge className="text-xs bg-green-500/20 text-green-600">Upgrade</Badge>}
                      {selectedPayment.isDowngrade && <Badge className="text-xs bg-amber-500/20 text-amber-600">Downgrade</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedPayment.billingInterval}</p>
                    {selectedPayment.customInvoiceId && (
                      <p className="text-xs text-purple-600 mt-1">Invoice ID: {selectedPayment.customInvoiceId}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cryptocurrency:</span>
                      <p className="font-medium">{selectedPayment.cryptocurrency} ({selectedPayment.network})</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount (USD):</span>
                      <p className="font-medium">${(selectedPayment.amountUsd / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Crypto Amount:</span>
                      <p className="font-medium">{selectedPayment.amountCrypto} {selectedPayment.cryptocurrency}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Wallet Address:</span>
                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">{selectedPayment.walletAddress}</p>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">{selectedPayment.transactionHash}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Proof of Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <img 
                    src={selectedPayment.proofImageUrl} 
                    alt="Payment Proof" 
                    className="max-w-full rounded-lg border"
                  />
                </CardContent>
              </Card>

              {selectedPayment.status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <Label>Review Notes (Optional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about this payment..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedPayment.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Approve & Activate
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedPayment.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedPayment.status !== 'pending' && selectedPayment.reviewNotes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Review Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedPayment.reviewNotes}</p>
                    {selectedPayment.reviewedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed on {new Date(selectedPayment.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BankTransferPaymentConfirmation {
  id: string;
  merchantId: string;
  merchantEmail: string;
  merchantCompanyName: string;
  planId: string;
  planName: string;
  billingInterval: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
  customInvoiceId: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountIdr: number;
  amountUsd: number | null;
  uniqueCode: string | null;
  senderBankName: string | null;
  senderAccountNumber: string | null;
  senderAccountName: string | null;
  transferDate: Date | null;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function BankTransferPaymentsTab({ toast }: { toast: any }) {
  const [selectedPayment, setSelectedPayment] = useState<BankTransferPaymentConfirmation | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: payments, isLoading, refetch } = useQuery<BankTransferPaymentConfirmation[]>({
    queryKey: ['/api/admin/bank-transfer-payments'],
  });

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await apiRequest('PATCH', `/api/admin/bank-transfer-payments/${id}`, {
        status: 'approved',
        reviewNotes,
      });
      toast({ title: "Payment Approved", description: "Subscription has been activated for the merchant." });
      setSelectedPayment(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve payment", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await apiRequest('PATCH', `/api/admin/bank-transfer-payments/${id}`, {
        status: 'rejected',
        reviewNotes,
      });
      toast({ title: "Payment Rejected", description: "Merchant has been notified." });
      setSelectedPayment(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject payment", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPayments = payments?.filter(p => filter === 'all' || p.status === filter) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = payments?.filter(p => p.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-500" />
            Bank Transfer Payment Confirmations
          </h2>
          <p className="text-muted-foreground">Review and approve bank transfer payment submissions</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-500 text-white">{pendingCount} Pending</Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({payments?.length || 0})
        </Button>
        <Button 
          variant={filter === 'pending' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending ({pendingCount})
        </Button>
        <Button 
          variant={filter === 'approved' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('approved')}
        >
          Approved ({payments?.filter(p => p.status === 'approved').length || 0})
        </Button>
        <Button 
          variant={filter === 'rejected' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('rejected')}
        >
          Rejected ({payments?.filter(p => p.status === 'rejected').length || 0})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Landmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No bank transfer payment confirmations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-medium">{payment.customInvoiceId || payment.id.slice(0, 15)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.merchantCompanyName}</p>
                        <p className="text-xs text-muted-foreground">{payment.merchantEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{payment.planName}</span>
                        {payment.customInvoiceId && <Badge className="text-xs bg-purple-500/20 text-purple-600">Custom Invoice</Badge>}
                        {payment.isUpgrade && <Badge className="text-xs bg-green-500/20 text-green-600">Upgrade</Badge>}
                        {payment.isDowngrade && <Badge className="text-xs bg-amber-500/20 text-amber-600">Downgrade</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{payment.billingInterval}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.bankName}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">Rp {payment.amountIdr.toLocaleString('id-ID')}</p>
                      {payment.amountUsd && <p className="text-xs text-muted-foreground">${(payment.amountUsd / 100).toFixed(2)} USD</p>}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedPayment(payment);
                        setReviewNotes(payment.reviewNotes || "");
                      }}>
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-500" />
              Review Bank Transfer Payment
            </DialogTitle>
            <DialogDescription>
              Verify the transfer details and proof of payment
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Order / Invoice Number</p>
                    <p className="font-mono font-semibold">{selectedPayment.customInvoiceId || selectedPayment.id}</p>
                  </div>
                  <Badge variant={selectedPayment.status === 'pending' ? 'secondary' : selectedPayment.status === 'approved' ? 'default' : 'destructive'}>
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Merchant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedPayment.merchantCompanyName}</p>
                    <p className="text-sm text-muted-foreground">{selectedPayment.merchantEmail}</p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedPayment.merchantId}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{selectedPayment.planName}</p>
                      {selectedPayment.customInvoiceId && <Badge className="text-xs bg-purple-500/20 text-purple-600">Custom Invoice</Badge>}
                      {selectedPayment.isUpgrade && <Badge className="text-xs bg-green-500/20 text-green-600">Upgrade</Badge>}
                      {selectedPayment.isDowngrade && <Badge className="text-xs bg-amber-500/20 text-amber-600">Downgrade</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedPayment.billingInterval}</p>
                    {selectedPayment.customInvoiceId && (
                      <p className="text-xs text-purple-600 mt-1">Invoice ID: {selectedPayment.customInvoiceId}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Destination Bank:</span>
                      <p className="font-medium">{selectedPayment.bankName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Number:</span>
                      <p className="font-medium">{selectedPayment.accountNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Name:</span>
                      <p className="font-medium">{selectedPayment.accountName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">Rp {selectedPayment.amountIdr.toLocaleString('id-ID')}</p>
                    </div>
                    {selectedPayment.uniqueCode && (
                      <div>
                        <span className="text-muted-foreground">Unique Code:</span>
                        <p className="font-medium">{selectedPayment.uniqueCode}</p>
                      </div>
                    )}
                    {selectedPayment.amountUsd && (
                      <div>
                        <span className="text-muted-foreground">USD Equivalent:</span>
                        <p className="font-medium">${(selectedPayment.amountUsd / 100).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedPayment.senderBankName && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Sender Information</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sender Bank:</span>
                          <p className="font-medium">{selectedPayment.senderBankName}</p>
                        </div>
                        {selectedPayment.senderAccountNumber && (
                          <div>
                            <span className="text-muted-foreground">Sender Account:</span>
                            <p className="font-medium">{selectedPayment.senderAccountNumber}</p>
                          </div>
                        )}
                        {selectedPayment.senderAccountName && (
                          <div>
                            <span className="text-muted-foreground">Sender Name:</span>
                            <p className="font-medium">{selectedPayment.senderAccountName}</p>
                          </div>
                        )}
                        {selectedPayment.transferDate && (
                          <div>
                            <span className="text-muted-foreground">Transfer Date:</span>
                            <p className="font-medium">{new Date(selectedPayment.transferDate).toLocaleDateString('id-ID')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedPayment.proofImageUrl && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Proof of Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img 
                      src={selectedPayment.proofImageUrl} 
                      alt="Payment Proof" 
                      className="max-w-full rounded-lg border"
                    />
                  </CardContent>
                </Card>
              )}

              {selectedPayment.status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <Label>Review Notes (Optional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about this payment..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedPayment.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Approve & Activate
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedPayment.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedPayment.status !== 'pending' && selectedPayment.reviewNotes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Review Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedPayment.reviewNotes}</p>
                    {selectedPayment.reviewedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed on {new Date(selectedPayment.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CustomPlanRequest {
  id: string;
  merchantId: string;
  status: string;
  desiredConversations: number;
  desiredAgents: number;
  desiredSupervisors: number;
  desiredSources: number;
  desiredSuggestedQuestions: number;
  integrationNeeds: string | null;
  complianceNeeds: string | null;
  additionalFeatures: string[] | null;
  additionalNotes: string | null;
  message: string | null;
  budgetRangeMin: number | null;
  budgetRangeMax: number | null;
  expectedTimeline: string | null;
  adminNotes: string | null;
  proposedPriceMonthly: number | null;
  proposedPriceAnnual: number | null;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    email: string;
    companyName: string;
  };
}

function CustomRequestsTab({ toast }: { toast: any }) {
  const [selectedRequest, setSelectedRequest] = useState<CustomPlanRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [proposedPriceMonthly, setProposedPriceMonthly] = useState("");
  const [proposedPriceAnnual, setProposedPriceAnnual] = useState("");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    planName: "Custom",
    monthlyPrice: 0,
    annualPrice: 0,
    conversationsLimit: 10000,
    agentsLimit: 5,
    supervisorsLimit: 10,
    sourcesLimit: 20,
    suggestedQuestionsLimit: 10,
    billingInterval: "monthly" as "monthly" | "annual",
  });

  const { data: requests = [], isLoading, refetch } = useQuery<CustomPlanRequest[]>({
    queryKey: ["/api/admin/custom-plan-requests"],
  });

  const [invoiceError, setInvoiceError] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: string; adminNotes?: string; proposedPriceMonthly?: number | null; proposedPriceAnnual?: number | null } }) => {
      return apiRequest("PATCH", `/api/admin/custom-plan-requests/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-plan-requests"] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error updating request", description: error.message, variant: "destructive" });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: { merchantId: string; planName: string; monthlyPrice: number; annualPrice: number; billingInterval: string; conversationsLimit: number; agentsLimit: number; supervisorsLimit: number; sourcesLimit: number; suggestedQuestionsLimit: number; requestId: string }) => {
      const amount = data.billingInterval === "annual" ? data.annualPrice : data.monthlyPrice;
      const invoicePayload = {
        merchantId: data.merchantId,
        description: data.planName,
        conversationsLimit: data.conversationsLimit,
        agentsLimit: data.agentsLimit,
        supervisorsLimit: data.supervisorsLimit,
        sourcesLimit: data.sourcesLimit,
        suggestedQuestionsLimit: data.suggestedQuestionsLimit,
        amount,
        currency: "USD",
        billingInterval: data.billingInterval,
      };
      const invoiceResponse = await apiRequest("POST", "/api/admin/custom-invoices", invoicePayload);
      return { invoiceResponse, requestId: data.requestId };
    },
    onSuccess: async ({ requestId }) => {
      try {
        await apiRequest("PATCH", `/api/admin/custom-plan-requests/${requestId}`, { status: "invoice_sent" });
        toast({ title: "Invoice sent successfully" });
      } catch {
        toast({ title: "Invoice created but status update failed", description: "Please manually update the request status.", variant: "default" });
      }
      setShowInvoiceDialog(false);
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-plan-requests"] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error sending invoice", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectRequest = (request: CustomPlanRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    setProposedPriceMonthly(request.proposedPriceMonthly?.toString() || "");
    setProposedPriceAnnual(request.proposedPriceAnnual?.toString() || "");
  };

  const calculateProportionalPricing = (request: CustomPlanRequest) => {
    const enterpriseMonthly = 499;
    const enterpriseAnnual = 416;
    const enterpriseLimits = {
      conversations: 10000,
      agents: 20,
      supervisors: 50,
      sources: 100,
    };

    const conversationMultiplier = request.desiredConversations / enterpriseLimits.conversations;
    const agentMultiplier = request.desiredAgents / enterpriseLimits.agents;
    const supervisorMultiplier = request.desiredSupervisors / enterpriseLimits.supervisors;
    const sourceMultiplier = request.desiredSources / enterpriseLimits.sources;

    const avgMultiplier = (conversationMultiplier + agentMultiplier + supervisorMultiplier + sourceMultiplier) / 4;
    const cappedMultiplier = Math.max(0.1, Math.min(3.0, avgMultiplier));

    const monthlyPrice = Math.round(enterpriseMonthly * cappedMultiplier);
    const annualPrice = Math.round(enterpriseAnnual * cappedMultiplier);

    setProposedPriceMonthly(monthlyPrice.toString());
    setProposedPriceAnnual(annualPrice.toString());

    return { monthlyPrice, annualPrice, multiplier: cappedMultiplier };
  };

  const handleSavePricing = () => {
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: "pricing_proposed",
        adminNotes,
        proposedPriceMonthly: parseInt(proposedPriceMonthly) || null,
        proposedPriceAnnual: parseInt(proposedPriceAnnual) || null,
      },
    });
  };

  const handleSendInvoice = () => {
    if (!selectedRequest) return;
    setInvoiceData({
      planName: "Custom",
      monthlyPrice: parseInt(proposedPriceMonthly) || 0,
      annualPrice: parseInt(proposedPriceAnnual) || 0,
      conversationsLimit: selectedRequest.desiredConversations,
      agentsLimit: selectedRequest.desiredAgents,
      supervisorsLimit: selectedRequest.desiredSupervisors,
      sourcesLimit: selectedRequest.desiredSources,
      suggestedQuestionsLimit: selectedRequest.desiredSuggestedQuestions,
      billingInterval: "monthly",
    });
    setShowInvoiceDialog(true);
  };

  const validateInvoice = () => {
    if (!invoiceData.planName.trim()) {
      return "Plan name is required";
    }
    if (typeof invoiceData.monthlyPrice !== "number" || isNaN(invoiceData.monthlyPrice) || invoiceData.monthlyPrice < 0) {
      return "Monthly price must be a valid non-negative number";
    }
    if (typeof invoiceData.annualPrice !== "number" || isNaN(invoiceData.annualPrice) || invoiceData.annualPrice < 0) {
      return "Annual price must be a valid non-negative number";
    }
    if (invoiceData.monthlyPrice === 0 && invoiceData.annualPrice === 0) {
      return "At least one price (monthly or annual) must be greater than 0";
    }
    if (invoiceData.billingInterval === "monthly" && invoiceData.monthlyPrice <= 0) {
      return "Monthly price must be greater than 0 when monthly billing is selected";
    }
    if (invoiceData.billingInterval === "annual" && invoiceData.annualPrice <= 0) {
      return "Annual price must be greater than 0 when annual billing is selected";
    }
    if (invoiceData.conversationsLimit < 1) {
      return "Conversations limit must be at least 1";
    }
    return "";
  };

  const confirmSendInvoice = () => {
    if (!selectedRequest) return;
    
    const validationError = validateInvoice();
    if (validationError) {
      setInvoiceError(validationError);
      return;
    }
    setInvoiceError("");
    
    createInvoiceMutation.mutate({
      merchantId: selectedRequest.merchantId,
      planName: invoiceData.planName,
      monthlyPrice: invoiceData.monthlyPrice,
      annualPrice: invoiceData.annualPrice,
      billingInterval: invoiceData.billingInterval,
      conversationsLimit: invoiceData.conversationsLimit,
      agentsLimit: invoiceData.agentsLimit,
      supervisorsLimit: invoiceData.supervisorsLimit,
      sourcesLimit: invoiceData.sourcesLimit,
      suggestedQuestionsLimit: invoiceData.suggestedQuestionsLimit,
      requestId: selectedRequest.id,
    });
  };

  const handleReject = (id: string) => {
    updateMutation.mutate({
      id,
      data: { status: "rejected", adminNotes },
    });
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      submitted: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      under_review: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      pricing_proposed: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
      invoice_sent: "bg-green-500/20 text-green-700 dark:text-green-400",
      closed: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
      rejected: "bg-red-500/20 text-red-700 dark:text-red-400",
    };
    return <Badge className={variants[status] || ""}>{status.replace(/_/g, " ")}</Badge>;
  };

  const featureLabels: Record<string, string> = {
    white_label: "White Label",
    custom_integrations: "Custom Integrations",
    api_access: "API Access",
    sla_guarantee: "SLA Guarantee",
    on_premise: "On-Premise",
    dedicated_support: "Dedicated Support",
    custom_domain: "Custom Domain",
    identity_verification: "Identity Verification",
    priority_queue: "Priority Queue",
    advanced_analytics: "Advanced Analytics",
  };

  const timelineLabels: Record<string, string> = {
    immediate: "Segera (dalam 1 minggu)",
    "1_month": "Dalam 1 bulan",
    "3_months": "Dalam 3 bulan",
    exploring: "Masih eksplorasi",
  };

  // Count unprocessed requests (submitted status = new, not yet reviewed)
  const unprocessedCount = requests.filter(r => r.status === "submitted").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold" data-testid="text-custom-requests-title">Custom Plan Requests</h2>
            {unprocessedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse" data-testid="badge-unprocessed-count">
                {unprocessedCount}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Review and process custom plan requests from merchants</p>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="submitted">
              <span className="flex items-center gap-2">
                Submitted
                {unprocessedCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {unprocessedCount}
                  </span>
                )}
              </span>
            </SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="pricing_proposed">Pricing Proposed</SelectItem>
            <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No custom plan requests found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => handleSelectRequest(request)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover-elevate ${
                        selectedRequest?.id === request.id
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                          : ""
                      }`}
                      data-testid={`request-item-${request.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {request.merchant?.companyName || "Unknown"}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {request.merchant?.email}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{request.desiredConversations.toLocaleString()} conv/mo</span>
                            <span>{request.desiredAgents} agents</span>
                            <span>{request.desiredSupervisors} supervisors</span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRequest ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select a request to view details</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Merchant</Label>
                    <p className="font-medium">{selectedRequest.merchant?.companyName}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.merchant?.email}</p>
                  </div>

                  {selectedRequest.message && (
                    <>
                      <Separator />
                      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                        <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                          <MessageSquare className="w-3 h-3" />
                          Message from Merchant
                        </Label>
                        <p className="text-sm whitespace-pre-wrap">{selectedRequest.message}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">Conversations</Label>
                      <p className="font-medium">{selectedRequest.desiredConversations.toLocaleString()}/mo</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Agents</Label>
                      <p className="font-medium">{selectedRequest.desiredAgents}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Supervisors</Label>
                      <p className="font-medium">{selectedRequest.desiredSupervisors}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Sources</Label>
                      <p className="font-medium">{selectedRequest.desiredSources}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Suggested Questions</Label>
                      <p className="font-medium">{selectedRequest.desiredSuggestedQuestions}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Timeline</Label>
                      <p className="font-medium">
                        {selectedRequest.expectedTimeline
                          ? timelineLabels[selectedRequest.expectedTimeline] || selectedRequest.expectedTimeline
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {selectedRequest.budgetRangeMin || selectedRequest.budgetRangeMax ? (
                    <div>
                      <Label className="text-muted-foreground text-xs">Budget Range</Label>
                      <p className="font-medium">
                        IDR {selectedRequest.budgetRangeMin?.toLocaleString() || "?"} - {selectedRequest.budgetRangeMax?.toLocaleString() || "?"}
                      </p>
                    </div>
                  ) : null}

                  {selectedRequest.additionalFeatures && selectedRequest.additionalFeatures.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Additional Features</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedRequest.additionalFeatures.map((f) => (
                          <Badge key={f} variant="outline" className="text-xs">
                            {featureLabels[f] || f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRequest.integrationNeeds && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Integration Needs</Label>
                      <p className="text-sm">{selectedRequest.integrationNeeds}</p>
                    </div>
                  )}

                  {selectedRequest.complianceNeeds && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Compliance Needs</Label>
                      <p className="text-sm">{selectedRequest.complianceNeeds}</p>
                    </div>
                  )}

                  {selectedRequest.additionalNotes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Additional Notes</Label>
                      <p className="text-sm">{selectedRequest.additionalNotes}</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Proposed Pricing</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => calculateProportionalPricing(selectedRequest)}
                        data-testid="button-calculate-pricing"
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Auto Calculate
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Monthly ($)</Label>
                        <Input
                          type="number"
                          value={proposedPriceMonthly}
                          onChange={(e) => setProposedPriceMonthly(e.target.value)}
                          placeholder="0"
                          data-testid="input-price-monthly"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Annual ($)</Label>
                        <Input
                          type="number"
                          value={proposedPriceAnnual}
                          onChange={(e) => setProposedPriceAnnual(e.target.value)}
                          placeholder="0"
                          data-testid="input-price-annual"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Internal notes about this request..."
                      className="mt-1"
                      data-testid="textarea-admin-notes"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={handleSavePricing}
                      disabled={updateMutation.isPending}
                      className="w-full"
                      data-testid="button-save-pricing"
                    >
                      {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save Pricing
                    </Button>
                    <Button
                      onClick={handleSendInvoice}
                      disabled={!proposedPriceMonthly || createInvoiceMutation.isPending}
                      variant="default"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-send-invoice"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Invoice
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={updateMutation.isPending}
                      variant="destructive"
                      className="w-full"
                      data-testid="button-reject-request"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Request
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Custom Plan Invoice</DialogTitle>
            <DialogDescription>
              Review and confirm the invoice details before sending to the merchant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={invoiceData.planName}
                  onChange={(e) => setInvoiceData({ ...invoiceData, planName: e.target.value })}
                  data-testid="input-invoice-plan-name"
                />
              </div>
              <div>
                <Label>Billing Interval</Label>
                <Select
                  value={invoiceData.billingInterval}
                  onValueChange={(v) => setInvoiceData({ ...invoiceData, billingInterval: v as "monthly" | "annual" })}
                >
                  <SelectTrigger data-testid="select-billing-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={invoiceData.monthlyPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setInvoiceData({ ...invoiceData, monthlyPrice: isNaN(val) ? 0 : Math.max(0, Math.round(val)) });
                  }}
                  data-testid="input-invoice-monthly"
                />
              </div>
              <div>
                <Label>Annual Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={invoiceData.annualPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setInvoiceData({ ...invoiceData, annualPrice: isNaN(val) ? 0 : Math.max(0, Math.round(val)) });
                  }}
                  data-testid="input-invoice-annual"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Conversations: <strong>{invoiceData.conversationsLimit.toLocaleString()}/mo</strong></div>
              <div>Agents: <strong>{invoiceData.agentsLimit}</strong></div>
              <div>Supervisors: <strong>{invoiceData.supervisorsLimit}</strong></div>
              <div>Sources: <strong>{invoiceData.sourcesLimit}</strong></div>
            </div>
          </div>

          {invoiceError && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded" data-testid="text-invoice-error">
              {invoiceError}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInvoiceDialog(false); setInvoiceError(""); }}>
              Cancel
            </Button>
            <Button
              onClick={confirmSendInvoice}
              disabled={createInvoiceMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-send-invoice"
            >
              {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface Affiliate {
  id: string;
  merchantId: string;
  affiliateCode: string;
  status: "pending" | "active" | "suspended";
  commissionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  createdAt: string;
  approvedAt: string | null;
  merchant?: {
    email: string;
    companyName: string;
  };
}

function AffiliatesTab({ toast }: { toast: any }) {
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [commissionRate, setCommissionRate] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalCommissionRate, setGlobalCommissionRate] = useState("20");
  const [cookieDays, setCookieDays] = useState("30");
  const [minimumPayout, setMinimumPayout] = useState("50");
  const [programEnabled, setProgramEnabled] = useState(true);

  const { data: affiliates = [], isLoading, refetch } = useQuery<Affiliate[]>({
    queryKey: ["/api/admin/affiliates"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/affiliate/settings"],
  });

  useEffect(() => {
    if (settings) {
      setGlobalCommissionRate((settings as any).defaultCommissionRate?.toString() || "20");
      setCookieDays((settings as any).cookieDays?.toString() || "30");
      setMinimumPayout((settings as any).minimumPayout?.toString() || "50");
      setProgramEnabled((settings as any).programEnabled !== false);
    }
  }, [settings]);

  const updateAffiliateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: string; commissionRate?: number } }) => {
      return apiRequest("PATCH", `/api/admin/affiliates/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Affiliate updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      refetch();
      setSelectedAffiliate(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating affiliate", description: error.message, variant: "destructive" });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { defaultCommissionRate?: number; cookieDays?: number; minimumPayout?: number; programEnabled?: boolean }) => {
      return apiRequest("POST", "/api/admin/affiliates/settings", data);
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/settings"] });
      setSettingsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = (affiliate: Affiliate) => {
    updateAffiliateMutation.mutate({
      id: affiliate.id,
      data: { status: "active", commissionRate: parseInt(commissionRate) || affiliate.commissionRate },
    });
  };

  const handleSuspend = (affiliate: Affiliate) => {
    updateAffiliateMutation.mutate({
      id: affiliate.id,
      data: { status: "suspended" },
    });
  };

  const handleReactivate = (affiliate: Affiliate) => {
    updateAffiliateMutation.mutate({
      id: affiliate.id,
      data: { status: "active" },
    });
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      defaultCommissionRate: parseInt(globalCommissionRate) || 20,
      cookieDays: parseInt(cookieDays) || 30,
      minimumPayout: parseInt(minimumPayout) || 50,
      programEnabled,
    });
  };

  const filteredAffiliates = affiliates.filter((aff) => {
    if (filterStatus === "all") return true;
    return aff.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = affiliates.filter((a) => a.status === "pending").length;
  const activeCount = affiliates.filter((a) => a.status === "active").length;
  const totalEarnings = affiliates.reduce((sum, a) => sum + (a.totalEarnings || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-affiliates-title">Affiliate Management</h2>
          <p className="text-muted-foreground">Manage affiliate applications and settings</p>
        </div>
        <Button onClick={() => setSettingsOpen(true)} variant="outline" data-testid="button-affiliate-settings">
          <Settings className="w-4 h-4 mr-2" />
          Program Settings
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{affiliates.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Affiliates</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredAffiliates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No affiliates found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id} data-testid={`row-affiliate-${affiliate.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{affiliate.merchant?.companyName || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{affiliate.merchant?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{affiliate.affiliateCode}</TableCell>
                    <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                    <TableCell>{affiliate.commissionRate}%</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${affiliate.totalEarnings?.toFixed(2) || "0.00"}</p>
                        <p className="text-xs text-muted-foreground">
                          Pending: ${affiliate.pendingEarnings?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {affiliate.status === "pending" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedAffiliate(affiliate);
                              setCommissionRate(affiliate.commissionRate.toString());
                            }}
                            data-testid={`button-review-${affiliate.id}`}
                          >
                            Review
                          </Button>
                        )}
                        {affiliate.status === "active" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSuspend(affiliate)}
                            data-testid={`button-suspend-${affiliate.id}`}
                          >
                            Suspend
                          </Button>
                        )}
                        {affiliate.status === "suspended" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleReactivate(affiliate)}
                            data-testid={`button-reactivate-${affiliate.id}`}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAffiliate} onOpenChange={() => setSelectedAffiliate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Affiliate Application</DialogTitle>
            <DialogDescription>
              Review and approve this affiliate application
            </DialogDescription>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Merchant</Label>
                  <p className="font-medium">{selectedAffiliate.merchant?.companyName || "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedAffiliate.merchant?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Affiliate Code</Label>
                  <p className="font-mono font-medium">{selectedAffiliate.affiliateCode}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Applied On</Label>
                  <p className="font-medium">{new Date(selectedAffiliate.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Separator />
              <div>
                <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                <Input
                  id="commission-rate"
                  type="number"
                  min="1"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="mt-1"
                  data-testid="input-commission-rate"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default rate: {globalCommissionRate}%
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAffiliate(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAffiliate && handleApprove(selectedAffiliate)}
              disabled={updateAffiliateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-approve-affiliate"
            >
              {updateAffiliateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affiliate Program Settings</DialogTitle>
            <DialogDescription>
              Configure global affiliate program settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Program Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow new affiliate applications</p>
              </div>
              <Switch
                checked={programEnabled}
                onCheckedChange={setProgramEnabled}
                data-testid="switch-program-enabled"
              />
            </div>
            <Separator />
            <div>
              <Label htmlFor="global-commission">Default Commission Rate (%)</Label>
              <Input
                id="global-commission"
                type="number"
                min="1"
                max="100"
                value={globalCommissionRate}
                onChange={(e) => setGlobalCommissionRate(e.target.value)}
                className="mt-1"
                data-testid="input-global-commission"
              />
            </div>
            <div>
              <Label htmlFor="cookie-days">Cookie Duration (days)</Label>
              <Input
                id="cookie-days"
                type="number"
                min="1"
                max="365"
                value={cookieDays}
                onChange={(e) => setCookieDays(e.target.value)}
                className="mt-1"
                data-testid="input-cookie-days"
              />
            </div>
            <div>
              <Label htmlFor="min-payout">Minimum Payout ($)</Label>
              <Input
                id="min-payout"
                type="number"
                min="1"
                value={minimumPayout}
                onChange={(e) => setMinimumPayout(e.target.value)}
                className="mt-1"
                data-testid="input-min-payout"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {saveSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Withdrawals Tab - Admin management of affiliate withdrawal requests
interface WithdrawalRequest {
  id: string;
  affiliateId: string;
  paymentMethodId: string | null;
  amount: number;
  currency: string;
  methodType: "bank_transfer" | "cryptocurrency" | "paypal";
  paymentDetails: any;
  status: "pending" | "approved" | "processing" | "completed" | "rejected" | "failed";
  rejectionReason: string | null;
  adminNotes: string | null;
  transactionReference: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  affiliate?: {
    id: string;
    affiliateCode: string;
    displayName: string | null;
  };
  merchant?: {
    id: string;
    companyName: string;
    email: string;
  };
}

function WithdrawalsTab({ toast }: { toast: any }) {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [actionType, setActionType] = useState<string>("");

  const { data: withdrawals = [], isLoading, refetch } = useQuery<WithdrawalRequest[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/withdrawals/stats"],
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/admin/withdrawals/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Withdrawal request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      refetch();
      setSelectedWithdrawal(null);
      setActionType("");
      setAdminNotes("");
      setRejectionReason("");
      setTransactionReference("");
    },
    onError: (error: any) => {
      toast({ title: "Error updating withdrawal", description: error.message, variant: "destructive" });
    },
  });

  const handleAction = (withdrawal: WithdrawalRequest, action: string) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setAdminNotes("");
    setRejectionReason("");
    setTransactionReference("");
  };

  const handleConfirmAction = () => {
    if (!selectedWithdrawal) return;

    const data: any = { status: actionType };
    if (adminNotes) data.adminNotes = adminNotes;
    if (actionType === "rejected" && rejectionReason) data.rejectionReason = rejectionReason;
    if ((actionType === "completed" || actionType === "processing") && transactionReference) {
      data.transactionReference = transactionReference;
    }

    updateWithdrawalMutation.mutate({ id: selectedWithdrawal.id, data });
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (filterStatus === "all") return true;
    return w.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "processing":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Loader2 className="w-3 h-3 mr-1" />Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "bank_transfer":
        return <Landmark className="w-4 h-4" />;
      case "cryptocurrency":
        return <Bitcoin className="w-4 h-4" />;
      case "paypal":
        return <Wallet className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getMethodLabel = (type: string) => {
    switch (type) {
      case "bank_transfer":
        return "Bank Transfer";
      case "cryptocurrency":
        return "Cryptocurrency";
      case "paypal":
        return "PayPal";
      default:
        return type;
    }
  };

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const approvedCount = withdrawals.filter((w) => w.status === "approved").length;
  const processingCount = withdrawals.filter((w) => w.status === "processing").length;
  const completedCount = withdrawals.filter((w) => w.status === "completed").length;
  const totalPending = withdrawals.filter((w) => w.status === "pending" || w.status === "approved" || w.status === "processing")
    .reduce((sum, w) => sum + w.amount, 0) / 100;
  const totalPaid = withdrawals.filter((w) => w.status === "completed")
    .reduce((sum, w) => sum + w.amount, 0) / 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-withdrawals-title">Withdrawal Requests</h2>
          <p className="text-muted-foreground">Manage affiliate withdrawal requests</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount + processingCount}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Paid</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Withdrawal Requests</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-withdrawals">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredWithdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                    <TableCell>
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{withdrawal.merchant?.companyName || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{withdrawal.affiliate?.affiliateCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${(withdrawal.amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(withdrawal.methodType)}
                        <span className="text-sm">{getMethodLabel(withdrawal.methodType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(withdrawal, "view")}
                          data-testid={`button-view-${withdrawal.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {withdrawal.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleAction(withdrawal, "approved")}
                              data-testid={`button-approve-${withdrawal.id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleAction(withdrawal, "rejected")}
                              data-testid={`button-reject-${withdrawal.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {withdrawal.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-purple-600 hover:text-purple-700"
                            onClick={() => handleAction(withdrawal, "processing")}
                            data-testid={`button-process-${withdrawal.id}`}
                          >
                            <Loader2 className="w-4 h-4" />
                          </Button>
                        )}
                        {(withdrawal.status === "approved" || withdrawal.status === "processing") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAction(withdrawal, "completed")}
                            data-testid={`button-complete-${withdrawal.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {actionType === "view" ? "Withdrawal Details" : `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Withdrawal`}
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">${(selectedWithdrawal.amount / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedWithdrawal.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Affiliate</p>
                  <p className="font-medium">{selectedWithdrawal.merchant?.companyName}</p>
                  <p className="text-xs text-muted-foreground">{selectedWithdrawal.affiliate?.affiliateCode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getMethodIcon(selectedWithdrawal.methodType)}
                    <span>{getMethodLabel(selectedWithdrawal.methodType)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Payment Details</p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  {selectedWithdrawal.methodType === "bank_transfer" && (
                    <>
                      <p><span className="text-muted-foreground">Bank:</span> {selectedWithdrawal.paymentDetails?.bankName}</p>
                      <p><span className="text-muted-foreground">Account:</span> {selectedWithdrawal.paymentDetails?.bankAccountNumber}</p>
                      <p><span className="text-muted-foreground">Name:</span> {selectedWithdrawal.paymentDetails?.bankAccountName}</p>
                      <p><span className="text-muted-foreground">Country:</span> {selectedWithdrawal.paymentDetails?.bankCountry}</p>
                      {selectedWithdrawal.paymentDetails?.swiftCode && (
                        <p><span className="text-muted-foreground">SWIFT:</span> {selectedWithdrawal.paymentDetails?.swiftCode}</p>
                      )}
                    </>
                  )}
                  {selectedWithdrawal.methodType === "cryptocurrency" && (
                    <>
                      <p><span className="text-muted-foreground">Network:</span> {selectedWithdrawal.paymentDetails?.cryptoNetwork}</p>
                      <p className="break-all"><span className="text-muted-foreground">Wallet:</span> {selectedWithdrawal.paymentDetails?.cryptoWalletAddress}</p>
                    </>
                  )}
                  {selectedWithdrawal.methodType === "paypal" && (
                    <>
                      <p><span className="text-muted-foreground">Email:</span> {selectedWithdrawal.paymentDetails?.paypalEmail}</p>
                      {selectedWithdrawal.paymentDetails?.paypalAccountName && (
                        <p><span className="text-muted-foreground">Name:</span> {selectedWithdrawal.paymentDetails?.paypalAccountName}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {actionType !== "view" && (
                <>
                  {actionType === "rejected" && (
                    <div>
                      <Label>Rejection Reason</Label>
                      <Textarea
                        placeholder="Explain why this request is being rejected..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-1"
                        data-testid="textarea-rejection-reason"
                      />
                    </div>
                  )}

                  {(actionType === "processing" || actionType === "completed") && (
                    <div>
                      <Label>Transaction Reference (Optional)</Label>
                      <Input
                        placeholder="e.g., TX123456789"
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        className="mt-1"
                        data-testid="input-transaction-ref"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Admin Notes (Optional)</Label>
                    <Textarea
                      placeholder="Internal notes..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-1"
                      data-testid="textarea-admin-notes"
                    />
                  </div>
                </>
              )}

              {selectedWithdrawal.adminNotes && actionType === "view" && (
                <div>
                  <p className="text-sm font-medium mb-1">Admin Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedWithdrawal.adminNotes}</p>
                </div>
              )}

              {selectedWithdrawal.transactionReference && actionType === "view" && (
                <div>
                  <p className="text-sm font-medium mb-1">Transaction Reference</p>
                  <p className="text-sm font-mono">{selectedWithdrawal.transactionReference}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>
              {actionType === "view" ? "Close" : "Cancel"}
            </Button>
            {actionType !== "view" && (
              <Button
                onClick={handleConfirmAction}
                disabled={updateWithdrawalMutation.isPending}
                className={actionType === "rejected" ? "bg-red-600 hover:bg-red-700" : actionType === "completed" ? "bg-green-600 hover:bg-green-700" : ""}
                data-testid="button-confirm-action"
              >
                {updateWithdrawalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === "approved" && "Approve"}
                {actionType === "rejected" && "Reject"}
                {actionType === "processing" && "Mark Processing"}
                {actionType === "completed" && "Mark Completed"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Knowledge Templates Tab - Admin management of training data templates
function KnowledgeTemplatesTab({ toast }: { toast: any }) {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<string>("casual");
  const [formContent, setFormContent] = useState("");
  const [formBusinessType, setFormBusinessType] = useState("");
  const [formLanguage, setFormLanguage] = useState("id");
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Fetch templates
  const { data: templates = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/knowledge-templates"],
  });
  
  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/knowledge-templates", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template created successfully" });
      resetForm();
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create template", variant: "destructive" });
    },
  });
  
  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/knowledge-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template updated successfully" });
      setEditingTemplate(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update template", variant: "destructive" });
    },
  });
  
  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/knowledge-templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template deleted successfully" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete template", variant: "destructive" });
    },
  });
  
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCategory("casual");
    setFormContent("");
    setFormBusinessType("");
    setFormLanguage("id");
    setFormIsActive(true);
  };
  
  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormCategory(template.category);
    setFormContent(template.content);
    setFormBusinessType(template.businessType || "");
    setFormLanguage(template.language || "id");
    setFormIsActive(template.isActive);
  };
  
  const handleSubmit = () => {
    const data = {
      name: formName,
      description: formDescription,
      category: formCategory,
      content: formContent,
      businessType: formBusinessType || null,
      language: formLanguage,
      isActive: formIsActive,
    };
    
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "casual":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Casual</Badge>;
      case "formal":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">Formal</Badge>;
      case "corporate":
        return <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400">Corporate</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };
  
  const filteredTemplates = templates.filter((t: any) => 
    filterCategory === "all" || t.category === filterCategory
  );
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Knowledge Templates
              </CardTitle>
              <CardDescription>
                Kelola template knowledge base untuk merchant (casual, formal, corporate)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-category">
                  <SelectValue placeholder="Filter kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" />
                Buat Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada template knowledge base</p>
              <p className="text-sm">Buat template pertama untuk membantu merchant</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template: any) => (
                <Card key={template.id} className={`${!template.isActive ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getCategoryBadge(template.category)}
                          {!template.isActive && <Badge variant="outline">Nonaktif</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(template)}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-${template.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Template "{template.name}" akan dihapus. Aksi ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(template.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {template.description || "Tidak ada deskripsi"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Digunakan: {template.usageCount || 0}x</span>
                      <span>{template.language === "id" ? "Indonesia" : "English"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Buat Template Baru"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Ubah detail template knowledge base" : "Buat template knowledge base baru untuk merchant"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Nama Template *</Label>
                <Input
                  id="template-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E-commerce Customer Service"
                  className="mt-1"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="template-category">Kategori *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="mt-1" data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual - Santai & friendly</SelectItem>
                    <SelectItem value="formal">Formal - Profesional & sopan</SelectItem>
                    <SelectItem value="corporate">Corporate - Bisnis & resmi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="template-description">Deskripsi</Label>
              <Input
                id="template-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Template untuk bisnis e-commerce dengan gaya santai"
                className="mt-1"
                data-testid="input-template-description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-business">Tipe Bisnis (opsional)</Label>
                <Input
                  id="template-business"
                  value={formBusinessType}
                  onChange={(e) => setFormBusinessType(e.target.value)}
                  placeholder="e-commerce, restaurant, saas"
                  className="mt-1"
                  data-testid="input-template-business"
                />
              </div>
              <div>
                <Label htmlFor="template-language">Bahasa</Label>
                <Select value={formLanguage} onValueChange={setFormLanguage}>
                  <SelectTrigger className="mt-1" data-testid="select-template-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Bahasa Indonesia</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="template-content">Konten Knowledge Base *</Label>
              <Textarea
                id="template-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Masukkan konten knowledge base template di sini..."
                className="mt-1 min-h-[200px] font-mono text-sm"
                data-testid="textarea-template-content"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Konten ini akan ditambahkan ke knowledge base merchant saat mereka memilih template ini
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Status Aktif</Label>
                <p className="text-xs text-muted-foreground">Template aktif dapat dilihat dan digunakan merchant</p>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                data-testid="switch-template-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingTemplate(null); resetForm(); }}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formName || !formContent || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-template"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? "Simpan Perubahan" : "Buat Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Activity Logs Tab - View all merchant activity logs
function ActivityLogsTab({ toast }: { toast: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  interface ActivityLog {
    id: string;
    merchantId: string;
    activityType: string;
    activityCategory: string | null;
    description: string;
    pageUrl: string | null;
    elementId: string | null;
    elementLabel: string | null;
    formData: any | null;
    authMethod: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }
  
  const { data: logs = [], isLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity-logs", filterType],
    queryFn: async () => {
      const params = filterType !== "all" ? `?type=${filterType}` : "";
      const response = await fetch(`/api/admin/activity-logs${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activity logs");
      return response.json();
    },
  });
  
  // Fetch merchants for name lookup
  const { data: merchants = [] } = useQuery<MerchantWithPlan[]>({
    queryKey: ["/api/admin/merchants"],
  });
  
  const getMerchantName = (merchantId: string) => {
    const merchant = merchants.find(m => m.id === merchantId);
    return merchant?.companyName || merchant?.username || merchant?.email || merchantId.substring(0, 8) + "...";
  };
  
  // Filter logs by search
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    const merchantName = getMerchantName(log.merchantId).toLowerCase();
    return (
      log.description.toLowerCase().includes(query) ||
      merchantName.includes(query) ||
      log.activityType.toLowerCase().includes(query) ||
      (log.authMethod && log.authMethod.toLowerCase().includes(query)) ||
      (log.ipAddress && log.ipAddress.includes(query))
    );
  });
  
  const getActivityTypeBadge = (type: string) => {
    switch (type) {
      case "sign_up":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Sign Up</Badge>;
      case "sign_in":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">Sign In</Badge>;
      case "page_view":
        return <Badge variant="secondary">Page View</Badge>;
      case "button_click":
        return <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400">Click</Badge>;
      case "form_submit":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">Form Submit</Badge>;
      case "workflow_action":
        return <Badge className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">Workflow</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  const getAuthMethodBadge = (method: string | null) => {
    if (!method) return null;
    switch (method) {
      case "email":
        return <Badge variant="outline" className="text-xs">Email</Badge>;
      case "google":
        return <Badge variant="outline" className="text-xs bg-red-500/10">Google</Badge>;
      case "github":
        return <Badge variant="outline" className="text-xs bg-slate-500/10">GitHub</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{method}</Badge>;
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  // Download CSV
  const handleDownloadCSV = () => {
    if (filteredLogs.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada log aktivitas untuk diunduh",
        variant: "destructive",
      });
      return;
    }
    
    const headers = ["Time", "Merchant", "Activity Type", "Description", "Auth Method", "IP Address", "User Agent"];
    const rows = filteredLogs.map(log => [
      formatDate(log.createdAt),
      getMerchantName(log.merchantId),
      log.activityType,
      log.description,
      log.authMethod || "-",
      log.ipAddress || "-",
      log.userAgent || "-",
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatvice-activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: `${filteredLogs.length} activity logs downloaded successfully`,
    });
  };
  
  // Calculate stats
  const signUpCount = logs.filter(l => l.activityType === "sign_up").length;
  const signInCount = logs.filter(l => l.activityType === "sign_in").length;
  const otherCount = logs.filter(l => !["sign_up", "sign_in"].includes(l.activityType)).length;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor all merchant activities on the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-logs">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleDownloadCSV} data-testid="button-download-logs-csv">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-full">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{signUpCount}</p>
                <p className="text-sm text-muted-foreground">Total Sign Up</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{signInCount}</p>
                <p className="text-sm text-muted-foreground">Total Sign In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <History className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{otherCount}</p>
                <p className="text-sm text-muted-foreground">Aktivitas Lainnya</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari merchant, aktivitas, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="select-filter-type">
                  <SelectValue placeholder="Filter tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="sign_up">Sign Up</SelectItem>
                  <SelectItem value="sign_in">Sign In</SelectItem>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="button_click">Button Click</SelectItem>
                  <SelectItem value="form_submit">Form Submit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredLogs.length} dari {logs.length} log
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada log aktivitas ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Auth Method</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id} data-testid={`row-activity-log-${log.id}`}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {getMerchantName(log.merchantId)}
                      </TableCell>
                      <TableCell>{getActivityTypeBadge(log.activityType)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {log.description}
                      </TableCell>
                      <TableCell>{getAuthMethodBadge(log.authMethod)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredLogs.length > 100 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Menampilkan 100 dari {filteredLogs.length} log. Download CSV untuk melihat semua data.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Admin User Data Tab - View all customer contact data across all merchants
function AdminUserDataTab({ toast }: { toast: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "widget" | "chatvice">("all");
  
  interface AdminUserData {
    name: string;
    phone: string;
    email: string | null;
    merchantId: string;
    merchantName: string;
    lastSeen: string;
    type: "widget";
  }
  
  interface ChatviceMember {
    id: string;
    phoneNumber: string;
    phoneCountryCode: string | null;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
    isPhoneVerified: boolean;
    lastActiveAt: string | null;
    notificationsEnabled: boolean;
    createdAt: string;
    storeChatsCount: number;
    contactsCount: number;
    type: "chatvice";
  }
  
  const { data: widgetUsers = [], isLoading: widgetLoading } = useQuery<AdminUserData[]>({
    queryKey: ["/api/admin/user-data"],
  });
  
  const { data: chatviceMembers = [], isLoading: membersLoading } = useQuery<ChatviceMember[]>({
    queryKey: ["/api/admin/chatvice-members"],
  });
  
  const isLoading = widgetLoading || membersLoading;
  
  // Add type to widget users
  const typedWidgetUsers = widgetUsers.map(u => ({ ...u, type: "widget" as const }));
  const typedMembers = chatviceMembers.map(m => ({ ...m, type: "chatvice" as const }));
  
  // Filter data based on search and active filter
  const filteredWidgetUsers = typedWidgetUsers.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.phone.includes(query) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      user.merchantName.toLowerCase().includes(query)
    );
  });
  
  const filteredMembers = typedMembers.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      (member.displayName && member.displayName.toLowerCase().includes(query)) ||
      member.phoneNumber.includes(query) ||
      (member.email && member.email.toLowerCase().includes(query))
    );
  });
  
  // Get data based on filter
  const displayData = activeFilter === "widget" 
    ? { widget: filteredWidgetUsers, chatvice: [] }
    : activeFilter === "chatvice"
    ? { widget: [], chatvice: filteredMembers }
    : { widget: filteredWidgetUsers, chatvice: filteredMembers };
  
  // Format phone number for display (add + prefix)
  const formatPhone = (phone: string) => {
    return phone ? (phone.startsWith("+") ? phone : `+${phone}`) : "-";
  };
  
  // Download CSV
  const handleDownloadCSV = () => {
    const allData = [...displayData.widget, ...displayData.chatvice];
    if (allData.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data untuk diunduh",
        variant: "destructive",
      });
      return;
    }
    
    const headers = ["Type", "Name", "Phone", "Email", "Source/Stats", "Last Active"];
    const rows = [
      ...displayData.widget.map((user) => [
        "Widget User",
        user.name,
        formatPhone(user.phone),
        user.email || "-",
        user.merchantName,
        new Date(user.lastSeen).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }),
      ]),
      ...displayData.chatvice.map((member) => [
        "Chatvice Member",
        member.displayName || "Anonymous",
        formatPhone(member.phoneNumber),
        member.email || "-",
        `${member.storeChatsCount} stores, ${member.contactsCount} contacts`,
        member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-",
      ]),
    ];
    
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatvice-user-data-${activeFilter}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: `${allData.length} user data downloaded successfully`,
    });
  };
  
  const totalCount = displayData.widget.length + displayData.chatvice.length;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Data
            </CardTitle>
            <CardDescription>
              All registered users from widget and Chatvice app
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {totalCount} users
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              disabled={totalCount === 0}
              data-testid="button-download-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              data-testid="filter-all"
            >
              All Users
              <Badge variant="secondary" className="ml-2">
                {widgetUsers.length + chatviceMembers.length}
              </Badge>
            </Button>
            <Button
              variant={activeFilter === "widget" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("widget")}
              data-testid="filter-widget"
            >
              Widget Users
              <Badge variant="secondary" className="ml-2">{widgetUsers.length}</Badge>
            </Button>
            <Button
              variant={activeFilter === "chatvice" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("chatvice")}
              data-testid="filter-chatvice-member"
            >
              <Crown className="w-4 h-4 mr-1" />
              Chatvice Member
              <Badge variant="secondary" className="ml-2">{chatviceMembers.length}</Badge>
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, telepon, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-user-data"
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Belum Ada Data Pengguna</p>
              <p className="text-sm">Data pengguna akan muncul setelah mereka mendaftar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Chatvice Members Section */}
              {displayData.chatvice.length > 0 && (
                <div data-testid="section-chatvice-members">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-600" data-testid="text-chatvice-members-title">Chatvice Members</h3>
                    <Badge className="bg-green-600" data-testid="badge-chatvice-members-count">{displayData.chatvice.length}</Badge>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Stats</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.chatvice.map((member) => (
                          <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8" data-testid={`avatar-member-${member.id}`}>
                                  <AvatarImage src={member.avatarUrl || undefined} alt={member.displayName || "Member"} />
                                  <AvatarFallback className="bg-green-100 dark:bg-green-900">
                                    <Crown className="w-4 h-4 text-green-600" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium" data-testid={`text-member-name-${member.id}`}>{member.displayName || "Anonymous"}</p>
                                  <Badge className="bg-green-600 text-[10px]" data-testid={`badge-member-${member.id}`}>Chatvice Member</Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {formatPhone(member.phoneNumber)}
                              </code>
                              {member.isPhoneVerified && (
                                <CheckCircle className="w-3 h-3 text-green-500 inline ml-1" />
                              )}
                            </TableCell>
                            <TableCell>
                              {member.email ? (
                                <span className="text-sm">{member.email}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 text-xs">
                                <Badge variant="outline" data-testid={`badge-stores-${member.id}`}>{member.storeChatsCount} stores</Badge>
                                <Badge variant="outline" data-testid={`badge-contacts-${member.id}`}>{member.contactsCount} contacts</Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.notificationsEnabled ? (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-notif-on-${member.id}`}>
                                  <Bell className="w-3 h-3 mr-1" />
                                  Notif ON
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground" data-testid={`badge-notif-off-${member.id}`}>
                                  Notif OFF
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(member.createdAt).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {/* Widget Users Section */}
              {displayData.widget.length > 0 && (
                <div data-testid="section-widget-users">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold" data-testid="text-widget-users-title">Widget Users</h3>
                    <Badge variant="secondary" data-testid="badge-widget-users-count">{displayData.widget.length}</Badge>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Telepon</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Terakhir Aktif</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.widget.map((user, index) => (
                          <TableRow key={`${user.phone}-${index}`} data-testid={`row-user-${index}`}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {formatPhone(user.phone)}
                              </code>
                            </TableCell>
                            <TableCell>
                              {user.email ? (
                                <span className="text-sm">{user.email}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.merchantName}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(user.lastSeen).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
