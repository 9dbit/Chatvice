import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Mail, Building2, CreditCard, History, FileText, Calendar, Zap, ArrowRight, Timer, Clock, Copy, XCircle, RefreshCw, Loader2, Eye, Download, X, AlertTriangle, Wallet, MessageSquare, Users, Bot, BookOpen, HelpCircle } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import type { Merchant } from "@shared/schema";
import chatviceLightLogo from "@assets/Chatvice-02_1767458901049.png";
import gpnLogo from "@assets/IMG_1410_1767458901049.png";

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

const billingDetailsSchema = z.object({
  billingEmail: z.string().email("Please enter a valid email"),
  taxId: z.string().optional(),
  billingMethod: z.enum(["card", "bank_transfer", "invoice"]),
});

type BillingDetailsData = z.infer<typeof billingDetailsSchema>;

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

interface CustomPlanInvoice {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  requestId: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  conversationsLimit: number;
  agentsLimit: number;
  supervisorsLimit: number;
  sourcesLimit: number;
  billingCycle: string;
  features: string[];
  paymentMethod?: string | null;
  transactionId?: string | null;
  expiryTime?: string | null;
  qrisString?: string | null;
  vaNumber?: string | null;
  bankCode?: string | null;
}

// Custom Plan Request interface
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

// Bank transfer account info
const BANK_TRANSFER_INFO = {
  bankName: "BCA",
  bankCode: "BCA",
  accountNumber: "8465075678",
  accountName: "PT Chatvice Technology Indonesia",
};

// Crypto wallet addresses
const CRYPTO_WALLETS = {
  btc: { address: "bc1q9mk7032hjfu0fu9cnk0c3tgk7z5vxswaz3avy6", network: "Bitcoin Network" },
  eth: { address: "0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7", network: "ERC-20" },
  usdt: { address: "0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7", network: "TRC-20 / ERC-20" },
};

export default function BillingDetailsPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [pendingPaymentTimeRemaining, setPendingPaymentTimeRemaining] = useState<number>(0);
  const pendingPaymentCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const orderDetailsRef = useRef<HTMLDivElement>(null);

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: billingStatus } = useQuery<{
    status: string;
    planName: string;
    billingInterval: string;
    currentPeriodEnd: string | null;
  }>({
    queryKey: ["/api/billing/status"],
    enabled: !!merchantId,
  });

  // Fetch detailed pending payment info
  const { data: pendingPaymentDetails, refetch: refetchPendingPayment, isLoading: isPendingPaymentLoading } = useQuery<PendingPaymentDetails>({
    queryKey: ["/api/billing/pending-payment-details"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Fetch custom plan invoices
  const { data: customInvoices = [], isLoading: isLoadingInvoices } = useQuery<CustomPlanInvoice[]>({
    queryKey: ["/api/merchant/custom-invoices"],
    enabled: !!merchantId,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Fetch custom plan requests (for showing "Submission Under Review" status)
  const { data: customRequests = [] } = useQuery<CustomPlanRequest[]>({
    queryKey: ["/api/merchant/custom-plan-requests"],
    enabled: !!merchantId,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Get the most recent pending/under-review request
  const pendingCustomRequest = customRequests.find(r => 
    r.status === "submitted" || r.status === "under_review" || r.status === "pricing_proposed"
  );

  // State for custom request details dialog
  const [showCustomRequestDetails, setShowCustomRequestDetails] = useState(false);

  // Pending payment countdown timer
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

  // State for invoice payment flow
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<CustomPlanInvoice | null>(null);
  const [showInvoiceDetailsDialog, setShowInvoiceDetailsDialog] = useState(false);
  const [invoiceDetailsView, setInvoiceDetailsView] = useState<CustomPlanInvoice | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showUploadProofView, setShowUploadProofView] = useState(false);

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
      // Close invoice details dialog if open
      setShowInvoiceDetailsDialog(false);
      setShowUploadProofView(false);
      setInvoiceDetailsView(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to submit payment proof.",
        variant: "destructive",
      });
    },
  });

  // Select payment method mutation
  const selectPaymentMethodMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentMethod }: { invoiceId: string; paymentMethod: string }) => {
      const response = await apiRequest("POST", `/api/merchant/custom-invoices/${invoiceId}/select-payment-method`, { paymentMethod });
      return response.json() as Promise<{ success: boolean; paymentMethod: string; invoiceNumber: string }>;
    },
    onSuccess: (data) => {
      // Invalidate and refetch invoices to get fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-invoices"] });
      setShowPaymentMethodDialog(false);
      
      // Update invoice view with selected payment method from response
      if (selectedInvoiceForPayment) {
        const updatedInvoice = {
          ...selectedInvoiceForPayment,
          paymentMethod: data.paymentMethod || selectedPaymentMethod
        };
        setInvoiceDetailsView(updatedInvoice);
        setShowInvoiceDetailsDialog(true);
      }
      
      setSelectedPaymentMethod(null);
      setSelectedInvoiceForPayment(null);
      
      toast({
        title: t("dashboard.billing.paymentMethodSelected"),
        description: t("dashboard.billing.paymentMethodSelectedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.billing.selectMethodFailed"),
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

  // Format countdown
  const formatPendingCountdown = () => {
    const hours = Math.floor(pendingPaymentTimeRemaining / 3600);
    const minutes = Math.floor((pendingPaymentTimeRemaining % 3600) / 60);
    const seconds = pendingPaymentTimeRemaining % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
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

  // Save order details as image to device gallery
  const saveToGallery = useCallback(async () => {
    if (!orderDetailsRef.current || !pendingPaymentDetails) return;
    
    setIsSavingImage(true);
    try {
      const canvas = await html2canvas(orderDetailsRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      // Convert to JPG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create image'));
        }, 'image/jpeg', 0.95);
      });
      
      // Create filename with order ID and timestamp
      const filename = `Chatvice_Order_${pendingPaymentDetails.orderId}_${Date.now()}.jpg`;
      
      // Try using the File System Access API for modern browsers
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as unknown as { showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JPEG Image',
              accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast({
            title: t("common.saved"),
            description: t("dashboard.billing.orderSaved"),
          });
          return;
        } catch (e) {
          // User cancelled or API not supported, fall back to download
        }
      }
      
      // Fallback: trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: t("dashboard.billing.downloaded"),
        description: t("dashboard.billing.orderDownloaded"),
      });
    } catch (error) {
      console.error('Failed to save image:', error);
      toast({
        title: t("common.error"),
        description: t("dashboard.billing.imageSaveFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSavingImage(false);
    }
  }, [pendingPaymentDetails, toast]);

  const form = useForm<BillingDetailsData>({
    resolver: zodResolver(billingDetailsSchema),
    defaultValues: {
      billingEmail: merchant?.email || "",
      taxId: "",
      billingMethod: "card",
    },
  });

  const updateBillingMutation = useMutation({
    mutationFn: async (data: BillingDetailsData) => {
      return apiRequest("POST", "/api/billing/update-details", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: t("dashboard.billing.billingUpdated"),
        description: t("dashboard.billing.billingUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.billing.updateFailed"),
        description: t("common.tryAgainDesc"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BillingDetailsData) => {
    updateBillingMutation.mutate(data);
  };

  const billingHistory: BillingHistory[] = [
    {
      id: "1",
      date: new Date().toISOString(),
      amount: 0,
      status: "paid",
      description: t("dashboard.billing.trialPeriod"),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.billingDetails.title")}</h1>
        <p className="text-muted-foreground">
          Manage your billing information and payment methods.
        </p>
      </div>

      {/* Awaiting Payment Section */}
      {isPendingPaymentLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : pendingPaymentDetails?.hasPendingPayment ? (
        <Card className="border-amber-500/50 bg-amber-500/5" data-testid="card-pending-transaction">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg">{t("dashboard.billingDetails.awaitingPayment")}</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {pendingPaymentDetails.planName} - {pendingPaymentDetails.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}
              </Badge>
            </div>
            <CardDescription>
              Complete your payment before it expires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Info Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Order ID:</span>
                <code className="text-sm font-mono">{pendingPaymentDetails.orderId}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(pendingPaymentDetails.orderId || '');
                    toast({ title: t("common.copied"), description: t("dashboard.billing.orderIdCopied") });
                  }}
                  data-testid="button-copy-order-id"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Expires in {formatPendingCountdown()}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">{t("dashboard.billingDetails.amountToPay")}</p>
              <p className="text-2xl font-bold text-primary">{pendingPaymentDetails.amountFormatted}</p>
            </div>

            {/* Payment Method Specific Content */}
            {pendingPaymentDetails.paymentMethod === 'qris' && pendingPaymentDetails.qrisString && (
              <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm font-medium">Scan QR Code with any QRIS-enabled app</p>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={pendingPaymentDetails.qrisString} size={180} level="M" />
                </div>
              </div>
            )}

            {pendingPaymentDetails.paymentMethod === 'virtual_account' && pendingPaymentDetails.vaNumber && (
              <div className="flex flex-col items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                <p className="text-sm font-medium">{t("dashboard.billingDetails.transferVA")}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Bank:</span>
                  <span className="font-medium">{getBankName(pendingPaymentDetails.bankCode || '')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-bold">{pendingPaymentDetails.vaNumber}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(pendingPaymentDetails.vaNumber || '');
                      toast({ title: t("common.copied"), description: t("dashboard.billing.vaNumberCopied") });
                    }}
                    data-testid="button-copy-va-number"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {pendingPaymentDetails.paymentMethod === 'bank_transfer' && pendingPaymentDetails.accountNumber && (
              <div className="flex flex-col items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                <p className="text-sm font-medium">{t("dashboard.billingDetails.transferBank")}</p>
                <div className="grid grid-cols-2 gap-4 text-sm w-full max-w-sm">
                  <div className="text-muted-foreground">Bank:</div>
                  <div className="font-medium">Bank Danamon</div>
                  <div className="text-muted-foreground">Account:</div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono">{pendingPaymentDetails.accountNumber}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(pendingPaymentDetails.accountNumber || '');
                        toast({ title: t("common.copied"), description: t("dashboard.billing.accountCopied") });
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-muted-foreground">Name:</div>
                  <div className="font-medium">{pendingPaymentDetails.accountName}</div>
                  {pendingPaymentDetails.uniqueCode && (
                    <>
                      <div className="text-muted-foreground">Unique Code:</div>
                      <div className="font-medium text-amber-600">+{pendingPaymentDetails.uniqueCode}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowOrderDetailsDialog(true)}
                data-testid="button-view-order-details"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => navigate(`/dashboard/checkout?resume=${pendingPaymentDetails.transactionId}`)}
                data-testid="button-view-checkout-payment"
              >
                <Receipt className="w-4 h-4 mr-2" />
                View Checkout
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
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
                variant="outline"
                className="flex-1"
                onClick={() => refetchPendingPayment()}
                data-testid="button-refresh-payment-status"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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

      {/* Custom Plan Invoices Section - Unified UI with Plans page */}
      {customInvoices.filter(inv => inv.status === 'pending' || inv.status === 'awaiting_confirmation').length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-semibold text-amber-700 dark:text-amber-400">{t("dashboard.billingDetails.awaitingPayment")}</CardTitle>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {customInvoices.filter(inv => inv.status === 'pending' || inv.status === 'awaiting_confirmation').length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              customInvoices.filter(inv => inv.status === 'pending' || inv.status === 'awaiting_confirmation').map((invoice) => {
                const exchangeRate = 16800;
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
                          Custom Plan - {invoice.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}
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
                    
                    {/* Resource Limits Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3 py-2 px-2 bg-muted/30 rounded-md">
                      <div>
                        <span className="text-muted-foreground">Conversations:</span>
                        <span className="ml-1 font-medium">
                          {(invoice as any).conversationsLimit === -1 ? '∞' : ((invoice as any).conversationsLimit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">AI Agents:</span>
                        <span className="ml-1 font-medium">
                          {(invoice as any).agentsLimit === -1 ? '∞' : (invoice as any).agentsLimit || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Supervisors:</span>
                        <span className="ml-1 font-medium">
                          {(invoice as any).supervisorsLimit === -1 ? '∞' : (invoice as any).supervisorsLimit || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sources:</span>
                        <span className="ml-1 font-medium">
                          {(invoice as any).knowledgeSourcesLimit === -1 ? '∞' : (invoice as any).knowledgeSourcesLimit || 0}
                        </span>
                      </div>
                    </div>
                    
                    {invoice.dueDate && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Due: {new Date(invoice.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    
                    {isAwaitingConfirmation ? (
                      /* Status: awaiting_confirmation - Payment proof submitted, under review */
                      <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Payment Under Review</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Your payment proof is being reviewed by admin. Your custom plan will be activated soon.</p>
                        </div>
                      </div>
                    ) : !invoice.paymentMethod ? (
                      /* Status: pending, no payment method - Show Pay Now button */
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
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              // Redirect to checkout page with invoice ID
                              navigate(`/dashboard/checkout?invoiceId=${invoice.id}&from=billing`);
                            }}
                            data-testid={`button-pay-now-${invoice.id}`}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Status: pending with payment method selected - Show View Invoice button */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              Payment Pending - {invoice.paymentMethod === 'crypto' ? 'Cryptocurrency' : 
                                invoice.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                                invoice.paymentMethod === 'qris' ? 'QRIS' :
                                invoice.paymentMethod === 'virtual_account' ? 'Virtual Account' : invoice.paymentMethod}
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              {invoice.paymentMethod === 'crypto' || invoice.paymentMethod === 'bank_transfer' 
                                ? 'Complete your transfer and upload payment proof.'
                                : 'Complete your payment before expiry time.'}
                            </p>
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
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              setInvoiceDetailsView(invoice);
                              setShowUploadProofView(false);
                              setShowInvoiceDetailsDialog(true);
                            }}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Invoice
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle>{t("dashboard.billingDetails.billingInformation")}</CardTitle>
            </div>
            <CardDescription>
              Update your billing contact and tax details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Billing Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="billing@company.com"
                          data-testid="input-billing-email"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Invoices will be sent to this email address.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Tax ID (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., VAT123456789"
                          data-testid="input-tax-id"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your company's tax identification number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={updateBillingMutation.isPending}
                  data-testid="button-save-billing"
                >
                  {updateBillingMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <CardTitle>{t("dashboard.billingDetails.paymentMethod")}</CardTitle>
            </div>
            <CardDescription>
              Choose how you'd like to pay for your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <FormField
                control={form.control}
                name="billingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                          <RadioGroupItem value="card" id="card" data-testid="radio-payment-card" />
                          <label htmlFor="card" className="flex-1 cursor-pointer">
                            <div className="font-medium">Credit/Debit Card</div>
                            <p className="text-sm text-muted-foreground">Pay with Visa, Mastercard, or AMEX</p>
                          </label>
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                          <RadioGroupItem value="bank_transfer" id="bank_transfer" data-testid="radio-payment-bank" />
                          <label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                            <div className="font-medium">Bank Transfer</div>
                            <p className="text-sm text-muted-foreground">Pay via direct bank transfer</p>
                          </label>
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                          <RadioGroupItem value="invoice" id="invoice" data-testid="radio-payment-invoice" />
                          <label htmlFor="invoice" className="flex-1 cursor-pointer">
                            <div className="font-medium">Invoice</div>
                            <p className="text-sm text-muted-foreground">Receive monthly invoices (Enterprise only)</p>
                          </label>
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </Form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle>{t("dashboard.billingDetails.billingHistory")}</CardTitle>
          </div>
          <CardDescription>
            View your past invoices and payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length > 0 ? (
            <div className="space-y-3">
              {billingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  data-testid={`billing-history-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {item.amount === 0 ? "Free" : `$${item.amount.toFixed(2)}`}
                    </span>
                    <Badge variant={item.status === "paid" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground">
                Your invoices will appear here after your first payment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {billingStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{billingStatus.planName}</p>
                <p className="text-sm text-muted-foreground">
                  Billed {billingStatus.billingInterval}
                </p>
              </div>
              {billingStatus.currentPeriodEnd && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next billing date</p>
                  <p className="font-medium">
                    {new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("dashboard.billingDetails.orderDetails")}</DialogTitle>
          </DialogHeader>
          
          {/* Capturable Content - Light mode white background */}
          <div ref={orderDetailsRef} className="bg-white text-gray-900 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <img 
                  src={chatviceLightLogo} 
                  alt="Chatvice" 
                  className="h-8 object-contain"
                />
                <div className="border-l border-gray-300 pl-2">
                  <p className="text-xs text-gray-500">Subscription Payment</p>
                </div>
              </div>
              {pendingPaymentDetails?.paymentMethod === 'qris' && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <img 
                    src={gpnLogo} 
                    alt="GPN" 
                    className="h-6 object-contain"
                  />
                  <span className="text-sm font-bold text-gray-700">QRIS</span>
                </div>
              )}
              {pendingPaymentDetails?.paymentMethod === 'virtual_account' && (
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">{getBankName(pendingPaymentDetails.bankCode || '')}</span>
                </div>
              )}
            </div>

            {/* Payment Section */}
            {pendingPaymentDetails?.paymentMethod === 'qris' && pendingPaymentDetails.qrisString && (
              <div className="text-center mb-6">
                <h3 className="font-semibold text-lg mb-1">SCAN TO PAY</h3>
                <p className="text-sm text-gray-500 mb-4">{t("dashboard.billingDetails.useEwalletOrMobileBanking")}</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 inline-block mb-4">
                  <QRCodeSVG value={pendingPaymentDetails.qrisString} size={200} level="M" />
                </div>
                <p className="text-xs text-gray-400">
                  GoPay • OVO • DANA • ShopeePay • LinkAja<br/>
                  BCA • Mandiri • BRI • BNI • CIMB
                </p>
              </div>
            )}

            {pendingPaymentDetails?.paymentMethod === 'virtual_account' && pendingPaymentDetails.vaNumber && (
              <div className="text-center mb-6">
                <h3 className="font-semibold text-lg mb-1">TRANSFER TO</h3>
                <p className="text-sm text-gray-500 mb-4">Virtual Account {getBankName(pendingPaymentDetails.bankCode || '')}</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
                  <p className="text-2xl font-mono font-bold tracking-wider">{pendingPaymentDetails.vaNumber}</p>
                </div>
                <p className="text-xs text-gray-400">
                  Transfer exact amount to complete payment
                </p>
              </div>
            )}

            {pendingPaymentDetails?.paymentMethod === 'bank_transfer' && pendingPaymentDetails.accountNumber && (
              <div className="text-center mb-6">
                <h3 className="font-semibold text-lg mb-1">BANK TRANSFER</h3>
                <p className="text-sm text-gray-500 mb-4">Transfer to Bank Danamon</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
                  <p className="text-xl font-mono font-bold tracking-wider">{pendingPaymentDetails.accountNumber}</p>
                  <p className="text-sm text-gray-600 mt-1">a.n. {pendingPaymentDetails.accountName}</p>
                  {pendingPaymentDetails.uniqueCode && (
                    <p className="text-amber-600 font-medium mt-2">+ Unique Code: {pendingPaymentDetails.uniqueCode}</p>
                  )}
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="border-l-4 border-primary pl-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">ORDER DETAILS</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Product</span>
                  <span className="font-medium">{pendingPaymentDetails?.planName} Plan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period</span>
                  <span className="font-medium">{pendingPaymentDetails?.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Order ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-right max-w-[180px] break-all">{pendingPaymentDetails?.orderId}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pendingPaymentDetails?.orderId || '');
                        toast({ title: t("common.copied"), description: t("dashboard.billing.orderIdCopied") });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      data-testid="button-copy-order-id-dialog"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">{t("dashboard.billingDetails.totalPayment")}</p>
              <p className="text-2xl font-bold text-primary">{pendingPaymentDetails?.amountFormatted}</p>
            </div>
          </div>

          {/* Download Button - Outside capturable area */}
          <div className="p-4 border-t bg-muted/30">
            <Button
              className="w-full"
              onClick={saveToGallery}
              disabled={isSavingImage}
              data-testid="button-save-order-image"
            >
              {isSavingImage ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Save to Gallery
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
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this custom plan invoice? This action cannot be undone.
          </p>
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

      {/* Payment Method Selection Dialog */}
      <Dialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-select-payment-method">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Select Payment Method
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoiceForPayment && (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{selectedInvoiceForPayment.invoiceNumber}</p>
                <p className="text-lg font-bold text-purple-600">
                  {selectedInvoiceForPayment.currency === 'USD' 
                    ? `$${selectedInvoiceForPayment.amount.toLocaleString()}` 
                    : `Rp ${selectedInvoiceForPayment.amount.toLocaleString("id-ID")}`}
                </p>
              </div>

              {/* Payment Method Options */}
              <div className="space-y-2">
                {[
                  { id: 'qris', name: 'QRIS', description: 'E-wallet & Mobile Banking', icon: '📱' },
                  { id: 'virtual_account', name: 'Virtual Account', description: 'Bank Transfer via VA', icon: '🏦' },
                  { id: 'bank_transfer', name: 'Bank Transfer', description: 'Manual transfer to bank account', icon: '💳' },
                  { id: 'crypto', name: 'Cryptocurrency', description: 'BTC, ETH, USDT', icon: '₿' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedPaymentMethod === method.id 
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                        : 'border-muted hover:border-purple-300'
                    }`}
                    data-testid={`button-select-method-${method.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!selectedPaymentMethod || selectPaymentMethodMutation.isPending}
                onClick={() => {
                  if (selectedInvoiceForPayment && selectedPaymentMethod) {
                    selectPaymentMethodMutation.mutate({
                      invoiceId: selectedInvoiceForPayment.id,
                      paymentMethod: selectedPaymentMethod,
                    });
                  }
                }}
                data-testid="button-confirm-payment-method"
              >
                {selectPaymentMethodMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Continue
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog - Shows payment info based on method */}
      <Dialog open={showInvoiceDetailsDialog} onOpenChange={(open) => {
        setShowInvoiceDetailsDialog(open);
        if (!open) {
          setShowUploadProofView(false);
          setProofFile(null);
          setProofPreview(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-invoice-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-purple-600" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          
          {invoiceDetailsView && (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">{invoiceDetailsView.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">Custom Plan - {invoiceDetailsView.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</p>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {invoiceDetailsView.currency === 'USD' 
                      ? `$${invoiceDetailsView.amount.toLocaleString()}` 
                      : `Rp ${invoiceDetailsView.amount.toLocaleString("id-ID")}`}
                  </p>
                </div>
                {invoiceDetailsView.currency === 'USD' && (
                  <p className="text-xs text-muted-foreground text-right">
                    ≈ Rp {Math.round(invoiceDetailsView.amount * 16800).toLocaleString("id-ID")}
                  </p>
                )}
              </div>

              {/* Payment Information based on method */}
              {invoiceDetailsView.paymentMethod === 'bank_transfer' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Bank Transfer Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{BANK_TRANSFER_INFO.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Account Number</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-medium">{BANK_TRANSFER_INFO.accountNumber}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(BANK_TRANSFER_INFO.accountNumber);
                            toast({ title: t("common.copied"), description: t("dashboard.billing.accountCopied") });
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          data-testid="button-copy-bank-account"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium text-right text-xs">{BANK_TRANSFER_INFO.accountName}</span>
                    </div>
                  </div>
                </div>
              )}

              {invoiceDetailsView.paymentMethod === 'crypto' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Cryptocurrency Payment
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(CRYPTO_WALLETS).map(([coin, info]) => (
                      <div key={coin} className="bg-white dark:bg-zinc-800 rounded-md p-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">{coin.toUpperCase()}</span>
                          <span className="text-xs text-muted-foreground">{info.network}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs break-all flex-1">{info.address}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(info.address);
                              toast({ title: t("common.copied"), description: `${coin.toUpperCase()} address copied` });
                            }}
                            className="text-purple-600 hover:text-purple-800 flex-shrink-0"
                            data-testid={`button-copy-${coin}-address`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoiceDetailsView.paymentMethod === 'qris' && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 text-center">
                  <h4 className="font-semibold mb-2">QRIS Payment</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Payment via QRIS will be generated. Please use any e-wallet or mobile banking app to scan.
                  </p>
                  {invoiceDetailsView.qrisString ? (
                    <div className="bg-white rounded-lg p-4 inline-block">
                      <QRCodeSVG value={invoiceDetailsView.qrisString} size={180} level="M" />
                    </div>
                  ) : (
                    <p className="text-amber-600 text-sm">QRIS code will be generated after payment initiation.</p>
                  )}
                </div>
              )}

              {invoiceDetailsView.paymentMethod === 'virtual_account' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-center">
                  <h4 className="font-semibold mb-2">Virtual Account</h4>
                  {invoiceDetailsView.vaNumber ? (
                    <>
                      <p className="text-2xl font-mono font-bold mb-2">{invoiceDetailsView.vaNumber}</p>
                      <p className="text-sm text-muted-foreground">Bank: {getBankName(invoiceDetailsView.bankCode || '')}</p>
                    </>
                  ) : (
                    <p className="text-amber-600 text-sm">Virtual Account number will be generated after payment initiation.</p>
                  )}
                </div>
              )}

              {/* Upload Proof Section - Only for bank_transfer and crypto */}
              {(invoiceDetailsView.paymentMethod === 'bank_transfer' || invoiceDetailsView.paymentMethod === 'crypto') && (
                <>
                  {showUploadProofView ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Upload Payment Proof</p>
                      <div 
                        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => proofInputRef.current?.click()}
                        data-testid="proof-upload-area-dialog"
                      >
                        <input
                          ref={proofInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProofFileChange}
                          className="hidden"
                          data-testid="proof-input-dialog"
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
                            setShowUploadProofView(false);
                            setProofFile(null);
                            setProofPreview(null);
                          }}
                          data-testid="button-cancel-proof-dialog"
                        >
                          Back
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          disabled={!proofFile || submitProofMutation.isPending}
                          onClick={() => {
                            if (proofFile && invoiceDetailsView) {
                              submitProofMutation.mutate({ invoiceId: invoiceDetailsView.id, file: proofFile });
                            }
                          }}
                          data-testid="button-submit-proof-dialog"
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setInvoiceToCancel(invoiceDetailsView.id);
                          setShowInvoiceDetailsDialog(false);
                          setShowCancelInvoiceConfirm(true);
                        }}
                        data-testid="button-cancel-from-details"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={() => setShowUploadProofView(true)}
                        data-testid="button-upload-proof-from-details"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Upload Proof
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Plan Request Details Dialog */}
      <Dialog open={showCustomRequestDetails} onOpenChange={setShowCustomRequestDetails}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-custom-request-details">
          <DialogHeader>
            <DialogTitle className="text-purple-900 dark:text-purple-100">
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
              
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Requested Resources:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Conversations</p>
                      <p className="font-medium">{pendingCustomRequest.desiredConversations.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <Bot className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">AI Agents</p>
                      <p className="font-medium">{pendingCustomRequest.desiredAgents}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <Users className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Supervisors</p>
                      <p className="font-medium">{pendingCustomRequest.desiredSupervisors}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Knowledge Sources</p>
                      <p className="font-medium">{pendingCustomRequest.desiredSources === -1 ? "Unlimited" : pendingCustomRequest.desiredSources}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {pendingCustomRequest.message && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Your Message:</p>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm">{pendingCustomRequest.message}</p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Submitted on {format(new Date(pendingCustomRequest.createdAt), "MMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
