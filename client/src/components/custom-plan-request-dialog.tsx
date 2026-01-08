import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Settings, MessageSquare, Users, Database, Bot, HelpCircle, Send } from "lucide-react";
import type { Merchant } from "@shared/schema";

const customPlanRequestSchema = z.object({
  desiredConversations: z.string().min(1, "Required"),
  desiredAgents: z.string().min(1, "Required"),
  desiredSupervisors: z.string().min(1, "Required"),
  desiredSources: z.string().min(1, "Required"),
  desiredSuggestedQuestions: z.string().min(1, "Required"),
  integrationNeeds: z.string().optional(),
  complianceNeeds: z.string().optional(),
  additionalFeatures: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
  budgetRangeMin: z.string().optional(),
  budgetRangeMax: z.string().optional(),
  expectedTimeline: z.string().optional(),
});

type CustomPlanRequestFormData = z.infer<typeof customPlanRequestSchema>;

const featureOptions = [
  { id: "white_label", label: "White Label Solution" },
  { id: "custom_integrations", label: "Custom Integrations (CRM, ERP)" },
  { id: "api_access", label: "Advanced API Access" },
  { id: "sla_guarantee", label: "SLA Guarantee" },
  { id: "on_premise", label: "On-Premise Deployment" },
  { id: "dedicated_support", label: "Dedicated Support Manager" },
  { id: "custom_domain", label: "Custom Domain" },
  { id: "identity_verification", label: "Identity Verification" },
  { id: "priority_queue", label: "Priority Queue" },
  { id: "advanced_analytics", label: "Advanced Analytics" },
];

const timelineOptions = [
  { value: "immediate", label: "Segera (dalam 1 minggu)" },
  { value: "1_month", label: "Dalam 1 bulan" },
  { value: "3_months", label: "Dalam 3 bulan" },
  { value: "exploring", label: "Masih eksplorasi" },
];

interface CustomPlanRequestDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CustomPlanRequestDialog({ trigger, onSuccess }: CustomPlanRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant/me"],
  });
  
  const form = useForm<CustomPlanRequestFormData>({
    resolver: zodResolver(customPlanRequestSchema),
    defaultValues: {
      desiredConversations: "10000",
      desiredAgents: "5",
      desiredSupervisors: "10",
      desiredSources: "20",
      desiredSuggestedQuestions: "10",
      integrationNeeds: "",
      complianceNeeds: "",
      additionalFeatures: [],
      additionalNotes: "",
      budgetRangeMin: "",
      budgetRangeMax: "",
      expectedTimeline: "",
    },
  });
  
  const submitMutation = useMutation({
    mutationFn: async (data: CustomPlanRequestFormData) => {
      const response = await apiRequest("POST", "/api/custom-plan-requests", {
        ...data,
        desiredConversations: parseInt(data.desiredConversations),
        desiredAgents: parseInt(data.desiredAgents),
        desiredSupervisors: parseInt(data.desiredSupervisors),
        desiredSources: parseInt(data.desiredSources),
        desiredSuggestedQuestions: parseInt(data.desiredSuggestedQuestions),
        budgetRangeMin: data.budgetRangeMin ? parseInt(data.budgetRangeMin) : undefined,
        budgetRangeMax: data.budgetRangeMax ? parseInt(data.budgetRangeMax) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permintaan Terkirim!",
        description: "Tim kami akan meninjau permintaan Anda dan menghubungi Anda segera.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-plan-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/notifications"] });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: CustomPlanRequestFormData) => {
    submitMutation.mutate(data);
  };
  
  if (!merchant) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" data-testid="button-custom-plan-request">
              <Settings className="w-4 h-4 mr-2" />
              Request Custom Plan
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              Silakan login terlebih dahulu untuk mengajukan permintaan custom plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => window.location.href = "/login"}>
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" data-testid="button-custom-plan-request">
            <Settings className="w-4 h-4 mr-2" />
            Request Custom Plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Konfigurasi Custom Plan
          </DialogTitle>
          <DialogDescription>
            Tentukan kebutuhan bisnis Anda dan tim kami akan menyiapkan penawaran khusus.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="desiredConversations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Conversations per Bulan
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10000" 
                        {...field}
                        data-testid="input-desired-conversations"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="desiredAgents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Jumlah AI Agent
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5" 
                        {...field}
                        data-testid="input-desired-agents"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="desiredSupervisors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Jumlah Supervisor
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10" 
                        {...field}
                        data-testid="input-desired-supervisors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="desiredSources"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Knowledge Sources
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="20" 
                        {...field}
                        data-testid="input-desired-sources"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="desiredSuggestedQuestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Suggested Questions
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10" 
                        {...field}
                        data-testid="input-desired-questions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expectedTimeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapan Ingin Memulai?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeline">
                          <SelectValue placeholder="Pilih timeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timelineOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <Label>Fitur Tambahan yang Dibutuhkan</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {featureOptions.map(feature => (
                  <FormField
                    key={feature.id}
                    control={form.control}
                    name="additionalFeatures"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(feature.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, feature.id]);
                              } else {
                                field.onChange(current.filter(v => v !== feature.id));
                              }
                            }}
                            data-testid={`checkbox-feature-${feature.id}`}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          {feature.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="integrationNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kebutuhan Integrasi (CRM, API, Webhook)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Jelaskan integrasi yang dibutuhkan dengan sistem Anda..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-integration-needs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="complianceNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kebutuhan Keamanan & Compliance</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="GDPR, ISO, regulasi khusus industri..."
                      className="min-h-[60px]"
                      {...field}
                      data-testid="textarea-compliance-needs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budgetRangeMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Min (IDR)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1000000"
                        {...field}
                        data-testid="input-budget-min"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="budgetRangeMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Max (IDR)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5000000"
                        {...field}
                        data-testid="input-budget-max"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Tambahan</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informasi lain yang perlu kami ketahui..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-additional-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-request"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={submitMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Kirim Permintaan
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
