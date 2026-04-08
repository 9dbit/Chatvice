import { useLanguage } from "@/hooks/use-language";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Users, Plus, Trash2, Mail, User, Camera, Loader2, Edit, Clock, Zap, Timer, AlertCircle, Bot, Check, Crown, ArrowUpRight, Link as LinkIcon, X } from "lucide-react";
import { Link } from "wouter";
import type { Supervisor, Agent, Merchant, AgentSupervisor } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

type ResponseTimeRating = "excellent" | "fast" | "normal" | "slow";

function getResponseTimeRating(seconds: number): ResponseTimeRating {
  if (seconds < 3) return "excellent";
  if (seconds < 5) return "fast";
  if (seconds < 10) return "normal";
  return "slow";
}

function ResponseTimeBadge({ avgResponseTime }: { avgResponseTime: number }) {
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
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: supervisors = [], isLoading } = useQuery<Supervisor[]>({
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
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
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
        title: "Upload failed",
        description: "Failed to process the image file",
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
        title: "Supervisor added",
        description: "They can now log in to handle escalated chats.",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Something went wrong";
      const isDuplicate = errorMessage.toLowerCase().includes("already registered") || 
                          errorMessage.toLowerCase().includes("email already");
      const isLimitReached = errorMessage.toLowerCase().includes("limit reached") ||
                             errorMessage.toLowerCase().includes("upgrade your plan");
      
      toast({
        title: isDuplicate ? "Email already exists" : isLimitReached ? "Supervisor Limit Reached" : "Failed to add supervisor",
        description: isDuplicate 
          ? "This email address has already been registered. Please use a different email."
          : isLimitReached
          ? "You've reached the supervisor limit for your plan. Please upgrade to add more supervisors."
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
      setPhotoUrl("");
      editForm.reset();
      toast({
        title: "Supervisor updated",
        description: "Supervisor information has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update supervisor",
        description: "Something went wrong. Please try again.",
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
        title: "Supervisor removed",
        description: "They will no longer have access.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove supervisor",
        description: "Something went wrong. Please try again.",
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
        title: "Agent assigned",
        description: "Agent berhasil di-assign ke supervisor.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal assign agent",
        description: error.message || "Silakan coba lagi.",
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
        title: "Agent di-unassign",
        description: "Agent berhasil dihapus dari supervisor.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal unassign",
        description: "Silakan coba lagi.",
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPhotoUrl("");
    editForm.reset();
  };

  const saveEdit = (supervisor: Supervisor) => {
    updateSupervisorMutation.mutate({
      id: supervisor.id,
      name: editForm.getValues("name"),
      photoUrl: photoUrl,
    });
  };

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
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
          
          {!canAddMore ? (
            <Button 
              data-testid="button-add-supervisor"
              onClick={() => setShowLimitPopup(true)}
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
                        <FormLabel>Name</FormLabel>
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
                        <FormLabel>Email</FormLabel>
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
                        <FormLabel>Password</FormLabel>
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
            {canAddMore ? (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-supervisor">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Supervisor
              </Button>
            ) : (
              <Button onClick={() => setShowLimitPopup(true)} data-testid="button-upgrade-first-supervisor">
                <Plus className="w-4 h-4 mr-2" />
                Add Supervisor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {supervisors.map((supervisor, index) => {
            const mockResponseTime = 2 + (index * 3.5) + Math.random() * 2;
            const assignedAgents = getAgentsForSupervisor(supervisor.id);
            const isEditing = editingId === supervisor.id;
            
            return (
              <Card key={supervisor.id} className="relative" data-testid={`card-supervisor-${supervisor.id}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="relative mb-3">
                      <Avatar className="w-20 h-20">
                        {isEditing ? (
                          <>
                            <AvatarImage src={photoUrl} />
                            <AvatarFallback className="bg-primary/10">
                              {uploadingPhoto ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                              ) : (
                                getInitials(supervisor.name)
                              )}
                            </AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src={supervisor.photoUrl || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xl">
                              {getInitials(supervisor.name)}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      {isEditing && (
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <Input
                        value={editForm.watch("name")}
                        onChange={(e) => editForm.setValue("name", e.target.value)}
                        className="text-center font-semibold mb-1"
                        data-testid="input-edit-name"
                      />
                    ) : (
                      <h3 className="font-semibold text-lg">{supervisor.name}</h3>
                    )}
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{supervisor.email}</span>
                    </div>
                    
                    <ResponseTimeBadge avgResponseTime={mockResponseTime} />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Bot className="w-4 h-4" />
                        Assigned Agents
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {agentsPerSupervisorLimit === -1 
                          ? assignedAgents.length 
                          : `${assignedAgents.length} / ${agentsPerSupervisorLimit}`}
                      </Badge>
                    </div>

                    {assignedAgents.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assignedAgents.map((agent) => (
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
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No agents assigned</p>
                    )}

                    <Select
                      value=""
                      onValueChange={(agentId) => {
                        assignSupervisorMutation.mutate({
                          agentId,
                          supervisorId: supervisor.id,
                        });
                      }}
                      disabled={agentsPerSupervisorLimit !== -1 && assignedAgents.length >= agentsPerSupervisorLimit}
                    >
                      <SelectTrigger className="text-xs h-8" data-testid={`select-assign-agent-${supervisor.id}`}>
                        <SelectValue placeholder={
                          agentsPerSupervisorLimit !== -1 && assignedAgents.length >= agentsPerSupervisorLimit
                            ? `Batas ${agentsPerSupervisorLimit} agent tercapai`
                            : "Assign to agent..."
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

                  <Separator className="my-4" />

                  <div className="flex justify-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(supervisor)}
                          disabled={updateSupervisorMutation.isPending}
                        >
                          {updateSupervisorMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(supervisor)}
                          data-testid={`button-edit-supervisor-${supervisor.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSupervisorMutation.mutate(supervisor.id)}
                          disabled={deleteSupervisorMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-supervisor-${supervisor.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
      />
    </div>
  );
}
