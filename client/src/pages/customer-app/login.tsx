import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowRight, Globe, Users, Store, MessageSquare, Smartphone, Shield, Zap, Lock, ArrowLeft } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { chatRoutes } from "@/lib/chat-routes";
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";

const countryCodes = [
  { code: "+62", country: "ID" },
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+65", country: "SG" },
  { code: "+60", country: "MY" },
  { code: "+81", country: "JP" },
  { code: "+82", country: "KR" },
  { code: "+86", country: "CN" },
  { code: "+91", country: "IN" },
  { code: "+61", country: "AU" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+39", country: "IT" },
  { code: "+34", country: "ES" },
  { code: "+31", country: "NL" },
  { code: "+46", country: "SE" },
  { code: "+47", country: "NO" },
  { code: "+45", country: "DK" },
  { code: "+358", country: "FI" },
  { code: "+48", country: "PL" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
  { code: "+54", country: "AR" },
  { code: "+66", country: "TH" },
  { code: "+84", country: "VN" },
  { code: "+63", country: "PH" },
  { code: "+971", country: "AE" },
  { code: "+966", country: "SA" },
  { code: "+27", country: "ZA" },
  { code: "+234", country: "NG" },
];

type LoginStep = "phone" | "pin" | "otp-method";

interface PhoneCheckResult {
  exists: boolean;
  hasPIN: boolean;
  phoneNumber: string;
  displayName?: string;
}

export default function CustomerLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState("+62");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "whatsapp">("whatsapp");
  const [step, setStep] = useState<LoginStep>("phone");
  const [phoneCheckResult, setPhoneCheckResult] = useState<PhoneCheckResult | null>(null);
  
  const checkPhoneMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const res = await apiRequest("POST", "/api/customer/check-phone", data);
      return res.json();
    },
    onSuccess: (data: PhoneCheckResult) => {
      setPhoneCheckResult(data);
      if (data.hasPIN) {
        setStep("pin");
      } else {
        setStep("otp-method");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check phone number",
        variant: "destructive",
      });
    },
  });
  
  const loginPinMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; pinCode: string }) => {
      const res = await apiRequest("POST", "/api/customer/login-pin", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome back!",
        description: "Login successful",
      });
      navigate(chatRoutes.inbox());
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid PIN code",
        variant: "destructive",
      });
      setPinCode("");
    },
  });
  
  const requestOTPMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string; method: string }) => {
      const res = await apiRequest("POST", "/api/customer/request-otp", data);
      return res.json();
    },
    onSuccess: (data) => {
      const methodLabel = data.method === 'whatsapp' ? 'WhatsApp' : 'SMS';
      toast({
        title: "OTP Sent",
        description: `Check your ${methodLabel} for the verification code`,
      });
      navigate(chatRoutes.verify(data.phoneNumber, data.method));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });
  
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }
    
    checkPhoneMutation.mutate({ phoneNumber, countryCode });
  };
  
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pinCode || pinCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter your 6-digit PIN",
        variant: "destructive",
      });
      return;
    }
    
    if (phoneCheckResult) {
      loginPinMutation.mutate({ phoneNumber: phoneCheckResult.phoneNumber, pinCode });
    }
  };
  
  const handleOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phoneCheckResult) {
      requestOTPMutation.mutate({ 
        phoneNumber: phoneCheckResult.phoneNumber, 
        countryCode: "", 
        method: deliveryMethod 
      });
    }
  };
  
  const handleBack = () => {
    setStep("phone");
    setPhoneCheckResult(null);
    setPinCode("");
  };
  
  const handleForgotPIN = () => {
    if (phoneCheckResult) {
      setStep("otp-method");
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-background to-primary/20 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L2c+PC9zdmc+')] opacity-30" />
      
      <header className="p-4 flex flex-wrap items-center justify-end gap-4 border-b border-white/10 bg-background/30 backdrop-blur-xl sticky top-0 z-[9999]">
        <Button variant="outline" size="sm" asChild data-testid="button-visit-website">
          <a href="https://chatvice.app">
            <Globe className="w-4 h-4 mr-2" />
            Visit Chatvice.app
          </a>
        </Button>
      </header>
      
      <main className="flex-1 flex items-start justify-center p-4 pt-8 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-4 space-y-4">
              <div className="flex justify-center">
                <img 
                  src={chatviceLogoLight} 
                  alt="Chatvice" 
                  className="h-10 dark:hidden"
                />
                <img 
                  src={chatviceLogoDark} 
                  alt="Chatvice" 
                  className="h-10 hidden dark:block"
                />
              </div>
              
              {step === "phone" && (
                <>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
                      Welcome
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      Sign in or register with your phone number and continue to Chat platform
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                      <Store className="w-4 h-4 text-white" />
                      <span className="text-[10px] text-muted-foreground">Browse Stores</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                      <Users className="w-4 h-4 text-white" />
                      <span className="text-[10px] text-muted-foreground">Save Contacts</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                      <MessageSquare className="w-4 h-4 text-white" />
                      <span className="text-[10px] text-muted-foreground">Chat History</span>
                    </div>
                  </div>
                </>
              )}
              
              {step === "pin" && (
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
                    Welcome Back{phoneCheckResult?.displayName ? `, ${phoneCheckResult.displayName}` : ''}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Enter your 6-digit PIN to continue
                  </p>
                </div>
              )}
              
              {step === "otp-method" && (
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
                    Verify Your Phone
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    We'll send a verification code to {phoneCheckResult?.phoneNumber}
                  </p>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-5">
              {step === "phone" && (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                    <div className="flex flex-wrap gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-[100px] bg-white/5 border-white/10" data-testid="select-country-code">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((c) => (
                            <SelectItem key={c.code} value={c.code} data-testid={`select-item-${c.country}`}>
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">{c.country}</span>
                                <span>{c.code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="8123456789"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 bg-white/5 border-white/10 tracking-[0.3em]"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={checkPhoneMutation.isPending}
                    data-testid="button-continue"
                  >
                    {checkPhoneMutation.isPending ? "Checking..." : "Continue"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
              
              {step === "pin" && (
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="mb-2"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <div className="space-y-4">
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          id={`pin-${index}`}
                          type="password"
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={1}
                          value={pinCode[index] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 1) {
                              const newPin = pinCode.split('');
                              newPin[index] = val;
                              setPinCode(newPin.join(''));
                              if (val && index < 5) {
                                const nextInput = document.getElementById(`pin-${index + 1}`);
                                nextInput?.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !pinCode[index] && index > 0) {
                              const prevInput = document.getElementById(`pin-${index - 1}`);
                              prevInput?.focus();
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                            setPinCode(paste);
                            const nextIndex = Math.min(paste.length, 5);
                            const nextInput = document.getElementById(`pin-${nextIndex}`);
                            nextInput?.focus();
                          }}
                          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl bg-white/10 border-2 border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all duration-200 backdrop-blur-sm"
                          data-testid={`input-pin-${index}`}
                        />
                      ))}
                    </div>
                    <input type="hidden" name="pin" value={pinCode} data-testid="input-pin" />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={loginPinMutation.isPending || pinCode.length !== 6}
                    data-testid="button-login"
                  >
                    {loginPinMutation.isPending ? "Signing in..." : "Sign In"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-primary hover:text-primary"
                    onClick={handleForgotPIN}
                    data-testid="button-forgot-pin"
                  >
                    Forgot PIN? Verify with OTP
                  </Button>
                </form>
              )}
              
              {step === "otp-method" && (
                <form onSubmit={handleOTPSubmit} className="space-y-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="mb-2"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Send verification code via:</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={deliveryMethod === "whatsapp" ? "default" : "outline"}
                        onClick={() => setDeliveryMethod("whatsapp")}
                        className={`flex-1 ${deliveryMethod === "whatsapp" ? "bg-green-600 dark:bg-green-700" : ""}`}
                        data-testid="button-method-whatsapp"
                      >
                        <SiWhatsapp className="w-3.5 h-3.5 mr-1.5" />
                        WhatsApp
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={deliveryMethod === "sms" ? "default" : "outline"}
                        onClick={() => setDeliveryMethod("sms")}
                        className="flex-1"
                        data-testid="button-method-sms"
                      >
                        <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                        SMS
                      </Button>
                    </div>
                    {deliveryMethod === "sms" && (
                      <p className="text-[10px] text-amber-500 dark:text-amber-400" data-testid="text-sms-warning">
                        SMS may not be available for international numbers. We recommend using WhatsApp.
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={requestOTPMutation.isPending}
                    data-testid="button-send-otp"
                  >
                    {requestOTPMutation.isPending 
                      ? `Sending via ${deliveryMethod === "whatsapp" ? "WhatsApp" : "SMS"}...` 
                      : "Send Verification Code"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
              
              {step === "phone" && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex flex-wrap items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex flex-wrap justify-center gap-1 text-xs">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Already have an account?</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your registered phone number to log in with your PIN
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex flex-wrap items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Secure & Encrypted
                    </span>
                    <span className="flex flex-wrap items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Instant Verification
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <p className="text-center text-[10px] text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-primary hover:underline" data-testid="link-terms">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-primary hover:underline" data-testid="link-privacy">Privacy Policy</a>
          </p>
        </div>
      </main>
      
      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-white/10 bg-background/30 backdrop-blur-sm relative z-10">
        <p>Powered by Chatvice - AI Customer Support Platform</p>
      </footer>
    </div>
  );
}
