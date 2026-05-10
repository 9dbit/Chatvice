import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import binanceLogo from "@assets/binance_nobg.png";
import mastercardLogo from "@assets/mastercard_nobg.png";
import paypalLogo from "@assets/paypal_nobg.png";
import visaLogo from "@assets/visa_nobg.png";
import trustWalletLogo from "@assets/trustwallet_nobg.png";
import twelvePayLogo from "@assets/twelvepay_nobg.png";
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
import chatviceLogoImg from "@assets/Chatvice-02_1778420788538.png";
import chatviceCryptoLogo from "@assets/Chatvice-04_1767550221276.png";
import qrisLogoImg from "@assets/IMG_6802_1778414496751.jpeg";

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
  { id: 'qris', name: 'QRIS', description: 'All e-wallets & mobile banking', icon: QrCode, available: true, provider: '12Pay' },
  { id: 'virtual_account', name: 'Virtual Account', description: 'Automatic verification', icon: CreditCard, available: true, provider: '12Pay' },
  { id: 'bank_transfer', name: 'Bank Transfer', description: 'Transfer to merchant account', icon: Building2, available: true, provider: '12Pay' },
  { id: 'paypal', name: 'PayPal', description: 'Pay with PayPal account or credit card', icon: () => <SiPaypal className="w-5 h-5" />, available: true, provider: 'PayPal' },
  { id: 'ewallet', name: 'E-Wallet', description: 'Use QRIS for e-wallets', icon: Wallet, available: false, provider: '12Pay' },
  { id: 'payment_link', name: 'Payment Link', description: 'Share checkout link to others', icon: Link2, available: true, provider: 'Share' },
  { id: 'credit_card', name: 'Credit Card', description: 'Coming soon via PayPal', icon: CreditCard, available: false, provider: 'PayPal' },
  { id: 'crypto', name: 'Cryptocurrency', description: 'Pay with BTC, ETH, SOL, BNB, USDT, XRP', icon: Bitcoin, available: true, provider: 'Manual' },
];

// 12Pay QRIS maximum limit per transaction
const QRIS_MAX_LIMIT_IDR = 10000000;

// 12Pay VA uses numeric bank codes - Active banks per 12Pay credential
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
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get('plan');
  const billingInterval = urlParams.get('interval') || 'monthly';
  const promoCode = urlParams.get('promo') || '';
  const resumeTransactionId = urlParams.get('resume');
  const fromPage = urlParams.get('from') || 'plans';
  const invoiceId = urlParams.get('invoiceId'); // Custom plan invoice ID for direct invoice checkout
  const addonType = urlParams.get('addon'); // Addon type for additional services checkout
  
  const isAnnual = billingInterval === 'annual';
  const isResumeMode = Boolean(resumeTransactionId);
  const isInvoiceMode = Boolean(invoiceId); // Check if this is an invoice checkout
  const isAddonMode = Boolean(addonType); // Check if this is an addon checkout
  
  // Smart back button navigation
  const handleBack = () => {
    navigate('/dashboard/plans');
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
  const [showPendingPaymentWarning, setShowPendingPaymentWarning] = useState(false);
  const [cancellingPending, setCancellingPending] = useState(false);
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoProofFile, setCryptoProofFile] = useState<File | null>(null);
  const [cryptoProofPreview, setCryptoProofPreview] = useState<string | null>(null);
  const [submittingCryptoPayment, setSubmittingCryptoPayment] = useState(false);
  const [priceLoadingProgress, setPriceLoadingProgress] = useState(0);
  
  // Bank transfer proof upload states
  const [bankProofFile, setBankProofFile] = useState<File | null>(null);
  const [bankProofPreview, setBankProofPreview] = useState<string | null>(null);
  const [submittingBankProof, setSubmittingBankProof] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: billingStatus, isLoading: billingLoading } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });

  const { data: gatewayStatus } = useQuery<{
    configured: boolean;
    availableMethods: string[] | null;
    methodStatus: Record<string, string> | null;
  }>({
    queryKey: ["/api/billing/gateway-status"],
    staleTime: 5 * 60 * 1000,
  });

  // Map checkout method IDs → gateway method keys
  const CHECKOUT_TO_GATEWAY: Record<string, string> = { qris: 'qris', virtual_account: 'va', payment_link: 'payment_link' };
  const isMethodNotRegistered = (methodId: string): boolean => {
    const gk = CHECKOUT_TO_GATEWAY[methodId];
    if (!gk || !gatewayStatus?.availableMethods) return false;
    return !gatewayStatus.availableMethods.includes(gk);
  };

  // Auto-switch selected payment method if the current one is not registered
  useEffect(() => {
    if (!gatewayStatus?.availableMethods) return;
    if (!isMethodNotRegistered(selectedPaymentMethod)) return;
    const fallback = PAYMENT_METHODS.find(m => m.available && !isMethodNotRegistered(m.id));
    if (fallback) setSelectedPaymentMethod(fallback.id);
  }, [gatewayStatus]);
  
  const { data: exchangeRateData, isLoading: exchangeLoading } = useQuery<ExchangeRateData>({
    queryKey: ["/api/exchange-rate"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch addon configs for addon mode
  const { data: addonConfigs = [] } = useQuery<any[]>({
    queryKey: ["/api/addon-configs"],
    enabled: isAddonMode,
  });
  const selectedAddonConfig = addonConfigs.find((c: any) => c.addonType === addonType);
  
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
    paymentMethod?: string;
  }
  
  const { data: pendingInvoices = [], isLoading: invoicesLoading } = useQuery<CustomPlanInvoice[]>({
    queryKey: ["/api/merchant/custom-invoices/pending"],
    enabled: planId === "custom" && !isInvoiceMode,
  });
  
  // Fetch specific invoice by ID when in invoice mode
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery<CustomPlanInvoice>({
    queryKey: ["/api/merchant/custom-invoices", invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/merchant/custom-invoices/${invoiceId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: isInvoiceMode,
  });
  
  // Get the first pending invoice for custom plan pricing
  const pendingCustomInvoice = isInvoiceMode 
    ? invoiceData
    : (planId === "custom" && pendingInvoices.length > 0 
        ? pendingInvoices.find(inv => inv.billingInterval === billingInterval) || pendingInvoices[0]
        : null);
  
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
  
  const isInitialLoading = billingLoading || exchangeLoading || plansLoading || (isResumeMode && resumeLoading) || (planId === "custom" && invoicesLoading) || (isInvoiceMode && invoiceLoading);

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
    mutationFn: async (params: { planId?: string; billingInterval?: string; paymentMethod: PaymentMethod; bankCode?: string; senderName?: string; senderBank?: string; promoCode?: string; invoiceId?: string; addonType?: string }) => {
      const response = await apiRequest("POST", "/api/billing/checkout-v2", params);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.addonType) {
        queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      }
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
        toast({ title: t("dashboard.checkout.toast.paypalIntegration"), description: t("dashboard.checkout.toast.creditCardPaymentViaDesc") });
      }
    },
    onError: (error: Error) => {
      setPaymentStep('select_method');
      let errorMsg = error.message || "Failed to create payment. Please try again.";
      try {
        const jsonStart = errorMsg.indexOf('{');
        if (jsonStart >= 0) {
          const parsed = JSON.parse(errorMsg.substring(jsonStart));
          errorMsg = parsed.error || parsed.message || errorMsg;
        }
      } catch {}
      toast({
        title: t("dashboard.checkout.toast.error"),
        description: errorMsg,
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
            queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
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

  // Check if there's an existing pending payment that's different from current checkout
  const hasExistingPendingPayment = billingStatus?.pendingTransaction?.transactionId && 
    billingStatus?.pendingTransaction?.status === 'PENDING';
  
  // Check if there are pending custom invoices (excluding current invoice being paid)
  const hasPendingCustomInvoices = pendingInvoices.filter(inv => 
    inv.status === 'pending' && (!isInvoiceMode || inv.id !== invoiceId)
  ).length > 0;
  
  // Combined check for any pending payment
  const hasAnyPendingPayment = hasExistingPendingPayment || hasPendingCustomInvoices;

  const handleProceedToPayment = () => {
    if (!termsAccepted) return;

    if ((selectedPaymentMethod === 'virtual_account' || selectedPaymentMethod === 'bank_transfer') && !selectedBank) {
      toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.pleaseSelectABankDesc"), variant: "destructive" });
      return;
    }

    // Addon mode - no pending payment check needed
    if (isAddonMode && addonType) {
      if (selectedPaymentMethod === 'crypto') {
        setPaymentStep('crypto');
        return;
      }
      setPaymentStep('loading');
      checkoutMutation.mutate({
        addonType,
        paymentMethod: selectedPaymentMethod,
        bankCode: selectedBank || undefined,
      });
      return;
    }

    // For invoice mode, we need invoice data; for standard plans, we need selectedPlan
    if (!isInvoiceMode && !selectedPlan) return;
    if (isInvoiceMode && !invoiceData) return;
    
    // Check for existing pending payment - show warning dialog
    if (hasExistingPendingPayment && paymentStep === 'select_method') {
      setShowPendingPaymentWarning(true);
      return;
    }
    
    // Handle crypto payment locally (no API call needed)
    if (selectedPaymentMethod === 'crypto') {
      setPaymentStep('crypto');
      return;
    }
    
    setPaymentStep('loading');
    
    // For invoice mode, use the standard checkout with invoiceId
    if (isInvoiceMode && invoiceData) {
      checkoutMutation.mutate({
        planId: 'custom',  // Custom plan for invoice checkout
        billingInterval: invoiceData.billingInterval || 'monthly',
        paymentMethod: selectedPaymentMethod,
        bankCode: selectedBank || undefined,
        invoiceId: invoiceData.id,  // Pass specific invoice ID
      });
    } else if (selectedPlan) {
      // Standard plan checkout
      checkoutMutation.mutate({
        planId: selectedPlan.id,
        billingInterval: isAnnual ? 'annual' : 'monthly',
        paymentMethod: selectedPaymentMethod,
        bankCode: selectedBank || undefined,
        promoCode: promoCode || undefined,
      });
    }
  };
  
  // Handle cancelling existing payment and proceeding with new order
  const handleCancelAndProceed = async () => {
    setCancellingPending(true);
    try {
      const response = await fetch('/api/billing/cancel-pending', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        // Invalidate billing status to refresh pending payment info
        await queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
        setShowPendingPaymentWarning(false);
        toast({ title: t("dashboard.checkout.toast.previousOrderCancelled"), description: t("dashboard.checkout.toast.proceedingWithNewOrderDesc") });
        
        // Now proceed with the actual payment
        if (selectedPaymentMethod === 'crypto') {
          setPaymentStep('crypto');
        } else {
          setPaymentStep('loading');
          if (isInvoiceMode && invoiceData) {
            checkoutMutation.mutate({
              planId: 'custom',
              billingInterval: invoiceData.billingInterval || 'monthly',
              paymentMethod: selectedPaymentMethod,
              bankCode: selectedBank || undefined,
              invoiceId: invoiceData.id,
            });
          } else if (selectedPlan) {
            checkoutMutation.mutate({
              planId: selectedPlan.id,
              billingInterval: isAnnual ? 'annual' : 'monthly',
              paymentMethod: selectedPaymentMethod,
              bankCode: selectedBank || undefined,
              promoCode: promoCode || undefined,
            });
          }
        }
      } else {
        toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToCancelPreviousDesc"), variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToCancelPreviousDesc"), variant: "destructive" });
    } finally {
      setCancellingPending(false);
    }
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
        toast({ title: t("dashboard.checkout.toast.transactionCanceled"), description: t("dashboard.checkout.toast.youCanNowStartDesc") });
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
        toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToCancelTransactionDesc"), variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToCancelTransactionDesc"), variant: "destructive" });
    }
  };

  const handleSaveQRIS = async () => {
    if (!qrisData) return;
    
    try {
      const container = document.getElementById('qris-code-container');
      const svgElement = container?.querySelector('svg');
      
      if (svgElement && qrisData.qrisString) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        
        // Create clean compact invoice matching the new compact UI
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Compact card dimensions
        const cardWidth = 400;
        const cardHeight = 520;
        canvas.width = cardWidth;
        canvas.height = cardHeight;
        
        // Light grey background
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(0, 0, cardWidth, cardHeight);
        
        // White card with rounded corners
        const cardX = 16;
        const cardY = 16;
        const cardInnerWidth = cardWidth - 32;
        const cardInnerHeight = cardHeight - 32;
        const borderRadius = 14;
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardInnerWidth, cardInnerHeight, borderRadius);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        
        // ── HEADER (compact: h-6 logo + 9px subtitle) ──
        const headerHeight = 56;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cardX, cardY, cardInnerWidth, headerHeight);
        ctx.strokeStyle = '#d1d5db';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cardX + 16, cardY + headerHeight);
        ctx.lineTo(cardX + cardInnerWidth - 16, cardY + headerHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Load logos in parallel
        const chatviceLogo = new Image();
        chatviceLogo.crossOrigin = 'anonymous';
        const qrisLogo = new Image();
        qrisLogo.crossOrigin = 'anonymous';
        await Promise.all([
          new Promise<void>(res => { chatviceLogo.onload = res; chatviceLogo.onerror = res; chatviceLogo.src = chatviceLogoImg; }),
          new Promise<void>(res => { qrisLogo.onload = res; qrisLogo.onerror = res; qrisLogo.src = qrisLogoImg; }),
        ]);
        
        // Chatvice logo: h-6 = 24px
        const logoX = cardX + 16;
        const logoY = cardY + 10;
        const chatviceLogoH = 24;
        const chatviceLogoW = chatviceLogo.naturalWidth && chatviceLogo.naturalHeight
          ? (chatviceLogo.naturalWidth / chatviceLogo.naturalHeight) * chatviceLogoH : 100;
        if (chatviceLogo.complete && chatviceLogo.naturalWidth > 0) {
          ctx.drawImage(chatviceLogo, logoX, logoY, chatviceLogoW, chatviceLogoH);
        } else {
          ctx.fillStyle = '#8b5cf6';
          ctx.font = 'bold 15px system-ui';
          ctx.textAlign = 'left';
          ctx.fillText('Chatvice', logoX, logoY + 18);
        }
        // "Subscription Payment" subtitle — line below logo (9px)
        ctx.fillStyle = '#71717a';
        ctx.font = '9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Subscription Payment', logoX, logoY + chatviceLogoH + 10);
        
        // QRIS logo: w-16 h-8 = 60×30px, object-contain
        const qrisW = 60;
        const qrisH = 30;
        const qrisBadgeX = cardX + cardInnerWidth - qrisW - 14;
        const qrisBadgeY = cardY + (headerHeight - qrisH) / 2;
        if (qrisLogo.complete && qrisLogo.naturalWidth > 0) {
          const ratio = Math.min(qrisW / qrisLogo.naturalWidth, qrisH / qrisLogo.naturalHeight);
          const dw = qrisLogo.naturalWidth * ratio;
          const dh = qrisLogo.naturalHeight * ratio;
          ctx.drawImage(qrisLogo, qrisBadgeX + (qrisW - dw) / 2, qrisBadgeY + (qrisH - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = '#18181b';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('QRIS', qrisBadgeX + qrisW / 2, qrisBadgeY + qrisH / 2 + 4);
        }
        
        // ── SCAN TO PAY area ──
        let cy = cardY + headerHeight + 14;
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCAN TO PAY', cardWidth / 2, cy);
        cy += 13;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '9px system-ui, -apple-system, sans-serif';
        ctx.fillText(t('dashboard.checkout.useEwalletOrMobileBanking'), cardWidth / 2, cy);
        cy += 12;
        
        // ── QR Code: size 160, padding 8 ──
        const qrSize = 160;
        const qrPad = 8;
        const qrBoxSize = qrSize + qrPad * 2;
        const qrX = (cardWidth - qrBoxSize) / 2;
        const qrY = cy;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, 10);
        ctx.fill();
        ctx.stroke();
        
        const qrImg = new Image();
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => { ctx.drawImage(qrImg, qrX + qrPad, qrY + qrPad, qrSize, qrSize); resolve(); };
          qrImg.onerror = reject;
          qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });
        cy += qrBoxSize + 10;
        
        // ── Bank pills (text-[7px], px-1 = 4px padding each side) ──
        const banks = [
          { name: "GoPay",     bg: "#00AED6", fg: "#ffffff" },
          { name: "OVO",       bg: "#4C3494", fg: "#ffffff" },
          { name: "DANA",      bg: "#108BE3", fg: "#ffffff" },
          { name: "ShopeePay",bg: "#EE4D2D", fg: "#ffffff" },
          { name: "LinkAja",  bg: "#E82529", fg: "#ffffff" },
          { name: "BCA",      bg: "#003A6F", fg: "#ffffff" },
          { name: "Mandiri",  bg: "#003087", fg: "#F5A623" },
          { name: "BRI",      bg: "#003282", fg: "#ffffff" },
          { name: "BNI",      bg: "#F78220", fg: "#ffffff" },
          { name: "CIMB",     bg: "#CC0000", fg: "#ffffff" },
        ];
        const pillH = 12;
        const pillR = 2;
        const pillGapX = 3;
        const pillGapY = 3;
        const pillFont = 'bold 7px system-ui, -apple-system, sans-serif';
        ctx.font = pillFont;
        const pillWidths = banks.map(b => ctx.measureText(b.name).width + 8);
        const rowMaxW = cardInnerWidth - 32;
        let rowStart = 0;
        const rows: number[][] = [];
        while (rowStart < banks.length) {
          let rowW = 0; let end = rowStart;
          while (end < banks.length && rowW + pillWidths[end] + (end > rowStart ? pillGapX : 0) <= rowMaxW) {
            rowW += pillWidths[end] + (end > rowStart ? pillGapX : 0); end++;
          }
          if (end === rowStart) end = rowStart + 1;
          rows.push(banks.slice(rowStart, end).map((_, i) => rowStart + i));
          rowStart = end;
        }
        for (const row of rows) {
          const totalW = row.reduce((s, i) => s + pillWidths[i], 0) + (row.length - 1) * pillGapX;
          let px = (cardWidth - totalW) / 2;
          for (const i of row) {
            const b = banks[i]; const pw = pillWidths[i];
            ctx.fillStyle = b.bg;
            ctx.beginPath(); ctx.roundRect(px, cy, pw, pillH, pillR); ctx.fill();
            ctx.fillStyle = b.fg; ctx.font = pillFont;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(b.name, px + pw / 2, cy + pillH / 2);
            px += pw + pillGapX;
          }
          cy += pillH + pillGapY;
        }
        ctx.textBaseline = 'alphabetic';
        cy += 10;
        
        // ── ORDER DETAILS (2-column sub-grid matching on-screen layout) ──
        const detailsX = cardX + 16;
        const detailsW = cardInnerWidth - 32;

        // Section label
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(detailsX, cy, 3, 12);
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ORDER DETAILS', detailsX + 8, cy + 10);
        cy += 18;

        // 2-column card layout
        const subCardY = cy;
        const subCardPad = 8;
        const subCardGap = 6;
        const subColW = Math.floor((detailsW - subCardPad * 2 - subCardGap) / 2);
        const leftColX = detailsX + subCardPad;
        const rightColX = leftColX + subColW + subCardGap;

        // Calculate left-column height:
        // PRODUCT label(11) + value(13) + gap(4) + PERIOD label(11) + value(13) + divider(12) + ORDER ID label(11) + value(11) = 86
        const subCardInnerH = 86;
        const subCardH = subCardInnerH + subCardPad * 2;

        // Card background
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.roundRect(detailsX, subCardY, detailsW, subCardH, 6);
        ctx.fill();

        // ── Left column: Product / Period / Order ID ──
        let lcy = subCardY + subCardPad;

        // Product
        ctx.fillStyle = '#9ca3af'; ctx.font = '8px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('PRODUCT', leftColX, lcy);
        lcy += 11;
        ctx.fillStyle = '#111827'; ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${qrisData.planName} Plan`, leftColX, lcy);
        lcy += 13;
        lcy += 4; // gap

        // Period
        ctx.fillStyle = '#9ca3af'; ctx.font = '8px system-ui, -apple-system, sans-serif';
        ctx.fillText('PERIOD', leftColX, lcy);
        lcy += 11;
        ctx.fillStyle = '#111827'; ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.fillText(qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly', leftColX, lcy);
        lcy += 13;
        lcy += 5; // gap before divider

        // Dashed divider
        ctx.strokeStyle = '#d1d5db'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftColX, lcy);
        ctx.lineTo(leftColX + subColW, lcy);
        ctx.stroke();
        ctx.setLineDash([]);
        lcy += 7;

        // Order ID
        ctx.fillStyle = '#9ca3af'; ctx.font = '8px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ORDER ID', leftColX, lcy);
        lcy += 11;
        ctx.fillStyle = '#374151'; ctx.font = '7px monospace';
        const shortOrderId = qrisData.orderId.length > 22 ? qrisData.orderId.slice(-22) : qrisData.orderId;
        ctx.fillText(shortOrderId, leftColX, lcy);

        // ── Right column: Total amount + countdown ──
        let rcy = subCardY + subCardPad;

        // Total Payment gradient box
        const totalBoxH = 52;
        const totalGrad = ctx.createLinearGradient(rightColX, rcy, rightColX + subColW, rcy + totalBoxH);
        totalGrad.addColorStop(0, 'rgba(124,58,237,0.05)');
        totalGrad.addColorStop(1, 'rgba(124,58,237,0.10)');
        ctx.fillStyle = totalGrad;
        ctx.beginPath(); ctx.roundRect(rightColX, rcy, subColW, totalBoxH, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(124,58,237,0.20)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(rightColX, rcy, subColW, totalBoxH, 6); ctx.stroke();

        ctx.fillStyle = '#6b7280'; ctx.font = '8px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(t('dashboard.checkout.totalPayment').toUpperCase(), rightColX + subColW / 2, rcy + 8);
        ctx.fillStyle = '#7c3aed'; ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`Rp ${(qrisData.amount || 0).toLocaleString('id-ID')}`, rightColX + subColW / 2, rcy + 38);
        if (qrisData.amountUSD) {
          ctx.fillStyle = '#9ca3af'; ctx.font = '7px system-ui, -apple-system, sans-serif';
          ctx.fillText(`≈ $${qrisData.amountUSD.toFixed(2)} USD`, rightColX + subColW / 2, rcy + 50);
        }
        rcy += totalBoxH + 5;

        // Countdown timer box (amber)
        const timerBoxH = 26;
        const remainMins = Math.floor(timeRemaining / 60);
        const remainSecs = timeRemaining % 60;
        const timerStr = `${String(remainMins).padStart(2, '0')}:${String(remainSecs).padStart(2, '0')}`;
        ctx.fillStyle = '#fffbeb';
        ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(rightColX, rcy, subColW, timerBoxH, 5); ctx.fill(); ctx.stroke();

        // Clock icon (circle + hands)
        const clkX = rightColX + 10;
        const clkY = rcy + timerBoxH / 2;
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(clkX, clkY, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(clkX, clkY); ctx.lineTo(clkX, clkY - 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(clkX, clkY); ctx.lineTo(clkX + 2.5, clkY); ctx.stroke();

        // Timer text
        ctx.fillStyle = '#b45309'; ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(timerStr, rightColX + subColW / 2 + 5, rcy + timerBoxH / 2);

        ctx.textBaseline = 'alphabetic';
        cy += subCardH;
        
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
              title: t("dashboard.checkout.toast.invoiceSaved"),
              description: t("dashboard.checkout.toast.invoiceHasBeenSavedDesc"),
            });
          }
        }, 'image/jpeg', 0.95);
      } else {
        toast({
          title: t("dashboard.checkout.toast.error"),
          description: t("dashboard.checkout.toast.noQrisDataAvailableDesc"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to save QRIS:", err);
      toast({
        title: t("dashboard.checkout.toast.error"),
        description: t("dashboard.checkout.toast.failedToSaveInvoiceDesc"),
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("dashboard.checkout.toast.copied"), description: t("dashboard.checkout.toast.copiedToClipboardDesc") });
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
          title: t("dashboard.checkout.toast.paymentSuccessful"), 
          description: t("dashboard.checkout.toast.yourSubscriptionHasBeenDesc") 
        });
        // Clear cache and redirect to billing
        queryClient.invalidateQueries({ queryKey: ['/api/merchant/current'] });
        queryClient.invalidateQueries({ queryKey: ['/api/billing'] });
        setTimeout(() => {
          navigate('/dashboard/billing');
        }, 1500);
      } else {
        toast({ 
          title: t("dashboard.checkout.toast.demoPaymentTriggered"), 
          description: data.message || "Processing..." 
        });
      }
    } catch (err) {
      console.error("Demo payment error:", err);
      toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToProcessDemoDesc"), variant: "destructive" });
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
  
  // In resume mode, invoice mode, or addon mode, we don't need planId - show payment directly
  if (!isResumeMode && !isInvoiceMode && !isAddonMode && (!planId || !selectedPlan)) {
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
  
  // Invoice mode requires valid invoice
  if (isInvoiceMode && !invoiceData) {
    return (
      <div className="max-w-lg mx-auto py-6 px-4 md:py-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-semibold">Invoice Payment</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h2 className="text-base font-semibold">Invoice Not Found</h2>
            <p className="text-[11px] text-muted-foreground">The invoice could not be found or is no longer available.</p>
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
  const isCustomPlanWithInvoice = (planId === "custom" && pendingCustomInvoice) || isInvoiceMode;
  
  // For invoice mode or custom plans, use invoice amount (in USD). For standard plans, use plan prices
  const priceUSD = isAddonMode && selectedAddonConfig
    ? (selectedAddonConfig.monthlyPriceUsd || 0)  // Addon price in USD
    : isInvoiceMode && invoiceData
      ? invoiceData.amount  // Invoice amount is in USD
      : (planId === "custom" && pendingCustomInvoice)
        ? pendingCustomInvoice.amount  // Invoice amount is in USD
        : selectedPlan ? (isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0)) : 0;
  
  const promo = selectedPlan ? getPromoForPlan(selectedPlan.id) : null;
  // Don't apply promo discount for custom plan invoices (price is already finalized by sales)
  const discountPercent = isCustomPlanWithInvoice ? 0 : (promo?.discountPercent || 0);
  
  // Calculate USD price after discount
  const discountAmountUSD = priceUSD * discountPercent / 100;
  const priceAfterDiscountUSD = Math.max(0, priceUSD - discountAmountUSD);
  
  // Credit amount in USD (for proration)
  const creditAmountUSD = prorationInfo?.prorationApplied && prorationInfo?.creditAmount 
    ? prorationInfo.creditAmount 
    : 0;
  
  // Convert to IDR for Indonesian payment methods (QRIS, VA, Bank Transfer)
  const priceIDR = Math.round(priceAfterDiscountUSD * exchangeRate);
  const discountAmountIDR = Math.round(discountAmountUSD * exchangeRate);
  const creditAmountIDR = Math.round(creditAmountUSD * exchangeRate);
  
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
  
  const isUpgrade = billingStatus?.status === 'active' && 
                    billingStatus?.planId && 
                    selectedPlan?.id !== billingStatus?.planId && 
                    !isDowngrade;
  
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
    : isCustomPlanWithInvoice && pendingCustomInvoice
      ? pendingCustomInvoice.billingInterval 
      : (isAnnual ? 'annual' : 'monthly');

  return (
    <div className="max-w-4xl mx-auto py-2 px-4 md:py-3 space-y-3">
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
                  <h2 className="text-sm font-semibold">
                    {isAddonMode 
                      ? (selectedAddonConfig?.name || 'Additional Service')
                      : isInvoiceMode && invoiceData 
                        ? 'Custom Plan' 
                        : selectedPlan?.name || 'Custom Plan'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isAddonMode 
                      ? 'Chatvice Add-on — Monthly'
                      : isInvoiceMode && invoiceData 
                        ? invoiceData.invoiceNumber 
                        : 'Chatvice Subscription'}
                  </p>
                </div>
              </div>
              
              <div className="mx-4 mb-4 rounded-lg bg-primary/5 border border-primary/10 overflow-hidden">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Starting today</p>
                    <p className="text-sm font-bold">
                      {isAddonMode 
                        ? `$${selectedAddonConfig?.monthlyPriceUsd?.toFixed(2) || '12.00'}/month`
                        : `$${finalPriceUSD.toFixed(2)}/${isAnnual ? 'year' : 'month'}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">
                    Monthly
                  </Badge>
                </div>
                
                {(discountPercent > 0 || creditAmountUSD > 0) && (
                  <div className="px-3 pb-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Normal price</span>
                      <span>${priceUSD.toFixed(2)}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Promo discount ({discountPercent}%)</span>
                        <span>- ${discountAmountUSD.toFixed(2)}</span>
                      </div>
                    )}
                    {creditAmountUSD > 0 && (
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>{t("dashboard.checkout.creditFromPrevious")}</span>
                        <span>- ${creditAmountUSD.toFixed(2)}</span>
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
                  <span>{t("dashboard.checkout.pricesInUSD")}</span>
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
                  {selectedPaymentMethod === 'payment_link' ? 'Use share buttons on the right' : selectedPaymentMethod === 'paypal' ? 'Use PayPal button on the right' : isAddonMode ? `Subscribe • $${selectedAddonConfig?.monthlyPriceUsd?.toFixed(2) || '12.00'}/mo` : `Subscribe • $${finalPriceUSD.toFixed(2)}`}
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
                    const isOverLimit = method.id === 'qris' && isQrisOverLimit;
                    const isNotRegistered = isMethodNotRegistered(method.id);
                    const isDisabled = isOverLimit || isNotRegistered;
                    
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
                              {isOverLimit
                                ? `Max Rp ${QRIS_MAX_LIMIT_IDR.toLocaleString('id-ID')} per transaction`
                                : isNotRegistered
                                  ? 'Not activated on this payment account'
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
                                    toast({ title: t("dashboard.checkout.toast.linkCopied"), description: t("dashboard.checkout.toast.checkoutLinkCopiedToDesc") });
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
                                    const text = `Checkout ${selectedPlan?.name || 'Plan'} - $${finalPriceUSD.toFixed(2)}`;
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
                                    const text = `Checkout ${selectedPlan?.name || 'Plan'} - $${finalPriceUSD.toFixed(2)}`;
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
                                        toast({ title: t("dashboard.checkout.toast.paymentSuccessful"), description: `Your ${data.planName} subscription has been activated.` });
                                      } else {
                                        toast({ title: t("dashboard.checkout.toast.paymentReceived"), description: t("dashboard.checkout.toast.yourSubscriptionIsBeingDesc") });
                                      }
                                      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                                      navigate('/dashboard/billing');
                                    }}
                                    onError={(error) => {
                                      console.error("PayPal payment error:", error);
                                      toast({ title: t("dashboard.checkout.toast.paymentFailed"), description: t("dashboard.checkout.toast.pleaseTryAgainOrDesc"), variant: "destructive" });
                                    }}
                                    onCancel={() => {
                                      toast({ title: t("dashboard.checkout.toast.paymentCancelled"), description: t("dashboard.checkout.toast.youCanTryAgainDesc") });
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
                  
                  {/* Pending activation notice — shown when any gateway method is not_registered */}
                  {gatewayStatus?.methodStatus && Object.values(gatewayStatus.methodStatus).some(s => s === 'not_registered') && (
                    <div className="flex gap-2 mt-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" data-testid="banner-methods-not-registered">
                      <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300 leading-snug">
                          {(() => {
                            const METHOD_LABELS: Record<string, string> = { qris: 'QRIS', va: 'Virtual Account', payment_link: 'Payment Link' };
                            const pending = Object.entries(gatewayStatus.methodStatus!)
                              .filter(([, s]) => s === 'not_registered')
                              .map(([k]) => METHOD_LABELS[k] ?? k);
                            return pending.length === 1
                              ? `${pending[0]} is pending activation`
                              : `${pending.join(' and ')} are pending activation`;
                          })()}
                        </p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                          These payment methods have not yet been registered with the payment gateway. Please contact support to activate them.
                        </p>
                      </div>
                    </div>
                  )}

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
                <span>All prices shown in USD</span>
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
                {selectedPaymentMethod === 'payment_link' ? 'Use share buttons above' : selectedPaymentMethod === 'paypal' ? 'Use PayPal button above' : isAddonMode ? `Subscribe • $${selectedAddonConfig?.monthlyPriceUsd?.toFixed(2) || '12.00'}/mo` : `Subscribe • $${finalPriceUSD.toFixed(2)}`}
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
            className="relative bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200" 
            id="qris-receipt"
          >
            {/* Top Header with Logos */}
            <div className="bg-white px-4 py-2 border-b border-dashed border-gray-300">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  {/* Chatvice Real Logo */}
                  <img src={chatviceLogoImg} alt="Chatvice" className="h-6 w-auto object-contain object-left" />
                  <p className="text-[9px] text-gray-500 leading-none">Subscription Payment</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  {/* QRIS Logo - enlarged 3x */}
                  <div className="w-48 h-24 rounded flex items-center justify-center bg-white">
                    <img src={qrisLogoImg} alt="QRIS" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative p-3 bg-white">
              {/* Ticket Notch Left */}
              <div className="hidden sm:block absolute -left-2 top-1/2 w-4 h-8 bg-gray-100 rounded-r-full -translate-y-1/2"></div>
              {/* Ticket Notch Right */}
              <div className="hidden sm:block absolute -right-2 top-1/2 w-4 h-8 bg-gray-100 rounded-l-full -translate-y-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Column - QR Code */}
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-center">
                    <h4 className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Scan to Pay</h4>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400">{t("dashboard.checkout.useEwalletOrMobileBanking")}</p>
                  </div>
                  
                  {/* QR Code Container */}
                  <div className="relative p-2 bg-white rounded-xl shadow-sm border-2 border-gray-100 dark:border-zinc-700" id="qris-code-container">
                    {qrisData.qrisString ? (
                      <QRCodeSVG 
                        value={qrisData.qrisString}
                        size={160}
                        level="M"
                        includeMargin={false}
                        className="w-36 h-36"
                        data-testid="img-qris-code"
                      />
                    ) : qrisData.qrisImage ? (
                      <img 
                        src={qrisData.qrisImage} 
                        alt="QRIS Payment Code" 
                        className="w-36 h-36 object-contain"
                        data-testid="img-qris-code"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center bg-gray-50 rounded">
                        <p className="text-xs text-gray-400 text-center px-4">{t("dashboard.checkout.qrCodeNotAvailable")}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Supported Apps - Bank/Wallet Logo Pills */}
                  <div className="flex flex-wrap justify-center gap-1 max-w-[240px]">
                    {[
                      { name: "GoPay",      bg: "#00AED6", text: "#fff" },
                      { name: "OVO",        bg: "#4C3494", text: "#fff" },
                      { name: "DANA",       bg: "#108BE3", text: "#fff" },
                      { name: "ShopeePay", bg: "#EE4D2D", text: "#fff" },
                      { name: "LinkAja",   bg: "#E82529", text: "#fff" },
                      { name: "BCA",       bg: "#003A6F", text: "#fff" },
                      { name: "Mandiri",   bg: "#003087", text: "#F5A623" },
                      { name: "BRI",       bg: "#003282", text: "#fff" },
                      { name: "BNI",       bg: "#F78220", text: "#fff" },
                      { name: "CIMB",      bg: "#CC0000", text: "#fff" },
                    ].map((b) => (
                      <span
                        key={b.name}
                        style={{ backgroundColor: b.bg, color: b.text }}
                        className="text-[7px] font-bold px-1 py-0.5 rounded-sm leading-none"
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Right Column - Details */}
                <div className="flex flex-col justify-center space-y-2">
                  {/* Dashed Divider - Mobile */}
                  <div className="md:hidden border-t border-dashed border-gray-300 dark:border-zinc-600 -mx-3 px-3"></div>

                  {/* Order Details label */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Order Details</span>
                  </div>

                  {/* 2-column sub-grid: left = order rows, right = total + timer */}
                  <div className="grid grid-cols-2 min-[320px]:grid-cols-2 gap-2 bg-gray-100 dark:bg-zinc-800 rounded-lg p-2">
                    {/* Left: order detail rows */}
                    <div className="flex flex-col justify-center space-y-1">
                      <div className="flex flex-col text-[11px]">
                        <span className="text-gray-500 dark:text-gray-400 text-[9px] uppercase tracking-wider">Product</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{qrisData.planName} Plan</span>
                      </div>
                      <div className="flex flex-col text-[11px]">
                        <span className="text-gray-500 dark:text-gray-400 text-[9px] uppercase tracking-wider">Period</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{qrisData.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</span>
                      </div>
                      <div className="border-t border-dashed border-gray-300 dark:border-zinc-600 pt-1">
                        <span className="text-gray-500 dark:text-gray-400 text-[9px] uppercase tracking-wider">Order ID</span>
                        <button
                          onClick={() => copyToClipboard(qrisData.orderId)}
                          className="font-mono text-[9px] text-gray-600 dark:text-gray-400 hover:text-primary flex items-center gap-0.5 mt-0.5"
                          title="Click to copy"
                        >
                          <span className="break-all leading-tight">{qrisData.orderId}</span>
                          <Copy className="w-2.5 h-2.5 flex-shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Right: total amount + countdown */}
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-full text-center py-2 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl border border-primary/20">
                        <p className="text-[8px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Total Payment</p>
                        <div className="text-base font-bold text-primary leading-tight" data-testid="text-qris-amount">
                          Rp {(qrisData.amount || 0).toLocaleString('id-ID')}
                        </div>
                        {qrisData.amountUSD && (
                          <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">≈ ${qrisData.amountUSD?.toFixed(2)} USD</p>
                        )}
                      </div>
                      <div className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300 leading-none" data-testid="text-qris-countdown">
                          {formatTime(timeRemaining)}
                        </span>
                        <span className="text-[9px] text-amber-600 dark:text-amber-400">left</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-gray-800 dark:text-gray-100" 
                      onClick={handleSaveQRIS}
                      data-testid="button-save-qris"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Save
                    </Button>
                    {import.meta.env.DEV && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1" 
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
            <div className="bg-white dark:bg-zinc-800 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Waiting for payment...</span>
                </div>
                <button 
                  onClick={handleCancelPending}
                  className="text-[10px] text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  data-testid="button-cancel-payment"
                >
                  <XCircle className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Powered by */}
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
            Secured by <span className="font-medium">12Pay</span> • QRIS Network
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

          {/* Proof of Payment Upload Section */}
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2.5">
              <div className="text-center">
                <h3 className="text-xs font-semibold">Upload Proof of Payment</h3>
                <p className="text-[10px] text-muted-foreground">
                  Upload screenshot of your transfer for faster verification
                </p>
              </div>

              <div 
                className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById('bankProofInput')?.click()}
                data-testid="bank-proof-upload-area"
              >
                {bankProofPreview ? (
                  <div className="space-y-2">
                    <img src={bankProofPreview} alt="Proof" className="max-h-32 mx-auto rounded-lg" />
                    <p className="text-[10px] text-muted-foreground">{bankProofFile?.name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBankProofFile(null);
                        setBankProofPreview(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="py-3 space-y-1.5">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">Click to upload proof</p>
                    <p className="text-[9px] text-muted-foreground/70">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
              <input
                id="bankProofInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.fileSizeMustBeDesc"), variant: "destructive" });
                      return;
                    }
                    setBankProofFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setBankProofPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                data-testid="input-bank-proof-file"
              />

              <Button
                className="w-full"
                size="sm"
                disabled={!bankProofFile || submittingBankProof}
                onClick={async () => {
                  if (!bankProofFile || !bankTransferData) return;
                  
                  setSubmittingBankProof(true);
                  try {
                    const formData = new FormData();
                    formData.append('proof', bankProofFile);
                    formData.append('transactionId', bankTransferData.transactionId);
                    formData.append('planId', planId || '');
                    formData.append('billingInterval', billingInterval);
                    formData.append('amount', String(bankTransferData.totalAmount || bankTransferData.amount));
                    formData.append('bankCode', bankTransferData.bankCode);
                    formData.append('accountNumber', bankTransferData.accountNumber);
                    formData.append('accountName', bankTransferData.accountName);
                    if (bankTransferData.uniqueCode) {
                      formData.append('uniqueCode', String(bankTransferData.uniqueCode));
                    }
                    if (invoiceId) {
                      formData.append('invoiceId', invoiceId);
                    }

                    const response = await fetch('/api/bank-transfer/confirm', {
                      method: 'POST',
                      body: formData,
                      credentials: 'include',
                    });

                    const result = await response.json();
                    
                    if (response.ok) {
                      toast({
                        title: t("dashboard.checkout.toast.proofSubmitted"),
                        description: t("dashboard.checkout.toast.yourPaymentProofHasDesc"),
                      });
                      // Keep polling for automatic verification, but show success message
                      setBankProofFile(null);
                      setBankProofPreview(null);
                    } else {
                      throw new Error(result.error || 'Failed to submit proof');
                    }
                  } catch (error: any) {
                    toast({
                      title: t("dashboard.checkout.toast.error"),
                      description: error.message || "Failed to submit payment proof",
                      variant: "destructive",
                    });
                  } finally {
                    setSubmittingBankProof(false);
                  }
                }}
                data-testid="button-submit-bank-proof"
              >
                {submittingBankProof ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 mr-1.5" />
                    Submit Proof
                  </>
                )}
              </Button>
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
                      toast({ title: t("dashboard.checkout.toast.linkCopied"), description: t("dashboard.checkout.toast.paymentLinkCopiedToDesc") });
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
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{selectedPlan?.name || 'Custom'}</span>
                  <Badge variant="secondary" className="text-xs">{isAnnual ? 'Annual' : 'Monthly'}</Badge>
                  {isUpgrade && (
                    <Badge className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Upgrade
                    </Badge>
                  )}
                  {isDowngrade && (
                    <Badge className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      Downgrade
                    </Badge>
                  )}
                </div>
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
                      toast({ title: t("dashboard.checkout.toast.addressCopied"), description: t("dashboard.checkout.toast.walletAddressCopiedToDesc") });
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
                      toast({ title: t("dashboard.checkout.toast.amountCopied"), description: `${cryptoAmount.toFixed(decimals)} ${selectedCrypto.symbol} copied to clipboard` });
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
                        toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToGenerateQrDesc"), variant: "destructive" });
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
                          toast({ title: t("dashboard.checkout.toast.saved"), description: t("dashboard.checkout.toast.invoiceSavedToYourDesc") });
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
                      toast({ title: t("dashboard.checkout.toast.saved"), description: t("dashboard.checkout.toast.invoiceDownloadedToYourDesc") });
                    } catch (error) {
                      console.error('Save error:', error);
                      toast({ title: t("dashboard.checkout.toast.error"), description: t("dashboard.checkout.toast.failedToSaveImageDesc"), variant: "destructive" });
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

      {/* Pending Payment Warning Dialog */}
      <Dialog open={showPendingPaymentWarning} onOpenChange={setShowPendingPaymentWarning}>
        <DialogContent className="max-w-md backdrop-blur-xl bg-background/95 dark:bg-background/95 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Pending Payment Exists
            </DialogTitle>
            <DialogDescription className="pt-2">
              You have an existing payment that hasn't been completed yet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Payment Info */}
            {billingStatus?.pendingTransaction && (
              <div className="p-4 rounded-lg bg-zinc-800/80 dark:bg-zinc-800 border border-zinc-700">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Order</span>
                    <span className="font-mono text-xs text-zinc-200">{billingStatus.pendingTransaction.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Plan</span>
                    <span className="font-medium text-zinc-100">{billingStatus.pendingTransaction.planName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Amount</span>
                    <span className="font-medium text-zinc-100">{billingStatus.pendingTransaction.amountFormatted || `Rp ${billingStatus.pendingTransaction.amount?.toLocaleString('id-ID')}`}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-3 rounded-lg bg-zinc-800/80 dark:bg-zinc-800 border border-zinc-700">
              <p className="text-sm text-muted-foreground">
                Please complete your first order payment or cancel it to proceed with the new order. You can only have one pending payment at a time.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  setShowPendingPaymentWarning(false);
                  // Navigate to billing to complete existing payment
                  navigate('/dashboard/billing');
                }}
                data-testid="button-complete-existing-payment"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Complete Existing Payment
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={handleCancelAndProceed}
                disabled={cancellingPending}
                data-testid="button-cancel-and-proceed"
              >
                {cancellingPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Cancel & Create New Order
              </Button>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowPendingPaymentWarning(false)}
                data-testid="button-cancel-dialog"
              >
                Go Back
              </Button>
            </div>
          </div>
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
          
          {selectedCrypto && (selectedPlan || isInvoiceMode) && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {isInvoiceMode && invoiceData 
                        ? `Custom Plan (${invoiceData.billingInterval === 'yearly' ? 'Annual' : 'Monthly'})`
                        : `${selectedPlan?.name || 'Custom Plan'} (${isAnnual ? 'Annual' : 'Monthly'})`}
                    </span>
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
                <Label htmlFor="txHash">{t("dashboard.checkout.txHash")}</Label>
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
                <Label>{t("dashboard.checkout.proofOfPayment")}</Label>
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
                        toast({ title: t("dashboard.checkout.toast.fileTooLarge"), description: t("dashboard.checkout.toast.pleaseUploadAnImageDesc"), variant: "destructive" });
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
                  if (!cryptoTxHash.trim() || !cryptoProofFile || !selectedCrypto) return;
                  if (!isInvoiceMode && !selectedPlan) return;
                  
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
                    const planIdForSubmit = isInvoiceMode ? 'custom' : (selectedPlan?.id || 'custom');
                    const planNameForSubmit = isInvoiceMode ? 'Custom Plan' : (selectedPlan?.name || 'Custom Plan');
                    const billingIntervalForSubmit = isInvoiceMode && invoiceData 
                      ? invoiceData.billingInterval 
                      : (isAnnual ? 'annual' : 'monthly');
                    
                    const response = await apiRequest('POST', '/api/crypto-payment/confirm', {
                      planId: planIdForSubmit,
                      planName: planNameForSubmit,
                      billingInterval: billingIntervalForSubmit,
                      isUpgrade: billingStatus?.status === 'active' && billingStatus?.planId && selectedPlan?.id !== billingStatus?.planId && !isDowngrade,
                      isDowngrade: isDowngrade,
                      cryptocurrency: selectedCrypto.symbol,
                      network: selectedCrypto.network,
                      amountUsd: Math.round(finalPriceUSD * 1.03 * 100), // in cents
                      amountCrypto: cryptoAmountStr,
                      walletAddress: selectedCrypto.address,
                      transactionHash: cryptoTxHash.trim(),
                      proofImageUrl: uploadData.url,
                      invoiceId: pendingCustomInvoice?.id || null,
                    });
                    
                    // If this is a custom plan with invoice, also update the invoice status
                    if (isCustomPlanWithInvoice && pendingCustomInvoice) {
                      await apiRequest('POST', `/api/merchant/custom-invoices/${pendingCustomInvoice.id}/submit-payment`, {
                        transactionId: cryptoTxHash.trim(),
                        paymentMethod: 'crypto',
                        notes: `Crypto payment: ${selectedCrypto.symbol} on ${selectedCrypto.network}`,
                      });
                    }
                    
                    toast({ 
                      title: t("dashboard.checkout.toast.paymentSubmitted"), 
                      description: t("dashboard.checkout.toast.wellVerifyYourPaymentDesc") 
                    });
                    setShowConfirmPaymentDialog(false);
                    setCryptoTxHash("");
                    setCryptoProofFile(null);
                    setCryptoProofPreview(null);
                    navigate('/dashboard/billing');
                  } catch (error) {
                    console.error('Submit error:', error);
                    toast({ 
                      title: t("dashboard.checkout.toast.submissionFailed"), 
                      description: t("dashboard.checkout.toast.pleaseTryAgainOrDesc"), 
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

      {/* Trusted Payment Partners Footer */}
      <div className="pt-6 mt-2 border-t border-border/60" data-testid="footer-payment-partners">
        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
          Trusted &amp; Secure Payment Partners
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8 md:gap-x-10 px-2">
          <img
            src={visaLogo}
            alt="Visa"
            className="h-5 sm:h-6 md:h-7 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity dark:brightness-0 dark:invert"
            data-testid="img-logo-visa"
          />
          <img
            src={mastercardLogo}
            alt="Mastercard"
            className="h-7 sm:h-8 md:h-9 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
            data-testid="img-logo-mastercard"
          />
          <img
            src={paypalLogo}
            alt="PayPal"
            className="h-5 sm:h-6 md:h-7 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
            data-testid="img-logo-paypal"
          />
          <img
            src={binanceLogo}
            alt="Binance"
            className="h-4 sm:h-5 md:h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
            data-testid="img-logo-binance"
          />
          <img
            src={trustWalletLogo}
            alt="Trust Wallet"
            className="h-4 sm:h-5 md:h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
            data-testid="img-logo-trustwallet"
          />
          <img
            src={twelvePayLogo}
            alt="12Pay"
            className="h-5 sm:h-6 md:h-7 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity dark:brightness-110"
            data-testid="img-logo-twelvepay"
          />
        </div>
        <p className="text-center text-[10px] text-muted-foreground/70 mt-3">
          Pembayaran Anda dilindungi enkripsi tingkat bank &amp; PCI-DSS compliant
        </p>
      </div>
    </div>
  );
}
