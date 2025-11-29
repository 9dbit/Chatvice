import { useQuery } from "@tanstack/react-query";
import { useLocation, Redirect, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/theme-toggle";
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
} from "lucide-react";
import { format } from "date-fns";

interface AdminStats {
  totalMerchants: number;
  activeMerchants: number;
  trialMerchants: number;
  totalConversations: number;
  planDistribution: {
    starter: number;
    pro: number;
    enterprise: number;
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

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const adminId = localStorage.getItem("adminId");

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
      case "pro":
        return <Badge className="bg-purple-500/20 text-purple-700"><Crown className="w-3 h-3 mr-1" />Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-orange-500/20 text-orange-700"><Building2 className="w-3 h-3 mr-1" />Enterprise</Badge>;
      default:
        return <Badge variant="outline"><Zap className="w-3 h-3 mr-1" />Starter</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Jeany AI Admin</h1>
                <p className="text-sm text-muted-foreground">Master Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout} data-testid="button-admin-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold" data-testid="text-trial-merchants">
                    {stats?.trialMerchants || 0}
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
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
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
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span>Starter</span>
                    </div>
                    <span className="font-bold">{stats?.planDistribution.starter || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-500" />
                      <span>Pro</span>
                    </div>
                    <span className="font-bold">{stats?.planDistribution.pro || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-orange-500" />
                      <span>Enterprise</span>
                    </div>
                    <span className="font-bold">{stats?.planDistribution.enterprise || 0}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Merchants</CardTitle>
                  <CardDescription>Latest registered merchants</CardDescription>
                </div>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants?.slice(0, 10).map((merchant) => (
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
                      </TableRow>
                    ))}
                    {(!merchants || merchants.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No merchants registered yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
