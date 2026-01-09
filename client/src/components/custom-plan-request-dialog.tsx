import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Settings, MessageSquare, Users, Database, Bot, Calculator, Send, Sparkles, Shield, Zap, HeadphonesIcon, Globe, BadgeCheck, BarChart3, Crown, Check } from "lucide-react";
import type { Merchant } from "@shared/schema";

// Enterprise plan base values
const ENTERPRISE_CONVERSATIONS = 50000;
const ENTERPRISE_AGENTS = 10;
const ENTERPRISE_SUPERVISORS = 5;
const ENTERPRISE_SOURCES = 100; // Unlimited
const ENTERPRISE_BASE_PRICE = 499;

// Pricing constants for additional resources
const PRICE_PER_1K_CONVERSATIONS = 5;
const PRICE_PER_AGENT = 15;
const PRICE_PER_SUPERVISOR = 10;
const PRICE_PER_SOURCE = 2;

// Features included by default (cannot be unchecked)
const includedFeatures = [
  { id: "custom_domain", label: "Custom Domain", icon: Globe },
  { id: "identity_verification", label: "Identity Verification", icon: BadgeCheck },
  { id: "priority_queue", label: "Priority Queue", icon: Zap },
  { id: "advanced_analytics", label: "Advanced Analytics", icon: BarChart3 },
  { id: "sla_guarantee", label: "SLA Guarantee", icon: Shield },
  { id: "dedicated_support", label: "Dedicated Support", icon: HeadphonesIcon },
  { id: "custom_integrations", label: "Custom Integrations", icon: Settings },
];

interface CustomPlanRequestDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  skipAuthCheck?: boolean;
}

export function CustomPlanRequestDialog({ trigger, onSuccess, skipAuthCheck = false }: CustomPlanRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Budget simulator state - defaults based on Enterprise plan
  const [conversations, setConversations] = useState(ENTERPRISE_CONVERSATIONS);
  const [agents, setAgents] = useState(ENTERPRISE_AGENTS);
  const [supervisors, setSupervisors] = useState(ENTERPRISE_SUPERVISORS);
  const [sources, setSources] = useState(ENTERPRISE_SOURCES);
  const [message, setMessage] = useState("");
  
  const { data: merchant, isLoading: isMerchantLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant/me"],
    enabled: !skipAuthCheck,
  });
  
  // Calculate estimated price based on Enterprise plan
  const estimatedPrice = useMemo(() => {
    let price = ENTERPRISE_BASE_PRICE;
    
    // Additional conversations beyond Enterprise plan
    if (conversations > ENTERPRISE_CONVERSATIONS) {
      const additionalConversations = conversations - ENTERPRISE_CONVERSATIONS;
      price += Math.ceil(additionalConversations / 1000) * PRICE_PER_1K_CONVERSATIONS;
    }
    
    // Additional agents beyond Enterprise plan
    if (agents > ENTERPRISE_AGENTS) {
      price += (agents - ENTERPRISE_AGENTS) * PRICE_PER_AGENT;
    }
    
    // Additional supervisors beyond Enterprise plan
    if (supervisors > ENTERPRISE_SUPERVISORS) {
      price += (supervisors - ENTERPRISE_SUPERVISORS) * PRICE_PER_SUPERVISOR;
    }
    
    // Sources are unlimited in Enterprise, no additional cost
    
    return price;
  }, [conversations, agents, supervisors, sources]);
  
  const submitMutation = useMutation({
    mutationFn: async () => {
      const selectedFeatures = includedFeatures.map(f => f.id);
      
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
        integrationNeeds: "Custom integrations included",
        complianceNeeds: "SLA guarantee included",
        additionalNotes: "",
        expectedTimeline: "1_month",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted!",
        description: "Our team will review your request and contact you soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-plan-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/notifications"] });
      setOpen(false);
      // Reset form to Enterprise defaults
      setConversations(ENTERPRISE_CONVERSATIONS);
      setAgents(ENTERPRISE_AGENTS);
      setSupervisors(ENTERPRISE_SUPERVISORS);
      setSources(ENTERPRISE_SOURCES);
      setMessage("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = () => {
    submitMutation.mutate();
  };
  
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
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
              Please login first to submit a custom plan request.
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
            Customize your needs and see real-time custom plan pricing estimate.
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
              <div className="text-sm opacity-80 mb-1">Estimated Monthly Price</div>
              <div className="text-4xl font-bold" data-testid="text-estimated-price">
                ${formatNumber(estimatedPrice)}
                <span className="text-lg font-normal opacity-80">/month</span>
              </div>
              <div className="text-xs opacity-60 mt-2">
                *Based on Enterprise plan. Final price will be confirmed by our sales team
              </div>
            </div>
            
            {/* Resource Sliders */}
            <div className="space-y-6 bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Resource Capacity
              </h3>
              
              {/* Conversations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Conversations/month</span>
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-conversations-value">
                    {formatNumber(conversations)}
                  </span>
                </div>
                <Slider
                  value={[conversations]}
                  onValueChange={([val]) => setConversations(val)}
                  min={50000}
                  max={500000}
                  step={10000}
                  className="cursor-pointer"
                  data-testid="slider-conversations"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50K</span>
                  <span>500K</span>
                </div>
              </div>
              
              {/* AI Agents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-2 text-sm">
                    <Bot className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>AI Agents</span>
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-agents-value">
                    {agents}
                  </span>
                </div>
                <Slider
                  value={[agents]}
                  onValueChange={([val]) => setAgents(val)}
                  min={10}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                  data-testid="slider-agents"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10</span>
                  <span>100</span>
                </div>
              </div>
              
              {/* Supervisors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Supervisors</span>
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-supervisors-value">
                    {supervisors}
                  </span>
                </div>
                <Slider
                  value={[supervisors]}
                  onValueChange={([val]) => setSupervisors(val)}
                  min={5}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                  data-testid="slider-supervisors"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>
              
              {/* Knowledge Sources */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Knowledge Sources</span>
                  </Label>
                  <span className="font-semibold text-purple-600" data-testid="text-sources-value">
                    Unlimited
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Included with custom plan at no additional cost
                </div>
              </div>
            </div>
            
            {/* Included Features */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-purple-600" />
                Premium Features Included
                <span className="text-xs font-normal text-muted-foreground ml-1">(included in package)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {includedFeatures.map(feature => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                      data-testid={`feature-${feature.id}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <Icon className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                        {feature.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Message to Sales Team (Optional)
              </Label>
              <div className="relative">
                <Textarea 
                  placeholder="Add any notes or special questions for our team..."
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
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
              <div className="font-semibold">Configuration Summary:</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Conversations</span>
                  <span className="font-medium">{formatNumber(conversations)}/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">AI Agents</span>
                  <span className="font-medium">{agents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Supervisors</span>
                  <span className="font-medium">{supervisors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sources</span>
                  <span className="font-medium">Unlimited</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Premium Features:</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {includedFeatures.map(feature => (
                    <span key={feature.id} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                      {feature.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-request"
              >
                Cancel
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
                Submit Request
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
