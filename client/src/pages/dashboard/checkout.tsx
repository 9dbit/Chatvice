import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Bitcoin,
  ExternalLink,
  Share2,
  Mail,
  Upload,
  ImageIcon
} from "lucide-react";
import { SiWhatsapp, SiTelegram, SiMessenger, SiPaypal, SiBitcoin, SiEthereum, SiSolana, SiBinance, SiTether, SiRipple } from "react-icons/si";
import PayPalButton from "@/components/PayPalButton";
import chatviceLogoImg from "@assets/Chatvice-02_1767473402687.png";
import chatviceCryptoLogo from "@assets/Chatvice-04_1767550221276.png";
import gpnLogoImg from "@assets/IMG_1410_1767473402687.png";

type PaymentMethod = 'qris' | 'bank_transfer' | 'virtual_account' | 'ewallet' | 'payment_link' | 'credit_card' | 'crypto' | 'paypal';

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

interface BankTransferResponse {
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  amount: number;
  amountUSD?: number;
  expiryTime: string;
  planName: string;
  billingInterval: string;
  uniqueCode?: number;
  totalAmount?: number;
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

type PaymentStep = 'select_method' | 'bank_form' | 'loading' | 'qris' | 'va' | 'bank_transfer' | 'payment_link' | 'crypto' | 'success' | 'failed' | 'expired';

// Cryptocurrency wallet addresses
interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  network: string;
  address: string;
  memo?: string;
  icon: any;
  color: string;
  bgColor: string;
}

const CRYPTO_COINS: CryptoCoin[] = [
  { 
    id: 'btc', 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    network: 'BTC Network',
    address: 'bc1q9mk7032hjfu0fu9cnk0c3tgk7z5vxswaz3avy6',
    icon: SiBitcoin,
    color: '#F7931A',
    bgColor: 'bg-orange-500/10'
  },
  { 
    id: 'eth', 
    symbol: 'ETH', 
    name: 'Ethereum', 
    network: 'ERC-20',
    address: '0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7',
    icon: SiEthereum,
    color: '#627EEA',
    bgColor: 'bg-blue-500/10'
  },
  { 
    id: 'sol', 
    symbol: 'SOL', 
    name: 'Solana', 
    network: 'SOL Network',
    address: 'FvfgL8MdwZ7Po6795XHCgF6rWsCEdmUxwDgMD2Fn6zQg',
    memo: 'No memo required',
    icon: SiSolana,
    color: '#9945FF',
    bgColor: 'bg-purple-500/10'
  },
  { 
    id: 'bnb', 
    symbol: 'BNB', 
    name: 'BNB', 
    network: 'BEP-20',
    address: '0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7',
    icon: SiBinance,
    color: '#F3BA2F',
    bgColor: 'bg-yellow-500/10'
  },
  { 
    id: 'usdt', 
    symbol: 'USDT', 
    name: 'Tether', 
    network: 'ERC-20',
    address: '0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7',
    icon: SiTether,
    color: '#26A17B',
    bgColor: 'bg-green-500/10'
  },
  { 
    id: 'xrp', 
    symbol: 'XRP', 
    name: 'Ripple', 
    network: 'XRP Ledger',
    address: 'raAGkuxS7b92wYWRKERQCDknKz9fMpyJpH',
    memo: 'No destination tag required',
    icon: SiRipple,
    color: '#23292F',
    bgColor: 'bg-gray-500/10'
  },
];

interface PaymentLinkResponse {
  paymentMethod: 'payment_link';
  transactionId: string;
  orderId: string;
  paymentUrl: string;
  amount: number;
  amountUSD: number;
  expiryTime: string;
  planId: string;
  planName: string;
  billingInterval: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'qris', name: 'QRIS', description: 'All e-wallets & mobile banking', icon: QrCode, available: true, provider: 'Kompas Pay' },
  { id: 'virtual_account', name: 'Virtual Account', description: 'Automatic verification', icon: CreditCard, available: true, provider: 'Kompas Pay' },
  { id: 'bank_transfer', name: 'Bank Transfer', description: 'Transfer to merchant account', icon: Building2, available: true, provider: 'Kompas Pay' },
  { id: 'paypal', name: 'PayPal', description: 'Pay with PayPal account or credit card', icon: () => <SiPaypal className="w-5 h-5" />, available: true, provider: 'PayPal' },
  { id: 'ewallet', name: 'E-Wallet', description: 'Use QRIS for e-wallets', icon: Wallet, available: false, provider: 'Kompas Pay' },
  { id: 'payment_link', name: 'Payment Link', description: 'Share checkout link to others', icon: Link2, available: true, provider: 'Share' },
  { id: 'credit_card', name: 'Credit Card', description: 'Coming soon via PayPal', icon: CreditCard, available: false, provider: 'PayPal' },
  { id: 'crypto', name: 'Cryptocurrency', description: 'Pay with BTC, ETH, SOL, BNB, USDT, XRP', icon: Bitcoin, available: true, provider: 'Manual' },
];

// Kompas Pay QRIS maximum limit per transaction
const QRIS_MAX_LIMIT_IDR = 10000000;

// Kompas Pay VA uses numeric bank codes - Active banks per Kompas Pay credential
// Note: BNI (009) temporarily removed due to "BNIVA param error" from gateway
const VA_BANKS = [
  { code: '002', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: '008', name: 'Bank Mandiri' },
  { code: '022', name: 'CIMB Niaga' },
  { code: '013', name: 'Bank Permata' },
  { code: '011', name: 'Bank Danamon' },
  { code: '016', name: 'Maybank Indonesia' },
  { code: '490', name: 'Bank Neo Commerce (BNC)' },
  { code: '451', name: 'Bank Syariah Indonesia (BSI)' },
];

// Transfer banks use standard bank codes for manual bank transfer
const TRANSFER_BANKS = [
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: 'MANDIRI', name: 'Bank Mandiri' },
  { code: 'BCA', name: 'Bank Central Asia (BCA)' },
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
  const [bankTransferData, setBankTransferData] = useState<BankTransferResponse | null>(null);
  const [paymentLinkData, setPaymentLinkData] = useState<PaymentLinkResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [prorationInfo, setProrationInfo] = useState<ProrationInfo | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCoin | null>(null);
  const [showCryptoDialog, setShowCryptoDialog] = useState(false);
  const [showConfirmPaymentDialog, setShowConfirmPaymentDialog] = useState(false);
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoProofFile, setCryptoProofFile] = useState<File | null>(null);
  const [cryptoProofPreview, setCryptoProofPreview] = useState<string | null>(null);
  const [submittingCryptoPayment, setSubmittingCryptoPayment] = useState(false);
  const [priceLoadingProgress, setPriceLoadingProgress] = useState(0);
  
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
  
  // Fetch pending custom plan invoice when accessing custom plan checkout
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
  }
  
  const { data: pendingInvoices = [], isLoading: invoicesLoading } = useQuery<CustomPlanInvoice[]>({
    queryKey: ["/api/merchant/custom-invoices/pending"],
    enabled: planId === "custom",
  });
  
  // Get the first pending invoice for custom plan pricing
  const pendingCustomInvoice = planId === "custom" && pendingInvoices.length > 0 
    ? pendingInvoices.find(inv => inv.billingInterval === billingInterval) || pendingInvoices[0]
    : null;
  
  // Fetch crypto prices when dialog opens
  interface CryptoPricesResponse {
    prices: Record<string, number>;
    timestamp: number;
    cached: boolean;
    stale?: boolean;
    decimals: Record<string, number>;
    feePercent: number;
    error?: string;
  }
  
  const { 
    data: cryptoPrices, 
    isLoading: cryptoPricesLoading,
    isFetching: cryptoPricesFetching,
    refetch: refetchCryptoPrices,
  } = useQuery<CryptoPricesResponse>({
    queryKey: ["/api/crypto/prices"],
    enabled: paymentStep === 'crypto' || showCryptoDialog, // Load when entering crypto step
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (paymentStep === 'crypto' || showCryptoDialog) ? 60 * 1000 : false, // Auto-refresh every 60s
  });
  
  // Price loading progress animation
  useEffect(() => {
    if (cryptoPricesLoading) {
      setPriceLoadingProgress(0);
      const interval = setInterval(() => {
        setPriceLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 150);
      return () => clearInterval(interval);
    } else {
      setPriceLoadingProgress(100);
    }
  }, [cryptoPricesLoading]);
  
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
  
  const isInitialLoading = billingLoading || exchangeLoading || plansLoading || (isResumeMode && resumeLoading) || (planId === "custom" && invoicesLoading);

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
        setBankTransferData(data);
        setPaymentStep('bank_transfer');
        startPaymentPolling(data.transactionId, data.expiryTime);
      } else if (data.paymentMethod === 'payment_link') {
        setPaymentLinkData(data);
        setPaymentStep('payment_link');
        startPaymentPolling(data.transactionId, data.expiryTime);
      } else if (data.paymentMethod === 'ewallet') {
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
    
    if ((selectedPaymentMethod === 'virtual_account' || selectedPaymentMethod === 'bank_transfer') && !selectedBank) {
      toast({ title: "Error", description: "Please select a bank", variant: "destructive" });
      return;
    }
    
    // Handle crypto payment locally (no API call needed)
    if (selectedPaymentMethod === 'crypto') {
      setPaymentStep('crypto');
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
    setBankTransferData(null);
    setPaymentLinkData(null);
    setSelectedCrypto(null);
    setShowCryptoDialog(false);
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
        setBankTransferData(null);
        setPaymentLinkData(null);
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
        
        // Create clean light mode invoice design matching checkout UI
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Card dimensions (mobile-friendly portrait)
        const cardWidth = 420;
        const cardHeight = 720;
        canvas.width = cardWidth;
        canvas.height = cardHeight;
        
        // Draw light gray background
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(0, 0, cardWidth, cardHeight);
        
        // Main white card with rounded corners
        const cardX = 20;
        const cardY = 20;
        const cardInnerWidth = cardWidth - 40;
        const cardInnerHeight = cardHeight - 40;
        const borderRadius = 16;
        
        // Draw white card background
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardInnerWidth, cardInnerHeight, borderRadius);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        
        // Header section with border-bottom
        const headerHeight = 70;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cardX, cardY, cardInnerWidth, headerHeight);
        ctx.strokeStyle = '#d1d5db';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cardX + 20, cardY + headerHeight);
        ctx.lineTo(cardX + cardInnerWidth - 20, cardY + headerHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Load Chatvice logo image
        const chatviceLogo = new Image();
        chatviceLogo.crossOrigin = 'anonymous';
        const chatviceLogoLoaded = new Promise<void>((resolve) => {
          chatviceLogo.onload = () => resolve();
          chatviceLogo.onerror = () => resolve(); // Continue even if logo fails
          chatviceLogo.src = chatviceLogoImg;
        });
        
        // Load GPN logo image
        const gpnLogo = new Image();
        gpnLogo.crossOrigin = 'anonymous';
        const gpnLogoLoaded = new Promise<void>((resolve) => {
          gpnLogo.onload = () => resolve();
          gpnLogo.onerror = () => resolve(); // Continue even if logo fails
          gpnLogo.src = gpnLogoImg;
        });
        
        // Wait for both logos to load
        await Promise.all([chatviceLogoLoaded, gpnLogoLoaded]);
        
        // Draw Chatvice Logo
        const logoX = cardX + 20;
        const logoY = cardY + 15;
        const chatviceLogoHeight = 28;
        // Calculate width while maintaining aspect ratio
        const chatviceLogoWidth = chatviceLogo.naturalWidth && chatviceLogo.naturalHeight 
          ? (chatviceLogo.naturalWidth / chatviceLogo.naturalHeight) * chatviceLogoHeight 
          : 120;
        
        if (chatviceLogo.complete && chatviceLogo.naturalWidth > 0) {
          ctx.drawImage(chatviceLogo, logoX, logoY, chatviceLogoWidth, chatviceLogoHeight);
        } else {
          // Fallback: draw text if logo fails to load
          ctx.fillStyle = '#8b5cf6';
          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Chatvice', logoX, logoY + 20);
        }
        
        // Subscription Payment text below logo
        ctx.fillStyle = '#71717a';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Subscription Payment', logoX, logoY + chatviceLogoHeight + 12);
        
        // Draw GPN QRIS Badge with actual logo (right side)
        const badgeX = cardX + cardInnerWidth - 85;
        const badgeY = logoY + 2;
        
        // GPN Badge background
        ctx.fillStyle = '#fef2f2';
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 65, 36, 6);
        ctx.fill();
        ctx.stroke();
        
        if (gpnLogo.complete && gpnLogo.naturalWidth > 0) {
          // Draw actual GPN logo inside badge
          const gpnLogoHeight = 22;
          const gpnLogoWidth = gpnLogo.naturalWidth && gpnLogo.naturalHeight 
            ? (gpnLogo.naturalWidth / gpnLogo.naturalHeight) * gpnLogoHeight 
            : 28;
          const gpnLogoX = badgeX + (65 - gpnLogoWidth) / 2;
          ctx.drawImage(gpnLogo, gpnLogoX, badgeY + 3, gpnLogoWidth, gpnLogoHeight);
          
          // QRIS text below logo
          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 8px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('QRIS', badgeX + 32, badgeY + 32);
        } else {
          // Fallback: draw text if GPN logo fails to load
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('GPN', badgeX + 32, badgeY + 16);
          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 9px system-ui';
          ctx.fillText('QRIS', badgeX + 32, badgeY + 28);
        }
        
        // Main content area
        const contentY = cardY + headerHeight + 30;
        
        // Scan to Pay title
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCAN TO PAY', cardWidth / 2, contentY);
        
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillText('Gunakan e-wallet atau mobile banking', cardWidth / 2, contentY + 18);
        
        // QR Code container
        const qrSize = 200;
        const qrX = (cardWidth - qrSize - 24) / 2;
        const qrY = contentY + 35;
        
        // White QR background with border
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrSize + 24, qrSize + 24, 12);
        ctx.fill();
        ctx.stroke();
        
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
        
        // Supported apps text
        const appsY = qrY + qrSize + 45;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GoPay \u2022 OVO \u2022 DANA \u2022 ShopeePay \u2022 LinkAja', cardWidth / 2, appsY);
        ctx.fillText('BCA \u2022 Mandiri \u2022 BRI \u2022 BNI \u2022 CIMB', cardWidth / 2, appsY + 14);
        
        // Order Details section with orange left border
        const detailsY = appsY + 40;
        const detailsX = cardX + 30;
        
        // Orange left border
        ctx.fillStyle = '#f97316';
        ctx.fillRect(detailsX, detailsY, 4, 80);
        
        // ORDER DETAILS title
        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ORDER DETAILS', detailsX + 14, detailsY + 14);
        
        // Details rows
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Product', detailsX + 14, detailsY + 34);
        ctx.fillStyle = '#18181b';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${qrisData.planName} Plan`, cardX + cardInnerWidth - 30, detailsY + 34);
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Period', detailsX + 14, detailsY + 52);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#18181b';
        ctx.fillText(qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly', cardX + cardInnerWidth - 30, detailsY + 52);
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Order ID', detailsX + 14, detailsY + 70);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#18181b';
        ctx.font = '9px monospace';
        const shortOrderId = qrisData.orderId.length > 24 ? qrisData.orderId.slice(-24) : qrisData.orderId;
        ctx.fillText(shortOrderId, cardX + cardInnerWidth - 30, detailsY + 70);
        
        // Total section at bottom
        const totalY = detailsY + 100;
        ctx.fillStyle = '#f4f4f5';
        ctx.beginPath();
        ctx.roundRect(cardX + 20, totalY, cardInnerWidth - 40, 50, 8);
        ctx.fill();
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TOTAL PEMBAYARAN', cardWidth / 2, totalY + 18);
        
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Rp ${(qrisData.amount || 0).toLocaleString('id-ID')}`, cardWidth / 2, totalY + 40);
        
        // Save as JPG
        canvas.toBlob((jpgBlob) => {
          if (jpgBlob) {
            const url = URL.createObjectURL(jpgBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice-Chatvice-${qrisData.orderId.slice(-12)}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast({
              title: "Invoice Saved!",
              description: "Invoice has been saved to your device",
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
        description: "Failed to save invoice",
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
  
  // Custom plan requires a pending invoice
  if (!isResumeMode && planId === "custom" && pendingInvoices.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-6 px-4 md:py-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-semibold">Custom Plan</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-base font-semibold">No Invoice Available</h2>
            <p className="text-[11px] text-muted-foreground">Custom plan requires an invoice from our sales team. Please check your billing page or contact sales.</p>
            <Button size="sm" onClick={() => navigate('/dashboard/billing')} data-testid="button-go-to-billing">
              View Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exchangeRate = exchangeRateData?.rate || 16500;
  const exchangeSource = exchangeRateData?.source || "Default";
  
  // ALL plan prices (including custom invoices) are stored in USD
  // Convert to IDR for display (Indonesian payment methods)
  const isCustomPlanWithInvoice = planId === "custom" && pendingCustomInvoice;
  
  // For custom plans, use invoice amount (in USD). For standard plans, use plan prices
  const priceUSD = isCustomPlanWithInvoice 
    ? pendingCustomInvoice.amount  // Invoice amount is in USD
    : selectedPlan ? (isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0)) : 0;
  
  const promo = selectedPlan ? getPromoForPlan(selectedPlan.id) : null;
  // Don't apply promo discount for custom plan invoices (price is already finalized by sales)
  const discountPercent = isCustomPlanWithInvoice ? 0 : (promo?.discountPercent || 0);
  
  // Calculate USD price after discount
  const priceAfterDiscountUSD = Math.max(0, priceUSD - (priceUSD * discountPercent / 100));
  
  // Convert to IDR for Indonesian payment methods
  const priceIDR = Math.round(priceAfterDiscountUSD * exchangeRate);
  const discountAmountIDR = Math.round((priceUSD * discountPercent / 100) * exchangeRate);
  
  const creditAmountIDR = prorationInfo?.prorationApplied && prorationInfo?.creditAmount 
    ? Math.round(prorationInfo.creditAmount * exchangeRate) 
    : 0;
  
  const finalPrice = Math.max(0, priceIDR - creditAmountIDR);
  
  // USD amount for crypto/PayPal payments
  const finalPriceUSD = isCustomPlanWithInvoice
    ? priceUSD  // Custom invoice amount in USD
    : prorationInfo?.prorationApplied 
      ? Math.max(0, prorationInfo.finalAmount)
      : priceAfterDiscountUSD;

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

  const needsBankSelection = selectedPaymentMethod === 'virtual_account' || selectedPaymentMethod === 'bank_transfer';
  const bankList = selectedPaymentMethod === 'virtual_account' ? VA_BANKS : TRANSFER_BANKS;
  
  // Check if QRIS is available (amount must be <= 10 million IDR)
  const isQrisOverLimit = finalPrice > QRIS_MAX_LIMIT_IDR;
  
  // Effective payment method - auto-switch from QRIS if amount exceeds limit
  const effectivePaymentMethod = selectedPaymentMethod === 'qris' && isQrisOverLimit 
    ? 'virtual_account' 
    : selectedPaymentMethod;
  
  // For resume mode, use resume data values
  // For custom plan with invoice, use invoice billing interval
  const displayAmount = isResumeMode && qrisData ? qrisData.amount : finalPrice;
  const displayPlanName = isResumeMode && qrisData ? qrisData.planName : selectedPlan?.name || '';
  const displayBillingInterval = isResumeMode && qrisData 
    ? qrisData.billingInterval 
    : isCustomPlanWithInvoice 
      ? pendingCustomInvoice.billingInterval 
      : (isAnnual ? 'annual' : 'monthly');

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
                        <span>- Rp {discountAmountIDR.toLocaleString('id-ID')}</span>
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
                disabled={!termsAccepted || checkoutMutation.isPending || (needsBankSelection && !selectedBank) || selectedPaymentMethod === 'payment_link' || selectedPaymentMethod === 'paypal'}
                data-testid="button-proceed-payment"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm">
                  {selectedPaymentMethod === 'payment_link' ? 'Use share buttons on the right' : selectedPaymentMethod === 'paypal' ? 'Use PayPal button on the right' : `Subscribe • Rp ${finalPrice.toLocaleString('id-ID')}`}
                </span>
              </Button>
            </div>
          </div>

          {/* Right Column - Payment Methods */}
          <div className="space-y-3">
            <Card>
              <div className="p-4">
                <h3 className="text-sm font-medium mb-3">Payment Method</h3>
                <div className="space-y-2">
                  {PAYMENT_METHODS.filter(m => m.available).map((method) => {
                    // Disable QRIS if amount exceeds 10 million IDR limit
                    const isDisabled = method.id === 'qris' && isQrisOverLimit;
                    
                    return (
                    <div key={method.id}>
                      <div
                        className={`p-3 rounded-lg border transition-all ${
                          isDisabled 
                            ? 'border-border bg-muted/30 cursor-not-allowed opacity-60'
                            : selectedPaymentMethod === method.id
                              ? 'border-primary bg-primary/5 cursor-pointer'
                              : 'border-border hover:border-primary/50 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedPaymentMethod(method.id);
                          if (method.id !== 'virtual_account' && method.id !== 'bank_transfer') {
                            setSelectedBank('');
                          }
                        }}
                        data-testid={`payment-method-${method.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <method.icon className={`w-5 h-5 ${isDisabled ? 'text-muted-foreground/50' : selectedPaymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}>{method.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {isDisabled 
                                ? `Max Rp ${QRIS_MAX_LIMIT_IDR.toLocaleString('id-ID')} per transaction`
                                : method.description}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{method.provider}</span>
                        </div>
                      </div>
                      
                      {/* Bank selection dropdown with slide-down animation - appears below selected payment method */}
                      <AnimatePresence>
                        {selectedPaymentMethod === method.id && (method.id === 'virtual_account' || method.id === 'bank_transfer') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 pl-8">
                              <Select value={selectedBank} onValueChange={setSelectedBank}>
                                <SelectTrigger className="h-9 text-xs border-primary/30 bg-primary/5" data-testid="select-bank">
                                  <SelectValue placeholder={method.id === 'virtual_account' ? 'Select bank for VA' : 'Select bank for transfer'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {bankList.map((bank) => (
                                    <SelectItem key={bank.code} value={bank.code} className="text-xs">
                                      {bank.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Payment Link share panel */}
                      <AnimatePresence>
                        {selectedPaymentMethod === method.id && method.id === 'payment_link' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 space-y-3">
                              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                                  Share this checkout link with others. They can complete the payment on their device.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={window.location.href} 
                                  className="flex-1 text-[10px] bg-transparent outline-none truncate"
                                  data-testid="input-checkout-url"
                                />
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast({ title: "Link copied!", description: "Checkout link copied to clipboard" });
                                  }}
                                  data-testid="button-copy-checkout-link"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="h-10 flex-col gap-1 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800"
                                  onClick={() => {
                                    const text = `Checkout ${selectedPlan?.name || 'Plan'} - Rp ${finalPrice.toLocaleString('id-ID')}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + window.location.href)}`, '_blank');
                                  }}
                                  data-testid="button-share-whatsapp"
                                >
                                  <SiWhatsapp className="w-5 h-5 text-green-600" />
                                  <span className="text-[9px] text-green-700 dark:text-green-400">WhatsApp</span>
                                </Button>

                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="h-10 flex-col gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800"
                                  onClick={() => {
                                    const text = `Checkout ${selectedPlan?.name || 'Plan'} - Rp ${finalPrice.toLocaleString('id-ID')}`;
                                    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  data-testid="button-share-telegram"
                                >
                                  <SiTelegram className="w-5 h-5 text-blue-500" />
                                  <span className="text-[9px] text-blue-700 dark:text-blue-400">Telegram</span>
                                </Button>

                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="h-10 flex-col gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800"
                                  onClick={() => {
                                    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.href)}`, '_blank');
                                  }}
                                  data-testid="button-share-messenger"
                                >
                                  <SiMessenger className="w-5 h-5 text-indigo-600" />
                                  <span className="text-[9px] text-indigo-700 dark:text-indigo-400">Messenger</span>
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* PayPal payment panel */}
                      <AnimatePresence>
                        {selectedPaymentMethod === method.id && method.id === 'paypal' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 space-y-3">
                              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                                  Pay securely with your PayPal account or credit/debit card. Amount: ${(finalPrice / exchangeRate).toFixed(2)} USD
                                </p>
                              </div>

                              {termsAccepted ? (
                                <div className="flex justify-center">
                                  <PayPalButton 
                                    amount={(finalPrice / exchangeRate).toFixed(2)}
                                    currency="USD"
                                    intent="CAPTURE"
                                    planId={planId || ''}
                                    billingInterval={billingInterval}
                                    onSuccess={(data) => {
                                      console.log("PayPal payment success:", data);
                                      if (data.subscriptionActivated) {
                                        toast({ title: "Payment successful!", description: `Your ${data.planName} subscription has been activated.` });
                                      } else {
                                        toast({ title: "Payment received!", description: "Your subscription is being processed." });
                                      }
                                      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                                      navigate('/dashboard/billing');
                                    }}
                                    onError={(error) => {
                                      console.error("PayPal payment error:", error);
                                      toast({ title: "Payment failed", description: "Please try again or use another payment method.", variant: "destructive" });
                                    }}
                                    onCancel={() => {
                                      toast({ title: "Payment cancelled", description: "You can try again when ready." });
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                  <p className="text-[10px] text-amber-700 dark:text-amber-300 text-center">
                                    Please accept the Terms of Service above to enable PayPal payment
                                  </p>
                                </div>
                              )}

                              <p className="text-[9px] text-center text-muted-foreground">
                                You'll be redirected to PayPal to complete payment
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    );
                  })}
                  
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
              disabled={!termsAccepted || checkoutMutation.isPending || (needsBankSelection && !selectedBank) || selectedPaymentMethod === 'payment_link' || selectedPaymentMethod === 'paypal'}
              data-testid="button-proceed-payment-mobile"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">
                {selectedPaymentMethod === 'payment_link' ? 'Use share buttons above' : selectedPaymentMethod === 'paypal' ? 'Use PayPal button above' : `Subscribe • Rp ${finalPrice.toLocaleString('id-ID')}`}
              </span>
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
          {/* QRIS Payment - Ticket/Boarding Pass Style */}
          <div 
            className="relative bg-[radial-gradient(circle,#e5e7eb_1px,white_1px)] dark:bg-[radial-gradient(circle,#3f3f46_1px,#18181b_1px)] bg-[length:16px_16px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-zinc-700" 
            id="qris-receipt"
          >
            {/* Top Header with Logos */}
            <div className="bg-white dark:bg-zinc-800 px-5 py-4 border-b border-dashed border-gray-300 dark:border-zinc-600">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Chatvice Logo - Inline SVG */}
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                      <circle cx="12" cy="10" r="2"/>
                      <circle cx="7" cy="10" r="2"/>
                      <circle cx="17" cy="10" r="2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Chatvice</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Subscription Payment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* GPN Logo - Inline SVG */}
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                    <svg viewBox="0 0 60 24" className="h-4 w-auto">
                      <rect x="0" y="2" width="20" height="20" rx="2" fill="#c41e3a"/>
                      <text x="3" y="17" fontSize="10" fontWeight="bold" fill="white">G</text>
                      <text x="24" y="17" fontSize="11" fontWeight="bold" fill="#c41e3a">GPN</text>
                    </svg>
                    <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">QRIS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative p-5 bg-white/80 dark:bg-zinc-900/80">
              {/* Ticket Notch Left - positioned relative to content */}
              <div className="hidden sm:block absolute -left-2 top-1/2 w-4 h-8 bg-gray-100 dark:bg-zinc-950 rounded-r-full -translate-y-1/2"></div>
              {/* Ticket Notch Right */}
              <div className="hidden sm:block absolute -right-2 top-1/2 w-4 h-8 bg-gray-100 dark:bg-zinc-950 rounded-l-full -translate-y-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - QR Code */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="text-center space-y-1">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Scan to Pay</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Gunakan e-wallet atau mobile banking</p>
                  </div>
                  
                  {/* QR Code Container */}
                  <div className="relative p-3 bg-white rounded-xl shadow-sm border-2 border-gray-100 dark:border-zinc-700" id="qris-code-container">
                    {qrisData.qrisString ? (
                      <QRCodeSVG 
                        value={qrisData.qrisString}
                        size={200}
                        level="M"
                        includeMargin={false}
                        className="w-44 h-44 md:w-48 md:h-48"
                        data-testid="img-qris-code"
                      />
                    ) : qrisData.qrisImage ? (
                      <img 
                        src={qrisData.qrisImage} 
                        alt="QRIS Payment Code" 
                        className="w-44 h-44 md:w-48 md:h-48 object-contain"
                        data-testid="img-qris-code"
                      />
                    ) : (
                      <div className="w-44 h-44 md:w-48 md:h-48 flex items-center justify-center bg-gray-50 rounded">
                        <p className="text-xs text-gray-400 text-center px-4">QR Code tidak tersedia</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Supported Apps */}
                  <div className="text-center">
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      GoPay • OVO • DANA • ShopeePay • LinkAja<br/>
                      BCA • Mandiri • BRI • BNI • CIMB
                    </p>
                  </div>
                </div>
                
                {/* Right Column - Details */}
                <div className="flex flex-col justify-center space-y-4">
                  {/* Dashed Divider - Mobile */}
                  <div className="md:hidden border-t border-dashed border-gray-300 dark:border-zinc-600 -mx-5 px-5"></div>
                  
                  {/* Order Details Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-primary rounded-full"></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Order Details</span>
                    </div>
                    
                    <div className="space-y-2 bg-gray-50 dark:bg-zinc-800 rounded-lg p-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Product</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{qrisData.planName} Plan</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Period</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</span>
                      </div>
                      <div className="border-t border-dashed border-gray-200 dark:border-zinc-700 pt-2">
                        <div className="flex justify-between text-xs items-start">
                          <span className="text-gray-500 dark:text-gray-400">Order ID</span>
                          <button 
                            onClick={() => copyToClipboard(qrisData.orderId)}
                            className="font-mono text-[10px] text-gray-600 dark:text-gray-400 hover:text-primary flex items-center gap-1 text-right"
                            title="Click to copy"
                          >
                            <span className="break-all text-right leading-tight">{qrisData.orderId}</span>
                            <Copy className="w-3 h-3 flex-shrink-0 ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dashed Divider */}
                  <div className="border-t border-dashed border-gray-300 dark:border-zinc-600"></div>

                  {/* Total Amount */}
                  <div className="text-center py-3 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl border border-primary/20">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Pembayaran</p>
                    <div className="text-2xl md:text-3xl font-bold text-primary" data-testid="text-qris-amount">
                      Rp {(qrisData.amount || 0).toLocaleString('id-ID')}
                    </div>
                    {qrisData.amountUSD && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                    )}
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/50">
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
                      className="flex-1 h-10" 
                      onClick={handleSaveQRIS}
                      data-testid="button-save-qris"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Simpan
                    </Button>
                    {import.meta.env.DEV && (
                      <Button 
                        variant="outline" 
                        className="flex-1 h-10" 
                        onClick={handleDemoPayment}
                        data-testid="button-demo-payment"
                      >
                        Demo Pay
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Dashed Line */}
            <div className="border-t border-dashed border-gray-300 dark:border-zinc-600"></div>

            {/* Footer */}
            <div className="bg-white dark:bg-zinc-800 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Menunggu pembayaran...</span>
                </div>
                <button 
                  onClick={handleCancelPending}
                  className="text-[10px] text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  data-testid="button-cancel-payment"
                >
                  <XCircle className="w-3 h-3" />
                  Batalkan
                </button>
              </div>
            </div>
          </div>

          {/* Powered by */}
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
            Secured by <span className="font-medium">Kompas Pay</span> • GPN Network
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
                  <span className="text-[11px] font-medium">{VA_BANKS.find(b => b.code === vaData.bankCode)?.name || vaData.bankCode}</span>
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

      {paymentStep === 'bank_transfer' && bankTransferData && (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2.5">
              <div className="text-center">
                <div className="w-9 h-9 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-semibold">Bank Transfer</h3>
                <p className="text-[10px] text-muted-foreground">
                  Transfer to the bank account below
                </p>
              </div>
              
              <div className="p-2.5 rounded-md bg-muted/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Bank</span>
                  <span className="text-[11px] font-medium">{bankTransferData.bankName || TRANSFER_BANKS.find(b => b.code === bankTransferData.bankCode)?.name || bankTransferData.bankCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Account Name</span>
                  <span className="text-[11px] font-medium">{bankTransferData.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Account Number</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono font-medium">{bankTransferData.accountNumber}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(bankTransferData.accountNumber)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Separator />
                {bankTransferData.uniqueCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Unique Code</span>
                    <span className="text-[11px] font-medium">+Rp {bankTransferData.uniqueCode.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Total Amount</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-primary">Rp {(bankTransferData.totalAmount || bankTransferData.amount || 0).toLocaleString('id-ID')}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(String(bankTransferData.totalAmount || bankTransferData.amount))}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Please transfer the exact amount including unique code for automatic verification.
                </p>
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

      {paymentStep === 'payment_link' && paymentLinkData && (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2.5">
              <div className="text-center">
                <div className="w-9 h-9 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-semibold">Payment Link</h3>
                <p className="text-[10px] text-muted-foreground">
                  Click the button below to complete payment
                </p>
              </div>
              
              <div className="p-2.5 rounded-md bg-muted/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Plan</span>
                  <span className="text-[11px] font-medium">{paymentLinkData.planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Billing</span>
                  <span className="text-[11px] font-medium">{paymentLinkData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-primary">Rp {(paymentLinkData.amount || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                  <input 
                    type="text" 
                    readOnly 
                    value={paymentLinkData.paymentUrl} 
                    className="flex-1 text-[10px] bg-transparent outline-none truncate"
                    data-testid="input-payment-link-url"
                  />
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentLinkData.paymentUrl);
                      toast({ title: "Link copied!", description: "Payment link copied to clipboard" });
                    }}
                    data-testid="button-copy-payment-link"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-9 flex-col gap-0.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800"
                    onClick={() => {
                      const text = `Payment Link for ${paymentLinkData.planName} Plan - Rp ${paymentLinkData.amount.toLocaleString('id-ID')}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + paymentLinkData.paymentUrl)}`, '_blank');
                    }}
                    data-testid="button-share-whatsapp"
                  >
                    <SiWhatsapp className="w-4 h-4 text-green-600" />
                    <span className="text-[8px] text-green-700 dark:text-green-400">WhatsApp</span>
                  </Button>

                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-9 flex-col gap-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800"
                    onClick={() => {
                      const text = `Payment Link for ${paymentLinkData.planName} Plan - Rp ${paymentLinkData.amount.toLocaleString('id-ID')}`;
                      window.open(`https://t.me/share/url?url=${encodeURIComponent(paymentLinkData.paymentUrl)}&text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    data-testid="button-share-telegram"
                  >
                    <SiTelegram className="w-4 h-4 text-blue-500" />
                    <span className="text-[8px] text-blue-700 dark:text-blue-400">Telegram</span>
                  </Button>

                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-9 flex-col gap-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800"
                    onClick={() => {
                      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(paymentLinkData.paymentUrl)}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.href)}`, '_blank');
                    }}
                    data-testid="button-share-messenger"
                  >
                    <SiMessenger className="w-4 h-4 text-indigo-600" />
                    <span className="text-[8px] text-indigo-700 dark:text-indigo-400">Messenger</span>
                  </Button>

                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-9 flex-col gap-0.5"
                    onClick={() => window.open(paymentLinkData.paymentUrl, '_blank')}
                    data-testid="button-open-payment-link"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[8px] text-muted-foreground">Open</span>
                  </Button>
                </div>
              </div>

              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                  Share this payment link or open it in a new tab. Payment status updates automatically.
                </p>
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

      {paymentStep === 'crypto' && (
        <div className="space-y-4">
          {/* Crypto Header Card - Clean Design */}
          <div className="crypto-card p-6">
            {/* Header - No icon, bigger title */}
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-foreground">
                Pay with Cryptocurrency
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fast, secure & decentralized payments
              </p>
              <div className="crypto-accent-line w-32 mx-auto mt-4" />
            </div>

            {/* Order Summary - Clean Box */}
            <div className="p-4 rounded-xl bg-muted/30 dark:bg-white/5 border border-border/50 space-y-3 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-500" />
                  Plan
                </span>
                <span className="text-base font-semibold">{selectedPlan?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Billing
                </span>
                <Badge variant="secondary" className="text-xs">{isAnnual ? 'Annual' : 'Monthly'}</Badge>
              </div>
              <div className="h-px bg-border/50 my-2" />
              {finalPrice === 0 && finalPriceUSD === 0 && selectedPlan ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-500 text-center font-medium">
                    No payment required - Credits cover full amount
                  </p>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold crypto-amount-display">
                      ${finalPriceUSD.toFixed(2)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      ~Rp {finalPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Crypto Coin Selection - Vertical List on Mobile */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-foreground">Select Cryptocurrency</span>
                <div className="flex items-center gap-2">
                  {cryptoPricesLoading || (cryptoPricesFetching && !cryptoPrices) ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                      <span className="text-xs text-purple-500 font-medium">Loading prices...</span>
                    </>
                  ) : cryptoPrices ? (
                    <div className="flex items-center gap-2">
                      {cryptoPricesFetching && (
                        <Loader2 className="w-3 h-3 animate-spin text-green-500" />
                      )}
                      <div className="crypto-live-dot" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live Prices</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Prices unavailable</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
                {CRYPTO_COINS.map((coin) => {
                  const price = cryptoPrices?.prices?.[coin.id];
                  const amountWithFee = finalPriceUSD * 1.03;
                  const cryptoAmount = price ? amountWithFee / price : null;
                  const decimals = cryptoPrices?.decimals?.[coin.id] || 6;
                  
                  return (
                    <button
                      key={coin.id}
                      className="crypto-coin-btn p-3 md:p-4 cursor-pointer text-left w-full"
                      data-coin={coin.id}
                      onClick={() => {
                        setSelectedCrypto(coin);
                        setShowCryptoDialog(true);
                      }}
                      data-testid={`button-crypto-${coin.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-muted/50 dark:bg-white/10 shrink-0">
                          <coin.icon 
                            className="w-6 h-6 md:w-8 md:h-8" 
                            style={{ color: coin.color }} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm md:text-base font-bold text-foreground">{coin.symbol}</span>
                          <span className="text-xs text-muted-foreground block truncate">{coin.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          {cryptoPricesLoading || (cryptoPricesFetching && !cryptoPrices) ? (
                            <div className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                              <span className="text-xs text-muted-foreground">Loading</span>
                            </div>
                          ) : cryptoAmount !== null && !isNaN(cryptoAmount) ? (
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                {cryptoAmount.toFixed(Math.min(decimals || 6, 4))} {coin.symbol}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ${(finalPriceUSD * 1.03).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 mb-4">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                After sending payment, contact support with your transaction hash for manual verification. Payments are typically confirmed within 1-2 hours.
              </p>
            </div>

            {/* Back Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setPaymentStep('select_method')}
              data-testid="button-back-to-methods"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payment Methods
            </Button>
          </div>
        </div>
      )}

      {/* Crypto Wallet Dialog - Frosted Glass with Mobile Scroll */}
      <Dialog open={showCryptoDialog} onOpenChange={setShowCryptoDialog}>
        <DialogContent className="max-w-md p-0 border-0 max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-background/80 dark:bg-background/90 shadow-2xl">
          {selectedCrypto && (
            <div className="p-5 md:p-6" id="crypto-invoice-content">
              {/* Header - Clean */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-muted/50 dark:bg-white/10 shrink-0">
                  <selectedCrypto.icon 
                    className="w-9 h-9" 
                    style={{ color: selectedCrypto.color }} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{selectedCrypto.symbol}</h2>
                  <p className="text-sm text-muted-foreground truncate">{selectedCrypto.name} • {selectedCrypto.network}</p>
                </div>
              </div>

              <div className="crypto-accent-line mb-5" />

              {/* QR Code Section */}
              <div className="flex justify-center mb-5">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG 
                    value={selectedCrypto.address} 
                    size={160}
                    level="H"
                    includeMargin={true}
                    fgColor="#0a0a0f"
                    bgColor="#ffffff"
                  />
                </div>
              </div>

              {/* Wallet Address */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">Wallet Address</label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 dark:bg-white/5 border border-border/50">
                  <input 
                    type="text" 
                    readOnly 
                    value={selectedCrypto.address} 
                    className="flex-1 text-xs font-mono bg-transparent outline-none text-foreground"
                    data-testid="input-crypto-address"
                  />
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCrypto.address);
                      toast({ title: "Address copied!", description: "Wallet address copied to clipboard" });
                    }}
                    data-testid="button-copy-crypto-address"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Memo/Tag if applicable */}
              {selectedCrypto.memo && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
                  <p className="text-xs text-blue-600 dark:text-blue-300 text-center flex items-center justify-center gap-2">
                    <Info className="w-4 h-4" />
                    {selectedCrypto.memo}
                  </p>
                </div>
              )}

              {/* Amount Section - Larger Fonts */}
              <div className="p-4 rounded-xl bg-muted/30 dark:bg-white/5 border border-border/50 mb-4">
                {finalPrice === 0 && finalPriceUSD === 0 && selectedPlan ? (
                  <p className="text-base font-medium text-emerald-500 text-center py-2">No payment required</p>
                ) : (
                  <>
                    {/* Plan Info with Upgrade/Downgrade Badge */}
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">Plan</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{selectedPlan?.name} ({isAnnual ? 'Annual' : 'Monthly'})</span>
                        {billingStatus?.status === 'active' && billingStatus?.planId && selectedPlan?.id !== billingStatus?.planId && (
                          isDowngrade ? (
                            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Downgrade</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Upgrade</Badge>
                          )
                        )}
                      </div>
                    </div>
                    {/* Fee Breakdown */}
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">Base Amount</span>
                      <span className="font-medium">${finalPriceUSD.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className="text-muted-foreground">+ 3% Network Fee</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">+${(finalPriceUSD * 0.03).toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-border/50 mb-3" />
                    
                    {/* Total */}
                    <div className="flex justify-between items-center text-base mb-4">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">${(finalPriceUSD * 1.03).toFixed(2)}</span>
                    </div>
                    
                    {/* Crypto Amount Display - Large */}
                    <div className="text-center py-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Send Exactly</p>
                      {cryptoPricesLoading ? (
                        <div className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            <span className="text-sm text-muted-foreground">Fetching live price...</span>
                          </div>
                          <Progress value={priceLoadingProgress} className="h-1.5" />
                        </div>
                      ) : cryptoPrices?.prices?.[selectedCrypto.id] ? (
                        <>
                          <p className="text-3xl font-bold crypto-amount-display">
                            {(() => {
                              const price = cryptoPrices.prices[selectedCrypto.id];
                              const amountWithFee = finalPriceUSD * 1.03;
                              const cryptoAmount = amountWithFee / price;
                              const decimals = cryptoPrices.decimals?.[selectedCrypto.id] || 6;
                              return cryptoAmount.toFixed(decimals);
                            })()}
                            <span className="text-xl ml-2" style={{ color: selectedCrypto.color }}>
                              {selectedCrypto.symbol}
                            </span>
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <p className="text-xs text-muted-foreground">
                              1 {selectedCrypto.symbol} = ${cryptoPrices.prices[selectedCrypto.id].toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => refetchCryptoPrices()}
                              data-testid="button-refresh-price"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          </div>
                          {cryptoPrices.stale && (
                            <p className="text-xs text-amber-500 mt-1">
                              Cached prices - refreshing...
                            </p>
                          )}
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <p className="text-[10px] text-muted-foreground/70">
                              Updated {new Date(cryptoPrices.timestamp).toLocaleTimeString()}
                            </p>
                            <span className="text-[10px] text-muted-foreground/50">•</span>
                            <p className="text-[10px] text-muted-foreground/70">
                              Powered by CoinGecko
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="py-2">
                          <p className="text-sm text-amber-500">Price unavailable</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Convert ${(finalPriceUSD * 1.03).toFixed(2)} to {selectedCrypto.symbol}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Action Buttons - Purple Gradient */}
              <div className="space-y-2">
                {cryptoPrices?.prices?.[selectedCrypto.id] && finalPriceUSD > 0 && (
                  <Button
                    size="sm"
                    className="w-full crypto-purple-btn h-10"
                    onClick={() => {
                      const price = cryptoPrices.prices[selectedCrypto.id];
                      const amountWithFee = finalPriceUSD * 1.03;
                      const cryptoAmount = amountWithFee / price;
                      const decimals = cryptoPrices.decimals?.[selectedCrypto.id] || 6;
                      navigator.clipboard.writeText(cryptoAmount.toFixed(decimals));
                      toast({ title: "Amount copied!", description: `${cryptoAmount.toFixed(decimals)} ${selectedCrypto.symbol} copied to clipboard` });
                    }}
                    data-testid="button-copy-crypto-amount"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Amount
                  </Button>
                )}

                {/* Save to Gallery Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-10"
                  onClick={async () => {
                    try {
                      // Pure canvas approach - most reliable for QR codes
                      const QRCode = await import('qrcode.react');
                      const { createRoot } = await import('react-dom/client');
                      const { flushSync } = await import('react-dom');
                      
                      // Step 1: Generate QR code as canvas and get data URL
                      const qrTempContainer = document.createElement('div');
                      qrTempContainer.style.cssText = 'position: fixed; left: 0; top: 0; z-index: 99999; background: white; padding: 10px;';
                      document.body.appendChild(qrTempContainer);
                      
                      const qrRoot = createRoot(qrTempContainer);
                      flushSync(() => {
                        qrRoot.render(
                          <QRCode.QRCodeCanvas 
                            value={selectedCrypto.address}
                            size={180}
                            level="H"
                            includeMargin={true}
                            fgColor="#1a1a2e"
                            bgColor="#ffffff"
                          />
                        );
                      });
                      
                      // Wait for canvas to fully render
                      await new Promise(r => setTimeout(r, 400));
                      
                      const qrCanvas = qrTempContainer.querySelector('canvas');
                      let qrDataUrl = '';
                      if (qrCanvas) {
                        qrDataUrl = qrCanvas.toDataURL('image/png');
                      }
                      
                      qrRoot.unmount();
                      document.body.removeChild(qrTempContainer);
                      
                      if (!qrDataUrl) {
                        toast({ title: "Error", description: "Failed to generate QR code", variant: "destructive" });
                        return;
                      }
                      
                      // Step 2: Create main canvas and draw everything
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d')!;
                      const isDark = document.documentElement.classList.contains('dark');
                      
                      // Canvas dimensions
                      const width = 400;
                      const height = 700;
                      canvas.width = width * 2; // 2x for retina
                      canvas.height = height * 2;
                      ctx.scale(2, 2);
                      
                      // Background
                      ctx.fillStyle = isDark ? '#0f0f19' : '#ffffff';
                      ctx.fillRect(0, 0, width, height);
                      
                      let y = 24;
                      
                      // Load and draw logo
                      const logoImg = new Image();
                      logoImg.crossOrigin = 'anonymous';
                      await new Promise<void>((resolve) => {
                        logoImg.onload = () => resolve();
                        logoImg.onerror = () => resolve();
                        logoImg.src = chatviceCryptoLogo;
                      });
                      
                      if (logoImg.complete && logoImg.naturalWidth > 0) {
                        const logoHeight = 28;
                        const logoWidth = (logoImg.naturalWidth / logoImg.naturalHeight) * logoHeight;
                        ctx.drawImage(logoImg, 20, y, logoWidth, logoHeight);
                      }
                      
                      // "Crypto Invoice" text on right
                      ctx.fillStyle = isDark ? '#888888' : '#666666';
                      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.textAlign = 'right';
                      ctx.fillText('Crypto Invoice', width - 20, y + 18);
                      ctx.textAlign = 'left';
                      
                      y += 50;
                      
                      // Divider
                      ctx.strokeStyle = isDark ? '#333333' : '#eeeeee';
                      ctx.beginPath();
                      ctx.moveTo(20, y);
                      ctx.lineTo(width - 20, y);
                      ctx.stroke();
                      
                      y += 20;
                      
                      // Crypto name section
                      ctx.fillStyle = isDark ? '#1a1a2e' : '#f5f5f7';
                      ctx.beginPath();
                      ctx.roundRect(20, y, width - 40, 60, 12);
                      ctx.fill();
                      
                      // Crypto icon circle
                      ctx.fillStyle = selectedCrypto.color + '30';
                      ctx.beginPath();
                      ctx.arc(56, y + 30, 22, 0, Math.PI * 2);
                      ctx.fill();
                      
                      // Crypto initial
                      ctx.fillStyle = selectedCrypto.color;
                      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.fillText(selectedCrypto.symbol.charAt(0), 56, y + 36);
                      ctx.textAlign = 'left';
                      
                      // Crypto symbol and name
                      ctx.fillStyle = isDark ? '#ffffff' : '#1a1a2e';
                      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.fillText(selectedCrypto.symbol, 90, y + 26);
                      ctx.fillStyle = isDark ? '#888888' : '#666666';
                      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.fillText(`${selectedCrypto.name} • ${selectedCrypto.network}`, 90, y + 44);
                      
                      y += 80;
                      
                      // QR Code
                      const qrImg = new Image();
                      await new Promise<void>((resolve) => {
                        qrImg.onload = () => resolve();
                        qrImg.onerror = () => resolve();
                        qrImg.src = qrDataUrl;
                      });
                      
                      // White background for QR
                      const qrSize = 180;
                      const qrX = (width - qrSize - 24) / 2;
                      ctx.fillStyle = '#ffffff';
                      ctx.shadowColor = 'rgba(0,0,0,0.1)';
                      ctx.shadowBlur = 10;
                      ctx.beginPath();
                      ctx.roundRect(qrX, y, qrSize + 24, qrSize + 24, 12);
                      ctx.fill();
                      ctx.shadowBlur = 0;
                      
                      // Draw QR
                      ctx.drawImage(qrImg, qrX + 12, y + 12, qrSize, qrSize);
                      
                      y += qrSize + 44;
                      
                      // Wallet Address label
                      ctx.fillStyle = isDark ? '#888888' : '#666666';
                      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.fillText('WALLET ADDRESS', 20, y);
                      y += 12;
                      
                      // Address box
                      ctx.fillStyle = isDark ? '#1a1a2e' : '#f5f5f7';
                      ctx.beginPath();
                      ctx.roundRect(20, y, width - 40, 48, 8);
                      ctx.fill();
                      
                      // Address text (wrapped)
                      ctx.fillStyle = isDark ? '#ffffff' : '#1a1a2e';
                      ctx.font = '10px Consolas, Monaco, monospace';
                      const address = selectedCrypto.address;
                      const maxWidth = width - 64;
                      let line = '';
                      let lineY = y + 18;
                      for (let i = 0; i < address.length; i++) {
                        const testLine = line + address[i];
                        if (ctx.measureText(testLine).width > maxWidth) {
                          ctx.fillText(line, 32, lineY);
                          line = address[i];
                          lineY += 14;
                        } else {
                          line = testLine;
                        }
                      }
                      ctx.fillText(line, 32, lineY);
                      
                      y += 68;
                      
                      // Amount section
                      const price = cryptoPrices?.prices?.[selectedCrypto.id];
                      const amountWithFee = finalPriceUSD * 1.03;
                      const cryptoAmount = price ? amountWithFee / price : null;
                      const decimals = cryptoPrices?.decimals?.[selectedCrypto.id] || 6;
                      
                      // Purple gradient background for amount
                      const gradient = ctx.createLinearGradient(20, y, width - 20, y + 80);
                      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
                      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
                      ctx.fillStyle = gradient;
                      ctx.beginPath();
                      ctx.roundRect(20, y, width - 40, 80, 10);
                      ctx.fill();
                      
                      // "Send Exactly" label
                      ctx.fillStyle = isDark ? '#888888' : '#666666';
                      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.fillText('SEND EXACTLY', width / 2, y + 20);
                      
                      // Amount
                      ctx.fillStyle = '#8B5CF6';
                      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
                      const amountText = cryptoAmount !== null ? cryptoAmount.toFixed(Math.min(decimals, 8)) : '--';
                      ctx.fillText(amountText + ' ' + selectedCrypto.symbol, width / 2, y + 52);
                      
                      // Rate
                      if (price) {
                        ctx.fillStyle = isDark ? '#888888' : '#666666';
                        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                        ctx.fillText(`1 ${selectedCrypto.symbol} = $${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, width / 2, y + 70);
                      }
                      
                      ctx.textAlign = 'left';
                      y += 100;
                      
                      // Footer
                      ctx.strokeStyle = isDark ? '#333333' : '#eeeeee';
                      ctx.beginPath();
                      ctx.moveTo(20, y);
                      ctx.lineTo(width - 20, y);
                      ctx.stroke();
                      
                      ctx.fillStyle = isDark ? '#555555' : '#999999';
                      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.fillText(`Generated ${new Date().toLocaleString()} • chatvice.app`, width / 2, y + 20);
                      
                      // Convert to blob
                      const blob = await new Promise<Blob>((resolve) => {
                        canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
                      });
                      
                      const fileName = `chatvice-crypto-${selectedCrypto.symbol}-${Date.now()}.png`;
                      const file = new File([blob], fileName, { type: 'image/png' });
                      
                      // Try Web Share API (mobile gallery)
                      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                          await navigator.share({ files: [file], title: 'Chatvice Crypto Invoice' });
                          toast({ title: "Saved!", description: "Invoice saved to your device" });
                          return;
                        } catch (e) {
                          if ((e as Error).name !== 'AbortError') {
                            console.log('Share cancelled or failed');
                          }
                        }
                      }
                      
                      // Fallback to download
                      const link = document.createElement('a');
                      link.download = fileName;
                      link.href = URL.createObjectURL(blob);
                      link.click();
                      URL.revokeObjectURL(link.href);
                      toast({ title: "Saved!", description: "Invoice downloaded to your device" });
                    } catch (error) {
                      console.error('Save error:', error);
                      toast({ title: "Error", description: "Failed to save image", variant: "destructive" });
                    }
                  }}
                  data-testid="button-save-to-gallery"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save to Gallery
                </Button>

                {/* Quick Instructions */}
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Send exact amount</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Use {selectedCrypto.network} network</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Save transaction hash</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Contact support after</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Payment Button */}
                <Button 
                  size="sm" 
                  className="w-full h-10 crypto-purple-btn"
                  onClick={() => {
                    setShowCryptoDialog(false);
                    setShowConfirmPaymentDialog(true);
                  }}
                  data-testid="button-confirm-crypto-payment"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Confirm Payment
                </Button>

                {/* Partner Logos Footer */}
                <div className="pt-3 mt-2 border-t border-border/30">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    {/* CoinGecko */}
                    <div className="flex items-center gap-1 text-muted-foreground/60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <circle cx="9" cy="10" r="2" fill="currentColor"/>
                        <path d="M8 15c2 2 6 2 8 0" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      </svg>
                      <span className="text-[10px]">CoinGecko</span>
                    </div>
                    {/* Coinbase */}
                    <div className="flex items-center gap-1 text-muted-foreground/60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <rect x="8" y="10" width="8" height="4" rx="1" fill="currentColor"/>
                      </svg>
                      <span className="text-[10px]">Coinbase</span>
                    </div>
                    {/* Binance */}
                    <div className="flex items-center gap-1 text-muted-foreground/60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4L8 8l2 2 2-2 2 2 2-2-4-4zM6 10l-2 2 2 2 2-2-2-2zM18 10l-2 2 2 2 2-2-2-2zM12 12l-2 2 2 2 2-2-2-2zM12 18l2-2-2-2-2 2 2 2z" fill="currentColor"/>
                      </svg>
                      <span className="text-[10px]">Binance</span>
                    </div>
                    {/* Trust Wallet */}
                    <div className="flex items-center gap-1 text-muted-foreground/60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3L4 7v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                      <span className="text-[10px]">Trust</span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground/50">
                    Prices powered by CoinGecko API
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Crypto Payment Dialog - Frosted Glass with Mobile Scroll */}
      <Dialog open={showConfirmPaymentDialog} onOpenChange={(open) => {
        setShowConfirmPaymentDialog(open);
        if (!open) {
          setCryptoTxHash("");
          setCryptoProofFile(null);
          setCryptoProofPreview(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-background/80 dark:bg-background/90 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-500" />
              Confirm Crypto Payment
            </DialogTitle>
            <DialogDescription>
              Upload proof of payment to verify your transaction
            </DialogDescription>
          </DialogHeader>
          
          {selectedCrypto && selectedPlan && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedPlan.name} ({isAnnual ? 'Annual' : 'Monthly'})</span>
                    {billingStatus?.status === 'active' && billingStatus?.planId && selectedPlan?.id !== billingStatus?.planId && (
                      isDowngrade ? (
                        <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">Downgrade</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">Upgrade</Badge>
                      )
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Crypto</span>
                  <span className="font-medium">{selectedCrypto.symbol} ({selectedCrypto.network})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">${(finalPriceUSD * 1.03).toFixed(2)}</span>
                </div>
                {cryptoPrices?.prices?.[selectedCrypto.id] && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crypto Amount</span>
                    <span className="font-medium text-purple-600">
                      {(() => {
                        const price = cryptoPrices.prices[selectedCrypto.id];
                        const amountWithFee = finalPriceUSD * 1.03;
                        const cryptoAmount = amountWithFee / price;
                        const decimals = cryptoPrices.decimals?.[selectedCrypto.id] || 6;
                        return `${cryptoAmount.toFixed(decimals)} ${selectedCrypto.symbol}`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Transaction Hash */}
              <div className="space-y-2">
                <Label htmlFor="txHash">Transaction Hash (TXID)</Label>
                <Input
                  id="txHash"
                  placeholder="Enter your transaction hash..."
                  value={cryptoTxHash}
                  onChange={(e) => setCryptoTxHash(e.target.value)}
                  data-testid="input-crypto-tx-hash"
                />
              </div>
              
              {/* Proof of Payment Upload */}
              <div className="space-y-2">
                <Label>Proof of Payment (Screenshot)</Label>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                  onClick={() => document.getElementById('cryptoProofInput')?.click()}
                >
                  {cryptoProofPreview ? (
                    <div className="space-y-2">
                      <img src={cryptoProofPreview} alt="Proof" className="max-h-40 mx-auto rounded-lg" />
                      <p className="text-xs text-muted-foreground">{cryptoProofFile?.name}</p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                      <p className="text-xs text-muted-foreground/70">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  id="cryptoProofInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast({ title: "File too large", description: "Please upload an image under 5MB", variant: "destructive" });
                        return;
                      }
                      setCryptoProofFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setCryptoProofPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  data-testid="input-crypto-proof-file"
                />
              </div>
              
              {/* Submit Button */}
              <Button
                className="w-full crypto-purple-btn"
                disabled={!cryptoTxHash.trim() || !cryptoProofFile || submittingCryptoPayment}
                onClick={async () => {
                  if (!cryptoTxHash.trim() || !cryptoProofFile || !selectedCrypto || !selectedPlan) return;
                  
                  setSubmittingCryptoPayment(true);
                  try {
                    // Upload proof image first
                    const formData = new FormData();
                    formData.append('file', cryptoProofFile);
                    formData.append('type', 'crypto-payment-proof');
                    
                    const uploadRes = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                      credentials: 'include',
                    });
                    
                    if (!uploadRes.ok) throw new Error('Failed to upload proof image');
                    const uploadData = await uploadRes.json();
                    
                    // Calculate crypto amount
                    let cryptoAmountStr = 'N/A';
                    if (cryptoPrices?.prices?.[selectedCrypto.id]) {
                      const price = cryptoPrices.prices[selectedCrypto.id];
                      const amountWithFee = finalPriceUSD * 1.03;
                      const cryptoAmount = amountWithFee / price;
                      const decimals = cryptoPrices.decimals?.[selectedCrypto.id] || 6;
                      cryptoAmountStr = cryptoAmount.toFixed(decimals);
                    }
                    
                    // Submit payment confirmation
                    const response = await apiRequest('POST', '/api/crypto-payment/confirm', {
                      planId: selectedPlan.id,
                      planName: selectedPlan.name,
                      billingInterval: isAnnual ? 'annual' : 'monthly',
                      isUpgrade: billingStatus?.status === 'active' && billingStatus?.planId && selectedPlan?.id !== billingStatus?.planId && !isDowngrade,
                      isDowngrade: isDowngrade,
                      cryptocurrency: selectedCrypto.symbol,
                      network: selectedCrypto.network,
                      amountUsd: Math.round(finalPriceUSD * 1.03 * 100), // in cents
                      amountCrypto: cryptoAmountStr,
                      walletAddress: selectedCrypto.address,
                      transactionHash: cryptoTxHash.trim(),
                      proofImageUrl: uploadData.url,
                    });
                    
                    toast({ 
                      title: "Payment Submitted!", 
                      description: "We'll verify your payment and activate your subscription within 1-2 hours." 
                    });
                    setShowConfirmPaymentDialog(false);
                    setCryptoTxHash("");
                    setCryptoProofFile(null);
                    setCryptoProofPreview(null);
                    navigate('/dashboard/billing');
                  } catch (error) {
                    console.error('Submit error:', error);
                    toast({ 
                      title: "Submission Failed", 
                      description: "Please try again or contact support", 
                      variant: "destructive" 
                    });
                  } finally {
                    setSubmittingCryptoPayment(false);
                  }
                }}
                data-testid="button-submit-crypto-confirmation"
              >
                {submittingCryptoPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Payment Confirmation
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
