import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  Users,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Gift,
  Shield,
  Clock,
  Wallet,
  Copy,
  Loader2,
  CheckCircle,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function AffiliatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [originUrl, setOriginUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const { data: currentMerchant, isLoading: merchantLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const isLoggedIn = !merchantLoading && currentMerchant && !(currentMerchant as any).error;

  const { data: affiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ["/api/affiliate/me"],
    enabled: isLoggedIn,
  });

  const { data: affiliateSettings } = useQuery({
    queryKey: ["/api/affiliate/settings"],
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
    if (!originUrl || !(affiliate as any)?.affiliateCode) return "";
    return `${originUrl}/register?ref=${(affiliate as any)?.affiliateCode}`;
  }, [originUrl, affiliate]);

  const benefits = [
    {
      icon: DollarSign,
      title: `${defaultCommission}% Commission`,
      description: `Earn ${defaultCommission}% of every subscription payment from your referrals for the first year.`,
    },
    {
      icon: Clock,
      title: `${cookieDays}-Day Cookie`,
      description: `Your referrals are tracked for ${cookieDays} days, giving you credit even if they sign up later.`,
    },
    {
      icon: Wallet,
      title: "Monthly Payouts",
      description: `Get paid monthly via PayPal or bank transfer. Minimum payout is $${minimumPayout}.`,
    },
    {
      icon: TrendingUp,
      title: "Real-Time Tracking",
      description: "Monitor your clicks, signups, and earnings in a dedicated affiliate dashboard.",
    },
    {
      icon: Gift,
      title: "Exclusive Bonuses",
      description: "Top affiliates earn additional bonuses and get access to exclusive promotions.",
    },
    {
      icon: Shield,
      title: "Dedicated Support",
      description: "Our affiliate team is here to help you succeed with marketing materials and support.",
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Sign Up",
      description: "Create a Chatvice account and apply for the affiliate program.",
    },
    {
      step: "2",
      title: "Get Your Link",
      description: "Receive your unique referral link and marketing materials.",
    },
    {
      step: "3",
      title: "Share & Promote",
      description: "Share your link on social media, blogs, or with your network.",
    },
    {
      step: "4",
      title: "Earn Commissions",
      description: "Earn money every time someone subscribes through your link.",
    },
  ];

  const stats = [
    { value: "$500K+", label: "Paid to Affiliates" },
    { value: "1,000+", label: "Active Affiliates" },
    { value: `${defaultCommission}%`, label: "Commission Rate" },
  ];

  const handleApply = () => {
    if (!isLoggedIn) {
      setLocation("/register?ref=affiliate");
      return;
    }
    setApplyDialogOpen(true);
  };

  const copyReferralLink = async () => {
    if (!referralLink) return;
    
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
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

  const isLoadingState = merchantLoading || (isLoggedIn && affiliateLoading);

  return (
    <PublicPageLayout>
      <section className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Users className="w-3 h-3 mr-1" />
            Affiliate Program
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Earn Money Sharing Chatvice
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            Join our affiliate program and earn {defaultCommission}% commission for every 
            customer you refer. Start earning passive income today.
          </p>
          
          {isLoadingState ? (
            <Button size="lg" disabled className="bg-white text-purple-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </Button>
          ) : (affiliate as any)?.status === "active" ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
                <div className="text-left">
                  <p className="text-sm text-purple-200">Your Referral Link</p>
                  <Input 
                    readOnly 
                    value={referralLink} 
                    className="bg-transparent border-0 text-white font-mono text-sm p-0 h-auto max-w-[200px]"
                    data-testid="input-referral-link"
                  />
                </div>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={copyReferralLink} data-testid="button-copy-link">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Link href="/dashboard/affiliate">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-dashboard">
                  Open Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (affiliate as any)?.status === "pending" ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-300" />
              <span>Your application is pending review</span>
            </div>
          ) : (
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" onClick={handleApply} data-testid="button-apply-affiliate">
              {isLoggedIn ? "Apply Now" : "Sign Up to Apply"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} data-testid={`stat-${index}`}>
                <p className="text-4xl font-bold text-purple-600 mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Join Our Affiliate Program?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We offer one of the most competitive affiliate programs in the AI customer service space.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6" data-testid={`benefit-card-${index}`}>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start earning in just a few simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center" data-testid={`step-${index}`}>
                <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Program Requirements</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple requirements to get started.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <ul className="space-y-4">
                <li className="flex items-start gap-3" data-testid="requirement-0">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Active Chatvice Account</p>
                    <p className="text-sm text-muted-foreground">You must have a registered Chatvice account to join the program.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3" data-testid="requirement-1">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Quality Promotion</p>
                    <p className="text-sm text-muted-foreground">Promote Chatvice through legitimate channels like your website, blog, or social media.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3" data-testid="requirement-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">No Spam or Misleading Claims</p>
                    <p className="text-sm text-muted-foreground">We don't allow spam or misleading advertising. Keep it honest and transparent.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3" data-testid="requirement-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">PayPal or Bank Account</p>
                    <p className="text-sm text-muted-foreground">You need a valid PayPal account or bank account to receive commission payments.</p>
                  </div>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-purple-100 mb-8">
            Join thousands of affiliates who are already earning with Chatvice.
          </p>
          <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" onClick={handleApply} data-testid="button-apply-affiliate-cta">
            {isLoggedIn ? "Apply Now" : "Sign Up & Apply"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent data-testid="dialog-affiliate-apply">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Apply for Affiliate Program
            </DialogTitle>
            <DialogDescription>
              Submit your application to join our affiliate program and start earning commissions.
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payout Frequency</span>
                <span className="font-medium">Monthly</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              By applying, you agree to our affiliate program terms and conditions.
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
              data-testid="button-confirm-affiliate-apply"
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
    </PublicPageLayout>
  );
}
