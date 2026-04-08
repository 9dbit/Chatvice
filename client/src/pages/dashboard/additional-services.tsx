import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sparkles, Calendar, CheckCircle, Loader2, AlertCircle, CreditCard, Hotel, ExternalLink, TestTube2, Clock } from "lucide-react";
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


const hospitalityFormSchema = z.object({
  hotelName: z.string().min(1, "Nama hotel wajib diisi"),
  bookingUrl: z.string().url("URL pemesanan tidak valid").or(z.literal("")),
  googleSheetUrl: z.string().url("URL Google Sheet tidak valid").or(z.literal("")),
  aiInstructions: z.string().max(1000, "Maks 1000 karakter"),
  isEnabled: z.boolean(),
});

type HospitalityForm = z.infer<typeof hospitalityFormSchema>;

const glassDialogClass = "sm:max-w-[560px] w-[calc(100vw-2rem)] max-h-[88vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl";

function SmartAppointmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();

  const features = [
    "Manajemen divisi & staf per jadwal",
    "Kalender internal dengan link yang bisa dibagikan",
    "Cek ketersediaan via AI chatbot",
    "Notifikasi & konfirmasi janji temu otomatis",
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={glassDialogClass}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            Smart Appointment
          </DialogTitle>
          <DialogDescription className="mt-1">
            Sistem booking & manajemen jadwal cerdas yang terintegrasi langsung dengan AI chatbot Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <ul className="space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-1">
            <p className="text-sm font-medium text-primary">Cara kerja</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customer menanyakan ketersediaan jadwal melalui chatbot, AI mengecek secara real-time dan memandu proses booking hingga konfirmasi.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex-none flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Tutup
          </Button>
          <Button size="sm" className="flex-1" onClick={() => { onClose(); navigate("/dashboard/appointments"); }} data-testid="button-goto-appointments">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Buka Pengaturan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogContent className={glassDialogClass}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Hotel className="w-5 h-5 text-primary shrink-0" />
            Pengaturan Hospitality AI
          </DialogTitle>
          <DialogDescription className="mt-1">
            Hubungkan data kamar hotel dari Google Sheet untuk ditampilkan secara real-time di chatbot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form id="hospitality-form" onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl border">
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
                        Sheet harus bisa diakses publik. Kolom: <code>room_name</code>, <code>price_per_night</code>, <code>availability</code>, <code>image_url</code>.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {sheetTestResult && (
                  <div className={`rounded-xl p-3 text-sm ${sheetTestResult.success ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-destructive/10 border border-destructive/30"}`}>
                    <p className={`font-medium ${sheetTestResult.success ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                      {sheetTestResult.message}
                    </p>
                    {sheetTestResult.success && sheetTestResult.sampleRows.length > 1 && (() => {
                      const [headerRow, ...dataRows] = sheetTestResult.sampleRows;
                      const headers = headerRow.split(",").map(h => h.replace(/"/g, "").trim());
                      const rows = dataRows.slice(0, 3).map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
                      return (
                        <div className="mt-2 overflow-x-auto">
                          <p className="text-xs text-muted-foreground mb-1.5">Preview (3 baris pertama):</p>
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

                <div className="rounded-xl border p-3 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium">Format Kolom Google Sheet:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="border border-border px-1.5 py-1 text-left font-semibold whitespace-nowrap">Kolom</th>
                          <th className="border border-border px-1.5 py-1 text-left font-semibold whitespace-nowrap">Alias</th>
                          <th className="border border-border px-1.5 py-1 text-left font-semibold">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        {[
                          ["room_name *", "Room Type, Tipe Kamar", "Wajib. Nama/tipe kamar"],
                          ["price_per_night", "Price, Harga", "Harga per malam (angka)"],
                          ["availability", "Available, Stok", "Jumlah kamar tersedia"],
                          ["room_description", "Description, Deskripsi", "Deskripsi singkat kamar"],
                          ["image_url", "Image, Foto", "URL foto kamar (opsional)"],
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
              </form>
            </Form>
          )}
        </div>

        <div className="px-6 py-4 border-t flex-none flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={saveMutation.isPending}>
            Batal
          </Button>
          <Button type="submit" form="hospitality-form" size="sm" className="flex-1" disabled={saveMutation.isPending} data-testid="button-save-hospitality">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Simpan Pengaturan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdditionalServicesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [hospitalitySettingsOpen, setHospitalitySettingsOpen] = useState(false);
  const [appointmentSettingsOpen, setAppointmentSettingsOpen] = useState(false);
  const [pendingTrials, setPendingTrials] = useState<Set<string>>(new Set());

  const { data: addonConfigs = [], isLoading: configsLoading } = useQuery<AddonConfig[]>({
    queryKey: ["/api/addon-configs"],
  });

  const { data: merchantAddons = [], isLoading: addonsLoading } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const handleStartTrial = async (addonType: string) => {
    setPendingTrials(prev => new Set(prev).add(addonType));
    try {
      const res = await fetch("/api/merchant/addons/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addonType }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          const msg = body.error === "Trial already used for this addon"
            ? "Trial sudah pernah digunakan untuk layanan ini."
            : "Layanan ini sudah aktif di akun Anda.";
          throw new Error(msg);
        }
        throw new Error(body.error || "Tidak dapat memulai trial");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      toast({ title: "Trial dimulai!", description: "Masa percobaan gratis 7 hari Anda sekarang aktif." });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Tidak dapat memulai trial", variant: "destructive" });
    } finally {
      setPendingTrials(prev => { const next = new Set(prev); next.delete(addonType); return next; });
    }
  };

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

  const getAddon = (addonType: string) =>
    merchantAddons.find(a => a.addonType === addonType);

  const handleManageClick = (addonType: string) => {
    if (addonType === "appointment_scheduling") {
      setAppointmentSettingsOpen(true);
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
                    <button
                      type="button"
                      className="flex items-center gap-3 text-left cursor-pointer rounded-md hover-elevate -m-1 p-1 transition-all"
                      onClick={() => handleManageClick(config.addonType)}
                      data-testid={`button-open-${config.addonType}`}
                    >
                      <div className="p-2 rounded-md bg-primary/10 shrink-0">
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
                    </button>
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
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Kalender internal dengan link yang bisa dibagikan</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Cek ketersediaan via AI chatbot</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Notifikasi WhatsApp otomatis</li>
                    </ul>
                  )}

                  {config.addonType === "hospitality" && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Data kamar real-time dari Google Sheet</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Kartu kamar interaktif di chat widget</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Badge "Harga Terbaik" &amp; "Hampir Penuh"</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Tombol "Pesan Sekarang" langsung ke halaman pemesanan</li>
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
                          <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium" data-testid={`text-trial-countdown-${config.addonType}`}>
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Trial: {trialDaysLeft} hari tersisa
                          </span>
                        )}
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
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/dashboard/checkout?addon=${config.addonType}`)}
                          data-testid={`button-subscribe-${config.addonType}`}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Aktifkan — ${config.monthlyPriceUsd}/bulan
                        </Button>
                        {!usedTrial && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartTrial(config.addonType)}
                            disabled={pendingTrials.has(config.addonType)}
                            data-testid={`button-trial-${config.addonType}`}
                          >
                            {pendingTrials.has(config.addonType) ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 mr-1" />
                            )}
                            Coba Gratis 7 Hari
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {!active && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Pembayaran diproses setelah konfirmasi metode.{usedTrial ? " Trial sudah pernah digunakan." : ""}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HospitalitySettingsDialog
        open={hospitalitySettingsOpen}
        onClose={() => setHospitalitySettingsOpen(false)}
      />
      <SmartAppointmentDialog
        open={appointmentSettingsOpen}
        onClose={() => setAppointmentSettingsOpen(false)}
      />
    </div>
  );
}
