import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Phone, ArrowRight, Globe, Sparkles, Users, Store } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const countryCodes = [
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+62", country: "ID", flag: "🇮🇩" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
  { code: "+60", country: "MY", flag: "🇲🇾" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+31", country: "NL", flag: "🇳🇱" },
  { code: "+46", country: "SE", flag: "🇸🇪" },
  { code: "+47", country: "NO", flag: "🇳🇴" },
  { code: "+45", country: "DK", flag: "🇩🇰" },
  { code: "+358", country: "FI", flag: "🇫🇮" },
  { code: "+48", country: "PL", flag: "🇵🇱" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+52", country: "MX", flag: "🇲🇽" },
  { code: "+54", country: "AR", flag: "🇦🇷" },
  { code: "+66", country: "TH", flag: "🇹🇭" },
  { code: "+84", country: "VN", flag: "🇻🇳" },
  { code: "+63", country: "PH", flag: "🇵🇭" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
  { code: "+966", country: "SA", flag: "🇸🇦" },
  { code: "+27", country: "ZA", flag: "🇿🇦" },
  { code: "+234", country: "NG", flag: "🇳🇬" },
];

export default function CustomerLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const requestOTPMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const res = await apiRequest("POST", "/api/customer/request-otp", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP Sent",
        description: "Check your phone for the verification code",
      });
      navigate(`/chat/verify?phone=${encodeURIComponent(data.phoneNumber)}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }
    
    requestOTPMutation.mutate({ phoneNumber, countryCode });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex flex-col">
      <header className="p-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Chatvice</span>
        </a>
        <Button variant="ghost" size="sm" asChild>
          <a href="/">
            <Globe className="w-4 h-4 mr-2" />
            Visit Website
          </a>
        </Button>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Phone className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Welcome to Chatvice</CardTitle>
            <CardDescription className="text-base">
              Sign in with your phone number to start chatting with your favorite stores
            </CardDescription>
            
            {/* Marketing signup banner */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 border border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Get keep in touch with Chatvice app</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3" /> Browse Stores
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> Save Contacts
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Chat History
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[120px]" data-testid="select-country-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.code}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                    data-testid="input-phone"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send a verification code to this number
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={requestOTPMutation.isPending}
                data-testid="button-continue"
              >
                {requestOTPMutation.isPending ? "Sending..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
            
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                New to Chatvice? Sign up is free!
              </p>
              <p className="text-xs text-muted-foreground">
                Enter your phone number above to create your account instantly
              </p>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                By continuing, you agree to our{" "}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="p-4 text-center text-sm text-muted-foreground border-t">
        <p>Powered by Chatvice - AI Customer Support Platform</p>
      </footer>
    </div>
  );
}
