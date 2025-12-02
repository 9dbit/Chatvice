import { useLocation } from "wouter";
import ChatWidget from "./chat-widget";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function WidgetDemoPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const merchantId = params.get("merchant") || localStorage.getItem("merchantId") || "demo";
  const sessionId = params.get("session");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="pt-20 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">Widget Preview</h1>
            <p className="text-muted-foreground">
              This is how your Chatvice chat widget will appear on your website.
            </p>
          </div>

          <div className="relative bg-card rounded-2xl border border-card-border shadow-xl overflow-hidden">
            <div className="h-12 bg-muted border-b border-border flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/50" />
                <div className="w-3 h-3 rounded-full bg-status-away/50" />
                <div className="w-3 h-3 rounded-full bg-status-online/50" />
              </div>
              <span className="text-sm text-muted-foreground ml-4 font-mono">yourwebsite.com</span>
            </div>

            <div className="min-h-[600px] bg-background p-8 relative">
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-32 bg-muted rounded mt-8" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>

              <div className="absolute bottom-4 right-4" style={{ position: "relative", height: 520, width: 360 }}>
                <ChatWidget merchantId={merchantId} sessionId={sessionId || undefined} embedded />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
