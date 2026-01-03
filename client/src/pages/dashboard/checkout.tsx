import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
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

interface PendingTransaction {
  transactionId: string;
  orderId: string;
  status: string;
  amount?: number;
  amountFormatted?: string;
  paymentMethod?: string;
  qrisImage?: string;
  qrisString?: string;
  vaNumber?: string;
  bankCode?: string;
  expiryTime?: string;
  planId?: string;
  planName?: string;
  billingInterval?: string;
}

interface BillingStatus {
  currentPlan: string;
  planId: string;
  status: string;
  periodEnd?: string;
  currentPeriodEnd?: string;
  billingInterval?: string;
  pendingTransaction?: PendingTransaction;
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
  const fromPage = urlParams.get('from') || 'plans';
  
  const isAnnual = billingInterval === 'annual';
  const isResumeMode = Boolean(resumeTransactionId);
  
  // Smart back button navigation
  const handleBack = () => {
    if (fromPage === 'billing') {
      navigate('/dashboard/billing');
    } else {
      navigate('/dashboard/plans');
    }
  };
  
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
      if (resumeData.paymentMethod === 'qris' && (resumeData.qrisImage || resumeData.qrisString)) {
        setQrisData({
          paymentMethod: 'qris',
          transactionId: resumeData.transactionId,
          orderId: resumeData.orderId,
          qrisString: resumeData.qrisString || '',
          qrisImage: resumeData.qrisImage || '',
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
  
  // Auto-load pending transaction from billing status when visiting checkout without resume parameter
  useEffect(() => {
    if (!isResumeMode && billingStatus?.pendingTransaction?.transactionId && paymentStep === 'select_method') {
      const pending = billingStatus.pendingTransaction;
      if (pending.status === 'PENDING') {
        if (pending.paymentMethod === 'qris' && (pending.qrisImage || pending.qrisString)) {
          setQrisData({
            paymentMethod: 'qris',
            transactionId: pending.transactionId,
            orderId: pending.orderId,
            qrisString: pending.qrisString || '',
            qrisImage: pending.qrisImage || '',
            amount: pending.amount || 0,
            expiryTime: pending.expiryTime || '',
            planId: pending.planId || '',
            planName: pending.planName || '',
            billingInterval: pending.billingInterval || 'monthly',
          });
          setPaymentStep('qris');
          if (pending.expiryTime) {
            startPaymentPolling(pending.transactionId, pending.expiryTime);
          }
        } else if (pending.paymentMethod === 'virtual_account' && pending.vaNumber) {
          setVaData({
            paymentMethod: 'virtual_account',
            transactionId: pending.transactionId,
            orderId: pending.orderId,
            vaNumber: pending.vaNumber,
            bankCode: pending.bankCode || '',
            amount: pending.amount || 0,
            expiryTime: pending.expiryTime || '',
            planName: pending.planName || '',
            billingInterval: pending.billingInterval || 'monthly',
          });
          setPaymentStep('va');
          if (pending.expiryTime) {
            startPaymentPolling(pending.transactionId, pending.expiryTime);
          }
        }
      }
    }
  }, [isResumeMode, billingStatus, paymentStep]);
  
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

  const handleCancelPending = async () => {
    try {
      const response = await fetch('/api/billing/cancel-pending', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        toast({ title: "Transaction canceled", description: "You can now start a new checkout" });
        setPaymentStep('select_method');
        setQrisData(null);
        setVaData(null);
        setTimeRemaining(0);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      } else {
        toast({ title: "Error", description: "Failed to cancel transaction", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to cancel transaction", variant: "destructive" });
    }
  };

  const handleSaveQRIS = async () => {
    if (!qrisData) return;
    
    try {
      const container = document.getElementById('qris-code-container');
      const svgElement = container?.querySelector('svg');
      
      if (svgElement && qrisData.qrisString) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        
        // Create beautiful frosted glass card design
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Card dimensions (mobile-friendly portrait)
        const cardWidth = 420;
        const cardHeight = 680;
        canvas.width = cardWidth;
        canvas.height = cardHeight;
        
        // Draw gradient background (purple aurora)
        const bgGradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
        bgGradient.addColorStop(0, '#1a0a2e');
        bgGradient.addColorStop(0.3, '#2d1b4e');
        bgGradient.addColorStop(0.5, '#4a2c7a');
        bgGradient.addColorStop(0.7, '#6b3fa0');
        bgGradient.addColorStop(1, '#2d1b4e');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, cardWidth, cardHeight);
        
        // Add aurora glow effect
        const glowGradient = ctx.createRadialGradient(cardWidth * 0.7, cardHeight * 0.3, 0, cardWidth * 0.7, cardHeight * 0.3, 200);
        glowGradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, cardWidth, cardHeight);
        
        // Frosted glass card
        const cardX = 30;
        const cardY = 40;
        const cardInnerWidth = cardWidth - 60;
        const cardInnerHeight = cardHeight - 80;
        const borderRadius = 24;
        
        // Draw frosted glass background
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardInnerWidth, cardInnerHeight, borderRadius);
        ctx.clip();
        
        // Glass effect with gradient
        const glassGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardInnerHeight);
        glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        glassGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
        ctx.fillStyle = glassGradient;
        ctx.fill();
        ctx.restore();
        
        // Glass border
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardInnerWidth, cardInnerHeight, borderRadius);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Load and draw logos
        const loadImage = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };
        
        // Draw GPN logo (top left of card)
        try {
          const gpnLogo = await loadImage('/attached_assets/IMG_1410_1767435254419.png');
          ctx.drawImage(gpnLogo, cardX + 20, cardY + 20, 60, 50);
        } catch (e) {
          console.log('GPN logo not loaded');
        }
        
        // Draw Chatvice logo (top right of card)
        try {
          const chatviceLogo = await loadImage('/attached_assets/Chatvice-04_1767435390364.png');
          ctx.drawImage(chatviceLogo, cardX + cardInnerWidth - 140, cardY + 25, 120, 40);
        } catch (e) {
          console.log('Chatvice logo not loaded');
        }
        
        // "Trusted QRIS Payment" title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Trusted QRIS Payment', cardWidth / 2, cardY + 110);
        
        // Subtitle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText('Scan with any e-wallet or mobile banking', cardWidth / 2, cardY + 135);
        
        // White QR code container
        const qrSize = 200;
        const qrX = (cardWidth - qrSize - 24) / 2;
        const qrY = cardY + 160;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrSize + 24, qrSize + 24, 16);
        ctx.fill();
        
        // Draw QR code
        const qrImg = new Image();
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => {
            ctx.drawImage(qrImg, qrX + 12, qrY + 12, qrSize, qrSize);
            resolve();
          };
          qrImg.onerror = reject;
          qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });
        
        // Amount section
        const amountY = qrY + qrSize + 50;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TOTAL AMOUNT', cardWidth / 2, amountY);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Rp ${(qrisData.amount || 0).toLocaleString('id-ID')}`, cardWidth / 2, amountY + 38);
        
        // Plan info
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${qrisData.planName} Plan - ${qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}`, cardWidth / 2, amountY + 65);
        
        // Order ID
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '11px monospace';
        const shortOrderId = qrisData.orderId.length > 30 ? '...' + qrisData.orderId.slice(-25) : qrisData.orderId;
        ctx.fillText(shortOrderId, cardWidth / 2, amountY + 95);
        
        // Supported apps
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillText('GoPay \u2022 OVO \u2022 DANA \u2022 ShopeePay \u2022 LinkAja', cardWidth / 2, cardHeight - 55);
        ctx.fillText('BCA \u2022 Mandiri \u2022 BRI \u2022 BNI \u2022 CIMB', cardWidth / 2, cardHeight - 38);
        
        // Save as JPG
        canvas.toBlob((jpgBlob) => {
          if (jpgBlob) {
            const url = URL.createObjectURL(jpgBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qris-chatvice-${qrisData.orderId.slice(-12)}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast({
              title: "QRIS Saved!",
              description: "Beautiful QRIS card saved to your device",
            });
          }
        }, 'image/jpeg', 0.95);
      } else {
        toast({
          title: "Error",
          description: "No QRIS data available to save",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to save QRIS:", err);
      toast({
        title: "Error",
        description: "Failed to save QRIS image",
        variant: "destructive",
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
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-semibold">Continue Payment</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-base font-semibold">Transaction Not Found</h2>
            <p className="text-[11px] text-muted-foreground">The transaction you are looking for was not found or has expired.</p>
            <Button size="sm" onClick={handleBack} data-testid="button-back-to-previous">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
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
            <h2 className="text-base font-semibold">No Pending Transaction</h2>
            <p className="text-[11px] text-muted-foreground">Please select a plan from the Plans page to upgrade or downgrade.</p>
            <Button size="sm" onClick={handleBack} data-testid="button-back-to-previous">
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

  // Detect if this is a downgrade by comparing plan prices
  // Use monthly prices for fair comparison regardless of billing interval
  const currentPlanData = dbPlans.find((p: any) => p.id === billingStatus?.planId);
  const currentPlanMonthlyPriceUSD = currentPlanData?.monthlyPrice || 0;
  const selectedPlanMonthlyPriceUSD = selectedPlan?.monthlyPrice || 0;
  
  const isDowngrade = billingStatus?.status === 'active' && 
                      billingStatus?.planId && 
                      billingStatus.planId !== 'free' && 
                      selectedPlanMonthlyPriceUSD < currentPlanMonthlyPriceUSD;
  
  // Format the current period end date for display
  const periodEndDate = billingStatus?.currentPeriodEnd || billingStatus?.periodEnd;
  const currentPeriodEndFormatted = periodEndDate 
    ? new Date(periodEndDate).toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    : '';

  const needsBankSelection = selectedPaymentMethod === 'virtual_account';
  
  // For resume mode, use resume data values
  const displayAmount = isResumeMode && qrisData ? qrisData.amount : finalPrice;
  const displayPlanName = isResumeMode && qrisData ? qrisData.planName : selectedPlan?.name || '';
  const displayBillingInterval = isResumeMode && qrisData ? qrisData.billingInterval : (isAnnual ? 'annual' : 'monthly');

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:py-8 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">{isResumeMode ? 'Continue Payment' : 'Checkout'}</h1>
          {isResumeMode && resumeData && (
            <p className="text-[10px] text-muted-foreground">Order: {resumeData.orderId}</p>
          )}
        </div>
      </div>

      {/* In resume mode, skip checkout form and go straight to payment display */}
      {!isResumeMode && (paymentStep === 'select_method' || paymentStep === 'bank_form') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Order Summary */}
          <div className="space-y-3">
            <Card className="overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold">{selectedPlan.name}</h2>
                  <p className="text-xs text-muted-foreground">Chatvice Subscription</p>
                </div>
              </div>
              
              <div className="mx-4 mb-4 rounded-lg bg-primary/5 border border-primary/10 overflow-hidden">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Starting today</p>
                    <p className="text-sm font-bold">Rp {finalPrice.toLocaleString('id-ID')}/{isAnnual ? 'year' : 'month'}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">
                    {isAnnual ? 'Annual' : 'Monthly'}
                  </Badge>
                </div>
                
                {(discountPercent > 0 || creditAmountIDR > 0) && (
                  <div className="px-3 pb-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Normal price</span>
                      <span>Rp {priceIDR.toLocaleString('id-ID')}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Promo discount ({discountPercent}%)</span>
                        <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {creditAmountIDR > 0 && (
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>Credit from previous plan</span>
                        <span>- Rp {creditAmountIDR.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Terms and Submit - Desktop */}
            <div className="hidden md:block space-y-3">
              <div className="text-[10px] text-muted-foreground px-1 space-y-1">
                <p>
                  By subscribing, you agree that your subscription automatically renews until canceled. 
                  We'll notify you if price changes, as described in the{' '}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.{' '}
                  <a href="/terms#cancel" className="text-primary hover:underline">Learn how to cancel</a>.
                </p>
                {isDowngrade && currentPeriodEndFormatted && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    Note: Since this is a plan downgrade, payment will be processed now but the new plan 
                    will be activated on {currentPeriodEndFormatted} after your current subscription period ends.
                  </p>
                )}
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
                  id="terms-desktop" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                  data-testid="checkbox-terms"
                />
                <label htmlFor="terms-desktop" className="text-[10px] text-muted-foreground cursor-pointer">
                  I agree to the Terms of Service and understand that payment will be processed upon confirmation
                </label>
              </div>

              <Button 
                className="w-full h-11 min-h-[44px]"
                onClick={handleProceedToPayment}
                disabled={!termsAccepted || checkoutMutation.isPending || (needsBankSelection && !selectedBank)}
                data-testid="button-proceed-payment"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm">Subscribe • Rp {finalPrice.toLocaleString('id-ID')}</span>
              </Button>
            </div>
          </div>

          {/* Right Column - Payment Methods */}
          <div className="space-y-3">
            <Card>
              <div className="p-4">
                <h3 className="text-sm font-medium mb-3">Payment Method</h3>
                <div className="space-y-2">
                  {PAYMENT_METHODS.filter(m => m.available).map((method) => (
                    <div
                      key={method.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      data-testid={`payment-method-${method.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <method.icon className={`w-5 h-5 ${selectedPaymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{method.name}</p>
                          <p className="text-[10px] text-muted-foreground">{method.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{method.provider}</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2 mt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground mb-2">Coming Soon</p>
                    {PAYMENT_METHODS.filter(m => !m.available).map((method) => (
                      <div
                        key={method.id}
                        className="p-2.5 rounded-lg border border-border/30 bg-muted/30 opacity-50 cursor-not-allowed mb-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <method.icon className="w-4 h-4 text-muted-foreground/50" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground/70">{method.name}</p>
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
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-medium">Select Bank</h3>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="h-10 text-sm" data-testid="select-bank">
                      <SelectValue placeholder="Select bank for Virtual Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code} className="text-sm">
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            )}
          </div>

          {/* Terms and Submit - Mobile */}
          <div className="md:hidden space-y-3 col-span-1">
            <div className="text-[10px] text-muted-foreground px-1 space-y-1">
              <p>
                By subscribing, you agree that your subscription automatically renews until canceled. 
                We'll notify you if price changes, as described in the{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.{' '}
                <a href="/terms#cancel" className="text-primary hover:underline">Learn how to cancel</a>.
              </p>
              {isDowngrade && currentPeriodEndFormatted && (
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Note: Since this is a plan downgrade, payment will be processed now but the new plan 
                  will be activated on {currentPeriodEndFormatted} after your current subscription period ends.
                </p>
              )}
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
                id="terms-mobile" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
                data-testid="checkbox-terms-mobile"
              />
              <label htmlFor="terms-mobile" className="text-[10px] text-muted-foreground cursor-pointer">
                I agree to the Terms of Service and understand that payment will be processed upon confirmation
              </label>
            </div>

            <Button 
              className="w-full h-11 min-h-[44px]"
              onClick={handleProceedToPayment}
              disabled={!termsAccepted || checkoutMutation.isPending || (needsBankSelection && !selectedBank)}
              data-testid="button-proceed-payment-mobile"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">Subscribe • Rp {finalPrice.toLocaleString('id-ID')}</span>
            </Button>
          </div>
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
          {/* QRIS Payment - Landscape Layout for Desktop/Tablet */}
          <Card className="overflow-hidden" id="qris-receipt">
            <div className="p-4 md:p-6">
              {/* Desktop/Tablet: Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - QR Code */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  {/* Header - Mobile only */}
                  <div className="md:hidden text-center space-y-1 w-full">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight">PEMBAYARAN QRIS</h3>
                    <p className="text-[10px] text-muted-foreground">Scan dengan e-wallet atau mobile banking</p>
                  </div>
                  
                  {/* QR Code */}
                  <div className="relative p-4 bg-white rounded-xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] border border-gray-100" id="qris-code-container">
                    {/* Corner decorations */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/30 rounded-tl"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/30 rounded-tr"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/30 rounded-bl"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br"></div>
                    
                    {qrisData.qrisString ? (
                      <QRCodeSVG 
                        value={qrisData.qrisString}
                        size={224}
                        level="M"
                        includeMargin={false}
                        className="w-48 h-48 md:w-56 md:h-56"
                        data-testid="img-qris-code"
                      />
                    ) : qrisData.qrisImage ? (
                      <img 
                        src={qrisData.qrisImage} 
                        alt="QRIS Payment Code" 
                        className="w-48 h-48 md:w-56 md:h-56 object-contain"
                        data-testid="img-qris-code"
                      />
                    ) : (
                      <div className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center bg-muted rounded">
                        <p className="text-xs text-muted-foreground text-center px-4">QR Code tidak tersedia</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Supported Apps */}
                  <p className="text-[10px] text-muted-foreground text-center">
                    GoPay • OVO • DANA • ShopeePay • BCA • Mandiri • BRI
                  </p>
                </div>
                
                {/* Right Column - Details */}
                <div className="flex flex-col justify-center space-y-4">
                  {/* Header - Desktop only */}
                  <div className="hidden md:block space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                        <QrCode className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold tracking-tight">PEMBAYARAN QRIS</h3>
                        <p className="text-xs text-muted-foreground">Scan dengan e-wallet atau mobile banking</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider - Desktop */}
                  <div className="hidden md:block border-t border-dashed border-muted-foreground/20"></div>
                  
                  {/* Order Details */}
                  <div className="space-y-2.5 bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Product</span>
                      <span className="font-semibold">{qrisData.planName} Plan</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Period</span>
                      <span className="font-medium">{qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</span>
                    </div>
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-muted-foreground">Order ID</span>
                      <button 
                        onClick={() => copyToClipboard(qrisData.orderId)}
                        className="font-mono text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        title={qrisData.orderId}
                      >
                        <span className="max-w-[120px] truncate">{qrisData.orderId.slice(-12)}</span>
                        <Copy className="w-3 h-3 flex-shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="text-center md:text-left py-2 bg-primary/5 rounded-lg px-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Pembayaran</p>
                    <div className="text-2xl md:text-3xl font-bold text-primary" data-testid="text-qris-amount">
                      Rp {(qrisData.amount || 0).toLocaleString('id-ID')}
                    </div>
                    {qrisData.amountUSD && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                    )}
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-center md:justify-start gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-mono text-lg font-bold text-amber-700 dark:text-amber-300" data-testid="text-qris-countdown">
                      {formatTime(timeRemaining)}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">tersisa</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11 min-h-[44px]" 
                      onClick={handleSaveQRIS}
                      data-testid="button-save-qris"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Simpan QRIS
                    </Button>
                    {import.meta.env.DEV && (
                      <Button 
                        variant="outline" 
                        className="flex-1 h-11 min-h-[44px]" 
                        onClick={handleDemoPayment}
                        data-testid="button-demo-payment"
                      >
                        Demo Pay
                      </Button>
                    )}
                  </div>
                  
                  {/* Cancel and restart */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={handleCancelPending}
                    data-testid="button-cancel-payment"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Batalkan & Mulai Ulang
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="relative flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Menunggu pembayaran...</span>
            </div>
          </div>

          {/* Powered by */}
          <p className="text-center text-[10px] text-muted-foreground">
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
