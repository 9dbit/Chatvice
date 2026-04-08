import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Check, Zap, Users, MessageSquare, Crown, AlertTriangle, ArrowUpRight, Calendar, Clock, Lock, Loader2, CheckCircle2, Sparkles, Gift, Building2, ChevronDown, ChevronUp, QrCode, Timer, RefreshCw, Download, XCircle, Tag, Smartphone, Copy, ShieldCheck, FileText, ArrowRight, CreditCard, X, Bot, Database, Hotel, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { type SubscriptionPlanId } from "@shared/schema";
import { CustomPlanRequestDialog } from "@/components/custom-plan-request-dialog";

interface ActivePromotion {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  endDate: string;
  showUpsell: boolean;
  bgColor?: string | null;
  textColor?: string | null;
  bannerMode?: string | null;
  bannerImageUrl?: string | null;
}

interface ValidatedPromo {
  id: string;
  code: string;
  name: string;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  validatedBillingCycle: string;
}

interface PendingTransaction {
  transactionId: string;
  status: string;
  amount?: number;
  amountFormatted?: string;
  expiryTime?: string;
  paymentMethod?: string;
  orderId?: string;
  planName?: string;
}

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
  pendingTransaction?: PendingTransaction | null;
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

interface BillingTransaction {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  amountFormatted: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';
  paymentMethod: string | null;
  planName: string | null;
  subscriptionMonths: number | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
}

interface PendingPaymentDetails {
  hasPendingPayment: boolean;
  transactionId?: string;
  orderId?: string;
  status?: string;
  amount?: number;
  amountFormatted?: string;
  paymentMethod?: string;
  planId?: string;
  planName?: string;
  billingInterval?: string;
  expiryTime?: string;
  createdAt?: string;
  qrisString?: string;
  qrisUrl?: string;
  vaNumber?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  uniqueCode?: string;
}

export default function BillingPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [qrisPaymentOpen, setQrisPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<'checkout' | 'loading' | 'qris' | 'checking' | 'success' | 'expired' | 'error'>('checkout');
  const [termsAccepted, setTermsAccepted] = useState(false);
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
  
  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatedPromo, setValidatedPromo] = useState<ValidatedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelPendingConfirmDialog, setShowCancelPendingConfirmDialog] = useState(false);
  const [pendingNewPurchase, setPendingNewPurchase] = useState<{ planId: string; isAnnual: boolean } | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: billingStatus, isLoading, refetch } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });
  
  // Fetch detailed pending payment info
  const { data: pendingPaymentDetails, refetch: refetchPendingPayment } = useQuery<PendingPaymentDetails>({
    queryKey: ["/api/billing/pending-payment-details"],
  });
  
  // Fetch payment confirmation status (for crypto/bank transfer awaiting review)
  interface PaymentConfirmationStatus {
    hasPendingConfirmation: boolean;
    cryptoConfirmation: {
      id: string;
      status: string;
      planId: string;
      planName: string;
      billingInterval: string;
      cryptocurrency: string;
      amountCrypto: string;
      amountUsd: number;
      customInvoiceId?: string;
      createdAt: string;
    } | null;
    bankTransferConfirmation: {
      id: string;
      status: string;
      planId: string;
      planName: string;
      billingInterval: string;
      bankName: string;
      amountIdr: number;
      amountUsd?: number;
      customInvoiceId?: string;
      createdAt: string;
    } | null;
  }
  
  const { data: paymentConfirmationStatus } = useQuery<PaymentConfirmationStatus>({
    queryKey: ["/api/billing/payment-confirmation-status"],
  });
  
  const [showAwaitingPayment, setShowAwaitingPayment] = useState(false);
  const [pendingPaymentTimeRemaining, setPendingPaymentTimeRemaining] = useState<number>(0);
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  // Fetch subscription plans from database
  const { data: dbPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  // Fetch active public promotions
  const { data: activePromos = [] } = useQuery<ActivePromotion[]>({
    queryKey: ["/api/promotions/active"],
  });
  
  // Fetch billing transaction history
  const { data: billingHistory = [], isLoading: isLoadingHistory } = useQuery<BillingTransaction[]>({
    queryKey: ["/api/billing/transactions"],
  });

  // Fetch addon configs and merchant addons for the Additional Services section
  const { data: addonConfigs = [] } = useQuery<any[]>({
    queryKey: ["/api/addon-configs"],
  });
  const { data: merchantAddons = [] } = useQuery<any[]>({
    queryKey: ["/api/merchant/addons"],
  });
  const addonTrialMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await fetch("/api/merchant/addons/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addonType }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          if (body.error === "Trial already used for this addon") {
            throw new Error(t("dashboard.billing.trialAlreadyUsed"));
          }
          throw new Error(t("dashboard.billing.featureAlreadyActive"));
        }
        throw new Error(body.error || t("dashboard.billing.trialStartFailed"));
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      toast({ title: t("dashboard.billing.trialStarted"), description: t("dashboard.billing.trialStartedDesc") });
    },
    onError: (err: any) => {
      toast({ title: t("common.failed"), description: err.message || t("dashboard.billing.trialStartFailed"), variant: "destructive" });
    },
  });
  
  // Fetch custom plan invoices
  interface CustomPlanInvoice {
    id: string;
    invoiceNumber: string;
    description: string;
    conversationsLimit: number;
    agentsLimit: number;
    supervisorsLimit: number;
    sourcesLimit: number;
    suggestedQuestionsLimit: number;
    amount: number;
    currency: string;
    billingInterval: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
    dueDate: string | null;
  }
  
  const { data: customInvoices = [], isLoading: isLoadingInvoices, refetch: refetchInvoices, error: invoiceError } = useQuery<CustomPlanInvoice[]>({
    queryKey: ["/api/merchant/custom-invoices"],
  });
  
  // Fetch custom plan requests (for showing "Submission Under Review" status)
  interface CustomPlanRequest {
    id: string;
    status: string;
    desiredConversations: number;
    desiredAgents: number;
    desiredSupervisors: number;
    desiredSources: number;
    desiredSuggestedQuestions: number;
    message?: string;
    createdAt: string;
    updatedAt: string;
    linkedInvoiceId?: string;
    adminNotes?: string;
    proposedPrice?: number;
    proposedPriceCurrency?: string;
    proposedBillingInterval?: string;
  }
  
  const { data: customRequests = [] } = useQuery<CustomPlanRequest[]>({
    queryKey: ["/api/merchant/custom-plan-requests"],
  });
  
  // Get the most recent pending/under-review request
  const pendingCustomRequest = customRequests.find(r => 
    r.status === "submitted" || r.status === "under_review" || r.status === "pricing_proposed"
  );
  
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [showCustomRequestDetails, setShowCustomRequestDetails] = useState(false);
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 7;

  // Get applicable promotion for current billing cycle
  const currentBillingCycle = isAnnual ? "annual" : "monthly";
  const applicablePromo = activePromos.find(p => 
    p.billingCycle === "both" || p.billingCycle === currentBillingCycle
  );

  // Validate promo code for a specific plan
  const validatePromoCode = async (planId: string) => {
    if (!promoCodeInput.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }
    
    setIsValidatingPromo(true);
    setPromoError(null);
    
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          planId,
          billingCycle: currentBillingCycle,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setPromoError(data.error || "Invalid promo code");
        setValidatedPromo(null);
      } else if (data.valid) {
        // Store validated promo with qualifying info
        setValidatedPromo({
          ...data.promotion,
          validatedBillingCycle: currentBillingCycle,
        });
        setPromoError(null);
        toast({
          title: t("dashboard.billing.promoApplied"),
          description: `${data.promotion.discountPercent}% discount will be applied to qualifying plans.`,
        });
      }
    } catch (err) {
      setPromoError("Failed to validate promo code");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Check if a promo applies to a specific plan and billing cycle
  const getPromoForPlan = (planId: string): { discountPercent: number; code: string } | null => {
    // Check if we have a validated promo that applies to this plan and current billing cycle
    if (validatedPromo) {
      // Check if the promo's billing cycle restriction matches current selection
      const billingCycleMatches = validatedPromo.billingCycle === "both" || 
                                   validatedPromo.billingCycle === currentBillingCycle;
      if (billingCycleMatches) {
        // Check if this plan qualifies for the validated promo
        const targets = validatedPromo.targetPlans || [];
        const isTarget = targets.includes("all") || targets.includes(planId) ||
                         (targets.includes("upgrade") && (planId === "starter" || planId === "pro" || planId === "enterprise"));
        if (isTarget) {
          return { discountPercent: validatedPromo.discountPercent, code: validatedPromo.code };
        }
      }
    }
    // Check if there's an applicable public promo
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

  // Calculate discounted price
  const getDiscountedPrice = (price: number, planId: string) => {
    const promo = getPromoForPlan(planId);
    if (promo) {
      return Math.round(price * (1 - promo.discountPercent / 100));
    }
    return price;
  };

  // Clear promo when billing cycle changes
  useEffect(() => {
    setValidatedPromo(null);
    setPromoError(null);
  }, [isAnnual]);

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
              title: t("dashboard.billing.subscriptionUpdated"),
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
    
    // Open custom request details dialog if triggered from notification
    const showCustomRequest = urlParams.get('showCustomRequest');
    if (showCustomRequest === 'true') {
      setShowCustomRequestDetails(true);
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [toast]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Pending payment countdown timer
  const pendingPaymentCountdownRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (pendingPaymentDetails?.hasPendingPayment && pendingPaymentDetails.expiryTime) {
      const calculateRemaining = () => {
        const expiryTime = new Date(pendingPaymentDetails.expiryTime!).getTime();
        const now = Date.now();
        return Math.max(0, Math.floor((expiryTime - now) / 1000));
      };
      
      setPendingPaymentTimeRemaining(calculateRemaining());
      
      pendingPaymentCountdownRef.current = setInterval(() => {
        const remaining = calculateRemaining();
        setPendingPaymentTimeRemaining(remaining);
        
        if (remaining <= 0) {
          if (pendingPaymentCountdownRef.current) {
            clearInterval(pendingPaymentCountdownRef.current);
          }
          // Refetch to update status
          refetchPendingPayment();
        }
      }, 1000);
      
      return () => {
        if (pendingPaymentCountdownRef.current) {
          clearInterval(pendingPaymentCountdownRef.current);
        }
      };
    }
  }, [pendingPaymentDetails?.hasPendingPayment, pendingPaymentDetails?.expiryTime, refetchPendingPayment]);

  // Cancel pending payment mutation
  const cancelPendingPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/billing/cancel-pending", {});
    },
    onSuccess: () => {
      toast({
        title: t("dashboard.billing.paymentCancelled"),
        description: t("dashboard.billing.paymentCancelledDesc"),
      });
      setShowAwaitingPayment(false);
      queryClient.invalidateQueries({ queryKey: ["/api/billing/pending-payment-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.billing.cancelFailed"),
        variant: "destructive",
      });
    },
  });

  // Cancel custom invoice mutation
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/merchant/custom-invoices/${invoiceId}/cancel`, {});
    },
    onSuccess: () => {
      toast({
        title: t("dashboard.billing.invoiceCancelled"),
        description: t("dashboard.billing.invoiceCancelledDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-invoices"] });
      setShowCancelInvoiceConfirm(false);
      setInvoiceToCancel(null);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.billing.invoiceCancelFailed"),
        variant: "destructive",
      });
    },
  });

  // State for cancel invoice confirmation
  const [invoiceToCancel, setInvoiceToCancel] = useState<string | null>(null);
  const [showCancelInvoiceConfirm, setShowCancelInvoiceConfirm] = useState(false);

  // State for proof upload
  const [selectedProofInvoice, setSelectedProofInvoice] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Submit proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async ({ invoiceId, file }: { invoiceId: string; file: File }) => {
      const formData = new FormData();
      formData.append("proof", file);
      formData.append("paymentMethod", "bank_transfer");
      
      const response = await fetch(`/api/merchant/custom-invoices/${invoiceId}/submit-proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit proof");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("dashboard.billing.proofSubmitted"),
        description: t("dashboard.billing.proofSubmittedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-invoices"] });
      setSelectedProofInvoice(null);
      setProofFile(null);
      setProofPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to submit payment proof.",
        variant: "destructive",
      });
    },
  });

  // Handle proof file selection
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Format countdown for pending payment
  const formatPendingCountdown = () => {
    const minutes = Math.floor(pendingPaymentTimeRemaining / 60);
    const seconds = pendingPaymentTimeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get bank name from code
  const getBankName = (bankCode: string) => {
    const banks: Record<string, string> = {
      '002': 'BRI', '008': 'Mandiri', '009': 'BNI', '014': 'BCA',
      '022': 'CIMB Niaga', '013': 'Permata', '011': 'Danamon',
      '016': 'Maybank', '490': 'BNC', '451': 'BSI',
    };
    return banks[bankCode] || bankCode;
  };

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/billing/cancel", {});
    },
    onSuccess: () => {
      setShowCancelDialog(false);
      toast({
        title: t("dashboard.billing.subscriptionCancelled"),
        description: t("dashboard.billing.toast.yourSubscriptionHasBeenDesc"),
      });
      refetch();
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.billing.toast.failedToCancelSubscriptionDesc"),
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/merchant/account", {});
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
      toast({
        title: t("dashboard.billing.toast.accountDeleted"),
        description: t("dashboard.billing.toast.yourAccountHasBeenDesc"),
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.billing.toast.failedToDeleteAccountDesc"),
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval, promoCode }: { planId: string; billingInterval: string; promoCode?: string }) => {
      const response = await apiRequest("POST", "/api/billing/checkout", { planId, billingInterval, promoCode });
      return response.json() as Promise<QRISPaymentResponse>;
    },
    onSuccess: (data) => {
      setQrisData(data);
      setPaymentStep('qris');
      
      // Parse Kompas Pay format "2025-12-24 18:50:03" - replace space with T for ISO format
      const expiryTimeStr = data.expiryTime?.replace(' ', 'T') + 'Z';
      const expiryTime = new Date(expiryTimeStr).getTime();
      const now = Date.now();
      
      // Fallback to 5 minutes if parsing fails
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
              
              setTimeout(() => {
                setQrisPaymentOpen(false);
                toast({
                  title: t("dashboard.billing.toast.paymentSuccessful"),
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
        title: t("dashboard.billing.toast.checkoutFailed"),
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
          title: t("dashboard.billing.subscriptionActivated"),
          description: t("dashboard.billing.toast.yourDemoSubscriptionIsDesc"),
        });
      }, 2000);
    },
    onError: (error: Error) => {
      setPaymentStep('error');
      toast({
        title: t("dashboard.billing.toast.checkoutFailed"),
        description: error.message || "Failed to process checkout.",
        variant: "destructive",
      });
    },
  });

  // Check if there's any pending payment (standard transaction or custom invoice)
  const hasPendingPayments = pendingPaymentDetails?.hasPendingPayment || customInvoices.filter(inv => inv.status === 'pending').length > 0;
  
  const handleUpgrade = async (planId: string) => {
    const plan = dbPlans.find((p: any) => p.id === planId);
    if (!plan) return;
    
    // Check if there's a pending payment - show confirmation dialog
    if (hasPendingPayments) {
      setPendingNewPurchase({ planId, isAnnual });
      setShowCancelPendingConfirmDialog(true);
      return;
    }
    
    // Proceed with checkout
    proceedToCheckout(planId, isAnnual);
  };
  
  const proceedToCheckout = (planId: string, annual: boolean) => {
    const promo = getPromoForPlan(planId);
    const params = new URLSearchParams({
      plan: planId,
      interval: annual ? 'annual' : 'monthly',
      from: 'plans',
    });
    if (promo?.code) {
      params.set('promo', promo.code);
    }
    window.location.href = `/dashboard/checkout?${params.toString()}`;
  };
  
  const handleConfirmCancelAndProceed = async () => {
    if (!pendingNewPurchase) return;
    
    const pendingInvoices = customInvoices.filter(inv => inv.status === 'pending');
    
    // Cancel pending custom invoices first
    if (pendingInvoices.length > 0) {
      try {
        // Cancel all pending invoices
        for (const invoice of pendingInvoices) {
          await cancelInvoiceMutation.mutateAsync(invoice.id);
        }
      } catch (error) {
        toast({
          title: t("dashboard.billing.toast.failedToCancelInvoice"),
          description: t("dashboard.billing.toast.pleaseTryAgainOrDesc"),
          variant: "destructive",
        });
        return;
      }
    }
    
    // Cancel standard pending payment if exists
    if (pendingPaymentDetails?.hasPendingPayment) {
      try {
        await cancelPendingPaymentMutation.mutateAsync();
        // Refetch to update UI
        refetchPendingPayment();
      } catch (error) {
        toast({
          title: t("dashboard.billing.toast.failedToCancelPending"),
          description: t("dashboard.billing.toast.pleaseTryAgainOrDesc"),
          variant: "destructive",
        });
        return;
      }
    }
    
    setShowCancelPendingConfirmDialog(false);
    proceedToCheckout(pendingNewPurchase.planId, pendingNewPurchase.isAnnual);
    setPendingNewPurchase(null);
  };
  
  // Proceed from checkout to payment
  const handleProceedToPayment = () => {
    if (!selectedPlan || !termsAccepted) return;
    
    setPaymentStep('loading');
    const promo = getPromoForPlan(selectedPlan.id);
    checkoutMutation.mutate({
      planId: selectedPlan.id,
      billingInterval: isAnnual ? 'annual' : 'monthly',
      promoCode: promo?.code,
    });
  };

  const handleSaveQRIS = async () => {
    if (qrisData?.qrisImageUrl) {
      try {
        const response = await fetch(qrisData.qrisImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qris-payment-${qrisData.orderId}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: t("dashboard.billing.toast.saved"),
          description: t("dashboard.billing.toast.qrisImageSavedSuccessfullyDesc"),
        });
      } catch {
        // Fallback: open image in new tab
        window.open(qrisData.qrisImageUrl, '_blank');
        toast({
          title: t("dashboard.billing.toast.qrisImage"),
          description: t("dashboard.billing.toast.qrisImageOpenedInDesc"),
        });
      }
    }
  };

  const handleRetryPayment = () => {
    if (selectedPlan) {
      setPaymentStep('loading');
      const promo = getPromoForPlan(selectedPlan.id);
      checkoutMutation.mutate({
        planId: selectedPlan.id,
        billingInterval: isAnnual ? 'annual' : 'monthly',
        promoCode: promo?.code,
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

  const plans = dbPlans.map((plan: any) => ({
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
          <h1 className="text-2xl font-bold">{t("dashboard.billing.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.billing.subtitle")}</p>
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
        <h1 className="text-2xl font-bold" data-testid="text-billing-title">{t("dashboard.billing.title")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.billing.subtitle")}
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
                <p className="font-medium text-yellow-700">{t("dashboard.billing.checkoutCanceled")}</p>
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
              <CardTitle className="text-sm font-medium">{t("dashboard.billing.currentPlan")}</CardTitle>
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
              <CardTitle className="text-sm font-medium">{t("dashboard.billing.conversationsUsed")}</CardTitle>
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
              <CardTitle className="text-sm font-medium">{t("dashboard.billing.billingCycle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {billingStatus?.currentPeriodEnd ? (
              <>
                <p className="text-sm text-muted-foreground">{t("dashboard.billing.nextBillingDate")}</p>
                <p className="text-lg font-semibold">
                  {format(new Date(billingStatus.currentPeriodEnd), 'MMMM d, yyyy')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("dashboard.billing.noBillingCycle")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Payment Section - Unified View for all pending payments */}
      {(pendingPaymentDetails?.hasPendingPayment || customInvoices.filter(inv => inv.status === 'pending').length > 0 || paymentConfirmationStatus?.hasPendingConfirmation) && (
        <Card className="border-amber-500/50 bg-amber-500/5" data-testid="card-pending-transaction">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base font-semibold text-amber-700 dark:text-amber-400">
                  Awaiting Payment
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {(pendingPaymentDetails?.hasPendingPayment ? 1 : 0) + customInvoices.filter(inv => inv.status === 'pending').length + (paymentConfirmationStatus?.hasPendingConfirmation ? 1 : 0)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Crypto Payment Under Review */}
            {paymentConfirmationStatus?.cryptoConfirmation && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700" data-testid="pending-crypto-confirmation">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Payment Under Review</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Your {paymentConfirmationStatus.cryptoConfirmation.cryptocurrency} payment is currently under review. We are processing your {paymentConfirmationStatus.cryptoConfirmation.planName} plan.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="ml-1 font-medium">{paymentConfirmationStatus.cryptoConfirmation.planName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Billing:</span>
                    <span className="ml-1 font-medium">{paymentConfirmationStatus.cryptoConfirmation.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-1 font-medium">{paymentConfirmationStatus.cryptoConfirmation.amountCrypto} {paymentConfirmationStatus.cryptoConfirmation.cryptocurrency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">USD Value:</span>
                    <span className="ml-1 font-medium">${(paymentConfirmationStatus.cryptoConfirmation.amountUsd / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Bank Transfer Payment Under Review */}
            {paymentConfirmationStatus?.bankTransferConfirmation && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700" data-testid="pending-bank-transfer-confirmation">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Payment Under Review</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Your bank transfer payment is currently under review. We are processing your {paymentConfirmationStatus.bankTransferConfirmation.planName} plan.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="ml-1 font-medium">{paymentConfirmationStatus.bankTransferConfirmation.planName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Billing:</span>
                    <span className="ml-1 font-medium">{paymentConfirmationStatus.bankTransferConfirmation.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="ml-1 font-medium">{paymentConfirmationStatus.bankTransferConfirmation.bankName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-1 font-medium">Rp {paymentConfirmationStatus.bankTransferConfirmation.amountIdr.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Standard Pending Transaction */}
            {pendingPaymentDetails?.hasPendingPayment && (
              <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800" data-testid="pending-standard-payment">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {pendingPaymentDetails.planName} Plan - {pendingPaymentDetails.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order: {pendingPaymentDetails.orderId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingPaymentDetails.paymentMethod && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                        {pendingPaymentDetails.paymentMethod === 'virtual_account' ? 'VA' : 
                         pendingPaymentDetails.paymentMethod === 'bank_transfer' ? 'Transfer' : 
                         pendingPaymentDetails.paymentMethod?.toUpperCase()}
                      </Badge>
                    )}
                    {pendingPaymentTimeRemaining > 0 && (
                      <Badge variant="secondary" className="font-mono text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatPendingCountdown()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Payment Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Payment Info */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                        {pendingPaymentDetails.amountFormatted}
                      </span>
                    </div>
                    {pendingPaymentDetails.expiryTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm">
                          {format(new Date(pendingPaymentDetails.expiryTime), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Payment Method Specific Info */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg border">
                {/* QRIS */}
                {pendingPaymentDetails.paymentMethod === 'qris' && pendingPaymentDetails.qrisString && (
                  <div className="text-center space-y-2">
                    <div className="bg-white p-3 rounded-lg inline-block">
                      <QRCodeSVG 
                        value={pendingPaymentDetails.qrisString} 
                        size={140}
                        level="M"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Scan with any QRIS-enabled app</p>
                  </div>
                )}
                
                {/* Virtual Account */}
                {pendingPaymentDetails.paymentMethod === 'virtual_account' && pendingPaymentDetails.vaNumber && (
                  <div className="text-center space-y-2 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{getBankName(pendingPaymentDetails.bankCode || '')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-lg font-mono font-bold tracking-wider">
                        {pendingPaymentDetails.vaNumber}
                      </code>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(pendingPaymentDetails.vaNumber || '');
                          toast({ title: t("dashboard.billing.toast.copied"), description: t("dashboard.billing.toast.vaNumberCopiedToDesc") });
                        }}
                        data-testid="button-copy-va-number"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Transfer exact amount to this VA number</p>
                  </div>
                )}
                
                {/* Bank Transfer */}
                {pendingPaymentDetails.paymentMethod === 'bank_transfer' && pendingPaymentDetails.accountNumber && (
                  <div className="text-center space-y-2 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{getBankName(pendingPaymentDetails.bankCode || '')}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{pendingPaymentDetails.accountName}</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-lg font-mono font-bold tracking-wider">
                          {pendingPaymentDetails.accountNumber}
                        </code>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => {
                            navigator.clipboard.writeText(pendingPaymentDetails.accountNumber || '');
                            toast({ title: t("dashboard.billing.toast.copied"), description: t("dashboard.billing.toast.accountNumberCopiedToDesc") });
                          }}
                          data-testid="button-copy-account-number"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {pendingPaymentDetails.uniqueCode && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Include unique code: {pendingPaymentDetails.uniqueCode}
                      </p>
                    )}
                  </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => cancelPendingPaymentMutation.mutate()}
                    disabled={cancelPendingPaymentMutation.isPending}
                    data-testid="button-cancel-pending-payment"
                  >
                    {cancelPendingPaymentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Cancel Payment
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      refetchPendingPayment();
                      toast({ title: t("dashboard.billing.toast.refreshing"), description: t("dashboard.billing.toast.checkingPaymentStatusDesc") });
                    }}
                    data-testid="button-refresh-payment-status"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Status
                  </Button>
                </div>
              </div>
            )}

            {/* Custom Plan Invoices */}
            {customInvoices.filter(inv => inv.status === 'pending' || inv.status === 'awaiting_confirmation').map((invoice) => {
              const exchangeRate = (platformSettings as any)?.exchange_rate ? parseInt((platformSettings as any).exchange_rate) : 16000;
              const amountIDR = invoice.currency === 'USD' ? Math.round(invoice.amount * exchangeRate) : invoice.amount;
              const isAwaitingConfirmation = invoice.status === 'awaiting_confirmation';
              return (
                <div 
                  key={invoice.id}
                  className={`p-4 rounded-lg bg-white dark:bg-zinc-900 border ${isAwaitingConfirmation ? 'border-amber-300 dark:border-amber-700' : 'border-purple-200 dark:border-purple-800'}`}
                  data-testid={`invoice-${invoice.id}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                          {invoice.invoiceNumber}
                        </p>
                        {isAwaitingConfirmation && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Awaiting Confirmation
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Custom Plan - {invoice.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">
                        {invoice.currency === 'USD' 
                          ? `$${invoice.amount.toLocaleString()}` 
                          : `Rp ${invoice.amount.toLocaleString("id-ID")}`}
                      </p>
                      {invoice.currency === 'USD' && (
                        <p className="text-xs text-muted-foreground">
                          ≈ Rp {amountIDR.toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3 py-2 px-2 bg-muted/30 rounded-md">
                    <div>
                      <span className="text-muted-foreground">Conversations:</span>
                      <span className="ml-1 font-medium">
                        {invoice.conversationsLimit === -1 ? '∞' : invoice.conversationsLimit.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AI Agents:</span>
                      <span className="ml-1 font-medium">
                        {invoice.agentsLimit === -1 ? '∞' : invoice.agentsLimit}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supervisors:</span>
                      <span className="ml-1 font-medium">
                        {invoice.supervisorsLimit === -1 ? '∞' : invoice.supervisorsLimit}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sources:</span>
                      <span className="ml-1 font-medium">
                        {invoice.sourcesLimit === -1 ? '∞' : invoice.sourcesLimit}
                      </span>
                    </div>
                  </div>
                  
                  {invoice.dueDate && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Due: {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                    </p>
                  )}
                  
                  {isAwaitingConfirmation ? (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <Timer className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Payment Under Review</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Your payment proof is being reviewed by admin. Your custom plan will be activated soon.</p>
                      </div>
                    </div>
                  ) : selectedProofInvoice === invoice.id ? (
                    /* Proof Upload Section */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                        <AlertTriangle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Awaiting Payment Proof</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">Please upload your payment proof to continue the activation process.</p>
                        </div>
                      </div>
                      
                      {/* Upload area */}
                      <div 
                        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => proofInputRef.current?.click()}
                        data-testid={`proof-upload-area-${invoice.id}`}
                      >
                        <input
                          ref={proofInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProofFileChange}
                          className="hidden"
                          data-testid={`proof-input-${invoice.id}`}
                        />
                        {proofPreview ? (
                          <div className="space-y-2">
                            <img src={proofPreview} alt="Proof preview" className="max-h-32 mx-auto rounded-md" />
                            <p className="text-xs text-muted-foreground">{proofFile?.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Click to upload payment proof</p>
                            <p className="text-xs text-muted-foreground">Format: JPG, PNG (max. 5MB)</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedProofInvoice(null);
                            setProofFile(null);
                            setProofPreview(null);
                          }}
                          data-testid={`button-cancel-proof-${invoice.id}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          disabled={!proofFile || submitProofMutation.isPending}
                          onClick={() => {
                            if (proofFile) {
                              submitProofMutation.mutate({ invoiceId: invoice.id, file: proofFile });
                            }
                          }}
                          data-testid={`button-submit-proof-${invoice.id}`}
                        >
                          {submitProofMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 mr-1" />
                          )}
                          Submit Proof
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Initial pending state - show pay now prompt */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                        <CreditCard className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Ready to Pay</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">Select your preferred payment method to complete your subscription.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setInvoiceToCancel(invoice.id);
                            setShowCancelInvoiceConfirm(true);
                          }}
                          disabled={cancelInvoiceMutation.isPending}
                          data-testid={`button-cancel-invoice-${invoice.id}`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            navigate(`/dashboard/checkout?invoiceId=${invoice.id}`);
                          }}
                          data-testid={`button-pay-now-${invoice.id}`}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Subscription Plans</h2>
              <p className="text-sm text-muted-foreground">
                Choose the plan that best fits your needs
              </p>
            </div>
            {/* View Awaiting Payment Button - Show if any pending payment exists */}
            {(pendingPaymentDetails?.hasPendingPayment || customInvoices.filter(inv => inv.status === 'pending' || inv.status === 'awaiting_confirmation').length > 0 || paymentConfirmationStatus?.hasPendingConfirmation) && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => {
                  // Scroll to awaiting payment section
                  document.querySelector('[data-testid="card-pending-transaction"]')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }}
                data-testid="button-view-awaiting-payment"
              >
                <Timer className="w-4 h-4 mr-2" />
                View Awaiting Payment
                <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {(pendingPaymentDetails?.hasPendingPayment ? 1 : 0) + customInvoices.filter(inv => inv.status === 'pending' || inv.status === 'awaiting_confirmation').length + (paymentConfirmationStatus?.hasPendingConfirmation ? 1 : 0)}
                </Badge>
              </Button>
            )}
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

        {/* Promo Banner - Desktop: 1200x300px (4:1), Mobile: 426x182px */}
        {(applicablePromo || validatedPromo) && (() => {
          const promo = applicablePromo || validatedPromo;
          const bannerMode = (promo as any)?.bannerMode || "color";
          const hasImage = (promo as any)?.bannerImageUrl;
          const hasMobileImage = (promo as any)?.bannerImageMobileUrl;
          const showText = bannerMode === "color" || bannerMode === "overlay";
          const showImage = (bannerMode === "image" || bannerMode === "overlay") && hasImage;
          const hasCustomColor = (promo as any)?.bgColor;
          const textColor = (promo as any)?.textColor;
          const isDefaultStyle = !showImage && !hasCustomColor;
          
          return (
            <div 
              className="mb-4 rounded-lg flex flex-col items-end justify-end gap-2 relative overflow-hidden text-center w-full aspect-[426/182] md:aspect-[4/1]" 
              style={{
                ...(showImage ? {
                  color: textColor || "#ffffff"
                } : hasCustomColor ? {
                  backgroundColor: hasCustomColor,
                  color: textColor || "#ffffff"
                } : {})
              }}
              data-testid="promo-banner"
            >
              {showImage && (
                <>
                  <img 
                    src={hasImage} 
                    alt="" 
                    className={`absolute inset-0 w-full h-full object-cover rounded-lg ${hasMobileImage ? 'hidden md:block' : ''}`}
                    data-testid="promo-banner-image"
                  />
                  {hasMobileImage && (
                    <img 
                      src={(promo as any).bannerImageMobileUrl} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover rounded-lg md:hidden"
                      data-testid="promo-banner-image-mobile"
                    />
                  )}
                </>
              )}
              {bannerMode === "overlay" && showImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent rounded-lg" />
              )}
              {isDefaultStyle && (
                <div className="absolute inset-0 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg" />
              )}
              {(showText || isDefaultStyle) && (
                <div className="relative z-10 w-full pb-3 sm:pb-4 px-4 flex flex-col items-start text-left">
                  <h3 className={`flex items-center gap-2 text-lg sm:text-xl md:text-2xl font-extrabold ${isDefaultStyle ? "text-green-700 dark:text-green-400" : ""}`}>
                    <Gift className={`w-5 h-5 sm:w-6 sm:h-6 ${isDefaultStyle ? "text-green-600" : ""}`} />
                    <span>{validatedPromo ? "Promo Applied!" : promo?.name}</span>
                  </h3>
                  <p className={`text-sm sm:text-base font-medium opacity-95 ${isDefaultStyle ? "text-green-700 dark:text-green-400" : ""}`}>
                    Save {promo?.discountPercent}% with code
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className={`px-3 py-1 rounded font-mono font-bold text-sm ${isDefaultStyle ? "bg-green-100 dark:bg-green-900/30" : "bg-white/20 dark:bg-white/10"}`}>{promo?.code}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-2 ${isDefaultStyle ? "" : "bg-white/10 border-white/30 hover:bg-white/20 text-inherit"}`}
                      onClick={() => {
                        navigator.clipboard.writeText(promo?.code || "");
                        toast({ title: t("dashboard.billing.toast.codeCopied"), description: `${promo?.code} copied to clipboard` });
                      }}
                      data-testid="button-copy-promo-code"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  {validatedPromo && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { setValidatedPromo(null); setPromoCodeInput(""); }}
                      className="mt-2"
                      data-testid="button-remove-promo"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Remove Code
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        
        {!validatedPromo && (
          <div className="mb-4 flex items-center gap-2 flex-wrap" data-testid="promo-input-section">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Have a promo code?</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter code"
                value={promoCodeInput}
                onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
                className="w-32 h-8 text-sm uppercase"
                data-testid="input-promo-code"
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => validatePromoCode("all")}
                disabled={isValidatingPromo || !promoCodeInput.trim()}
                data-testid="button-apply-promo"
              >
                {isValidatingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
              </Button>
            </div>
            {promoError && <span className="text-xs text-red-500">{promoError}</span>}
          </div>
        )}

        {/* Billing History Section */}
        {billingHistory.length > 0 && (
          <Collapsible open={showBillingHistory} onOpenChange={setShowBillingHistory} className="mb-6">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover-elevate py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Payment History</CardTitle>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{billingHistory.length}</Badge>
                    </div>
                    {showBillingHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : (
                      billingHistory.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-muted/30 border border-border/50"
                          data-testid={`billing-transaction-${tx.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              tx.status === 'paid' ? 'bg-green-500' :
                              tx.status === 'pending' ? 'bg-amber-500' :
                              tx.status === 'expired' ? 'bg-gray-400' :
                              'bg-red-500'
                            }`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {tx.planName || 'Unknown Plan'}
                                {tx.subscriptionMonths && tx.subscriptionMonths > 1 && (
                                  <span className="text-muted-foreground"> ({tx.subscriptionMonths} months)</span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {tx.invoiceNumber || tx.id.slice(0, 8)}
                                {' • '}
                                {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold">{tx.amountFormatted}</p>
                            <Badge 
                              variant={tx.status === 'paid' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'} 
                              className="text-[9px] h-4 px-1.5"
                            >
                              {tx.status === 'paid' ? 'Paid' : 
                               tx.status === 'pending' ? 'Pending' : 
                               tx.status === 'expired' ? 'Expired' :
                               tx.status === 'cancelled' ? 'Cancelled' : 'Failed'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

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
                      <span className="text-2xl font-bold">Simulate Your Needs</span>
                    ) : isFree ? (
                      <span className="text-2xl font-bold">$0</span>
                    ) : (() => {
                      const originalPrice = isAnnual ? plan.annualMonthlyDisplay : plan.monthlyDisplay;
                      const promo = getPromoForPlan(plan.id);
                      const discountedPrice = promo ? Math.round(originalPrice * (1 - promo.discountPercent / 100)) : originalPrice;
                      const hasDiscount = promo !== null;
                      const discountPercent = promo?.discountPercent;
                      
                      return (
                        <>
                          {hasDiscount && (
                            <Badge className="bg-green-500 text-white text-xs mb-1">
                              {discountPercent}% off
                            </Badge>
                          )}
                          <div className="flex items-baseline gap-1">
                            {hasDiscount && (
                              <span className="text-lg text-muted-foreground line-through">
                                ${originalPrice}
                              </span>
                            )}
                            <span className={`text-2xl font-bold ${hasDiscount ? 'text-green-600' : ''}`}>
                              ${hasDiscount ? discountedPrice : originalPrice}
                            </span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </div>
                          {isAnnual && plan.monthlyPrice > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ${discountedPrice * 12}/yr
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  <ul className="space-y-1.5">
                    {plan.features.slice(0, 5).map((feature: string, index: number) => (
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
                          {plan.features.slice(5).map((feature: string, index: number) => (
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
                    <CustomPlanRequestDialog
                      skipAuthCheck={true}
                      trigger={
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm"
                          data-testid="button-contact-sales-custom"
                        >
                          Custom Request
                          <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Button>
                      }
                    />
                  ) : isCurrent ? (
                    <Button variant="outline" disabled className="w-full" size="sm" data-testid={`button-current-plan-${plan.id}`}>{t("dashboard.billing.currentPlan")}</Button>
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
                  ) : (() => {
                    const currentPlanIndex = dbPlans.findIndex((p: any) => p.id === billingStatus?.planId);
                    const selectedPlanIndex = dbPlans.findIndex((p: any) => p.id === plan.id);
                    const isDowngrade = selectedPlanIndex < currentPlanIndex;
                    return (
                      <Button 
                        className="w-full" 
                        variant={isPopular ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-${isDowngrade ? 'downgrade' : 'upgrade'}-${plan.id}`}
                      >
                        {checkoutMutation.isPending ? 'Processing...' : 
                         billingStatus?.status === 'trial' ? 'Start Plan' : (isDowngrade ? 'Downgrade' : 'Upgrade')}
                      </Button>
                    );
                  })()}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Services Section */}
      {addonConfigs.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Additional Services</h2>
            <p className="text-sm text-muted-foreground">Aktifkan fitur premium untuk meningkatkan kemampuan chatbot Anda</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addonConfigs.map((config: any) => {
              const addon = merchantAddons.find((a: any) => a.addonType === config.addonType);
              const isActive = addon?.isActive;
              const trialActive = isActive && addon?.trialEndsAt && new Date(addon.trialEndsAt) > new Date();
              const trialDaysLeft = addon?.trialEndsAt
                ? Math.max(0, Math.ceil((new Date(addon.trialEndsAt).getTime() - Date.now()) / 86400000))
                : null;
              const usedTrial = !!addon?.trialEndsAt;
              const Icon = config.addonType === "hospitality" ? Hotel : Calendar;

              return (
                <Card key={config.addonType} data-testid={`card-addon-billing-${config.addonType}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{config.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm font-semibold text-primary">
                              ${config.monthlyPriceUsd}/bulan
                            </span>
                            {isActive && trialActive ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="w-3 h-3" />
                                Trial — {trialDaysLeft}h tersisa
                              </Badge>
                            ) : isActive ? (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t("dashboard.common.active")}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {config.addonType === "appointment_scheduling" && (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t("dashboard.billing.featureDivisionMgmt")}</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t("dashboard.billing.featureCalendarLink")}</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t("dashboard.billing.featureAIAvailability")}</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t("dashboard.billing.featureWhatsApp")}</li>
                      </ul>
                    )}
                    {config.addonType === "hospitality" && (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t("dashboard.billing.featureRoomData")}</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t("dashboard.billing.roomCardsFeature")}</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Badge "Harga Terbaik" &amp; "Hampir Penuh"</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Tombol "Pesan Sekarang" ke URL pemesanan</li>
                      </ul>
                    )}
                    <div className="flex gap-2 pt-1">
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(config.addonType === "appointment_scheduling" ? "/dashboard/appointments" : "/dashboard/additional-services")}
                          data-testid={`button-manage-addon-${config.addonType}`}
                        >
                          {t("dashboard.common.manage")}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      ) : (
                        <>
                          {!usedTrial && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => addonTrialMutation.mutate(config.addonType)}
                              disabled={addonTrialMutation.isPending}
                              data-testid={`button-trial-addon-${config.addonType}`}
                            >
                              {addonTrialMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Gift className="w-3 h-3 mr-1" />}
                              Coba Gratis 7 Hari
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/dashboard/checkout?addon=${config.addonType}`)}
                            data-testid={`button-buy-addon-${config.addonType}`}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Berlangganan
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Custom Plan Request Status */}
      {pendingCustomRequest && (
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" data-testid="card-pending-custom-request">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-purple-900 dark:text-purple-100">Custom Plan Request</p>
                    <Badge 
                      variant="secondary" 
                      className={
                        pendingCustomRequest.status === "submitted" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : pendingCustomRequest.status === "under_review"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                      }
                    >
                      {pendingCustomRequest.status === "submitted" ? "Submitted" : 
                       pendingCustomRequest.status === "under_review" ? "Under Review" : 
                       pendingCustomRequest.status === "pricing_proposed" ? "Pricing Proposed" : 
                       pendingCustomRequest.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {pendingCustomRequest.status === "submitted" 
                      ? "Your custom plan request has been submitted. Our team will review it shortly."
                      : pendingCustomRequest.status === "under_review"
                      ? "Our team is reviewing your custom plan requirements."
                      : pendingCustomRequest.status === "pricing_proposed"
                      ? "We've proposed pricing for your custom plan. Please check your invoices."
                      : "Your request is being processed."}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Submitted on {format(new Date(pendingCustomRequest.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCustomRequestDetails(true)}
                className="border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/50 shrink-0"
                data-testid="button-view-custom-request-details"
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <QrCode className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Secure Payment with QRIS</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We accept payments via QRIS - scan the QR code with any Indonesian e-wallet or mobile banking app (GoPay, OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin, etc.).
                  All plans include a {trialDays}-day free trial. Start with the Starter plan and upgrade anytime as your business grows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {billingStatus?.hasActiveSubscription && (
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-red-900 dark:text-red-200">Manage Subscription</p>
                  <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                    Cancel or delete your account
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowCancelDialog(true)}
                    data-testid="button-cancel-subscription"
                  >
                    Cancel Subscription
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="button-delete-account"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={qrisPaymentOpen} onOpenChange={handleClosePayment}>
        <DialogContent className="sm:max-w-md max-h-[95vh] p-0 flex flex-col gap-0">
          {/* Checkout Confirmation Step */}
          {paymentStep === 'checkout' && selectedPlan && (
            <div className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1">
                <div className="space-y-5 p-4 sm:p-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl">Checkout Confirmation</DialogTitle>
                    <DialogDescription className="text-sm">
                      Review your order before proceeding to payment
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Order Details */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  {(() => {
                    const exchangeRate = (platformSettings as any)?.exchange_rate ? parseInt((platformSettings as any).exchange_rate) : 16000;
                    const priceUSD = isAnnual ? (selectedPlan.annualPrice || 0) : (selectedPlan.monthlyPrice || 0);
                    const priceIDR = Math.round(priceUSD * exchangeRate);
                    const promo = getPromoForPlan(selectedPlan.id);
                    const discountPercent = promo?.discountPercent || 0;
                    const discountAmount = Math.round(priceIDR * discountPercent / 100);
                    const finalPrice = priceIDR - discountAmount;
                    
                    let finalPaymentIDR = finalPrice;
                    if (prorationInfo?.prorationApplied && prorationInfo?.finalAmount) {
                      finalPaymentIDR = Math.round(prorationInfo.finalAmount * exchangeRate) - discountAmount;
                    }
                    
                    return (
                      <>
                        {/* Plan Name with USD Price */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-primary" />
                            <span className="font-semibold">{selectedPlan.name} Plan</span>
                          </div>
                          <span className="text-lg font-bold text-primary">${priceUSD.toFixed(2)}</span>
                        </div>
                        
                        {/* Billing Period Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/20">
                            {isAnnual ? 'Annual' : 'Monthly'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Rate: Rp {exchangeRate.toLocaleString('id-ID')}/USD
                          </span>
                        </div>
                        
                        {/* Price Breakdown */}
                        <div className="space-y-2 pt-2 border-t border-primary/10">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{isAnnual ? 'Annual' : 'Monthly'} Price</span>
                            <span>Rp {priceIDR.toLocaleString('id-ID')}</span>
                          </div>
                          {discountPercent > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Discount ({discountPercent}%)</span>
                              <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                            </div>
                          )}
                          {prorationInfo?.prorationApplied && prorationInfo?.creditAmount && (
                            <div className="flex justify-between text-sm text-blue-600">
                              <span>Credit from previous plan</span>
                              <span>- Rp {Math.round(prorationInfo.creditAmount * exchangeRate).toLocaleString('id-ID')}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-primary/10">
                            <span className="font-semibold">Total Payment</span>
                            <span className="text-2xl font-bold text-primary">
                              Rp {finalPaymentIDR.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Plan Features */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Features Included
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{selectedPlan.conversationsLimit?.toLocaleString() || 'Unlimited'} conversations/month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{selectedPlan.supervisorsLimit || 'Unlimited'} supervisor</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{selectedPlan.agentsLimit || 'Unlimited'} AI agent</span>
                    </li>
                    {selectedPlan.features?.slice(0, 3).map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Terms & Conditions */}
                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="w-4 h-4" />
                    Terms & Conditions
                  </h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                    <li>• Payment is non-refundable after activation</li>
                    <li>• Subscription will automatically renew each period</li>
                    <li>• You can cancel your subscription at any time</li>
                    <li>• Upgrade takes effect immediately after successful payment</li>
                    <li>• Prices may change with 30 days notice</li>
                  </ul>
                </div>

                {/* Terms Acceptance */}
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    data-testid="checkbox-terms"
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    I agree to the <span className="text-primary font-medium">Terms & Conditions</span> and understand that payment will be processed after confirmation
                  </label>
                </div>
              </div>
              </ScrollArea>

              {/* Action Buttons - Always Visible at Bottom */}
              <div className="flex gap-3 p-4 sm:p-6 border-t bg-background shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClosePayment}
                  data-testid="button-cancel-checkout"
                >
                  Cancel
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
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <div>
                <p className="font-medium">Preparing payment...</p>
                <p className="text-sm text-muted-foreground">Please wait while we generate your QR code</p>
              </div>
            </div>
          )}

          {paymentStep === 'qris' && qrisData && (
            <ScrollArea className="flex-1 max-h-[80vh]">
              <div className="space-y-5 pr-4">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl">Scan & Bayar</DialogTitle>
                    <DialogDescription className="text-sm">
                      Scan kode QR dengan aplikasi e-wallet atau mobile banking
                    </DialogDescription>
                  </DialogHeader>
                </div>
                
                {/* Plan Info Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{qrisData.planName}</span>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/20">
                      {qrisData.billingInterval === 'annual' ? 'Tahunan' : 'Bulanan'}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">Rp {(qrisData.amount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  {qrisData.amountUSD && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${qrisData.amountUSD?.toFixed(2)} USD
                    </p>
                  )}
                </div>

                {/* QR Code */}
                <div className="relative">
                  <div className="flex justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-muted-foreground/20">
                    {qrisData.qrisImageUrl ? (
                      <img 
                        src={qrisData.qrisImageUrl} 
                        alt="QRIS Payment Code" 
                        className="w-44 h-44 object-contain"
                        data-testid="img-qris-code"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-muted rounded-xl">
                        <QrCode className="w-20 h-20 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Timer Badge */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white rounded-full text-sm font-medium shadow-lg">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleSaveQRIS}
                    data-testid="button-save-qris"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleDemoPayment}
                    data-testid="button-demo-pay"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Demo Pay
                  </Button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="relative">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping absolute" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full relative" />
                  </div>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Waiting for payment...
                  </span>
                </div>

                {/* Supported Apps */}
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    GoPay • OVO • DANA • ShopeePay • LinkAja • BCA • Mandiri • BRI • BNI
                  </p>
                </div>
              </div>
            </ScrollArea>
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

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Anda yakin ingin membatalkan langganan? Anda masih dapat mengakses layanan hingga akhir periode.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelSubscriptionMutation.isPending ? "Canceling..." : "Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Anda akan kehilangan: semua chat sessions, supervisors, knowledge base, dan pengaturan.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>
              Keep Account
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Custom Invoice Confirmation Dialog */}
      <Dialog open={showCancelInvoiceConfirm} onOpenChange={setShowCancelInvoiceConfirm}>
        <DialogContent data-testid="dialog-cancel-invoice-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cancel Invoice?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this custom plan invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                setShowCancelInvoiceConfirm(false);
                setInvoiceToCancel(null);
              }}
              data-testid="button-cancel-invoice-no"
            >
              No, Keep Invoice
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (invoiceToCancel) {
                  cancelInvoiceMutation.mutate(invoiceToCancel);
                }
              }}
              disabled={cancelInvoiceMutation.isPending}
              data-testid="button-cancel-invoice-yes"
            >
              {cancelInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Invoice"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Pending Payment Confirmation Dialog */}
      <Dialog open={showCancelPendingConfirmDialog} onOpenChange={setShowCancelPendingConfirmDialog}>
        <DialogContent data-testid="dialog-cancel-pending-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pending Payment Exists
            </DialogTitle>
            <DialogDescription>
              You already have a pending payment. To proceed with a new order, your existing pending payment must be cancelled first.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {pendingPaymentDetails?.hasPendingPayment && (
                  <>Pending: {pendingPaymentDetails.planName} Plan - {pendingPaymentDetails.amountFormatted}</>
                )}
                {customInvoices.filter(inv => inv.status === 'pending').length > 0 && (
                  <>{pendingPaymentDetails?.hasPendingPayment && <br />}Pending: Custom Plan Invoice</>
                )}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Would you like to cancel the pending payment and proceed with the new order?
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                setShowCancelPendingConfirmDialog(false);
                setPendingNewPurchase(null);
              }}
              data-testid="button-keep-pending"
            >
              No, Keep Pending
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirmCancelAndProceed}
              disabled={cancelPendingPaymentMutation.isPending || cancelInvoiceMutation.isPending}
              data-testid="button-cancel-and-proceed"
            >
              {(cancelPendingPaymentMutation.isPending || cancelInvoiceMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel & Proceed"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Plan Request Details Dialog */}
      <Dialog open={showCustomRequestDetails} onOpenChange={setShowCustomRequestDetails}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-custom-request-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Custom Plan Request Details
            </DialogTitle>
            <DialogDescription>
              Review the details of your custom plan request.
            </DialogDescription>
          </DialogHeader>
          {pendingCustomRequest && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge 
                  variant="secondary" 
                  className={
                    pendingCustomRequest.status === "submitted" 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : pendingCustomRequest.status === "under_review"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                  }
                >
                  {pendingCustomRequest.status === "submitted" ? "Submitted" : 
                   pendingCustomRequest.status === "under_review" ? "Under Review" : 
                   pendingCustomRequest.status === "pricing_proposed" ? "Pricing Proposed" : 
                   pendingCustomRequest.status}
                </Badge>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Requested Resources</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Conversations:</span>
                    <span className="font-medium">{pendingCustomRequest.desiredConversations.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">AI Agents:</span>
                    <span className="font-medium">{pendingCustomRequest.desiredAgents}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Supervisors:</span>
                    <span className="font-medium">{pendingCustomRequest.desiredSupervisors}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Sources:</span>
                    <span className="font-medium">{pendingCustomRequest.desiredSources === 100 ? "Unlimited" : pendingCustomRequest.desiredSources}</span>
                  </div>
                </div>
              </div>
              
              {pendingCustomRequest.message && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Your Message</h4>
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-wrap">
                      {pendingCustomRequest.message}
                    </p>
                  </div>
                </div>
              )}

              {pendingCustomRequest.status === "pricing_proposed" && pendingCustomRequest.proposedPrice && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Proposed Pricing</h4>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                      ${pendingCustomRequest.proposedPrice.toFixed(2)} / {pendingCustomRequest.proposedBillingInterval || 'month'}
                    </p>
                    {pendingCustomRequest.adminNotes && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {pendingCustomRequest.adminNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p>Submitted on {format(new Date(pendingCustomRequest.createdAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
                {pendingCustomRequest.updatedAt !== pendingCustomRequest.createdAt && (
                  <p>Last updated {format(new Date(pendingCustomRequest.updatedAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowCustomRequestDetails(false)}
              data-testid="button-close-custom-request-details"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
