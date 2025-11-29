import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Check, Zap, Users, MessageSquare, Crown, AlertTriangle, ArrowUpRight, Calendar, Clock, Settings } from "lucide-react";
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

export default function BillingPage() {
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const canceled = urlParams.get('canceled');

  const { data: billingStatus, isLoading } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval }: { planId: string; billingInterval: string }) => {
      return apiRequest("POST", "/api/billing/checkout", { planId, billingInterval }) as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/billing/portal", {}) as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Portal error",
        description: error.message || "Failed to open billing portal.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    checkoutMutation.mutate({ 
      planId, 
      billingInterval: isAnnual ? 'annual' : 'monthly' 
    });
  };

  const handleManageBilling = () => {
    portalMutation.mutate();
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

      {success && (
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

      {canceled && (
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

      {billingStatus?.hasActiveSubscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <CardTitle>Manage Subscription</CardTitle>
              </div>
              <Button 
                onClick={handleManageBilling}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {portalMutation.isPending ? 'Opening...' : 'Billing Portal'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update payment methods, view invoices, or cancel your subscription through the billing portal.
            </p>
          </CardContent>
        </Card>
      )}

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = billingStatus?.planId === plan.id;
            const isPopular = plan.id === 'pro';
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.id === 'starter' && <Zap className="w-5 h-5 text-blue-500" />}
                    {plan.id === 'pro' && <Crown className="w-5 h-5 text-purple-500" />}
                    {plan.id === 'enterprise' && <Users className="w-5 h-5 text-orange-500" />}
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {plan.name === 'Enterprise' ? (
                      <span className="text-3xl font-bold">Custom</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          ${isAnnual ? plan.annualMonthlyDisplay : plan.monthlyDisplay}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                        {isAnnual && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Billed annually (${plan.annualPrice * 12}/year)
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {plan.id === 'enterprise' ? (
                    <Button variant="outline" className="w-full" data-testid="button-contact-sales">
                      Contact Sales
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="outline" disabled className="w-full" data-testid={`button-current-plan-${plan.id}`}>
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={isPopular ? 'default' : 'outline'}
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
            <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Need help choosing?</p>
              <p className="text-sm text-muted-foreground mt-1">
                All plans include a 7-day free trial. Start with the Starter plan and upgrade anytime as your business grows.
                Enterprise plans include custom integrations, dedicated support, and SLA guarantees.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
