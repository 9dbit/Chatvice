import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ShieldCheck, ArrowLeft, RefreshCw, Smartphone } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerVerifyPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const searchParams = new URLSearchParams(window.location.search);
  const phoneNumber = searchParams.get("phone") || "";
  const deliveryMethod = searchParams.get("method") as "sms" | "whatsapp" || "sms";
  
  useEffect(() => {
    if (!phoneNumber) {
      navigate("/chat/login");
    }
  }, [phoneNumber, navigate]);
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);
  
  const verifyMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; code: string }) => {
      const res = await apiRequest("POST", "/api/customer/verify-otp", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verified",
        description: "Welcome to Chatvice!",
      });
      
      if (!data.customer.displayName) {
        navigate("/chat/register");
      } else {
        navigate("/chat/inbox");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });
  
  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/customer/request-otp", { 
        phoneNumber, 
        countryCode: "",
        method: deliveryMethod
      });
      return res.json();
    },
    onSuccess: () => {
      const methodLabel = deliveryMethod === 'whatsapp' ? 'WhatsApp' : 'SMS';
      toast({
        title: "Code Resent",
        description: `Check your ${methodLabel} for the new verification code`,
      });
      setCountdown(60);
      setCanResend(false);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code",
        variant: "destructive",
      });
    },
  });
  
  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (newCode.every(c => c) && newCode.join("").length === 6) {
      verifyMutation.mutate({ phoneNumber, code: newCode.join("") });
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      verifyMutation.mutate({ phoneNumber, code: pasted });
    }
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
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-fit mx-auto mb-2"
              onClick={() => navigate("/chat/login")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              deliveryMethod === 'whatsapp' 
                ? 'bg-gradient-to-br from-green-500 to-green-400' 
                : 'bg-gradient-to-br from-primary to-primary/60'
            }`}>
              {deliveryMethod === 'whatsapp' 
                ? <SiWhatsapp className="w-8 h-8 text-white" />
                : <ShieldCheck className="w-8 h-8 text-white" />
              }
            </div>
            <CardTitle className="text-2xl">Verify Your Phone</CardTitle>
            <CardDescription className="text-base">
              Enter the 6-digit code sent via{" "}
              <span className={`font-medium ${deliveryMethod === 'whatsapp' ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                {deliveryMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </span>
              {" "}to{" "}
              <span className="font-medium text-foreground">{phoneNumber}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold"
                    disabled={verifyMutation.isPending}
                    data-testid={`input-code-${index}`}
                  />
                ))}
              </div>
              
              {verifyMutation.isPending && (
                <p className="text-center text-sm text-muted-foreground">
                  Verifying...
                </p>
              )}
              
              <div className="text-center">
                {canResend ? (
                  <Button
                    variant="ghost"
                    onClick={() => resendMutation.mutate()}
                    disabled={resendMutation.isPending}
                    data-testid="button-resend"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {resendMutation.isPending ? "Sending..." : "Resend Code"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium">{countdown}s</span>
                  </p>
                )}
              </div>
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
