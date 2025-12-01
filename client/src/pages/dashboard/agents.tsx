import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, Edit, Trash2, Sparkles, Crown, ArrowUpRight, Camera, Loader2, MessageSquare, AlertTriangle, Clock, Thermometer, UserCircle, Zap } from "lucide-react";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Agent, Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

const TONE_PRESETS = {
  formal: {
    label: "Formal",
    icon: UserCircle,
    description: "Bahasa sopan dan profesional",
    prompt: "Gunakan bahasa formal dan sopan. Panggil customer dengan 'Bapak/Ibu'. Hindari bahasa gaul atau slang."
  },
  casual: {
    label: "Casual",
    icon: MessageSquare,
    description: "Ramah dan santai",
    prompt: "Gunakan bahasa santai dan ramah seperti teman. Boleh pakai kata-kata seperti 'kamu', 'oke', 'yuk'."
  },
  poetic: {
    label: "Poetic",
    icon: Sparkles,
    description: "Kreatif dan ekspresif",
    prompt: "Jawab dengan gaya bahasa yang indah dan ekspresif. Gunakan metafora dan perumpamaan yang menarik."
  }
};

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  toneStyle: z.string().optional(),
  autoEscalateAngry: z.boolean().optional(),
  welcomeMessageEnabled: z.boolean().optional(),
  welcomeMessageText: z.string().optional(),
  goodbyeMessageEnabled: z.boolean().optional(),
  goodbyeMessageText: z.string().optional(),
  inactivityTimeoutSeconds: z.number().optional(),
  temperature: z.string().optional(),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function AgentsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  const agentLimit = plan.agentsLimit;
  const currentCount = agents?.length || 0;
  const canAddMore = agentLimit === -1 || currentCount < agentLimit;

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
      toneStyle: "formal",
      autoEscalateAngry: false,
      welcomeMessageEnabled: false,
      welcomeMessageText: "Halo! Ada yang bisa saya bantu?",
      goodbyeMessageEnabled: false,
      goodbyeMessageText: "Terima kasih sudah menghubungi kami!",
      inactivityTimeoutSeconds: 120,
      temperature: "0.7",
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
      setUploadingPhoto(false);
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read the image file",
        variant: "destructive",
      });
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      return apiRequest("POST", "/api/agents", { ...data, photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      setIsDialogOpen(false);
      form.reset();
      setPhotoUrl("");
      toast({
        title: "Agent created",
        description: "Your new AI agent has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create agent",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Agent> }) => {
      return apiRequest("PUT", `/api/agents/${id}`, { ...data, photoUrl: photoUrl || data.photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      setEditingAgent(null);
      setIsDialogOpen(false);
      setPhotoUrl("");
      toast({
        title: "Agent updated",
        description: "Your agent has been updated successfully.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent deleted",
        description: "The agent has been removed.",
      });
    },
  });

  const [selectingAgentId, setSelectingAgentId] = useState<string | null>(null);
  
  const selectAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      setSelectingAgentId(agentId);
      return apiRequest("POST", "/api/merchant/select-agent", { agentId });
    },
    onSuccess: (_, agentId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      setSelectingAgentId(null);
      toast({
        title: "Agent selected",
        description: "This agent is now active. Knowledge Base and Widget Settings will use this agent's configuration.",
      });
    },
    onError: () => {
      setSelectingAgentId(null);
      toast({
        title: "Failed to select agent",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AgentFormData) => {
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    form.setValue("name", agent.name);
    form.setValue("description", agent.description || "");
    form.setValue("systemPrompt", agent.systemPrompt || "");
    form.setValue("toneStyle", agent.toneStyle || "formal");
    form.setValue("autoEscalateAngry", agent.autoEscalateAngry || false);
    form.setValue("welcomeMessageEnabled", agent.welcomeMessageEnabled || false);
    form.setValue("welcomeMessageText", agent.welcomeMessageText || "Halo! Ada yang bisa saya bantu?");
    form.setValue("goodbyeMessageEnabled", agent.goodbyeMessageEnabled || false);
    form.setValue("goodbyeMessageText", agent.goodbyeMessageText || "Terima kasih sudah menghubungi kami!");
    form.setValue("inactivityTimeoutSeconds", agent.inactivityTimeoutSeconds || 120);
    form.setValue("temperature", agent.temperature || "0.7");
    setPhotoUrl(agent.photoUrl || "");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAgent(null);
    setPhotoUrl("");
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI agents. Each agent can be trained with different knowledge bases.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            {currentCount} / {agentLimit === -1 ? "Unlimited" : agentLimit} Agents
          </Badge>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canAddMore} data-testid="button-new-agent">
                <Plus className="w-4 h-4 mr-2" />
                New AI Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
                <DialogDescription>
                  {editingAgent ? "Update your agent settings." : "Create a new AI agent for your chatbot."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-4">
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={photoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                          {uploadingPhoto ? (
                            <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
                          ) : (
                            <Bot className="w-8 h-8 text-primary-foreground" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        data-testid="button-upload-agent-photo"
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
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Support Agent" data-testid="input-agent-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what this agent specializes in..."
                            data-testid="input-agent-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                  
                  <div className="space-y-2">
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Gaya Bahasa
                    </FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(TONE_PRESETS).map(([key, preset]) => {
                        const Icon = preset.icon;
                        const isSelected = form.watch("toneStyle") === key;
                        return (
                          <Button
                            key={key}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className="flex flex-col h-auto py-3 px-2"
                            onClick={() => form.setValue("toneStyle", key)}
                            data-testid={`button-tone-${key}`}
                          >
                            <Icon className="w-5 h-5 mb-1" />
                            <span className="text-sm font-medium">{preset.label}</span>
                            <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="autoEscalateAngry"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            Auto-Escalate Customer Marah
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Otomatis alihkan ke supervisor jika customer terdeteksi marah
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-auto-escalate-angry"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="welcomeMessageEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-green-500" />
                            Pesan Sambutan
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Kirim pesan "Halo" otomatis saat customer memulai chat
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-welcome-message"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("welcomeMessageEnabled") && (
                    <FormField
                      control={form.control}
                      name="welcomeMessageText"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Halo! Ada yang bisa saya bantu?"
                              data-testid="input-welcome-message"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="goodbyeMessageEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Pesan Penutup (2 menit tidak aktif)
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Kirim "terima kasih" jika customer tidak merespond 2 menit
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-goodbye-message"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("goodbyeMessageEnabled") && (
                    <FormField
                      control={form.control}
                      name="goodbyeMessageText"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Terima kasih sudah menghubungi kami!"
                              data-testid="input-goodbye-message"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <Separator />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4" />
                          Temperature (Kreativitas AI)
                        </FormLabel>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">Konsisten</span>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={10}
                              value={[parseFloat(field.value || "0.7") * 100]}
                              onValueChange={(value) => field.onChange((value[0] / 100).toFixed(1))}
                              className="flex-1"
                              data-testid="slider-temperature"
                            />
                          </FormControl>
                          <span className="text-xs text-muted-foreground">Kreatif</span>
                          <Badge variant="secondary" className="ml-2 min-w-[40px] justify-center">
                            {field.value}
                          </Badge>
                        </div>
                        <FormDescription className="text-xs">
                          Nilai rendah = jawaban konsisten, nilai tinggi = jawaban lebih kreatif
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Custom System Prompt (Opsional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Instruksi tambahan untuk AI agent..."
                            className="min-h-[80px]"
                            data-testid="input-agent-system-prompt"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Instruksi khusus selain gaya bahasa yang sudah dipilih
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingAgent ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!canAddMore && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Upgrade to add more agents</h3>
                <p className="text-sm text-muted-foreground">
                  You've reached your plan limit of {agentLimit} agent{agentLimit !== 1 ? "s" : ""}. Upgrade to Pro or Enterprise for more.
                </p>
              </div>
            </div>
            <Link href="/dashboard/plans">
              <Button data-testid="button-upgrade-agents">
                Upgrade Plan
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents && agents.length > 0 ? (
          agents.map((agent) => {
            const isActiveAgent = merchant?.activeAgentId === agent.id;
            return (
            <Card 
              key={agent.id} 
              className={`hover-elevate transition-all ${isActiveAgent ? "border-primary bg-primary/10 ring-2 ring-primary/30" : ""}`} 
              data-testid={`agent-card-${agent.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={agent.photoUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {isActiveAgent ? (
                        <Badge className="text-xs bg-primary">Selected</Badge>
                      ) : agent.isActive ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={agent.isActive ?? false}
                  onCheckedChange={(checked) => updateMutation.mutate({ id: agent.id, data: { isActive: checked } })}
                  data-testid={`switch-agent-${agent.id}`}
                />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {agent.description || "No description provided."}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {!isActiveAgent && (
                    <Button
                      size="sm"
                      onClick={() => selectAgentMutation.mutate(agent.id)}
                      disabled={selectingAgentId !== null}
                      data-testid={`button-select-agent-${agent.id}`}
                    >
                      {selectingAgentId === agent.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      Select Agent
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleEdit(agent)} data-testid={`button-edit-agent-${agent.id}`}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(agent.id)}
                    data-testid={`button-delete-agent-${agent.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No agents yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create your first AI agent to start automating customer support.
              </p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-agent">
                <Plus className="w-4 h-4 mr-2" />
                Create First Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
