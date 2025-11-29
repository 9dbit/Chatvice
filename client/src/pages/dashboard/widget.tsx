import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Copy, Check, Bot, Code } from "lucide-react";

export default function WidgetPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    iconUrl: "",
    iconSize: 70,
    online: true,
    primaryColor: "#6b5dfc",
    welcomeMessage: "Hi! How can I help you today?",
  });

  const { data: merchant, isLoading } = useQuery({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  useEffect(() => {
    if (merchant) {
      setConfig({
        iconUrl: merchant.iconUrl || "",
        iconSize: merchant.iconSize || 70,
        online: merchant.online ?? true,
        primaryColor: merchant.primaryColor || "#6b5dfc",
        welcomeMessage: merchant.welcomeMessage || "Hi! How can I help you today?",
      });
    }
  }, [merchant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/config", {
        merchantId,
        ...config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Widget settings saved",
        description: "Your changes have been applied.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const embedCode = `<script src="${window.location.origin}/api/widget/jeany.js" data-merchant="${merchantId}"></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Widget Customization</h1>
        <p className="text-muted-foreground">
          Customize the appearance of your Jeany AI chat widget.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>Appearance Settings</CardTitle>
            </div>
            <CardDescription>
              Customize how your chat widget looks on your website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Icon URL</Label>
                  <Input
                    placeholder="https://example.com/icon.png"
                    value={config.iconUrl}
                    onChange={(e) => setConfig({ ...config, iconUrl: e.target.value })}
                    data-testid="input-icon-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default Jeany icon
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Icon Size</Label>
                    <span className="text-sm text-muted-foreground">{config.iconSize}px</span>
                  </div>
                  <Slider
                    value={[config.iconSize]}
                    onValueChange={([value]) => setConfig({ ...config, iconSize: value })}
                    min={50}
                    max={100}
                    step={5}
                    data-testid="slider-icon-size"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      placeholder="#6b5dfc"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Input
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    placeholder="Hi! How can I help you today?"
                    data-testid="input-welcome-message"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Online Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Show as available to customers
                    </p>
                  </div>
                  <Switch
                    checked={config.online}
                    onCheckedChange={(checked) => setConfig({ ...config, online: checked })}
                    data-testid="switch-widget-online"
                  />
                </div>

                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full"
                  data-testid="button-save-widget"
                >
                  {saveMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
              <CardDescription>
                This is how your widget will appear on your website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted/30 rounded-lg h-[400px] flex items-end justify-end p-4">
                <div className="absolute top-4 left-4 right-4 h-8 bg-muted rounded flex items-center px-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-status-away/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-status-online/50" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-3">yourwebsite.com</span>
                </div>

                <div
                  className="rounded-full cursor-pointer shadow-lg flex items-center justify-center relative"
                  style={{
                    width: config.iconSize,
                    height: config.iconSize,
                    backgroundColor: config.primaryColor,
                  }}
                  data-testid="preview-widget-button"
                >
                  {config.iconUrl ? (
                    <img
                      src={config.iconUrl}
                      alt="Chat icon"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Bot className="w-1/2 h-1/2 text-white" />
                  )}
                  <div
                    className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
                      config.online ? "bg-status-online" : "bg-status-offline"
                    }`}
                  />
                </div>

                <div className="absolute bottom-20 right-4 w-[280px] bg-card rounded-xl shadow-xl overflow-hidden border border-card-border">
                  <div
                    className="p-3 flex items-center gap-2"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-white">
                      <p className="text-sm font-medium">Jeany AI</p>
                      <p className="text-xs opacity-80">Always here to help</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${config.primaryColor}20` }}
                      >
                        <Bot className="w-3 h-3" style={{ color: config.primaryColor }} />
                      </div>
                      <div className="bg-muted rounded-lg rounded-bl-sm p-2 text-xs">
                        {config.welcomeMessage}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Embed Code</CardTitle>
              </div>
              <CardDescription>
                Add this script to your website to enable the chat widget.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all">
                {embedCode}
              </div>
              <Button
                variant="outline"
                onClick={handleCopyCode}
                className="w-full"
                data-testid="button-copy-embed"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Embed Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
