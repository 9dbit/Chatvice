import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, ArrowRight, Sparkles, Users, Send, BarChart3 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { getBlasterUrl } from "@/lib/blaster-routes";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MerchantHomePage() {
  const [, navigate] = useLocation();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleCreateAgent = () => {
    navigate("/select-agent");
  };

  const handleWhatsAppBlast = () => {
    const blasterUrl = getBlasterUrl("/dashboard");
    window.location.href = blasterUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Chatvice</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground" data-testid="text-merchant-email">
              {(user as any)?.email}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-home-title">
            Selamat Datang di Chatvice
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-home-subtitle">
            Pilih layanan yang ingin Anda gunakan untuk mengembangkan bisnis Anda
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          <Card 
            className="relative overflow-hidden hover-elevate cursor-pointer group border-2 hover:border-primary/50 transition-colors"
            onClick={handleCreateAgent}
            data-testid="card-create-agent"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
              </div>
              <CardTitle className="text-2xl" data-testid="text-agent-title">
                Buat AI Agent
              </CardTitle>
              <CardDescription className="text-base" data-testid="text-agent-desc">
                Buat chatbot AI untuk customer service otomatis di website Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Respon otomatis 24/7</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Eskalasi ke supervisor manusia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Knowledge base dari website Anda</span>
                </li>
              </ul>
              <Button className="w-full group-hover:translate-x-0" data-testid="button-go-agent">
                Mulai Buat Agent
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden hover-elevate cursor-pointer group border-2 hover:border-green-500/50 transition-colors"
            onClick={handleWhatsAppBlast}
            data-testid="card-wa-blast"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <SiWhatsapp className="h-8 w-8 text-green-500" />
                </div>
                <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  <Send className="w-3 h-3 mr-1" />
                  Marketing
                </Badge>
              </div>
              <CardTitle className="text-2xl" data-testid="text-wa-title">
                WhatsApp Blast
              </CardTitle>
              <CardDescription className="text-base" data-testid="text-wa-desc">
                Kirim pesan broadcast ke ribuan pelanggan sekaligus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-green-500" />
                  <span>Broadcast massal ke ribuan kontak</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span>Manajemen kontak & segmentasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <span>Analitik & tracking real-time</span>
                </li>
              </ul>
              <Button className="w-full bg-green-600 hover:bg-green-700 border-green-700" data-testid="button-go-wa">
                Buka WhatsApp Blast
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Butuh bantuan? <a href="/help" className="text-primary hover:underline">Kunjungi Help Center</a>
          </p>
        </div>
      </main>
    </div>
  );
}
