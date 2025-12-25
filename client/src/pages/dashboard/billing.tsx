import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Check, Zap, Users, MessageSquare, Crown, AlertTriangle, ArrowUpRight, Calendar, Clock, Lock, Loader2, CheckCircle2, Sparkles, Gift, Building2, ChevronDown, ChevronUp, QrCode, Timer, RefreshCw, Download, XCircle, Tag, Smartphone, Copy, ShieldCheck, FileText, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { type SubscriptionPlanId } from "@shared/schema";

interface ActivePromotion {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  endDate: string;
  showUpsell: boolean;
  bgColor?: string | null;
  textColor?: string | null;
  bannerMode?: string | null;
  bannerImageUrl?: string | null;
}

interface ValidatedPromo {
  id: string;
  code: string;
  name: string;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  validatedBillingCycle: string;
}

interface PendingTransaction {
  transactionId: string;
  status: string;
  amount?: number;
  amountFormatted?: string;
  expiryTime?: string;
  paymentMethod?: string;
  orderId?: string;
  planName?: string;
}

interface BillingStatus {
  status: string;
  planId: string;
  planName: string;
  billingInterval: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  conversationsUsed: number;
  conversationsLimit: number;
  supervisorsLimit: number;
  isTrialExpired: boolean;
  hasActiveSubscription: boolean;
  pendingTransaction?: PendingTransaction | null;
}

interface QRISPaymentResponse {
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  qrisString: string;
  qrisImageUrl: string;
  amount: number;
  amountFormatted: string;
  amountUSD: number;
  expiryTime: string;
  planName: string;
  billingInterval: string;
}

interface BillingTransaction {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  amountFormatted: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';
  paymentMethod: string | null;
  planName: string | null;
  subscriptionMonths: number | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
}

export default function BillingPage() {
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [qrisPaymentOpen, setQrisPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<'checkout' | 'loading' | 'qris' | 'checking' | 'success' | 'expired' | 'error'>('checkout');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [qrisData, setQrisData] = useState<QRISPaymentResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCanceledMessage, setShowCanceledMessage] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [prorationInfo, setProrationInfo] = useState<{
    creditAmount: number;
    newPlanPrice: number;
    finalAmount: number;
    daysRemaining: number;
    prorationApplied: boolean;
  } | null>(null);
  
  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatedPromo, setValidatedPromo] = useState<ValidatedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: billingStatus, isLoading, refetch } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  // Fetch subscription plans from database
  const { data: dbPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  // Fetch active public promotions
  const { data: activePromos = [] } = useQuery<ActivePromotion[]>({
    queryKey: ["/api/promotions/active"],
  });
  
  // Fetch billing transaction history
  const { data: billingHistory = [], isLoading: isLoadingHistory } = useQuery<BillingTransaction[]>({
    queryKey: ["/api/billing/transactions"],
  });
  
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 7;

  // Get applicable promotion for current billing cycle
  const currentBillingCycle = isAnnual ? "annual" : "monthly";
  const applicablePromo = activePromos.find(p => 
    p.billingCycle === "both" || p.billingCycle === currentBillingCycle
  );

  // Validate promo code for a specific plan
  const validatePromoCode = async (planId: string) => {
    if (!promoCodeInput.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }
    
    setIsValidatingPromo(true);
    setPromoError(null);
    
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          planId,
          billingCycle: currentBillingCycle,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setPromoError(data.error || "Invalid promo code");
        setValidatedPromo(null);
      } else if (data.valid) {
        // Store validated promo with qualifying info
        setValidatedPromo({
          ...data.promotion,
          validatedBillingCycle: currentBillingCycle,
        });
        setPromoError(null);
        toast({
          title: "Promo code applied!",
          description: `${data.promotion.discountPercent}% discount will be applied to qualifying plans.`,
        });
      }
    } catch (err) {
      setPromoError("Failed to validate promo code");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Check if a promo applies to a specific plan and billing cycle
  const getPromoForPlan = (planId: string): { discountPercent: number; code: string } | null => {
    // Check if we have a validated promo that applies to this plan and current billing cycle
    if (validatedPromo) {
      // Check if the promo's billing cycle restriction matches current selection
      const billingCycleMatches = validatedPromo.billingCycle === "both" || 
                                   validatedPromo.billingCycle === currentBillingCycle;
      if (billingCycleMatches) {
        // Check if this plan qualifies for the validated promo
        const targets = validatedPromo.targetPlans || [];
        const isTarget = targets.includes("all") || targets.includes(planId) ||
                         (targets.includes("upgrade") && (planId === "starter" || planId === "pro" || planId === "enterprise"));
        if (isTarget) {
          return { discountPercent: validatedPromo.discountPercent, code: validatedPromo.code };
        }
      }
    }
    // Check if there's an applicable public promo
    if (applicablePromo) {
      const targets = applicablePromo.targetPlans || [];
      const isTarget = targets.includes("all") || targets.includes(planId) ||
                       (targets.includes("upgrade") && (planId === "starter" || planId === "pro" || planId === "enterprise"));
      if (isTarget) {
        return { discountPercent: applicablePromo.discountPercent, code: applicablePromo.code };
      }
    }
    return null;
  };

  // Calculate discounted price
  const getDiscountedPrice = (price: number, planId: string) => {
    const promo = getPromoForPlan(planId);
    if (promo) {
      return Math.round(price * (1 - promo.discountPercent / 100));
    }
    return price;
  };

  // Clear promo when billing cycle changes
  useEffect(() => {
    setValidatedPromo(null);
    setPromoError(null);
  }, [isAnnual]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    
    if (success) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      const syncBilling = async () => {
        try {
          const response = await fetch("/api/billing/sync", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          
          if (response.ok) {
            const syncResult = await response.json();
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
            queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
            
            setShowSuccessMessage(true);
            toast({
              title: "Subscription Updated!",
              description: syncResult.synced 
                ? `Your plan has been upgraded to ${syncResult.planId}. Features are now unlocked.`
                : "Your payment was successful. Please refresh if plan doesn't update immediately.",
            });
            setTimeout(() => setShowSuccessMessage(false), 10000);
          }
        } catch (err) {
          console.error("Billing sync error:", err);
          queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
        }
      };
      
      syncBilling();
    }
    
    if (canceled) {
      setShowCanceledMessage(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      setTimeout(() => setShowCanceledMessage(false), 10000);
    }
  }, [toast]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/billing/cancel", {});
    },
    onSuccess: () => {
      setShowCancelDialog(false);
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You can resubscribe anytime.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/merchant/account", {});
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted. Redirecting...",
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval, promoCode }: { planId: string; billingInterval: string; promoCode?: string }) => {
      const response = await apiRequest("POST", "/api/billing/checkout", { planId, billingInterval, promoCode });
      return response.json() as Promise<QRISPaymentResponse>;
    },
    onSuccess: (data) => {
      setQrisData(data);
      setPaymentStep('qris');
      
      // Parse Kompas Pay format "2025-12-24 18:50:03" - replace space with T for ISO format
      const expiryTimeStr = data.expiryTime?.replace(' ', 'T') + 'Z';
      const expiryTime = new Date(expiryTimeStr).getTime();
      const now = Date.now();
      
      // Fallback to 5 minutes if parsing fails
      const initialRemaining = isNaN(expiryTime) ? 300 : Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(initialRemaining);
      
      countdownIntervalRef.current = setInterval(() => {
        const remaining = isNaN(expiryTime) 
          ? Math.max(0, initialRemaining - Math.floor((Date.now() - now) / 1000))
          : Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          setPaymentStep('expired');
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }
      }, 1000);
      
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/billing/payment-status/${data.transactionId}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const statusData = await response.json();
            if (statusData.status === 'PAID') {
              setPaymentStep('success');
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              
              queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
              queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
              queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
              
              setTimeout(() => {
                setQrisPaymentOpen(false);
                toast({
                  title: "Payment successful!",
                  description: `Your ${data.planName} plan is now active.`,
                });
              }, 3000);
            }
          }
        } catch (err) {
          console.error("Payment status check error:", err);
        }
      }, 5000);
    },
    onError: (error: Error) => {
      setPaymentStep('error');
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const demoCheckoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval }: { planId: string; billingInterval: string }) => {
      const res = await apiRequest("POST", "/api/billing/demo-checkout", { planId, billingInterval });
      return res.json();
    },
    onSuccess: () => {
      setPaymentStep('success');
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      setTimeout(() => {
        setQrisPaymentOpen(false);
        toast({
          title: "Subscription activated!",
          description: "Your demo subscription is now active.",
        });
      }, 2000);
    },
    onError: (error: Error) => {
      setPaymentStep('error');
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to process checkout.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = async (planId: string) => {
    const plan = dbPlans.find((p: any) => p.id === planId);
    if (plan) {
      const promo = getPromoForPlan(planId);
      const params = new URLSearchParams({
        plan: planId,
        interval: isAnnual ? 'annual' : 'monthly',
      });
      if (promo?.code) {
        params.set('promo', promo.code);
      }
      window.location.href = `/dashboard/checkout?${params.toString()}`;
    }
  };
  
  // Proceed from checkout to payment
  const handleProceedToPayment = () => {
    if (!selectedPlan || !termsAccepted) return;
    
    setPaymentStep('loading');
    const promo = getPromoForPlan(selectedPlan.id);
    checkoutMutation.mutate({
      planId: selectedPlan.id,
      billingInterval: isAnnual ? 'annual' : 'monthly',
      promoCode: promo?.code,
    });
  };

  const handleSaveQRIS = async () => {
    if (qrisData?.qrisImageUrl) {
      try {
        const response = await fetch(qrisData.qrisImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qris-payment-${qrisData.orderId}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Tersimpan!",
          description: "Gambar QRIS berhasil disimpan",
        });
      } catch {
        // Fallback: open image in new tab
        window.open(qrisData.qrisImageUrl, '_blank');
        toast({
          title: "Gambar QRIS",
          description: "Gambar QRIS dibuka di tab baru",
        });
      }
    }
  };

  const handleRetryPayment = () => {
    if (selectedPlan) {
      setPaymentStep('loading');
      const promo = getPromoForPlan(selectedPlan.id);
      checkoutMutation.mutate({
        planId: selectedPlan.id,
        billingInterval: isAnnual ? 'annual' : 'monthly',
        promoCode: promo?.code,
      });
    }
  };

  const handleClosePayment = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setQrisPaymentOpen(false);
    setQrisData(null);
    setPaymentStep('loading');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDemoPayment = () => {
    if (selectedPlan) {
      setPaymentStep('checking');
      setTimeout(() => {
        demoCheckoutMutation.mutate({
          planId: selectedPlan.id,
          billingInterval: isAnnual ? 'annual' : 'monthly',
        });
      }, 2000);
    }
  };

  const plans = dbPlans.map((plan: any) => ({
    ...plan,
    monthlyDisplay: plan.monthlyPrice,
    annualMonthlyDisplay: Math.round(plan.annualPrice),
  }));

  const usagePercentage = billingStatus 
    ? Math.min((billingStatus.conversationsUsed / billingStatus.conversationsLimit) * 100, 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-billing-title">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details
        </p>
      </div>

      {showSuccessMessage && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700">Subscription activated!</p>
                <p className="text-sm text-green-600">Your plan has been upgraded successfully.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showCanceledMessage && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-700">Checkout canceled</p>
                <p className="text-sm text-yellow-600">No changes were made to your subscription.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-current-plan">
                {billingStatus?.planName || 'Starter'}
              </span>
              <Badge variant={billingStatus?.status === 'trial' ? 'secondary' : 'default'} data-testid="badge-subscription-status">
                {billingStatus?.status === 'trial' ? 'Trial' : 
                 billingStatus?.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {billingStatus?.status === 'trial' && billingStatus?.trialEndsAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Trial ends {format(new Date(billingStatus.trialEndsAt), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Conversations Used</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-conversations-used">
                {billingStatus?.conversationsUsed || 0}
              </span>
              <span className="text-sm text-muted-foreground">
                / {billingStatus?.conversationsLimit === -1 ? '∞' : billingStatus?.conversationsLimit || 100}
              </span>
            </div>
            {billingStatus?.conversationsLimit !== -1 && (
              <Progress value={usagePercentage} className="mt-2 h-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Billing Cycle</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {billingStatus?.currentPeriodEnd ? (
              <>
                <p className="text-sm text-muted-foreground">Next billing date</p>
                <p className="text-lg font-semibold">
                  {format(new Date(billingStatus.currentPeriodEnd), 'MMMM d, yyyy')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active billing cycle</p>
            )}
          </CardContent>
        </Card>
      </div>

      {billingStatus?.pendingTransaction?.transactionId && (
        <Card className="border-amber-500/50 bg-amber-500/5" data-testid="card-pending-transaction">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {billingStatus.pendingTransaction.planName 
                    ? `Upgrade to ${billingStatus.pendingTransaction.planName} plan - waiting for payment`
                    : 'Pembayaran Pending'}
                </CardTitle>
              </div>
              {billingStatus.pendingTransaction.paymentMethod && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  {billingStatus.pendingTransaction.paymentMethod.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {billingStatus.pendingTransaction.amountFormatted && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nominal</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {billingStatus.pendingTransaction.amountFormatted}
                  </span>
                </div>
              )}
              {billingStatus.pendingTransaction.expiryTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Batas Waktu</span>
                  <span className="text-sm">
                    {format(new Date(billingStatus.pendingTransaction.expiryTime.replace(' ', 'T') + 'Z'), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              )}
              <div className="pt-2">
                <Button 
                  size="sm" 
                  className="w-full min-h-[44px]"
                  onClick={() => window.location.href = `/dashboard/checkout?resume=${billingStatus.pendingTransaction?.transactionId}`}
                  data-testid="button-continue-payment"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Lanjutkan Pembayaran
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">
              Choose the plan that best fits your needs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="annual-toggle" className="text-sm">Monthly</Label>
              <Switch 
                id="annual-toggle" 
                checked={isAnnual} 
                onCheckedChange={setIsAnnual}
                data-testid="switch-billing-interval"
              />
              <Label htmlFor="annual-toggle" className="text-sm flex items-center gap-1">
                Annual
                <Badge variant="secondary" className="ml-1">Save 16%</Badge>
              </Label>
            </div>
            <Button 
              onClick={() => window.location.href = `/dashboard/checkout?plan=pro&interval=${isAnnual ? 'annual' : 'monthly'}`}
              className="min-h-[44px]"
              data-testid="button-checkout"
            >
              <Zap className="w-4 h-4 mr-2" />
              Checkout
            </Button>
          </div>
        </div>

        {/* Promo Banner - Desktop: 1200x300px (4:1), Mobile: 426x182px */}
        {(applicablePromo || validatedPromo) && (() => {
          const promo = applicablePromo || validatedPromo;
          const bannerMode = (promo as any)?.bannerMode || "color";
          const hasImage = (promo as any)?.bannerImageUrl;
          const hasMobileImage = (promo as any)?.bannerImageMobileUrl;
          const showText = bannerMode === "color" || bannerMode === "overlay";
          const showImage = (bannerMode === "image" || bannerMode === "overlay") && hasImage;
          const hasCustomColor = (promo as any)?.bgColor;
          const textColor = (promo as any)?.textColor;
          const isDefaultStyle = !showImage && !hasCustomColor;
          
          return (
            <div 
              className="mb-4 rounded-lg flex flex-col items-end justify-end gap-2 relative overflow-hidden text-center w-full aspect-[426/182] md:aspect-[4/1]" 
              style={{
                ...(showImage ? {
                  color: textColor || "#ffffff"
                } : hasCustomColor ? {
                  backgroundColor: hasCustomColor,
                  color: textColor || "#ffffff"
                } : {})
              }}
              data-testid="promo-banner"
            >
              {showImage && (
                <>
                  <img 
                    src={hasImage} 
                    alt="" 
                    className={`absolute inset-0 w-full h-full object-cover rounded-lg ${hasMobileImage ? 'hidden md:block' : ''}`}
                    data-testid="promo-banner-image"
                  />
                  {hasMobileImage && (
                    <img 
                      src={(promo as any).bannerImageMobileUrl} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover rounded-lg md:hidden"
                      data-testid="promo-banner-image-mobile"
                    />
                  )}
                </>
              )}
              {bannerMode === "overlay" && showImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent rounded-lg" />
              )}
              {isDefaultStyle && (
                <div className="absolute inset-0 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg" />
              )}
              {(showText || isDefaultStyle) && (
                <div className="relative z-10 w-full pb-3 sm:pb-4 px-4 flex flex-col items-start text-left">
                  <h3 className={`flex items-center gap-2 text-lg sm:text-xl md:text-2xl font-extrabold ${isDefaultStyle ? "text-green-700 dark:text-green-400" : ""}`}>
                    <Gift className={`w-5 h-5 sm:w-6 sm:h-6 ${isDefaultStyle ? "text-green-600" : ""}`} />
                    <span>{validatedPromo ? "Promo Applied!" : promo?.name}</span>
                  </h3>
                  <p className={`text-sm sm:text-base font-medium opacity-95 ${isDefaultStyle ? "text-green-700 dark:text-green-400" : ""}`}>
                    Save {promo?.discountPercent}% with code
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className={`px-3 py-1 rounded font-mono font-bold text-sm ${isDefaultStyle ? "bg-green-100 dark:bg-green-900/30" : "bg-white/20 dark:bg-white/10"}`}>{promo?.code}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-2 ${isDefaultStyle ? "" : "bg-white/10 border-white/30 hover:bg-white/20 text-inherit"}`}
                      onClick={() => {
                        navigator.clipboard.writeText(promo?.code || "");
                        toast({ title: "Code copied!", description: `${promo?.code} copied to clipboard` });
                      }}
                      data-testid="button-copy-promo-code"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  {validatedPromo && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { setValidatedPromo(null); setPromoCodeInput(""); }}
                      className="mt-2"
                      data-testid="button-remove-promo"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Remove Code
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        
        {!validatedPromo && (
          <div className="mb-4 flex items-center gap-2 flex-wrap" data-testid="promo-input-section">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Have a promo code?</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter code"
                value={promoCodeInput}
                onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
                className="w-32 h-8 text-sm uppercase"
                data-testid="input-promo-code"
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => validatePromoCode("all")}
                disabled={isValidatingPromo || !promoCodeInput.trim()}
                data-testid="button-apply-promo"
              >
                {isValidatingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
              </Button>
            </div>
            {promoError && <span className="text-xs text-red-500">{promoError}</span>}
          </div>
        )}

        {/* Billing History Section */}
        {billingHistory.length > 0 && (
          <Collapsible open={showBillingHistory} onOpenChange={setShowBillingHistory} className="mb-6">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover-elevate py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Riwayat Pembayaran</CardTitle>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{billingHistory.length}</Badge>
                    </div>
                    {showBillingHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : (
                      billingHistory.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-muted/30 border border-border/50"
                          data-testid={`billing-transaction-${tx.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              tx.status === 'paid' ? 'bg-green-500' :
                              tx.status === 'pending' ? 'bg-amber-500' :
                              tx.status === 'expired' ? 'bg-gray-400' :
                              'bg-red-500'
                            }`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {tx.planName || 'Unknown Plan'}
                                {tx.subscriptionMonths && tx.subscriptionMonths > 1 && (
                                  <span className="text-muted-foreground"> ({tx.subscriptionMonths} bulan)</span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {tx.invoiceNumber || tx.id.slice(0, 8)}
                                {' • '}
                                {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold">{tx.amountFormatted}</p>
                            <Badge 
                              variant={tx.status === 'paid' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'} 
                              className="text-[9px] h-4 px-1.5"
                            >
                              {tx.status === 'paid' ? 'Lunas' : 
                               tx.status === 'pending' ? 'Pending' : 
                               tx.status === 'expired' ? 'Expired' :
                               tx.status === 'cancelled' ? 'Dibatalkan' : 'Gagal'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {plans.map((plan) => {
            const isCurrent = billingStatus?.planId === plan.id;
            const isPopular = plan.id === 'pro';
            const isFree = plan.id === 'free';
            const isCustom = plan.id === 'custom';
            
            const getPlanIcon = () => {
              switch (plan.id) {
                case 'free': return <Gift className="w-5 h-5 text-gray-500" />;
                case 'starter': return <Zap className="w-5 h-5 text-blue-500" />;
                case 'pro': return <Crown className="w-5 h-5 text-purple-500" />;
                case 'enterprise': return <Building2 className="w-5 h-5 text-orange-500" />;
                case 'custom': return <Sparkles className="w-5 h-5 text-pink-500" />;
                default: return null;
              }
            };
            
            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg' : ''} ${isFree ? 'bg-muted/30' : ''}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getPlanIcon()}
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div>
                    {isCustom ? (
                      <span className="text-2xl font-bold">Contact Us</span>
                    ) : isFree ? (
                      <span className="text-2xl font-bold">$0</span>
                    ) : (() => {
                      const originalPrice = isAnnual ? plan.annualMonthlyDisplay : plan.monthlyDisplay;
                      const promo = getPromoForPlan(plan.id);
                      const discountedPrice = promo ? Math.round(originalPrice * (1 - promo.discountPercent / 100)) : originalPrice;
                      const hasDiscount = promo !== null;
                      const discountPercent = promo?.discountPercent;
                      
                      return (
                        <>
                          {hasDiscount && (
                            <Badge className="bg-green-500 text-white text-xs mb-1">
                              {discountPercent}% off
                            </Badge>
                          )}
                          <div className="flex items-baseline gap-1">
                            {hasDiscount && (
                              <span className="text-lg text-muted-foreground line-through">
                                ${originalPrice}
                              </span>
                            )}
                            <span className={`text-2xl font-bold ${hasDiscount ? 'text-green-600' : ''}`}>
                              ${hasDiscount ? discountedPrice : originalPrice}
                            </span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </div>
                          {isAnnual && plan.monthlyPrice > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ${discountedPrice * 12}/yr
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  <ul className="space-y-1.5">
                    {plan.features.slice(0, 5).map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.features.length > 5 && (
                    <Collapsible
                      open={expandedPlans.has(plan.id)}
                      onOpenChange={(open) => {
                        setExpandedPlans(prev => {
                          const newSet = new Set(prev);
                          if (open) {
                            newSet.add(plan.id);
                          } else {
                            newSet.delete(plan.id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <CollapsibleContent>
                        <ul className="space-y-1.5 mt-1.5">
                          {plan.features.slice(5).map((feature: string, index: number) => (
                            <li key={index + 5} className="flex items-start gap-1.5 text-xs">
                              <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                      <CollapsibleTrigger asChild>
                        <button 
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          data-testid={`button-expand-${plan.id}`}
                        >
                          {expandedPlans.has(plan.id) ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              +{plan.features.length - 5} more features
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}

                  {(plan as any).restrictions && (plan as any).restrictions.length > 0 && (
                    <div className="pt-2 border-t">
                      <ul className="space-y-1">
                        {((plan as any).restrictions as string[]).map((restriction: string, index: number) => (
                          <li key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{restriction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2">
                  {isCustom ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm" 
                      onClick={() => {
                        const subject = encodeURIComponent("Custom Plan Inquiry");
                        const body = encodeURIComponent("Hi, I'm interested in discussing a custom plan for Chatvice.");
                        window.location.href = `mailto:sales@chatvice.app?subject=${subject}&body=${body}`;
                      }}
                      data-testid="button-contact-sales-custom"
                    >
                      Contact Sales
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="outline" disabled className="w-full" size="sm" data-testid={`button-current-plan-${plan.id}`}>
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-select-${plan.id}`}
                    >
                      Get Started
                    </Button>
                  ) : (() => {
                    const currentPlanIndex = dbPlans.findIndex((p: any) => p.id === billingStatus?.planId);
                    const selectedPlanIndex = dbPlans.findIndex((p: any) => p.id === plan.id);
                    const isDowngrade = selectedPlanIndex < currentPlanIndex;
                    return (
                      <Button 
                        className="w-full" 
                        variant={isPopular ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-${isDowngrade ? 'downgrade' : 'upgrade'}-${plan.id}`}
                      >
                        {checkoutMutation.isPending ? 'Processing...' : 
                         billingStatus?.status === 'trial' ? 'Start Plan' : (isDowngrade ? 'Downgrade' : 'Upgrade')}
                      </Button>
                    );
                  })()}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <QrCode className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Secure Payment with QRIS</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We accept payments via QRIS - scan the QR code with any Indonesian e-wallet or mobile banking app (GoPay, OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin, etc.).
                  All plans include a {trialDays}-day free trial. Start with the Starter plan and upgrade anytime as your business grows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {billingStatus?.hasActiveSubscription && (
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-red-900 dark:text-red-200">Manage Subscription</p>
                  <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                    Cancel or delete your account
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowCancelDialog(true)}
                    data-testid="button-cancel-subscription"
                  >
                    Cancel Subscription
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="button-delete-account"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={qrisPaymentOpen} onOpenChange={handleClosePayment}>
        <DialogContent className="sm:max-w-md max-h-[95vh] p-0 flex flex-col gap-0">
          {/* Checkout Confirmation Step */}
          {paymentStep === 'checkout' && selectedPlan && (
            <div className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1">
                <div className="space-y-5 p-4 sm:p-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl">Konfirmasi Checkout</DialogTitle>
                    <DialogDescription className="text-sm">
                      Review pesanan Anda sebelum melanjutkan pembayaran
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Order Details */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  {(() => {
                    const exchangeRate = (platformSettings as any)?.exchange_rate ? parseInt((platformSettings as any).exchange_rate) : 16000;
                    const priceUSD = isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0);
                    const priceIDR = Math.round(priceUSD * exchangeRate);
                    const promo = getPromoForPlan(selectedPlan.id);
                    const discountPercent = promo?.discountPercent || 0;
                    const discountAmount = Math.round(priceIDR * discountPercent / 100);
                    const finalPrice = priceIDR - discountAmount;
                    
                    let finalPaymentIDR = finalPrice;
                    if (prorationInfo?.prorationApplied && prorationInfo?.finalAmount) {
                      finalPaymentIDR = Math.round(prorationInfo.finalAmount * exchangeRate) - discountAmount;
                    }
                    
                    return (
                      <>
                        {/* Plan Name with USD Price */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-primary" />
                            <span className="font-semibold">{selectedPlan.name} Plan</span>
                          </div>
                          <span className="text-lg font-bold text-primary">${priceUSD.toFixed(2)}</span>
                        </div>
                        
                        {/* Billing Period Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/20">
                            {isAnnual ? 'Tahunan' : 'Bulanan'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Kurs: Rp {exchangeRate.toLocaleString('id-ID')}/USD
                          </span>
                        </div>
                        
                        {/* Price Breakdown */}
                        <div className="space-y-2 pt-2 border-t border-primary/10">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Harga {isAnnual ? 'Tahunan' : 'Bulanan'}</span>
                            <span>Rp {priceIDR.toLocaleString('id-ID')}</span>
                          </div>
                          {discountPercent > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Diskon ({discountPercent}%)</span>
                              <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                            </div>
                          )}
                          {prorationInfo?.prorationApplied && prorationInfo?.creditAmount && (
                            <div className="flex justify-between text-sm text-blue-600">
                              <span>Kredit dari plan sebelumnya</span>
                              <span>- Rp {Math.round(prorationInfo.creditAmount * exchangeRate).toLocaleString('id-ID')}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-primary/10">
                            <span className="font-semibold">Total Pembayaran</span>
                            <span className="text-2xl font-bold text-primary">
                              Rp {finalPaymentIDR.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Plan Features */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Fitur yang Didapat
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{selectedPlan.conversationsLimit?.toLocaleString() || 'Unlimited'} percakapan/bulan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{selectedPlan.supervisorsLimit || 'Unlimited'} supervisor</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{selectedPlan.agentsLimit || 'Unlimited'} AI agent</span>
                    </li>
                    {selectedPlan.features?.slice(0, 3).map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Terms & Conditions */}
                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="w-4 h-4" />
                    Syarat & Ketentuan
                  </h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                    <li>• Pembayaran bersifat non-refundable setelah aktivasi</li>
                    <li>• Langganan akan otomatis diperpanjang setiap periode</li>
                    <li>• Anda dapat membatalkan langganan kapan saja</li>
                    <li>• Upgrade berlaku segera setelah pembayaran berhasil</li>
                    <li>• Harga dapat berubah dengan pemberitahuan 30 hari</li>
                  </ul>
                </div>

                {/* Terms Acceptance */}
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    data-testid="checkbox-terms"
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    Saya menyetujui <span className="text-primary font-medium">Syarat & Ketentuan</span> serta memahami bahwa pembayaran akan diproses setelah konfirmasi
                  </label>
                </div>
              </div>
              </ScrollArea>

              {/* Action Buttons - Always Visible at Bottom */}
              <div className="flex gap-3 p-4 sm:p-6 border-t bg-background shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClosePayment}
                  data-testid="button-cancel-checkout"
                >
                  Batal
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleProceedToPayment}
                  disabled={!termsAccepted || checkoutMutation.isPending}
                  data-testid="button-proceed-payment"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Lanjutkan Bayar
                </Button>
              </div>
            </div>
          )}

          {paymentStep === 'loading' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <div>
                <p className="font-medium">Preparing payment...</p>
                <p className="text-sm text-muted-foreground">Please wait while we generate your QR code</p>
              </div>
            </div>
          )}

          {paymentStep === 'qris' && qrisData && (
            <ScrollArea className="flex-1 max-h-[80vh]">
              <div className="space-y-5 pr-4">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl">Scan & Bayar</DialogTitle>
                    <DialogDescription className="text-sm">
                      Scan kode QR dengan aplikasi e-wallet atau mobile banking
                    </DialogDescription>
                  </DialogHeader>
                </div>
                
                {/* Plan Info Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{qrisData.planName}</span>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/20">
                      {qrisData.billingInterval === 'annual' ? 'Tahunan' : 'Bulanan'}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">Rp {(qrisData.amount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  {qrisData.amountUSD && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${qrisData.amountUSD?.toFixed(2)} USD
                    </p>
                  )}
                </div>

                {/* QR Code */}
                <div className="relative">
                  <div className="flex justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-muted-foreground/20">
                    {qrisData.qrisImageUrl ? (
                      <img 
                        src={qrisData.qrisImageUrl} 
                        alt="QRIS Payment Code" 
                        className="w-44 h-44 object-contain"
                        data-testid="img-qris-code"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-muted rounded-xl">
                        <QrCode className="w-20 h-20 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Timer Badge */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white rounded-full text-sm font-medium shadow-lg">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleSaveQRIS}
                    data-testid="button-save-qris"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Simpan
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleDemoPayment}
                    data-testid="button-demo-pay"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Demo Pay
                  </Button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="relative">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping absolute" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full relative" />
                  </div>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Menunggu pembayaran...
                  </span>
                </div>

                {/* Supported Apps */}
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    GoPay • OVO • DANA • ShopeePay • LinkAja • BCA • Mandiri • BRI • BNI
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}

          {paymentStep === 'checking' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <div>
                <p className="font-medium">Processing payment...</p>
                <p className="text-sm text-muted-foreground">Please wait while we verify your payment</p>
              </div>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
              <div>
                <p className="font-medium text-green-700">Payment successful!</p>
                <p className="text-sm text-muted-foreground">Your subscription is now active</p>
              </div>
            </div>
          )}

          {paymentStep === 'expired' && (
            <div className="py-12 text-center space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <div>
                <p className="font-medium text-red-700">QR Code Expired</p>
                <p className="text-sm text-muted-foreground">The payment session has expired</p>
              </div>
              <Button onClick={handleRetryPayment} data-testid="button-retry-payment">
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate New QR Code
              </Button>
            </div>
          )}

          {paymentStep === 'error' && (
            <div className="py-12 text-center space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <div>
                <p className="font-medium text-red-700">Payment Error</p>
                <p className="text-sm text-muted-foreground">Failed to create payment. Please try again.</p>
              </div>
              <Button onClick={handleRetryPayment} data-testid="button-retry-payment">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Anda yakin ingin membatalkan langganan? Anda masih dapat mengakses layanan hingga akhir periode.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelSubscriptionMutation.isPending ? "Canceling..." : "Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Anda akan kehilangan: semua chat sessions, supervisors, knowledge base, dan pengaturan.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>
              Keep Account
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
