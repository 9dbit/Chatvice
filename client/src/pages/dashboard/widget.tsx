import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Palette, Save, Copy, Check, Bot, Code, Moon, Sun, AlignLeft, AlignRight, 
  Loader2, Camera, RefreshCw, X, Send, Paperclip, Smile, ImageIcon,
  Globe, MessageSquare, Frame, Shield, Key, Eye, EyeOff, Crown, Lock, ArrowUpRight
} from "lucide-react";
import type { Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

export default function WidgetPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [embedType, setEmbedType] = useState<"widget" | "iframe">("widget");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState({
    iconUrl: "",
    iconSize: 70,
    online: true,
    primaryColor: "#6b5dfc",
    welcomeMessage: "Hi! How can I help you today?",
    agentName: "Jeany AI",
    agentPhotoUrl: "",
    widgetTheme: "light" as "light" | "dark",
    bubblePosition: "right" as "left" | "right",
    allowedDomains: "",
  });

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  const canUseAdvancedFeatures = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";

  const { data: secretData, refetch: refetchSecret } = useQuery<{ secretKey: string }>({
    queryKey: ["/api/merchant/identity-secret"],
    enabled: canUseAdvancedFeatures,
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/identity-secret/regenerate", {});
    },
    onSuccess: () => {
      refetchSecret();
      toast({
        title: "Secret key regenerated",
        description: "Your new secret key has been generated. Make sure to update your server code.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to regenerate",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveAllowedDomainsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/allowed-domains", { allowedDomains: config.allowedDomains });
    },
    onSuccess: () => {
      toast({
        title: "Allowed domains saved",
        description: "Your domain restrictions have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const secretKey = secretData?.secretKey || "";
  const maskedSecretKey = secretKey ? `${secretKey.slice(0, 12)}...${secretKey.slice(-4)}` : "";

  useEffect(() => {
    if (merchant) {
      setConfig({
        iconUrl: merchant.iconUrl || "",
        iconSize: merchant.iconSize || 70,
        online: merchant.online ?? true,
        primaryColor: merchant.primaryColor || "#6b5dfc",
        welcomeMessage: merchant.welcomeMessage || "Hi! How can I help you today?",
        agentName: merchant.agentName || "Jeany AI",
        agentPhotoUrl: merchant.agentPhotoUrl || "",
        widgetTheme: (merchant.widgetTheme as "light" | "dark") || "light",
        bubblePosition: (merchant.bubblePosition as "left" | "right") || "right",
        allowedDomains: (merchant as any).allowedDomains || "",
      });
    }
  }, [merchant]);

  const handleAgentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setConfig({ ...config, agentPhotoUrl: reader.result as string });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/config", {
        merchantId,
        ...config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Widget settings saved",
        description: "Your changes have been applied.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const baseUrl = window.location.origin;
  
  const widgetEmbedCode = `<script>
(function(){if(!window.jeanyai||window.jeanyai("getState")!=="initialized"){window.jeanyai=(...arguments)=>{if(!window.jeanyai.q){window.jeanyai.q=[]}window.jeanyai.q.push(arguments)};window.jeanyai=new Proxy(window.jeanyai,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="${baseUrl}/api/widget/jeany.js";script.id="${merchantId}";script.domain="${baseUrl.replace(/^https?:\/\//, '')}";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();
</script>`;

  const iframeEmbedCode = `<iframe
    src="${baseUrl}/widget/${merchantId}"
    width="100%"
    style="height: 100%; min-height: 700px"
    frameborder="0"
></iframe>`;

  const identityVerificationCode = `// --- SERVER CODE ---
const jwt = require('jsonwebtoken');

const secret = process.env.JEANY_IDENTITY_SECRET; // Your Jeany AI secret key (should be stored as a secret not in the code)

const user = await getSignedInUser(); // Get the current user signed in to your site

const token = jwt.sign(
    { 
        user_id: user.id, // Your user's id
        email: user.email, // User's email
        name: user.name, // User's name
        // ... other custom attributes
    }, 
    secret, 
    { expiresIn: '1h' }
);

// --- CLIENT CODE ---
const token = await getUserToken(); // Get the token from your server
window.jeanyai('identify', { token }); // identify the user with Jeany AI`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Widget Customization</h1>
        <p className="text-muted-foreground">
          Customize the appearance of your Jeany AI chat widget and get embed codes.
        </p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="embed">Embed Setup</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            Security
            {!canUseAdvancedFeatures && <Lock className="w-3 h-3" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <CardTitle>Appearance Settings</CardTitle>
                </div>
                <CardDescription>
                  Customize how your chat widget looks on your website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Icon URL</Label>
                      <Input
                        placeholder="https://example.com/icon.png"
                        value={config.iconUrl}
                        onChange={(e) => setConfig({ ...config, iconUrl: e.target.value })}
                        data-testid="input-icon-url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use the default Jeany icon
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Icon Size</Label>
                        <span className="text-sm text-muted-foreground">{config.iconSize}px</span>
                      </div>
                      <Slider
                        value={[config.iconSize]}
                        onValueChange={([value]) => setConfig({ ...config, iconSize: value })}
                        min={50}
                        max={100}
                        step={5}
                        data-testid="slider-icon-size"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                          data-testid="input-primary-color"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          placeholder="#6b5dfc"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Welcome Message</Label>
                      <Input
                        value={config.welcomeMessage}
                        onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                        placeholder="Hi! How can I help you today?"
                        data-testid="input-welcome-message"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Online Status</Label>
                        <p className="text-xs text-muted-foreground">
                          Show as available to customers
                        </p>
                      </div>
                      <Switch
                        checked={config.online}
                        onCheckedChange={(checked) => setConfig({ ...config, online: checked })}
                        data-testid="switch-widget-online"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <Label className="text-base font-semibold">Agent & Theme Settings</Label>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={config.agentPhotoUrl} alt={config.agentName} />
                            <AvatarFallback className="bg-primary/20">
                              <Bot className="w-6 h-6 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            data-testid="button-upload-agent-photo"
                          >
                            {isUploading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Camera className="w-3 h-3" />
                            )}
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAgentPhotoUpload}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">Agent Name</Label>
                          <Input
                            value={config.agentName}
                            onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                            placeholder="Jeany AI"
                            data-testid="input-agent-name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Widget Theme</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={config.widgetTheme === "light" ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setConfig({ ...config, widgetTheme: "light" })}
                              data-testid="button-theme-light"
                            >
                              <Sun className="w-4 h-4 mr-1" />
                              Light
                            </Button>
                            <Button
                              variant={config.widgetTheme === "dark" ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setConfig({ ...config, widgetTheme: "dark" })}
                              data-testid="button-theme-dark"
                            >
                              <Moon className="w-4 h-4 mr-1" />
                              Dark
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Bubble Position</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={config.bubblePosition === "left" ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setConfig({ ...config, bubblePosition: "left" })}
                              data-testid="button-position-left"
                            >
                              <AlignLeft className="w-4 h-4 mr-1" />
                              Left
                            </Button>
                            <Button
                              variant={config.bubblePosition === "right" ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setConfig({ ...config, bubblePosition: "right" })}
                              data-testid="button-position-right"
                            >
                              <AlignRight className="w-4 h-4 mr-1" />
                              Right
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="w-full"
                      data-testid="button-save-widget"
                    >
                      {saveMutation.isPending ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Preview</CardTitle>
                <CardDescription>
                  This is how your widget will appear on your website.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-muted/30 rounded-lg h-[500px] flex items-end justify-end p-4">
                  <div className="absolute top-4 left-4 right-4 h-8 bg-muted rounded flex items-center px-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-status-away/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-status-online/50" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-3">yourwebsite.com</span>
                  </div>

                  <div
                    className={`rounded-full cursor-pointer shadow-lg flex items-center justify-center relative ${config.bubblePosition === "left" ? "mr-auto" : "ml-auto"}`}
                    style={{
                      width: config.iconSize,
                      height: config.iconSize,
                      backgroundColor: config.primaryColor,
                    }}
                  >
                    {config.iconUrl ? (
                      <img
                        src={config.iconUrl}
                        alt="Chat icon"
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Bot className="w-1/2 h-1/2 text-white" />
                    )}
                    <div
                      className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
                        config.online ? "bg-status-online" : "bg-status-offline"
                      }`}
                    />
                  </div>

                  <div 
                    className={`absolute bottom-20 ${config.bubblePosition === "left" ? "left-4" : "right-4"} w-[300px] rounded-xl shadow-xl overflow-hidden border`}
                    style={{
                      backgroundColor: config.widgetTheme === "dark" ? "#1a1a2e" : "#ffffff",
                      borderColor: config.widgetTheme === "dark" ? "#2d2d44" : "#e5e7eb",
                    }}
                  >
                    <div
                      className="p-3 flex items-center justify-between"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      <div className="flex items-center gap-2">
                        {config.agentPhotoUrl ? (
                          <img
                            src={config.agentPhotoUrl}
                            alt={config.agentName}
                            className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="text-white">
                          <p className="text-sm font-semibold">{config.agentName}</p>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${config.online ? "bg-green-400" : "bg-gray-400"}`} />
                            <p className="text-xs opacity-90">{config.online ? "Online" : "Offline"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                          <RefreshCw className="w-4 h-4 text-white" />
                        </button>
                        <button className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="p-3 min-h-[100px]"
                      style={{
                        backgroundColor: config.widgetTheme === "dark" ? "#1a1a2e" : "#ffffff",
                      }}
                    >
                      <div className="flex gap-2">
                        {config.agentPhotoUrl ? (
                          <img
                            src={config.agentPhotoUrl}
                            alt={config.agentName}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${config.primaryColor}20` }}
                          >
                            <Bot className="w-4 h-4" style={{ color: config.primaryColor }} />
                          </div>
                        )}
                        <div 
                          className="rounded-lg rounded-tl-sm p-2.5 text-xs max-w-[200px]"
                          style={{
                            backgroundColor: config.widgetTheme === "dark" ? "#2d2d44" : "#f3f4f6",
                            color: config.widgetTheme === "dark" ? "#e5e7eb" : "#374151",
                          }}
                        >
                          {config.welcomeMessage}
                        </div>
                      </div>
                    </div>

                    <div 
                      className="p-2 border-t flex items-center gap-2"
                      style={{
                        backgroundColor: config.widgetTheme === "dark" ? "#1a1a2e" : "#ffffff",
                        borderColor: config.widgetTheme === "dark" ? "#2d2d44" : "#e5e7eb",
                      }}
                    >
                      <div 
                        className="flex-1 text-xs px-3 py-2 rounded-full"
                        style={{
                          backgroundColor: config.widgetTheme === "dark" ? "#2d2d44" : "#f3f4f6",
                          color: "#9ca3af",
                        }}
                      >
                        Type a message...
                      </div>
                      <button 
                        className="p-2 rounded-full"
                        style={{ backgroundColor: config.primaryColor }}
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div 
                      className="py-1.5 text-center border-t"
                      style={{
                        backgroundColor: config.widgetTheme === "dark" ? "#151524" : "#f9fafb",
                        borderColor: config.widgetTheme === "dark" ? "#2d2d44" : "#e5e7eb",
                      }}
                    >
                      <span 
                        className="text-[10px]"
                        style={{ color: config.widgetTheme === "dark" ? "#6b7280" : "#9ca3af" }}
                      >
                        Powered by <span className="font-medium" style={{ color: config.primaryColor }}>Jeany AI</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="embed" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle>Allowed Domains</CardTitle>
              </div>
              <CardDescription>
                Only allow embedding the agent on specific domains. Enter each domain on a new line.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUseAdvancedFeatures ? (
                <>
                  <Textarea
                    placeholder="www.example.com&#10;app.example.com&#10;*.example.com"
                    value={config.allowedDomains}
                    onChange={(e) => setConfig({ ...config, allowedDomains: e.target.value })}
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="input-allowed-domains"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow embedding on any domain. Use wildcards like *.example.com to allow all subdomains.
                  </p>
                  <Button
                    onClick={() => saveAllowedDomainsMutation.mutate()}
                    disabled={saveAllowedDomainsMutation.isPending}
                    variant="outline"
                    data-testid="button-save-domains"
                  >
                    {saveAllowedDomainsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Domains
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Upgrade to control allowed domains</p>
                    <p className="text-sm text-muted-foreground">
                      Domain restrictions are available on Pro and Enterprise plans.
                    </p>
                  </div>
                  <Link href="/dashboard/plans">
                    <Button size="sm" data-testid="button-upgrade-domains">
                      Upgrade
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <CardTitle>Embed Type</CardTitle>
              </div>
              <CardDescription>
                Choose how to embed your Jeany AI agent on your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    embedType === "widget" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setEmbedType("widget")}
                  data-testid="embed-type-widget"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Chat Widget</h4>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Embed a chat bubble on your website. Allows you to use all the advanced features of the agent.
                  </p>
                </div>

                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    embedType === "iframe" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setEmbedType("iframe")}
                  data-testid="embed-type-iframe"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Frame className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold">iFrame</h4>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Embed the chat interface directly using an iframe. Note: Advanced features are not supported.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <CardTitle>Widget Setup</CardTitle>
              </div>
              <CardDescription>
                Paste this code on your site (e.g., www.marketplayid.com) to install the chat widget and enable AI-powered support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {embedType === "widget" ? widgetEmbedCode : iframeEmbedCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(
                    embedType === "widget" ? widgetEmbedCode : iframeEmbedCode,
                    embedType === "widget" ? "Widget code" : "iFrame code"
                  )}
                  data-testid="button-copy-embed"
                >
                  {copied === (embedType === "widget" ? "Widget code" : "iFrame code") ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span>Your widget URL: <code className="bg-muted px-2 py-0.5 rounded">{baseUrl}/widget/{merchantId}</code></span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          {!canUseAdvancedFeatures ? (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Identity Verification</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Secure your AI Agent by verifying user identity with JWT tokens. Available on Pro and Enterprise plans.
                </p>
                <Link href="/dashboard/plans">
                  <Button data-testid="button-upgrade-security">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle>Identity Verification</CardTitle>
                  </div>
                  <CardDescription>
                    Secure your AI Agent by generating a JWT for each logged-in user and sending it to Jeany AI. 
                    This enables secure identity verification for your AI Agent with various actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Secret Key
                      </Label>
                      <a 
                        href="#" 
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => e.preventDefault()}
                      >
                        Read more in the Identity Verification Docs
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type={showSecretKey ? "text" : "password"}
                          value={showSecretKey ? secretKey : maskedSecretKey}
                          readOnly
                          className="font-mono pr-10"
                          placeholder="Loading..."
                          data-testid="input-secret-key"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          data-testid="button-toggle-secret"
                        >
                          {showSecretKey ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => secretKey && handleCopy(secretKey, "Secret key")}
                        disabled={!secretKey}
                        data-testid="button-copy-secret"
                      >
                        {copied === "Secret key" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => regenerateSecretMutation.mutate()}
                        disabled={regenerateSecretMutation.isPending}
                        data-testid="button-regenerate-secret"
                      >
                        {regenerateSecretMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keep this secret key secure. Never expose it in client-side code. Use the regenerate button if you need a new key.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-primary" />
                    <CardTitle>Implementation Guide</CardTitle>
                  </div>
                  <CardDescription>
                    Use this code example to implement identity verification in your application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      {identityVerificationCode}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(identityVerificationCode, "Verification code")}
                      data-testid="button-copy-verification"
                    >
                      {copied === "Verification code" ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
