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
  const resumeTransactionId = urlParams.get('resume');
  
  const isAnnual = billingInterval === 'annual';
  const isResumeMode = Boolean(resumeTransactionId);
  
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
  
  // Resume pending transaction if resumeTransactionId is provided
  const { data: resumeData, isLoading: resumeLoading, isError: resumeError } = useQuery<{
    transactionId: string;
    orderId: string;
    status: string;
    amount: number;
    paymentMethod: string;
    qrisImage?: string;
    qrisString?: string;
    vaNumber?: string;
    bankCode?: string;
    expiryTime?: string;
    planId?: string;
    planName?: string;
    billingInterval?: string;
  }>({
    queryKey: ["/api/billing/payment-status", resumeTransactionId],
    queryFn: async () => {
      const response = await fetch(`/api/billing/payment-status/${resumeTransactionId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch payment status');
      return response.json();
    },
    enabled: Boolean(resumeTransactionId),
    refetchOnWindowFocus: false,
    retry: false,
  });
  
  const isInitialLoading = billingLoading || exchangeLoading || plansLoading || (isResumeMode && resumeLoading);

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

  // Handle resume mode - set payment data from pending transaction
  useEffect(() => {
    if (isResumeMode && resumeData && resumeData.status === 'PENDING') {
      if (resumeData.paymentMethod === 'qris' && resumeData.qrisImage) {
        setQrisData({
          paymentMethod: 'qris',
          transactionId: resumeData.transactionId,
          orderId: resumeData.orderId,
          qrisString: resumeData.qrisString || '',
          qrisImage: resumeData.qrisImage,
          amount: resumeData.amount,
          expiryTime: resumeData.expiryTime || '',
          planId: resumeData.planId || '',
          planName: resumeData.planName || '',
          billingInterval: resumeData.billingInterval || 'monthly',
        });
        setPaymentStep('qris');
        if (resumeData.expiryTime) {
          startPaymentPolling(resumeData.transactionId, resumeData.expiryTime);
        }
      } else if (resumeData.paymentMethod === 'virtual_account' && resumeData.vaNumber) {
        setVaData({
          paymentMethod: 'virtual_account',
          transactionId: resumeData.transactionId,
          orderId: resumeData.orderId,
          vaNumber: resumeData.vaNumber,
          bankCode: resumeData.bankCode || '',
          amount: resumeData.amount,
          expiryTime: resumeData.expiryTime || '',
          planName: resumeData.planName || '',
          billingInterval: resumeData.billingInterval || 'monthly',
        });
        setPaymentStep('va');
        if (resumeData.expiryTime) {
          startPaymentPolling(resumeData.transactionId, resumeData.expiryTime);
        }
      }
    } else if (isResumeMode && resumeData && (resumeData.status === 'PAID' || resumeData.status === 'EXPIRED' || resumeData.status === 'FAILED')) {
      // Transaction already completed or expired
      if (resumeData.status === 'PAID') {
        setPaymentStep('success');
      } else if (resumeData.status === 'EXPIRED') {
        setPaymentStep('expired');
      } else {
        setPaymentStep('failed');
      }
    }
  }, [isResumeMode, resumeData]);
  
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
      <div className="max-w-lg mx-auto py-6 px-4 md:py-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-muted animate-pulse rounded" />
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-48 w-full bg-muted animate-pulse rounded mt-4" />
              <div className="h-12 w-full bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle resume mode error (invalid transaction ID)
  if (isResumeMode && resumeError) {
    return (
      <div className="max-w-lg mx-auto py-6 px-4 md:py-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/dashboard/billing')} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-semibold">Lanjutkan Pembayaran</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-base font-semibold">Transaksi Tidak Ditemukan</h2>
            <p className="text-[11px] text-muted-foreground">Transaksi yang Anda cari tidak ditemukan atau sudah kadaluarsa.</p>
            <Button size="sm" onClick={() => navigate('/dashboard/billing')} data-testid="button-back-to-billing">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Kembali ke Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // In resume mode, we don't need planId - show payment directly
  if (!isResumeMode && (!planId || !selectedPlan)) {
    return (
      <div className="max-w-lg mx-auto py-6 px-4 md:py-8 space-y-4">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-base font-semibold">Plan Not Found</h2>
            <p className="text-[11px] text-muted-foreground">Please select a plan from the billing page.</p>
            <Button size="sm" onClick={() => navigate('/dashboard/billing')}>
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
  const priceUSD = selectedPlan ? (isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0)) : 0;
  const priceIDR = Math.round(priceUSD * exchangeRate);
  const promo = selectedPlan ? getPromoForPlan(selectedPlan.id) : null;
  const discountPercent = promo?.discountPercent || 0;
  const discountAmount = Math.round(priceIDR * discountPercent / 100);
  
  const creditAmountIDR = prorationInfo?.prorationApplied && prorationInfo?.creditAmount 
    ? Math.round(prorationInfo.creditAmount * exchangeRate) 
    : 0;
  
  const finalPrice = Math.max(0, priceIDR - discountAmount - creditAmountIDR);

  const needsBankSelection = selectedPaymentMethod === 'virtual_account';
  
  // For resume mode, use resume data values
  const displayAmount = isResumeMode && qrisData ? qrisData.amount : finalPrice;
  const displayPlanName = isResumeMode && qrisData ? qrisData.planName : selectedPlan?.name || '';
  const displayBillingInterval = isResumeMode && qrisData ? qrisData.billingInterval : (isAnnual ? 'annual' : 'monthly');

  return (
    <div className="max-w-lg mx-auto py-6 px-4 md:py-8 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/dashboard/billing')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">{isResumeMode ? 'Lanjutkan Pembayaran' : 'Checkout'}</h1>
          {isResumeMode && resumeData && (
            <p className="text-[10px] text-muted-foreground">Order: {resumeData.orderId}</p>
          )}
        </div>
      </div>

      {/* In resume mode, skip checkout form and go straight to payment display */}
      {!isResumeMode && (paymentStep === 'select_method' || paymentStep === 'bank_form') && (
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
        <div className="space-y-4">
          {/* Receipt Ticket Container */}
          <div className="relative" id="qris-receipt">
            {/* Top zigzag edge with shadow */}
            <div className="relative">
              <svg className="w-full h-4" viewBox="0 0 400 16" preserveAspectRatio="none">
                <defs>
                  <filter id="zigzag-shadow-top" x="-20%" y="-20%" width="140%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08"/>
                  </filter>
                </defs>
                <path 
                  d="M0,16 L8,4 L16,16 L24,4 L32,16 L40,4 L48,16 L56,4 L64,16 L72,4 L80,16 L88,4 L96,16 L104,4 L112,16 L120,4 L128,16 L136,4 L144,16 L152,4 L160,16 L168,4 L176,16 L184,4 L192,16 L200,4 L208,16 L216,4 L224,16 L232,4 L240,16 L248,4 L256,16 L264,4 L272,16 L280,4 L288,16 L296,4 L304,16 L312,4 L320,16 L328,4 L336,16 L344,4 L352,16 L360,4 L368,16 L376,4 L384,16 L392,4 L400,16" 
                  className="fill-card"
                  filter="url(#zigzag-shadow-top)"
                />
              </svg>
            </div>
            
            {/* Main Receipt Body */}
            <div className="bg-card border-x border-border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
              <div className="px-5 py-5 space-y-4">
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-bold tracking-tight">PEMBAYARAN QRIS</h3>
                  <p className="text-[10px] text-muted-foreground">Scan dengan e-wallet atau mobile banking</p>
                </div>
                
                {/* Dotted Divider with circles */}
                <div className="relative flex items-center py-2">
                  <div className="absolute -left-5 w-4 h-4 bg-background rounded-full border-r border-border"></div>
                  <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20"></div>
                  <div className="absolute -right-5 w-4 h-4 bg-background rounded-full border-l border-border"></div>
                </div>

                {/* Order Details */}
                <div className="space-y-2 px-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Produk</span>
                    <span className="font-semibold">{qrisData.planName} Plan</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Periode</span>
                    <span className="font-medium">{qrisData.billingInterval === 'annual' ? 'Tahunan' : 'Bulanan'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{qrisData.orderId}</span>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="relative py-3">
                  <div className="flex justify-center">
                    <div className="relative p-4 bg-white rounded-xl shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] border border-gray-100">
                      {/* Corner decorations */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/30 rounded-tl"></div>
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/30 rounded-tr"></div>
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/30 rounded-bl"></div>
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br"></div>
                      
                      <img 
                        src={qrisData.qrisImage} 
                        alt="QRIS Payment Code" 
                        className="w-44 h-44 object-contain"
                        data-testid="img-qris-code"
                      />
                    </div>
                  </div>
                </div>

                {/* Dotted Divider with circles */}
                <div className="relative flex items-center py-2">
                  <div className="absolute -left-5 w-4 h-4 bg-background rounded-full border-r border-border"></div>
                  <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20"></div>
                  <div className="absolute -right-5 w-4 h-4 bg-background rounded-full border-l border-border"></div>
                </div>

                {/* Total Amount */}
                <div className="text-center py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Pembayaran</p>
                  <div className="text-2xl font-bold text-primary" data-testid="text-qris-amount">
                    Rp {(qrisData.amount || 0).toLocaleString('id-ID')}
                  </div>
                  {qrisData.amountUSD && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                  )}
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-mono text-base font-bold text-amber-700 dark:text-amber-300" data-testid="text-qris-countdown">
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">tersisa</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-10 min-h-[44px]" 
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
                      className="flex-1 h-10 min-h-[44px]" 
                      onClick={handleDemoPayment}
                      data-testid="button-demo-payment"
                    >
                      Demo Pay
                    </Button>
                  )}
                </div>

                {/* Supported Apps */}
                <div className="text-center pt-1">
                  <p className="text-[9px] text-muted-foreground">
                    GoPay • OVO • DANA • ShopeePay • BCA • Mandiri • BRI
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom zigzag edge with shadow */}
            <div className="relative">
              <svg className="w-full h-4" viewBox="0 0 400 16" preserveAspectRatio="none">
                <defs>
                  <filter id="zigzag-shadow-bottom" x="-20%" y="-60%" width="140%" height="160%">
                    <feDropShadow dx="0" dy="-2" stdDeviation="3" floodOpacity="0.08"/>
                  </filter>
                </defs>
                <path 
                  d="M0,0 L8,12 L16,0 L24,12 L32,0 L40,12 L48,0 L56,12 L64,0 L72,12 L80,0 L88,12 L96,0 L104,12 L112,0 L120,12 L128,0 L136,12 L144,0 L152,12 L160,0 L168,12 L176,0 L184,12 L192,0 L200,12 L208,0 L216,12 L224,0 L232,12 L240,0 L248,12 L256,0 L264,12 L272,0 L280,12 L288,0 L296,12 L304,0 L312,12 L320,0 L328,12 L336,0 L344,12 L352,0 L360,12 L368,0 L376,12 L384,0 L392,12 L400,0" 
                  className="fill-card"
                  filter="url(#zigzag-shadow-bottom)"
                />
              </svg>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="relative flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] text-muted-foreground">Menunggu pembayaran...</span>
            </div>
          </div>

          {/* Powered by */}
          <p className="text-center text-[9px] text-muted-foreground">
            Powered by Kompas Pay
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
