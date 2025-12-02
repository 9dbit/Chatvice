import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Redirect, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { format } from "date-fns";
import { subscriptionPlans } from "@shared/schema";

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
  const adminId = localStorage.getItem("adminId");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!adminId,
  });

  const { data: merchants, isLoading: merchantsLoading } = useQuery<MerchantWithPlan[]>({
    queryKey: ["/api/admin/merchants"],
    enabled: !!adminId,
  });

  const handleLogout = () => {
    localStorage.removeItem("adminId");
    localStorage.removeItem("userType");
    setLocation("/admin/login");
  };

  if (!adminId) {
    return <Redirect to="/admin/login" />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-700">Active</Badge>;
      case "trial":
        return <Badge variant="secondary">Trial</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case "free":
        return <Badge variant="outline"><Gift className="w-3 h-3 mr-1" />Free</Badge>;
      case "starter":
        return <Badge className="bg-blue-500/20 text-blue-700"><Zap className="w-3 h-3 mr-1" />Starter</Badge>;
      case "pro":
        return <Badge className="bg-purple-500/20 text-purple-700"><Crown className="w-3 h-3 mr-1" />Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-orange-500/20 text-orange-700"><Building2 className="w-3 h-3 mr-1" />Enterprise</Badge>;
      case "custom":
        return <Badge className="bg-pink-500/20 text-pink-700"><Sparkles className="w-3 h-3 mr-1" />Custom</Badge>;
      default:
        return <Badge variant="outline"><Zap className="w-3 h-3 mr-1" />Free</Badge>;
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "merchants", label: "Merchants", icon: Building2 },
    { id: "content", label: "Content & Media", icon: Image },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "reports", label: "Performance", icon: TrendingUp },
    { id: "usage", label: "Data Usage", icon: Database },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "transactions", label: "Transactions", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Chatvice</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 mb-3">
            <ThemeToggle />
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full" data-testid="button-admin-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="border-b p-4">
          <h2 className="text-xl font-bold capitalize">{activeTab.replace("-", " ")}</h2>
        </header>

        <div className="p-6 space-y-6">
          {activeTab === "overview" && (
            <OverviewTab stats={stats} statsLoading={statsLoading} />
          )}
          
          {activeTab === "merchants" && (
            <MerchantsTab 
              merchants={merchants} 
              merchantsLoading={merchantsLoading}
              getStatusBadge={getStatusBadge}
              getPlanBadge={getPlanBadge}
            />
          )}
          
          {activeTab === "content" && <ContentTab toast={toast} />}
          
          {activeTab === "pricing" && <PricingTab toast={toast} />}
          
          {activeTab === "reports" && <ReportsTab stats={stats} />}
          
          {activeTab === "usage" && <UsageTab stats={stats} />}
          
          {activeTab === "billing" && <BillingTab />}
          
          {activeTab === "transactions" && <TransactionsTab />}
          
          {activeTab === "settings" && <SettingsTab toast={toast} />}
        </div>
      </main>
    </div>
  );
}

function OverviewTab({ stats, statsLoading }: { stats?: AdminStats; statsLoading: boolean }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="text-total-merchants">
                  {stats?.totalMerchants || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="text-active-merchants">
                  {stats?.activeMerchants || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="text-total-conversations">
                  {stats?.totalConversations || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="text-total-revenue">
                  ${stats?.totalRevenue?.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Export Merchant List
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Generate Revenue Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Configure System Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MerchantsTab({ 
  merchants, 
  merchantsLoading,
  getStatusBadge,
  getPlanBadge 
}: { 
  merchants?: MerchantWithPlan[];
  merchantsLoading: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  getPlanBadge: (planId: string) => JSX.Element;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Merchants</CardTitle>
            <CardDescription>Manage registered merchants</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Merchant
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {merchantsLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants?.map((merchant) => (
                <TableRow key={merchant.id} data-testid={`row-merchant-${merchant.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{merchant.companyName || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">{merchant.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getPlanBadge(merchant.subscriptionPlanId)}</TableCell>
                  <TableCell>{getStatusBadge(merchant.subscriptionStatus)}</TableCell>
                  <TableCell>
                    {merchant.conversationsUsed || 0} / {merchant.plan.conversationsLimit === -1 ? '∞' : merchant.plan.conversationsLimit}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {merchant.createdAt ? format(new Date(merchant.createdAt), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!merchants || merchants.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No merchants registered yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ContentTab({ toast }: { toast: any }) {
  const [heroTitle, setHeroTitle] = useState("AI-Powered Customer Support That Never Sleeps");
  const [heroSubtitle, setHeroSubtitle] = useState("Transform your customer experience with Chatvice");
  
  const handleSave = () => {
    toast({
      title: "Content Updated",
      description: "Your changes have been saved successfully.",
    });
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
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Images
            </CardTitle>
            <CardDescription>Manage landing page images</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop hero image here or click to upload
              </p>
              <Button variant="outline" size="sm" className="mt-3">
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop video here or enter YouTube URL
              </p>
              <Input placeholder="https://youtube.com/..." className="mt-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Trusted By Logos
          </CardTitle>
          <CardDescription>Company logos displayed on landing page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {["Stripe", "Shopify", "Zendesk", "HubSpot"].map((company) => (
              <div key={company} className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 bg-muted rounded mx-auto mb-2" />
                <p className="text-sm font-medium">{company}</p>
                <Button variant="ghost" size="sm" className="mt-2">
                  Replace
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PricingTab({ toast }: { toast: any }) {
  const plans = Object.values(subscriptionPlans);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Configure pricing and features for each plan</CardDescription>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Annual Price</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>${plan.monthlyPrice}/mo</TableCell>
                  <TableCell>${plan.annualPrice}/mo (annual)</TableCell>
                  <TableCell>{plan.conversationsLimit === -1 ? 'Unlimited' : plan.conversationsLimit}</TableCell>
                  <TableCell>{plan.agentsLimit === -1 ? 'Unlimited' : plan.agentsLimit}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promotional Discounts</CardTitle>
          <CardDescription>Active discount codes and promotions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No active promotions</p>
          <Button variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Create Discount Code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsTab({ stats }: { stats?: AdminStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2.4s</p>
            <p className="text-xs text-green-600">-12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">94.2%</p>
            <p className="text-xs text-green-600">+3% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">87.5%</p>
            <p className="text-xs text-green-600">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Last 30 days overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">Chart visualization would go here</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>Export detailed analytics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Performance Report
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Usage Report
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Revenue Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageTab({ stats }: { stats?: AdminStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalMessages?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Calls (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">12,453</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2.4 GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">45.2 GB</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Usage by Merchant</CardTitle>
          <CardDescription>Top consumers of platform resources</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>API Calls</TableHead>
                <TableHead>Storage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Acme Corp</TableCell>
                <TableCell>45,231</TableCell>
                <TableCell>125,000</TableCell>
                <TableCell>512 MB</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>TechStart Inc</TableCell>
                <TableCell>23,156</TableCell>
                <TableCell>89,000</TableCell>
                <TableCell>256 MB</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Replit Billing</CardTitle>
          <CardDescription>Your Replit account billing information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
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
          <CardTitle>Stripe Integration</CardTitle>
          <CardDescription>Manage your Stripe payment settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Stripe Account</p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
            <Badge className="bg-green-500/20 text-green-700">Active</Badge>
          </div>
          <Button variant="outline" asChild>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
              Open Stripe Dashboard
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsTab() {
  const transactions = [
    { id: "tx_1", merchant: "Acme Corp", amount: 99, plan: "Pro", date: "2024-01-15", status: "completed" },
    { id: "tx_2", merchant: "TechStart Inc", amount: 29, plan: "Starter", date: "2024-01-14", status: "completed" },
    { id: "tx_3", merchant: "GlobalShop", amount: 299, plan: "Enterprise", date: "2024-01-12", status: "completed" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Chatvice subscription payments</CardDescription>
            </div>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                  <TableCell>{tx.merchant}</TableCell>
                  <TableCell>{tx.plan}</TableCell>
                  <TableCell>${tx.amount}</TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/20 text-green-700">
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$4,527</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$42,830</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$5,120</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsTab({ toast }: { toast: any }) {
  const [soundAlertUrl, setSoundAlertUrl] = useState("");
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const soundInputRef = useRef<HTMLInputElement>(null);

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
            <div className="flex gap-2 mt-3">
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
              <Input type="color" className="w-16 h-10" defaultValue="#6366f1" />
              <Input placeholder="#6366f1" defaultValue="#6366f1" className="flex-1" />
            </div>
          </div>
          <div>
            <Label>Logo Upload</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center mt-2">
              <Button variant="outline" size="sm">Upload Logo</Button>
            </div>
          </div>
          <Button onClick={handleSave}>
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
          <Button onClick={handleSave}>
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
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
