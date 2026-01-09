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
import { Receipt, Mail, Building2, CreditCard, History, FileText, Calendar, Zap, ArrowRight, Timer, Clock, Copy, XCircle, RefreshCw, Loader2, Eye, Download } from "lucide-react";
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
}

export default function BillingDetailsPage() {
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
        title: "Payment Cancelled",
        description: "Your pending payment has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/pending-payment-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel payment. Please try again.",
        variant: "destructive",
      });
    },
  });

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
            title: "Saved!",
            description: "Order details saved to your device.",
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
        title: "Downloaded!",
        description: "Order details image has been downloaded.",
      });
    } catch (error) {
      console.error('Failed to save image:', error);
      toast({
        title: "Error",
        description: "Failed to save image. Please try again.",
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
        title: "Billing details updated",
        description: "Your billing information has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update",
        description: "Something went wrong. Please try again.",
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
      description: "Trial Period",
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
        <h1 className="text-2xl font-bold">Billing Details</h1>
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
                <CardTitle className="text-lg">Awaiting Payment</CardTitle>
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
                    toast({ title: "Copied!", description: "Order ID copied to clipboard" });
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
              <p className="text-sm text-muted-foreground">Amount to Pay</p>
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
                <p className="text-sm font-medium">Transfer to Virtual Account</p>
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
                      toast({ title: "Copied!", description: "VA number copied to clipboard" });
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
                <p className="text-sm font-medium">Transfer to Bank Account</p>
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
                        toast({ title: "Copied!", description: "Account number copied to clipboard" });
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
      ) : (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    Manage your payments and subscriptions
                  </p>
                  <p className="text-sm text-muted-foreground">
                    View transaction status or upgrade plan
                  </p>
                </div>
              </div>
              <Button 
                size="default"
                className="shrink-0 min-w-[180px]"
                asChild
                data-testid="button-checkout"
              >
                <Link href="/dashboard/checkout?from=billing">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View Subscription Plans
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Plan Invoices Section */}
      {customInvoices.filter(inv => inv.status === 'pending').length > 0 && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-sm text-purple-900 dark:text-purple-100">Invoices Menunggu Pembayaran</CardTitle>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-700">
                {customInvoices.filter(inv => inv.status === 'pending').length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="space-y-3">
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                customInvoices.filter(inv => inv.status === 'pending').map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800"
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          Custom Plan - {invoice.billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-purple-600">
                          ${invoice.amount.toLocaleString()}
                        </p>
                        {invoice.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Jatuh tempo: {new Date(invoice.dueDate).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3 h-3" />
                      <span>Dibuat: {new Date(invoice.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex gap-2">
                      {invoice.pdfUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          asChild
                          data-testid={`button-download-invoice-${invoice.id}`}
                        >
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3 mr-1" />
                            Download PDF
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="text-xs h-7 bg-purple-600 hover:bg-purple-700"
                        data-testid={`button-pay-invoice-${invoice.id}`}
                        asChild
                      >
                        <Link href={`/dashboard/checkout?invoiceId=${invoice.id}&plan=custom`}>
                          Bayar Sekarang
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle>Billing Information</CardTitle>
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
              <CardTitle>Payment Method</CardTitle>
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
            <CardTitle>Billing History</CardTitle>
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
            <DialogTitle>Order Details</DialogTitle>
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
                <p className="text-sm text-gray-500 mb-4">Gunakan e-wallet atau mobile banking</p>
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
                        toast({ title: "Copied!", description: "Order ID copied" });
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
              <p className="text-sm text-gray-500 mb-1">TOTAL PEMBAYARAN</p>
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
    </div>
  );
}
