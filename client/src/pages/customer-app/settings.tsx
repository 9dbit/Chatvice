import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Camera, LogOut, Bell, Shield, Trash2, Loader2, QrCode, Copy, Check, Volume2 } from "lucide-react";
import CustomerLayout from "./layout";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { chatRoutes } from "@/lib/chat-routes";
import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { QRCodeSVG } from "qrcode.react";

interface CustomerProfile {
  id: string;
  personalId: string | null;
  phoneNumber: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  isPhoneVerified: boolean;
  notificationsEnabled: boolean;
}

export default function CustomerSettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { playSound, setEnabled: setSoundEnabled, isEnabled: isSoundEnabled } = useChatNotificationSound();
  
  const { data: customer, isLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/customer/me"],
  });
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Initialize sound setting from localStorage
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, [isSoundEnabled]);
  
  const handleCopyPersonalId = async () => {
    if (!customer?.personalId) return;
    try {
      await navigator.clipboard.writeText(customer.personalId);
      setCopiedId(true);
      toast({ title: "Personal ID copied!" });
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };
  
  useEffect(() => {
    if (customer) {
      setDisplayName(customer.displayName || "");
      setEmail(customer.email || "");
      setNotificationsEnabled(customer.notificationsEnabled ?? true);
    }
  }, [customer]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<CustomerProfile>) => {
      const res = await apiRequest("PATCH", "/api/customer/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/me"] });
      toast({ title: "Profile updated" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/customer/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      navigate(chatRoutes.login());
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      return new Promise<{ avatarUrl: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = (e.target?.result as string).split(",")[1];
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
              }
            });
            
            xhr.addEventListener("load", () => {
              setIsUploading(false);
              setUploadProgress(0);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch {
                  reject(new Error("Invalid server response"));
                }
              } else {
                try {
                  const error = JSON.parse(xhr.responseText);
                  reject(new Error(error.error || error.message || "Upload failed"));
                } catch {
                  reject(new Error("Upload failed"));
                }
              }
            });
            
            xhr.addEventListener("error", () => {
              setIsUploading(false);
              setUploadProgress(0);
              reject(new Error("Network error during upload"));
            });
            
            xhr.addEventListener("abort", () => {
              setIsUploading(false);
              setUploadProgress(0);
              reject(new Error("Upload cancelled"));
            });
            
            xhr.open("POST", "/api/customer/profile/photo");
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.withCredentials = true;
            xhr.send(JSON.stringify({
              filename: file.name,
              mimeType: file.type,
              fileData: base64,
            }));
          } catch (err: any) {
            setIsUploading(false);
            setUploadProgress(0);
            reject(err);
          }
        };
        reader.onerror = () => {
          setIsUploading(false);
          setUploadProgress(0);
          reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/me"] });
      toast({ title: "Profile photo updated" });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (3MB limit)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 3MB",
        variant: "destructive",
      });
      return;
    }
    
    uploadPhotoMutation.mutate(file);
    
    // Reset input
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };
  
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      displayName: displayName.trim() || undefined,
      email: email.trim() || undefined,
    });
  };
  
  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    updateProfileMutation.mutate({ notificationsEnabled: enabled });
  };
  
  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
    // Play a test sound if enabled
    if (enabled) {
      playSound("reply");
    }
  };
  
  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="sm:ml-64 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </CustomerLayout>
    );
  }
  
  if (!customer) {
    navigate("/chat/login");
    return null;
  }
  
  return (
    <CustomerLayout>
      <div className="sm:ml-64">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    data-testid="input-profile-photo"
                  />
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={customer.avatarUrl || undefined} />
                    <AvatarFallback className="text-xl">
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-change-photo"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                  {isUploading && (
                    <div className="absolute -bottom-3 left-0 right-0 flex flex-col items-center">
                      <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                          data-testid="profile-upload-progress-bar"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5" data-testid="profile-upload-progress-text">
                        {uploadProgress}%
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium" data-testid="text-display-name">{customer.displayName || "Guest"}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-phone-number">{customer.phoneNumber}</p>
                  {customer.isPhoneVerified && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1" data-testid="text-verified-badge">
                      <Shield className="w-3 h-3" /> Verified
                    </p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    data-testid="input-display-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    data-testid="input-email"
                  />
                </div>
                
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Personal ID & QR Code Section - Frosted Glass Design */}
          <Card className="relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-white/20 dark:border-white/10 shadow-xl">
            {/* Decorative gradient blur */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                Personal ID
              </CardTitle>
              <CardDescription>Share your Personal ID or QR code to connect with others</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6">
              {customer.personalId ? (
                <>
                  {/* Frosted Glass QR Code Frame */}
                  <div className="flex flex-col items-center">
                    <div className="relative p-6 rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-white/90 shadow-2xl border border-white/50" data-testid="container-qr-code">
                      {/* Inner glow effect */}
                      <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-purple-100/50 to-indigo-100/50 dark:from-purple-200/30 dark:to-indigo-200/30 pointer-events-none" />
                      
                      <div className="relative">
                        <QRCodeSVG 
                          value={customer.personalId}
                          size={180}
                          level="H"
                          includeMargin={false}
                          bgColor="transparent"
                          fgColor="#1e1b4b"
                          data-testid="img-personal-qr"
                        />
                      </div>
                      
                      {/* Personal ID below QR */}
                      <div className="mt-4 text-center">
                        <p className="font-mono text-sm font-bold text-indigo-900 tracking-wider" data-testid="text-personal-id">
                          {customer.personalId}
                        </p>
                      </div>
                    </div>
                    
                    <p className="mt-4 text-sm text-muted-foreground text-center">
                      Scan this QR code to add as contact
                    </p>
                  </div>
                  
                  {/* Copy Button */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleCopyPersonalId}
                      className="backdrop-blur-sm bg-white/10 border-white/20"
                      data-testid="button-copy-personal-id"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Personal ID
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-3" />
                  <p>Generating Personal ID...</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Control how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when stores reply
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                  data-testid="switch-notifications"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Notification Sound</p>
                    <p className="text-sm text-muted-foreground">
                      Play sound for new messages
                    </p>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={handleToggleSound}
                  data-testid="switch-notification-sound"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-full justify-start"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {logoutMutation.isPending ? "Logging out..." : "Log Out"}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Account deletion will be available soon",
                  });
                }}
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}
