import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Camera, LogOut, Bell, Shield, Trash2, Loader2, QrCode, Copy, Check, Volume2, ChevronRight, Image, X } from "lucide-react";
import CustomerLayout from "./layout";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { chatRoutes } from "@/lib/chat-routes";
import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { cn } from "@/lib/utils";
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
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Fetch customer's media
  interface MediaItem {
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    createdAt: string;
  }
  
  const { data: mediaItems = [] } = useQuery<MediaItem[]>({
    queryKey: ["/api/customer/media/list"],
  });
  
  const displayedMedia = showAllMedia ? mediaItems : mediaItems.slice(0, 9);
  
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
          <h1 className="text-xl font-semibold">Profile</h1>
          
          <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  data-testid="input-profile-photo"
                />
                <Avatar className="w-14 h-14">
                  <AvatarImage src={customer.avatarUrl || undefined} />
                  <AvatarFallback>
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="icon"
                  className="absolute -bottom-1 -right-1 rounded-full h-6 w-6"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-change-photo"
                >
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate" data-testid="text-display-name">{customer.displayName || "Guest"}</p>
                <p className="text-sm text-muted-foreground" data-testid="text-phone-number">{customer.phoneNumber}</p>
                {customer.isPhoneVerified && (
                  <p className="text-[10px] text-green-600 flex items-center gap-1" data-testid="text-verified-badge">
                    <Shield className="w-2.5 h-2.5" /> Verified
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="displayName" className="text-xs">Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-sm"
                  data-testid="input-display-name"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-8 text-sm"
                  data-testid="input-email"
                />
              </div>
              
              <Button 
                size="sm"
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
                <QrCode className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium">Personal ID</span>
            </div>
            
            {customer.personalId ? (
              <div className="flex flex-col items-center">
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-md" data-testid="container-qr-code">
                  <QRCodeSVG 
                    value={customer.personalId}
                    size={140}
                    level="H"
                    includeMargin={false}
                    bgColor="transparent"
                    fgColor="#ffffff"
                    data-testid="img-personal-qr"
                  />
                </div>
                <p className="mt-2 font-mono text-sm font-medium text-foreground" data-testid="text-personal-id">
                  {customer.personalId}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPersonalId}
                  className="mt-1 h-7 text-xs"
                  data-testid="button-copy-personal-id"
                >
                  {copiedId ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedId ? "Copied" : "Copy ID"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </div>
            )}
          </div>
          
          {/* Media Gallery Section */}
          <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
                  <Image className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">Media</span>
              </div>
              {mediaItems.length > 9 && !showAllMedia && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMedia(true)}
                  className="h-7 text-xs text-primary"
                  data-testid="button-view-all-media"
                >
                  View All ({mediaItems.length})
                </Button>
              )}
              {showAllMedia && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMedia(false)}
                  className="h-7 text-xs"
                  data-testid="button-close-media"
                >
                  <X className="w-3 h-3 mr-1" />
                  Close
                </Button>
              )}
            </div>
            
            {mediaItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Image className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No media yet</p>
              </div>
            ) : (
              <div className={cn(
                showAllMedia && "max-h-[60vh] overflow-y-auto p-1"
              )}>
                <div className="grid grid-cols-3 gap-2">
                  {displayedMedia.map((media) => (
                    <button
                      key={media.id}
                      onClick={() => setSelectedImage(media.url)}
                      className="aspect-square rounded-lg overflow-hidden bg-muted/50 hover-elevate"
                      data-testid={`media-thumbnail-${media.id}`}
                    >
                      <img
                        src={media.url}
                        alt={media.filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Image Viewer Modal */}
          {selectedImage && (
            <div 
              className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
              onClick={() => setSelectedImage(null)}
              data-testid="image-viewer-modal"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
                data-testid="button-close-image"
              >
                <X className="w-6 h-6" />
              </Button>
              <img
                src={selectedImage}
                alt="Full size"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Notifications</p>
            
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Push Notifications</span>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
                className="scale-75"
                data-testid="switch-notifications"
              />
            </div>
            
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Sound</span>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={handleToggleSound}
                className="scale-75"
                data-testid="switch-notification-sound"
              />
            </div>
            
            <div 
              className="flex items-center justify-between py-1 cursor-pointer"
              onClick={() => navigate(chatRoutes.soundSettings())}
              data-testid="button-sound-settings"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <span className="text-xs">Sound Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="rounded-lg border border-destructive/20 bg-card p-3 space-y-2">
            <p className="text-xs text-destructive font-medium">Danger Zone</p>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full justify-start h-8"
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              <span className="text-xs">{logoutMutation.isPending ? "Logging out..." : "Log Out"}</span>
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-destructive hover:text-destructive"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Account deletion will be available soon",
                });
              }}
              data-testid="button-delete-account"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              <span className="text-xs">Delete Account</span>
            </Button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
