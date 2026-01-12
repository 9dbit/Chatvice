import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Loader2,
  CheckCircle,
  Clock,
  ExternalLink,
  MousePointer,
  UserPlus,
  CreditCard,
  Wallet,
  ArrowRight,
} from "lucide-react";

export default function AffiliateDashboardPage() {
  const { toast } = useToast();
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const { data: affiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ["/api/affiliate/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: affiliateSettings } = useQuery({
    queryKey: ["/api/affiliate/settings"],
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/affiliate/dashboard"],
    enabled: (affiliate as any)?.status === "active",
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/affiliate/apply");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Your affiliate application has been submitted for review.",
      });
      setApplyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const defaultCommission = (affiliateSettings as any)?.defaultCommissionRate || 20;
  const cookieDays = (affiliateSettings as any)?.cookieDays || 30;
  const minimumPayout = (affiliateSettings as any)?.minimumPayout || 50;

  const referralLink = useMemo(() => {
    if (!(affiliate as any)?.affiliateCode) return "";
    return `${window.location.origin}/register?ref=${(affiliate as any)?.affiliateCode}`;
  }, [affiliate]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(referralLink);
        toast({
          title: "Link Copied!",
          description: "Your referral link has been copied to clipboard.",
        });
      } else {
        toast({
          title: "Copy this link",
          description: referralLink,
        });
      }
    } catch {
      toast({
        title: "Copy this link",
        description: referralLink,
      });
    }
  };

  if (affiliateLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Join Our Affiliate Program</h2>
          <p className="text-muted-foreground mb-6">
            Earn {defaultCommission}% commission for every customer you refer. 
            Share your unique link and start earning passive income today.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{defaultCommission}%</p>
              <p className="text-sm text-muted-foreground">Commission</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{cookieDays}</p>
              <p className="text-sm text-muted-foreground">Days Cookie</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">${minimumPayout}</p>
              <p className="text-sm text-muted-foreground">Min Payout</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setApplyDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-apply-affiliate">
              Apply Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link href="/affiliate">
              <Button variant="outline" data-testid="button-learn-more">
                Learn More
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Apply for Affiliate Program
              </DialogTitle>
              <DialogDescription>
                Submit your application to join our affiliate program.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Commission Rate</span>
                  <span className="font-medium">{defaultCommission}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cookie Duration</span>
                  <span className="font-medium">{cookieDays} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Minimum Payout</span>
                  <span className="font-medium">${minimumPayout}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                By applying, you agree to our affiliate program terms.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => applyMutation.mutate()} 
                disabled={applyMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-confirm-apply"
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if ((affiliate as any)?.status === "pending") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Application Pending</h2>
          <p className="text-muted-foreground mb-6">
            Your affiliate application is currently under review. 
            We'll notify you once it's approved.
          </p>
          <Badge variant="secondary" className="text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        </Card>
      </div>
    );
  }

  const stats = (dashboardData as any)?.stats || {
    totalClicks: 0,
    totalSignups: 0,
    totalConversions: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    totalEarnings: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Track your referrals and earnings</p>
        </div>
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active Affiliate
        </Badge>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={referralLink} 
                className="font-mono text-sm"
                data-testid="input-referral-link"
              />
              <Button size="icon" variant="outline" onClick={copyReferralLink} data-testid="button-copy-link">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-muted-foreground">Affiliate Code</p>
            <p className="text-lg font-bold font-mono">{(affiliate as any)?.affiliateCode}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalClicks}</p>
              <p className="text-sm text-muted-foreground">Clicks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSignups}</p>
              <p className="text-sm text-muted-foreground">Sign Ups</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConversions}</p>
              <p className="text-sm text-muted-foreground">Conversions</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Earned</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Earnings Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-muted-foreground">Pending Earnings</span>
              <span className="font-bold text-yellow-600">${stats.pendingEarnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-muted-foreground">Paid Earnings</span>
              <span className="font-bold text-green-600">${stats.paidEarnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="font-medium">Total Earnings</span>
              <span className="text-xl font-bold">${stats.totalEarnings.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p>Minimum payout: ${minimumPayout}</p>
              <p>Commission rate: {(affiliate as any)?.commissionRate || defaultCommission}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Program Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-muted-foreground">Your Commission Rate</span>
              <span className="font-bold text-purple-600">{(affiliate as any)?.commissionRate || defaultCommission}%</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-muted-foreground">Cookie Duration</span>
              <span className="font-bold">{cookieDays} days</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-muted-foreground">Payout Method</span>
              <span className="font-bold">{(affiliate as any)?.payoutMethod || "PayPal"}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Member Since</span>
              <span className="font-bold">
                {(affiliate as any)?.approvedAt 
                  ? new Date((affiliate as any).approvedAt).toLocaleDateString()
                  : "-"
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
