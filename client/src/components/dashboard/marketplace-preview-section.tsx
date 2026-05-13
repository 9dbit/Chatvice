import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  Zap,
  Calendar,
  Hotel,
  ChevronRight,
  ShoppingBag,
  X,
  QrCode,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  PartyPopper,
  Info,
  Clock,
  Copy,
  Download,
  CreditCard,
  Building2,
  Bitcoin,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { SiPaypal, SiBitcoin, SiEthereum, SiSolana, SiBinance, SiTether, SiRipple } from "react-icons/si";
import PayPalButton from "@/components/PayPalButton";
import chatviceDarkLogo from "@assets/Chatvice-02_1778420788538.png";
import chatviceLightLogo from "@assets/Chatvice-04_1767550221276.png";
import qrisLogoImg from "@assets/IMG_6802_1778414496751.jpeg";

/* ------------------------------------------------------------------ */
/* Interfaces                                                           */
/* ------------------------------------------------------------------ */

export interface BoosterItem {
  boosterType: string;
  name: string;
  priceUsd: number;
  priceIdr: number;
  priceIdrFormatted: string;
  billingMode: "monthly" | "one_time";
  quotaAmount: number;
  quotaField: string;
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  isFeatured: boolean;
}

export interface BoosterResponse {
  items: BoosterItem[];
}

export interface AddonItem {
  addonType: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  monthlyPriceIdr: number;
  monthlyPriceIdrFormatted: string;
  isEnabled: boolean;
}

export interface AddonResponse {
  items: AddonItem[];
}

export interface MarketplaceMerchantAddon {
  addonType: string;
  isActive: boolean;
  trialEndsAt: string | null;
}

interface PaymentResponse {
  orderId: string;
  transactionId: string;
  amountIDR: number;
  qrisString: string | null;
  expiresAt: string | null;
  paymentMethod?: string;
  vaNumber?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  uniqueCode?: number;
  totalAmount?: number;
}

/* ------------------------------------------------------------------ */
/* Icon / gradient maps                                                  */
/* ------------------------------------------------------------------ */

const boosterIconMap: Record<string, LucideIcon> = {
  Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
};

const addonIconMap: Record<string, LucideIcon> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
};

const addonGradientMap: Record<string, { from: string; to: string }> = {
  appointment_scheduling: { from: "from-blue-500", to: "to-indigo-600" },
  hospitality: { from: "from-amber-400", to: "to-orange-500" },
};

const DEFAULT_GRADIENT = { from: "from-violet-500", to: "to-purple-700" };

const boosterBenefits: Record<string, { headline: string; bullets: string[] }> = {
  conversations: {
    headline: "Tambah kuota percakapan instan",
    bullets: [
      "Percakapan langsung dikreditkan ke saldo akun Anda",
      "Berlaku untuk semua AI agent di akun Anda",
      "Tidak ada batas waktu penggunaan saldo",
      "Ideal saat volume chat meningkat di peak season",
      "Proses aktivasi otomatis setelah pembayaran terkonfirmasi",
    ],
  },
  supervisor_seat: {
    headline: "Perluas kapasitas tim supervisor",
    bullets: [
      "1 slot supervisor baru siap diaktifkan",
      "Akses penuh ke Supervisor Panel & eskalasi chat",
      "Supervisor dapat menangani semua sesi eskalasi",
      "Integrasi notifikasi Telegram tersedia",
      "Berlaku permanen selama berlangganan aktif",
    ],
  },
  domains_2: {
    headline: "Pasang widget di lebih banyak domain",
    bullets: [
      "Tambah 2 domain tervalidasi ke whitelist widget",
      "Lindungi widget dari penyalahgunaan domain tak dikenal",
      "Mendukung subdomain dan domain khusus",
      "Konfigurasi per-domain langsung dari dashboard",
      "Berlaku permanen, tidak perlu perpanjangan",
    ],
  },
  agent_seat: {
    headline: "Buat lebih banyak AI agent",
    bullets: [
      "1 slot AI agent baru siap dikonfigurasi",
      "Setiap agent punya knowledge base & system prompt sendiri",
      "Cocok untuk multi-brand atau multi-produk",
      "Agent dapat dipasang di widget yang berbeda",
      "Berlaku permanen selama berlangganan aktif",
    ],
  },
  sources_10: {
    headline: "Perbesar knowledge base agent Anda",
    bullets: [
      "10 sumber pengetahuan tambahan siap diisi",
      "Dukung URL crawl, upload dokumen, atau input manual",
      "Semakin banyak sumber = jawaban AI semakin akurat",
      "Auto-sync untuk URL yang di-crawl",
      "Berlaku permanen, tidak ada batas waktu",
    ],
  },
  vision_50: {
    headline: "Analisis gambar & dokumen pelanggan",
    bullets: [
      "50 kuota analisis media AI (gambar & dokumen)",
      "AI Vision membaca gambar, tangkap layar, dan PDF",
      "Membantu agent menjawab pertanyaan berbasis foto produk",
      "Powered by OpenAI GPT-4 Vision",
      "Kuota dikreditkan instan setelah pembayaran terkonfirmasi",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function splitBoosterName(name: string): { value: string; label: string } {
  const m = name.match(/^(\+[\d,]+)\s+(.+)$/);
  return m ? { value: m[1], label: m[2] } : { value: "", label: name };
}

function safeMsg(body: any, fallback: string): string {
  if (!body) return fallback;
  if (typeof body.error === "string") return body.error;
  if (body.error) return JSON.stringify(body.error);
  if (typeof body.message === "string") return body.message;
  return fallback;
}

function isAddonActive(merchantAddons: MarketplaceMerchantAddon[], addonType: string): boolean {
  const a = merchantAddons.find((m) => m.addonType === addonType);
  if (!a) return false;
  const onTrial = a.trialEndsAt && new Date(a.trialEndsAt) > new Date();
  return a.isActive || !!onTrial;
}

/* ------------------------------------------------------------------ */
/* Types for unified grid items                                         */
/* ------------------------------------------------------------------ */

interface UnifiedProduct {
  productId: string;
  name: string;
  kind: "addon" | "booster";
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  valueText?: string;
  labelText?: string;
}

/* ------------------------------------------------------------------ */
/* Product detail popup                                                 */
/* ------------------------------------------------------------------ */

type Phase = "info" | "qr" | "va" | "bank_transfer" | "paypal" | "crypto" | "crypto_proof_sent" | "success" | "pending_activation" | "failed";

interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  network: string;
  address: string;
  memo?: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

const CRYPTO_COINS: CryptoCoin[] = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", network: "BTC Network", address: "bc1q9mk7032hjfu0fu9cnk0c3tgk7z5vxswaz3avy6", Icon: SiBitcoin, color: "#F7931A" },
  { id: "eth", symbol: "ETH", name: "Ethereum", network: "ERC-20", address: "0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7", Icon: SiEthereum, color: "#627EEA" },
  { id: "sol", symbol: "SOL", name: "Solana", network: "SOL Network", address: "FvfgL8MdwZ7Po6795XHCgF6rWsCEdmUxwDgMD2Fn6zQg", memo: "No memo required", Icon: SiSolana, color: "#9945FF" },
  { id: "bnb", symbol: "BNB", name: "BNB", network: "BEP-20", address: "0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7", Icon: SiBinance, color: "#F3BA2F" },
  { id: "usdt", symbol: "USDT", name: "Tether", network: "ERC-20", address: "0xD395A9CFC24848828b731d42eb1c9242D5BD9cA7", Icon: SiTether, color: "#26A17B" },
  { id: "xrp", symbol: "XRP", name: "Ripple", network: "XRP Ledger", address: "raAGkuxS7b92wYWRKERQCDknKz9fMpyJpH", memo: "No destination tag required", Icon: SiRipple, color: "#23292F" },
];

export function ProductPopup({
  productId,
  addonsData,
  boostersData,
  merchantAddons,
  onClose,
}: {
  productId: string | null;
  addonsData: AddonResponse | undefined;
  boostersData: BoosterResponse | undefined;
  merchantAddons: MarketplaceMerchantAddon[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("info");
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [tcOpen, setTcOpen] = useState(false);
  const [selectedConvPackage, setSelectedConvPackage] = useState("conversations_2k");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"qris" | "va" | "bank" | "paypal" | "crypto">("qris");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [txHash, setTxHash] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>("info");
  phaseRef.current = phase;

  /* Dark mode observer */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  /* Countdown timer for QR and VA phases */
  useEffect(() => {
    if ((phase !== "qr" && phase !== "va") || !payment?.expiresAt) return;
    const computeRemaining = () =>
      Math.max(0, Math.floor((new Date(payment.expiresAt!).getTime() - Date.now()) / 1000));
    setTimeRemaining(computeRemaining());
    const interval = setInterval(() => {
      const r = computeRemaining();
      setTimeRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        if (phase === "va") setTimeout(() => setPhase("failed"), 1500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, payment?.expiresAt]);

  const isAddon = productId?.startsWith("addon-") ?? false;
  const isBooster = productId?.startsWith("booster-") ?? false;
  const typeKey = isAddon
    ? productId!.slice("addon-".length)
    : productId?.slice("booster-".length) ?? "";

  const addon = isAddon
    ? (addonsData?.items ?? []).find((i) => i.addonType === typeKey) ?? null
    : null;
  const booster = isBooster
    ? (boostersData?.items ?? []).find((i) => i.boosterType === typeKey) ?? null
    : null;

  const addonActive = addon ? isAddonActive(merchantAddons, addon.addonType) : false;

  const isConvBooster = isBooster && typeKey.startsWith("conversations_");
  const convBoosterOptions = isConvBooster
    ? (boostersData?.items ?? [])
        .filter((b) => b.boosterType.startsWith("conversations_"))
        .sort((a, b) => a.quotaAmount - b.quotaAmount)
    : [];
  const effectiveBooster = isConvBooster
    ? (convBoosterOptions.find((b) => b.boosterType === selectedConvPackage) ?? booster)
    : booster;

  const resolvePhase = (data: PaymentResponse): Phase => {
    const pm = data.paymentMethod;
    if (pm === "va" || data.vaNumber) return "va";
    if (pm === "bank_transfer" || data.accountNumber) return "bank_transfer";
    if (pm === "paypal") return "paypal";
    if (pm === "crypto") return "crypto";
    return "qr";
  };

  const serverMethod = selectedPaymentMethod === "qris" ? "12pay"
    : selectedPaymentMethod === "bank" ? "bank_transfer"
    : selectedPaymentMethod;

  /* Mutations */
  const addonMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await fetch("/api/merchant/addons/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          addonType,
          paymentMethod: serverMethod,
          bankCode: selectedBank || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(safeMsg(body, "Terjadi kesalahan, coba lagi."));
      return body as PaymentResponse;
    },
    onSuccess: (data) => { setPayment(data); setPhase(resolvePhase(data)); },
    onError: (err: any) =>
      toast({ title: "Tidak bisa memulai pembayaran", description: err?.message, variant: "destructive" }),
  });

  const boosterMutation = useMutation({
    mutationFn: async (boosterType: string) => {
      const res = await fetch("/api/merchant/boosters/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          boosterType,
          paymentMethod: serverMethod,
          bankCode: selectedBank || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(safeMsg(body, "Terjadi kesalahan, coba lagi."));
      return body as PaymentResponse;
    },
    onSuccess: (data) => { setPayment(data); setPhase(resolvePhase(data)); },
    onError: (err: any) =>
      toast({ title: "Tidak bisa memulai pembayaran", description: err?.message, variant: "destructive" }),
  });

  const cryptoProofMutation = useMutation({
    mutationFn: async (hash: string) => {
      const endpoint = addon
        ? "/api/merchant/addons/confirm-payment"
        : "/api/merchant/boosters/confirm-payment";
      const body = addon
        ? { addonType: addon.addonType, paymentReference: hash }
        : { boosterType: effectiveBooster?.boosterType, paymentReference: hash };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(safeMsg(data, "Gagal mengirim bukti pembayaran."));
      return data;
    },
    onSuccess: () => setPhase("crypto_proof_sent"),
    onError: (err: any) =>
      toast({ title: "Gagal mengirim bukti", description: err?.message, variant: "destructive" }),
  });

  /* Polling for payment success (QRIS and VA; bank transfer is manual) */
  useEffect(() => {
    const isPollingPhase = phase === "qr" || phase === "va";
    if (!isPollingPhase || !payment?.transactionId) return;

    const poll = async () => {
      if (phaseRef.current !== "qr" && phaseRef.current !== "va") return;
      try {
        const res = await fetch(
          `/api/merchant/addons/payment-status/${payment.transactionId}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const s = (data.status ?? "").toLowerCase();
        if (s === "paid" || s === "settled") {
          clearInterval(pollingRef.current!);
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
          setPhase("success");
        } else if (s === "failed" || s === "expired" || s === "cancelled") {
          clearInterval(pollingRef.current!);
          setPhase("failed");
        }
      } catch {}
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [phase, payment?.transactionId]);

  /* Reset state when popup opens/closes */
  useEffect(() => {
    if (!productId) {
      setPhase("info");
      setPayment(null);
      setTcOpen(false);
      setSelectedBank("");
      setTxHash("");
    } else {
      setSelectedConvPackage("conversations_2k");
      setSelectedBank("");
      setTxHash("");
    }
  }, [productId]);

  const icon = addon
    ? addonIconMap[addon.addonType] || Sparkles
    : effectiveBooster
    ? boosterIconMap[effectiveBooster.iconName] || Zap
    : Sparkles;

  const gradient = addon
    ? addonGradientMap[addon.addonType] || DEFAULT_GRADIENT
    : effectiveBooster
    ? { from: effectiveBooster.gradientFrom, to: effectiveBooster.gradientTo }
    : DEFAULT_GRADIENT;

  const Icon = icon;
  const product = addon || effectiveBooster;
  const isPending = addonMutation.isPending || boosterMutation.isPending;

  const paypalUsdAmount = addon
    ? Number(addon.monthlyPriceUsd).toFixed(2)
    : effectiveBooster
    ? Number(effectiveBooster.priceUsd).toFixed(2)
    : "0.00";

  const handleClose = () => {
    if (phase === "paypal") {
      fetch("/api/merchant/marketplace/paypal-intent", { method: "DELETE" }).catch(() => {});
    }
    onClose();
  };

  const handleBuy = () => {
    if (selectedPaymentMethod === "va" || selectedPaymentMethod === "bank") {
      if (!selectedBank) {
        toast({ title: "Pilih bank terlebih dahulu", variant: "destructive" });
        return;
      }
    }
    if (addon) addonMutation.mutate(addon.addonType);
    else if (effectiveBooster) boosterMutation.mutate(effectiveBooster.boosterType);
  };

  /* ---------- render phases ---------- */

  const renderQR = () => {
    const formattedAmount = `Rp ${payment?.amountIDR?.toLocaleString("id-ID") ?? "—"}`;
    const mm = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
    const ss = String(timeRemaining % 60).padStart(2, "0");
    const isExpired = timeRemaining <= 0 && !!payment?.expiresAt;
    const bankBadges = ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja", "BCA", "Mandiri", "BRI", "BNI", "CIMB"];

    const downloadQR = () => {
      const svgEl = document.querySelector<SVGElement>("[data-marketplace-qr] svg");
      if (!svgEl) return;
      const canvas = document.createElement("canvas");
      canvas.width = 200; canvas.height = 200;
      const ctx = canvas.getContext("2d");
      const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0, 200, 200);
        canvas.toBlob((b) => {
          if (!b) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = "chatvice-qris.png";
          a.click();
        });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };

    return (
      <div className="space-y-3">
        {/* Boarding-pass card — always white bg */}
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
          {/* Header: logos */}
          <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
            <img
              src={isDark ? chatviceLightLogo : chatviceDarkLogo}
              alt="Chatvice"
              className="h-7 object-contain"
            />
            <img src={qrisLogoImg} alt="QRIS" className="h-8 object-contain" />
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-gray-200" />

          {/* Body: QR + order details */}
          <div className="bg-white p-4">
            <div className="flex gap-4 items-start">
              {/* Left: QR + bank badges */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div data-marketplace-qr className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                  {payment?.qrisString ? (
                    <QRCodeSVG value={payment.qrisString} size={148} />
                  ) : (
                    <div className="w-[148px] h-[148px] flex items-center justify-center bg-gray-50 rounded-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {/* Bank/e-wallet pill badges */}
                <div className="flex flex-wrap justify-center gap-1 max-w-[172px]">
                  {bankBadges.map((bank) => (
                    <span
                      key={bank}
                      className="text-[9px] font-medium bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 leading-tight"
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: order details */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Produk</p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{product?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Pembayaran</p>
                  <p className="text-base font-bold text-gray-900">{formattedAmount}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Order ID</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-600 font-mono truncate">{payment?.orderId ?? "—"}</p>
                    {payment?.orderId && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(payment.orderId);
                          toast({ title: "Order ID disalin" });
                        }}
                        className="shrink-0 p-0.5 rounded hover-elevate"
                        data-testid="button-copy-order-id"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Countdown */}
                <div>
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium">
                      <Clock className="w-3 h-3" /> Kedaluwarsa
                    </span>
                  ) : payment?.expiresAt ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                        timeRemaining <= 60
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <Clock className="w-3 h-3" /> {mm}:{ss}
                    </span>
                  ) : null}
                </div>

                {/* Waiting indicator */}
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Menunggu konfirmasi...
                </div>
              </div>
            </div>
          </div>

          {/* Footer: download + cancel */}
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={downloadQR}
              className="flex items-center gap-1.5 text-xs text-gray-500 rounded-lg px-2 py-1 hover-elevate"
              data-testid="button-download-qr"
            >
              <Download className="w-3.5 h-3.5" /> Simpan QR
            </button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs"
              onClick={() => { setPhase("info"); setPayment(null); }}
              data-testid="button-change-payment-method"
            >
              Batal / Ganti Metode
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const VA_BANK_NAMES: Record<string, string> = {
    '002': 'Bank Rakyat Indonesia (BRI)',
    '008': 'Bank Mandiri',
    '022': 'CIMB Niaga',
    '013': 'Bank Permata',
    '011': 'Bank Danamon',
    '016': 'Maybank Indonesia',
    '490': 'Bank Neo Commerce (BNC)',
    '451': 'Bank Syariah Indonesia (BSI)',
  };

  const renderVA = () => {
    const formattedAmount = `Rp ${payment?.amountIDR?.toLocaleString("id-ID") ?? "—"}`;
    const bankName = VA_BANK_NAMES[payment?.bankCode ?? ""] || payment?.bankCode || "—";
    return (
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
          <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
            <img
              src={isDark ? chatviceLightLogo : chatviceDarkLogo}
              alt="Chatvice"
              className="h-7 object-contain"
            />
            <div className="flex items-center gap-1.5 text-primary">
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-semibold">Virtual Account</span>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-200" />
          <div className="bg-white p-4 space-y-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bank</p>
              <p className="text-sm font-semibold text-gray-800">{bankName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nomor Virtual Account</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold font-mono text-gray-900">{payment?.vaNumber || "—"}</p>
                {payment?.vaNumber && (
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(payment.vaNumber!); toast({ title: "Nomor VA disalin" }); }}
                    className="p-0.5 rounded hover-elevate"
                    data-testid="button-copy-va-number"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Pembayaran</p>
              <p className="text-base font-bold text-gray-900">{formattedAmount}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Order ID</p>
              <p className="text-xs text-gray-600 font-mono truncate">{payment?.orderId || "—"}</p>
            </div>
            {/* Countdown */}
            <div>
              {timeRemaining <= 0 && !!payment?.expiresAt ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium">
                  <Clock className="w-3 h-3" /> Kedaluwarsa
                </span>
              ) : payment?.expiresAt ? (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                    timeRemaining <= 60
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                  data-testid="text-va-countdown"
                >
                  <Clock className="w-3 h-3" /> {String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:{String(timeRemaining % 60).padStart(2, "0")}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Menunggu pembayaran...
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-end gap-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs"
              onClick={() => { setPhase("info"); setPayment(null); }}
              data-testid="button-change-payment-method-va"
            >
              Batal / Ganti Metode
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBankTransfer = () => {
    const baseAmount = payment?.amountIDR ?? 0;
    const uniqueCode = payment?.uniqueCode ?? 0;
    const totalAmount = payment?.totalAmount ?? (baseAmount + uniqueCode);
    const formattedTotal = `Rp ${totalAmount.toLocaleString("id-ID")}`;
    return (
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
          <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
            <img
              src={isDark ? chatviceLightLogo : chatviceDarkLogo}
              alt="Chatvice"
              className="h-7 object-contain"
            />
            <div className="flex items-center gap-1.5 text-primary">
              <Building2 className="w-5 h-5" />
              <span className="text-xs font-semibold">Bank Transfer</span>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-200" />
          <div className="bg-white p-4 space-y-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bank Tujuan</p>
              <p className="text-sm font-semibold text-gray-800">{payment?.bankName || payment?.bankCode || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Atas Nama</p>
              <p className="text-sm text-gray-800">{payment?.accountName || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nomor Rekening</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold font-mono text-gray-900">{payment?.accountNumber || "—"}</p>
                {payment?.accountNumber && (
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(payment.accountNumber!); toast({ title: "Nomor rekening disalin" }); }}
                    className="p-0.5 rounded hover-elevate"
                    data-testid="button-copy-account-number"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            {uniqueCode > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Kode Unik</p>
                <p className="text-sm text-gray-800">+Rp {uniqueCode.toLocaleString("id-ID")}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Transfer</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-gray-900">{formattedTotal}</p>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(String(totalAmount)); toast({ title: "Total disalin" }); }}
                  className="p-0.5 rounded hover-elevate"
                  data-testid="button-copy-total-amount"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-[10px] text-amber-700">
                Transfer jumlah tepat termasuk kode unik untuk verifikasi otomatis.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Info className="w-3 h-3" />
              Pembayaran diverifikasi manual oleh tim kami dalam 1x24 jam.
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-end gap-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs"
              onClick={() => { setPhase("info"); setPayment(null); }}
              data-testid="button-change-payment-method-bank"
            >
              Batal / Ganti Metode
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPaypal = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <SiPaypal className="w-5 h-5 text-[#003087]" />
          <p className="font-semibold text-sm text-foreground">Bayar via PayPal</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Klik tombol di bawah untuk membayar menggunakan akun PayPal atau kartu kredit/debit Anda.
        </p>
        <div className="bg-muted/40 rounded-lg px-3 py-2 flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">${paypalUsdAmount} USD</span>
          <span className="text-xs text-muted-foreground">/ {addon ? "bulan" : "sekali bayar"}</span>
        </div>
        <div className="pt-1">
          <PayPalButton
            amount={paypalUsdAmount}
            currency="USD"
            intent="CAPTURE"
            onSuccess={(data) => {
              console.log("PayPal payment result:", data);
              if (data?.activated === true) {
                queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
                queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
                queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
                queryClient.invalidateQueries({ queryKey: ["/api/marketplace/boosters"] });
                setPhase("success");
              } else if (data?.activationError) {
                setPhase("pending_activation");
              } else {
                toast({
                  title: "Pembayaran tidak terselesaikan",
                  description: "Silakan coba lagi atau pilih metode pembayaran lain.",
                  variant: "destructive",
                });
              }
            }}
            onError={(err) => {
              console.error("PayPal payment error:", err);
              toast({ title: "Pembayaran PayPal gagal", description: "Silakan coba lagi.", variant: "destructive" });
            }}
            onCancel={() => {
              fetch("/api/merchant/marketplace/paypal-intent", { method: "DELETE" }).catch(() => {});
              toast({ title: "Pembayaran dibatalkan" });
            }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3 shrink-0" />
          Pembayaran diproses aman oleh PayPal.
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-full text-xs"
        onClick={() => {
          fetch("/api/merchant/marketplace/paypal-intent", { method: "DELETE" }).catch(() => {});
          setPhase("info");
        }}
        data-testid="button-back-from-paypal"
      >
        Ganti Metode Pembayaran
      </Button>
    </div>
  );

  const renderCrypto = () => (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bitcoin className="w-5 h-5 text-[#F7931A]" />
          <p className="font-semibold text-sm text-foreground">Bayar via Kripto</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Kirim pembayaran senilai <span className="font-semibold text-foreground">${paypalUsdAmount} USD</span> ke salah satu alamat wallet berikut. Aktivasi dilakukan manual dalam 1×24 jam setelah konfirmasi.
        </p>
        <div className="space-y-2">
          {CRYPTO_COINS.map((coin) => (
            <div key={coin.id} className="flex items-start gap-3 rounded-lg bg-muted/30 border border-border/40 px-3 py-2.5">
              <coin.Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: coin.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{coin.symbol}</span>
                  <span className="text-[10px] text-muted-foreground">{coin.network}</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground break-all leading-tight">{coin.address}</p>
                {coin.memo && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">{coin.memo}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(coin.address);
                  toast({ title: `Alamat ${coin.symbol} disalin` });
                }}
                className="shrink-0 p-1 rounded hover-elevate"
                data-testid={`button-copy-crypto-${coin.id}`}
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <Info className="w-3 h-3 shrink-0" />
          Setelah transfer, paste tx hash di bawah lalu klik tombol kirim untuk konfirmasi pembayaran.
        </div>
      </div>

      {/* TX Hash submission */}
      <div className="rounded-xl border border-border/50 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">Kirim Bukti Pembayaran</p>
        <p className="text-[11px] text-muted-foreground">
          Paste transaction hash (tx hash) dari transfer kripto Anda. Tim kami akan memverifikasi dan mengaktifkan layanan dalam 1×24 jam.
        </p>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Contoh: 0x4a3b...f2d1 atau hash transaksi lainnya"
          className="w-full rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid="input-crypto-txhash"
        />
        <Button
          size="sm"
          className="w-full rounded-full text-xs"
          disabled={!txHash.trim() || cryptoProofMutation.isPending}
          onClick={() => cryptoProofMutation.mutate(txHash.trim())}
          data-testid="button-submit-crypto-proof"
        >
          {cryptoProofMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          )}
          Kirim Bukti Pembayaran
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-full text-xs"
        onClick={() => setPhase("info")}
        data-testid="button-back-from-crypto"
      >
        Ganti Metode Pembayaran
      </Button>
    </div>
  );

  const renderCryptoProofSent = () => (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <ShieldCheck className="w-12 h-12 text-green-500" />
      <p className="font-semibold text-lg text-foreground">Bukti diterima!</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Transaction hash Anda telah dicatat. Tim kami akan memverifikasi pembayaran dan mengaktifkan layanan dalam 1×24 jam.
      </p>
      <p className="text-xs text-muted-foreground">
        Butuh bantuan? Hubungi{" "}
        <a href="mailto:support@chatvice.app" className="underline text-foreground">
          support@chatvice.app
        </a>
      </p>
      <Button size="sm" className="rounded-full px-6 mt-2" onClick={handleClose} data-testid="button-close-crypto-proof-sent">
        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Selesai
      </Button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <PartyPopper className="w-12 h-12 text-green-500" />
      <p className="font-semibold text-lg text-foreground">Pembayaran berhasil!</p>
      <p className="text-sm text-muted-foreground">
        {addon ? `${addon.name} telah diaktifkan di akun Anda.` : `Kuota ${effectiveBooster?.name} berhasil ditambahkan.`}
      </p>
      <Button size="sm" className="rounded-full px-6 mt-2" onClick={handleClose}>
        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Selesai
      </Button>
    </div>
  );

  const renderPendingActivation = () => (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <Clock className="w-12 h-12 text-amber-500" />
      <p className="font-semibold text-lg text-foreground">Pembayaran diterima</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Pembayaran Anda telah dikonfirmasi oleh PayPal, namun aktivasi otomatis belum berhasil.
        Tim kami akan mengaktifkan layanan Anda dalam 1&times;24 jam.
      </p>
      <p className="text-xs text-muted-foreground">
        Butuh bantuan? Hubungi{" "}
        <a href="mailto:support@chatvice.app" className="underline text-foreground">
          support@chatvice.app
        </a>
      </p>
      <Button size="sm" className="rounded-full px-6 mt-1" onClick={handleClose}>
        Tutup
      </Button>
    </div>
  );

  const renderFailed = () => (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <p className="font-semibold text-foreground">Pembayaran gagal atau kedaluwarsa</p>
      <p className="text-sm text-muted-foreground">Silakan coba lagi.</p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full px-4 mt-1"
        onClick={() => { setPhase("info"); setPayment(null); }}
      >
        Coba lagi
      </Button>
    </div>
  );

  const renderInfo = () => {
    if (!product) return null;
    const benefits = effectiveBooster
      ? (boosterBenefits[effectiveBooster.boosterType] ??
          (isConvBooster ? boosterBenefits["conversations"] : null) ??
          null)
      : null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* ── Left column: price + terms ── */}
        <div className="space-y-4">
          {/* Package selector — conversation boosters only */}
          {isConvBooster && convBoosterOptions.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Pilih Paket</p>
              <Select value={selectedConvPackage} onValueChange={setSelectedConvPackage}>
                <SelectTrigger className="w-full" data-testid="select-conv-package">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {convBoosterOptions.map((opt) => (
                    <SelectItem key={opt.boosterType} value={opt.boosterType}>
                      +{opt.quotaAmount.toLocaleString("id-ID")} Conversations — ${opt.priceUsd} / {opt.priceIdrFormatted}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price */}
          <div className="bg-muted/40 rounded-xl px-4 py-3">
            {addon ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">${addon.monthlyPriceUsd}</span>
                  <span className="text-sm text-muted-foreground">/ bulan</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">≈ {addon.monthlyPriceIdrFormatted} / bulan</p>
              </>
            ) : effectiveBooster ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">${effectiveBooster.priceUsd}</span>
                  <span className="text-sm text-muted-foreground">
                    {effectiveBooster.billingMode === "monthly" ? "/ bulan" : "/ sekali bayar"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">≈ {effectiveBooster.priceIdrFormatted}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-2">
                  {effectiveBooster.billingMode === "monthly" ? "Langganan bulanan" : "Pembelian sekali"}
                </Badge>
              </>
            ) : null}
          </div>

          {addonActive && (
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Add-on ini sudah aktif di akun Anda.
            </div>
          )}

          {/* Payment method selector */}
          {!addonActive && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "qris" as const, label: "QRIS", available: true },
                    { id: "va" as const, label: "Virtual Account", available: true },
                    { id: "bank" as const, label: "Bank Transfer", available: true },
                    { id: "paypal" as const, label: "PayPal", available: true },
                    { id: "crypto" as const, label: "Kripto", available: true },
                  ]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod(m.id);
                      setSelectedBank("");
                    }}
                    className={[
                      "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer",
                      selectedPaymentMethod === m.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground",
                    ].join(" ")}
                    data-testid={`button-payment-method-${m.id}`}
                  >
                    {m.id === "qris" && <QrCode className="w-3.5 h-3.5 shrink-0" />}
                    {m.id === "va" && <CreditCard className="w-3.5 h-3.5 shrink-0" />}
                    {m.id === "bank" && <Building2 className="w-3.5 h-3.5 shrink-0" />}
                    {m.id === "paypal" && <SiPaypal className="w-3.5 h-3.5 shrink-0" />}
                    {m.id === "crypto" && <Bitcoin className="w-3.5 h-3.5 shrink-0" />}
                    <span className="flex-1 truncate">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Bank selector for VA */}
              {selectedPaymentMethod === "va" && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Pilih Bank VA</p>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="w-full" data-testid="select-va-bank">
                      <SelectValue placeholder="Pilih bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { code: "002", name: "Bank Rakyat Indonesia (BRI)" },
                        { code: "008", name: "Bank Mandiri" },
                        { code: "022", name: "CIMB Niaga" },
                        { code: "013", name: "Bank Permata" },
                        { code: "011", name: "Bank Danamon" },
                        { code: "016", name: "Maybank Indonesia" },
                        { code: "490", name: "Bank Neo Commerce (BNC)" },
                        { code: "451", name: "Bank Syariah Indonesia (BSI)" },
                      ].map((b) => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bank selector for bank transfer */}
              {selectedPaymentMethod === "bank" && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Pilih Bank Tujuan</p>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="w-full" data-testid="select-transfer-bank">
                      <SelectValue placeholder="Pilih bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { code: "BNI", name: "Bank Negara Indonesia (BNI)" },
                        { code: "BRI", name: "Bank Rakyat Indonesia (BRI)" },
                        { code: "MANDIRI", name: "Bank Mandiri" },
                        { code: "BCA", name: "Bank Central Asia (BCA)" },
                      ].map((b) => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Terms & Conditions */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              onClick={() => setTcOpen((v) => !v)}
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="underline underline-offset-2">Syarat & Ketentuan</span>
              <ChevronRight
                className={`w-3 h-3 ml-auto transition-transform ${tcOpen ? "rotate-90" : ""}`}
              />
            </button>
            {tcOpen && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside pl-1">
                {selectedPaymentMethod === "paypal" && (
                  <li>Pembayaran diproses aman oleh PayPal dan bersifat non-refundable.</li>
                )}
                {selectedPaymentMethod === "crypto" && (
                  <li>Pembayaran kripto bersifat manual — aktivasi dilakukan dalam 1×24 jam setelah konfirmasi jaringan diterima.</li>
                )}
                {selectedPaymentMethod !== "paypal" && selectedPaymentMethod !== "crypto" && (
                  <li>Pembayaran diproses oleh 12Pay melalui QRIS dan bersifat non-refundable.</li>
                )}
                {addon && <li>Biaya berlangganan ditagih setiap bulan. Anda dapat membatalkan kapan saja melalui menu Billing.</li>}
                {booster && <li>Kuota dikreditkan ke akun secara instan setelah pembayaran terverifikasi. Non-transferable.</li>}
                {selectedPaymentMethod === "crypto"
                  ? <li>Aktivasi manual oleh tim Chatvice setelah hash transaksi dikonfirmasi.</li>
                  : <li>Aktivasi otomatis setelah pembayaran berhasil dikonfirmasi oleh gateway.</li>
                }
                <li>Chatvice berhak mengubah harga dengan pemberitahuan minimal 30 hari sebelumnya.</li>
              </ul>
            )}
          </div>
        </div>

        {/* ── Right column: description / benefits ── */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Yang Anda dapatkan
          </p>

          {/* Addon description from DB */}
          {addon?.description && (
            <p className="text-sm text-foreground leading-relaxed">{addon.description}</p>
          )}

          {/* Booster: headline + rich bullet list */}
          {effectiveBooster && benefits && (
            <>
              <p className="text-sm font-medium text-foreground">{benefits.headline}</p>
              <ul className="space-y-2">
                {benefits.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Fallback for boosters without a mapped description */}
          {effectiveBooster && !benefits && (
            <p className="text-sm text-foreground leading-relaxed">
              Tambah <strong>{effectiveBooster.quotaAmount.toLocaleString()}</strong> kuota{" "}
              {effectiveBooster.name.replace(/^\+[\d,]+\s+/, "")} ke akun Anda secara instan.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={!!productId} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        className="max-w-sm sm:max-w-2xl p-0 gap-0 overflow-hidden border-border/50 shadow-2xl bg-background/85 backdrop-blur-xl max-h-[90vh] flex flex-col"
        data-testid="dialog-product-detail"
      >
        {/* Header — always visible */}
        <div className="flex items-start gap-3 p-4 pb-3 shrink-0">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient.from} ${gradient.to} flex items-center justify-center shrink-0 shadow-md`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-semibold text-foreground leading-tight line-clamp-2">
              {isConvBooster ? "Tambah Percakapan" : (product?.name ?? "—")}
            </DialogTitle>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {isAddon ? "Add-on" : "Booster"}
              </Badge>
              {effectiveBooster?.isFeatured && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Populer
                </Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-full p-1 hover-elevate text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="button-close-product-popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Separator className="shrink-0" />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {phase === "info" && renderInfo()}
          {phase === "qr" && renderQR()}
          {phase === "va" && renderVA()}
          {phase === "bank_transfer" && renderBankTransfer()}
          {phase === "paypal" && renderPaypal()}
          {phase === "crypto" && renderCrypto()}
          {phase === "crypto_proof_sent" && renderCryptoProofSent()}
          {phase === "success" && renderSuccess()}
          {phase === "pending_activation" && renderPendingActivation()}
          {phase === "failed" && renderFailed()}
        </div>

        {/* Sticky footer — only in info phase */}
        {phase === "info" && (
          <div className="shrink-0 p-4 pt-3 border-t border-border/50 bg-background/60 backdrop-blur-sm flex flex-col gap-2">
            <Button
              className="w-full rounded-full"
              onClick={handleBuy}
              disabled={addonActive || isPending}
              data-testid={`button-buy-popup-${productId}`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : selectedPaymentMethod === "va" ? (
                <CreditCard className="w-4 h-4 mr-2" />
              ) : selectedPaymentMethod === "bank" ? (
                <Building2 className="w-4 h-4 mr-2" />
              ) : selectedPaymentMethod === "paypal" ? (
                <SiPaypal className="w-4 h-4 mr-2" />
              ) : selectedPaymentMethod === "crypto" ? (
                <Bitcoin className="w-4 h-4 mr-2" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              {addonActive
                ? "Sudah berlangganan"
                : selectedPaymentMethod === "paypal"
                  ? (addon ? "Subscribe via PayPal" : "Beli via PayPal")
                  : selectedPaymentMethod === "crypto"
                    ? (addon ? "Subscribe via Kripto" : "Beli via Kripto")
                    : addon
                      ? selectedPaymentMethod === "va" ? "Subscribe via Virtual Account"
                        : selectedPaymentMethod === "bank" ? "Subscribe via Bank Transfer"
                        : "Subscribe via QRIS"
                      : selectedPaymentMethod === "va" ? "Beli via Virtual Account"
                        : selectedPaymentMethod === "bank" ? "Beli via Bank Transfer"
                        : "Beli via QRIS"
              }
            </Button>
            {addon && !addonActive && (
              <p className="text-center text-xs text-muted-foreground">
                Atau{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={() => { onClose(); setTimeout(() => window.location.assign("/dashboard/additional-services"), 50); }}
                >
                  coba gratis 7 hari
                </button>
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Main section component                                               */
/* ------------------------------------------------------------------ */

export function MarketplacePreviewSection() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: boostersData, isLoading: loadingBoosters } =
    useQuery<BoosterResponse>({ queryKey: ["/api/marketplace/boosters"] });

  const { data: addonsData, isLoading: loadingAddons } =
    useQuery<AddonResponse>({ queryKey: ["/api/marketplace/addons"] });

  const { data: merchantAddons = [] } = useQuery<MarketplaceMerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const isLoading = loadingBoosters || loadingAddons;

  const addonProducts: UnifiedProduct[] = (addonsData?.items ?? []).map((item) => {
    const g = addonGradientMap[item.addonType] || DEFAULT_GRADIENT;
    return {
      productId: `addon-${item.addonType}`,
      name: item.name,
      kind: "addon",
      iconName: item.addonType,
      gradientFrom: g.from,
      gradientTo: g.to,
    };
  });

  const boosterProducts: UnifiedProduct[] = (boostersData?.items ?? [])
    .filter((item) => !item.boosterType.startsWith("conversations_") || item.boosterType === "conversations_2k")
    .map((item) => {
      const { value, label } = splitBoosterName(item.name);
      const isConvTile = item.boosterType === "conversations_2k";
      return {
        productId: `booster-${item.boosterType}`,
        name: item.name,
        kind: "booster",
        iconName: item.iconName,
        gradientFrom: item.gradientFrom,
        gradientTo: item.gradientTo,
        valueText: isConvTile ? "Conversation" : (value || `+${item.quotaAmount.toLocaleString()}`),
        labelText: isConvTile ? "Booster" : label,
      };
    });

  const allProducts: UnifiedProduct[] = [...addonProducts, ...boosterProducts];

  if (isLoading) {
    return (
      <Card data-testid="card-marketplace-preview-loading">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Marketplace</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <>
      <Card data-testid="card-marketplace-preview">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <CardTitle className="text-base text-foreground">Marketplace</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              {allProducts.length} products
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 h-8 text-sm font-medium"
            onClick={() => navigate("/dashboard/marketplace")}
            data-testid="button-view-all-marketplace"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {allProducts.map((product) => {
              const Icon =
                product.kind === "addon"
                  ? (addonIconMap[product.iconName] || Sparkles)
                  : (boosterIconMap[product.iconName] || Zap);

              return (
                <button
                  key={product.productId}
                  type="button"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
                  onClick={() => setSelectedId(product.productId)}
                  data-testid={`tile-${product.productId}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.gradientFrom} ${product.gradientTo} flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.kind === "booster" && product.valueText ? (
                      <>
                        <p className="text-2xl font-bold text-foreground leading-none">
                          {product.valueText}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                          {product.labelText}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Add-on</p>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ProductPopup
        productId={selectedId}
        addonsData={addonsData}
        boostersData={boostersData}
        merchantAddons={merchantAddons}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
