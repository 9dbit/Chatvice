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
import { Sparkles, Calendar, CheckCircle, Loader2, AlertCircle, CreditCard, Wallet, Hotel, ExternalLink, TestTube2 } from "lucide-react";
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
                  {sheetTestResult.success && sheetTestResult.sampleRows.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Preview (3 baris pertama):</p>
                      <div className="space-y-1">
                        {sheetTestResult.sampleRows.map((row, i) => (
                          <code key={i} className="block text-xs truncate text-muted-foreground">{row}</code>
                        ))}
                      </div>
                    </div>
                  )}
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

              <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                <p className="text-xs font-medium">Format Kolom Google Sheet yang Didukung:</p>
                <p className="text-xs text-muted-foreground">
                  <strong>room_name</strong> · <strong>room_description</strong> · <strong>price_per_night</strong> · <strong>availability</strong> · <strong>check_in</strong> · <strong>check_out</strong> · <strong>image_url</strong> (semua opsional kecuali room_name)
                </p>
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

export default function AdditionalServicesPage() {
  const { toast } = useToast();
  const [selectedAddon, setSelectedAddon] = useState<AddonConfig | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [hospitalitySettingsOpen, setHospitalitySettingsOpen] = useState(false);

  const { data: addonConfigs = [], isLoading: configsLoading } = useQuery<AddonConfig[]>({
    queryKey: ["/api/addon-configs"],
  });

  const { data: merchantAddons = [], isLoading: addonsLoading } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ addonType, paymentMethod }: { addonType: string; paymentMethod: string }) =>
      apiRequest("POST", "/api/merchant/addons/subscribe", { addonType, paymentMethod }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      setSelectedAddon(null);
      setSelectedPaymentMethod(null);
      toast({
        title: "Pembayaran disiapkan",
        description: data?.message || "Selesaikan pembayaran untuk mengaktifkan layanan.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (addonType: string) =>
      apiRequest("DELETE", `/api/merchant/addons/${addonType}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      toast({ title: "Addon dinonaktifkan", description: "Layanan tambahan telah dinonaktifkan." });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    },
  });

  const getActiveAddon = (addonType: string) =>
    merchantAddons.find(a => a.addonType === addonType && a.isActive);

  const handleSubscribeClick = (config: AddonConfig) => {
    setSelectedAddon(config);
    setSelectedPaymentMethod(null);
  };

  const handleConfirmSubscribe = () => {
    if (!selectedAddon || !selectedPaymentMethod) return;
    subscribeMutation.mutate({ addonType: selectedAddon.addonType, paymentMethod: selectedPaymentMethod });
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
        <h1 className="text-2xl font-semibold tracking-tight">Layanan Tambahan</h1>
        <p className="text-muted-foreground mt-1">
          Aktifkan fitur premium untuk meningkatkan kapabilitas chatbot Anda.
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
            <p className="text-muted-foreground">Belum ada layanan tambahan yang tersedia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addonConfigs.map((config) => {
            const active = getActiveAddon(config.addonType);
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
                            ${config.monthlyPriceUsd}/bulan
                          </span>
                          {active ? (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Aktif
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
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Manajemen divisi &amp; staf</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Kalender internal berbagi link</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Cek ketersediaan via AI chatbot</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Notifikasi WhatsApp otomatis</li>
                    </ul>
                  )}

                  {config.addonType === "hospitality" && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Data kamar real-time dari Google Sheet</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Kartu kamar interaktif di widget chat</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Badge "Harga Terbaik" &amp; "Hampir Penuh"</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Tombol "Pesan Sekarang" langsung ke booking</li>
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
                          Kelola
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelMutation.mutate(config.addonType)}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-${config.addonType}`}
                        >
                          {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Nonaktifkan"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSubscribeClick(config)}
                        data-testid={`button-subscribe-${config.addonType}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Aktifkan — ${config.monthlyPriceUsd}/bln
                      </Button>
                    )}
                  </div>

                  {!active && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Pembayaran diproses setelah konfirmasi metode.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedAddon} onOpenChange={(open) => { if (!open) setSelectedAddon(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
            <DialogDescription>
              {selectedAddon && (
                <>Berlangganan <strong>{selectedAddon.name}</strong> seharga <strong>${selectedAddon.monthlyPriceUsd}/bulan</strong>. Pilih metode pembayaran.</>
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
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setSelectedAddon(null)}
              disabled={subscribeMutation.isPending}
              data-testid="button-cancel-subscribe"
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleConfirmSubscribe}
              disabled={!selectedPaymentMethod || subscribeMutation.isPending}
              data-testid="button-confirm-subscribe"
            >
              {subscribeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Lanjutkan Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <HospitalitySettingsDialog
        open={hospitalitySettingsOpen}
        onClose={() => setHospitalitySettingsOpen(false)}
      />
    </div>
  );
}
