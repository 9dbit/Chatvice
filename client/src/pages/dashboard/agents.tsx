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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, Edit, Trash2, Sparkles, Crown, ArrowUpRight, Camera, Loader2, MessageSquare, AlertTriangle, Clock, Thermometer, UserCircle, Zap, FileText, MessageCircle, Send, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PlanLimitPopup } from "@/components/plan-limit-popup";
import type { Agent, Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

const TONE_PRESETS_BASE = {
  formal: {
    icon: UserCircle,
    prompt: "Use formal and polite language. Address customers as 'Sir/Ma'am'. Avoid slang or casual expressions."
  },
  casual: {
    icon: MessageSquare,
    prompt: "Use casual and friendly language like a friend. Feel free to use words like 'you', 'okay', 'let's go'."
  },
  poetic: {
    icon: Sparkles,
    prompt: "Respond with beautiful and expressive language. Use interesting metaphors and analogies."
  }
};

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  agentType: z.enum(["support", "sales"]).optional(),
  systemPrompt: z.string().optional(),
  toneStyle: z.string().optional(),
  autoEscalateAngry: z.boolean().optional(),
  welcomeMessageEnabled: z.boolean().optional(),
  welcomeMessageText: z.string().optional(),
  goodbyeMessageEnabled: z.boolean().optional(),
  goodbyeMessageText: z.string().optional(),
  closingStatementMode: z.string().optional(),
  closingStatementAutoIncludeBusinessName: z.boolean().optional(),
  closingStatementAutoIncludeCustomerName: z.boolean().optional(),
  inactivityTimeoutSeconds: z.number().optional(),
  temperature: z.string().optional(),
  followUpEnabled: z.boolean().optional(),
  followUpMessage: z.string().optional(),
  followUpSuggestions: z.array(z.string()).optional(),
  followUpIntervalMinutes: z.number().optional(),
});

const AGENT_TYPES = {
  support: {
    label: "Support Agent",
    description: "Customer service and help desk",
    icon: MessageSquare,
  },
  sales: {
    label: "Sales Agent",
    description: "Product sales and lead generation",
    icon: Zap,
  },
};

type AgentFormData = z.infer<typeof agentSchema>;

export default function AgentsPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();

  const TONE_PRESETS = {
    formal: { ...TONE_PRESETS_BASE.formal, label: t("dashboard.agents.toneFormal"), description: t("dashboard.agents.toneFormalDesc") },
    casual: { ...TONE_PRESETS_BASE.casual, label: t("dashboard.agents.toneCasual"), description: t("dashboard.agents.toneCasualDesc") },
    poetic: { ...TONE_PRESETS_BASE.poetic, label: t("dashboard.agents.tonePoetic"), description: t("dashboard.agents.tonePoeticDesc") },
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  // Use custom limits for custom plan, otherwise use base plan limits
  const agentLimit = merchant?.subscriptionPlanId === 'custom' && (merchant as any).customAgentsLimit !== undefined 
    ? (merchant as any).customAgentsLimit 
    : plan.agentsLimit;
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
      welcomeMessageText: "Hello! How can I help you?",
      goodbyeMessageEnabled: false,
      goodbyeMessageText: "Thank you for contacting us!",
      closingStatementMode: "manual",
      closingStatementAutoIncludeBusinessName: true,
      closingStatementAutoIncludeCustomerName: true,
      inactivityTimeoutSeconds: 120,
      temperature: "0.7",
      followUpEnabled: false,
      followUpMessage: t("dashboard.agents.followUpDefault"),
      followUpSuggestions: [],
      followUpIntervalMinutes: 5,
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
        title: t("dashboard.agents.agentCreated"),
        description: "Your new AI agent has been created successfully.",
      });
    },
    onError: (error: any) => {
      // Check if it's an agent limit error - show upselling popup instead of toast
      const errorMessage = error.message || "";
      if (errorMessage.includes("Agent limit reached") || errorMessage.includes("limit reached") || errorMessage.includes("403")) {
        setIsDialogOpen(false);
        setShowLimitPopup(true);
        return;
      }
      
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
        title: t("dashboard.agents.agentUpdated"),
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
        title: t("dashboard.agents.agentDeleted"),
        description: "The agent has been removed.",
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
    form.setValue("agentType", (agent as any).agentType || "support");
    form.setValue("autoEscalateAngry", agent.autoEscalateAngry || false);
    form.setValue("welcomeMessageEnabled", agent.welcomeMessageEnabled || false);
    form.setValue("welcomeMessageText", agent.welcomeMessageText || "Hello! How can I help you?");
    form.setValue("goodbyeMessageEnabled", agent.goodbyeMessageEnabled || false);
    form.setValue("goodbyeMessageText", agent.goodbyeMessageText || "Thank you for contacting us!");
    form.setValue("closingStatementMode", agent.closingStatementMode || "manual");
    form.setValue("closingStatementAutoIncludeBusinessName", agent.closingStatementAutoIncludeBusinessName ?? true);
    form.setValue("closingStatementAutoIncludeCustomerName", agent.closingStatementAutoIncludeCustomerName ?? true);
    form.setValue("inactivityTimeoutSeconds", agent.inactivityTimeoutSeconds || 120);
    form.setValue("temperature", agent.temperature || "0.7");
    form.setValue("followUpEnabled", agent.followUpEnabled || false);
    form.setValue("followUpMessage", agent.followUpMessage || t("dashboard.agents.followUpDefault"));
    form.setValue("followUpSuggestions", (agent.followUpSuggestions as string[]) || []);
    form.setValue("followUpIntervalMinutes", agent.followUpIntervalMinutes || 5);
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
    <div className="space-y-4 sm:space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("dashboard.agents.title")}</h1>
          <p className="text-sm text-muted-foreground">
            Manage your AI agents with different knowledge bases.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">
            {currentCount} / {agentLimit === -1 ? "∞" : agentLimit}
          </Badge>
          <Button 
            size="sm" 
            className="sm:size-default" 
            data-testid="button-new-agent"
            onClick={() => {
              if (!canAddMore) {
                setShowLimitPopup(true);
              } else {
                setEditingAgent(null);
                form.reset();
                setPhotoUrl("");
                setIsDialogOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("dashboard.agents.newAgent")}</span>
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseDialog();
        } else {
          setIsDialogOpen(true);
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0 pr-8">
                <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
                <DialogDescription>
                  {editingAgent ? "Update your agent settings." : "Create a new AI agent for your chatbot."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="flex-1 pr-4 overflow-y-auto">
                  <div className="space-y-4 pb-4">
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
                        className="absolute -bottom-1 -right-1 p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 touch-manipulation"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        data-testid="button-upload-agent-photo"
                      >
                        <Camera className="w-4 h-4" />
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
                        <FormLabel>{t("dashboard.agents.agentName")}</FormLabel>
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
                        <FormLabel>{t("dashboard.agents.descriptionOptional")}</FormLabel>
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
                  
                  {/* Agent Type Selector */}
                  <div className="space-y-2">
                    <FormLabel className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Agent Type
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(AGENT_TYPES).map(([key, typeInfo]) => {
                        const Icon = typeInfo.icon;
                        const isSelected = form.watch("agentType") === key || (!form.watch("agentType") && key === "support");
                        return (
                          <Button
                            key={key}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className="flex flex-col items-center justify-center h-auto py-3 px-2 gap-1"
                            onClick={() => form.setValue("agentType", key as "support" | "sales")}
                            data-testid={`button-agent-type-${key}`}
                          >
                            <Icon className="w-5 h-5 mb-1" />
                            <span className="text-sm font-medium">{typeInfo.label}</span>
                            <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {typeInfo.description}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sales agents are optimized for lead generation and product recommendations.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Tone Style
                    </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {Object.entries(TONE_PRESETS).map(([key, preset]) => {
                        const Icon = preset.icon;
                        const isSelected = form.watch("toneStyle") === key;
                        return (
                          <Button
                            key={key}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className="flex flex-row sm:flex-col items-center justify-start sm:justify-center h-auto py-2 sm:py-3 px-3 sm:px-2 gap-2 sm:gap-0"
                            onClick={() => form.setValue("toneStyle", key)}
                            data-testid={`button-tone-${key}`}
                          >
                            <Icon className="w-5 h-5 sm:mb-1 flex-shrink-0" />
                            <div className="flex flex-col items-start sm:items-center">
                              <span className="text-sm font-medium">{preset.label}</span>
                              <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{preset.description}</span>
                            </div>
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
                            Auto-Escalate Angry Customers
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Automatically transfer to supervisor when customer seems upset
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
                            Welcome Message
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Send an automatic greeting when customer starts chat
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
                              placeholder="Hello! How can I help you?"
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
                            Goodbye Message (2 min inactive)
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Send thank you message if customer is inactive for 2 min
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
                    <>
                      {/* Closing Statement Mode */}
                      <FormField
                        control={form.control}
                        name="closingStatementMode"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-xs">{t("dashboard.agents.closingMode")}</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={field.value === "manual" ? "default" : "outline"}
                                  onClick={() => field.onChange("manual")}
                                  data-testid="button-closing-manual"
                                >
                                  Manual
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={field.value === "automatic" ? "default" : "outline"}
                                  onClick={() => field.onChange("automatic")}
                                  data-testid="button-closing-automatic"
                                >
                                  Automatic (AI)
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              {field.value === "manual" 
                                ? "Use your custom message below" 
                                : "AI generates contextual closing based on conversation"}
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      {/* Manual mode - custom text */}
                      {form.watch("closingStatementMode") === "manual" && (
                        <FormField
                          control={form.control}
                          name="goodbyeMessageText"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Thank you for contacting us!"
                                  data-testid="input-goodbye-message"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Automatic mode - AI options */}
                      {form.watch("closingStatementMode") === "automatic" && (
                        <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                          <p className="text-xs text-muted-foreground">
                            AI will generate a personalized closing that matches the agent's tone style
                          </p>
                          
                          <FormField
                            control={form.control}
                            name="closingStatementAutoIncludeBusinessName"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <FormLabel className="text-xs">{t("dashboard.agents.includeBusinessName")}</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-closing-business-name"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="closingStatementAutoIncludeCustomerName"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <FormLabel className="text-xs">{t("dashboard.agents.addressCustomer")}</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-closing-customer-name"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <Separator />

                  {/* Follow Up Message Settings */}
                  <FormField
                    control={form.control}
                    name="followUpEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-purple-500" />
                            Follow Up Message
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Send follow up message after customer is inactive
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-follow-up"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("followUpEnabled") && (
                    <div className="space-y-3 border rounded-lg p-3">
                      {/* Follow Up Message Text */}
                      <FormField
                        control={form.control}
                        name="followUpMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("dashboard.agents.followUpMessage")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("dashboard.agents.followUpDefault")}
                                className="min-h-[60px]"
                                data-testid="input-follow-up-message"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Follow Up Interval */}
                      <FormField
                        control={form.control}
                        name="followUpIntervalMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("dashboard.agents.intervalAfterInactive")}</FormLabel>
                            <Select
                              value={String(field.value)}
                              onValueChange={(val) => field.onChange(Number(val))}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-follow-up-interval">
                                  <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="5">{t("dashboard.agents.mins5")}</SelectItem>
                                <SelectItem value="15">{t("dashboard.agents.mins15")}</SelectItem>
                                <SelectItem value="30">{t("dashboard.agents.mins30")}</SelectItem>
                                <SelectItem value="60">{t("dashboard.agents.hour1")}</SelectItem>
                                <SelectItem value="120">{t("dashboard.agents.hours2")}</SelectItem>
                                <SelectItem value="360">6 hours</SelectItem>
                                <SelectItem value="720">{t("dashboard.agents.hours12")}</SelectItem>
                                <SelectItem value="1440">24 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {/* Follow Up Suggestions - max 3 buttons */}
                      <FormField
                        control={form.control}
                        name="followUpSuggestions"
                        render={({ field }) => {
                          const suggestions = field.value || [];
                          const canAddMore = suggestions.length < 3;
                          
                          const addSuggestion = () => {
                            if (canAddMore) {
                              field.onChange([...suggestions, ""]);
                            }
                          };
                          
                          const updateSuggestion = (index: number, value: string) => {
                            const newSuggestions = [...suggestions];
                            newSuggestions[index] = value;
                            field.onChange(newSuggestions);
                          };
                          
                          const removeSuggestion = (index: number) => {
                            const newSuggestions = suggestions.filter((_: string, i: number) => i !== index);
                            field.onChange(newSuggestions);
                          };
                          
                          return (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-xs">Quick Reply Suggestions (max 3)</FormLabel>
                                {canAddMore && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={addSuggestion}
                                    className="h-6 text-xs"
                                    data-testid="button-add-suggestion"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>
                              <div className="space-y-2">
                                {suggestions.map((suggestion: string, index: number) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <FormControl>
                                      <Input
                                        placeholder={`Suggestion ${index + 1}...`}
                                        value={suggestion}
                                        onChange={(e) => updateSuggestion(index, e.target.value)}
                                        className="text-xs"
                                        data-testid={`input-suggestion-${index}`}
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeSuggestion(index)}
                                      className="h-8 w-8"
                                      data-testid={`button-remove-suggestion-${index}`}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              <FormDescription className="text-xs">
                                Buttons to help customers respond quickly
                              </FormDescription>
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  )}

                  <Separator />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4" />
                          Temperature (AI Creativity)
                        </FormLabel>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">Consistent</span>
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
                          <span className="text-xs text-muted-foreground">Creative</span>
                          <Badge variant="secondary" className="ml-2 min-w-[40px] justify-center">
                            {field.value}
                          </Badge>
                        </div>
                        <FormDescription className="text-xs">
                          Low = consistent responses, High = more creative responses
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
                          Custom System Prompt (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional instructions for the AI agent..."
                            className="min-h-[80px]"
                            data-testid="input-agent-system-prompt"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Custom instructions in addition to tone style settings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  </ScrollArea>
                  <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
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

      {!canAddMore && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-sm sm:text-base">Upgrade to add more agents</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Plan limit reached ({agentLimit}). Upgrade for more.
                </p>
              </div>
            </div>
            <Link href="/dashboard/plans">
              <Button size="sm" data-testid="button-upgrade-agents">
                Upgrade
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {agents && agents.length > 0 ? (
          agents.map((agent) => {
            return (
            <Card 
              key={agent.id} 
              className="hover-elevate transition-all" 
              data-testid={`agent-card-${agent.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 p-6">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="w-14 h-14 flex-shrink-0">
                    <AvatarImage src={agent.photoUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      <Bot className="w-7 h-7 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {agent.isActive ? (
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
              <CardContent className="p-6 pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {agent.description || "No description provided."}
                </p>
                
                {/* Agent Spec Quick View */}
                <div className="flex flex-wrap gap-1.5 mb-3" data-testid={`agent-specs-${agent.id}`}>
                  {/* Agent Type */}
                  <Badge 
                    variant={(agent as any).agentType === 'sales' ? "default" : "secondary"} 
                    className={`text-[10px] gap-1 ${(agent as any).agentType === 'sales' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                  >
                    {(agent as any).agentType === 'sales' ? <Zap className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                    {(agent as any).agentType === 'sales' ? 'Sales' : 'Support'}
                  </Badge>
                  
                  {/* Tone Style */}
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {agent.toneStyle === 'casual' ? <MessageSquare className="w-2.5 h-2.5" /> : 
                     agent.toneStyle === 'poetic' ? <Sparkles className="w-2.5 h-2.5" /> : 
                     <UserCircle className="w-2.5 h-2.5" />}
                    {(agent.toneStyle || 'formal').charAt(0).toUpperCase() + (agent.toneStyle || 'formal').slice(1)}
                  </Badge>
                  
                  {/* Temperature */}
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Thermometer className="w-2.5 h-2.5" />
                    {agent.temperature || '0.7'}
                  </Badge>
                  
                  {/* Welcome Message */}
                  {agent.welcomeMessageEnabled && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                      <MessageCircle className="w-2.5 h-2.5" />
                      Welcome
                    </Badge>
                  )}
                  
                  {/* Goodbye Message */}
                  {agent.goodbyeMessageEnabled && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                      <Clock className="w-2.5 h-2.5" />
                      Goodbye
                    </Badge>
                  )}
                  
                  {/* Follow Up Message */}
                  {agent.followUpEnabled && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                      <Send className="w-2.5 h-2.5" />
                      Follow Up
                    </Badge>
                  )}
                  
                  {/* Custom System Prompt */}
                  {agent.systemPrompt && agent.systemPrompt.trim().length > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                      <FileText className="w-2.5 h-2.5" />
                      SOP
                    </Badge>
                  )}
                  
                  {/* Auto-Escalate */}
                  {agent.autoEscalateAngry && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Escalate
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(agent)} className="text-xs sm:text-sm h-8" data-testid={`button-edit-agent-${agent.id}`}>
                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive text-xs sm:text-sm h-8"
                    onClick={() => deleteMutation.mutate(agent.id)}
                    data-testid={`button-delete-agent-${agent.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
          })
        ) : (
          <Card className="col-span-full bg-background/70 backdrop-blur-md border-white/20">
            <CardContent className="flex flex-col items-start justify-center py-8 sm:py-12 px-4 sm:px-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/70 flex items-center justify-center mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base">{t("dashboard.agents.noAgents")}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground text-left max-w-sm mb-4 sm:mb-6">
                Create your first AI agent to start automating customer support.
              </p>
              <Button 
                onClick={() => canAddMore ? setIsDialogOpen(true) : setShowLimitPopup(true)} 
                data-testid="button-create-first-agent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <PlanLimitPopup
        isOpen={showLimitPopup}
        onClose={() => setShowLimitPopup(false)}
        limitType="agent"
        currentPlan={plan.name}
        currentLimit={agentLimit}
        onContinueManual={() => {
          toast({
            title: "Manual Mode",
            description: t("dashboard.agents.noAgentDesc"),
          });
        }}
      />
    </div>
  );
}
