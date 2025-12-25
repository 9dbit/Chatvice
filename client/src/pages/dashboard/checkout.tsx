import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Info,
  Building2,
  Wallet,
  Link2,
  QrCode,
  Copy,
  Bitcoin
} from "lucide-react";

type PaymentMethod = 'qris' | 'bank_transfer' | 'virtual_account' | 'ewallet' | 'payment_link' | 'credit_card' | 'crypto';

interface ExchangeRateData {
  rate: number;
  source: string;
  lastUpdated: string;
  currency: string;
  baseCurrency: string;
}

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: any;
  available: boolean;
  provider: string;
}

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

interface VAPaymentResponse {
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  vaNumber: string;
  bankCode: string;
  amount: number;
  amountUSD?: number;
  expiryTime: string;
  planName: string;
  billingInterval: string;
}

interface BillingStatus {
  currentPlan: string;
  planId: string;
  status: string;
  periodEnd?: string;
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

type PaymentStep = 'select_method' | 'bank_form' | 'loading' | 'qris' | 'va' | 'bank_transfer' | 'success' | 'failed' | 'expired';

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'qris', name: 'QRIS', description: 'All e-wallets & mobile banking', icon: QrCode, available: true, provider: 'Kompas Pay' },
  { id: 'virtual_account', name: 'Virtual Account', description: 'Automatic verification', icon: CreditCard, available: true, provider: 'Kompas Pay' },
  { id: 'bank_transfer', name: 'Bank Transfer', description: 'Coming soon', icon: Building2, available: false, provider: 'Kompas Pay' },
  { id: 'ewallet', name: 'E-Wallet', description: 'Use QRIS for e-wallets', icon: Wallet, available: false, provider: 'Kompas Pay' },
  { id: 'payment_link', name: 'Payment Link', description: 'Coming soon', icon: Link2, available: false, provider: 'Kompas Pay' },
  { id: 'credit_card', name: 'Credit Card', description: 'Coming soon via PayPal', icon: CreditCard, available: false, provider: 'PayPal' },
  { id: 'crypto', name: 'Cryptocurrency', description: 'Coming soon', icon: Bitcoin, available: false, provider: 'Future' },
];

const BANKS = [
  { code: '014', name: 'Bank Central Asia (BCA)' },
  { code: '002', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: '008', name: 'Bank Mandiri' },
  { code: '009', name: 'Bank Negara Indonesia (BNI)' },
  { code: '022', name: 'CIMB Niaga' },
];

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get('plan');
  const billingInterval = urlParams.get('interval') || 'monthly';
  const promoCode = urlParams.get('promo') || '';
  
  const isAnnual = billingInterval === 'annual';
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('qris');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('select_method');
  const [qrisData, setQrisData] = useState<QRISPaymentResponse | null>(null);
  const [vaData, setVaData] = useState<VAPaymentResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [prorationInfo, setProrationInfo] = useState<ProrationInfo | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: billingStatus, isLoading: billingLoading } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });
  
  const { data: exchangeRateData, isLoading: exchangeLoading } = useQuery<ExchangeRateData>({
    queryKey: ["/api/exchange-rate"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  const { data: dbPlans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  const { data: activePromos = [] } = useQuery<ActivePromotion[]>({
    queryKey: ["/api/promotions/active"],
  });
  
  const isInitialLoading = billingLoading || exchangeLoading || plansLoading;

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
    mutationFn: async (params: { planId: string; billingInterval: string; paymentMethod: PaymentMethod; bankCode?: string; senderName?: string; senderBank?: string; promoCode?: string }) => {
      const response = await apiRequest("POST", "/api/billing/checkout-v2", params);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.paymentMethod === 'qris') {
        setQrisData(data);
        setPaymentStep('qris');
        startPaymentPolling(data.transactionId, data.expiryTime);
      } else if (data.paymentMethod === 'virtual_account') {
        setVaData(data);
        setPaymentStep('va');
        startPaymentPolling(data.transactionId, data.expiryTime);
      } else if (data.paymentMethod === 'bank_transfer') {
        setPaymentStep('bank_transfer');
      } else if (data.paymentMethod === 'ewallet' || data.paymentMethod === 'payment_link') {
        if (data.redirectUrl || data.paymentUrl) {
          window.open(data.redirectUrl || data.paymentUrl, '_blank');
        }
      } else if (data.paymentMethod === 'credit_card') {
        toast({ title: "PayPal integration", description: "Credit card payment via PayPal coming soon" });
      }
    },
    onError: (error: Error) => {
      setPaymentStep('select_method');
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startPaymentPolling = (transactionId: string, expiryTime: string) => {
    const expiryTimeStr = expiryTime?.replace(' ', 'T') + 'Z';
    const expiryTimeMs = new Date(expiryTimeStr).getTime();
    const now = Date.now();
    
    const initialRemaining = isNaN(expiryTimeMs) ? 300 : Math.max(0, Math.floor((expiryTimeMs - now) / 1000));
    setTimeRemaining(initialRemaining);
    
    countdownIntervalRef.current = setInterval(() => {
      const remaining = isNaN(expiryTimeMs) 
        ? Math.max(0, initialRemaining - Math.floor((Date.now() - now) / 1000))
        : Math.max(0, Math.floor((expiryTimeMs - Date.now()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        setPaymentStep('expired');
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/billing/payment-status/${transactionId}`, {
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
  };

  const handleProceedToPayment = () => {
    if (!selectedPlan || !termsAccepted) return;
    
    if (selectedPaymentMethod === 'virtual_account' && !selectedBank) {
      toast({ title: "Error", description: "Please select a bank", variant: "destructive" });
      return;
    }
    
    setPaymentStep('loading');
    checkoutMutation.mutate({
      planId: selectedPlan.id,
      billingInterval: isAnnual ? 'annual' : 'monthly',
      paymentMethod: selectedPaymentMethod,
      bankCode: selectedBank || undefined,
      promoCode: promoCode || undefined,
    });
  };

  const handleRetryPayment = () => {
    setPaymentStep('select_method');
    setQrisData(null);
    setVaData(null);
    setTimeRemaining(0);
  };

  const handleSaveQRIS = async () => {
    if (!qrisData?.qrisImage) return;
    
    try {
      const response = await fetch(qrisData.qrisImage);
      const blob = await response.blob();
      
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
          resolve();
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
      
      canvas.toBlob((jpegBlob) => {
        if (jpegBlob) {
          const url = URL.createObjectURL(jpegBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qris-chatvice-${qrisData.orderId}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({
            title: "QRIS Tersimpan!",
            description: "Gambar QRIS berhasil disimpan ke perangkat Anda",
          });
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      const link = document.createElement('a');
      link.href = qrisData.qrisImage;
      link.download = `qris-chatvice-${qrisData.orderId}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "QRIS",
        description: "Gambar QRIS dibuka di tab baru",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

  const handleDemoPayment = async () => {
    const transactionId = qrisData?.transactionId || vaData?.transactionId;
    if (!transactionId) return;
    try {
      const response = await fetch('/api/billing/demo-payment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ 
          title: "Payment Successful!", 
          description: "Your subscription has been activated." 
        });
        // Clear cache and redirect to billing
        queryClient.invalidateQueries({ queryKey: ['/api/merchant/current'] });
        queryClient.invalidateQueries({ queryKey: ['/api/billing'] });
        setTimeout(() => {
          navigate('/dashboard/billing');
        }, 1500);
      } else {
        toast({ 
          title: "Demo payment triggered", 
          description: data.message || "Processing..." 
        });
      }
    } catch (err) {
      console.error("Demo payment error:", err);
      toast({ title: "Error", description: "Failed to process demo payment", variant: "destructive" });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isInitialLoading) {
    return (
      <div className="max-w-md mx-auto py-4 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard/plans')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-semibold">Checkout</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-12 w-full bg-muted animate-pulse rounded mt-4" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!planId || !selectedPlan) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-base font-semibold">Plan Not Found</h2>
            <p className="text-[11px] text-muted-foreground">Please select a plan from the billing page.</p>
            <Button size="sm" onClick={() => navigate('/dashboard/plans')}>
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exchangeRate = exchangeRateData?.rate || 16500;
  const exchangeSource = exchangeRateData?.source || "Default";
  const priceUSD = isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0);
  const priceIDR = Math.round(priceUSD * exchangeRate);
  const promo = getPromoForPlan(selectedPlan.id);
  const discountPercent = promo?.discountPercent || 0;
  const discountAmount = Math.round(priceIDR * discountPercent / 100);
  
  const creditAmountIDR = prorationInfo?.prorationApplied && prorationInfo?.creditAmount 
    ? Math.round(prorationInfo.creditAmount * exchangeRate) 
    : 0;
  
  const finalPrice = Math.max(0, priceIDR - discountAmount - creditAmountIDR);

  const needsBankSelection = selectedPaymentMethod === 'virtual_account';

  return (
    <div className="max-w-md mx-auto py-4 px-4 space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard/plans')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-semibold">Checkout</h1>
      </div>

      {(paymentStep === 'select_method' || paymentStep === 'bank_form') && (
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xs font-semibold">{selectedPlan.name}</h2>
                <p className="text-[10px] text-muted-foreground">Chatvice Subscription</p>
              </div>
            </div>
            
            <div className="mx-3 mb-3 rounded-md bg-primary/5 border border-primary/10 overflow-hidden">
              <div className="p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">Starting today</p>
                  <p className="text-xs font-semibold">Rp {finalPrice.toLocaleString('id-ID')}/{isAnnual ? 'year' : 'month'}</p>
                </div>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {isAnnual ? 'Annual' : 'Monthly'}
                </Badge>
              </div>
              
              {(discountPercent > 0 || creditAmountIDR > 0) && (
                <div className="px-2.5 pb-2.5 space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Normal price</span>
                    <span>Rp {priceIDR.toLocaleString('id-ID')}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-[10px] text-green-600">
                      <span>Promo discount ({discountPercent}%)</span>
                      <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {creditAmountIDR > 0 && (
                    <div className="flex justify-between text-[10px] text-blue-600">
                      <span>Credit from previous plan</span>
                      <span>- Rp {creditAmountIDR.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-3">
              <h3 className="text-[11px] font-medium mb-2">Payment Method</h3>
              <div className="space-y-1.5">
                {PAYMENT_METHODS.filter(m => m.available).map((method) => (
                  <div
                    key={method.id}
                    className={`p-2 rounded-md border cursor-pointer transition-all ${
                      selectedPaymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <method.icon className={`w-4 h-4 ${selectedPaymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium">{method.name}</p>
                        <p className="text-[9px] text-muted-foreground">{method.description}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground">{method.provider}</span>
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 mt-2 border-t border-border/50">
                  <p className="text-[9px] text-muted-foreground mb-1.5">Coming Soon</p>
                  {PAYMENT_METHODS.filter(m => !m.available).map((method) => (
                    <div
                      key={method.id}
                      className="p-2 rounded-md border border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <method.icon className="w-4 h-4 text-muted-foreground/50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-muted-foreground/70">{method.name}</p>
                          <p className="text-[9px] text-muted-foreground/50">{method.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[8px] h-4 px-1.5 opacity-60">Soon</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {needsBankSelection && (
            <Card>
              <div className="p-3 space-y-2.5">
                <h3 className="text-[11px] font-medium">Select Bank</h3>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-bank">
                    <SelectValue placeholder="Select bank for Virtual Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code} className="text-xs">
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}

          <div className="text-[9px] text-muted-foreground px-1 space-y-1">
            <p>
              By subscribing, you agree that your subscription automatically renews until canceled. 
              We'll notify you if price changes, as described in the{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.{' '}
              <a href="/terms#cancel" className="text-primary hover:underline">Learn how to cancel</a>.
            </p>
            <p>
              Currency fluctuations and bank fees may affect the final amount charged to you.
            </p>
            <div className="flex items-center gap-1 text-muted-foreground/80 pt-0.5">
              <Info className="w-2.5 h-2.5" />
              <span>Rate: Rp {exchangeRate.toLocaleString('id-ID')}/USD • {exchangeSource}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 px-1 py-1.5">
            <Checkbox 
              id="terms" 
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-terms"
            />
            <label htmlFor="terms" className="text-[10px] text-muted-foreground cursor-pointer">
              I agree to the Terms of Service and understand that payment will be processed upon confirmation
            </label>
          </div>

          <Button 
            className="w-full h-10"
            onClick={handleProceedToPayment}
            disabled={!termsAccepted || checkoutMutation.isPending || (needsBankSelection && !selectedBank)}
            data-testid="button-proceed-payment"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            <span className="text-xs">Subscribe • Rp {finalPrice.toLocaleString('id-ID')}</span>
          </Button>
        </div>
      )}

      {paymentStep === 'loading' && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-xs font-medium">Processing payment...</p>
              <p className="text-[10px] text-muted-foreground">Please wait while we prepare your payment</p>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'qris' && qrisData && (
        <div className="space-y-3 bg-card">
          <div className="relative bg-card" id="qris-receipt">
            <svg className="absolute -top-3 left-0 w-full h-3" viewBox="0 0 400 12" preserveAspectRatio="none">
              <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0 L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12 L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0 L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L350,0 L360,12 L370,0 L380,12 L390,0 L400,12" 
                    className="fill-card drop-shadow-sm" />
            </svg>
            
            <Card className="rounded-t-none border-t-0 shadow-lg">
              <CardContent className="pt-4 pb-4 text-center space-y-3">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight">PEMBAYARAN QRIS</h3>
                  <p className="text-[9px] text-muted-foreground">Scan dengan e-wallet atau mobile banking</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px border-t-2 border-dashed border-muted-foreground/30"></div>
                  <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Detail</span>
                  <div className="flex-1 h-px border-t-2 border-dashed border-muted-foreground/30"></div>
                </div>

                <div className="space-y-1.5 text-left px-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Produk</span>
                    <span className="font-medium">{qrisData.planName} Plan</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Periode</span>
                    <span className="font-medium">{qrisData.billingInterval === 'annual' ? 'Tahunan' : 'Bulanan'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-[9px]">{qrisData.orderId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px border-t-2 border-dashed border-muted-foreground/30"></div>
                  <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Scan QR</span>
                  <div className="flex-1 h-px border-t-2 border-dashed border-muted-foreground/30"></div>
                </div>

                <div className="flex justify-center p-3 bg-white rounded-lg border-2 border-dashed border-muted-foreground/20">
                  <img 
                    src={qrisData.qrisImage} 
                    alt="QRIS Payment Code" 
                    className="w-40 h-40 object-contain"
                    data-testid="img-qris-code"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px border-t-2 border-dashed border-muted-foreground/30"></div>
                  <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Total</span>
                  <div className="flex-1 h-px border-t-2 border-dashed border-muted-foreground/30"></div>
                </div>

                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <div className="text-xl font-bold text-primary" data-testid="text-qris-amount">
                    Rp {(qrisData.amount || 0).toLocaleString('id-ID')}
                  </div>
                  {qrisData.amountUSD && (
                    <p className="text-[9px] text-muted-foreground">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400" data-testid="text-qris-countdown">
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400">tersisa</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-9" 
                    onClick={handleSaveQRIS}
                    data-testid="button-save-qris"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Simpan QRIS
                  </Button>
                  {import.meta.env.DEV && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-9" 
                      onClick={handleDemoPayment}
                      data-testid="button-demo-payment"
                    >
                      Demo Pay
                    </Button>
                  )}
                </div>

                <p className="text-[8px] text-muted-foreground italic">
                  Powered by Kompas Pay
                </p>
              </CardContent>
            </Card>
            
            <svg className="absolute -bottom-3 left-0 w-full h-3" viewBox="0 0 400 12" preserveAspectRatio="none">
              <path d="M0,0 L10,12 L20,0 L30,12 L40,0 L50,12 L60,0 L70,12 L80,0 L90,12 L100,0 L110,12 L120,0 L130,12 L140,0 L150,12 L160,0 L170,12 L180,0 L190,12 L200,0 L210,12 L220,0 L230,12 L240,0 L250,12 L260,0 L270,12 L280,0 L290,12 L300,0 L310,12 L320,0 L330,12 L340,0 L350,12 L360,0 L370,12 L380,0 L390,12 L400,0" 
                    className="fill-card drop-shadow-sm" />
            </svg>
          </div>

          <p className="text-center text-[9px] text-muted-foreground pt-2">
            Menunggu pembayaran... Status diperbarui otomatis
          </p>
        </div>
      )}

      {paymentStep === 'va' && vaData && (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2.5">
              <div className="text-center">
                <div className="w-9 h-9 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-semibold">Virtual Account</h3>
                <p className="text-[10px] text-muted-foreground">
                  Transfer to the virtual account below
                </p>
              </div>
              
              <div className="p-2.5 rounded-md bg-muted/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Bank</span>
                  <span className="text-[11px] font-medium">{vaData.bankCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">VA Number</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono font-medium">{vaData.vaNumber}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(vaData.vaNumber)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-primary">Rp {(vaData.amount || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                <span className="font-mono text-xs font-medium">{formatTime(timeRemaining)}</span>
              </div>

              {import.meta.env.DEV && (
                <Button variant="outline" size="sm" className="w-full h-7 text-[10px]" onClick={handleDemoPayment}>
                  Demo Pay
                </Button>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-[9px] text-muted-foreground">
            Waiting for payment... Status updates automatically
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
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">Payment Successful!</h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Thank you! Your subscription is now active.
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
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Payment Failed</h3>
              <p className="text-[10px] text-muted-foreground mt-1">
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
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Payment Expired</h3>
              <p className="text-[10px] text-muted-foreground mt-1">
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
