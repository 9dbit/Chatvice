import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Clock, User, Users, X, CheckCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PublicCalendarData {
  merchant: { id: string; companyName: string | null };
  month: string;
  busyBlocks: BusyBlock[];
  services: ServiceInfo[];
  providers: ProviderInfo[];
  divisions: DivisionInfo[];
}

interface BusyBlock {
  date: string;
  startTime: string;
  endTime: string | null;
  providerId: string | null;
  serviceId: string | null;
}

interface ServiceInfo {
  id: string;
  name: string;
  durationMinutes: number;
  priceIdr: number | null;
}

interface ProviderInfo {
  id: string;
  name: string;
  divisionId: string | null;
  isActive: boolean;
}

interface DivisionInfo {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

const formatPrice = (price: number | null) => {
  if (!price) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
};

function BookingDialog({
  open,
  onClose,
  date,
  merchantSlug,
  services,
  providers,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  merchantSlug: string;
  services: ServiceInfo[];
  providers: ProviderInfo[];
}) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [serviceId, setServiceId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingCode, setBookingCode] = useState("");

  const activeProviders = providers.filter(p => p.isActive);

  const { data: slotsData, isLoading: slotsLoading } = useQuery<{ slots: string[] }>({
    queryKey: ["/api/public/calendar", merchantSlug, "slots", date, serviceId, providerId],
    queryFn: () => {
      const params = new URLSearchParams({ date });
      if (serviceId) params.set("serviceId", serviceId);
      if (providerId) params.set("providerId", providerId);
      return fetch(`/api/public/calendar/${merchantSlug}/slots?${params}`).then(r => r.json());
    },
    enabled: !!providerId,
  });

  const slots = slotsData?.slots || [];

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/calendar/${merchantSlug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: serviceId || undefined,
          providerId: providerId || undefined,
          date,
          time: selectedTime,
          customerName,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal melakukan booking");
      return json;
    },
    onSuccess: (data) => {
      setBookingCode(data.bookingCode || "");
      setStep("success");
    },
  });

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  function handleClose() {
    setStep("form");
    setServiceId("");
    setProviderId("");
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setBookingCode("");
    onClose();
  }

  const canSubmit = !!selectedTime && !!customerName.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-primary" />
            {step === "success" ? "Booking Berhasil!" : "Buat Janji Temu"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        </DialogHeader>

        {step === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <div>
              <p className="font-semibold text-lg">Booking Terkonfirmasi</p>
              <p className="text-sm text-muted-foreground mt-1">
                Janji temu Anda telah berhasil dibuat untuk {dateLabel} pukul {selectedTime}.
              </p>
            </div>
            {bookingCode && (
              <div className="rounded-lg border bg-muted/40 px-6 py-4 w-full">
                <p className="text-xs text-muted-foreground mb-1">Kode Booking</p>
                <p className="font-mono font-bold text-2xl tracking-widest text-primary">{bookingCode}</p>
                <p className="text-xs text-muted-foreground mt-1">Simpan kode ini untuk keperluan konfirmasi</p>
              </div>
            )}
            <Button onClick={handleClose} className="w-full" data-testid="button-booking-done">
              Selesai
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pilih Layanan</Label>
                <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setSelectedTime(""); }} data-testid="select-service">
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="— Pilih layanan (opsional) —" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id} data-testid={`option-service-${s.id}`}>
                        <span>{s.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">· {s.durationMinutes} mnt · {formatPrice(s.priceIdr)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeProviders.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pilih Staff / Dokter</Label>
                <Select value={providerId} onValueChange={(v) => { setProviderId(v); setSelectedTime(""); }} data-testid="select-provider">
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="— Pilih staff —" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProviders.map(p => (
                      <SelectItem key={p.id} value={p.id} data-testid={`option-provider-${p.id}`}>
                        <User className="w-3 h-3 mr-1 inline" />{p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {providerId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pilih Jam</Label>
                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memuat slot waktu...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Tidak ada slot tersedia untuk tanggal ini dengan staff yang dipilih.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" data-testid="time-slots">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(selectedTime === slot ? "" : slot)}
                        data-testid={`button-slot-${slot}`}
                        className={[
                          "text-xs px-3 py-1.5 rounded-md border font-mono transition-colors",
                          selectedTime === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary hover:bg-primary/5",
                        ].join(" ")}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!providerId && activeProviders.length === 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pilih Jam</Label>
                <Input
                  placeholder="Contoh: 10:00"
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                  data-testid="input-time-manual"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Masukkan nama Anda"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                data-testid="input-customer-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1"><Phone className="w-3 h-3" />Nomor HP</Label>
              <Input
                placeholder="Contoh: 08123456789"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                data-testid="input-customer-phone"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Catatan (opsional)</Label>
              <Textarea
                placeholder="Keluhan atau catatan khusus..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="text-sm min-h-[64px]"
                data-testid="input-notes"
              />
            </div>

            {bookMutation.isError && (
              <p className="text-xs text-destructive">{(bookMutation.error as Error)?.message || "Terjadi kesalahan. Coba lagi."}</p>
            )}

            <Button
              className="w-full"
              disabled={!canSubmit || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
              data-testid="button-submit-booking"
            >
              {bookMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
              ) : (
                "Konfirmasi Booking"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PublicCalendarPage() {
  const params = useParams<{ merchantSlug: string }>();
  const merchantSlug = params.merchantSlug;
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<PublicCalendarData>({
    queryKey: ["/api/public/calendar", merchantSlug, currentMonth],
    queryFn: () => fetch(`/api/public/calendar/${merchantSlug}?month=${currentMonth}`).then(async r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
  });

  const [year, monthNum] = currentMonth.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();
  const monthLabel = firstDay.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(null);
  };

  const busyByDate: Record<string, BusyBlock[]> = {};
  (data?.busyBlocks || []).forEach(b => {
    if (!busyByDate[b.date]) busyByDate[b.date] = [];
    busyByDate[b.date].push(b);
  });

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <Calendar className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Kalender Tidak Ditemukan</h1>
        <p className="text-muted-foreground text-center">Layanan penjadwalan tidak tersedia untuk merchant ini.</p>
      </div>
    );
  }

  const selectedBusy = selectedDate ? (busyByDate[selectedDate] || []) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">{data.merchant.companyName || "Kalender Booking"}</h1>
            <p className="text-xs text-muted-foreground">Klik tanggal untuk membuat janji temu</p>
          </div>
          <Badge variant="outline" className="text-xs">Publik</Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold text-xl capitalize">{monthLabel}</h2>
          <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month"><ChevronRight className="w-4 h-4" /></Button>
        </div>

        <div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground pb-2">
            {days.map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentMonth}-${String(dayNum).padStart(2, "0")}`;
              const dayBusy = busyByDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().substring(0, 10);
              const hasBookings = dayBusy.length > 0;
              const isPast = dateStr < new Date().toISOString().substring(0, 10);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  disabled={isPast}
                  data-testid={`button-day-${dateStr}`}
                  className={[
                    "relative rounded-md p-1 min-h-[52px] text-sm text-left transition-colors border",
                    isPast ? "opacity-40 cursor-not-allowed border-transparent" :
                    isSelected ? "border-primary bg-primary/5" :
                    hasBookings ? "border-amber-200 dark:border-amber-800 hover:border-primary/50 hover:bg-muted/40" :
                    "border-transparent hover:border-border hover:bg-muted/20",
                  ].join(" ")}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground font-bold" : ""}`}>
                    {dayNum}
                  </span>
                  {hasBookings && !isPast && (
                    <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                      {dayBusy.length} sibuk
                    </div>
                  )}
                  {!hasBookings && !isPast && (
                    <div className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                      Tersedia
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-amber-200 dark:border-amber-800" />
            <span>Ada yang sibuk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-border" />
            <span>Tersedia</span>
          </div>
        </div>

        {/* Selected date detail */}
        {selectedDate && (
          <Card data-testid="card-selected-day">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => setBookingDate(selectedDate)}
                  data-testid="button-open-booking"
                >
                  Buat Janji
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedBusy.length === 0 ? (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Tersedia untuk booking</p>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Slot yang sudah terisi:</p>
                  <div className="space-y-1.5">
                    {selectedBusy
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((block, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/40">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs">{block.startTime}{block.endTime ? ` – ${block.endTime}` : ""}</span>
                          {block.providerId && data.providers.find(p => p.id === block.providerId) && (
                            <>
                              <User className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />
                              <span className="text-xs text-muted-foreground">{data.providers.find(p => p.id === block.providerId)?.name}</span>
                            </>
                          )}
                          <Badge variant="outline" className="ml-auto text-xs text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">Sibuk</Badge>
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Slot di luar waktu tersebut masih tersedia.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {data.services.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Layanan Tersedia</h3>
            <div className="space-y-2">
              {data.services.map(service => (
                <div key={service.id} className="flex items-center justify-between p-3 rounded-md border text-sm" data-testid={`service-${service.id}`}>
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />{service.durationMinutes} menit
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-primary">{formatPrice(service.priceIdr)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Providers by Division */}
        {data.divisions.filter(d => d.isActive).map(div => {
          const divProviders = data.providers.filter(p => p.divisionId === div.id && p.isActive);
          if (!divProviders.length) return null;
          return (
            <div key={div.id}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                {div.name}
                {div.location && <span className="text-xs text-muted-foreground font-normal">· {div.location}</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {divProviders.map(p => (
                  <Badge key={p.id} variant="outline" className="text-sm">
                    <User className="w-3 h-3 mr-1" />{p.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Dialog */}
      {bookingDate && (
        <BookingDialog
          open={!!bookingDate}
          onClose={() => setBookingDate(null)}
          date={bookingDate}
          merchantSlug={merchantSlug}
          services={data.services}
          providers={data.providers}
        />
      )}
    </div>
  );
}
