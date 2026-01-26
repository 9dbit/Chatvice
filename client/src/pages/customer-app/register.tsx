import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowRight, Camera, Lock, Mail, UserCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { chatRoutes } from "@/lib/chat-routes";
import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

interface CustomerData {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  isProfileCompleted: boolean;
}

export default function CustomerRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  
  const { data: customer, isLoading } = useQuery<CustomerData>({
    queryKey: ["/api/customer/me"],
  });
  
  useEffect(() => {
    if (!isLoading && !customer) {
      navigate(chatRoutes.login());
    }
    if (!isLoading && customer?.isProfileCompleted) {
      navigate(chatRoutes.inbox());
    }
  }, [customer, isLoading, navigate]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string; email: string; pinCode: string }) => {
      const res = await apiRequest("PATCH", "/api/customer/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/me"] });
      toast({
        title: "Profile Complete",
        description: "Welcome to Chatvice! You can now log in with your PIN.",
      });
      navigate(chatRoutes.inbox());
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!pinCode || pinCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a 6-digit PIN",
        variant: "destructive",
      });
      return;
    }
    
    if (pinCode !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate({ 
      displayName: displayName.trim(),
      email: email.trim(),
      pinCode,
    });
  };
  
  const isPinValid = pinCode.length === 6 && /^\d{6}$/.test(pinCode);
  const isPinMatch = pinCode === confirmPin && confirmPin.length === 6;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 via-background to-primary/20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-background to-primary/20 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L2c+PC9zdmc+')] opacity-30" />
      
      <header className="p-4 flex flex-wrap items-center justify-center gap-4 border-b border-white/10 bg-background/30 backdrop-blur-xl sticky top-0 z-[9999]">
        <a href="/" className="flex flex-wrap items-center gap-2" data-testid="link-home">
          <img 
            src={chatviceLogoLight} 
            alt="Chatvice" 
            className="h-8 dark:hidden"
          />
          <img 
            src={chatviceLogoDark} 
            alt="Chatvice" 
            className="h-8 hidden dark:block"
          />
        </a>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={customer?.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <User className="w-10 h-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              <button 
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Profile photo upload will be available soon",
                  });
                }}
                data-testid="button-upload-photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
              Complete Your Profile
            </CardTitle>
            <CardDescription className="text-base">
              Set up your account to start chatting with stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex flex-wrap items-center gap-2">
                  <UserCircle className="w-4 h-4" />
                  Your Name
                </Label>
                <Input
                  id="displayName"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white/5 border-white/10"
                  data-testid="input-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex flex-wrap items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10"
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  Used for order updates and receipts
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pinCode" className="flex flex-wrap items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Create PIN (6 digits)
                </Label>
                <div className="relative">
                  <Input
                    ref={pinInputRef}
                    id="pinCode"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="bg-white/5 border-white/10 pr-10"
                    data-testid="input-pin"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPin(!showPin)}
                    data-testid="button-toggle-pin"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll use this PIN to log in next time
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPin" className="flex flex-wrap items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm PIN
                  {isPinMatch && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPin"
                    type={showConfirmPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    placeholder="Re-enter your PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className={`bg-white/5 border-white/10 pr-10 ${
                      confirmPin.length === 6 && !isPinMatch ? 'border-destructive' : ''
                    }`}
                    data-testid="input-confirm-pin"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    data-testid="button-toggle-confirm-pin"
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPin.length === 6 && !isPinMatch && (
                  <p className="text-xs text-destructive">PINs do not match</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={updateProfileMutation.isPending || !isPinValid || !isPinMatch || !displayName.trim() || !email.trim()}
                data-testid="button-complete"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Complete Setup"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      
      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-white/10 bg-background/30 backdrop-blur-sm relative z-10">
        <p>Powered by Chatvice - AI Customer Support Platform</p>
      </footer>
    </div>
  );
}
