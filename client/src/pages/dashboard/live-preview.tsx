import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Eye, RefreshCw, MessageSquare, Bot, Loader2, ExternalLink,
  Settings, Sparkles, Package, MousePointer, CheckCircle2, AlertCircle
} from "lucide-react";
import ChatWidget from "@/pages/chat-widget";
import type { Agent, WelcomeBubble, QuickReply, ProductCard, ChatButton, SuggestedQuestion, Merchant } from "@shared/schema";

export default function LivePreviewPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Live Preview</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Preview your chat widget - appears at bottom right of this page
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            data-testid="button-refresh-preview"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <a 
            href={`/embed/${merchantId}/${activeAgent?.id || ''}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" data-testid="button-open-fullscreen">
              <ExternalLink className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <p className="text-xs text-muted-foreground">
              Toggle to show/hide the chat widget on this page
            </p>
          </CardContent>
        </Card>

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

      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <Eye className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Widget Preview Active</p>
            <p className="text-sm mt-1">
              Look at the bottom-right corner of this page to see your chat widget
            </p>
            <Badge variant="outline" className="mt-3">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Live
            </Badge>
          </div>
        </CardContent>
      </Card>

      {showWidget && (
        <ChatWidget 
          key={previewKey}
          merchantId={merchantId} 
          sessionId={previewSessionId}
          embedded={false}
          previewMode={true}
        />
      )}
    </div>
  );
}
