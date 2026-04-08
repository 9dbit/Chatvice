import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateNotificationSoundCache } from "@/lib/sounds";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Save, Key, Copy, Check, Camera, User, Moon, Sun, Monitor, 
  Shield, Globe, Clock, MessageSquare, AlertCircle, Sparkles, Lock,
  CheckCircle2, XCircle, Loader2, ExternalLink, Mail, Eye, EyeOff, Trash2,
  Download, Server, RefreshCw, Bell, Volume2, Upload, Play, AlertTriangle, UserPlus, Square
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { NotificationSetting } from "@shared/schema";
import { useTheme } from "@/components/theme-provider";
import type { Merchant } from "@shared/schema";

export default function SettingsPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [chatTimeout, setChatTimeout] = useState(300);
  const [rateLimitMessages, setRateLimitMessages] = useState(30);
  const [rateLimitWindow, setRateLimitWindow] = useState(60);
  const [collectCustomerEmail, setCollectCustomerEmail] = useState(false);
  const [collectCustomerPhone, setCollectCustomerPhone] = useState(false);

  const [customDomain, setCustomDomain] = useState("");
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [exportingData, setExportingData] = useState(false);
  
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const defaultSounds = [
    { id: "incoming-msg", name: "Incoming Message", url: "/sounds/incoming-msg.mp3" },
    { id: "notification-alert", name: "Notification Alert", url: "/sounds/notification-alert.mp3" },
    { id: "live-chat", name: "Live Chat", url: "/sounds/live-chat.mp3" },
    { id: "alert", name: "Alert", url: "/sounds/alert.mp3" },
    { id: "new-notification", name: "New Notification", url: "/sounds/new-notification.mp3" },
    { id: "text-message", name: "Text Message", url: "/sounds/text-message.mp3" },
    { id: "gaming-lock", name: "Gaming Lock", url: "/sounds/gaming-lock.wav" },
    { id: "quick-lock", name: "Quick Lock", url: "/sounds/quick-lock.wav" },
    { id: "sci-fi-confirm", name: "Sci-Fi Confirm", url: "/sounds/sci-fi-confirm.wav" },
    { id: "interface-start", name: "Interface Start", url: "/sounds/interface-start.wav" },
  ];

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const isPro = merchant?.subscriptionPlanId === "pro" || merchant?.subscriptionPlanId === "enterprise" || merchant?.subscriptionPlanId === "custom";

  const { data: notificationSettings, isLoading: isLoadingNotifications } = useQuery<NotificationSetting>({
    queryKey: ["/api/notification-settings"],
  });

  const notificationUpdateMutation = useMutation({
    mutationFn: async (data: Partial<NotificationSetting>) => {
      return apiRequest("PUT", "/api/notification-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      invalidateNotificationSoundCache();
      toast({ title: t("dashboard.settings.toast.notificationSettingsSaved") });
    },
    onError: () => {
      toast({ title: t("dashboard.settings.toast.failedToSaveNotification"), variant: "destructive" });
    },
  });

  const customSounds = (notificationSettings?.customSounds as any[]) || [];
  const allSounds = [...defaultSounds.map(s => ({ id: s.id, name: s.name })), ...customSounds.map((s: any) => ({ id: s.url, name: s.name }))];

  async function playSound(soundId: string) {
    if (isPlayingSound) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingSound(null);
      return;
    }

    setIsPlayingSound(soundId);
    
    // Check custom sounds first
    const customSound = customSounds.find((s: any) => s.url === soundId);
    if (customSound) {
      try {
        const audio = new Audio(customSound.url);
        audio.volume = 1.0;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlayingSound(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlayingSound(null);
          audioRef.current = null;
          toast({ title: t("dashboard.settings.toast.couldNotPlaySound"), variant: "destructive" });
        };
        await audio.play();
      } catch (error) {
        setIsPlayingSound(null);
        toast({ title: t("dashboard.settings.toast.couldNotPlaySound"), variant: "destructive" });
      }
      return;
    }

    // Check default sounds (audio files)
    const defaultSound = defaultSounds.find(s => s.id === soundId);
    if (defaultSound) {
      try {
        const audio = new Audio(defaultSound.url);
        audio.volume = 1.0;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlayingSound(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlayingSound(null);
          audioRef.current = null;
          toast({ title: t("dashboard.settings.toast.couldNotPlaySound"), variant: "destructive" });
        };
        await audio.play();
      } catch (error) {
        setIsPlayingSound(null);
        toast({ title: t("dashboard.settings.toast.couldNotPlaySound"), variant: "destructive" });
      }
    } else {
      setIsPlayingSound(null);
      toast({ title: t("dashboard.settings.toast.soundNotFound"), variant: "destructive" });
    }
  }

  function handleNotificationUpdate(key: string, value: any) {
    notificationUpdateMutation.mutate({ [key]: value });
  }

  useEffect(() => {
    if (merchant) {
      setCompanyName(merchant.companyName || "");
      setProfilePhotoUrl(merchant.profilePhotoUrl || "");
      setChatTimeout(merchant.chatTimeout || 300);
      setRateLimitMessages(merchant.rateLimitMessages || 30);
      setRateLimitWindow(merchant.rateLimitWindow || 60);
      setCollectCustomerEmail(merchant.collectCustomerEmail || false);
      setCollectCustomerPhone(merchant.collectCustomerPhone || false);

      setCustomDomain(merchant.customDomain || "");
      setTwoFactorEnabled((merchant as any).twoFactorEnabled || false);
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/merchant/settings", {
        merchantId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: t("dashboard.settings.toast.settingsSaved"),
        description: t("dashboard.settings.toast.yourSettingsHaveBeenDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.settings.toast.failedToSave"),
        description: t("common.tryAgainDesc"),
        variant: "destructive",
      });
    },
  });
  
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/merchant/change-password", data);
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: t("dashboard.settings.toast.passwordChanged"),
        description: t("dashboard.settings.toast.yourPasswordHasBeenDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dashboard.settings.toast.failedToChangePassword"),
        description: error.message || "Please check your current password and try again.",
        variant: "destructive",
      });
    },
  });
  
  const sendEmailVerificationMutation = useMutation({
    mutationFn: async (data: { newEmail: string }) => {
      return apiRequest("POST", "/api/merchant/change-email/request", data);
    },
    onSuccess: () => {
      setEmailVerificationSent(true);
      toast({
        title: t("dashboard.settings.toast.verificationEmailSent"),
        description: t("dashboard.settings.toast.pleaseCheckYourCurrentDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dashboard.settings.toast.failedToSendVerification"),
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const toggle2FAMutation = useMutation({
    mutationFn: async (data: { enable: boolean; code?: string }) => {
      return apiRequest("POST", "/api/merchant/two-factor", data);
    },
    onSuccess: (_, variables) => {
      setTwoFactorDialogOpen(false);
      setTwoFactorCode("");
      setTwoFactorEnabled(variables.enable);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: variables.enable ? "2FA enabled" : "2FA disabled",
        description: variables.enable 
          ? "Two-factor authentication is now active."
          : "Two-factor authentication has been disabled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dashboard.settings.toast.failedToUpdate2fa"),
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/merchant/account", {});
    },
    onSuccess: () => {
      localStorage.clear();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: t("dashboard.settings.toast.failedToDeleteAccount"),
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateMutation.mutate({ companyName, profilePhotoUrl });
  };

  const handleSaveChatSettings = () => {
    updateMutation.mutate({ 
      chatTimeout, 
      rateLimitMessages, 
      rateLimitWindow,
      collectCustomerEmail,
      collectCustomerPhone,
    });
  };

  const handleSaveDomain = () => {
    if (!isPro) {
      toast({
        title: t("dashboard.settings.toast.upgradeRequired"),
        description: t("dashboard.settings.toast.customDomainsAreAvailableDesc"),
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ customDomain });
  };

  const handleCheckDomain = async () => {
    if (!customDomain) return;
    setIsCheckingDomain(true);
    setDomainAvailable(null);
    
    try {
      const response = await apiRequest("POST", "/api/merchant/check-domain", { domain: customDomain });
      setDomainAvailable((response as any).available);
      if ((response as any).available) {
        toast({
          title: t("dashboard.settings.toast.domainAvailable"),
          description: t("dashboard.settings.toast.thisDomainCanBeDesc"),
        });
      } else {
        toast({
          title: t("dashboard.settings.toast.domainUnavailable"),
          description: t("dashboard.settings.toast.thisDomainIsAlreadyDesc"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("dashboard.settings.toast.checkFailed"),
        description: t("dashboard.settings.toast.unableToVerifyDomainDesc"),
        variant: "destructive",
      });
    }
    setIsCheckingDomain(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(merchantId);
    setCopied(true);
    toast({
      title: t("dashboard.settings.toast.copied"),
      description: t("dashboard.settings.toast.merchantIdCopiedToDesc"),
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t("dashboard.settings.toast.invalidFileType"),
        description: t("dashboard.settings.toast.pleaseSelectAnImageDesc"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("dashboard.settings.toast.fileTooLarge"),
        description: t("dashboard.settings.toast.pleaseSelectAnImageDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setProfilePhotoUrl(base64);
        setIsUploading(false);
        toast({
          title: t("dashboard.settings.toast.photoUpdated"),
          description: t("dashboard.settings.toast.clickSaveChangesToDesc"),
        });
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
      toast({
        title: t("dashboard.settings.toast.uploadFailed"),
        description: t("common.tryAgainDesc"),
        variant: "destructive",
      });
    }
  };
  
  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t("dashboard.settings.toast.passwordsDontMatch"),
        description: t("dashboard.settings.toast.pleaseMakeSureYourDesc"),
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: t("dashboard.settings.toast.passwordTooShort"),
        description: t("dashboard.settings.toast.passwordMustBeAtDesc"),
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };
  
  const handleSendEmailVerification = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast({
        title: t("dashboard.settings.toast.invalidEmail"),
        description: t("dashboard.settings.toast.pleaseEnterAValidDesc"),
        variant: "destructive",
      });
      return;
    }
    sendEmailVerificationMutation.mutate({ newEmail });
  };
  
  const handleExportData = async () => {
    setExportingData(true);
    try {
      const response = await apiRequest("GET", "/api/merchant/export-data", {});
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chatvice-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: t("dashboard.settings.toast.exportComplete"),
        description: t("dashboard.settings.toast.yourDataHasBeenDesc"),
      });
    } catch {
      toast({
        title: t("dashboard.settings.toast.exportFailed"),
        description: t("dashboard.settings.toast.unableToExportYourDesc"),
        variant: "destructive",
      });
    }
    setExportingData(false);
  };
  
  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: t("dashboard.settings.toast.confirmationRequired"),
        description: t("dashboard.settings.toast.pleaseTypeDeleteToDesc"),
        variant: "destructive",
      });
      return;
    }
    deleteAccountMutation.mutate();
  };

  const getInitials = () => {
    return companyName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">{t("dashboard.settings.title")}</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="domain" data-testid="tab-domain">
            <Globe className="w-4 h-4 mr-2" />
            Domain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>{t("dashboard.settings.profileInfo")}</CardTitle>
                </div>
                <CardDescription>
                  Update your company profile and photo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={profilePhotoUrl} alt={companyName} />
                      <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      data-testid="button-upload-photo"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      data-testid="input-photo-file"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click the camera icon to upload a photo (max 2MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("dashboard.settings.companyName")}</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company"
                    data-testid="input-company-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("common.email")}</Label>
                  <div className="flex gap-2">
                    <Input value={merchant?.email || ""} disabled className="bg-muted flex-1" data-testid="input-email-readonly" />
                    <Button 
                      variant="outline" 
                      onClick={() => setEmailDialogOpen(true)}
                      data-testid="button-change-email"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={updateMutation.isPending}
                  className="w-full"
                  data-testid="button-save-profile"
                >
                  {updateMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-primary" />
                    <CardTitle>{t("dashboard.settings.themePreference")}</CardTitle>
                  </div>
                  <CardDescription>
                    Choose your preferred color theme.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex-1"
                      data-testid="button-theme-light"
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex-1"
                      data-testid="button-theme-dark"
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="flex-1"
                      data-testid="button-theme-system"
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    <CardTitle>{t("dashboard.settings.apiCredentials")}</CardTitle>
                  </div>
                  <CardDescription>
                    Your unique merchant ID for API access and widget integration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("dashboard.settings.merchantId")}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={merchantId}
                        readOnly
                        className="font-mono text-sm bg-muted"
                        data-testid="input-merchant-id"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyId}
                        data-testid="button-copy-merchant-id"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this ID when embedding the widget or calling the API.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle>{t("dashboard.settings.chatTimeout")}</CardTitle>
                </div>
                <CardDescription>
                  Set how long before an inactive chat session expires.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.settings.sessionTimeout")}</Label>
                  <Select 
                    value={String(chatTimeout)} 
                    onValueChange={(v) => setChatTimeout(Number(v))}
                  >
                    <SelectTrigger data-testid="select-chat-timeout">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">{t("dashboard.settings.min1")}</SelectItem>
                      <SelectItem value="120">{t("dashboard.settings.min2")}</SelectItem>
                      <SelectItem value="180">{t("dashboard.settings.min3")}</SelectItem>
                      <SelectItem value="300">{t("dashboard.settings.min5")}</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Sessions will be closed after this period of inactivity.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  <CardTitle>Rate Limiting</CardTitle>
                </div>
                <CardDescription>
                  Prevent abuse by limiting message frequency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Maximum Messages</Label>
                  <Select 
                    value={String(rateLimitMessages)} 
                    onValueChange={(v) => setRateLimitMessages(Number(v))}
                  >
                    <SelectTrigger data-testid="select-rate-limit">
                      <SelectValue placeholder="Select limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 messages</SelectItem>
                      <SelectItem value="20">20 messages</SelectItem>
                      <SelectItem value="30">30 messages</SelectItem>
                      <SelectItem value="50">50 messages</SelectItem>
                      <SelectItem value="100">100 messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Per Time Window</Label>
                  <Select 
                    value={String(rateLimitWindow)} 
                    onValueChange={(v) => setRateLimitWindow(Number(v))}
                  >
                    <SelectTrigger data-testid="select-rate-window">
                      <SelectValue placeholder="Select window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">{t("dashboard.settings.min1")}</SelectItem>
                      <SelectItem value="120">{t("dashboard.settings.min2")}</SelectItem>
                      <SelectItem value="300">{t("dashboard.settings.min5")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Customers can send {rateLimitMessages} messages per {rateLimitWindow} seconds.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>Customer Information</CardTitle>
                </div>
                <CardDescription>
                  Choose what information to collect from customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Collect Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Ask for email before starting chat
                    </p>
                  </div>
                  <Switch
                    checked={collectCustomerEmail}
                    onCheckedChange={setCollectCustomerEmail}
                    data-testid="switch-collect-email"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Collect Phone</Label>
                    <p className="text-xs text-muted-foreground">
                      Ask for phone number before starting chat
                    </p>
                  </div>
                  <Switch
                    checked={collectCustomerPhone}
                    onCheckedChange={setCollectCustomerPhone}
                    data-testid="switch-collect-phone"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <Button 
                  onClick={handleSaveChatSettings}
                  disabled={updateMutation.isPending}
                  className="w-full"
                  data-testid="button-save-chat-settings"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Chat Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {isLoadingNotifications ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4" />
              <div className="h-32 bg-muted rounded" />
            </div>
          ) : (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-500" />
                    New Incoming Chat
                  </CardTitle>
                  <CardDescription>Notification when a new customer starts a chat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="incomingEnabled">Enable Notification</Label>
                    <Switch
                      id="incomingEnabled"
                      checked={notificationSettings?.incomingChatEnabled ?? true}
                      onCheckedChange={(checked) => handleNotificationUpdate("incomingChatEnabled", checked)}
                      data-testid="switch-incoming-enabled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sound Attached</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={notificationSettings?.incomingChatSound || "incoming-msg"}
                        onValueChange={(value) => handleNotificationUpdate("incomingChatSound", value)}
                      >
                        <SelectTrigger className="flex-1" data-testid="select-incoming-sound">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allSounds.map((sound) => (
                            <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => playSound(notificationSettings?.incomingChatSound || "incoming-msg")}
                        data-testid="button-play-incoming"
                      >
                        {isPlayingSound === (notificationSettings?.incomingChatSound || "incoming-msg") ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Chat Reply
                  </CardTitle>
                  <CardDescription>Notification when there's a new message from customer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="replyEnabled">Enable Notification</Label>
                    <Switch
                      id="replyEnabled"
                      checked={notificationSettings?.chatReplyEnabled ?? true}
                      onCheckedChange={(checked) => handleNotificationUpdate("chatReplyEnabled", checked)}
                      data-testid="switch-reply-enabled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sound Attached</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={notificationSettings?.chatReplySound || "live-chat"}
                        onValueChange={(value) => handleNotificationUpdate("chatReplySound", value)}
                      >
                        <SelectTrigger className="flex-1" data-testid="select-reply-sound">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allSounds.map((sound) => (
                            <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => playSound(notificationSettings?.chatReplySound || "live-chat")}
                        data-testid="button-play-reply"
                      >
                        {isPlayingSound === (notificationSettings?.chatReplySound || "live-chat") ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Angry Customer
                  </CardTitle>
                  <CardDescription>Notification when the system detects an angry or frustrated customer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="angryEnabled">Enable Notification</Label>
                    <Switch
                      id="angryEnabled"
                      checked={notificationSettings?.angryCustomerEnabled ?? true}
                      onCheckedChange={(checked) => handleNotificationUpdate("angryCustomerEnabled", checked)}
                      data-testid="switch-angry-enabled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sound Attached</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={notificationSettings?.angryCustomerSound || "notification-alert"}
                        onValueChange={(value) => handleNotificationUpdate("angryCustomerSound", value)}
                      >
                        <SelectTrigger className="flex-1" data-testid="select-angry-sound">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allSounds.map((sound) => (
                            <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => playSound(notificationSettings?.angryCustomerSound || "notification-alert")}
                        data-testid="button-play-angry"
                      >
                        {isPlayingSound === (notificationSettings?.angryCustomerSound || "notification-alert") ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    Sound Options
                  </CardTitle>
                  <CardDescription>10 built-in alert sounds available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {defaultSounds.map((sound) => (
                      <Button
                        key={sound.id}
                        variant="outline"
                        size="sm"
                        onClick={() => playSound(sound.id)}
                        className="flex items-center gap-1"
                        data-testid={`button-preview-${sound.id}`}
                      >
                        {isPlayingSound === sound.id ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        <span className="text-xs truncate">{sound.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <CardTitle>Account Security</CardTitle>
                </div>
                <CardDescription>
                  Manage your account security settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">Password Protected</p>
                      <p className="text-sm text-muted-foreground">Your account is secured with a password</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPasswordDialogOpen(true)}
                    data-testid="button-change-password"
                  >
                    Change
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <Sparkles className={`w-5 h-5 ${twoFactorEnabled ? "text-green-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorEnabled ? "Enabled - Extra security active" : "Add an extra layer of security"}
                      </p>
                    </div>
                  </div>
                  {isPro ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setTwoFactorDialogOpen(true)}
                      data-testid="button-toggle-2fa"
                    >
                      {twoFactorEnabled ? "Disable" : "Enable"}
                    </Button>
                  ) : (
                    <Badge variant="secondary">Pro</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <CardTitle>Account Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleExportData}
                  disabled={exportingData}
                  data-testid="button-export-data"
                >
                  {exportingData ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export All Data
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive" 
                  onClick={() => setDeleteAccountDialogOpen(true)}
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
                <p className="text-xs text-muted-foreground">
                  Deleting your account will permanently remove all your data including chat history, knowledge base, and settings.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <CardTitle>Custom Domain</CardTitle>
                </div>
                {!isPro && <Badge variant="secondary">Pro Feature</Badge>}
              </div>
              <CardDescription>
                Connect your own domain to serve the chat widget from your branded URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isPro ? (
                <div className="p-6 rounded-lg bg-muted text-center space-y-4">
                  <Globe className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">Custom Domains</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use your own domain for widget embedding. Available on Pro and Enterprise plans.
                    </p>
                  </div>
                  <Button onClick={() => window.location.href = "/dashboard/plans"} data-testid="button-upgrade-domain">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Your Custom Domain</Label>
                      <div className="flex gap-2">
                        <Input
                          value={customDomain}
                          onChange={(e) => {
                            setCustomDomain(e.target.value);
                            setDomainAvailable(null);
                          }}
                          placeholder="chat.yourcompany.com"
                          data-testid="input-custom-domain"
                        />
                        <Button 
                          variant="outline"
                          onClick={handleCheckDomain}
                          disabled={!customDomain || isCheckingDomain}
                          data-testid="button-check-domain"
                        >
                          {isCheckingDomain ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Check
                            </>
                          )}
                        </Button>
                      </div>
                      {domainAvailable !== null && (
                        <div className={`flex items-center gap-2 text-sm ${domainAvailable ? "text-green-600" : "text-destructive"}`}>
                          {domainAvailable ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Domain is available
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Domain is unavailable
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {customDomain && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-medium">Domain Status</span>
                          {merchant?.customDomainStatus === "verified" ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm">Verified</span>
                            </div>
                          ) : merchant?.customDomainStatus === "pending" ? (
                            <div className="flex items-center gap-2 text-yellow-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">Pending Verification</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm">Not Configured</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-primary" />
                            <CardTitle className="text-base">Name Server Information</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Point your domain to these name servers:
                          </p>
                          <div className="p-3 rounded bg-muted font-mono text-xs space-y-1">
                            <p>ns1.chatvice-dns.com</p>
                            <p>ns2.chatvice-dns.com</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <CardTitle className="text-base">DNS Configuration</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Add the following CNAME record to your domain DNS settings:
                          </p>
                          <div className="p-3 rounded bg-muted font-mono text-xs space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span>CNAME</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Name:</span>
                              <span>{customDomain.split(".")[0] || "chat"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Value:</span>
                              <span>widget.chatvice.com</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">TTL:</span>
                              <span>3600 (1 hour)</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <Button 
                    onClick={handleSaveDomain}
                    disabled={updateMutation.isPending}
                    className="w-full"
                    data-testid="button-save-domain"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Domain Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              data-testid="button-submit-password"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              We'll send a verification link to your current email address to confirm this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {emailVerificationSent ? (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
                <p className="font-medium text-green-700 dark:text-green-400">Verification Email Sent!</p>
                <p className="text-sm text-muted-foreground">
                  Please check your inbox at <strong>{merchant?.email}</strong> and click the verification link to confirm your new email address.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Current Email</Label>
                  <Input value={merchant?.email || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>New Email Address</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="newemail@example.com"
                    data-testid="input-new-email"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEmailDialogOpen(false);
              setEmailVerificationSent(false);
              setNewEmail("");
            }}>
              {emailVerificationSent ? "Close" : "Cancel"}
            </Button>
            {!emailVerificationSent && (
              <Button 
                onClick={handleSendEmailVerification}
                disabled={sendEmailVerificationMutation.isPending || !newEmail}
                data-testid="button-send-verification"
              >
                {sendEmailVerificationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Verification
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={twoFactorDialogOpen} onOpenChange={setTwoFactorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{twoFactorEnabled ? "Disable" : "Enable"} Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {twoFactorEnabled 
                ? "Enter your authentication code to disable 2FA."
                : "Scan the QR code with your authenticator app, then enter the code."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!twoFactorEnabled && (
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <div className="w-32 h-32 bg-white p-2 rounded">
                  <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    QR Code
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Authentication Code</Label>
              <Input
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                data-testid="input-2fa-code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTwoFactorDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => toggle2FAMutation.mutate({ enable: !twoFactorEnabled, code: twoFactorCode })}
              disabled={toggle2FAMutation.isPending || twoFactorCode.length !== 6}
              data-testid="button-submit-2fa"
            >
              {toggle2FAMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {twoFactorEnabled ? "Disable" : "Enable"} 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>This action is permanent and cannot be undone. All your data will be deleted including:</p>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>All chat sessions and message history</li>
                <li>Knowledge base and AI training data</li>
                <li>Supervisor accounts</li>
                <li>Widget configurations</li>
                <li>Billing and subscription information</li>
              </ul>
              <div className="pt-2">
                <Label>Type DELETE to confirm</Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-2"
                  data-testid="input-delete-confirm"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
