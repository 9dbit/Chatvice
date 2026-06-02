import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calculator, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomPlanRequestDialog } from "@/components/custom-plan-request-dialog";
import CheckoutPage from "./checkout";

interface CustomPlanInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  billingInterval: string;
  status: string;
  conversationsLimit: number;
  agentsLimit: number;
  supervisorsLimit: number;
  sourcesLimit: number;
  paymentMethod?: string;
}

export default function EnterpriseCheckoutGate() {
  const [, navigate] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get("plan");
  const resumeTransactionId = urlParams.get("resume");
  const invoiceId = urlParams.get("invoiceId");
  const addonType = urlParams.get("addon");

  const shouldShowEnterpriseEntry =
    planId === "custom" &&
    !resumeTransactionId &&
    !invoiceId &&
    !addonType;

  const { data: pendingInvoices = [], isLoading: invoicesLoading } = useQuery<CustomPlanInvoice[]>({
    queryKey: ["/api/merchant/custom-invoices/pending"],
    enabled: shouldShowEnterpriseEntry,
  });

  if (!shouldShowEnterpriseEntry) {
    return <CheckoutPage />;
  }

  if (invoicesLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingInvoices.length > 0) {
    return <CheckoutPage />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4" data-testid="enterprise-checkout-entry">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard/plans")}
        className="gap-2"
        data-testid="button-back-to-plans"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Plans
      </Button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center dark:bg-purple-950 dark:text-purple-300">
          <Crown className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Enterprise Plan</h1>
          <p className="text-sm text-muted-foreground">
            Configure your Enterprise subscription based on your team capacity.
          </p>
        </div>
      </div>

      <Card className="border-purple-200/70 dark:border-purple-900/60">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Enterprise is configured with a custom plan calculator.</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose your conversation volume, agents, supervisors, and billing interval. After you submit the configuration, Chatvice will create the Enterprise invoice and send you to Billing to complete payment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <CustomPlanRequestDialog
              trigger={
                <Button className="gap-2" data-testid="button-configure-enterprise-plan">
                  <Calculator className="w-4 h-4" />
                  Configure Enterprise Plan
                </Button>
              }
            />
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/billing")}
              data-testid="button-view-billing"
            >
              View Billing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
