import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Clock, User, Users, Layers, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarData {
  merchant: { id: string; companyName: string | null; phone: string | null };
  appointments: Appointment[];
  divisions: Division[];
  providers: Provider[];
  services: Service[];
  month: string;
}

interface Appointment {
  id: string;
  serviceId: string | null;
  providerId: string | null;
  divisionId: string | null;
  customerName: string;
  customerPhone: string | null;
  appointmentDate: string;
  appointmentTime: string;
  endTime: string | null;
  status: string;
  notes: string | null;
  bookingCode: string | null;
}

interface Division { id: string; name: string; location: string | null; }
interface Provider { id: string; name: string; divisionId: string | null; phone: string | null; }
interface Service { id: string; name: string; durationMinutes: number; }

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

export default function StaffCalendarPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const { data, isLoading, isError } = useQuery<CalendarData>({
    queryKey: ["/api/internal/calendar", token, currentMonth],
    queryFn: () => fetch(`/api/internal/calendar/${token}?month=${currentMonth}`).then(async r => {
      if (!r.ok) throw new Error("Calendar not found");
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

  const apptsByDate: Record<string, Appointment[]> = {};
  (data?.appointments || []).forEach(a => {
    if (!apptsByDate[a.appointmentDate]) apptsByDate[a.appointmentDate] = [];
    apptsByDate[a.appointmentDate].push(a);
  });

  const getProvider = (id: string | null) => data?.providers.find(p => p.id === id);
  const getDivision = (id: string | null) => data?.divisions.find(d => d.id === id);
  const getService = (id: string | null) => data?.services.find(s => s.id === id);

  const selectedAppts = selectedDate ? (apptsByDate[selectedDate] || []) : [];

  const buildWhatsAppLink = (appt: Appointment) => {
    const provider = getProvider(appt.providerId);
    const division = getDivision(appt.divisionId);
    const service = getService(appt.serviceId);
    const phone = appt.customerPhone?.replace(/\D/g, "").replace(/^0/, "62").replace(/^62/, "62") || "";
    const text = encodeURIComponent(
      `Halo ${appt.customerName},\n\nKami ingin menginformasikan janji temu Anda:\n📋 Kode: ${appt.bookingCode || "-"}\n📅 Tanggal: ${appt.appointmentDate}\n⏰ Waktu: ${appt.appointmentTime}${appt.endTime ? ` - ${appt.endTime}` : ""}\n${service ? `🔬 Layanan: ${service.name}\n` : ""}${provider ? `👤 Staf: ${provider.name}\n` : ""}${division ? `🏢 Divisi: ${division.name}\n` : ""}${division?.location ? `📍 Lokasi: ${division.location}\n` : ""}\nTerima kasih sudah membuat janji temu bersama kami.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

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
        <p className="text-muted-foreground text-center">Link kalender ini tidak valid atau sudah tidak aktif.</p>
      </div>
    );
  }

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">{data.merchant.companyName || "Kalender Staf"}</h1>
            <p className="text-xs text-muted-foreground">Kalender Internal — Hanya Lihat</p>
          </div>
          <Badge variant="outline" className="text-xs">View Only</Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold text-xl capitalize">{monthLabel}</h2>
          <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month"><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {/* Calendar grid */}
        <div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground pb-2">
            {days.map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentMonth}-${String(dayNum).padStart(2, "0")}`;
              const dayAppts = apptsByDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().substring(0, 10);
              const hasAppts = dayAppts.length > 0;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  data-testid={`button-day-${dateStr}`}
                  className={[
                    "relative rounded-md p-1 min-h-[56px] text-sm text-left transition-colors border",
                    isSelected ? "border-primary bg-primary/5" : hasAppts ? "border-border hover:border-primary/50 hover:bg-muted/40" : "border-transparent hover:border-border hover:bg-muted/20",
                  ].join(" ")}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground font-bold" : ""}`}>
                    {dayNum}
                  </span>
                  {dayAppts.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {dayAppts.slice(0, 2).map(a => (
                        <div key={a.id} className={`text-xs px-1 rounded truncate ${STATUS_COLORS[a.status] || "bg-muted text-muted-foreground"}`}>
                          {a.appointmentTime} {a.customerName.split(" ")[0]}
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">+{dayAppts.length - 2}</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
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
            <CardContent>
              {selectedAppts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada janji temu hari ini.</p>
              ) : (
                <div className="space-y-3">
                  {selectedAppts
                    .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
                    .map(appt => {
                      const provider = getProvider(appt.providerId);
                      const division = getDivision(appt.divisionId);
                      const service = getService(appt.serviceId);
                      const waLink = appt.customerPhone ? buildWhatsAppLink(appt) : null;

                      return (
                        <button
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className="w-full text-left p-3 rounded-md border hover-elevate transition-colors"
                          data-testid={`button-appt-${appt.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{appt.customerName}</span>
                                <Badge className={`text-xs ${STATUS_COLORS[appt.status]}`} variant="outline">
                                  {STATUS_LABELS[appt.status] || appt.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {appt.appointmentTime}{appt.endTime ? ` – ${appt.endTime}` : ""}
                                </div>
                                {service && <div className="flex items-center gap-1.5"><Layers className="w-3 h-3 shrink-0" />{service.name}</div>}
                                {provider && <div className="flex items-center gap-1.5"><User className="w-3 h-3 shrink-0" />{provider.name}</div>}
                                {division && <div className="flex items-center gap-1.5"><Users className="w-3 h-3 shrink-0" />{division.name}{division.location ? ` · ${division.location}` : ""}</div>}
                                {appt.bookingCode && <div className="font-mono text-xs opacity-70">{appt.bookingCode}</div>}
                              </div>
                            </div>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="shrink-0 flex items-center gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded-md transition-colors"
                                data-testid={`button-wa-${appt.id}`}
                              >
                                <Phone className="w-3 h-3" />
                                WA
                              </a>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Appointment detail modal */}
        {selectedAppt && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedAppt(null)}>
            <Card className="w-full max-w-md" onClick={e => e.stopPropagation()} data-testid="card-appt-detail">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Detail Janji Temu</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAppt(null)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{selectedAppt.customerName}</span>
                  <Badge className={`text-xs ${STATUS_COLORS[selectedAppt.status]}`} variant="outline">
                    {STATUS_LABELS[selectedAppt.status] || selectedAppt.status}
                  </Badge>
                </div>
                {selectedAppt.bookingCode && (
                  <div className="text-sm font-mono text-muted-foreground">{selectedAppt.bookingCode}</div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>{selectedAppt.appointmentDate}</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span>{selectedAppt.appointmentTime}{selectedAppt.endTime ? ` – ${selectedAppt.endTime}` : ""}</span></div>
                  {getService(selectedAppt.serviceId) && <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-muted-foreground" /><span>{getService(selectedAppt.serviceId)?.name}</span></div>}
                  {getProvider(selectedAppt.providerId) && <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{getProvider(selectedAppt.providerId)?.name}</span></div>}
                  {getDivision(selectedAppt.divisionId) && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{getDivision(selectedAppt.divisionId)?.name}
                        {getDivision(selectedAppt.divisionId)?.location ? ` · ${getDivision(selectedAppt.divisionId)?.location}` : ""}</span>
                    </div>
                  )}
                  {selectedAppt.customerPhone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{selectedAppt.customerPhone}</span></div>}
                  {selectedAppt.notes && <div className="text-muted-foreground italic pt-1">"{selectedAppt.notes}"</div>}
                </div>
                {selectedAppt.customerPhone && (
                  <a
                    href={buildWhatsAppLink(selectedAppt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                    data-testid="button-wa-detail"
                  >
                    <Phone className="w-4 h-4" />
                    Hubungi via WhatsApp
                  </a>
                )}
                <p className="text-xs text-muted-foreground text-center">Kalender ini hanya untuk melihat jadwal. Untuk mengubah status, buka dashboard merchant.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
