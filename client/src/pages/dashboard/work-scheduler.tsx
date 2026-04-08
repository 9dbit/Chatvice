import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, Calendar, Users, Moon, Sun, FileText, Edit2, UserCheck, Globe } from "lucide-react";
import type { WorkShift, ShiftAssignment, WorkReport, Supervisor, Agent } from "@shared/schema";

const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "WIB - Western Indonesia (Jakarta)", short: "WIB" },
  { value: "Asia/Makassar", label: "WITA - Central Indonesia (Makassar)", short: "WITA" },
  { value: "Asia/Jayapura", label: "WIT - Eastern Indonesia (Jayapura)", short: "WIT" },
  { value: "Asia/Singapore", label: "SGT - Singapore", short: "SGT" },
  { value: "Asia/Kuala_Lumpur", label: "MYT - Malaysia (Kuala Lumpur)", short: "MYT" },
  { value: "Asia/Bangkok", label: "ICT - Thailand (Bangkok)", short: "ICT" },
  { value: "Asia/Manila", label: "PHT - Philippines (Manila)", short: "PHT" },
  { value: "Asia/Tokyo", label: "JST - Japan (Tokyo)", short: "JST" },
  { value: "Asia/Seoul", label: "KST - Korea (Seoul)", short: "KST" },
  { value: "Asia/Shanghai", label: "CST - China (Shanghai)", short: "CST" },
  { value: "Asia/Kolkata", label: "IST - India (Kolkata)", short: "IST" },
  { value: "Asia/Dubai", label: "GST - UAE (Dubai)", short: "GST" },
  { value: "Australia/Sydney", label: "AEST - Australia (Sydney)", short: "AEST" },
  { value: "Europe/London", label: "GMT/BST - United Kingdom (London)", short: "GMT" },
  { value: "America/New_York", label: "EST/EDT - US Eastern (New York)", short: "EST" },
  { value: "America/Los_Angeles", label: "PST/PDT - US Pacific (Los Angeles)", short: "PST" },
  { value: "UTC", label: "UTC - Coordinated Universal Time", short: "UTC" },
];

function getTimezoneShort(tz: string): string {
  const found = TIMEZONE_OPTIONS.find(o => o.value === tz);
  return found?.short || tz;
}

function getCurrentTimeInTimezone(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--:--";
  }
}

type ShiftFormData = {
  name: string;
  dayType: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
};

export default function WorkSchedulerPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormData>({
    name: "",
    dayType: "everyday",
    startTime: "09:00",
    endTime: "17:00",
    isNightShift: false,
  });

  const [currentTime, setCurrentTime] = useState("");

  const { data: timezoneData } = useQuery<{ timezone: string }>({
    queryKey: ["/api/work-scheduler/timezone"],
  });

  const merchantTimezone = timezoneData?.timezone || "Asia/Jakarta";
  const tzShort = getTimezoneShort(merchantTimezone);

  useEffect(() => {
    setCurrentTime(getCurrentTimeInTimezone(merchantTimezone));
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeInTimezone(merchantTimezone));
    }, 1000);
    return () => clearInterval(interval);
  }, [merchantTimezone]);

  const updateTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      return apiRequest("PATCH", "/api/work-scheduler/timezone", { timezone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-scheduler/timezone"] });
      toast({ title: t("dashboard.scheduler.timezoneUpdated") });
    },
    onError: () => {
      toast({ title: t("dashboard.scheduler.timezoneUpdateFailed"), variant: "destructive" });
    },
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<WorkShift[]>({
    queryKey: ["/api/work-scheduler/shifts"],
  });

  const { data: assignments = [] } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/work-scheduler/assignments"],
  });

  const { data: reports = [] } = useQuery<WorkReport[]>({
    queryKey: ["/api/work-scheduler/reports"],
  });

  const { data: supervisors = [] } = useQuery<Supervisor[]>({
    queryKey: ["/api/supervisors"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      return apiRequest("POST", "/api/work-scheduler/shifts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-scheduler/shifts"] });
      setIsAddShiftOpen(false);
      resetShiftForm();
      toast({ title: t("dashboard.scheduler.shiftCreated") });
    },
    onError: () => {
      toast({ title: t("dashboard.scheduler.shiftCreateFailed"), variant: "destructive" });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkShift> }) => {
      return apiRequest("PATCH", `/api/work-scheduler/shifts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-scheduler/shifts"] });
      setEditingShift(null);
      resetShiftForm();
      toast({ title: t("dashboard.scheduler.shiftUpdated") });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/work-scheduler/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-scheduler/shifts"] });
      toast({ title: t("dashboard.scheduler.shiftDeleted") });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { shiftId: string; assigneeId: string; assigneeType: string }) => {
      return apiRequest("POST", "/api/work-scheduler/assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-scheduler/assignments"] });
      setIsAssignOpen(false);
      toast({ title: t("dashboard.scheduler.assignmentCreated") });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/work-scheduler/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-scheduler/assignments"] });
      toast({ title: t("dashboard.scheduler.assignmentDeleted") });
    },
  });

  function resetShiftForm() {
    setShiftForm({
      name: "",
      dayType: "everyday",
      startTime: "09:00",
      endTime: "17:00",
      isNightShift: false,
    });
  }

  function handleEditShift(shift: WorkShift) {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      dayType: shift.dayType,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isNightShift: shift.isNightShift || false,
    });
    setIsAddShiftOpen(true);
  }

  function handleSubmitShift() {
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data: shiftForm });
    } else {
      createShiftMutation.mutate(shiftForm);
    }
  }

  function getAssignmentsByShift(shiftId: string) {
    return assignments.filter(a => a.shiftId === shiftId);
  }

  function getAssigneeName(assigneeId: string, assigneeType: string) {
    if (assigneeType === "supervisor") {
      return supervisors.find(s => s.id === assigneeId)?.name || "Unknown";
    } else {
      return agents.find(a => a.id === assigneeId)?.name || "Unknown";
    }
  }

  function getDayTypeLabel(dayType: string) {
    const labels: Record<string, string> = {
      weekday: t("dashboard.workScheduler.weekdays"),
      weekend: t("dashboard.workScheduler.weekend"),
      monday: t("common.days.monday"),
      tuesday: t("common.days.tuesday"),
      wednesday: t("common.days.wednesday"),
      thursday: t("common.days.thursday"),
      friday: t("common.days.friday"),
      saturday: t("common.days.saturday"),
      sunday: t("common.days.sunday"),
      everyday: t("dashboard.workScheduler.everyDay"),
    };
    return labels[dayType] || dayType;
  }

  function calculateTotalHours(assigneeId: string) {
    const assigneeReports = reports.filter(r => r.assigneeId === assigneeId);
    const totalMinutes = assigneeReports.reduce((acc, r) => {
      return acc + (r.hoursWorked || 0) * 60 + (r.minutesWorked || 0);
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  if (shiftsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("dashboard.workScheduler.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.workScheduler.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            <Select 
              value={merchantTimezone} 
              onValueChange={(v) => updateTimezoneMutation.mutate(v)}
            >
              <SelectTrigger className="w-[280px]" data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="font-mono text-sm" data-testid="badge-current-time">
            <Clock className="w-3 h-3 mr-1.5" />
            {currentTime} {tzShort}
          </Badge>
        </div>
        <Dialog open={isAddShiftOpen} onOpenChange={(open) => {
          setIsAddShiftOpen(open);
          if (!open) {
            setEditingShift(null);
            resetShiftForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-shift">
              <Plus className="w-4 h-4 mr-2" />{t("dashboard.workScheduler.addShift")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingShift ? "Edit Shift" : "Create New Shift"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shiftName">{t("dashboard.workScheduler.shiftName")}</Label>
                <Input
                  id="shiftName"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="e.g. Morning Shift"
                  data-testid="input-shift-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayType">{t("dashboard.workScheduler.dayType")}</Label>
                <Select value={shiftForm.dayType} onValueChange={(v) => setShiftForm({ ...shiftForm, dayType: v })}>
                  <SelectTrigger id="dayType" data-testid="select-day-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyday">{t("dashboard.workScheduler.everyday")}</SelectItem>
                    <SelectItem value="weekday">{t("dashboard.workScheduler.weekdaysMon")}</SelectItem>
                    <SelectItem value="weekend">{t("dashboard.workScheduler.weekendSat")}</SelectItem>
                    <SelectItem value="monday">{t("dashboard.workScheduler.monday")}</SelectItem>
                    <SelectItem value="tuesday">{t("common.days.tuesday")}</SelectItem>
                    <SelectItem value="wednesday">{t("common.days.wednesday")}</SelectItem>
                    <SelectItem value="thursday">{t("common.days.thursday")}</SelectItem>
                    <SelectItem value="friday">{t("common.days.friday")}</SelectItem>
                    <SelectItem value="saturday">{t("common.days.saturday")}</SelectItem>
                    <SelectItem value="sunday">{t("dashboard.workScheduler.sunday")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">{t("dashboard.workScheduler.startTime")}</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">{t("dashboard.workScheduler.endTime")}</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="nightShift"
                  checked={shiftForm.isNightShift}
                  onCheckedChange={(checked) => setShiftForm({ ...shiftForm, isNightShift: checked })}
                  data-testid="switch-night-shift"
                />
                <Label htmlFor="nightShift" className="flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Night Shift
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddShiftOpen(false)}>{t("dashboard.common.cancel")}</Button>
              <Button 
                onClick={handleSubmitShift} 
                disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                data-testid="button-save-shift"
              >
                {editingShift ? "Save Changes" : "Create Shift"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts" className="flex items-center gap-2" data-testid="tab-shifts">
            <Clock className="w-4 h-4" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2" data-testid="tab-assignments">
            <Users className="w-4 h-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          {shifts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No shifts yet</h3>
                <p className="text-muted-foreground mb-4">Create your first shift to start scheduling</p>
                <Button onClick={() => setIsAddShiftOpen(true)} data-testid="button-create-first-shift">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Shift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shifts.map((shift) => (
                <Card key={shift.id} data-testid={`card-shift-${shift.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {shift.isNightShift ? (
                          <Moon className="w-5 h-5 text-indigo-500" />
                        ) : (
                          <Sun className="w-5 h-5 text-amber-500" />
                        )}
                        <CardTitle className="text-lg">{shift.name}</CardTitle>
                      </div>
                      <Badge variant={shift.isActive ? "default" : "secondary"}>
                        {shift.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{getDayTypeLabel(shift.dayType)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{shift.startTime} - {shift.endTime} <span className="text-muted-foreground">({tzShort})</span></span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getAssignmentsByShift(shift.id).length} people assigned
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEditShift(shift)}
                          data-testid={`button-edit-shift-${shift.id}`}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedShift(shift);
                            setIsAssignOpen(true);
                          }}
                          data-testid={`button-assign-shift-${shift.id}`}
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Assign
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => deleteShiftMutation.mutate(shift.id)}
                          data-testid={`button-delete-shift-${shift.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.workScheduler.assignmentList")}</CardTitle>
              <CardDescription>{t("dashboard.workScheduler.viewAssignments")}</CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3" />
                  <p>{t("dashboard.workScheduler.noAssignments")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => {
                    const shift = shifts.find(s => s.id === assignment.shiftId);
                    return (
                      <div 
                        key={assignment.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`assignment-${assignment.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            assignment.assigneeType === "supervisor" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                          }`}>
                            {assignment.assigneeType === "supervisor" ? (
                              <Users className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{getAssigneeName(assignment.assigneeId, assignment.assigneeType)}</p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.assigneeType === "supervisor" ? "Supervisor" : "AI Agent"} • {shift?.name || "Unknown shift"}
                              {shift ? ` (${shift.startTime} - ${shift.endTime} ${tzShort})` : ""}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                          data-testid={`button-delete-assignment-${assignment.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.workScheduler.workHoursReport")}</CardTitle>
              <CardDescription>{t("dashboard.workScheduler.workHoursDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Supervisor</h4>
                  {supervisors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No supervisors available</p>
                  ) : (
                    <div className="space-y-2">
                      {supervisors.map((supervisor) => (
                        <div 
                          key={supervisor.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          data-testid={`report-supervisor-${supervisor.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                              {supervisor.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{supervisor.name}</span>
                          </div>
                          <Badge variant="outline">{calculateTotalHours(supervisor.id)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-3">AI Agents</h4>
                  {agents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No AI agents available</p>
                  ) : (
                    <div className="space-y-2">
                      {agents.map((agent) => (
                        <div 
                          key={agent.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          data-testid={`report-agent-${agent.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{agent.name}</span>
                          </div>
                          <Badge variant="outline">{calculateTotalHours(agent.id)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Shift: {selectedShift?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Supervisor</h4>
              {supervisors.map((supervisor) => {
                const existingAssignment = assignments.find(
                  a => a.shiftId === selectedShift?.id && a.assigneeId === supervisor.id
                );
                const isAssigned = !!existingAssignment;
                return (
                  <div 
                    key={supervisor.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                        {supervisor.name.charAt(0)}
                      </div>
                      <span>{supervisor.name}</span>
                    </div>
                    {isAssigned ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteAssignmentMutation.isPending}
                        onClick={() => {
                          if (existingAssignment) {
                            deleteAssignmentMutation.mutate(existingAssignment.id);
                          }
                        }}
                        data-testid={`button-unassign-supervisor-${supervisor.id}`}
                      >
                        Unassign
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={assignMutation.isPending}
                        onClick={() => {
                          if (selectedShift) {
                            assignMutation.mutate({
                              shiftId: selectedShift.id,
                              assigneeId: supervisor.id,
                              assigneeType: "supervisor",
                            });
                          }
                        }}
                        data-testid={`button-assign-supervisor-${supervisor.id}`}
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">AI Agents</h4>
              {agents.map((agent) => {
                const existingAssignment = assignments.find(
                  a => a.shiftId === selectedShift?.id && a.assigneeId === agent.id
                );
                const isAssigned = !!existingAssignment;
                return (
                  <div 
                    key={agent.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm">
                        {agent.name.charAt(0)}
                      </div>
                      <span>{agent.name}</span>
                    </div>
                    {isAssigned ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteAssignmentMutation.isPending}
                        onClick={() => {
                          if (existingAssignment) {
                            deleteAssignmentMutation.mutate(existingAssignment.id);
                          }
                        }}
                        data-testid={`button-unassign-agent-${agent.id}`}
                      >
                        Unassign
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={assignMutation.isPending}
                        onClick={() => {
                          if (selectedShift) {
                            assignMutation.mutate({
                              shiftId: selectedShift.id,
                              assigneeId: agent.id,
                              assigneeType: "agent",
                            });
                          }
                        }}
                        data-testid={`button-assign-agent-${agent.id}`}
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>{t("dashboard.workScheduler.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
