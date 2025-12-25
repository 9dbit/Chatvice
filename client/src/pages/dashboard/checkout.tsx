import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ArrowRight, 
  Crown, 
  Check, 
  Zap, 
  ShieldCheck, 
  Loader2,
  Smartphone,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
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

interface ActivePromotion {
  code: string;
  discountPercent: number;
  billingCycle: string;
  targetPlans: string[];
}

interface ValidatedPromo {
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
      <div className="max-w-lg mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-semibold">Plan Tidak Ditemukan</h2>
            <p className="text-muted-foreground">Silakan pilih plan dari halaman billing.</p>
            <Button onClick={() => navigate('/dashboard/plans')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Plans
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
  const finalPrice = priceIDR - discountAmount;

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/plans')} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Checkout</h1>
      </div>

      {paymentStep === 'checkout' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{selectedPlan.name} Plan</CardTitle>
                </div>
                <span className="text-xl font-bold text-primary">${priceUSD.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-0">
                  {isAnnual ? 'Tahunan' : 'Bulanan'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Kurs: Rp {exchangeRate.toLocaleString('id-ID')}/USD
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pt-2 border-t">
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
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Pembayaran</span>
                  <span className="text-2xl font-bold text-primary">
                    Rp {finalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Fitur yang Didapat
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                {selectedPlan.features?.slice(0, 4).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                Syarat & Ketentuan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                <li>• Pembayaran bersifat non-refundable setelah aktivasi</li>
                <li>• Langganan akan otomatis diperpanjang setiap periode</li>
                <li>• Anda dapat membatalkan langganan kapan saja</li>
                <li>• Upgrade berlaku segera setelah pembayaran berhasil</li>
                <li>• Harga dapat berubah dengan pemberitahuan 30 hari</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
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
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/dashboard/plans')}
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
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <p className="font-medium">Memproses pembayaran...</p>
              <p className="text-sm text-muted-foreground">Mohon tunggu sementara kami membuat kode QR</p>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'qris' && qrisData && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center pb-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Scan & Bayar</CardTitle>
              <p className="text-sm text-muted-foreground">
                Scan kode QR dengan aplikasi e-wallet atau mobile banking
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{qrisData.planName}</span>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-0">
                    {qrisData.billingInterval === 'annual' ? 'Tahunan' : 'Bulanan'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">Rp {(qrisData.amount || 0).toLocaleString('id-ID')}</div>
                {qrisData.amountUSD && (
                  <p className="text-xs text-muted-foreground">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                )}
              </div>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={qrisData.qrisImage} 
                  alt="QRIS Payment Code" 
                  className="w-48 h-48 object-contain"
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveQRIS}>
                  <Download className="w-4 h-4 mr-2" />
                  Simpan QR
                </Button>
                {import.meta.env.DEV && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleDemoPayment}>
                    Demo Bayar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>Menunggu pembayaran...</p>
            <p className="text-xs mt-1">Status akan diperbarui otomatis setelah pembayaran berhasil</p>
          </div>
        </div>
      )}

      {paymentStep === 'success' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">Pembayaran Berhasil!</h3>
              <p className="text-muted-foreground mt-2">
                Terima kasih! Plan {qrisData?.planName} Anda sudah aktif.
              </p>
            </div>
            <Button onClick={() => navigate('/dashboard/plans')}>
              Kembali ke Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'failed' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">Pembayaran Gagal</h3>
              <p className="text-muted-foreground mt-2">
                Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi.
              </p>
            </div>
            <Button onClick={handleRetryPayment}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {paymentStep === 'expired' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-amber-700 dark:text-amber-400">Kode QR Kedaluwarsa</h3>
              <p className="text-muted-foreground mt-2">
                Waktu pembayaran telah habis. Silakan buat transaksi baru.
              </p>
            </div>
            <Button onClick={handleRetryPayment}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Buat Transaksi Baru
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
