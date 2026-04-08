import { useLanguage } from "@/hooks/use-language";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Bot, Loader2, RefreshCw,
  Settings, Sparkles, Package, MousePointer, CheckCircle2, AlertCircle
} from "lucide-react";
import type { Agent, WelcomeBubble, QuickReply, ProductCard, ChatButton, SuggestedQuestion } from "@shared/schema";

export default function LivePreviewPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const [widgetKey, setWidgetKey] = useState(0);

  // Load the widget script dynamically
  useEffect(() => {
    if (!merchantId) return;

    // Remove any existing widget elements first
    const existingScript = document.getElementById('chatvice-widget-script');
    const existingContainer = document.getElementById('chatvice-widget');
    if (existingScript) existingScript.remove();
    if (existingContainer) existingContainer.remove();

    // Create and append the widget script
    const script = document.createElement('script');
    script.id = 'chatvice-widget-script';
    script.src = `${window.location.origin}/api/widget/chatvice.js?merchant=${merchantId}&v=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptEl = document.getElementById('chatvice-widget-script');
      const containerEl = document.getElementById('chatvice-widget');
      if (scriptEl) scriptEl.remove();
      if (containerEl) containerEl.remove();
    };
  }, [merchantId, widgetKey]);

  const handleRefresh = () => {
    setWidgetKey(prev => prev + 1);
  };

  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    enabled: !!merchantId,
  });

  const { data: welcomeBubble } = useQuery<WelcomeBubble>({
    queryKey: [`/api/widget/${merchantId}/welcome-bubble`],
    enabled: !!merchantId,
  });

  const { data: quickReplies = [] } = useQuery<QuickReply[]>({
    queryKey: [`/api/widget/${merchantId}/quick-replies`],
    enabled: !!merchantId,
  });

  const { data: productCards = [] } = useQuery<ProductCard[]>({
    queryKey: [`/api/widget/${merchantId}/product-cards`],
    enabled: !!merchantId,
  });

  const { data: chatButtons = [] } = useQuery<ChatButton[]>({
    queryKey: [`/api/widget/${merchantId}/chat-buttons`],
    enabled: !!merchantId,
  });

  const { data: suggestedQuestions = [] } = useQuery<SuggestedQuestion[]>({
    queryKey: [`/api/widget/suggested-questions/${merchantId}`],
    enabled: !!merchantId,
  });

  const activeAgent = agents.find(a => a.isActive);

  if (agentsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("dashboard.livePreview.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Real-time preview of your widget with all current settings
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          data-testid="button-refresh-preview"
        >
          <RefreshCw className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh Widget</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Active Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAgent ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">{activeAgent.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">No active agent</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Loaded Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Welcome Bubble</span>
                <Badge variant={welcomeBubble?.isEnabled ? "default" : "secondary"} className="text-xs">
                  {welcomeBubble?.isEnabled ? "Active" : "Off"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quick Replies</span>
                <Badge variant="outline" className="text-xs">{quickReplies.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product Cards</span>
                <Badge variant="outline" className="text-xs">{productCards.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Chat Buttons</span>
                <Badge variant="outline" className="text-xs">{chatButtons.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suggested Questions</span>
                <Badge variant="outline" className="text-xs">{suggestedQuestions.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Links</CardTitle>
          <CardDescription>
            Configure your widget features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            <a href="/dashboard/widget">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-widget-settings">
                <Settings className="w-5 h-5" />
                <span className="text-xs">Widget</span>
              </Button>
            </a>
            <a href="/dashboard/welcome-bubble">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-welcome-bubble">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs">Welcome</span>
              </Button>
            </a>
            <a href="/dashboard/quick-replies">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-quick-replies">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Replies</span>
              </Button>
            </a>
            <a href="/dashboard/product-cards">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-product-cards">
                <Package className="w-5 h-5" />
                <span className="text-xs">Products</span>
              </Button>
            </a>
            <a href="/dashboard/chat-buttons">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-chat-buttons">
                <MousePointer className="w-5 h-5" />
                <span className="text-xs">Buttons</span>
              </Button>
            </a>
            <a href="/dashboard/agents">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-agents">
                <Bot className="w-5 h-5" />
                <span className="text-xs">Agents</span>
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
