import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
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
  Loader2, Camera, RefreshCw, X, Send, Paperclip, Smile, ImageIcon, Video,
  Globe, MessageSquare, Frame, Shield, Key, Eye, EyeOff, Crown, Lock, ArrowUpRight, ChevronDown,
  Plus, Trash2, CheckCircle, AlertCircle, ExternalLink, GripVertical, ChevronUp, ChevronDown as ChevronDownIcon,
  Smartphone, Monitor, Sparkles, ArrowUpDown, ArrowLeftRight, ZoomIn, RotateCw
} from "lucide-react";
import type { MerchantDomain } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Merchant, Agent } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

export default function WidgetPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: merchantProfile } = useQuery<{ widgetSlug?: string }>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });
  const widgetSlug = merchantProfile?.widgetSlug;
  const [isUploading, setIsUploading] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [embedType, setEmbedType] = useState<"widget" | "iframe">("widget");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemovalStatus, setBgRemovalStatus] = useState<{ used: number; limit: number } | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  // Load the widget script dynamically
  useEffect(() => {
    if (!merchantId) return;

    // Remove any existing widget elements first
    const existingScript = document.getElementById('chatvice-widget-script');
    const existingContainer = document.getElementById('chatvice-widget');
    if (existingScript) existingScript.remove();
    if (existingContainer) existingContainer.remove();

    // Create and append the widget script
    const script = document.createElement('script');
    script.id = 'chatvice-widget-script';
    script.src = `${window.location.origin}/api/widget/chatvice.js?merchant=${merchantId}&v=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptEl = document.getElementById('chatvice-widget-script');
      const containerEl = document.getElementById('chatvice-widget');
      if (scriptEl) scriptEl.remove();
      if (containerEl) containerEl.remove();
    };
  }, [merchantId, widgetKey]);

  const handleRefreshWidget = () => {
    setWidgetKey(prev => prev + 1);
  };
  
  const [config, setConfig] = useState({
    iconUrl: "",
    iconVisible: true,
    iconSize: 70,
    iconWidth: 70,
    iconHeight: 70,
    useCustomIconDimensions: false,
    mobileIconWidth: 60,
    mobileIconHeight: 60,
    widgetOffset: 20,
    iconAnimationVertical: false,
    iconAnimationHorizontal: false,
    iconAnimationZoom: false,
    iconAnimationRotation: false,
    iconAnimationSpeed: 3,
    online: true,
    primaryColor: "#6b5dfc",
    welcomeMessage: "Hi! How can I help you today?",
    agentName: "Chatvice",
    agentPhotoUrl: "",
    widgetTheme: "light" as "light" | "dark",
    bubblePosition: "right" as "left" | "right",
    allowedDomains: "",
  });

  const [socialConfig, setSocialConfig] = useState({
    socialMediaEnabled: false,
    socialIconStyle: "colored" as "colored" | "3d-metal" | "3d-golden" | "flat-white" | "flat-black" | "custom",
    socialInstagram: "",
    socialFacebook: "",
    socialTelegram: "",
    socialWhatsapp: "",
    socialDiscord: "",
    socialUseCustomIcons: false,
    socialCustomInstagram: "",
    socialCustomFacebook: "",
    socialCustomTelegram: "",
    socialCustomWhatsapp: "",
    socialCustomDiscord: "",
  });

  const [preChatConfig, setPreChatConfig] = useState({
    welcomeDescription: "",
    quickMessageOptions: [] as string[],
    prechatBannerUrl: "",
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [newQuickMessage, setNewQuickMessage] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  const [uploadingSocialIcon, setUploadingSocialIcon] = useState<string | null>(null);
  const socialIconInputRefs = {
    instagram: useRef<HTMLInputElement>(null),
    facebook: useRef<HTMLInputElement>(null),
    telegram: useRef<HTMLInputElement>(null),
    whatsapp: useRef<HTMLInputElement>(null),
    discord: useRef<HTMLInputElement>(null),
  };

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
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

  // Background removal usage status
  const { data: bgStatusData, refetch: refetchBgStatus } = useQuery<{ used: number; limit: number; planId: string }>({
    queryKey: ["/api/image/bg-removal-status"],
    enabled: !!merchantId,
  });

  useEffect(() => {
    if (bgStatusData) {
      setBgRemovalStatus({ used: bgStatusData.used, limit: bgStatusData.limit });
    }
  }, [bgStatusData]);

  // Allowed Domains management
  const [newDomain, setNewDomain] = useState("");
  const [validatingDomainId, setValidatingDomainId] = useState<string | null>(null);
  
  interface DomainsResponse {
    domains: MerchantDomain[];
    limit: number;
    used: number;
    planId: string;
  }
  
  const { data: domainsData, refetch: refetchDomains } = useQuery<DomainsResponse>({
    queryKey: ["/api/merchant/domains"],
    enabled: !!merchantId,
  });
  
  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest("POST", "/api/merchant/domains", { domain });
    },
    onSuccess: () => {
      toast({
        title: "Domain added",
        description: "Please validate the domain to confirm widget installation.",
      });
      setNewDomain("");
      refetchDomains();
    },
    onError: (error: any) => {
      if (error?.requiresUpgrade) {
        toast({
          title: "Domain limit reached",
          description: "Upgrade your plan to add more domains.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to add domain",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });
  
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/merchant/domains/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Domain removed",
        description: "The domain has been removed from your allowed list.",
      });
      refetchDomains();
    },
    onError: () => {
      toast({
        title: "Failed to remove domain",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const validateDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      setValidatingDomainId(id);
      return apiRequest("POST", `/api/merchant/domains/${id}/validate`, {});
    },
    onSuccess: (data: any) => {
      setValidatingDomainId(null);
      toast({
        title: data.isValidated ? "Domain validated" : "Validation pending",
        description: data.message,
        variant: data.isValidated ? "default" : "destructive",
      });
      refetchDomains();
    },
    onError: () => {
      setValidatingDomainId(null);
      toast({
        title: "Validation failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const secretKey = secretData?.secretKey || "";
  const maskedSecretKey = secretKey ? `${secretKey.slice(0, 12)}...${secretKey.slice(-4)}` : "";

  const activeAgent = agents.find(a => a.id === merchant?.activeAgentId);

  type WidgetSettings = {
    primaryColor: string;
    widgetTheme: string;
    bubblePosition: string;
    widgetWelcomeMessage: string;
    photoUrl: string;
    name: string;
  };

  const { data: agentWidgetSettings, refetch: refetchAgentSettings } = useQuery<WidgetSettings>({
    queryKey: ["/api/agents", merchant?.activeAgentId, "widget-settings"],
    enabled: !!merchant?.activeAgentId,
  });

  useEffect(() => {
    if (merchant && merchant.activeAgentId && agentWidgetSettings) {
      setConfig({
        iconUrl: merchant.iconUrl || "",
        iconVisible: (merchant as any).iconVisible !== false,
        iconSize: Math.min(Math.max((merchant.iconSize || 70), 30), 400),
        iconWidth: Math.min(Math.max(((merchant as any).iconWidth || 70), 30), 400),
        iconHeight: Math.min(Math.max(((merchant as any).iconHeight || 70), 30), 400),
        useCustomIconDimensions: (merchant as any).useCustomIconDimensions || false,
        mobileIconWidth: Math.min(Math.max(((merchant as any).mobileIconWidth || 60), 30), 120),
        mobileIconHeight: Math.min(Math.max(((merchant as any).mobileIconHeight || 60), 30), 120),
        widgetOffset: Math.min(Math.max(((merchant as any).widgetOffset || 20), 0), 100),
        iconAnimationVertical: (merchant as any).iconAnimationVertical || false,
        iconAnimationHorizontal: (merchant as any).iconAnimationHorizontal || false,
        iconAnimationZoom: (merchant as any).iconAnimationZoom || false,
        iconAnimationRotation: (merchant as any).iconAnimationRotation || false,
        iconAnimationSpeed: (merchant as any).iconAnimationSpeed || 3,
        online: merchant.online ?? true,
        primaryColor: agentWidgetSettings.primaryColor || "#6b5dfc",
        welcomeMessage: agentWidgetSettings.widgetWelcomeMessage || "Hi! How can I help you today?",
        agentName: agentWidgetSettings.name || "Chatvice",
        agentPhotoUrl: agentWidgetSettings.photoUrl || "",
        widgetTheme: (agentWidgetSettings.widgetTheme as "light" | "dark") || "light",
        bubblePosition: (agentWidgetSettings.bubblePosition as "left" | "right") || "right",
        allowedDomains: (merchant as any).allowedDomains || "",
      });
    } else if (merchant && !merchant.activeAgentId) {
      setConfig({
        iconUrl: merchant.iconUrl || "",
        iconVisible: (merchant as any).iconVisible !== false,
        iconSize: Math.min(Math.max((merchant.iconSize || 70), 30), 400),
        iconWidth: Math.min(Math.max(((merchant as any).iconWidth || 70), 30), 400),
        iconHeight: Math.min(Math.max(((merchant as any).iconHeight || 70), 30), 400),
        useCustomIconDimensions: (merchant as any).useCustomIconDimensions || false,
        mobileIconWidth: Math.min(Math.max(((merchant as any).mobileIconWidth || 60), 30), 120),
        mobileIconHeight: Math.min(Math.max(((merchant as any).mobileIconHeight || 60), 30), 120),
        widgetOffset: Math.min(Math.max(((merchant as any).widgetOffset || 20), 0), 100),
        iconAnimationVertical: (merchant as any).iconAnimationVertical || false,
        iconAnimationHorizontal: (merchant as any).iconAnimationHorizontal || false,
        iconAnimationZoom: (merchant as any).iconAnimationZoom || false,
        iconAnimationRotation: (merchant as any).iconAnimationRotation || false,
        iconAnimationSpeed: (merchant as any).iconAnimationSpeed || 3,
        online: merchant.online ?? true,
        primaryColor: merchant.primaryColor || "#6b5dfc",
        welcomeMessage: merchant.welcomeMessage || "Hi! How can I help you today?",
        agentName: merchant.agentName || "Chatvice",
        agentPhotoUrl: merchant.agentPhotoUrl || "",
        widgetTheme: (merchant.widgetTheme as "light" | "dark") || "light",
        bubblePosition: (merchant.bubblePosition as "left" | "right") || "right",
        allowedDomains: (merchant as any).allowedDomains || "",
      });
    }
  }, [merchant, agentWidgetSettings]);

  useEffect(() => {
    if (merchant) {
      setSocialConfig({
        socialMediaEnabled: merchant.socialMediaEnabled || false,
        socialIconStyle: (merchant.socialIconStyle as "colored" | "3d-metal" | "3d-golden" | "flat-white" | "flat-black" | "custom") || "colored",
        socialInstagram: merchant.socialInstagram || "",
        socialFacebook: merchant.socialFacebook || "",
        socialTelegram: merchant.socialTelegram || "",
        socialWhatsapp: merchant.socialWhatsapp || "",
        socialDiscord: merchant.socialDiscord || "",
        socialUseCustomIcons: (merchant as any).socialUseCustomIcons || false,
        socialCustomInstagram: (merchant as any).socialCustomInstagram || "",
        socialCustomFacebook: (merchant as any).socialCustomFacebook || "",
        socialCustomTelegram: (merchant as any).socialCustomTelegram || "",
        socialCustomWhatsapp: (merchant as any).socialCustomWhatsapp || "",
        socialCustomDiscord: (merchant as any).socialCustomDiscord || "",
      });
      setPreChatConfig({
        welcomeDescription: (merchant as any).welcomeDescription || "",
        quickMessageOptions: (merchant as any).quickMessageOptions || [],
        prechatBannerUrl: (merchant as any).prechatBannerUrl || "",
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

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    if (!file.type.match(/^image\/(png|gif|jpeg|jpg|svg\+xml|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, GIF, JPG, SVG, or WebP file.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploadingIcon(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setConfig({ ...config, iconUrl: reader.result as string });
      setIsUploadingIcon(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFlipImage = async (direction: "horizontal" | "vertical") => {
    if (!config.iconUrl) return;
    setIsProcessingImage(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = config.iconUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      if (direction === "horizontal") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(img, 0, 0);
      const flippedUrl = canvas.toDataURL("image/webp", 0.9);
      setConfig({ ...config, iconUrl: flippedUrl });
      toast({ title: "Image flipped", description: `Image flipped ${direction}ly and converted to WebP.` });
    } catch (error) {
      toast({ title: "Failed to flip image", description: "Please try again.", variant: "destructive" });
    }
    setIsProcessingImage(false);
  };

  const handleConvertToWebP = async () => {
    if (!config.iconUrl) return;
    setIsProcessingImage(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = config.iconUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const webpUrl = canvas.toDataURL("image/webp", 0.85);
      setConfig({ ...config, iconUrl: webpUrl });
      const originalSize = config.iconUrl.length;
      const newSize = webpUrl.length;
      const saved = Math.round((1 - newSize / originalSize) * 100);
      toast({ 
        title: "Converted to WebP", 
        description: saved > 0 ? `Reduced file size by ~${saved}%` : "Image converted to WebP format."
      });
    } catch (error) {
      toast({ title: "Failed to convert", description: "Please try again.", variant: "destructive" });
    }
    setIsProcessingImage(false);
  };

  const convertToBase64DataUrl = async (url: string): Promise<string> => {
    // If already a data URL, return as-is
    if (url.startsWith("data:")) {
      return url;
    }
    // For external URLs, fetch and convert to base64
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const handleSocialIconUpload = (platform: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Maksimum ukuran file adalah 1MB.",
        variant: "destructive",
      });
      return;
    }
    
    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml|webp|gif)$/)) {
      toast({
        title: "Format file tidak valid",
        description: "Gunakan file PNG, JPG, SVG, WebP, atau GIF.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingSocialIcon(platform);
    const reader = new FileReader();
    reader.onloadend = () => {
      const key = `socialCustom${platform.charAt(0).toUpperCase() + platform.slice(1)}` as keyof typeof socialConfig;
      setSocialConfig({ ...socialConfig, [key]: reader.result as string });
      setUploadingSocialIcon(null);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveSocialIcon = (platform: string) => {
    const key = `socialCustom${platform.charAt(0).toUpperCase() + platform.slice(1)}` as keyof typeof socialConfig;
    setSocialConfig({ ...socialConfig, [key]: "" });
  };

  const handleRemoveBackground = async () => {
    if (!config.iconUrl) return;
    
    // Check limit before proceeding
    if (bgRemovalStatus && bgRemovalStatus.limit >= 0 && bgRemovalStatus.used >= bgRemovalStatus.limit) {
      toast({ 
        title: "Limit reached", 
        description: `You've used all ${bgRemovalStatus.limit} background removals this month. Upgrade your plan for more.`,
        variant: "destructive" 
      });
      return;
    }
    
    setIsRemovingBg(true);
    try {
      // Convert URL to base64 data URL if needed
      const base64Url = await convertToBase64DataUrl(config.iconUrl);
      const response = await apiRequest("POST", "/api/image/remove-background", {
        imageUrl: base64Url,
      }) as { imageUrl?: string; used?: number; limit?: number; limitReached?: boolean };
      
      if (response.limitReached) {
        toast({ 
          title: "Limit reached", 
          description: `You've used all ${response.limit} background removals this month.`,
          variant: "destructive" 
        });
        setBgRemovalStatus({ used: response.used || 0, limit: response.limit || 0 });
        return;
      }
      
      if (response.imageUrl) {
        setConfig({ ...config, iconUrl: response.imageUrl });
        // Update local status
        if (response.used !== undefined && response.limit !== undefined) {
          setBgRemovalStatus({ used: response.used, limit: response.limit });
        }
        refetchBgStatus();
        toast({ title: "Background removed", description: "Image background has been removed." });
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      toast({ 
        title: "Failed to remove background", 
        description: error?.message || "Please try again.", 
        variant: "destructive" 
      });
    }
    setIsRemovingBg(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Always save icon settings to merchant config (iconUrl, iconWidth, iconHeight are merchant-level settings)
      const merchantIconConfig = {
        iconUrl: config.iconUrl,
        iconVisible: config.iconVisible,
        iconSize: config.iconSize,
        iconWidth: config.iconWidth,
        iconHeight: config.iconHeight,
        useCustomIconDimensions: config.useCustomIconDimensions,
        mobileIconWidth: config.mobileIconWidth,
        mobileIconHeight: config.mobileIconHeight,
        widgetOffset: config.widgetOffset,
        iconAnimationVertical: config.iconAnimationVertical,
        iconAnimationHorizontal: config.iconAnimationHorizontal,
        iconAnimationZoom: config.iconAnimationZoom,
        iconAnimationRotation: config.iconAnimationRotation,
        iconAnimationSpeed: config.iconAnimationSpeed,
        online: config.online,
      };
      await apiRequest("POST", "/api/merchant/config", merchantIconConfig);
      
      if (merchant?.activeAgentId) {
        // Save agent-specific widget settings
        return apiRequest("POST", `/api/agents/${merchant.activeAgentId}/widget-settings`, {
          primaryColor: config.primaryColor,
          widgetTheme: config.widgetTheme,
          bubblePosition: config.bubblePosition,
          widgetWelcomeMessage: config.welcomeMessage,
          photoUrl: config.agentPhotoUrl,
          name: config.agentName,
        });
      } else {
        // Save remaining merchant config when no active agent
        return apiRequest("POST", "/api/merchant/config", {
          primaryColor: config.primaryColor,
          welcomeMessage: config.welcomeMessage,
          agentName: config.agentName,
          agentPhotoUrl: config.agentPhotoUrl,
          widgetTheme: config.widgetTheme,
          bubblePosition: config.bubblePosition,
          allowedDomains: config.allowedDomains,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      if (merchant?.activeAgentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/agents", merchant.activeAgentId, "widget-settings"] });
      }
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

  const selectAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest("POST", "/api/merchant/select-agent", { agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent selected",
        description: "The widget will now use the selected agent's settings.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to select agent",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const socialMediaMutation = useMutation({
    mutationFn: async (data: { 
      socialMediaEnabled?: boolean;
      socialIconStyle?: "colored" | "3d-metal" | "3d-golden" | "flat-white" | "flat-black" | "custom";
      socialInstagram?: string;
      socialFacebook?: string;
      socialTelegram?: string;
      socialWhatsapp?: string;
      socialDiscord?: string;
      socialUseCustomIcons?: boolean;
      socialCustomInstagram?: string;
      socialCustomFacebook?: string;
      socialCustomTelegram?: string;
      socialCustomWhatsapp?: string;
      socialCustomDiscord?: string;
    }) => {
      return apiRequest("POST", "/api/merchant/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Social media settings saved",
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

  const preChatMutation = useMutation({
    mutationFn: async (data: { 
      welcomeDescription?: string;
      quickMessageOptions?: string[];
      prechatBannerUrl?: string;
    }) => {
      return apiRequest("POST", "/api/merchant/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Pre-chat form saved",
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
  
  // Cache-busting version - updates when page loads to ensure latest script
  const cacheVersion = Math.floor(Date.now() / 1000);
  
  // Simple embed code - easy to copy and paste (with cache-busting)
  const widgetEmbedCode = `<!-- Chatvice Chat Widget -->
<script src="${baseUrl}/api/widget/chatvice.js?merchant=${merchantId}&v=${cacheVersion}" async></script>`;

  const widgetPath = widgetSlug || merchantId;

  // Full-page iframe embed code (with cache-busting)
  const iframeEmbedCode = `<!-- Chatvice Chat Widget (iFrame) -->
<iframe
  src="${baseUrl}/${widgetPath}?showClose=true&embedded=true&v=${cacheVersion}"
  style="position:fixed;bottom:20px;right:20px;width:380px;height:550px;border:none;z-index:99999;"
  allow="microphone; camera"
></iframe>`;

  // Code examples for different frameworks
  const codeExamples = {
    nodejs: `// server.js (Node.js / Express)
const jwt = require('jsonwebtoken');

const CHATVICE_SECRET = process.env.CHATVICE_IDENTITY_SECRET;

app.get('/api/chatvice-token', async (req, res) => {
  // Get user from your session/auth
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const token = jwt.sign(
    { 
      user_id: user.id,
      email: user.email,
      name: user.name,
      // Add custom attributes as needed
      plan: user.subscriptionPlan,
      company: user.company,
    }, 
    CHATVICE_SECRET, 
    { expiresIn: '1h' }
  );
  
  res.json({ token });
});`,

    php: `<?php
// chatvice-token.php (PHP)
require 'vendor/autoload.php';
use Firebase\\JWT\\JWT;

$secret = getenv('CHATVICE_IDENTITY_SECRET');

// Get authenticated user from your session
session_start();
$user = $_SESSION['user'] ?? null;

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$payload = [
    'user_id' => $user['id'],
    'email' => $user['email'],
    'name' => $user['name'],
    'iat' => time(),
    'exp' => time() + 3600, // 1 hour
];

$token = JWT::encode($payload, $secret, 'HS256');
echo json_encode(['token' => $token]);`,

    python: `# chatvice_token.py (Python / Flask)
import jwt
import os
from datetime import datetime, timedelta
from flask import jsonify
from flask_login import current_user, login_required

CHATVICE_SECRET = os.environ.get('CHATVICE_IDENTITY_SECRET')

@app.route('/api/chatvice-token')
@login_required
def get_chatvice_token():
    payload = {
        'user_id': str(current_user.id),
        'email': current_user.email,
        'name': current_user.name,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    
    token = jwt.encode(payload, CHATVICE_SECRET, algorithm='HS256')
    return jsonify({'token': token})`,

    client: `// frontend.js (Browser / Client-side)
async function initChatviceIdentity() {
  try {
    // Fetch token from your backend after user logs in
    const response = await fetch('/api/chatvice-token', {
      credentials: 'include' // Include session cookies
    });
    
    if (!response.ok) {
      console.log('User not logged in - using anonymous chat');
      return;
    }
    
    const { token } = await response.json();
    
    // Identify user to Chatvice widget
    window.chatvice('identify', { token });
    
    console.log('User identified to Chatvice');
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

// Call after user login or page load
document.addEventListener('DOMContentLoaded', initChatviceIdentity);

// Or call after successful login
async function handleLogin() {
  await loginUser(); // Your login logic
  await initChatviceIdentity(); // Then identify to Chatvice
}`,
  };

  const [selectedCodeExample, setSelectedCodeExample] = useState<keyof typeof codeExamples>('nodejs');
  
  const identityVerificationCode = codeExamples[selectedCodeExample];

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("dashboard.widget.title")}</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Customize your chat widget appearance and get embed codes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshWidget}
            data-testid="button-refresh-widget"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("dashboard.widget.refresh")}</span>
          </Button>
        {agents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">{t("dashboard.widget.configuring")}:</span>
            <Select
              value={merchant?.activeAgentId || "none"}
              onValueChange={(value) => {
                if (value !== "none") {
                  selectAgentMutation.mutate(value);
                }
              }}
              disabled={selectAgentMutation.isPending}
            >
              <SelectTrigger className="w-[160px] sm:w-[200px]" data-testid="select-agent-widget">
                <div className="flex items-center gap-2">
                  {activeAgent ? (
                    <>
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={activeAgent.photoUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          <Bot className="w-3 h-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{activeAgent.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select agent...</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent>
                {!merchant?.activeAgentId && (
                  <SelectItem value="none" disabled>
                    <span className="text-muted-foreground">Select an agent to configure...</span>
                  </SelectItem>
                )}
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id} data-testid={`select-widget-agent-option-${agent.id}`}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={agent.photoUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          <Bot className="w-3 h-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span>{agent.name}</span>
                      {agent.id === merchant?.activeAgentId && (
                        <Badge variant="secondary" className="text-[10px] ml-1">{t("common.active")}</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        </div>
      </div>

      <Tabs defaultValue="appearance">
        <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-5 md:w-full gap-1">
            <TabsTrigger value="appearance" className="whitespace-nowrap px-4">{t("dashboard.widget.appearance")}</TabsTrigger>
            <TabsTrigger value="prechat" className="whitespace-nowrap px-4">{t("dashboard.widget.preChat")}</TabsTrigger>
            <TabsTrigger value="social" className="whitespace-nowrap px-4">{t("dashboard.widget.socialLinks")}</TabsTrigger>
            <TabsTrigger value="embed" className="whitespace-nowrap px-4">{t("dashboard.widget.embed")}</TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 whitespace-nowrap px-4">
              Security
              {!canUseAdvancedFeatures && <Lock className="w-3 h-3" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="appearance" className="mt-6">
          <div className="space-y-6">
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
                      <div className="flex items-center justify-between">
                        <Label>Widget Button Icon</Label>
                        {config.iconUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1"
                            onClick={() => setConfig({ ...config, iconVisible: !config.iconVisible })}
                            data-testid="button-toggle-icon-visibility"
                          >
                            {config.iconVisible !== false ? (
                              <>
                                <Eye className="w-4 h-4" />
                                <span className="text-xs">Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Hidden</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div 
                            className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 border-muted ${config.iconVisible === false ? 'opacity-40' : ''}`}
                            style={{ backgroundColor: config.primaryColor + '20' }}
                          >
                            {config.iconUrl ? (
                              <img 
                                src={config.iconUrl} 
                                alt="Widget icon" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bot className="w-12 h-12" style={{ color: config.primaryColor }} />
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                            onClick={() => iconFileInputRef.current?.click()}
                            disabled={isUploadingIcon}
                            data-testid="button-upload-icon"
                          >
                            {isUploadingIcon ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </Button>
                          <input
                            ref={iconFileInputRef}
                            type="file"
                            accept="image/png,image/gif,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={handleIconUpload}
                            data-testid="input-icon-file"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div 
                              className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 break-all line-clamp-1 overflow-hidden shrink min-w-0"
                              title={config.iconUrl || "No icon selected"}
                            >
                              {config.iconUrl ? (
                                config.iconUrl.length > 30 ? config.iconUrl.substring(0, 30) + "..." : config.iconUrl
                              ) : (
                                <span className="italic">No custom icon</span>
                              )}
                            </div>
                            {config.iconUrl && (
                              <div className="hidden md:flex items-center gap-1.5 shrink-0 overflow-x-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFlipImage("horizontal")}
                                  disabled={isProcessingImage}
                                  data-testid="button-flip-horizontal-desktop"
                                >
                                  {isProcessingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                                  Flip H
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFlipImage("vertical")}
                                  disabled={isProcessingImage}
                                  data-testid="button-flip-vertical-desktop"
                                >
                                  {isProcessingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                                  Flip V
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleConvertToWebP}
                                  disabled={isProcessingImage || config.iconUrl.startsWith('data:image/webp')}
                                  data-testid="button-convert-webp-desktop"
                                >
                                  {isProcessingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                  Save WebP
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRemoveBackground}
                                  disabled={isRemovingBg || (bgRemovalStatus !== null && bgRemovalStatus.limit >= 0 && bgRemovalStatus.used >= bgRemovalStatus.limit)}
                                  data-testid="button-remove-bg-desktop"
                                >
                                  {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Frame className="w-3.5 h-3.5" />}
                                  Remove BG
                                  {bgRemovalStatus && bgRemovalStatus.limit > 0 && (
                                    <span className="text-[10px] text-muted-foreground ml-0.5">({bgRemovalStatus.limit - bgRemovalStatus.used})</span>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setConfig({ ...config, iconUrl: "" })}
                                  data-testid="button-remove-icon"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                          {/* Mobile: action buttons grid */}
                          {config.iconUrl && (
                            <div className="grid grid-cols-2 gap-2 md:hidden">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFlipImage("horizontal")}
                                disabled={isProcessingImage}
                                data-testid="button-flip-horizontal"
                                className="w-full justify-start"
                              >
                                {isProcessingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                                Flip Horizontal
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFlipImage("vertical")}
                                disabled={isProcessingImage}
                                data-testid="button-flip-vertical"
                                className="w-full justify-start"
                              >
                                {isProcessingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                                Flip Vertical
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleConvertToWebP}
                                disabled={isProcessingImage || config.iconUrl.startsWith('data:image/webp')}
                                data-testid="button-convert-webp"
                                className="w-full justify-start"
                              >
                                {isProcessingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                Save as WebP
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveBackground}
                                disabled={isRemovingBg || (bgRemovalStatus !== null && bgRemovalStatus.limit >= 0 && bgRemovalStatus.used >= bgRemovalStatus.limit)}
                                data-testid="button-remove-bg"
                                className="w-full justify-start"
                              >
                                {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Frame className="w-3.5 h-3.5" />}
                                Remove BG
                                {bgRemovalStatus && bgRemovalStatus.limit > 0 && (
                                  <span className="text-[10px] text-muted-foreground ml-0.5">({bgRemovalStatus.limit - bgRemovalStatus.used})</span>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfig({ ...config, iconUrl: "" })}
                                data-testid="button-remove-icon-mobile"
                                className="w-full justify-start text-destructive col-span-2"
                              >
                                <X className="w-3.5 h-3.5" />
                                Remove Icon
                              </Button>
                            </div>
                          )}
                          {bgRemovalStatus && bgRemovalStatus.limit === 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              <Lock className="w-3 h-3 inline mr-1" />
                              Background removal requires Starter plan or higher
                            </p>
                          )}
                          {bgRemovalStatus && bgRemovalStatus.limit > 0 && bgRemovalStatus.used >= bgRemovalStatus.limit && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Monthly limit reached ({bgRemovalStatus.used}/{bgRemovalStatus.limit})
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Supports PNG, GIF, JPG, SVG, WebP. Max 2MB.
                          </p>
                        </div>
                      </div>
                      
                      {/* Icon Templates Section */}
                      <div className="pt-3 border-t">
                        <Label className="text-sm font-medium mb-3 block">Choose from Templates</Label>
                        
                        <div className="flex gap-4 overflow-x-auto pb-1">
                          <div className="flex-shrink-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Men</p>
                            <div className="flex gap-1.5">
                              {[
                                { id: 'male-cs-blue-shirt', name: 'CS Blue Shirt', ext: 'webp' },
                                { id: 'male-cs-suit', name: 'CS Suit', ext: 'webp' },
                                { id: 'male-casual-gray', name: 'Casual Gray', ext: 'webp' },
                                { id: 'male-cs-blue-standing', name: 'CS Standing', ext: 'webp' },
                              ].map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  className={cn(
                                    "relative rounded-md overflow-hidden border-2 transition-all w-[56px] h-[56px]",
                                    config.iconUrl === `/icon-templates/${template.id}.${template.ext}`
                                      ? "border-primary ring-2 ring-primary/30"
                                      : "border-muted hover:border-primary/50"
                                  )}
                                  onClick={() => setConfig({ ...config, iconUrl: `/icon-templates/${template.id}.${template.ext}` })}
                                  title={template.name}
                                  data-testid={`button-template-${template.id}`}
                                >
                                  <img
                                    src={`/icon-templates/${template.id}.${template.ext}`}
                                    alt={template.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {config.iconUrl === `/icon-templates/${template.id}.${template.ext}` && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                      <Check className="w-3 h-3 text-primary" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Women</p>
                            <div className="flex gap-1.5">
                              {[
                                { id: 'female-cs-red', name: 'CS Red', ext: 'png' },
                                { id: 'female-cs-white', name: 'CS White', ext: 'png' },
                                { id: 'female-cs-red-shirt', name: 'CS Red Shirt', ext: 'png' },
                                { id: 'female-cs-purple', name: 'CS Purple', ext: 'png' },
                              ].map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  className={cn(
                                    "relative rounded-md overflow-hidden border-2 transition-all w-[56px] h-[56px]",
                                    config.iconUrl === `/icon-templates/${template.id}.${template.ext}`
                                      ? "border-primary ring-2 ring-primary/30"
                                      : "border-muted hover:border-primary/50"
                                  )}
                                  onClick={() => setConfig({ ...config, iconUrl: `/icon-templates/${template.id}.${template.ext}` })}
                                  title={template.name}
                                  data-testid={`button-template-${template.id}`}
                                >
                                  <img
                                    src={`/icon-templates/${template.id}.${template.ext}`}
                                    alt={template.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {config.iconUrl === `/icon-templates/${template.id}.${template.ext}` && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                      <Check className="w-3 h-3 text-primary" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Icons</p>
                            <div className="flex gap-1.5">
                              {[
                                { id: 'astronaut', name: 'Astronaut', ext: 'png' },
                                { id: 'rocket', name: 'Rocket', ext: 'webp' },
                                { id: 'gold-coin', name: 'Gold Coin', ext: 'png' },
                                { id: 'chat-bubble', name: 'Chat Bubble', ext: 'png' },
                              ].map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  className={cn(
                                    "relative rounded-md overflow-hidden border-2 transition-all w-[56px] h-[56px]",
                                    config.iconUrl === `/icon-templates/${template.id}.${template.ext}`
                                      ? "border-primary ring-2 ring-primary/30"
                                      : "border-muted hover:border-primary/50"
                                  )}
                                  onClick={() => setConfig({ ...config, iconUrl: `/icon-templates/${template.id}.${template.ext}` })}
                                  title={template.name}
                                  data-testid={`button-template-${template.id}`}
                                >
                                  <img
                                    src={`/icon-templates/${template.id}.${template.ext}`}
                                    alt={template.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {config.iconUrl === `/icon-templates/${template.id}.${template.ext}` && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                      <Check className="w-3 h-3 text-primary" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-3">
                          Click to use a pre-designed icon template
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-primary" />
                          <Label className="font-semibold">Desktop Icon Size</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-sm">Width</Label>
                              <span className="text-sm text-muted-foreground">{config.iconWidth}px</span>
                            </div>
                            <Slider
                              value={[config.iconWidth]}
                              onValueChange={([value]) => setConfig({ 
                                ...config, 
                                iconWidth: value,
                                iconSize: value
                              })}
                              min={config.iconUrl ? 30 : 50}
                              max={config.iconUrl ? 400 : 100}
                              step={5}
                              data-testid="slider-desktop-icon-width"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-sm">Height</Label>
                              <span className="text-sm text-muted-foreground">{config.iconHeight}px</span>
                            </div>
                            <Slider
                              value={[config.iconHeight]}
                              onValueChange={([value]) => setConfig({ 
                                ...config, 
                                iconHeight: value
                              })}
                              min={config.iconUrl ? 30 : 50}
                              max={config.iconUrl ? 400 : 100}
                              step={5}
                              data-testid="slider-desktop-icon-height"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-primary" />
                          <Label className="font-semibold">Mobile Icon Size</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-sm">Width</Label>
                              <span className="text-sm text-muted-foreground">{config.mobileIconWidth}px</span>
                            </div>
                            <Slider
                              value={[config.mobileIconWidth]}
                              onValueChange={([value]) => setConfig({ 
                                ...config, 
                                mobileIconWidth: value
                              })}
                              min={30}
                              max={120}
                              step={5}
                              data-testid="slider-mobile-icon-width"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-sm">Height</Label>
                              <span className="text-sm text-muted-foreground">{config.mobileIconHeight}px</span>
                            </div>
                            <Slider
                              value={[config.mobileIconHeight]}
                              onValueChange={([value]) => setConfig({ 
                                ...config, 
                                mobileIconHeight: value
                              })}
                              min={30}
                              max={120}
                              step={5}
                              data-testid="slider-mobile-icon-height"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Mobile has safety caps: max 50% screen width, 35% screen height.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Widget Position (from edge)</Label>
                          <span className="text-sm text-muted-foreground">{config.widgetOffset || 20}px</span>
                        </div>
                        <Slider
                          value={[config.widgetOffset || 20]}
                          onValueChange={([value]) => setConfig({ ...config, widgetOffset: value })}
                          min={10}
                          max={50}
                          step={5}
                          data-testid="slider-widget-offset"
                        />
                        <p className="text-xs text-muted-foreground">
                          Distance from screen edge (bottom and {config.bubblePosition === "left" ? "left" : "right"}).
                        </p>
                      </div>

                      {/* Icon Animation Settings */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <Label className="text-base font-semibold">Icon Animations</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add eye-catching animations to your widget icon. You can combine multiple animations.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Up & Down</span>
                            </div>
                            <Switch
                              checked={config.iconAnimationVertical}
                              onCheckedChange={(checked) => setConfig({ ...config, iconAnimationVertical: checked })}
                              data-testid="switch-animation-vertical"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Left & Right</span>
                            </div>
                            <Switch
                              checked={config.iconAnimationHorizontal}
                              onCheckedChange={(checked) => setConfig({ ...config, iconAnimationHorizontal: checked })}
                              data-testid="switch-animation-horizontal"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <ZoomIn className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Zoom In/Out</span>
                            </div>
                            <Switch
                              checked={config.iconAnimationZoom}
                              onCheckedChange={(checked) => setConfig({ ...config, iconAnimationZoom: checked })}
                              data-testid="switch-animation-zoom"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <RotateCw className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Rotation</span>
                            </div>
                            <Switch
                              checked={config.iconAnimationRotation}
                              onCheckedChange={(checked) => setConfig({ ...config, iconAnimationRotation: checked })}
                              data-testid="switch-animation-rotation"
                            />
                          </div>
                        </div>
                        
                        {(config.iconAnimationVertical || config.iconAnimationHorizontal || config.iconAnimationZoom || config.iconAnimationRotation) && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-sm">Animation Speed</Label>
                              <span className="text-sm text-muted-foreground">
                                {config.iconAnimationSpeed === 1 ? "Very Slow" : 
                                 config.iconAnimationSpeed <= 3 ? "Slow" : 
                                 config.iconAnimationSpeed <= 5 ? "Medium" : 
                                 config.iconAnimationSpeed <= 7 ? "Fast" : "Very Fast"}
                              </span>
                            </div>
                            <Slider
                              value={[config.iconAnimationSpeed]}
                              onValueChange={([value]) => setConfig({ ...config, iconAnimationSpeed: value })}
                              min={1}
                              max={10}
                              step={1}
                              data-testid="slider-animation-speed"
                            />
                            <p className="text-xs text-muted-foreground">
                              Lower values = slower, smoother animations.
                            </p>
                          </div>
                        )}
                      </div>
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

                      {agents.length > 0 && (
                        <div className="space-y-2">
                          <Label>Select Active Agent</Label>
                          <Select
                            value={merchant?.activeAgentId || ""}
                            onValueChange={(value) => selectAgentMutation.mutate(value)}
                            disabled={selectAgentMutation.isPending}
                          >
                            <SelectTrigger data-testid="select-active-agent">
                              <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={agent.photoUrl || ""} />
                                      <AvatarFallback className="text-xs">
                                        <Bot className="w-3 h-3" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{agent.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            The selected agent's knowledge base and settings will be used
                          </p>
                        </div>
                      )}
                      
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
                            placeholder="Chatvice"
                            data-testid="input-agent-name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Or Choose Avatar</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setConfig({ ...config, agentPhotoUrl: `/avatars/avatar-${num}.jpg` })}
                              className={`relative rounded-md overflow-hidden border-2 transition-all hover:opacity-80 active:scale-95 w-[56px] h-[56px] ${
                                config.agentPhotoUrl === `/avatars/avatar-${num}.jpg` 
                                  ? 'border-primary ring-2 ring-primary/30' 
                                  : 'border-muted hover:border-muted-foreground/50'
                              }`}
                              data-testid={`button-avatar-${num}`}
                            >
                              <img
                                src={`/avatars/avatar-${num}.jpg`}
                                alt={`Avatar ${num}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {config.agentPhotoUrl === `/avatars/avatar-${num}.jpg` && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-primary" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Click an avatar to select, or upload your own image above
                        </p>
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

                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5 flex-1">
                          <Label>Proactive Chat</Label>
                          <p className="text-xs text-muted-foreground">
                            Configure AI proactive greetings, greeting delay timer, ding sound, and welcome message templates.
                          </p>
                        </div>
                        <Link href="/dashboard/proactive-chat">
                          <Button variant="outline" size="sm" data-testid="button-go-proactive-chat">
                            Configure
                          </Button>
                        </Link>
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

          </div>
        </TabsContent>

        <TabsContent value="prechat" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <CardTitle>Pre-Chat Form</CardTitle>
              </div>
              <CardDescription>
                Customize the welcome screen that customers see before starting a chat. Add a custom description and quick message options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Welcome Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!merchant) return;
                      setIsGeneratingDescription(true);
                      try {
                        const response = await apiRequest("POST", "/api/ai/generate-welcome-description", {
                          businessName: merchant.companyName || merchant.username || "My Business",
                          industry: "general business"
                        });
                        const data = await response.json();
                        if (data.description) {
                          setPreChatConfig({ ...preChatConfig, welcomeDescription: data.description });
                          toast({
                            title: "Description generated",
                            description: "AI has created a welcome description for you.",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Generation failed",
                          description: "Could not generate description. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setIsGeneratingDescription(false);
                      }
                    }}
                    disabled={isGeneratingDescription}
                    data-testid="button-generate-description"
                  >
                    {isGeneratingDescription ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add a custom description that appears above the name field. Use this to provide important information or links to customers.
                </p>
                <Textarea
                  placeholder="Enter your welcome description here... (supports links and text)"
                  value={preChatConfig.welcomeDescription}
                  onChange={(e) => setPreChatConfig({ ...preChatConfig, welcomeDescription: e.target.value })}
                  className="min-h-[120px]"
                  data-testid="textarea-welcome-description"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-base font-medium">Pre-Chat Banner Image</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Banner image displayed below the chat header, edge-to-edge. Supported formats: JPG, PNG, GIF, WebP.
                  </p>
                </div>
                
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
                      return;
                    }
                    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4"];
                    if (!allowed.includes(file.type)) {
                      toast({ title: "Invalid format", description: "Only JPG, PNG, GIF, WebP, MP4 are allowed.", variant: "destructive" });
                      return;
                    }
                    setUploadingBanner(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("type", "prechat_banner");
                      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                      if (!res.ok) throw new Error("Upload failed");
                      const data = await res.json();
                      setPreChatConfig({ ...preChatConfig, prechatBannerUrl: data.url });
                      toast({ title: "Banner uploaded", description: "Click Save to apply changes." });
                    } catch {
                      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
                    } finally {
                      setUploadingBanner(false);
                      if (bannerInputRef.current) bannerInputRef.current.value = "";
                    }
                  }}
                  data-testid="input-prechat-banner-upload"
                />

                {preChatConfig.prechatBannerUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-md overflow-hidden border">
                      {preChatConfig.prechatBannerUrl.match(/\.mp4/i) ? (
                        <video
                          src={preChatConfig.prechatBannerUrl}
                          className="w-full h-auto object-contain"
                          style={{ display: "block", maxHeight: "200px" }}
                          autoPlay
                          loop
                          muted
                          playsInline
                          data-testid="video-prechat-banner-preview"
                        />
                      ) : (
                        <img
                          src={preChatConfig.prechatBannerUrl}
                          alt="Pre-chat banner preview"
                          className="w-full h-auto object-contain"
                          style={{ display: "block", maxHeight: "200px" }}
                          data-testid="img-prechat-banner-preview"
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingBanner}
                        data-testid="button-change-prechat-banner"
                      >
                        {uploadingBanner ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                        Change Image
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreChatConfig({ ...preChatConfig, prechatBannerUrl: "" })}
                        data-testid="button-remove-prechat-banner"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:border-primary/50"
                    onClick={() => bannerInputRef.current?.click()}
                    data-testid="button-upload-prechat-banner"
                  >
                    {uploadingBanner ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">Click to upload banner image or video</p>
                    <p className="text-xs text-muted-foreground">Max 5MB &middot; JPG, PNG, GIF, WebP, MP4</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Quick Message Options</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add predefined message options that customers can select before starting a chat.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a quick message option..."
                    value={newQuickMessage}
                    onChange={(e) => setNewQuickMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newQuickMessage.trim()) {
                        e.preventDefault();
                        setPreChatConfig({
                          ...preChatConfig,
                          quickMessageOptions: [...preChatConfig.quickMessageOptions, newQuickMessage.trim()]
                        });
                        setNewQuickMessage("");
                      }
                    }}
                    data-testid="input-new-quick-message"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newQuickMessage.trim()) {
                        setPreChatConfig({
                          ...preChatConfig,
                          quickMessageOptions: [...preChatConfig.quickMessageOptions, newQuickMessage.trim()]
                        });
                        setNewQuickMessage("");
                      }
                    }}
                    data-testid="button-add-quick-message"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {preChatConfig.quickMessageOptions.length > 0 && (
                  <div className="space-y-2">
                    {preChatConfig.quickMessageOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <span className="flex-1 text-sm">{option}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const newOptions = [...preChatConfig.quickMessageOptions];
                            newOptions.splice(index, 1);
                            setPreChatConfig({ ...preChatConfig, quickMessageOptions: newOptions });
                          }}
                          data-testid={`button-remove-quick-message-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {preChatConfig.quickMessageOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No quick message options added yet.</p>
                )}
              </div>

              <Separator />

              <Button
                onClick={() => preChatMutation.mutate(preChatConfig)}
                disabled={preChatMutation.isPending}
                className="w-full"
                data-testid="button-save-prechat"
              >
                {preChatMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Pre-Chat Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <CardTitle>Allowed Domains</CardTitle>
                </div>
                {domainsData && (
                  <Badge variant="secondary" data-testid="badge-domain-count">
                    {domainsData.used} / {domainsData.limit} domains
                  </Badge>
                )}
              </div>
              <CardDescription>
                Register domains where your widget can be embedded. Each domain requires validation to ensure the widget is properly installed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new domain */}
              <div className="flex gap-2">
                <Input
                  placeholder="example.com or sub.example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1"
                  data-testid="input-new-domain"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDomain.trim()) {
                      addDomainMutation.mutate(newDomain.trim());
                    }
                  }}
                />
                {domainsData && domainsData.used >= domainsData.limit ? (
                  <Link href="/dashboard/plans">
                    <Button data-testid="button-upgrade-domain-limit">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => newDomain.trim() && addDomainMutation.mutate(newDomain.trim())}
                    disabled={!newDomain.trim() || addDomainMutation.isPending}
                    data-testid="button-add-domain"
                  >
                    {addDomainMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Domain
                  </Button>
                )}
              </div>

              {/* Domain list */}
              {domainsData?.domains && domainsData.domains.length > 0 ? (
                <div className="space-y-2">
                  {domainsData.domains.map((domain) => (
                    <div 
                      key={domain.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      data-testid={`domain-item-${domain.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {domain.isValidated ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium font-mono text-sm">{domain.domain}</span>
                            <a 
                              href={`https://${domain.domain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {domain.isValidated ? (
                              <span className="text-green-600">Validated</span>
                            ) : (
                              <span className="text-amber-600">Pending validation</span>
                            )}
                            {domain.lastCheckedAt && (
                              <span>• Last checked: {new Date(domain.lastCheckedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateDomainMutation.mutate(domain.id)}
                          disabled={validatingDomainId === domain.id}
                          data-testid={`button-validate-domain-${domain.id}`}
                        >
                          {validatingDomainId === domain.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span className="ml-1.5 hidden sm:inline">Validate</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDomainMutation.mutate(domain.id)}
                          disabled={deleteDomainMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-domain-${domain.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No domains registered</p>
                  <p className="text-sm">Add a domain to restrict where your widget can be embedded.</p>
                </div>
              )}

              {/* Info box */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Validation:</strong> After adding a domain, install the widget embed code on your website, 
                  then click "Validate" to confirm. Only validated domains will be allowed to use the widget.
                </p>
              </div>

              {/* Plan upgrade prompt for limit reached */}
              {domainsData && domainsData.used >= domainsData.limit && domainsData.planId !== "custom" && (
                <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Crown className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Need more domains?</p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade your plan to add more allowed domains for your widget.
                    </p>
                  </div>
                  <Link href="/dashboard/plans">
                    <Button size="sm" data-testid="button-upgrade-for-more-domains">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
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
                Choose how to embed your Chatvice agent on your website.
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
                Paste this code on your website to install the chat widget and enable AI-powered support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <pre className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {embedType === "widget" ? widgetEmbedCode : iframeEmbedCode}
                </pre>
                <Button
                  size="sm"
                  className="mt-2 chatvice-gradient-btn text-white border-0 min-w-[120px]"
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
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Globe className="w-4 h-4" />
                <span>Your widget URL:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs break-all">{baseUrl}/{widgetPath}</code>
                <Button
                  size="sm"
                  className="chatvice-gradient-btn text-white border-0"
                  onClick={() => handleCopy(`${baseUrl}/${widgetPath}`, "Widget URL")}
                  data-testid="button-copy-widget-url"
                >
                  {copied === "Widget URL" ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy URL
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <CardTitle>{t("dashboard.widget.socialLinks")}</CardTitle>
              </div>
              <CardDescription>
                Add social media icons to your widget so customers can connect with you on different platforms.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Enable Social Media Icons</Label>
                  <p className="text-sm text-muted-foreground">Show social media links in your chat widget</p>
                </div>
                <Switch
                  checked={socialConfig.socialMediaEnabled}
                  onCheckedChange={(checked) => {
                    setSocialConfig({ ...socialConfig, socialMediaEnabled: checked });
                  }}
                  data-testid="switch-social-enabled"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-medium">Icon Style Template</Label>
                <p className="text-sm text-muted-foreground">Choose a visual style for your social media icons</p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {([
                    { value: "colored", label: "Colored", preview: (
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E4405F' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#25D366' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                      </div>
                    )},
                    { value: "3d-metal", label: "3D Metal", preview: (
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #d4d4d8, #a1a1aa)', boxShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 3px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.4)' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#3f3f46"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #d4d4d8, #a1a1aa)', boxShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 3px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.4)' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#3f3f46"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                      </div>
                    )},
                    { value: "3d-golden", label: "3D Golden", preview: (
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #fbbf24, #b45309)', boxShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 3px rgba(251,191,36,0.5), inset 0 1px 2px rgba(255,255,255,0.4)' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#451a03"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #fbbf24, #b45309)', boxShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 3px rgba(251,191,36,0.5), inset 0 1px 2px rgba(255,255,255,0.4)' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#451a03"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                      </div>
                    )},
                    { value: "flat-white", label: "Flat White", preview: (
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#374151"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#374151"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                      </div>
                    )},
                    { value: "flat-black", label: "Flat Black", preview: (
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#18181b' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#ffffff"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#18181b' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#ffffff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                      </div>
                    )},
                    { value: "custom", label: "Custom Upload", preview: (
                      <div className="flex gap-1.5 items-center justify-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    )},
                  ] as { value: string; label: string; preview: React.ReactNode }[]).map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        socialConfig.socialIconStyle === style.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover-elevate'
                      }`}
                      onClick={() => {
                        setSocialConfig({ 
                          ...socialConfig, 
                          socialIconStyle: style.value as typeof socialConfig.socialIconStyle,
                          socialUseCustomIcons: style.value === "custom"
                        });
                      }}
                      data-testid={`button-style-${style.value}`}
                    >
                      {style.preview}
                      <span className="text-xs font-medium">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Social Media Links with Custom Icon Upload */}
              <div className="space-y-4">
                {[
                  { key: "instagram", label: "Instagram", color: "#E4405F", placeholder: "https://instagram.com/yourbrand", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                  { key: "facebook", label: "Facebook", color: "#1877F2", placeholder: "https://facebook.com/yourbrand", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                  { key: "telegram", label: "Telegram", color: "#0088cc", placeholder: "https://t.me/yourbrand", path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" },
                  { key: "whatsapp", label: "WhatsApp", color: "#25D366", placeholder: "https://wa.me/628123456789", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" },
                  { key: "discord", label: "Discord", color: "#5865F2", placeholder: "https://discord.gg/yourinvite", path: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" },
                ].map((social) => {
                  const urlKey = `social${social.key.charAt(0).toUpperCase() + social.key.slice(1)}` as keyof typeof socialConfig;
                  const customIconKey = `socialCustom${social.key.charAt(0).toUpperCase() + social.key.slice(1)}` as keyof typeof socialConfig;
                  const customIconUrl = socialConfig[customIconKey] as string;
                  
                  return (
                    <div key={social.key} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {socialConfig.socialUseCustomIcons && customIconUrl ? (
                          <img src={customIconUrl} alt={social.label} className="w-4 h-4 rounded-sm object-cover" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: social.color }} fill="currentColor">
                            <path d={social.path} />
                          </svg>
                        )}
                        {social.label}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={social.placeholder}
                          value={socialConfig[urlKey] as string}
                          onChange={(e) => setSocialConfig({ ...socialConfig, [urlKey]: e.target.value })}
                          data-testid={`input-social-${social.key}`}
                          className="flex-1"
                        />
                        {socialConfig.socialUseCustomIcons && (
                          <div className="flex gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={socialIconInputRefs[social.key as keyof typeof socialIconInputRefs]}
                              onChange={handleSocialIconUpload(social.key)}
                            />
                            {customIconUrl ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => socialIconInputRefs[social.key as keyof typeof socialIconInputRefs].current?.click()}
                                  disabled={uploadingSocialIcon === social.key}
                                  data-testid={`button-change-icon-${social.key}`}
                                >
                                  {uploadingSocialIcon === social.key ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Camera className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleRemoveSocialIcon(social.key)}
                                  data-testid={`button-remove-icon-${social.key}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => socialIconInputRefs[social.key as keyof typeof socialIconInputRefs].current?.click()}
                                disabled={uploadingSocialIcon === social.key}
                                data-testid={`button-upload-icon-${social.key}`}
                              >
                                {uploadingSocialIcon === social.key ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Icon
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>Social media links will be displayed as icons in your chat widget header.</span>
              </div>
              
              <Button 
                onClick={() => socialMediaMutation.mutate(socialConfig)}
                disabled={socialMediaMutation.isPending}
                className="w-full"
                data-testid="button-save-social"
              >
                {socialMediaMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Social Media Settings
                  </>
                )}
              </Button>
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
                    Secure your AI Agent by generating a JWT for each logged-in user and sending it to Chatvice. 
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
                        className="chatvice-gradient-btn text-white border-0 min-w-[120px]"
                        onClick={() => secretKey && handleCopy(secretKey, "Secret key")}
                        disabled={!secretKey}
                        data-testid="button-copy-secret"
                      >
                        {copied === "Secret key" ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Key
                          </>
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

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <CardTitle>How Identity Verification Works</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="flex flex-col items-center text-center p-4 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                        <span className="text-primary font-bold">1</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">User Logs In</h4>
                      <p className="text-xs text-muted-foreground">Customer logs into your website using your existing auth</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                        <span className="text-primary font-bold">2</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Generate Token</h4>
                      <p className="text-xs text-muted-foreground">Your server creates a JWT with user info using your secret key</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                        <span className="text-primary font-bold">3</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Send to Widget</h4>
                      <p className="text-xs text-muted-foreground">Your frontend calls chatvice('identify', &#123; token &#125;)</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                        <span className="text-primary font-bold">4</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Personalized Chat</h4>
                      <p className="text-xs text-muted-foreground">AI greets user by name and has access to their info</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Benefits</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">Passwords never pass through Chatvice - fully secure</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">AI agent can greet customers by name</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">Pass custom attributes like subscription plan, order ID, etc.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">Conversation history tied to verified user identity</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Code Examples */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-primary" />
                      <CardTitle>Implementation Code</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant={selectedCodeExample === 'nodejs' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedCodeExample('nodejs')}
                        data-testid="button-code-nodejs"
                      >
                        Node.js
                      </Button>
                      <Button 
                        variant={selectedCodeExample === 'php' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedCodeExample('php')}
                        data-testid="button-code-php"
                      >
                        PHP
                      </Button>
                      <Button 
                        variant={selectedCodeExample === 'python' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedCodeExample('python')}
                        data-testid="button-code-python"
                      >
                        Python
                      </Button>
                      <Button 
                        variant={selectedCodeExample === 'client' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedCodeExample('client')}
                        data-testid="button-code-client"
                      >
                        Frontend
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {selectedCodeExample === 'client' 
                      ? 'Add this code to your frontend to identify users to the Chatvice widget.'
                      : `Server-side code for ${selectedCodeExample === 'nodejs' ? 'Node.js / Express' : selectedCodeExample === 'php' ? 'PHP' : 'Python / Flask'} to generate JWT tokens.`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-[400px]">
                      {identityVerificationCode}
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 chatvice-gradient-btn text-white border-0 min-w-[120px]"
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
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {selectedCodeExample !== 'client' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-600 dark:text-amber-400">Security Reminder</p>
                          <p className="text-muted-foreground">Store your secret key as an environment variable (CHATVICE_IDENTITY_SECRET). Never expose it in client-side code or commit it to version control.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* JWT Payload Reference */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    <CardTitle>JWT Payload Reference</CardTitle>
                  </div>
                  <CardDescription>
                    Fields you can include in the JWT token to personalize the chat experience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium">Field</th>
                          <th className="text-left py-2 pr-4 font-medium">Type</th>
                          <th className="text-left py-2 pr-4 font-medium">Required</th>
                          <th className="text-left py-2 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">user_id</code></td>
                          <td className="py-2 pr-4 text-muted-foreground">string</td>
                          <td className="py-2 pr-4"><Badge variant="default" className="text-xs">Required</Badge></td>
                          <td className="py-2 text-muted-foreground">Unique identifier for the user in your system</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">email</code></td>
                          <td className="py-2 pr-4 text-muted-foreground">string</td>
                          <td className="py-2 pr-4"><Badge variant="secondary" className="text-xs">Optional</Badge></td>
                          <td className="py-2 text-muted-foreground">User's email address</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">name</code></td>
                          <td className="py-2 pr-4 text-muted-foreground">string</td>
                          <td className="py-2 pr-4"><Badge variant="secondary" className="text-xs">Optional</Badge></td>
                          <td className="py-2 text-muted-foreground">Display name - AI will greet user with this name</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">exp</code></td>
                          <td className="py-2 pr-4 text-muted-foreground">number</td>
                          <td className="py-2 pr-4"><Badge variant="default" className="text-xs">Required</Badge></td>
                          <td className="py-2 text-muted-foreground">Token expiration time (Unix timestamp). Recommended: 1 hour</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">[custom]</code></td>
                          <td className="py-2 pr-4 text-muted-foreground">any</td>
                          <td className="py-2 pr-4"><Badge variant="secondary" className="text-xs">Optional</Badge></td>
                          <td className="py-2 text-muted-foreground">Any custom fields (plan, company, order_id, etc.)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Troubleshooting */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <CardTitle>Common Issues</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm mb-1">Token verification failed</p>
                      <p className="text-xs text-muted-foreground">Make sure you're using the correct secret key. If you recently regenerated it, update your server code with the new key.</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm mb-1">Token expired</p>
                      <p className="text-xs text-muted-foreground">Generate a new token with a fresh expiration time. Consider refreshing tokens every hour or when the user performs important actions.</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm mb-1">User not being recognized</p>
                      <p className="text-xs text-muted-foreground">Ensure you're calling <code className="bg-muted px-1 rounded">window.chatvice('identify', &#123; token &#125;)</code> after the widget script has loaded and the user is authenticated.</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm mb-1">CORS errors when fetching token</p>
                      <p className="text-xs text-muted-foreground">Your token endpoint should allow requests from your website domain. Add appropriate CORS headers on your server.</p>
                    </div>
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
