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
import { Check, Zap, Users, MessageSquare, Crown, AlertTriangle, ArrowUpRight, Calendar, Clock, Lock, Loader2, CheckCircle2, Sparkles, Gift, Building2, ChevronDown, ChevronUp, QrCode, Timer, RefreshCw, Copy, XCircle } from "lucide-react";
import { format } from "date-fns";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

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

export default function BillingPage() {
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [qrisPaymentOpen, setQrisPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof subscriptionPlans[keyof typeof subscriptionPlans] | null>(null);
  const [paymentStep, setPaymentStep] = useState<'loading' | 'qris' | 'checking' | 'success' | 'expired' | 'error'>('loading');
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
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: billingStatus, isLoading, refetch } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });

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

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval }: { planId: string; billingInterval: string }) => {
      return apiRequest("POST", "/api/billing/checkout", { planId, billingInterval }) as Promise<QRISPaymentResponse>;
    },
    onSuccess: (data) => {
      setQrisData(data);
      setPaymentStep('qris');
      
      const expiryTime = new Date(data.expiryTime).getTime();
      const now = Date.now();
      setTimeRemaining(Math.max(0, Math.floor((expiryTime - now) / 1000)));
      
      countdownIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
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
    const plan = Object.values(subscriptionPlans).find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setQrisPaymentOpen(true);
      setPaymentStep('loading');
      setQrisData(null);
      setProrationInfo(null);
      
      if (billingStatus?.status === 'active') {
        try {
          const response = await fetch(`/api/billing/proration?planId=${planId}&billingInterval=${isAnnual ? 'annual' : 'monthly'}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setProrationInfo(data);
          }
        } catch (err) {
          console.error("Failed to fetch proration info:", err);
        }
      }
      
      checkoutMutation.mutate({
        planId,
        billingInterval: isAnnual ? 'annual' : 'monthly',
      });
    }
  };

  const handleCopyQRIS = () => {
    if (qrisData?.qrisString) {
      navigator.clipboard.writeText(qrisData.qrisString);
      toast({
        title: "Copied!",
        description: "QRIS code copied to clipboard",
      });
    }
  };

  const handleRetryPayment = () => {
    if (selectedPlan) {
      setPaymentStep('loading');
      checkoutMutation.mutate({
        planId: selectedPlan.id,
        billingInterval: isAnnual ? 'annual' : 'monthly',
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

  const plans = Object.entries(subscriptionPlans).map(([_, plan]) => ({
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

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">
              Choose the plan that best fits your needs
            </p>
          </div>
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
        </div>

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
                    ) : (
                      <>
                        <span className="text-2xl font-bold">
                          ${isAnnual ? plan.annualMonthlyDisplay : plan.monthlyDisplay}
                        </span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                        {isAnnual && plan.monthlyPrice > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ${plan.annualPrice * 12}/yr
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-1.5">
                    {plan.features.slice(0, 5).map((feature, index) => (
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
                          {plan.features.slice(5).map((feature, index) => (
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
                    <Button variant="outline" className="w-full" size="sm" data-testid="button-contact-sales-custom">
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
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={isPopular ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-upgrade-${plan.id}`}
                    >
                      {checkoutMutation.isPending ? 'Processing...' : 
                       billingStatus?.status === 'trial' ? 'Start Plan' : 'Upgrade'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <QrCode className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Secure Payment with QRIS</p>
              <p className="text-sm text-muted-foreground mt-1">
                We accept payments via QRIS - scan the QR code with any Indonesian e-wallet or mobile banking app (GoPay, OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin, etc.).
                All plans include a 7-day free trial. Start with the Starter plan and upgrade anytime as your business grows.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={qrisPaymentOpen} onOpenChange={handleClosePayment}>
        <DialogContent className="sm:max-w-md">
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
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Scan to Pay
                </DialogTitle>
                <DialogDescription>
                  Scan this QR code with any e-wallet or mobile banking app
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{qrisData.planName} Plan</span>
                    <Badge variant="secondary">{qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{qrisData.amountFormatted}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ${qrisData.amountUSD} USD
                  </p>
                </div>

                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  {qrisData.qrisImageUrl ? (
                    <img 
                      src={qrisData.qrisImageUrl} 
                      alt="QRIS Payment Code" 
                      className="w-48 h-48 object-contain"
                      data-testid="img-qris-code"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-muted rounded">
                      <QrCode className="w-24 h-24 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <Timer className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    Time remaining: {formatTime(timeRemaining)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCopyQRIS}
                    data-testid="button-copy-qris"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy QRIS
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleDemoPayment}
                    data-testid="button-demo-pay"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Demo Pay
                  </Button>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-700">
                    Waiting for payment confirmation...
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Supported: GoPay, OVO, DANA, ShopeePay, LinkAja, BCA Mobile, Mandiri Livin, BRI Mobile, BNI Mobile
                  </p>
                </div>
              </div>
            </>
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
    </div>
  );
}
