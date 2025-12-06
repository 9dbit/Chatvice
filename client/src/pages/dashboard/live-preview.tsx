import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Eye, Smartphone, Monitor, Tablet, RefreshCw, 
  MessageSquare, Bot, Loader2, ExternalLink 
} from "lucide-react";
import ChatWidget from "@/pages/chat-widget";
import type { Agent, WelcomeBubble, QuickReply, ProductCard, ChatButton, SuggestedQuestion } from "@shared/schema";

export default function LivePreviewPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const [deviceView, setDeviceView] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [showWidget, setShowWidget] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

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

  const activeAgentId = agents.find(a => a.isActive)?.id;

  const handleRefresh = () => {
    setShowWidget(false);
    setTimeout(() => {
      setPreviewKey(prev => prev + 1);
      setShowWidget(true);
    }, 100);
  };

  const getDeviceWidth = () => {
    switch (deviceView) {
      case "mobile": return "w-[375px]";
      case "tablet": return "w-[768px]";
      case "desktop": return "w-full max-w-5xl";
      default: return "w-[375px]";
    }
  };

  if (agentsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Live Preview</h1>
          <p className="text-muted-foreground">
            Preview chat widget dengan semua fitur terintegrasi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            data-testid="button-refresh-preview"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <a 
            href={`/widget-preview?merchantId=${merchantId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" data-testid="button-open-fullscreen">
              <ExternalLink className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Device View</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs value={deviceView} onValueChange={(v) => setDeviceView(v as typeof deviceView)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="mobile" data-testid="tab-mobile">
                    <Smartphone className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="tablet" data-testid="tab-tablet">
                    <Tablet className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="desktop" data-testid="tab-desktop">
                    <Monitor className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Features Status</CardTitle>
              <CardDescription className="text-sm">
                Fitur yang aktif di widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Welcome Bubble</span>
                <Badge variant={welcomeBubble?.isEnabled ? "default" : "secondary"}>
                  {welcomeBubble?.isEnabled ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Quick Replies</span>
                <Badge variant={quickReplies.length > 0 ? "default" : "secondary"}>
                  {quickReplies.length > 0 ? `${quickReplies.length} items` : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Product Cards</span>
                <Badge variant={productCards.length > 0 ? "default" : "secondary"}>
                  {productCards.length > 0 ? `${productCards.length} items` : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Chat Buttons</span>
                <Badge variant={chatButtons.length > 0 ? "default" : "secondary"}>
                  {chatButtons.length > 0 ? `${chatButtons.length} items` : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suggested Questions</span>
                <Badge variant={suggestedQuestions.length > 0 ? "default" : "secondary"}>
                  {suggestedQuestions.length > 0 ? `${suggestedQuestions.length} items` : "Nonaktif"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Agent</CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada agent aktif</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{agents.find(a => a.isActive)?.name || "No active agent"}</p>
                    <p className="text-xs text-muted-foreground">
                      {agents.find(a => a.isActive)?.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Widget Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-widget" className="text-sm">Show Widget</Label>
                <Switch 
                  id="show-widget" 
                  checked={showWidget} 
                  onCheckedChange={setShowWidget}
                  data-testid="switch-show-widget"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Preview</CardTitle>
                </div>
                <Badge variant="outline">
                  {deviceView === "mobile" ? "375px" : deviceView === "tablet" ? "768px" : "Full"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className={`mx-auto ${getDeviceWidth()} bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden relative`}
                style={{ 
                  minHeight: deviceView === "mobile" ? "667px" : deviceView === "tablet" ? "600px" : "500px",
                }}
                data-testid="preview-container"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm opacity-60">Your Website Preview</p>
                  </div>
                </div>
                
                {showWidget && (
                  <div className="absolute bottom-4 right-4 z-50" key={previewKey}>
                    <ChatWidget 
                      merchantId={merchantId} 
                      sessionId={`preview_${merchantId}_${previewKey}`}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Links</CardTitle>
          <CardDescription>
            Konfigurasi fitur-fitur widget Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <a href="/dashboard/widget">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-widget-settings">
                <Bot className="w-5 h-5" />
                <span className="text-xs">Widget Settings</span>
              </Button>
            </a>
            <a href="/dashboard/welcome-bubble">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-welcome-bubble">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Welcome Bubble</span>
              </Button>
            </a>
            <a href="/dashboard/quick-replies">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-quick-replies">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Quick Replies</span>
              </Button>
            </a>
            <a href="/dashboard/product-cards">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-product-cards">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Product Cards</span>
              </Button>
            </a>
            <a href="/dashboard/chat-buttons">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-chat-buttons">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Chat Buttons</span>
              </Button>
            </a>
            <a href="/dashboard/agents">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-agents">
                <Bot className="w-5 h-5" />
                <span className="text-xs">AI Agents</span>
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
