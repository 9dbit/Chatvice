import { useLanguage } from "@/hooks/use-language";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isPlanLimitError } from "@/lib/planLimitUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlanLimitPopup } from "@/components/plan-limit-popup";
import { Users, Plus, Trash2, Mail, User, Camera, Loader2, Edit, Clock, Zap, Timer, AlertCircle, Bot, Check, Crown, ArrowUpRight, Link as LinkIcon, X, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";
import type { SupervisorWithStats, Agent, Merchant, AgentSupervisor } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

type ResponseTimeRating = "excellent" | "fast" | "normal" | "slow";

function getResponseTimeRating(seconds: number): ResponseTimeRating {
  if (seconds < 3) return "excellent";
  if (seconds < 5) return "fast";
  if (seconds < 10) return "normal";
  return "slow";
}

function ResponseTimeBadge({ avgResponseTime }: { avgResponseTime: number | null | undefined }) {
  if (avgResponseTime === null || avgResponseTime === undefined || typeof avgResponseTime !== "number" || !isFinite(avgResponseTime)) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  const rating = getResponseTimeRating(avgResponseTime);
  
  const configs = {
    excellent: {
      label: "Excellent",
      icon: Zap,
      className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    },
    fast: {
      label: "Fast",
      icon: Timer,
      className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    normal: {
      label: "Normal",
      icon: Clock,
      className: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    },
    slow: {
      label: "Slow",
      icon: AlertCircle,
      className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    },
  };
  
  const config = configs[rating];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${config.className} text-xs px-2 py-0.5`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
      <span className="text-xs text-muted-foreground">{avgResponseTime.toFixed(1)}s avg</span>
    </div>
  );
}

const addSupervisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editSupervisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type AddSupervisorData = z.infer<typeof addSupervisorSchema>;
type EditSupervisorData = z.infer<typeof editSupervisorSchema>;

export default function SupervisorsPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [limitPopupReason, setLimitPopupReason] = useState<"limit" | "subscription">("limit");
  const [sortBy, setSortBy] = useState<"name" | "email" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { data: supervisors = [], isLoading } = useQuery<SupervisorWithStats[]>({
    queryKey: ["/api/supervisors", merchantId],
    enabled: !!merchantId,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    enabled: !!merchantId,
  });

  const { data: agentSupervisorMappings = [] } = useQuery<AgentSupervisor[]>({
    queryKey: ["/api/agent-supervisor-mappings"],
    enabled: !!merchantId,
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  // Use custom limits for custom plan, otherwise use base plan limits
  const supervisorLimit = merchant?.subscriptionPlanId === 'custom' && (merchant as any).customSupervisorsLimit !== undefined 
    ? (merchant as any).customSupervisorsLimit 
    : plan.supervisorsLimit;
  const currentCount = supervisors.length;
  const canAddMore = supervisorLimit === -1 || currentCount < supervisorLimit;
  const subscriptionBlocked = !!merchant && (
    (merchant.subscriptionStatus === "trial" &&
      !!merchant.trialEndsAt &&
      new Date(merchant.trialEndsAt) < new Date()) ||
    (merchant.subscriptionStatus === "active" &&
      !!merchant.currentPeriodEnd &&
      new Date(merchant.currentPeriodEnd) < new Date()) ||
    (merchant.subscriptionStatus !== "trial" && merchant.subscriptionStatus !== "active")
  );
  const canOpenAddDialog = canAddMore && !subscriptionBlocked;
  const agentsPerSupervisorLimit = plan.supervisorsPerAgentLimit;

  const form = useForm<AddSupervisorData>({
    resolver: zodResolver(addSupervisorSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const editForm = useForm<EditSupervisorData>({
    resolver: zodResolver(editSupervisorSchema),
    defaultValues: {
      name: "",
    },
  });

  const compressImage = (file: File, maxWidth: number = 200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("dashboard.supervisors.toast.fileTooLarge"),
        description: t("dashboard.supervisors.toast.pleaseUploadAnImageDesc"),
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Compress and resize to max 200x200
      const compressedUrl = await compressImage(file, 200, 0.8);
      setPhotoUrl(compressedUrl);
      setUploadingPhoto(false);
    } catch (error) {
      toast({
        title: t("dashboard.supervisors.toast.uploadFailed"),
        description: t("dashboard.supervisors.toast.failedToProcessTheDesc"),
        variant: "destructive",
      });
      setUploadingPhoto(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const addSupervisorMutation = useMutation({
    mutationFn: async (data: AddSupervisorData) => {
      return apiRequest("POST", "/api/supervisors/add", {
        merchantId,
        ...data,
        photoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      setIsDialogOpen(false);
      form.reset();
      setPhotoUrl("");
      toast({
        title: t("dashboard.supervisors.supervisorAdded"),
        description: t("dashboard.supervisors.toast.theyCanNowLogDesc"),
      });
    },
    onError: (error: Error) => {
      const errorCode = (error as Error & { code?: unknown }).code;
      if (
        errorCode === "TRIAL_EXPIRED" ||
        errorCode === "SUBSCRIPTION_EXPIRED" ||
        errorCode === "SUBSCRIPTION_INACTIVE"
      ) {
        setIsDialogOpen(false);
        setLimitPopupReason("subscription");
        setShowLimitPopup(true);
        return;
      }

      if (isPlanLimitError(error)) {
        setIsDialogOpen(false);
        setLimitPopupReason("limit");
        setShowLimitPopup(true);
        return;
      }

      const errorMessage = error.message || "Something went wrong";
      const isDuplicate = errorMessage.toLowerCase().includes("already registered") || 
                          errorMessage.toLowerCase().includes("email already");

      toast({
        title: isDuplicate ? t("dashboard.supervisors.emailExists") : t("dashboard.supervisors.addFailed"),
        description: isDuplicate 
          ? "This email address has already been registered. Please use a different email."
          : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSupervisorMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; photoUrl: string }) => {
      return apiRequest("PUT", `/api/supervisors/${data.id}`, { name: data.name, photoUrl: data.photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      setEditingId(null);
      setEditDialogOpen(false);
      setPhotoUrl("");
      editForm.reset();
      toast({
        title: t("dashboard.supervisors.supervisorUpdated"),
        description: t("dashboard.supervisors.supervisorUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.supervisors.updateFailed"),
        description: t("dashboard.supervisors.toast.somethingWentWrongPleaseDesc"),
        variant: "destructive",
      });
    },
  });

  const deleteSupervisorMutation = useMutation({
    mutationFn: async (supervisorId: string) => {
      return apiRequest("DELETE", `/api/supervisors/${supervisorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      toast({
        title: t("dashboard.supervisors.supervisorRemoved"),
        description: t("dashboard.supervisors.toast.theyWillNoLongerDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.supervisors.removeFailed"),
        description: t("dashboard.supervisors.toast.somethingWentWrongPleaseDesc"),
        variant: "destructive",
      });
    },
  });

  const assignSupervisorMutation = useMutation({
    mutationFn: async (data: { agentId: string; supervisorId: string }) => {
      return apiRequest("POST", "/api/agents/assign-supervisor", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-supervisor-mappings"] });
      setSelectedAgentId(null);
      toast({
        title: t("dashboard.supervisors.agentAssigned"),
        description: t("dashboard.supervisors.agentAssignedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("dashboard.supervisors.agentAssignFailed"),
        description: error.message || t("common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const unassignSupervisorMutation = useMutation({
    mutationFn: async (data: { agentId: string; supervisorId: string }) => {
      return apiRequest("POST", "/api/agents/unassign-supervisor", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-supervisor-mappings"] });
      toast({
        title: t("dashboard.supervisors.agentUnassigned"),
        description: t("dashboard.supervisors.agentUnassignedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.supervisors.agentUnassignFailed"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddSupervisorData) => {
    addSupervisorMutation.mutate(data);
  };

  const startEdit = (supervisor: Supervisor) => {
    setEditingId(supervisor.id);
    editForm.setValue("name", supervisor.name);
    setPhotoUrl(supervisor.photoUrl || "");
    setEditDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDialogOpen(false);
    setPhotoUrl("");
    editForm.reset();
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateSupervisorMutation.mutate({
      id: editingId,
      name: editForm.getValues("name"),
      photoUrl: photoUrl,
    });
  };

  const handleSort = (col: "name" | "email" | "status") => {
    if (sortBy === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: "name" | "email" | "status" }) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const statusOrder: Record<string, number> = { online: 0, away: 1, offline: 2 };

  const sortedSupervisors = [...supervisors].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "email") cmp = a.email.localeCompare(b.email);
    else if (sortBy === "status") {
      const ao = statusOrder[a.status || "offline"] ?? 2;
      const bo = statusOrder[b.status || "offline"] ?? 2;
      cmp = ao - bo;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const getAgentsForSupervisor = (supervisorId: string) => {
    const mappedAgentIds = agentSupervisorMappings
      .filter(m => m.supervisorId === supervisorId)
      .map(m => m.agentId);
    return agents.filter(a => mappedAgentIds.includes(a.id));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" />
            Supervisors
          </h1>
          <p className="text-muted-foreground">
            Team members who handle escalated conversations.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentCount} / {supervisorLimit === -1 ? "Unlimited" : supervisorLimit}
          </Badge>
          
          {!canOpenAddDialog ? (
            <Button 
              data-testid="button-add-supervisor"
              onClick={() => {
                setLimitPopupReason(subscriptionBlocked ? "subscription" : "limit");
                setShowLimitPopup(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Supervisor
            </Button>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-add-supervisor"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supervisor
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("dashboard.supervisors.addSupervisor")}</DialogTitle>
                <DialogDescription>
                  Create login credentials for a new team member.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={photoUrl} />
                        <AvatarFallback className="bg-muted">
                          {uploadingPhoto ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        data-testid="button-upload-photo"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.name")}</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" data-testid="input-supervisor-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.email")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@company.com"
                            data-testid="input-supervisor-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.password")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="At least 6 characters"
                            data-testid="input-supervisor-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addSupervisorMutation.isPending}
                      data-testid="button-submit-supervisor"
                    >
                      {addSupervisorMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Supervisor"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!canAddMore && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">{t("dashboard.supervisors.limitReached")}</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade your plan to add more supervisors
                </p>
              </div>
            </div>
            <Link href="/dashboard/plans">
              <Button size="sm" data-testid="button-upgrade-supervisors">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                Upgrade
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {supervisors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{t("dashboard.supervisors.noSupervisors")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {canAddMore 
                ? "Add team members who can handle escalated conversations"
                : "Upgrade your plan to add supervisors to your team"
              }
            </p>
            {canOpenAddDialog ? (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-supervisor">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Supervisor
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setLimitPopupReason(subscriptionBlocked ? "subscription" : "limit");
                  setShowLimitPopup(true);
                }}
                data-testid="button-upgrade-first-supervisor"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Supervisor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-supervisors">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10"></th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => handleSort("name")}
                        data-testid="button-sort-name"
                      >
                        Name
                        <SortIcon col="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => handleSort("email")}
                        data-testid="button-sort-email"
                      >
                        Email
                        <SortIcon col="email" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => handleSort("status")}
                        data-testid="button-sort-status"
                      >
                        Status
                        <SortIcon col="status" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                      Response Time
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                      Agents
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedSupervisors.map((supervisor) => {
                    const assignedAgents = getAgentsForSupervisor(supervisor.id);
                    const hasTelegram = !!supervisor.telegramChatId;

                    return (
                      <tr
                        key={supervisor.id}
                        className="hover:bg-muted/30 transition-colors group"
                        data-testid={`row-supervisor-${supervisor.id}`}
                      >
                        {/* Avatar */}
                        <td className="px-4 py-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={supervisor.photoUrl || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {getInitials(supervisor.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                              supervisor.status === "online" ? "bg-green-500" :
                              supervisor.status === "away" ? "bg-amber-500" :
                              "bg-gray-400"
                            }`} />
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium leading-tight">{supervisor.name}</span>
                            <div className="flex items-center gap-1.5">
                              {hasTelegram && (
                                <Badge variant="secondary" className="text-[10px] font-medium text-blue-500 h-auto py-0">
                                  Telegram
                                </Badge>
                              )}
                              <span className="md:hidden text-xs text-muted-foreground truncate max-w-[140px]">
                                {supervisor.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-sm truncate max-w-[220px]">{supervisor.email}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-medium ${
                              supervisor.status === "online" ? "text-green-600 dark:text-green-400" :
                              supervisor.status === "away" ? "text-amber-600 dark:text-amber-400" :
                              "text-muted-foreground"
                            }`}
                            data-testid={`status-supervisor-${supervisor.id}`}
                          >
                            <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                              supervisor.status === "online" ? "bg-green-500" :
                              supervisor.status === "away" ? "bg-amber-500" :
                              "bg-gray-400"
                            }`} />
                            {supervisor.status === "online" ? "Online" : supervisor.status === "away" ? "Away" : "Offline"}
                          </Badge>
                        </td>

                        {/* Response Time */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <ResponseTimeBadge avgResponseTime={supervisor.avgResponseTime} />
                        </td>

                        {/* Agents */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {assignedAgents.length === 0 ? (
                                <span className="text-xs text-muted-foreground">{t("dashboard.supervisors.noAgentsAssigned")}</span>
                              ) : (
                                assignedAgents.map((agent) => (
                                  <Badge key={agent.id} variant="outline" className="text-xs flex items-center gap-1 pr-1">
                                    <span>{agent.name}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unassignSupervisorMutation.mutate({ agentId: agent.id, supervisorId: supervisor.id });
                                      }}
                                      className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                      title="Remove agent"
                                      data-testid={`button-unassign-agent-${agent.id}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                ))
                              )}
                            </div>
                            <Select
                              value=""
                              onValueChange={(agentId) => {
                                assignSupervisorMutation.mutate({ agentId, supervisorId: supervisor.id });
                              }}
                              disabled={agentsPerSupervisorLimit !== -1 && assignedAgents.length >= agentsPerSupervisorLimit}
                            >
                              <SelectTrigger className="text-xs h-7 w-40" data-testid={`select-assign-agent-${supervisor.id}`}>
                                <SelectValue placeholder={
                                  agentsPerSupervisorLimit !== -1 && assignedAgents.length >= agentsPerSupervisorLimit
                                    ? "Limit reached"
                                    : "Assign agent..."
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {agents
                                  .filter(a => !assignedAgents.some(aa => aa.id === a.id))
                                  .map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                      {agent.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(supervisor)}
                              data-testid={`button-edit-supervisor-${supervisor.id}`}
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteSupervisorMutation.mutate(supervisor.id)}
                              disabled={deleteSupervisorMutation.isPending}
                              className="text-destructive"
                              data-testid={`button-delete-supervisor-${supervisor.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Supervisor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) cancelEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Supervisor</DialogTitle>
            <DialogDescription>
              Update the supervisor's name and profile photo.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={photoUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                      {editingId ? getInitials(supervisors.find(s => s.id === editingId)?.name || "") : ""}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    data-testid="button-upload-edit-photo"
                  >
                    {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" data-testid="input-edit-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSupervisorMutation.isPending} data-testid="button-save-edit-supervisor">
                  {updateSupervisorMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-1" />Save</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <PlanLimitPopup
        isOpen={showLimitPopup}
        onClose={() => setShowLimitPopup(false)}
        limitType="supervisor"
        currentPlan={plan.name}
        currentLimit={supervisorLimit}
        reason={limitPopupReason}
      />
    </div>
  );
}
