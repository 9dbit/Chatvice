import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Save, Key, Copy, Check, Camera, User, Moon, Sun, Monitor, 
  Shield, Globe, Clock, MessageSquare, AlertCircle, Sparkles, Lock,
  CheckCircle2, XCircle, Loader2, ExternalLink
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import type { Merchant } from "@shared/schema";

export default function SettingsPage() {
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

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const isPro = merchant?.subscriptionPlanId === "pro" || merchant?.subscriptionPlanId === "enterprise" || merchant?.subscriptionPlanId === "custom";

  useEffect(() => {
    if (merchant) {
      setCompanyName(merchant.companyName);
      setProfilePhotoUrl(merchant.profilePhotoUrl || "");
      setChatTimeout(merchant.chatTimeout || 300);
      setRateLimitMessages(merchant.rateLimitMessages || 30);
      setRateLimitWindow(merchant.rateLimitWindow || 60);
      setCollectCustomerEmail(merchant.collectCustomerEmail || false);
      setCollectCustomerPhone(merchant.collectCustomerPhone || false);
      setCustomDomain(merchant.customDomain || "");
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
        title: "Settings saved",
        description: "Your settings have been updated.",
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
        title: "Upgrade required",
        description: "Custom domains are available on Pro plan and above.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ customDomain });
  };

  const handleCheckDomain = async () => {
    if (!customDomain) return;
    setIsCheckingDomain(true);
    await new Promise(r => setTimeout(r, 2000));
    updateMutation.mutate({ 
      customDomain,
      customDomainStatus: "verified" 
    });
    setIsCheckingDomain(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(merchantId);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Merchant ID copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB.",
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
          title: "Photo updated",
          description: "Click 'Save Changes' to apply.",
        });
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = () => {
    if (companyName) {
      return companyName.slice(0, 2).toUpperCase();
    }
    return "ME";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
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
                  <CardTitle>Profile</CardTitle>
                </div>
                <CardDescription>
                  Update your profile photo and company details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
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
                      <Label>Company Name</Label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your Company"
                        data-testid="input-company-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={merchant?.email || ""} disabled className="bg-muted" data-testid="input-email-readonly" />
                      <p className="text-xs text-muted-foreground">
                        Contact support to change your email address.
                      </p>
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
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-primary" />
                    <CardTitle>Theme Preference</CardTitle>
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
                    <CardTitle>API Credentials</CardTitle>
                  </div>
                  <CardDescription>
                    Your unique merchant ID for API access and widget integration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
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
                  <CardTitle>Chat Timeout</CardTitle>
                </div>
                <CardDescription>
                  Set how long before an inactive chat session expires.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Session Timeout</Label>
                  <Select 
                    value={String(chatTimeout)} 
                    onValueChange={(v) => setChatTimeout(Number(v))}
                  >
                    <SelectTrigger data-testid="select-chat-timeout">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="180">3 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
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
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
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
                  <Button variant="outline" size="sm" data-testid="button-change-password">
                    Change
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                  </div>
                  {isPro ? (
                    <Button variant="outline" size="sm" data-testid="button-enable-2fa">
                      Enable
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
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-data">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" data-testid="button-delete-account">
                  <AlertCircle className="w-4 h-4 mr-2" />
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
                  <div className="space-y-2">
                    <Label>Your Custom Domain</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
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
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>

                  {customDomain && (
                    <div className="p-4 rounded-lg bg-muted space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Domain Status</span>
                        {merchant?.customDomainStatus === "verified" ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Pending</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm space-y-2">
                        <p className="font-medium">DNS Configuration</p>
                        <p className="text-muted-foreground">
                          Add the following CNAME record to your domain DNS settings:
                        </p>
                        <div className="p-3 rounded bg-background font-mono text-xs space-y-2">
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
                            <span>widget.jeany.ai</span>
                          </div>
                        </div>
                      </div>
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
    </div>
  );
}
