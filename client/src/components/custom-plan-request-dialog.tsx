import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Settings, MessageSquare, Users, Database, Bot, Calculator, Send, Sparkles, Shield, Zap, HeadphonesIcon, Globe, BadgeCheck, BarChart3, Crown } from "lucide-react";
import type { Merchant } from "@shared/schema";

// Pricing constants (based on enterprise plan scaling)
const BASE_PRICE_PER_1K_CONVERSATIONS = 5; // $5 per 1000 conversations
const PRICE_PER_AGENT = 15; // $15 per additional agent
const PRICE_PER_SUPERVISOR = 10; // $10 per additional supervisor
const PRICE_PER_SOURCE = 2; // $2 per additional source

const premiumFeatures = [
  { id: "custom_domain", label: "Custom Domain", icon: Globe, price: 20 },
  { id: "identity_verification", label: "Identity Verification", icon: BadgeCheck, price: 30 },
  { id: "priority_queue", label: "Priority Queue", icon: Zap, price: 25 },
  { id: "advanced_analytics", label: "Advanced Analytics", icon: BarChart3, price: 35 },
  { id: "sla_guarantee", label: "SLA Guarantee", icon: Shield, price: 50 },
  { id: "dedicated_support", label: "Dedicated Support Manager", icon: HeadphonesIcon, price: 100 },
  { id: "custom_integrations", label: "Custom Integrations (CRM, ERP)", icon: Settings, price: 75 },
  { id: "white_label", label: "White Label Solution", icon: Crown, price: 150 },
];

interface CustomPlanRequestDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  skipAuthCheck?: boolean;
}

export function CustomPlanRequestDialog({ trigger, onSuccess, skipAuthCheck = false }: CustomPlanRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Budget simulator state
  const [conversations, setConversations] = useState(10000);
  const [agents, setAgents] = useState(5);
  const [supervisors, setSupervisors] = useState(5);
  const [sources, setSources] = useState(20);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  
  const { data: merchant, isLoading: isMerchantLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant/me"],
    enabled: !skipAuthCheck,
  });
  
  // Calculate estimated price
  const estimatedPrice = useMemo(() => {
    let price = 0;
    
    // Base price from conversations
    price += Math.ceil(conversations / 1000) * BASE_PRICE_PER_1K_CONVERSATIONS;
    
    // Additional agents (first 3 included at base)
    if (agents > 3) {
      price += (agents - 3) * PRICE_PER_AGENT;
    }
    
    // Additional supervisors (first 3 included at base)
    if (supervisors > 3) {
      price += (supervisors - 3) * PRICE_PER_SUPERVISOR;
    }
    
    // Additional sources (first 20 included at base)
    if (sources > 20) {
      price += (sources - 20) * PRICE_PER_SOURCE;
    }
    
    // Premium features
    selectedFeatures.forEach(featureId => {
      const feature = premiumFeatures.find(f => f.id === featureId);
      if (feature) {
        price += feature.price;
      }
    });
    
    // Minimum custom plan price
    return Math.max(price, 199);
  }, [conversations, agents, supervisors, sources, selectedFeatures]);
  
  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };
  
  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/custom-plan-requests", {
        desiredConversations: conversations,
        desiredAgents: agents,
        desiredSupervisors: supervisors,
        desiredSources: sources,
        desiredSuggestedQuestions: 10,
        additionalFeatures: selectedFeatures,
        message: message,
        budgetRangeMin: estimatedPrice,
        budgetRangeMax: Math.round(estimatedPrice * 1.5),
        integrationNeeds: selectedFeatures.includes("custom_integrations") ? "Custom integrations requested" : "",
        complianceNeeds: selectedFeatures.includes("sla_guarantee") ? "SLA guarantee requested" : "",
        additionalNotes: "",
        expectedTimeline: "1_month",
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
      // Reset form
      setConversations(10000);
      setAgents(5);
      setSupervisors(5);
      setSources(20);
      setSelectedFeatures([]);
      setMessage("");
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
  
  const handleSubmit = () => {
    submitMutation.mutate();
  };
  
  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };
  
  if (!merchant && !isMerchantLoading && !skipAuthCheck) {
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
            <Calculator className="w-5 h-5 text-purple-600" />
            Budget Simulator
          </DialogTitle>
          <DialogDescription>
            Sesuaikan kebutuhan Anda dan lihat estimasi harga custom plan secara real-time.
          </DialogDescription>
        </DialogHeader>
        
        {isMerchantLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Price Display */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white text-center">
              <div className="text-sm opacity-80 mb-1">Estimasi Harga Bulanan</div>
              <div className="text-4xl font-bold" data-testid="text-estimated-price">
                ${formatNumber(estimatedPrice)}
                <span className="text-lg font-normal opacity-80">/bulan</span>
              </div>
              <div className="text-xs opacity-60 mt-2">
                *Harga final akan dikonfirmasi oleh tim sales
              </div>
            </div>
            
            {/* Resource Sliders */}
            <div className="space-y-6 bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Kapasitas Resource
              </h3>
              
              {/* Conversations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    AI Conversations / bulan
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-conversations-value">
                    {formatNumber(conversations)}
                  </span>
                </div>
                <Slider
                  value={[conversations]}
                  onValueChange={([val]) => setConversations(val)}
                  min={5000}
                  max={200000}
                  step={5000}
                  className="cursor-pointer"
                  data-testid="slider-conversations"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5,000</span>
                  <span>200,000</span>
                </div>
              </div>
              
              {/* AI Agents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    AI Agents
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-agents-value">
                    {agents}
                  </span>
                </div>
                <Slider
                  value={[agents]}
                  onValueChange={([val]) => setAgents(val)}
                  min={1}
                  max={50}
                  step={1}
                  className="cursor-pointer"
                  data-testid="slider-agents"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
              
              {/* Supervisors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Supervisors
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-supervisors-value">
                    {supervisors}
                  </span>
                </div>
                <Slider
                  value={[supervisors]}
                  onValueChange={([val]) => setSupervisors(val)}
                  min={1}
                  max={50}
                  step={1}
                  className="cursor-pointer"
                  data-testid="slider-supervisors"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
              
              {/* Knowledge Sources */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-600" />
                    Knowledge Sources
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-sources-value">
                    {sources === 100 ? "Unlimited" : sources}
                  </span>
                </div>
                <Slider
                  value={[sources]}
                  onValueChange={([val]) => setSources(val)}
                  min={10}
                  max={100}
                  step={10}
                  className="cursor-pointer"
                  data-testid="slider-sources"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10</span>
                  <span>Unlimited</span>
                </div>
              </div>
            </div>
            
            {/* Premium Features */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-purple-600" />
                Fitur Premium
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {premiumFeatures.map(feature => {
                  const Icon = feature.icon;
                  const isSelected = selectedFeatures.includes(feature.id);
                  return (
                    <div
                      key={feature.id}
                      onClick={() => toggleFeature(feature.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-border hover:border-purple-300 hover:bg-muted/50'
                      }`}
                      data-testid={`feature-${feature.id}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFeature(feature.id)}
                        className="pointer-events-none"
                      />
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-muted-foreground'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                          {feature.label}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${isSelected ? 'text-purple-600' : 'text-muted-foreground'}`}>
                        +${feature.price}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Pesan untuk Tim Sales (Opsional)
              </Label>
              <div className="relative">
                <Textarea 
                  placeholder="Tambahkan catatan atau pertanyaan khusus untuk tim kami..."
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  data-testid="textarea-message"
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {message.length}/500
                </div>
              </div>
            </div>
            
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="font-semibold mb-3">Ringkasan Konfigurasi:</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversations:</span>
                  <span className="font-medium">{formatNumber(conversations)}/bulan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Agents:</span>
                  <span className="font-medium">{agents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supervisors:</span>
                  <span className="font-medium">{supervisors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sources:</span>
                  <span className="font-medium">{sources === 100 ? "Unlimited" : sources}</span>
                </div>
              </div>
              {selectedFeatures.length > 0 && (
                <div className="pt-2 border-t mt-2">
                  <span className="text-muted-foreground">Fitur Premium:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFeatures.map(id => {
                      const feature = premiumFeatures.find(f => f.id === id);
                      return feature ? (
                        <span key={id} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                          {feature.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
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
                onClick={handleSubmit}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
