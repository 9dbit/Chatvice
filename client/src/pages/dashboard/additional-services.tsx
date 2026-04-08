import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sparkles, Calendar, CheckCircle, Loader2, AlertCircle, CreditCard, Wallet, Hotel, ExternalLink, TestTube2, Clock, QrCode, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface AddonConfig {
  id: number;
  addonType: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  isEnabled: boolean;
}

interface MerchantAddon {
  id: string;
  merchantId: string;
  addonType: string;
  isActive: boolean;
  calendarToken: string | null;
  subscribedAt: string | null;
  trialEndsAt: string | null;
}

interface PaymentInitResult {
  orderId: string;
  addonType: string;
  paymentMethod: string;
  amount: number;
  amountIDR?: number;
  currency: string;
  qrisUrl?: string | null;
  qrisString?: string | null;
  transactionId?: string;
  expiresAt?: string | null;
  instructions?: string;
}

interface HospitalityConfig {
  id: string;
  merchantId: string;
  hotelName: string;
  bookingUrl: string;
  googleSheetUrl: string;
  aiInstructions: string | null;
  isEnabled: boolean;
}

interface SheetTestResult {
  success: boolean;
  rowCount: number;
  sampleRows: string[];
  message: string;
}

const addonIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
};

const PAYMENT_METHODS = [
  { value: "kompas_pay", label: "Kompas Pay", description: "QRIS, Virtual Account, Transfer" },
  { value: "paypal", label: "PayPal", description: "International card/wallet" },
  { value: "crypto", label: "Cryptocurrency", description: "BTC, ETH, USDT, dll." },
];

const hospitalityFormSchema = z.object({
  hotelName: z.string().min(1, "Nama hotel wajib diisi"),
  bookingUrl: z.string().url("URL pemesanan tidak valid").or(z.literal("")),
  googleSheetUrl: z.string().url("URL Google Sheet tidak valid").or(z.literal("")),
  aiInstructions: z.string().max(1000, "Maks 1000 karakter"),
  isEnabled: z.boolean(),
});

type HospitalityForm = z.infer<typeof hospitalityFormSchema>;

function HospitalitySettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [sheetTestResult, setSheetTestResult] = useState<SheetTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: config, isLoading } = useQuery<HospitalityConfig | null>({
    queryKey: ["/api/merchant/hospitality-config"],
    enabled: open,
  });

  const form = useForm<HospitalityForm>({
    resolver: zodResolver(hospitalityFormSchema),
    values: {
      hotelName: config?.hotelName ?? "",
      bookingUrl: config?.bookingUrl ?? "",
      googleSheetUrl: config?.googleSheetUrl ?? "",
      aiInstructions: config?.aiInstructions ?? "",
      isEnabled: config?.isEnabled ?? false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: HospitalityForm) => {
      const res = await apiRequest("PUT", "/api/merchant/hospitality-config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/hospitality-config"] });
      toast({ title: "Tersimpan", description: "Pengaturan hospitality berhasil disimpan." });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    },
  });

  const handleTestSheet = async () => {
    const googleSheetUrl = form.getValues("googleSheetUrl");
    if (!googleSheetUrl) {
      toast({ title: "URL diperlukan", description: "Masukkan URL Google Sheet terlebih dahulu.", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    setSheetTestResult(null);
    try {
      const res = await apiRequest("POST", "/api/merchant/hospitality-config/test-sheet", { googleSheetUrl });
      const result: SheetTestResult = await res.json();
      setSheetTestResult(result);
    } catch (err: any) {
      setSheetTestResult({ success: false, rowCount: 0, sampleRows: [], message: err.message || "Gagal mengakses sheet." });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-primary" />
            Pengaturan Hospitality AI
          </DialogTitle>
          <DialogDescription>
            Hubungkan data kamar hotel dari Google Sheet untuk ditampilkan secara real-time di chatbot.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 mt-2">
              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md border">
                    <div>
                      <p className="text-sm font-medium">Aktifkan Fitur</p>
                      <p className="text-xs text-muted-foreground">Chatbot akan menampilkan ketersediaan kamar ketika customer bertanya</p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-hospitality-enabled"
                    />
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="hotelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Hotel</FormLabel>
                    <FormControl>
                      <Input placeholder="Grand Chatvice Hotel" {...field} data-testid="input-hotel-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bookingUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Pemesanan</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://book.yourhotel.com" {...field} data-testid="input-booking-url" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Link yang akan dibuka saat customer menekan tombol "Pesan Sekarang di Website"</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleSheetUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Google Sheet</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          {...field}
                          data-testid="input-google-sheet-url"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={handleTestSheet}
                          disabled={isTesting}
                          data-testid="button-test-sheet"
                        >
                          {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                          <span className="ml-1 hidden sm:inline">Test</span>
                        </Button>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Sheet harus bisa diakses publik. Kolom yang didukung: <code>room_name</code>, <code>room_description</code>, <code>price_per_night</code>, <code>availability</code>, <code>check_in</code>, <code>check_out</code>, <code>image_url</code>.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {sheetTestResult && (
                <div className={`rounded-md p-3 text-sm ${sheetTestResult.success ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-destructive/10 border border-destructive/30"}`}>
                  <p className={`font-medium ${sheetTestResult.success ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                    {sheetTestResult.message}
                  </p>
                  {sheetTestResult.success && sheetTestResult.sampleRows.length > 1 && (() => {
                    const [headerRow, ...dataRows] = sheetTestResult.sampleRows;
                    const headers = headerRow.split(",").map(h => h.replace(/"/g, "").trim());
                    const rows = dataRows.slice(0, 3).map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
                    return (
                      <div className="mt-2 overflow-x-auto">
                        <p className="text-xs text-muted-foreground mb-1.5">Preview data (3 baris pertama):</p>
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr>
                              {headers.map((h, i) => (
                                <th key={i} className="border border-border px-1.5 py-1 text-left font-semibold bg-muted/50 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, ri) => (
                              <tr key={ri} className="even:bg-muted/20">
                                {headers.map((_, ci) => (
                                  <td key={ci} className="border border-border px-1.5 py-1 text-muted-foreground truncate max-w-[80px]">{row[ci] ?? ""}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              <FormField
                control={form.control}
                name="aiInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruksi Tambahan untuk AI (opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Contoh: Selalu sebutkan bahwa check-in pukul 14.00 dan check-out pukul 12.00..."
                        rows={3}
                        {...field}
                        data-testid="textarea-ai-instructions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-medium">Format Kolom Google Sheet (header baris pertama):</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="border border-border px-1.5 py-1 text-left font-semibold whitespace-nowrap">Kolom</th>
                        <th className="border border-border px-1.5 py-1 text-left font-semibold whitespace-nowrap">Alias yang diterima</th>
                        <th className="border border-border px-1.5 py-1 text-left font-semibold">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      {[
                        ["room_name *", "Room Type, Tipe Kamar, Nama Kamar", "Wajib. Nama/tipe kamar"],
                        ["price_per_night", "Price, Harga, Harga Per Malam", "Harga per malam (angka)"],
                        ["availability", "Available, Tersedia, Stok, Jumlah", "Jumlah kamar tersedia"],
                        ["room_description", "Description, Deskripsi, Detail", "Deskripsi singkat kamar"],
                        ["check_in", "Check-in, Checkin, Tanggal Masuk", "Tanggal check-in (opsional)"],
                        ["check_out", "Check-out, Checkout, Tanggal Keluar", "Tanggal check-out (opsional)"],
                        ["image_url", "Image, Foto, Gambar, Photo", "URL foto kamar (opsional)"],
                      ].map(([col, alias, desc]) => (
                        <tr key={col} className="even:bg-muted/20">
                          <td className="border border-border px-1.5 py-1 font-mono whitespace-nowrap">{col}</td>
                          <td className="border border-border px-1.5 py-1">{alias}</td>
                          <td className="border border-border px-1.5 py-1">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={saveMutation.isPending}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="flex-1" disabled={saveMutation.isPending} data-testid="button-save-hospitality">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan Pengaturan
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type PaymentDialogStep = "select_method" | "qris" | "manual_ref";

export default function AdditionalServicesPage() {
  const { toast } = useToast();
  const [selectedAddon, setSelectedAddon] = useState<AddonConfig | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentDialogStep>("select_method");
  const [paymentResult, setPaymentResult] = useState<PaymentInitResult | null>(null);
  const [manualReference, setManualReference] = useState("");
  const [hospitalitySettingsOpen, setHospitalitySettingsOpen] = useState(false);

  const { data: addonConfigs = [], isLoading: configsLoading } = useQuery<AddonConfig[]>({
    queryKey: ["/api/addon-configs"],
  });

  const { data: merchantAddons = [], isLoading: addonsLoading } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: async ({ addonType, paymentMethod }: { addonType: string; paymentMethod: string }) => {
      const res = await apiRequest("POST", "/api/merchant/addons/initiate-payment", { addonType, paymentMethod });
      return res.json() as Promise<PaymentInitResult>;
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      if (data.paymentMethod === "kompas_pay" && (data.qrisUrl || data.qrisString)) {
        setPaymentStep("qris");
      } else {
        setPaymentStep("manual_ref");
      }
    },
    onError: (err: any) => {
      toast({ title: "Payment failed", description: err.message || "Could not initiate payment", variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ addonType, paymentReference, pendingId }: { addonType: string; paymentReference: string; pendingId?: string }) => {
      const res = await apiRequest("POST", "/api/merchant/addons/confirm-payment", { addonType, paymentReference, pendingId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      closeDialog();
      toast({ title: "Payment submitted", description: "Your addon will be activated after payment is verified." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not confirm payment", variant: "destructive" });
    },
  });

  const trialMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await apiRequest("POST", "/api/merchant/addons/start-trial", { addonType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      toast({ title: "Trial started!", description: "Your 7-day free trial is now active." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not start trial", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (addonType: string) =>
      apiRequest("DELETE", `/api/merchant/addons/${addonType}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      toast({ title: "Addon deactivated", description: "Additional service has been deactivated." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "An error occurred", variant: "destructive" });
    },
  });

  const getAddon = (addonType: string) =>
    merchantAddons.find(a => a.addonType === addonType);
  const getActiveAddon = (addonType: string) =>
    merchantAddons.find(a => a.addonType === addonType && a.isActive);

  const handleSubscribeClick = (config: AddonConfig) => {
    setSelectedAddon(config);
    setSelectedPaymentMethod(null);
    setPaymentStep("select_method");
    setPaymentResult(null);
    setManualReference("");
  };

  const handleProceedToPayment = () => {
    if (!selectedAddon || !selectedPaymentMethod) return;
    initiatePaymentMutation.mutate({ addonType: selectedAddon.addonType, paymentMethod: selectedPaymentMethod });
  };

  const handleConfirmPayment = () => {
    if (!selectedAddon || !manualReference.trim()) return;
    confirmPaymentMutation.mutate({
      addonType: selectedAddon.addonType,
      paymentReference: manualReference.trim(),
      pendingId: paymentResult?.transactionId,
    });
  };

  const handleQrisConfirm = () => {
    if (!selectedAddon || !paymentResult) return;
    confirmPaymentMutation.mutate({
      addonType: selectedAddon.addonType,
      paymentReference: paymentResult.transactionId || paymentResult.orderId,
      pendingId: paymentResult.transactionId,
    });
  };

  const closeDialog = () => {
    setSelectedAddon(null);
    setSelectedPaymentMethod(null);
    setPaymentStep("select_method");
    setPaymentResult(null);
    setManualReference("");
  };

  const handleManageClick = (addonType: string) => {
    if (addonType === "appointment_scheduling") {
      window.location.href = "/dashboard/appointments";
    } else if (addonType === "hospitality") {
      setHospitalitySettingsOpen(true);
    }
  };

  const isLoading = configsLoading || addonsLoading;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Additional Services</h1>
        <p className="text-muted-foreground mt-1">
          Activate premium features to enhance your chatbot capabilities.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : addonConfigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Sparkles className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">No additional services available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addonConfigs.map((config) => {
            const addon = getAddon(config.addonType);
            const active = addon?.isActive;
            const trialActive = active && addon?.trialEndsAt && new Date(addon.trialEndsAt) > new Date();
            const trialDaysLeft = addon?.trialEndsAt
              ? Math.max(0, Math.ceil((new Date(addon.trialEndsAt).getTime() - Date.now()) / 86400000))
              : null;
            const usedTrial = !!addon?.trialEndsAt;
            const Icon = addonIcons[config.addonType] || Sparkles;

            return (
              <Card key={config.addonType} data-testid={`card-addon-${config.addonType}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{config.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm font-semibold text-primary">
                            ${config.monthlyPriceUsd}/month
                          </span>
                          {active && trialActive ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              Trial — {trialDaysLeft}d left
                            </Badge>
                          ) : active ? (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config.description && (
                    <CardDescription className="text-sm leading-relaxed">
                      {config.description}
                    </CardDescription>
                  )}

                  {config.addonType === "appointment_scheduling" && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Division & staff management</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Internal calendar with shareable links</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Availability check via AI chatbot</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Automatic WhatsApp notifications</li>
                    </ul>
                  )}

                  {config.addonType === "hospitality" && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Real-time room data from Google Sheet</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Interactive room cards in chat widget</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> "Best Price" &amp; "Almost Full" badges</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> "Book Now" button directly to booking page</li>
                    </ul>
                  )}

                  <div className="flex gap-2 pt-1 flex-wrap">
                    {active ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageClick(config.addonType)}
                          data-testid={`button-manage-${config.addonType}`}
                        >
                          {config.addonType === "hospitality" && <ExternalLink className="w-3.5 h-3.5 mr-1" />}
                          Manage
                        </Button>
                        {trialActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSubscribeClick(config)}
                            data-testid={`button-upgrade-${config.addonType}`}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            Subscribe
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelMutation.mutate(config.addonType)}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-${config.addonType}`}
                        >
                          {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deactivate"}
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleSubscribeClick(config)}
                          data-testid={`button-subscribe-${config.addonType}`}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Activate — ${config.monthlyPriceUsd}/mo
                        </Button>
                        {!usedTrial && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => trialMutation.mutate(config.addonType)}
                            disabled={trialMutation.isPending}
                            data-testid={`button-trial-${config.addonType}`}
                          >
                            {trialMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 mr-1" />
                            )}
                            Try Free 7 Days
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {!active && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Payment processed after method confirmation.{usedTrial ? " Trial already used." : ""}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedAddon} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          {paymentStep === "select_method" && (
            <>
              <DialogHeader>
                <DialogTitle>Choose Payment Method</DialogTitle>
                <DialogDescription>
                  {selectedAddon && (
                    <>Subscribe to <strong>{selectedAddon.name}</strong> for <strong>${selectedAddon.monthlyPriceUsd}/month</strong>.</>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 mt-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                      selectedPaymentMethod === method.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/50"
                    }`}
                    data-testid={`button-payment-method-${method.value}`}
                  >
                    {method.value === "crypto" ? (
                      <Wallet className="w-5 h-5 text-muted-foreground shrink-0" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{method.label}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                    {selectedPaymentMethod === method.value && (
                      <CheckCircle className="w-4 h-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={closeDialog} data-testid="button-cancel-subscribe">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleProceedToPayment}
                  disabled={!selectedPaymentMethod || initiatePaymentMutation.isPending}
                  data-testid="button-confirm-subscribe"
                >
                  {initiatePaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {paymentStep === "qris" && paymentResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Scan QRIS to Pay
                </DialogTitle>
                <DialogDescription>
                  Scan this QR code with your banking app or e-wallet.
                  Amount: <strong>Rp {paymentResult.amountIDR?.toLocaleString("id-ID") || "—"}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-3 py-4">
                {paymentResult.qrisUrl ? (
                  <img
                    src={paymentResult.qrisUrl}
                    alt="QRIS payment code"
                    className="w-56 h-56 rounded-md border object-contain"
                    data-testid="img-qris"
                  />
                ) : (
                  <div className="w-56 h-56 rounded-md border flex items-center justify-center bg-muted">
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                {paymentResult.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(paymentResult.expiresAt).toLocaleString("id-ID")}
                  </p>
                )}
                {paymentResult.qrisString && (
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentResult.qrisString!);
                      toast({ title: "QRIS string copied" });
                    }}
                    data-testid="button-copy-qris"
                  >
                    <Copy className="w-3 h-3" />
                    Copy QRIS string
                  </button>
                )}
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p>1. Open your banking app or e-wallet (GoPay, OVO, DANA, etc.)</p>
                <p>2. Scan the QR code above</p>
                <p>3. Complete the payment of <strong>Rp {paymentResult.amountIDR?.toLocaleString("id-ID")}</strong></p>
                <p>4. Click "I've Paid" below — your addon will be activated after verification.</p>
              </div>

              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setPaymentStep("select_method")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleQrisConfirm}
                  disabled={confirmPaymentMutation.isPending}
                  data-testid="button-ive-paid"
                >
                  {confirmPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  I've Paid
                </Button>
              </div>
            </>
          )}

          {paymentStep === "manual_ref" && paymentResult && (
            <>
              <DialogHeader>
                <DialogTitle>Payment Instructions</DialogTitle>
                <DialogDescription>
                  {paymentResult.instructions || "Complete your payment and enter the transaction reference below."}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1 mt-2">
                <p><strong>Amount:</strong> ${paymentResult.amount} USD</p>
                <p><strong>Order ID:</strong> <span className="font-mono text-xs">{paymentResult.orderId}</span></p>
                <p className="text-xs text-muted-foreground">Use this order ID as your payment description/reference.</p>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="payment-reference">Transaction Reference / Receipt Number</Label>
                <Input
                  id="payment-reference"
                  placeholder="Enter your payment reference..."
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  data-testid="input-payment-reference"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setPaymentStep("select_method")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleConfirmPayment}
                  disabled={!manualReference.trim() || confirmPaymentMutation.isPending}
                  data-testid="button-submit-payment-ref"
                >
                  {confirmPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Payment
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <HospitalitySettingsDialog
        open={hospitalitySettingsOpen}
        onClose={() => setHospitalitySettingsOpen(false)}
      />
    </div>
  );
}
