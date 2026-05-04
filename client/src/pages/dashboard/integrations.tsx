import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  SiSlack, 
  SiWhatsapp, 
  SiTelegram, 
  SiMessenger, 
  SiInstagram,
  SiShopify,
  SiZendesk,
  SiSalesforce,
  SiHubspot,
  SiIntercom,
} from "react-icons/si";
import { Search, ExternalLink, Check, Clock, Plug, Send, Bell, BellRing, Sparkles, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { NotificationSetting } from "@shared/schema";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "messaging" | "crm" | "ecommerce" | "helpdesk" | "notifications" | "payment" | "ai";
  status: "available" | "coming_soon" | "connected";
  popular?: boolean;
  configurable?: boolean;
}

const categoryLabels: Record<string, string> = {
  notifications: "Notifications",
  messaging: "Messaging",
  crm: "CRM",
  ecommerce: "E-Commerce",
  helpdesk: "Helpdesk",
  payment: "Payment",
  ai: "AI & Automation",
};

export default function IntegrationsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [localBotToken, setLocalBotToken] = useState("");
  const [localChatId, setLocalChatId] = useState("");

  const { data: settings } = useQuery<NotificationSetting>({
    queryKey: ["/api/notification-settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<NotificationSetting>) => {
      return apiRequest("PUT", "/api/notification-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: t("dashboard.integrations.saved") });
    },
    onError: () => {
      toast({ title: t("dashboard.integrations.saveFailed"), variant: "destructive" });
    },
  });

  const integrations: Integration[] = [
    {
      id: "push-notifications",
      name: "Browser Notifications",
      description: t("dashboard.integrations.toast.desktopAlertsWithSoundDesc"),
      icon: BellRing,
      category: "notifications",
      status: settings?.browserPushEnabled ? "connected" : "available",
      popular: true,
      configurable: true,
    },
    {
      id: "telegram",
      name: "Telegram Bot",
      description: t("dashboard.integrations.toast.receiveChatNotificationsViaDesc"),
      icon: SiTelegram,
      category: "notifications",
      status: settings?.telegramEnabled ? "connected" : "available",
      popular: true,
      configurable: true,
    },
    {
      id: "slack",
      name: "Slack",
      description: t("dashboard.integrations.toast.receiveEscalationNotificationsAndDesc"),
      icon: SiSlack,
      category: "messaging",
      status: "available",
      popular: true,
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: t("dashboard.integrations.toast.connectYourWhatsappBusinessDesc"),
      icon: SiWhatsapp,
      category: "messaging",
      status: "coming_soon",
      popular: true,
    },
    {
      id: "messenger",
      name: "Facebook Messenger",
      description: t("dashboard.integrations.toast.manageFacebookMessengerConversationsDesc"),
      icon: SiMessenger,
      category: "messaging",
      status: "coming_soon",
      popular: true,
    },
    {
      id: "instagram",
      name: "Instagram DM",
      description: t("dashboard.integrations.toast.handleInstagramDirectMessagesDesc"),
      icon: SiInstagram,
      category: "messaging",
      status: "coming_soon",
    },
    {
      id: "zendesk",
      name: "Zendesk",
      description: t("dashboard.integrations.toast.syncTicketsAndConversationsDesc"),
      icon: SiZendesk,
      category: "helpdesk",
      status: "available",
      popular: true,
    },
    {
      id: "salesforce",
      name: "Salesforce",
      description: t("dashboard.integrations.toast.integrateWithSalesforceCrmDesc"),
      icon: SiSalesforce,
      category: "crm",
      status: "coming_soon",
    },
    {
      id: "hubspot",
      name: "HubSpot",
      description: t("dashboard.integrations.toast.connectHubspotCrmToDesc"),
      icon: SiHubspot,
      category: "crm",
      status: "available",
    },
    {
      id: "intercom",
      name: "Intercom",
      description: t("dashboard.integrations.toast.migrateFromIntercomOrDesc"),
      icon: SiIntercom,
      category: "helpdesk",
      status: "coming_soon",
    },
    {
      id: "shopify",
      name: "Shopify",
      description: t("dashboard.integrations.toast.accessOrderDataAndDesc"),
      icon: SiShopify,
      category: "ecommerce",
      status: "available",
      popular: true,
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Accept PayPal payments and let customers check order & payment status directly in chat.",
      icon: Plug,
      category: "payment",
      status: "coming_soon",
      popular: true,
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Process card payments and surface invoice or subscription data in your AI responses.",
      icon: Plug,
      category: "payment",
      status: "coming_soon",
    },
    {
      id: "openai-gpt",
      name: "OpenAI GPT",
      description: "Underlying AI engine powering your chatbot responses. Monitor usage and configure model settings.",
      icon: Sparkles,
      category: "ai",
      status: "connected",
      popular: true,
    },
    {
      id: "google-sheets-ai",
      name: "Google Sheets AI",
      description: "Real-time data lookup from Google Sheets — hotel availability, product catalog, and transaction records.",
      icon: Plug,
      category: "ai",
      status: "available",
    },
  ];

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(integrations.map((i) => i.category)))];

  function handleIntegrationClick(integration: Integration) {
    if (integration.id === "telegram") {
      setLocalBotToken(settings?.telegramBotToken || "");
      setLocalChatId(settings?.telegramChatId || "");
      setTelegramDialogOpen(true);
    } else if (integration.id === "push-notifications") {
      setPushDialogOpen(true);
    }
  }

  async function handleTestTelegram() {
    if (!localBotToken || !localChatId) {
      toast({ title: t("dashboard.integrations.botTokenRequired"), variant: "destructive" });
      return;
    }
    
    // Save first
    await updateMutation.mutateAsync({ 
      telegramBotToken: localBotToken, 
      telegramChatId: localChatId 
    });
    
    try {
      const res = await apiRequest("POST", "/api/notification-settings/test-telegram");
      if (res.ok) {
        toast({ title: t("dashboard.integrations.testSent") });
      } else {
        toast({ title: t("dashboard.integrations.testFailed"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("dashboard.integrations.testFailed"), variant: "destructive" });
    }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      toast({ title: t("dashboard.integrations.browserNotSupported"), variant: "destructive" });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      updateMutation.mutate({ browserPushEnabled: true });
      toast({ title: t("dashboard.integrations.browserEnabled") });
      
      // Send test notification
      new Notification("Chatvice Notifications Enabled", {
        body: "You'll now receive sound alerts when browser is in background",
        icon: "/favicon.ico",
      });
    } else {
      toast({ title: t("dashboard.integrations.permissionDenied"), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-integrations-title">{t("dashboard.integrations.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Connect Chatvice with your favorite tools and platforms
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-integrations"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
              data-testid={`button-category-${category}`}
            >
              {category === "all" ? "All" : categoryLabels[category] || category}
            </Button>
          ))}
        </div>
      </div>

      {(() => {
        const categoryIconBg: Record<string, string> = {
          notifications: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          messaging: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
          crm: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          ecommerce: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
          helpdesk: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
          payment: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
          ai: "bg-primary/15 text-primary",
        };
        const categoryAccent: Record<string, string> = {
          notifications: "text-amber-600 dark:text-amber-400",
          messaging: "text-blue-600 dark:text-blue-400",
          crm: "text-emerald-600 dark:text-emerald-400",
          ecommerce: "text-violet-600 dark:text-violet-400",
          helpdesk: "text-rose-600 dark:text-rose-400",
          payment: "text-cyan-600 dark:text-cyan-400",
          ai: "text-primary",
        };
        const categoryIcon: Record<string, (props: { className?: string }) => JSX.Element | null> = {
          notifications: Bell,
          messaging: Send,
          crm: ExternalLink,
          ecommerce: Plug,
          helpdesk: Plug,
          payment: CreditCard,
          ai: Sparkles,
        };

        const renderCard = (integration: Integration) => {
          const iconBgClass = categoryIconBg[integration.category] ?? "bg-muted text-muted-foreground";
          const isConnected = integration.status === "connected";
          return (
            <Card
              key={integration.id}
              className={`hover-elevate transition-all flex flex-col ${isConnected ? "ring-1 ring-green-500/30" : ""}`}
              data-testid={`card-integration-${integration.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                    <integration.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-semibold">
                        {integration.name}
                      </CardTitle>
                      {integration.popular && (
                        <Badge variant="secondary" className="text-[10px]">Popular</Badge>
                      )}
                    </div>
                    <div className="mt-1">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      ) : integration.status === "coming_soon" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Coming Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <Plug className="w-3 h-3" />
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-1">
                <CardDescription className="text-xs mb-4 line-clamp-2 flex-1">
                  {integration.description}
                </CardDescription>
                <Button
                  variant={isConnected ? "outline" : integration.status === "coming_soon" ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={integration.status === "coming_soon"}
                  onClick={() => handleIntegrationClick(integration)}
                  data-testid={`button-connect-${integration.id}`}
                >
                  {isConnected ? (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage
                    </>
                  ) : integration.status === "coming_soon" ? (
                    "Coming Soon"
                  ) : (
                    <>
                      <Plug className="w-4 h-4 mr-2" />{t("dashboard.integrations.connect")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        };

        if (filteredIntegrations.length === 0) {
          return (
            <div className="text-center py-12">
              <Plug className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No integrations found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your search or filter criteria</p>
            </div>
          );
        }

        if (selectedCategory !== "all" || searchQuery) {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map(renderCard)}
            </div>
          );
        }

        return (
          <div className="space-y-8">
            {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map((catKey) => {
              const catIntegrations = filteredIntegrations.filter((i) => i.category === catKey);
              if (catIntegrations.length === 0) return null;
              const CatIcon = categoryIcon[catKey] ?? Plug;
              const accentClass = categoryAccent[catKey] ?? "text-muted-foreground";
              const iconBg = categoryIconBg[catKey] ?? "bg-muted text-muted-foreground";
              return (
                <div key={catKey} className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${iconBg}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <h2 className={`text-sm font-semibold ${accentClass}`}>{categoryLabels[catKey]}</h2>
                    <Badge variant="secondary" className="text-[10px]">{catIntegrations.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catIntegrations.map(renderCard)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Plug className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Need a custom integration?</h3>
              <p className="text-sm text-muted-foreground">
                We can build custom integrations for Enterprise customers. Contact our team to discuss your requirements.
              </p>
            </div>
            <Button variant="outline" className="whitespace-nowrap" data-testid="button-request-integration">
              Request Integration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Configuration Dialog */}
      <Dialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiTelegram className="w-5 h-5" />
              Telegram Bot Integration
            </DialogTitle>
            <DialogDescription>
              Receive chat notifications via Telegram even when browser is closed
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("dashboard.integrations.enableTelegram")}</Label>
                <p className="text-xs text-muted-foreground">Send alerts to Telegram</p>
              </div>
              <Switch
                checked={settings?.telegramEnabled || false}
                onCheckedChange={(checked) => updateMutation.mutate({ telegramEnabled: checked })}
                data-testid="switch-telegram-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-token">{t("dashboard.integrations.botToken")}</Label>
              <Input
                id="bot-token"
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={localBotToken}
                onChange={(e) => setLocalBotToken(e.target.value)}
                onBlur={() => {
                  if (localBotToken !== settings?.telegramBotToken) {
                    updateMutation.mutate({ telegramBotToken: localBotToken });
                  }
                }}
                data-testid="input-telegram-bot-token"
              />
              <p className="text-xs text-muted-foreground">
                Create via{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  @BotFather
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chat-id">{t("dashboard.integrations.chatId")}</Label>
              <Input
                id="chat-id"
                placeholder="Your chat ID or group ID"
                value={localChatId}
                onChange={(e) => setLocalChatId(e.target.value)}
                onBlur={() => {
                  if (localChatId !== settings?.telegramChatId) {
                    updateMutation.mutate({ telegramChatId: localChatId });
                  }
                }}
                data-testid="input-telegram-chat-id"
              />
              <p className="text-xs text-muted-foreground">
                Get from{" "}
                <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  @userinfobot
                </a>
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleTestTelegram}
              disabled={updateMutation.isPending}
              data-testid="button-test-telegram"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test Notification
            </Button>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={async () => {
                try {
                  const res = await apiRequest("POST", "/api/merchant/telegram/setup-webhook");
                  const data = await res.json();
                  if (data.success) {
                    toast({ title: t("dashboard.integrations.telegramWebhookSet") });
                  } else {
                    toast({ title: t("dashboard.integrations.webhookFailed"), variant: "destructive" });
                  }
                } catch {
                  toast({ title: t("dashboard.integrations.webhookFailed"), variant: "destructive" });
                }
              }}
              data-testid="button-setup-telegram-webhook"
            >
              <Plug className="w-4 h-4 mr-2" />
              Enable Supervisor Telegram Replies
            </Button>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">Setup Steps:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Open @BotFather, send /newbot</li>
                <li>{t("dashboard.integrations.copyBotToken")}</li>
                <li>Get your Chat ID from @userinfobot</li>
                <li>{t("dashboard.integrations.startChatFirst")}</li>
                <li>{t("dashboard.integrations.enableAndTest")}</li>
                <li>Click "Enable Supervisor Telegram Replies" to allow supervisors to reply via Telegram</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Browser Notifications Dialog */}
      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Browser Notifications
            </DialogTitle>
            <DialogDescription>
              Get desktop alerts when dashboard tab is open in background
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("dashboard.integrations.enableDesktopAlerts")}</Label>
                <p className="text-xs text-muted-foreground">Notifications when tab is in background</p>
              </div>
              <Switch
                checked={settings?.browserPushEnabled || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    requestNotificationPermission();
                  } else {
                    updateMutation.mutate({ browserPushEnabled: false });
                  }
                }}
                data-testid="switch-push-enabled"
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <BellRing className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">How it works</p>
                  <p className="text-xs text-muted-foreground">
                    Desktop notification popups will appear for new messages when the dashboard tab is open but not focused.
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground border-t pt-3">
                <p className="font-medium mb-1">Note:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>{t("dashboard.integrations.tabMustBeOpen")}</li>
                  <li>{t("dashboard.integrations.useTelegramForBrowser")}</li>
                </ul>
              </div>
            </div>

            {settings?.browserPushEnabled && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  Browser notifications are enabled
                </span>
              </div>
            )}

            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => {
                new Notification("Test Notification", {
                  body: "This is how notifications will appear",
                  icon: "/favicon.ico",
                });
              }}
              disabled={!settings?.browserPushEnabled}
              data-testid="button-test-push"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Test Notification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
