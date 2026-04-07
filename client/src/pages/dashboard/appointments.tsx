import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Plus, Pencil, Trash2, Loader2, Users, Settings, Link as LinkIcon,
  Copy, CheckCircle, Clock, ChevronLeft, ChevronRight, X, User, Layers
} from "lucide-react";
import { Redirect } from "wouter";

interface MerchantAddon {
  id: string;
  addonType: string;
  isActive: boolean;
  calendarToken: string | null;
}

interface AppointmentDivision {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface AppointmentProvider {
  id: string;
  name: string;
  divisionId: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

interface AppointmentService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceIdr: number | null;
  divisionId: string | null;
  isActive: boolean;
}

interface Appointment {
  id: string;
  merchantId: string;
  serviceId: string | null;
  providerId: string | null;
  divisionId: string | null;
  sessionId: string | null;
  customerName: string;
  customerPhone: string | null;
  appointmentDate: string;
  appointmentTime: string;
  endTime: string | null;
  status: string;
  notes: string | null;
  bookingCode: string | null;
  createdAt: string;
}

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

function DivisionForm({ onSave, onCancel, initial }: { onSave: (data: any) => void; onCancel: () => void; initial?: Partial<AppointmentDivision> }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="div-name">Nama Divisi *</Label>
        <Input id="div-name" value={name} onChange={e => setName(e.target.value)} placeholder="cth: Dermatologi, Bedah Umum" data-testid="input-division-name" />
      </div>
      <div>
        <Label htmlFor="div-desc">Deskripsi</Label>
        <Textarea id="div-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Deskripsi singkat divisi" rows={2} data-testid="input-division-description" />
      </div>
      <div>
        <Label htmlFor="div-loc">Lokasi / Ruangan</Label>
        <Input id="div-loc" value={location} onChange={e => setLocation(e.target.value)} placeholder="cth: Lantai 2, Gedung A" data-testid="input-division-location" />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="div-active" checked={isActive} onCheckedChange={setIsActive} data-testid="switch-division-active" />
        <Label htmlFor="div-active">Aktif</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave({ name, description, location, isActive })} disabled={!name} data-testid="button-save-division">Simpan</Button>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-division">Batal</Button>
      </div>
    </div>
  );
}

function ProviderForm({ onSave, onCancel, divisions, initial }: { onSave: (data: any) => void; onCancel: () => void; divisions: AppointmentDivision[]; initial?: Partial<AppointmentProvider> }) {
  const [name, setName] = useState(initial?.name || "");
  const [divisionId, setDivisionId] = useState(initial?.divisionId || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="prov-name">Nama *</Label>
        <Input id="prov-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nama dokter / staf" data-testid="input-provider-name" />
      </div>
      <div>
        <Label htmlFor="prov-div">Divisi</Label>
        <Select value={divisionId} onValueChange={setDivisionId}>
          <SelectTrigger id="prov-div" data-testid="select-provider-division">
            <SelectValue placeholder="Pilih divisi..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tidak ada</SelectItem>
            {divisions.filter(d => d.isActive).map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="prov-email">Email</Label>
          <Input id="prov-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" data-testid="input-provider-email" />
        </div>
        <div>
          <Label htmlFor="prov-phone">Telepon</Label>
          <Input id="prov-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxx" data-testid="input-provider-phone" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="prov-active" checked={isActive} onCheckedChange={setIsActive} data-testid="switch-provider-active" />
        <Label htmlFor="prov-active">Aktif</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave({ name, divisionId: divisionId === "__none__" ? null : divisionId || null, email: email || null, phone: phone || null, isActive })} disabled={!name} data-testid="button-save-provider">Simpan</Button>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-provider">Batal</Button>
      </div>
    </div>
  );
}

function ServiceForm({ onSave, onCancel, divisions, initial }: { onSave: (data: any) => void; onCancel: () => void; divisions: AppointmentDivision[]; initial?: Partial<AppointmentService> }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(String(initial?.durationMinutes ?? 60));
  const [priceIdr, setPriceIdr] = useState(String(initial?.priceIdr || ""));
  const [divisionId, setDivisionId] = useState(initial?.divisionId || "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="svc-name">Nama Layanan *</Label>
        <Input id="svc-name" value={name} onChange={e => setName(e.target.value)} placeholder="cth: Konsultasi Umum" data-testid="input-service-name" />
      </div>
      <div>
        <Label htmlFor="svc-desc">Deskripsi</Label>
        <Textarea id="svc-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} data-testid="input-service-description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="svc-duration">Durasi (menit)</Label>
          <Input id="svc-duration" type="number" min={15} max={480} value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} data-testid="input-service-duration" />
        </div>
        <div>
          <Label htmlFor="svc-price">Harga (IDR)</Label>
          <Input id="svc-price" type="number" min={0} value={priceIdr} onChange={e => setPriceIdr(e.target.value)} placeholder="0" data-testid="input-service-price" />
        </div>
      </div>
      <div>
        <Label htmlFor="svc-div">Divisi</Label>
        <Select value={divisionId} onValueChange={setDivisionId}>
          <SelectTrigger id="svc-div" data-testid="select-service-division">
            <SelectValue placeholder="Pilih divisi..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Semua divisi</SelectItem>
            {divisions.filter(d => d.isActive).map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="svc-active" checked={isActive} onCheckedChange={setIsActive} data-testid="switch-service-active" />
        <Label htmlFor="svc-active">Aktif</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave({ name, description: description || null, durationMinutes: parseInt(durationMinutes) || 60, priceIdr: priceIdr ? parseInt(priceIdr) : null, divisionId: divisionId === "__none__" ? null : divisionId || null, isActive })} disabled={!name} data-testid="button-save-service">Simpan</Button>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-service">Batal</Button>
      </div>
    </div>
  );
}

function CalendarView({ appointments, providers, divisions, services, currentMonth, onMonthChange }: {
  appointments: Appointment[];
  providers: AppointmentProvider[];
  divisions: AppointmentDivision[];
  services: AppointmentService[];
  currentMonth: string;
  onMonthChange: (month: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [year, monthNum] = currentMonth.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();

  const apptsByDate: Record<string, Appointment[]> = {};
  appointments.forEach(a => {
    if (!apptsByDate[a.appointmentDate]) apptsByDate[a.appointmentDate] = [];
    apptsByDate[a.appointmentDate].push(a);
  });

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const selectedAppts = selectedDate ? (apptsByDate[selectedDate] || []) : [];
  const getProvider = (id: string | null) => providers.find(p => p.id === id);
  const getDivision = (id: string | null) => divisions.find(d => d.id === id);
  const getService = (id: string | null) => services.find(s => s.id === id);

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
        <h3 className="font-semibold text-lg capitalize">{monthLabel}</h3>
        <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month"><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground pb-1">
        {days.map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentMonth}-${String(dayNum).padStart(2, "0")}`;
          const dayAppts = apptsByDate[dateStr] || [];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === new Date().toISOString().substring(0, 10);

          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              data-testid={`button-calendar-day-${dateStr}`}
              className={[
                "relative rounded-md p-1 min-h-[52px] text-sm text-left transition-colors border",
                isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/40",
                isToday ? "font-bold" : "",
              ].join(" ")}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                {dayNum}
              </span>
              {dayAppts.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayAppts.slice(0, 2).map(a => (
                    <div key={a.id} className={`text-xs px-1 rounded truncate ${STATUS_COLORS[a.status] || ""}`}>
                      {a.appointmentTime} {a.customerName.split(" ")[0]}
                    </div>
                  ))}
                  {dayAppts.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1">+{dayAppts.length - 2} lagi</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <Card className="mt-4" data-testid="card-day-detail">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            {selectedAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada janji temu pada hari ini.</p>
            ) : (
              <div className="space-y-3">
                {selectedAppts.map(a => {
                  const provider = getProvider(a.providerId);
                  const division = getDivision(a.divisionId);
                  const service = getService(a.serviceId);
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`row-appointment-${a.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{a.customerName}</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status] || a.status}</Badge>
                          {a.bookingCode && <span className="text-xs text-muted-foreground">{a.bookingCode}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.appointmentTime}{a.endTime ? ` — ${a.endTime}` : ""}</div>
                          {service && <div className="flex items-center gap-1"><Layers className="w-3 h-3" /> {service.name}</div>}
                          {provider && <div className="flex items-center gap-1"><User className="w-3 h-3" /> {provider.name}</div>}
                          {division && <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {division.name}</div>}
                          {a.customerPhone && <div>Telp: {a.customerPhone}</div>}
                          {a.notes && <div className="italic">{a.notes}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [divisionDialog, setDivisionDialog] = useState<{ open: boolean; editing?: AppointmentDivision }>({ open: false });
  const [providerDialog, setProviderDialog] = useState<{ open: boolean; editing?: AppointmentProvider }>({ open: false });
  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; editing?: AppointmentService }>({ open: false });
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: addons = [] } = useQuery<MerchantAddon[]>({ queryKey: ["/api/merchant/addons"] });
  const appointmentAddon = addons.find(a => a.addonType === "appointment_scheduling" && a.isActive);

  const { data: appointments = [], isLoading: apptLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/merchant/appointments", currentMonth],
    queryFn: () => fetch(`/api/merchant/appointments?month=${currentMonth}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!appointmentAddon,
  });

  const { data: divisions = [] } = useQuery<AppointmentDivision[]>({
    queryKey: ["/api/merchant/appointment-divisions"],
    enabled: !!appointmentAddon,
  });

  const { data: providers = [] } = useQuery<AppointmentProvider[]>({
    queryKey: ["/api/merchant/appointment-providers"],
    enabled: !!appointmentAddon,
  });

  const { data: services = [] } = useQuery<AppointmentService[]>({
    queryKey: ["/api/merchant/appointment-services"],
    enabled: !!appointmentAddon,
  });

  const createDivision = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/merchant/appointment-divisions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-divisions"] }); setDivisionDialog({ open: false }); toast({ title: "Divisi ditambahkan" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const updateDivision = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/merchant/appointment-divisions/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-divisions"] }); setDivisionDialog({ open: false }); toast({ title: "Divisi diperbarui" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const deleteDivision = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/merchant/appointment-divisions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-divisions"] }); toast({ title: "Divisi dihapus" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const createProvider = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/merchant/appointment-providers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-providers"] }); setProviderDialog({ open: false }); toast({ title: "Staf ditambahkan" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const updateProvider = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/merchant/appointment-providers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-providers"] }); setProviderDialog({ open: false }); toast({ title: "Staf diperbarui" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const deleteProvider = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/merchant/appointment-providers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-providers"] }); toast({ title: "Staf dihapus" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const createService = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/merchant/appointment-services", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-services"] }); setServiceDialog({ open: false }); toast({ title: "Layanan ditambahkan" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const updateService = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/merchant/appointment-services/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-services"] }); setServiceDialog({ open: false }); toast({ title: "Layanan diperbarui" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/merchant/appointment-services/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointment-services"] }); toast({ title: "Layanan dihapus" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  const updateAppointment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/merchant/appointments/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchant/appointments", currentMonth] }); toast({ title: "Status diperbarui" }); },
    onError: () => toast({ title: "Gagal", variant: "destructive" }),
  });

  if (!appointmentAddon) {
    return <Redirect to="/dashboard/additional-services" />;
  }

  const calendarLink = appointmentAddon.calendarToken
    ? `${window.location.origin}/cal/${appointmentAddon.calendarToken}`
    : null;

  const copyCalendarLink = () => {
    if (!calendarLink) return;
    navigator.clipboard.writeText(calendarLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link disalin!" });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Penjadwalan Janji Temu
        </h1>
        <p className="text-muted-foreground mt-1">Kelola jadwal, layanan, dan divisi untuk sistem booking Anda.</p>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList data-testid="tabs-appointments">
          <TabsTrigger value="calendar" data-testid="tab-calendar">Kalender</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Pengaturan</TabsTrigger>
          <TabsTrigger value="link" data-testid="tab-link">Link Kalender</TabsTrigger>
        </TabsList>

        {/* ── CALENDAR TAB ── */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jadwal Masuk</CardTitle>
              <CardDescription>Klik tanggal untuk melihat detail janji temu.</CardDescription>
            </CardHeader>
            <CardContent>
              {apptLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <CalendarView
                  appointments={appointments}
                  providers={providers}
                  divisions={divisions}
                  services={services}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Daftar Janji Temu Bulan Ini</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada janji temu bulan ini.</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map(a => {
                    const provider = providers.find(p => p.id === a.providerId);
                    const division = divisions.find(d => d.id === a.divisionId);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`row-appt-list-${a.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{a.customerName}</span>
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</Badge>
                            {a.bookingCode && <span className="text-xs font-mono text-muted-foreground">{a.bookingCode}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {a.appointmentDate} {a.appointmentTime}
                            {provider ? ` · ${provider.name}` : ""}
                            {division ? ` · ${division.name}` : ""}
                          </div>
                        </div>
                        <Select
                          value={a.status}
                          onValueChange={status => updateAppointment.mutate({ id: a.id, data: { status } })}
                        >
                          <SelectTrigger className="w-36" data-testid={`select-appt-status-${a.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Menunggu</SelectItem>
                            <SelectItem value="confirmed">Konfirmasi</SelectItem>
                            <SelectItem value="completed">Selesai</SelectItem>
                            <SelectItem value="cancelled">Batalkan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SETTINGS TAB ── */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Divisions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Divisi</CardTitle>
                  <CardDescription>Kelompokkan staf berdasarkan departemen atau spesialisasi.</CardDescription>
                </div>
                <Dialog open={divisionDialog.open && !divisionDialog.editing} onOpenChange={open => setDivisionDialog({ open })}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-division"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Divisi</DialogTitle></DialogHeader>
                    <DivisionForm onSave={data => createDivision.mutate(data)} onCancel={() => setDivisionDialog({ open: false })} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {divisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada divisi.</p>
                ) : (
                  <div className="space-y-2">
                    {divisions.map(div => (
                      <div key={div.id} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-division-${div.id}`}>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {div.name}
                            {!div.isActive && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                          </div>
                          {div.location && <div className="text-xs text-muted-foreground">{div.location}</div>}
                        </div>
                        <div className="flex gap-1">
                          <Dialog open={divisionDialog.open && divisionDialog.editing?.id === div.id} onOpenChange={open => setDivisionDialog({ open, editing: open ? div : undefined })}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-edit-division-${div.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Edit Divisi</DialogTitle></DialogHeader>
                              <DivisionForm initial={div} onSave={data => updateDivision.mutate({ id: div.id, data })} onCancel={() => setDivisionDialog({ open: false })} />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDivision.mutate(div.id)} data-testid={`button-delete-division-${div.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Providers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Staf / Penyedia Layanan</CardTitle>
                  <CardDescription>Daftarkan dokter, terapis, atau staf yang melayani booking.</CardDescription>
                </div>
                <Dialog open={providerDialog.open && !providerDialog.editing} onOpenChange={open => setProviderDialog({ open })}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-provider"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Staf</DialogTitle></DialogHeader>
                    <ProviderForm divisions={divisions} onSave={data => createProvider.mutate(data)} onCancel={() => setProviderDialog({ open: false })} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada staf terdaftar.</p>
                ) : (
                  <div className="space-y-2">
                    {providers.map(prov => {
                      const div = divisions.find(d => d.id === prov.divisionId);
                      return (
                        <div key={prov.id} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-provider-${prov.id}`}>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {prov.name}
                              {!prov.isActive && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {div ? div.name : ""}
                              {prov.phone ? ` · ${prov.phone}` : ""}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Dialog open={providerDialog.open && providerDialog.editing?.id === prov.id} onOpenChange={open => setProviderDialog({ open, editing: open ? prov : undefined })}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-edit-provider-${prov.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Edit Staf</DialogTitle></DialogHeader>
                                <ProviderForm divisions={divisions} initial={prov} onSave={data => updateProvider.mutate({ id: prov.id, data })} onCancel={() => setProviderDialog({ open: false })} />
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteProvider.mutate(prov.id)} data-testid={`button-delete-provider-${prov.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4" /> Layanan</CardTitle>
                  <CardDescription>Definisikan layanan yang tersedia untuk dipesan pelanggan.</CardDescription>
                </div>
                <Dialog open={serviceDialog.open && !serviceDialog.editing} onOpenChange={open => setServiceDialog({ open })}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-service"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Layanan</DialogTitle></DialogHeader>
                    <ServiceForm divisions={divisions} onSave={data => createService.mutate(data)} onCancel={() => setServiceDialog({ open: false })} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada layanan terdaftar.</p>
                ) : (
                  <div className="space-y-2">
                    {services.map(svc => {
                      const div = divisions.find(d => d.id === svc.divisionId);
                      return (
                        <div key={svc.id} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-service-${svc.id}`}>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {svc.name}
                              {!svc.isActive && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {svc.durationMinutes} menit
                              {svc.priceIdr ? ` · Rp ${svc.priceIdr.toLocaleString("id-ID")}` : ""}
                              {div ? ` · ${div.name}` : ""}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Dialog open={serviceDialog.open && serviceDialog.editing?.id === svc.id} onOpenChange={open => setServiceDialog({ open, editing: open ? svc : undefined })}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-edit-service-${svc.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Edit Layanan</DialogTitle></DialogHeader>
                                <ServiceForm divisions={divisions} initial={svc} onSave={data => updateService.mutate({ id: svc.id, data })} onCancel={() => setServiceDialog({ open: false })} />
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteService.mutate(svc.id)} data-testid={`button-delete-service-${svc.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SHARED LINK TAB ── */}
        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Link Kalender Internal
              </CardTitle>
              <CardDescription>
                Bagikan link ini kepada staf Anda. Mereka dapat melihat jadwal booking tanpa perlu login. Link bersifat view-only — pengeditan hanya bisa dilakukan dari dashboard ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarLink ? (
                <>
                  <div className="flex gap-2">
                    <Input value={calendarLink} readOnly className="font-mono text-sm" data-testid="input-calendar-link" />
                    <Button variant="outline" onClick={copyCalendarLink} data-testid="button-copy-calendar-link">
                      {copiedLink ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Link ini unik dan aman. Jika perlu mengganti link (misalnya keamanan), hubungi dukungan.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(calendarLink, "_blank")}
                    data-testid="button-open-calendar"
                  >
                    Buka Kalender
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Link kalender tidak tersedia.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
