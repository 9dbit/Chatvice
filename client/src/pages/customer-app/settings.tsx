import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Camera, LogOut, Bell, Shield, Trash2 } from "lucide-react";
import CustomerLayout from "./layout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CustomerProfile {
  id: string;
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
  
  const { data: customer, isLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/customer/me"],
  });
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
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
      navigate("/chat/login");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
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
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={customer.avatarUrl || undefined} />
                    <AvatarFallback className="text-xl">
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    type="button"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Profile photo upload will be available soon",
                      });
                    }}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <p className="font-medium">{customer.displayName || "Guest"}</p>
                  <p className="text-sm text-muted-foreground">{customer.phoneNumber}</p>
                  {customer.isPhoneVerified && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
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
          
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Control how you receive updates</CardDescription>
            </CardHeader>
            <CardContent>
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
