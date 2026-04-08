import { useLanguage } from "@/hooks/use-language";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Loader2,
  CheckCircle,
  Clock,
  ExternalLink,
  MousePointer,
  UserPlus,
  CreditCard,
  Wallet,
  ArrowRight,
  Building,
  Crown,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  Star,
  Banknote,
  Bitcoin,
  X,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiPaypal } from "react-icons/si";

const CRYPTO_NETWORKS = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDT-TRC20", label: "USDT (TRC20)" },
  { value: "USDT-ERC20", label: "USDT (ERC20)" },
  { value: "BNB", label: "BNB (BEP20)" },
  { value: "SOL", label: "Solana (SOL)" },
  { value: "XRP", label: "Ripple (XRP)" },
];

const COUNTRIES = [
  { code: "ID", name: "Indonesia" },
  { code: "US", name: "United States" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" },
];

export default function AffiliateDashboardPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  
  const [newMethodType, setNewMethodType] = useState<string>("bank_transfer");
  const [methodName, setMethodName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankCountry, setBankCountry] = useState("ID");
  const [swiftCode, setSwiftCode] = useState("");
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalAccountName, setPaypalAccountName] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ["/api/affiliate/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: affiliateSettings } = useQuery({
    queryKey: ["/api/affiliate/settings"],
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/affiliate/dashboard"],
    enabled: (affiliate as any)?.status === "active",
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ["/api/affiliate/payment-methods"],
    enabled: (affiliate as any)?.status === "active",
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["/api/affiliate/withdrawals"],
    enabled: (affiliate as any)?.status === "active",
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/affiliate/apply");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Your affiliate application has been submitted for review.",
      });
      setApplyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/me"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPaymentMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/affiliate/payment-methods", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment method");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Added",
        description: "Your payment method has been saved successfully.",
      });
      setPaymentMethodDialogOpen(false);
      resetPaymentMethodForm();
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/affiliate/payment-methods/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("dashboard.affiliate.paymentMethodDeleted"),
        description: "Your payment method has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/affiliate/withdrawals", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create withdrawal request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("dashboard.affiliate.withdrawalRequested"),
        description: t("dashboard.affiliate.withdrawalSubmitted"),
      });
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setSelectedPaymentMethod("");
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPaymentMethodForm = () => {
    setNewMethodType("bank_transfer");
    setMethodName("");
    setIsDefault(false);
    setBankName("");
    setBankAccountNumber("");
    setBankAccountName("");
    setBankCountry("ID");
    setSwiftCode("");
    setCryptoWalletAddress("");
    setCryptoNetwork("");
    setPaypalEmail("");
    setPaypalAccountName("");
  };

  const handleCreatePaymentMethod = () => {
    const data: any = {
      methodType: newMethodType,
      methodName: methodName || undefined,
      isDefault,
    };

    if (newMethodType === "bank_transfer") {
      data.bankName = bankName;
      data.bankAccountNumber = bankAccountNumber;
      data.bankAccountName = bankAccountName;
      data.bankCountry = bankCountry;
      if (bankCountry !== "ID") {
        data.swiftCode = swiftCode;
      }
    } else if (newMethodType === "cryptocurrency") {
      data.cryptoWalletAddress = cryptoWalletAddress;
      data.cryptoNetwork = cryptoNetwork;
    } else if (newMethodType === "paypal") {
      data.paypalEmail = paypalEmail;
      data.paypalAccountName = paypalAccountName || undefined;
    }

    createPaymentMethodMutation.mutate(data);
  };

  const handleWithdraw = () => {
    const amountInCents = Math.round(parseFloat(withdrawAmount) * 100);
    createWithdrawalMutation.mutate({
      amount: amountInCents,
      paymentMethodId: selectedPaymentMethod,
    });
  };

  const defaultCommission = (affiliateSettings as any)?.defaultCommissionRate || 20;
  const cookieDays = (affiliateSettings as any)?.cookieDays || 30;
  const minimumPayout = (affiliateSettings as any)?.minimumPayout || 50;

  const referralLink = useMemo(() => {
    if (!(affiliate as any)?.affiliateCode) return "";
    return `${window.location.origin}/register?ref=${(affiliate as any)?.affiliateCode}`;
  }, [affiliate]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(referralLink);
        toast({
          title: "Link Copied!",
          description: "Your referral link has been copied to clipboard.",
        });
      } else {
        toast({
          title: "Copy this link",
          description: referralLink,
        });
      }
    } catch {
      toast({
        title: "Copy this link",
        description: referralLink,
      });
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "bank_transfer":
        return <Banknote className="w-4 h-4" />;
      case "cryptocurrency":
        return <Bitcoin className="w-4 h-4" />;
      case "paypal":
        return <SiPaypal className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getMethodLabel = (type: string) => {
    switch (type) {
      case "bank_transfer":
        return "Bank Transfer";
      case "cryptocurrency":
        return "Cryptocurrency";
      case "paypal":
        return "PayPal";
      default:
        return type;
    }
  };

  const getStatusBadgeWithdrawal = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />{t("dashboard.affiliate.pending")}</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle className="w-3 h-3 mr-1" />{t("dashboard.affiliate.approved")}</Badge>;
      case "processing":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t("dashboard.affiliate.processing")}</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />{t("dashboard.affiliate.completed")}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />{t("dashboard.affiliate.rejected")}</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (affiliateLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t("dashboard.affiliate.title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("dashboard.affiliate.commissionDescription").replace("{commission}", defaultCommission)}
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{defaultCommission}%</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.affiliate.commission")}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{cookieDays}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.affiliate.daysCookie")}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">${minimumPayout}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.affiliate.minPayout")}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setApplyDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-apply-affiliate">
              {t("dashboard.affiliate.applyNow")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link href="/affiliate">
              <Button variant="outline" data-testid="button-learn-more">
                {t("dashboard.affiliate.learnMore")}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                {t("dashboard.affiliate.applyDialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("dashboard.affiliate.applyDialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("dashboard.affiliate.commissionRate")}</span>
                  <span className="font-medium">{defaultCommission}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("dashboard.affiliate.cookieDuration")}</span>
                  <span className="font-medium">{cookieDays} {t("common.daysUnit")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("dashboard.affiliate.minimumPayout")}</span>
                  <span className="font-medium">${minimumPayout}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                By applying, you agree to our affiliate program terms.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={() => applyMutation.mutate()} 
                disabled={applyMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-confirm-apply"
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("dashboard.affiliate.submitting")}
                  </>
                ) : (
                  t("dashboard.affiliate.submitApplication")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if ((affiliate as any)?.status === "pending") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t("dashboard.affiliate.applicationPending")}</h2>
          <p className="text-muted-foreground mb-6">
            Your affiliate application is currently under review. 
            We'll notify you once it's approved.
          </p>
          <Badge variant="secondary" className="text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        </Card>
      </div>
    );
  }

  const stats = (dashboardData as any)?.stats || {
    totalClicks: 0,
    totalSignups: 0,
    totalConversions: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    totalEarnings: 0,
  };

  const downlines = (dashboardData as any)?.downlines || [];
  const hasPendingWithdrawal = (withdrawals as any[]).some((w: any) => w.status === "pending" || w.status === "processing");

  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "starter":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Starter</Badge>;
      case "pro":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">{t("common.free")}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "subscribed") {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Subscribed</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Registered</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.affiliate.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.affiliate.subtitle")}</p>
        </div>
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active Affiliate
        </Badge>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full sm:w-full sm:grid sm:grid-cols-4">
            <TabsTrigger value="overview" className="whitespace-nowrap" data-testid="tab-overview">{t("dashboard.affiliate.overview")}</TabsTrigger>
            <TabsTrigger value="downlines" className="whitespace-nowrap" data-testid="tab-downlines">{t("dashboard.affiliate.downlines")}</TabsTrigger>
            <TabsTrigger value="withdrawals" className="whitespace-nowrap" data-testid="tab-withdrawals">{t("dashboard.affiliate.withdrawals")}</TabsTrigger>
            <TabsTrigger value="payment-methods" className="whitespace-nowrap" data-testid="tab-payment-methods">{t("dashboard.affiliate.paymentMethods")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t("dashboard.affiliate.yourReferralLink")}</p>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={referralLink} 
                    className="font-mono text-sm"
                    data-testid="input-referral-link"
                  />
                  <Button size="icon" variant="outline" onClick={copyReferralLink} data-testid="button-copy-link">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-sm text-muted-foreground">{t("dashboard.affiliate.affiliateCode")}</p>
                <p className="text-lg font-bold font-mono">{(affiliate as any)?.affiliateCode}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalClicks}</p>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSignups}</p>
                  <p className="text-sm text-muted-foreground">Sign Ups</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalConversions}</p>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.affiliate.totalEarned")}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  {t("dashboard.affiliate.earningsSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">{t("dashboard.affiliate.pendingEarnings")}</span>
                  <span className="font-bold text-yellow-600">${stats.pendingEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">{t("dashboard.affiliate.paidEarnings")}</span>
                  <span className="font-bold text-green-600">${stats.paidEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-medium">{t("dashboard.affiliate.totalEarnings")}</span>
                  <span className="text-xl font-bold">${stats.totalEarnings.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="pt-2">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={stats.pendingEarnings < minimumPayout || hasPendingWithdrawal || (paymentMethods as any[]).length === 0}
                    onClick={() => setWithdrawDialogOpen(true)}
                    data-testid="button-request-withdrawal"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Request Withdrawal
                  </Button>
                  {(paymentMethods as any[]).length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Add a payment method first
                    </p>
                  )}
                  {hasPendingWithdrawal && (
                    <p className="text-xs text-yellow-600 mt-2 text-center">
                      You have a pending withdrawal request
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Program Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Your Commission Rate</span>
                  <span className="font-bold text-purple-600">{(affiliate as any)?.commissionRate || defaultCommission}%</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">{t("dashboard.affiliate.cookieDuration")}</span>
                  <span className="font-bold">{cookieDays} days</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">{t("dashboard.affiliate.minimumPayout")}</span>
                  <span className="font-bold">${minimumPayout}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-bold">
                    {(affiliate as any)?.approvedAt 
                      ? new Date((affiliate as any).approvedAt).toLocaleDateString()
                      : "-"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="downlines" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Downlines
              </CardTitle>
              <CardDescription>
                Merchants who signed up using your referral link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {downlines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No downlines yet</p>
                  <p className="text-sm">Share your referral link to start earning commissions</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dashboard.affiliate.company")}</TableHead>
                        <TableHead>{t("dashboard.affiliate.plan")}</TableHead>
                        <TableHead>{t("dashboard.affiliate.status")}</TableHead>
                        <TableHead>{t("dashboard.affiliate.joined")}</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downlines.map((downline: any) => (
                        <TableRow key={downline.id} data-testid={`row-downline-${downline.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Building className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{downline.companyName}</p>
                                <p className="text-xs text-muted-foreground">{downline.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getPlanBadge(downline.subscriptionPlan)}
                              {downline.subscriptionPlan !== "free" && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(downline.status)}</TableCell>
                          <TableCell>
                            {downline.registeredAt 
                              ? new Date(downline.registeredAt).toLocaleDateString()
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={downline.earnings > 0 ? "font-bold text-green-600" : "text-muted-foreground"}>
                              ${downline.earnings?.toFixed(2) || "0.00"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />{t("dashboard.affiliate.withdrawalHistory")}</CardTitle>
                <CardDescription>
                  Track your withdrawal requests
                </CardDescription>
              </div>
              <Button 
                onClick={() => setWithdrawDialogOpen(true)}
                disabled={stats.pendingEarnings < minimumPayout || hasPendingWithdrawal || (paymentMethods as any[]).length === 0}
                data-testid="button-new-withdrawal"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request Withdrawal
              </Button>
            </CardHeader>
            <CardContent>
              {withdrawalsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (withdrawals as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No withdrawals yet</p>
                  <p className="text-sm">Request your first withdrawal when you reach the minimum payout</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dashboard.affiliate.date")}</TableHead>
                        <TableHead>{t("dashboard.affiliate.amount")}</TableHead>
                        <TableHead>{t("dashboard.affiliate.method")}</TableHead>
                        <TableHead>{t("dashboard.affiliate.status")}</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(withdrawals as any[]).map((withdrawal: any) => (
                        <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                          <TableCell>
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-bold">
                            ${(withdrawal.amount / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMethodIcon(withdrawal.methodType)}
                              <span>{getMethodLabel(withdrawal.methodType)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadgeWithdrawal(withdrawal.status)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {withdrawal.rejectionReason || withdrawal.adminNotes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Manage your payout payment methods
                </CardDescription>
              </div>
              <Button onClick={() => setPaymentMethodDialogOpen(true)} data-testid="button-add-payment-method">
                <Plus className="w-4 h-4 mr-2" />
                Add Method
              </Button>
            </CardHeader>
            <CardContent>
              {paymentMethodsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (paymentMethods as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No payment methods</p>
                  <p className="text-sm">Add a payment method to receive your earnings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(paymentMethods as any[]).map((method: any) => (
                    <div 
                      key={method.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`card-payment-method-${method.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {getMethodIcon(method.methodType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{method.methodName || getMethodLabel(method.methodType)}</p>
                            {method.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {method.methodType === "bank_transfer" && `${method.bankName} - ****${method.bankAccountNumber?.slice(-4)}`}
                            {method.methodType === "cryptocurrency" && `${method.cryptoNetwork} - ${method.cryptoWalletAddress?.slice(0, 8)}...`}
                            {method.methodType === "paypal" && method.paypalEmail}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                        disabled={deletePaymentMethodMutation.isPending}
                        data-testid={`button-delete-method-${method.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              Request Withdrawal
            </DialogTitle>
            <DialogDescription>
              Request a withdrawal from your pending earnings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("dashboard.affiliate.availableBalance")}</span>
                <span className="font-bold text-lg">${stats.pendingEarnings.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t("dashboard.affiliate.withdrawalAmount")}</Label>
              <Input
                type="number"
                placeholder={`Min: $${minimumPayout}`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={minimumPayout}
                max={stats.pendingEarnings}
                data-testid="input-withdraw-amount"
              />
              <p className="text-xs text-muted-foreground">
                Minimum withdrawal: ${minimumPayout}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("dashboard.affiliate.paymentMethod")}</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {(paymentMethods as any[]).map((method: any) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(method.methodType)}
                        <span>{method.methodName || getMethodLabel(method.methodType)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdraw}
              disabled={
                createWithdrawalMutation.isPending || 
                !withdrawAmount || 
                parseFloat(withdrawAmount) < minimumPayout ||
                parseFloat(withdrawAmount) > stats.pendingEarnings ||
                !selectedPaymentMethod
              }
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-confirm-withdrawal"
            >
              {createWithdrawalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Add Payment Method
            </DialogTitle>
            <DialogDescription>
              Add a new payment method for receiving your earnings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("dashboard.affiliate.paymentType")}</Label>
              <Select value={newMethodType} onValueChange={setNewMethodType}>
                <SelectTrigger data-testid="select-method-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                  <SelectItem value="cryptocurrency">
                    <div className="flex items-center gap-2">
                      <Bitcoin className="w-4 h-4" />
                      Cryptocurrency
                    </div>
                  </SelectItem>
                  <SelectItem value="paypal">
                    <div className="flex items-center gap-2">
                      <SiPaypal className="w-4 h-4" />
                      PayPal
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("dashboard.affiliate.nameOptional")}</Label>
              <Input
                placeholder="e.g., My Primary Bank"
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
                data-testid="input-method-name"
              />
            </div>

            {newMethodType === "bank_transfer" && (
              <>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.bankName")}</Label>
                  <Input
                    placeholder="e.g., Bank Central Asia"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    data-testid="input-bank-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.accountNumber")}</Label>
                  <Input
                    placeholder="Your bank account number"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    data-testid="input-account-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.accountHolderName")}</Label>
                  <Input
                    placeholder="Name as shown on bank account"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    data-testid="input-account-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.country")}</Label>
                  <Select value={bankCountry} onValueChange={setBankCountry}>
                    <SelectTrigger data-testid="select-bank-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bankCountry !== "ID" && (
                  <div className="space-y-2">
                    <Label>SWIFT Code</Label>
                    <Input
                      placeholder="e.g., CHASUS33"
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      data-testid="input-swift-code"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for international bank transfers
                    </p>
                  </div>
                )}
              </>
            )}

            {newMethodType === "cryptocurrency" && (
              <>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.networkCoin")}</Label>
                  <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                    <SelectTrigger data-testid="select-crypto-network">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_NETWORKS.map((network) => (
                        <SelectItem key={network.value} value={network.value}>
                          {network.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.walletAddress")}</Label>
                  <Input
                    placeholder="Your wallet address"
                    value={cryptoWalletAddress}
                    onChange={(e) => setCryptoWalletAddress(e.target.value)}
                    data-testid="input-wallet-address"
                  />
                </div>
              </>
            )}

            {newMethodType === "paypal" && (
              <>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.paypalEmail")}</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    data-testid="input-paypal-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.affiliate.accountNameOptional")}</Label>
                  <Input
                    placeholder="Name on PayPal account"
                    value={paypalAccountName}
                    onChange={(e) => setPaypalAccountName(e.target.value)}
                    data-testid="input-paypal-name"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
                data-testid="checkbox-default-method"
              />
              <Label htmlFor="isDefault" className="font-normal cursor-pointer">
                Set as default payment method
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaymentMethodDialogOpen(false); resetPaymentMethodForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePaymentMethod}
              disabled={createPaymentMethodMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-save-payment-method"
            >
              {createPaymentMethodMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment Method"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
