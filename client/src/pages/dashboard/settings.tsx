import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Building, Key, Copy, Check, Camera, User, Moon, Sun, Monitor } from "lucide-react";
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

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  useEffect(() => {
    if (merchant?.companyName) {
      setCompanyName(merchant.companyName);
    }
    if (merchant?.profilePhotoUrl) {
      setProfilePhotoUrl(merchant.profilePhotoUrl);
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/settings", {
        merchantId,
        companyName,
        profilePhotoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Settings saved",
        description: "Your account settings have been updated.",
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
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="w-full"
                  data-testid="button-save-settings"
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <CardTitle>Account Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" data-testid="button-export-data">
                Export Data
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="button-delete-account">
                Delete Account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Deleting your account will permanently remove all your data including chat history, knowledge base, and settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
