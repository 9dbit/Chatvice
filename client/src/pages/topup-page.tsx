import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, QrCode, CreditCard, Wallet, Building2, ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Nominal {
  amount: number;
  label: string;
  coinsGiven: number;
  bonusCoins: number;
}

interface VerifyResponse {
  success: boolean;
  site_name: string;
  site_code: string;
  user_id: string;
  current_domain: string;
  return_url: string;
  nominals: Nominal[];
  payment_channels: string[];
}

interface PaymentData {
  type: string;
  qr_string?: string | null;
  qris_image_url?: string | null;
  transaction_id?: string | null;
  va_number?: string | null;
  expiry_time: string;
}

interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
  payment_type: string;
  payment_data: PaymentData;
  expires_at: string;
}

interface OrderStatus {
  success: boolean;
  order_id: string;
  status: string;
  amount: number;
  payment_type: string;
  paid_at: string | null;
  credited_at: string | null;
  return_url: string;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function QRDisplay({ qrString, imageUrl }: { qrString?: string | null; imageUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt="QRIS Code"
        className="w-56 h-56 object-contain"
        onError={() => setImgError(true)}
        data-testid="img-qris-code"
      />
    );
  }

  if (qrString) {
    return (
      <QRCodeSVG
        value={qrString}
        size={224}
        level="M"
        data-testid="svg-qris-code"
      />
    );
  }

  return (
    <div className="w-56 h-56 flex items-center justify-center bg-muted rounded-lg">
      <div className="text-center text-muted-foreground">
        <QrCode className="h-12 w-12 mx-auto mb-2" />
        <p className="text-sm">QR Code tidak tersedia</p>
      </div>
    </div>
  );
}

export default function TopupPage() {
  const [token, setToken] = useState<string>("");
  const [step, setStep] = useState<"loading" | "select" | "payment" | "status" | "error">("loading");
  const [selectedNominal, setSelectedNominal] = useState<Nominal | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("QRIS");
  const [orderId, setOrderId] = useState<string>("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setErrorMessage("Token tidak ditemukan");
      setStep("error");
    }
  }, []);

  const verifyQuery = useQuery<VerifyResponse>({
    queryKey: ["/api/topup/verify", token],
    queryFn: async () => {
      const res = await fetch(`/api/topup/verify?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verifikasi gagal");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (verifyQuery.isSuccess) {
      setStep("select");
    } else if (verifyQuery.isError) {
      setErrorMessage((verifyQuery.error as Error).message);
      setStep("error");
    }
  }, [verifyQuery.isSuccess, verifyQuery.isError, verifyQuery.error]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: { token: string; amount: number; channel: string }) => {
      const res = await apiRequest("POST", "/api/payment/create-order", data);
      return res.json() as Promise<CreateOrderResponse>;
    },
    onSuccess: (data) => {
      setOrderId(data.order_id);
      setPaymentData(data.payment_data);
      setStep("payment");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setStep("error");
    },
  });

  const statusQuery = useQuery<OrderStatus>({
    queryKey: ["/api/payment/status", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/payment/status?order_id=${encodeURIComponent(orderId)}`);
      if (!res.ok) throw new Error("Gagal cek status");
      return res.json();
    },
    enabled: step === "payment" && !!orderId,
    refetchInterval: step === "payment" ? 5000 : false,
  });

  useEffect(() => {
    if (statusQuery.data?.status === "COMPLETED" || statusQuery.data?.status === "PAID") {
      setStep("status");
    } else if (statusQuery.data?.status === "EXPIRED" || statusQuery.data?.status === "FAILED" || statusQuery.data?.status === "CANCELLED") {
      setErrorMessage("Pembayaran gagal atau telah kadaluarsa. Silakan coba lagi.");
      setStep("error");
    }
  }, [statusQuery.data?.status]);

  const handleSelectNominal = (nominal: Nominal) => {
    setSelectedNominal(nominal);
  };

  const handleCreateOrder = () => {
    if (!selectedNominal) return;
    createOrderMutation.mutate({
      token,
      amount: selectedNominal.amount,
      channel: selectedChannel,
    });
  };

  const handleBack = () => {
    if (verifyQuery.data?.return_url) {
      window.location.href = verifyQuery.data.return_url;
    } else {
      window.history.back();
    }
  };

  const PaymentChannelIcon = ({ channel }: { channel: string }) => {
    switch (channel) {
      case "QRIS":
        return <QrCode className="h-5 w-5" />;
      case "VA":
        return <Building2 className="h-5 w-5" />;
      case "EWALLET":
        return <Wallet className="h-5 w-5" />;
      case "BANK":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  if (step === "loading" || verifyQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800" data-testid="topup-loading">
        <Card className="w-[400px]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Memverifikasi sesi pembayaran...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800" data-testid="topup-error">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Terjadi Kesalahan</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleBack} variant="outline" className="w-full" data-testid="button-back-error">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "select" && verifyQuery.data) {
    const data = verifyQuery.data;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4" data-testid="topup-select">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-select">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Top Up Coin</h1>
              <p className="text-muted-foreground">{data.site_name}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Pilih Nominal
              </CardTitle>
              <CardDescription>User ID: {data.user_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.nominals.map((nominal, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectNominal(nominal)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                    selectedNominal?.amount === nominal.amount
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`nominal-${nominal.amount}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{formatRupiah(nominal.amount)}</p>
                      <p className="text-muted-foreground text-sm">
                        {nominal.coinsGiven} Coins
                        {nominal.bonusCoins > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            +{nominal.bonusCoins} Bonus
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {nominal.coinsGiven + nominal.bonusCoins}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Coins</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Metode Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.payment_channels.map((channel) => (
                <div
                  key={channel}
                  onClick={() => setSelectedChannel(channel)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate flex items-center gap-3 ${
                    selectedChannel === channel
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`channel-${channel.toLowerCase()}`}
                >
                  <PaymentChannelIcon channel={channel} />
                  <div>
                    <span className="font-medium">{channel}</span>
                    {channel === "QRIS" && (
                      <p className="text-sm text-muted-foreground">Bayar dengan scan QR Code</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 text-lg"
            onClick={handleCreateOrder}
            disabled={!selectedNominal || createOrderMutation.isPending}
            data-testid="button-proceed-payment"
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Lanjut ke Pembayaran
                {selectedNominal && <span className="ml-2">{formatRupiah(selectedNominal.amount)}</span>}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "payment" && paymentData) {
    const expiryTime = new Date(paymentData.expiry_time);
    const deepLinkId = paymentData.transaction_id || orderId;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4" data-testid="topup-payment">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep("select")} data-testid="button-back-payment">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Pembayaran</h1>
              <p className="text-muted-foreground">Order: {orderId}</p>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Scan QRIS untuk Bayar</CardTitle>
              <CardDescription>
                Total: {formatRupiah(selectedNominal?.amount || 0)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-6 rounded-lg flex items-center justify-center border" data-testid="div-qr-container">
                <QRDisplay
                  qrString={paymentData.qr_string}
                  imageUrl={paymentData.qris_image_url}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm" data-testid="text-expiry-time">
                  Berlaku hingga: {expiryTime.toLocaleString("id-ID")}
                </span>
              </div>

              {/* 12Pay Deep Link for Mobile */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    const deepLink = `https://pay.12pay.id/pay?order_id=${deepLinkId}&amount=${selectedNominal?.amount}`;
                    window.open(deepLink, "_blank");
                  }}
                  data-testid="button-twelvepay-link"
                >
                  <ExternalLink className="h-4 w-4" />
                  Buka 12Pay
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Atau buka aplikasi 12Pay dan scan QR code di atas
                </p>
              </div>

              {statusQuery.isRefetching && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Memeriksa status pembayaran...</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button variant="outline" className="w-full" onClick={handleBack} data-testid="button-cancel-payment">
                Batalkan & Kembali
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "status") {
    const isSuccess = statusQuery.data?.status === "COMPLETED" || statusQuery.data?.status === "PAID";
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isSuccess 
          ? "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800"
          : "bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800"
      }`} data-testid="topup-status">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            {isSuccess ? (
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-20 w-20 text-destructive mx-auto mb-4" />
            )}
            <CardTitle className={isSuccess ? "text-green-700" : "text-destructive"}>
              {isSuccess ? "Pembayaran Berhasil!" : "Pembayaran Gagal"}
            </CardTitle>
            <CardDescription>
              {isSuccess
                ? `${selectedNominal?.coinsGiven || 0} + ${selectedNominal?.bonusCoins || 0} coins telah ditambahkan ke akun Anda`
                : "Terjadi kesalahan saat memproses pembayaran Anda"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-sm text-muted-foreground" data-testid="text-order-id">Order ID: {orderId}</p>
            {statusQuery.data?.paid_at && (
              <p className="text-sm text-muted-foreground" data-testid="text-paid-at">
                Dibayar: {new Date(statusQuery.data.paid_at).toLocaleString("id-ID")}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack} className="w-full" data-testid="button-back-status">
              Kembali ke Aplikasi
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}
