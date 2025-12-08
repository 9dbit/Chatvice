import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Eye, Smartphone, Monitor, Tablet, RefreshCw, 
  MessageSquare, Bot, Loader2, ExternalLink,
  Settings, Sparkles, Package, MousePointer
} from "lucide-react";
import ChatWidget from "@/pages/chat-widget";
import type { Agent, WelcomeBubble, QuickReply, ProductCard, ChatButton, SuggestedQuestion, Merchant } from "@shared/schema";

export default function LivePreviewPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const [deviceView, setDeviceView] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [showWidget, setShowWidget] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  const previewSessionId = useMemo(() => 
    `customer_preview_${merchantId}_${Date.now()}_${previewKey}`,
    [merchantId, previewKey]
  );

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

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

  const handleRefresh = () => {
    setShowWidget(false);
    setTimeout(() => {
      setPreviewKey(prev => prev + 1);
      setShowWidget(true);
    }, 100);
  };

  const getDeviceDimensions = () => {
    switch (deviceView) {
      case "mobile": return { width: 375, height: 667, scale: 0.85 };
      case "tablet": return { width: 768, height: 600, scale: 0.7 };
      case "desktop": return { width: 1280, height: 720, scale: 0.55 };
      default: return { width: 375, height: 667, scale: 0.85 };
    }
  };

  if (agentsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dimensions = getDeviceDimensions();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Live Preview</h1>
          <p className="text-muted-foreground">
            Preview your chat widget with all integrated features
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
            href={`/embed/${merchantId}/${activeAgent?.id || ''}`}
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
                Active features in the widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Welcome Bubble</span>
                <Badge variant={welcomeBubble?.isEnabled ? "default" : "secondary"}>
                  {welcomeBubble?.isEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Quick Replies</span>
                <Badge variant={quickReplies.length > 0 ? "default" : "secondary"}>
                  {quickReplies.length > 0 ? `${quickReplies.length} items` : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Product Cards</span>
                <Badge variant={productCards.length > 0 ? "default" : "secondary"}>
                  {productCards.length > 0 ? `${productCards.length} items` : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Chat Buttons</span>
                <Badge variant={chatButtons.length > 0 ? "default" : "secondary"}>
                  {chatButtons.length > 0 ? `${chatButtons.length} items` : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suggested Questions</span>
                <Badge variant={suggestedQuestions.length > 0 ? "default" : "secondary"}>
                  {suggestedQuestions.length > 0 ? `${suggestedQuestions.length} items` : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Agent</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeAgent ? (
                <p className="text-sm text-muted-foreground">No active agent configured</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activeAgent.name}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
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
                  <CardTitle className="text-base">Your Website Preview</CardTitle>
                </div>
                <Badge variant="outline">
                  {deviceView === "mobile" ? "375 x 667" : deviceView === "tablet" ? "768 x 600" : "1280 x 720"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div 
                className="bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center"
                style={{ 
                  width: "100%",
                  minHeight: "500px",
                  maxHeight: "70vh",
                }}
                data-testid="preview-container"
              >
                <div 
                  className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden flex flex-col shadow-2xl border border-border"
                  style={{ 
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                    transform: `scale(${dimensions.scale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <div className="h-8 bg-slate-300 dark:bg-slate-700 flex items-center px-3 gap-1.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <div className="flex-1 mx-3">
                      <div className="bg-slate-200 dark:bg-slate-600 rounded-md h-5 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground truncate px-2">yourwebsite.com</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {deviceView === "mobile" ? "Mobile" : deviceView === "tablet" ? "Tablet" : "Desktop"}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center text-muted-foreground">
                        <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-15" />
                        <p className="text-xl font-medium opacity-30">Your Website Content</p>
                        <p className="text-sm opacity-20 mt-2">Widget appears in the corner</p>
                      </div>
                    </div>
                    
                    {showWidget && (
                      <div 
                        className="absolute inset-0"
                        key={previewKey}
                      >
                        <ChatWidget 
                          merchantId={merchantId} 
                          sessionId={previewSessionId}
                          embedded={false}
                          previewMode={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Links</CardTitle>
          <CardDescription>
            Configure your widget features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <a href="/dashboard/widget">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-widget-settings">
                <Settings className="w-5 h-5" />
                <span className="text-xs">Widget Settings</span>
              </Button>
            </a>
            <a href="/dashboard/welcome-bubble">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-welcome-bubble">
                <Sparkles className="w-5 h-5" />
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
                <Package className="w-5 h-5" />
                <span className="text-xs">Product Cards</span>
              </Button>
            </a>
            <a href="/dashboard/chat-buttons">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1" data-testid="link-chat-buttons">
                <MousePointer className="w-5 h-5" />
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
