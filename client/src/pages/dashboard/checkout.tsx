import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ArrowRight, 
  Crown, 
  Loader2,
  Smartphone,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Info
} from "lucide-react";

interface QRISPaymentResponse {
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  qrisString: string;
  qrisImage: string;
  amount: number;
  amountUSD?: number;
  expiryTime: string;
  planId: string;
  planName: string;
  billingInterval: string;
}

interface BillingStatus {
  currentPlan: string;
  planId: string;
  status: string;
  periodEnd?: string;
  conversationsUsed: number;
  conversationsLimit: number;
  supervisorsUsed: number;
  supervisorsLimit: number;
  agentsUsed: number;
  agentsLimit: number;
  subscriptionId?: string;
}

interface ProrationInfo {
  creditAmount: number;
  newPlanPrice: number;
  finalAmount: number;
  daysRemaining: number;
  prorationApplied: boolean;
}

interface ActivePromotion {
  code: string;
  discountPercent: number;
  billingCycle: string;
  targetPlans: string[];
}

type PaymentStep = 'checkout' | 'loading' | 'qris' | 'success' | 'failed' | 'expired';

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get('plan');
  const billingInterval = urlParams.get('interval') || 'monthly';
  const promoCode = urlParams.get('promo') || '';
  
  const isAnnual = billingInterval === 'annual';
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('checkout');
  const [qrisData, setQrisData] = useState<QRISPaymentResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [prorationInfo, setProrationInfo] = useState<ProrationInfo | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  const { data: dbPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  const { data: activePromos = [] } = useQuery<ActivePromotion[]>({
    queryKey: ["/api/promotions/active"],
  });

  const selectedPlan = dbPlans.find((p: any) => p.id === planId);
  
  const currentBillingCycle = isAnnual ? "annual" : "monthly";
  const applicablePromo = activePromos.find(p => 
    p.billingCycle === "both" || p.billingCycle === currentBillingCycle
  );

  const getPromoForPlan = (planId: string): { discountPercent: number; code: string } | null => {
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

  useEffect(() => {
    if (planId && billingStatus?.status === 'active') {
      const fetchProration = async () => {
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
      };
      fetchProration();
    }
  }, [planId, billingStatus, isAnnual]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval, promoCode }: { planId: string; billingInterval: string; promoCode?: string }) => {
      return apiRequest("POST", "/api/billing/checkout", { planId, billingInterval, promoCode }) as unknown as Promise<QRISPaymentResponse>;
    },
    onSuccess: (data) => {
      setQrisData(data);
      setPaymentStep('qris');
      
      const expiryTimeStr = data.expiryTime?.replace(' ', 'T') + 'Z';
      const expiryTime = new Date(expiryTimeStr).getTime();
      const now = Date.now();
      
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
            } else if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
              setPaymentStep('failed');
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            }
          }
        } catch (err) {
          console.error("Error polling payment status:", err);
        }
      }, 3000);
    },
    onError: (error: Error) => {
      setPaymentStep('checkout');
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProceedToPayment = () => {
    if (!selectedPlan || !termsAccepted) return;
    
    setPaymentStep('loading');
    checkoutMutation.mutate({
      planId: selectedPlan.id,
      billingInterval: isAnnual ? 'annual' : 'monthly',
      promoCode: promoCode || undefined,
    });
  };

  const handleRetryPayment = () => {
    setPaymentStep('checkout');
    setQrisData(null);
    setTimeRemaining(0);
  };

  const handleSaveQRIS = () => {
    if (!qrisData?.qrisImage) return;
    const link = document.createElement('a');
    link.href = qrisData.qrisImage;
    link.download = `qris-${qrisData.orderId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDemoPayment = async () => {
    if (!qrisData) return;
    try {
      const response = await fetch('/api/billing/demo-payment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: qrisData.transactionId }),
      });
      if (response.ok) {
        toast({ title: "Demo payment triggered", description: "Simulating payment success..." });
      }
    } catch (err) {
      console.error("Demo payment error:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!planId || !selectedPlan) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-lg font-semibold">Plan Tidak Ditemukan</h2>
            <p className="text-xs text-muted-foreground">Silakan pilih plan dari halaman billing.</p>
            <Button size="sm" onClick={() => navigate('/dashboard/plans')}>
              <ArrowLeft className="w-3 h-3 mr-1" />
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exchangeRate = (platformSettings as any)?.exchange_rate ? parseInt((platformSettings as any).exchange_rate) : 16000;
  const priceUSD = isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0);
  const priceIDR = Math.round(priceUSD * exchangeRate);
  const promo = getPromoForPlan(selectedPlan.id);
  const discountPercent = promo?.discountPercent || 0;
  const discountAmount = Math.round(priceIDR * discountPercent / 100);
  
  const creditAmountIDR = prorationInfo?.prorationApplied && prorationInfo?.creditAmount 
    ? Math.round(prorationInfo.creditAmount * exchangeRate) 
    : 0;
  
  const finalPrice = Math.max(0, priceIDR - discountAmount - creditAmountIDR);

  return (
    <div className="max-w-md mx-auto py-4 px-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard/plans')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold">Konfirmasi Pembayaran</h1>
      </div>

      {paymentStep === 'checkout' && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{selectedPlan.name}</h2>
                <p className="text-xs text-muted-foreground">Chatvice</p>
              </div>
            </div>
            
            <div className="mx-4 mb-4 rounded-lg bg-primary/5 border border-primary/10 overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Mulai hari ini</p>
                  <p className="text-sm font-semibold">Rp {finalPrice.toLocaleString('id-ID')}/{isAnnual ? 'tahun' : 'bulan'}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {isAnnual ? 'Tahunan' : 'Bulanan'}
                </Badge>
              </div>
              
              {(discountPercent > 0 || creditAmountIDR > 0) && (
                <div className="px-3 pb-3 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Harga normal</span>
                    <span>Rp {priceIDR.toLocaleString('id-ID')}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-[11px] text-green-600">
                      <span>Diskon promo ({discountPercent}%)</span>
                      <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {creditAmountIDR > 0 && (
                    <div className="flex justify-between text-[11px] text-blue-600">
                      <span>Kredit dari plan sebelumnya</span>
                      <span>- Rp {creditAmountIDR.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Batalkan kapan saja melalui dashboard Chatvice
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Anda akan menerima reminder 7 hari sebelum pembaruan
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Upgrade berlaku segera setelah pembayaran berhasil
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">QRIS Payment</p>
                <p className="text-[10px] text-muted-foreground">Kompas Pay • All e-wallets & banks</p>
              </div>
            </div>
          </Card>

          <div className="text-[10px] text-muted-foreground px-1 space-y-2">
            <p>
              By subscribing, you agree that your subscription automatically renews until canceled. 
              We'll notify you if price changes, as described in the{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.{' '}
              <a href="/terms#cancel" className="text-primary hover:underline">Learn how to cancel</a>.
            </p>
            <p>
              Currency fluctuations and bank fees may affect the final amount charged to you.
            </p>
            <p className="text-muted-foreground/70">
              Exchange rate: Rp {exchangeRate.toLocaleString('id-ID')}/USD • ${priceUSD.toFixed(2)} USD
            </p>
          </div>

          <div className="flex items-start gap-2 px-1 py-2">
            <Checkbox 
              id="terms" 
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-terms"
            />
            <label htmlFor="terms" className="text-[11px] text-muted-foreground cursor-pointer">
              I agree to the Terms of Service and understand that payment will be processed upon confirmation
            </label>
          </div>

          <Button 
            className="w-full"
            size="lg"
            onClick={handleProceedToPayment}
            disabled={!termsAccepted || checkoutMutation.isPending}
            data-testid="button-proceed-payment"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Subscribe • Rp {finalPrice.toLocaleString('id-ID')}
          </Button>
        </div>
      )}

      {paymentStep === 'loading' && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Processing payment...</p>
              <p className="text-xs text-muted-foreground">Please wait while we generate your QR code</p>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'qris' && qrisData && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Scan & Pay</h3>
                <p className="text-[11px] text-muted-foreground">
                  Scan QR code with your e-wallet or mobile banking app
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{qrisData.planName}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
                  </Badge>
                </div>
                <div className="text-lg font-bold">Rp {(qrisData.amount || 0).toLocaleString('id-ID')}</div>
                {qrisData.amountUSD && (
                  <p className="text-[10px] text-muted-foreground">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                )}
              </div>

              <div className="flex justify-center p-3 bg-white rounded-lg">
                <img 
                  src={qrisData.qrisImage} 
                  alt="QRIS Payment Code" 
                  className="w-40 h-40 object-contain"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-sm font-medium">{formatTime(timeRemaining)}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleSaveQRIS}>
                  <Download className="w-3 h-3 mr-1" />
                  Save QR
                </Button>
                {import.meta.env.DEV && (
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleDemoPayment}>
                    Demo Pay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-[10px] text-muted-foreground">
            Waiting for payment... Status will update automatically after successful payment
          </p>
        </div>
      )}

      {paymentStep === 'success' && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-green-700 dark:text-green-400">Payment Successful!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Thank you! Your {qrisData?.planName} plan is now active.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/dashboard/plans')}>
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'failed' && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Payment Failed</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Sorry, your payment could not be processed. Please try again.
              </p>
            </div>
            <Button size="sm" onClick={handleRetryPayment}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'expired' && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-amber-700 dark:text-amber-400">QR Code Expired</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Payment time has expired. Please create a new transaction.
              </p>
            </div>
            <Button size="sm" onClick={handleRetryPayment}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Create New Transaction
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
