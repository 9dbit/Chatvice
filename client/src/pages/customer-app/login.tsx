import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowRight, Globe, Sparkles, Users, Store, MessageSquare, Smartphone, Shield, Zap } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

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

export default function CustomerLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState("+62");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "whatsapp">("whatsapp");
  
  const requestOTPMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string; method: string }) => {
      const res = await apiRequest("POST", "/api/customer/request-otp", data);
      return res.json();
    },
    onSuccess: (data) => {
      const methodLabel = data.method === 'whatsapp' ? 'WhatsApp' : 'SMS';
      toast({
        title: "OTP Terkirim",
        description: `Cek ${methodLabel} kamu untuk kode verifikasi`,
      });
      navigate(`/chat/verify?phone=${encodeURIComponent(data.phoneNumber)}&method=${data.method}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengirim OTP",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nomor telepon kamu",
        variant: "destructive",
      });
      return;
    }
    
    requestOTPMutation.mutate({ phoneNumber, countryCode, method: deliveryMethod });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-background to-primary/20 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L2c+PC9zdmc+')] opacity-30" />
      
      <header className="p-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-background/30 backdrop-blur-xl sticky top-0 z-[9999]">
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
        <Button variant="outline" size="sm" asChild data-testid="button-visit-website">
          <a href="/">
            <Globe className="w-4 h-4 mr-2" />
            Kunjungi Website
          </a>
        </Button>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-4 space-y-4">
              <div className="flex justify-center">
                <img 
                  src={chatviceLogoLight} 
                  alt="Chatvice" 
                  className="h-12 dark:hidden"
                />
                <img 
                  src={chatviceLogoDark} 
                  alt="Chatvice" 
                  className="h-12 hidden dark:block"
                />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
                  Selamat Datang
                </h1>
                <p className="text-muted-foreground text-sm">
                  Masuk atau daftar dengan nomor telepon untuk mulai chat dengan toko favoritmu
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                  <Store className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Jelajahi Toko</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Simpan Kontak</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Riwayat Chat</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Nomor Telepon</Label>
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
                      className="flex-1 bg-white/5 border-white/10"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Kirim kode verifikasi via:</Label>
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
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={requestOTPMutation.isPending}
                  data-testid="button-continue"
                >
                  {requestOTPMutation.isPending 
                    ? `Mengirim via ${deliveryMethod === "whatsapp" ? "WhatsApp" : "SMS"}...` 
                    : "Lanjutkan"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex flex-wrap items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex flex-wrap justify-center gap-1 text-xs">
                  <span className="bg-card px-2 text-muted-foreground">atau</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Sudah punya akun?</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Masukkan nomor telepon yang terdaftar untuk login ke akun Chatvice kamu
                </p>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex flex-wrap items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Aman & Terenkripsi
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Verifikasi Instan
                </span>
              </div>
            </CardContent>
          </Card>
          
          <p className="text-center text-[10px] text-muted-foreground">
            Dengan melanjutkan, kamu menyetujui{" "}
            <a href="/terms" className="text-primary hover:underline" data-testid="link-terms">Ketentuan Layanan</a>
            {" "}dan{" "}
            <a href="/privacy" className="text-primary hover:underline" data-testid="link-privacy">Kebijakan Privasi</a>
          </p>
        </div>
      </main>
      
      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-white/10 bg-background/30 backdrop-blur-sm relative z-10">
        <p>Powered by Chatvice - AI Customer Support Platform</p>
      </footer>
    </div>
  );
}
