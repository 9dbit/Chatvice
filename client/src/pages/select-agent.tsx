import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Redirect } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, ArrowRight, CheckCircle2, Camera, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Agent, Merchant } from "@shared/schema";

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function SelectAgentPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: merchant, isLoading: merchantLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
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
    onSuccess: (newAgent: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      setIsDialogOpen(false);
      form.reset();
      setPhotoUrl("");
      setSelectedAgentId(newAgent.id);
      toast({
        title: "Agent created",
        description: "Your new AI agent has been created. Click 'Continue' to start using it.",
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

  const selectAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest("POST", "/api/merchant/select-agent", { agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Agent selected",
        description: "Redirecting to your dashboard...",
      });
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to select agent",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AgentFormData) => {
    createMutation.mutate(data);
  };

  const handleContinue = () => {
    const agentId = selectedAgentId || merchant?.activeAgentId || agents?.[0]?.id;
    if (agentId) {
      selectAgentMutation.mutate(agentId);
    }
  };

  if (!merchantId) {
    return <Redirect to="/login" />;
  }

  const isLoading = merchantLoading || agentsLoading;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const hasAgents = agents && agents.length > 0;

  return (
    <>
      <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-0" aria-hidden="true" />
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full bg-white dark:bg-zinc-950 relative z-10">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-zinc-950">
          <header className="flex items-center justify-between gap-4 px-4 border-b border-border h-14 bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="font-medium">Your Agents</span>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">

            <div className="p-4 sm:p-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-lg">
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-72 mb-6" />
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-8rem)] justify-end sm:justify-center pb-20 sm:pb-0" style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom, 0px) + 3rem))' }}>
                <div className="w-full max-w-lg mx-auto">
                  <div className="text-left mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="text-select-agent-title">
                      {hasAgents ? "Your Agents" : "Create Your First AI Agent"}
                    </h1>
                    <p className="text-muted-foreground max-w-md">
                      {hasAgents
                        ? "Select an agent to activate, or create a new one."
                        : "Get started by creating an AI agent that will represent your business."}
                    </p>
                  </div>

                  {hasAgents ? (
                    <>
                      <ScrollArea className="max-h-[40vh] mb-4">
                        <div className="flex flex-col gap-2 pr-1">
                          {agents.map((agent) => {
                            const isSelected = selectedAgentId === agent.id;
                            return (
                              <Card
                                key={agent.id}
                                className={`cursor-pointer transition-all hover-elevate bg-background/70 backdrop-blur-md border-white/20 ${
                                  isSelected ? "border-primary ring-2 ring-primary/20" : ""
                                }`}
                                onClick={() => setSelectedAgentId(agent.id)}
                                data-testid={`agent-select-card-${agent.id}`}
                              >
                                <CardHeader className="flex flex-row items-center gap-3 p-3">
                                  <Avatar className="w-10 h-10 shrink-0">
                                    {agent.photoUrl && <AvatarImage src={agent.photoUrl} />}
                                    <AvatarFallback className="bg-muted">
                                      <Bot className="w-5 h-5 text-muted-foreground" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-sm font-semibold truncate">
                                      {agent.name}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-1 text-xs mt-0.5">
                                      {agent.description || "No description provided."}
                                    </CardDescription>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                  )}
                                </CardHeader>
                              </Card>
                            );
                          })}

                          <Card
                            className="cursor-pointer border-dashed hover-elevate bg-background/70 backdrop-blur-md border-white/20"
                            onClick={() => setIsDialogOpen(true)}
                            data-testid="button-create-new-agent"
                          >
                            <CardContent className="flex items-center gap-3 py-3 px-3">
                              <div className="w-10 h-10 rounded-full bg-muted/70 flex items-center justify-center shrink-0">
                                <Plus className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <p className="font-medium text-sm">Create New Agent</p>
                            </CardContent>
                          </Card>
                        </div>
                      </ScrollArea>

                      <div className="flex justify-start">
                        <Button
                          size="lg"
                          onClick={handleContinue}
                          disabled={!hasAgents || selectAgentMutation.isPending}
                          data-testid="button-continue-dashboard"
                        >
                          {selectAgentMutation.isPending ? "Saving..." : "Continue to Dashboard"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={() => setIsDialogOpen(true)} 
                      data-testid="button-create-first-agent"
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Agent
                    </Button>
                  )}
                </div>
              </div>
            )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Give your AI agent a name and description to help identify its purpose.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Input placeholder="e.g., Customer Support Agent" data-testid="input-new-agent-name" {...field} />
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
                        placeholder="What does this agent specialize in?"
                        data-testid="input-new-agent-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Instruksi khusus untuk AI agent...

Contoh:
- Selalu jawab dengan bahasa formal
- Jangan berikan diskon lebih dari 10%
- Jika customer marah, eskalasi ke supervisor"
                        className="min-h-[100px]"
                        data-testid="input-agent-system-prompt"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Instruksi ini akan mempengaruhi cara AI menjawab pertanyaan customer.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create-agent">
                  {createMutation.isPending ? "Creating..." : "Create Agent"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </SidebarProvider>
    </>
  );
}
