import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Wallet, CreditCard, Building2, History, Plus, RefreshCcw, AlertCircle, CheckCircle2, Clock, ExternalLink, TrendingUp, Server, Smartphone, QrCode, Loader2, Copy, Check, X, CreditCard as CardIcon } from "lucide-react";
import { SiPaypal, SiWhatsapp, SiMeta } from "react-icons/si";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WaBlastWallet, WaBlastTransaction, MerchantWabaAccount, WaBlastTopupPackage } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

type PaymentResult = {
  orderId: string;
  packageName: string;
  amount: number;
  bonusAmount: number;
  totalAmount: number;
  paymentMethod: "qris" | "va" | "paymentlink";
  paymentProvider: string;
  status: string;
  message?: string;
  paymentUrl?: string;
  paymentData?: {
    qrisImageUrl?: string;
    qrisString?: string;
    vaNumber?: string;
    bankCode?: string;
    paymentUrl?: string;
    expiryTime?: string;
    transactionId?: string;
  };
};

export default function BlasterBillingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("wallet");
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WaBlastTransaction | null>(null);
  const [refundReason, setRefundReason] = useState("");
  
  // Payment flow states
  const [selectedPackage, setSelectedPackage] = useState<WaBlastTopupPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("qris");
  const [bankCode, setBankCode] = useState<string>("");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery<WaBlastWallet>({
    queryKey: ["/api/wa-blast/wallet"],
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<WaBlastTransaction[]>({
    queryKey: ["/api/wa-blast/transactions"],
  });

  const { data: wabaAccounts = [] } = useQuery<MerchantWabaAccount[]>({
    queryKey: ["/api/wa-blast/waba-accounts"],
  });

  const { data: topupPackages = [] } = useQuery<WaBlastTopupPackage[]>({
    queryKey: ["/api/wa-blast/topup-packages"],
  });

  const updateWalletMutation = useMutation({
    mutationFn: async (data: Partial<WaBlastWallet>) => {
      return await apiRequest("/api/wa-blast/wallet", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/wallet"] });
      toast({ title: "Pengaturan berhasil disimpan" });
    },
    onError: () => {
      toast({ title: "Gagal menyimpan pengaturan", variant: "destructive" });
    },
  });

  const topupMutation = useMutation({
    mutationFn: async (data: { packageId: string; paymentMethod: string; bankCode?: string }) => {
      return await apiRequest("/api/wa-blast/topup", "POST", data);
    },
    onSuccess: (data: PaymentResult) => {
      setPaymentResult(data);
      setTopupDialogOpen(false);
      setPaymentDialogOpen(true);
      
      // For payment link, also open in new tab as convenience
      if (data.paymentMethod === "paymentlink" && data.paymentUrl) {
        window.open(data.paymentUrl, "_blank");
        toast({ 
          title: "Order dibuat", 
          description: "Halaman pembayaran dibuka di tab baru. Jika tidak terbuka, klik tombol di dialog." 
        });
        return;
      }
      
      toast({ 
        title: "Order dibuat", 
        description: data.message || `Silakan lanjutkan pembayaran untuk ${data.packageName}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Gagal membuat order", 
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive" 
      });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (data: { transactionId: string; reason: string }) => {
      return await apiRequest("/api/wa-blast/refund-request", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/transactions"] });
      setRefundDialogOpen(false);
      setSelectedTransaction(null);
      setRefundReason("");
      toast({ title: "Permintaan refund berhasil diajukan" });
    },
    onError: () => {
      toast({ title: "Gagal mengajukan refund", variant: "destructive" });
    },
  });

  const handleModeChange = (newMode: "bsp" | "byowaba") => {
    updateWalletMutation.mutate({ mode: newMode });
  };

  const openTopupDialog = (pkg: WaBlastTopupPackage) => {
    setSelectedPackage(pkg);
    setPaymentMethod("qris");
    setBankCode("");
    setTopupDialogOpen(true);
  };

  const handleTopup = () => {
    if (!selectedPackage) return;
    
    const data: { packageId: string; paymentMethod: string; bankCode?: string } = {
      packageId: selectedPackage.id,
      paymentMethod,
    };
    
    if (paymentMethod === "va" && bankCode) {
      data.bankCode = bankCode;
    }
    
    topupMutation.mutate(data);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
      toast({ title: "Disalin ke clipboard" });
    } catch {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    }
  };

  const closePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPaymentResult(null);
    queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/transactions"] });
  };

  // Debounced settings update
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdateWallet = useCallback((data: Partial<WaBlastWallet>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateWalletMutation.mutate(data);
    }, 800);
  }, [updateWalletMutation]);
  
  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const canRequestRefund = (tx: WaBlastTransaction) => {
    if (tx.type !== "topup" || tx.paymentStatus !== "completed") return false;
    if (!tx.createdAt) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(tx.createdAt) > sevenDaysAgo;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "topup": return <Plus className="h-4 w-4 text-green-500" />;
      case "debit": return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case "refund": return <RefreshCcw className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed": return <Badge variant="outline" className="text-green-600 border-green-600">Selesai</Badge>;
      case "pending": return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Menunggu</Badge>;
      case "failed": return <Badge variant="outline" className="text-red-600 border-red-600">Gagal</Badge>;
      case "refunded": return <Badge variant="outline" className="text-purple-600 border-purple-600">Dikembalikan</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/blaster/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pengaturan Billing</h1>
            <p className="text-muted-foreground">Kelola saldo dan metode pembayaran WA Blast</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Saldo Anda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-balance">
                {walletLoading ? "..." : formatCurrency(wallet?.balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Mode: {wallet?.mode === "byowaba" ? "BYOWABA (Enterprise)" : "BSP (Chatvice)"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <CardTitle className="text-sm font-medium">Total Top Up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-topup">
                {walletLoading ? "..." : formatCurrency(wallet?.totalTopup || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Sejak bergabung</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              <CardTitle className="text-sm font-medium">Total Terpakai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-total-spent">
                {walletLoading ? "..." : formatCurrency(wallet?.totalSpent || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Untuk pengiriman pesan</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Mode Pengiriman
            </CardTitle>
            <CardDescription>
              Pilih metode pengiriman WhatsApp Blast Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all ${wallet?.mode === "bsp" ? "border-primary ring-2 ring-primary/20" : "hover-elevate"}`}
                onClick={() => handleModeChange("bsp")}
                data-testid="card-mode-bsp"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <SiWhatsapp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">BSP Mode</CardTitle>
                      <CardDescription className="text-xs">Chatvice sebagai Provider</CardDescription>
                    </div>
                    {wallet?.mode === "bsp" && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Top up saldo, bayar per pesan
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Tidak perlu setup Meta
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Cocok untuk bisnis kecil-menengah
                    </li>
                  </ul>
                  <div className="mt-3 text-xs">
                    <span className="font-medium">Biaya per pesan:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="secondary">Marketing Rp500</Badge>
                      <Badge variant="secondary">Utility Rp300</Badge>
                      <Badge variant="secondary">OTP Rp200</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${wallet?.mode === "byowaba" ? "border-primary ring-2 ring-primary/20" : "hover-elevate"}`}
                onClick={() => handleModeChange("byowaba")}
                data-testid="card-mode-byowaba"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <SiMeta className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">BYOWABA Mode</CardTitle>
                      <CardDescription className="text-xs">Bring Your Own WABA</CardDescription>
                    </div>
                    {wallet?.mode === "byowaba" && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Gunakan akun Meta WABA sendiri
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Bayar langsung ke Meta
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Cocok untuk enterprise
                    </li>
                  </ul>
                  <div className="mt-3 text-xs">
                    <span className="font-medium">Platform fee:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="secondary">Rp50/pesan</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallet" data-testid="tab-wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Top Up
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="waba" data-testid="tab-waba" disabled={wallet?.mode !== "byowaba"}>
              <SiMeta className="h-4 w-4 mr-2" />
              WABA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="mt-4">
            {wallet?.mode === "bsp" ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Pilih Paket Top Up
                    </CardTitle>
                    <CardDescription>
                      Top up saldo untuk mengirim pesan WhatsApp Blast
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {topupPackages.length > 0 ? (
                        topupPackages.map((pkg) => (
                          <Card key={pkg.id} className={`relative ${pkg.isPopular ? "border-primary" : ""}`}>
                            {pkg.isPopular && (
                              <Badge className="absolute -top-2 right-4">Popular</Badge>
                            )}
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">{pkg.name}</CardTitle>
                              <CardDescription>{pkg.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <div className="text-2xl font-bold">{formatCurrency(pkg.amount)}</div>
                                {(pkg.bonusAmount || 0) > 0 && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    +{formatCurrency(pkg.bonusAmount || 0)} bonus
                                  </Badge>
                                )}
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => openTopupDialog(pkg)}
                                disabled={topupMutation.isPending}
                                data-testid={`button-topup-${pkg.id}`}
                              >
                                Top Up
                              </Button>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card className="col-span-3">
                          <CardContent className="py-8 text-center text-muted-foreground">
                            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Belum ada paket top up tersedia.</p>
                            <p className="text-sm">Hubungi admin untuk menambahkan paket.</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SiPaypal className="h-5 w-5 text-blue-600" />
                      Auto Top Up PayPal
                    </CardTitle>
                    <CardDescription>
                      Otomatis top up saldo menggunakan PayPal saat saldo di bawah batas minimum
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Aktifkan Auto Top Up</Label>
                        <p className="text-sm text-muted-foreground">
                          Saldo akan otomatis ditambah menggunakan PayPal
                        </p>
                      </div>
                      <Switch
                        checked={wallet?.paypalAutoTopup || false}
                        onCheckedChange={(checked) => updateWalletMutation.mutate({ paypalAutoTopup: checked })}
                        data-testid="switch-auto-topup"
                      />
                    </div>
                    
                    {wallet?.paypalAutoTopup && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Email PayPal</Label>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              defaultValue={wallet?.paypalEmail || ""}
                              onBlur={(e) => updateWalletMutation.mutate({ paypalEmail: e.target.value })}
                              data-testid="input-paypal-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Batas Minimum (Rp)</Label>
                            <Input
                              type="number"
                              defaultValue={wallet?.paypalAutoTopupThreshold || 50000}
                              onBlur={(e) => updateWalletMutation.mutate({ paypalAutoTopupThreshold: parseInt(e.target.value) })}
                              data-testid="input-topup-threshold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Jumlah Auto Top Up (Rp)</Label>
                            <Input
                              type="number"
                              defaultValue={wallet?.paypalAutoTopupAmount || 100000}
                              onBlur={(e) => updateWalletMutation.mutate({ paypalAutoTopupAmount: parseInt(e.target.value) })}
                              data-testid="input-topup-amount"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <SiMeta className="h-16 w-16 mx-auto mb-4 text-blue-500 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Mode BYOWABA Aktif</h3>
                  <p className="text-muted-foreground mb-4">
                    Anda menggunakan akun Meta WABA sendiri.<br />
                    Pembayaran pesan langsung ke Meta, bukan melalui Chatvice.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Platform fee Rp50/pesan akan ditagihkan terpisah.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Riwayat Transaksi
                </CardTitle>
                <CardDescription>
                  Semua transaksi top up, pemakaian, dan refund
                </CardDescription>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Memuat...</div>
                ) : transactions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada transaksi</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`transaction-${tx.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <div className="font-medium">{tx.description || tx.type}</div>
                            <div className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(tx.paymentStatus)}
                          <div className={`font-bold ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                          </div>
                          {canRequestRefund(tx) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setRefundDialogOpen(true);
                              }}
                              data-testid={`button-refund-${tx.id}`}
                            >
                              <RefreshCcw className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waba" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <SiMeta className="h-5 w-5" />
                      Akun WABA Anda
                    </CardTitle>
                    <CardDescription>
                      Kelola koneksi akun WhatsApp Business API Meta
                    </CardDescription>
                  </div>
                  <Button onClick={() => navigate("/blaster/waba/setup")} data-testid="button-add-waba">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah WABA
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wabaAccounts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <SiMeta className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Belum ada akun WABA</h3>
                    <p className="mb-4">Hubungkan akun WhatsApp Business API Meta Anda untuk mulai mengirim pesan.</p>
                    <Button onClick={() => navigate("/blaster/waba/setup")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah WABA
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wabaAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                        data-testid={`waba-account-${account.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <SiWhatsapp className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-muted-foreground">{account.phoneNumber}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={account.status === "active" ? "default" : "outline"}>
                            {account.status === "active" ? "Aktif" : account.status === "pending" ? "Menunggu" : "Error"}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Kebijakan Refund</p>
                <p className="text-muted-foreground">
                  Anda dapat mengajukan refund dalam waktu 7 hari setelah top up. 
                  Refund akan dikembalikan ke metode pembayaran asli dalam 3-7 hari kerja.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Method Selection Dialog */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Top up {selectedPackage?.name} - {formatCurrency(selectedPackage?.amount || 0)}
              {(selectedPackage?.bonusAmount || 0) > 0 && (
                <span className="text-green-600"> (+{formatCurrency(selectedPackage?.bonusAmount || 0)} bonus)</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qris" data-testid="option-qris">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QRIS
                    </div>
                  </SelectItem>
                  <SelectItem value="va" data-testid="option-va">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Virtual Account
                    </div>
                  </SelectItem>
                  <SelectItem value="paymentlink" data-testid="option-paymentlink">
                    <div className="flex items-center gap-2">
                      <CardIcon className="h-4 w-4" />
                      Payment Link (Semua Metode)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "va" && (
              <div className="space-y-2">
                <Label>Pilih Bank</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger data-testid="select-bank">
                    <SelectValue placeholder="Pilih bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCA" data-testid="option-bank-bca">BCA</SelectItem>
                    <SelectItem value="BNI" data-testid="option-bank-bni">BNI</SelectItem>
                    <SelectItem value="BRI" data-testid="option-bank-bri">BRI</SelectItem>
                    <SelectItem value="MANDIRI" data-testid="option-bank-mandiri">Mandiri</SelectItem>
                    <SelectItem value="PERMATA" data-testid="option-bank-permata">Permata</SelectItem>
                    <SelectItem value="CIMB" data-testid="option-bank-cimb">CIMB Niaga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" data-testid="button-cancel-topup">Batal</Button>
            </DialogClose>
            <Button
              onClick={handleTopup}
              disabled={topupMutation.isPending || (paymentMethod === "va" && !bankCode)}
              data-testid="button-confirm-topup"
            >
              {topupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Lanjutkan Pembayaran"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Result Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) closePaymentDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentResult?.paymentMethod === "qris" && <QrCode className="h-5 w-5" />}
              {paymentResult?.paymentMethod === "va" && <Building2 className="h-5 w-5" />}
              {paymentResult?.paymentMethod === "paymentlink" && <CardIcon className="h-5 w-5" />}
              Pembayaran {paymentResult?.packageName}
            </DialogTitle>
            <DialogDescription>
              Order ID: {paymentResult?.orderId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-bold">{formatCurrency(paymentResult?.amount || 0)}</span>
              </div>
              {(paymentResult?.bonusAmount || 0) > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Bonus</span>
                  <span className="font-bold text-green-600">+{formatCurrency(paymentResult?.bonusAmount || 0)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Saldo</span>
                <span className="font-bold text-lg">{formatCurrency(paymentResult?.totalAmount || 0)}</span>
              </div>
            </div>

            {/* QRIS Display */}
            {paymentResult?.paymentMethod === "qris" && paymentResult?.paymentData?.qrisImageUrl && (
              <div className="text-center space-y-3">
                <img 
                  src={paymentResult.paymentData.qrisImageUrl} 
                  alt="QRIS Code" 
                  className="mx-auto max-w-[200px] rounded-lg border"
                />
                {paymentResult.paymentData.expiryTime && (
                  <p className="text-sm text-muted-foreground">
                    Berlaku sampai: {formatDate(paymentResult.paymentData.expiryTime)}
                  </p>
                )}
              </div>
            )}

            {/* VA Display */}
            {paymentResult?.paymentMethod === "va" && paymentResult?.paymentData?.vaNumber && (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">Bank {paymentResult.paymentData.bankCode}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-mono font-bold">{paymentResult.paymentData.vaNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(paymentResult.paymentData?.vaNumber || "")}
                      data-testid="button-copy-va"
                    >
                      {copiedText ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {paymentResult.paymentData.expiryTime && (
                  <p className="text-sm text-muted-foreground text-center">
                    Berlaku sampai: {formatDate(paymentResult.paymentData.expiryTime)}
                  </p>
                )}
              </div>
            )}

            {/* Payment Link */}
            {paymentResult?.paymentMethod === "paymentlink" && paymentResult?.paymentUrl && (
              <div className="text-center">
                <Button asChild className="w-full" data-testid="button-open-payment-link">
                  <a href={paymentResult.paymentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buka Halaman Pembayaran
                  </a>
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Saldo akan otomatis ditambahkan setelah pembayaran berhasil.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePaymentDialog} data-testid="button-close-payment">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Refund</DialogTitle>
            <DialogDescription>
              Mohon jelaskan alasan Anda mengajukan refund untuk transaksi ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTransaction && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Transaksi:</span>
                  <span className="font-medium">{selectedTransaction.description}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-muted-foreground">Jumlah:</span>
                  <span className="font-bold text-green-600">{formatCurrency(selectedTransaction.amount)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Alasan Refund</Label>
              <Textarea
                placeholder="Jelaskan alasan Anda mengajukan refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
                data-testid="input-refund-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedTransaction) {
                  refundMutation.mutate({
                    transactionId: selectedTransaction.id,
                    reason: refundReason,
                  });
                }
              }}
              disabled={!refundReason.trim() || refundMutation.isPending}
              data-testid="button-submit-refund"
            >
              {refundMutation.isPending ? "Memproses..." : "Ajukan Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
