import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Clock, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function PublicCalendarPage() {
  const params = useParams<{ merchantSlug: string }>();
  const merchantSlug = params.merchantSlug;
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
            <p className="text-xs text-muted-foreground">Lihat ketersediaan jadwal</p>
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
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBusy.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Tersedia untuk booking</p>
                  <p className="text-xs text-muted-foreground mt-1">Hubungi kami untuk membuat janji temu.</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Slot yang sudah terisi di hari ini:</p>
                  <div className="space-y-2">
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
                  <p className="text-xs text-muted-foreground mt-3">Slot di luar waktu yang terisi masih tersedia. Hubungi kami untuk booking.</p>
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
    </div>
  );
}
