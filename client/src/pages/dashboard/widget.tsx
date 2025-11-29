import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Copy, Check, Bot, Code, Moon, Sun, AlignLeft, AlignRight, Loader2, Camera, RefreshCw, X, Send, Paperclip, Smile, ImageIcon } from "lucide-react";
import type { Merchant } from "@shared/schema";

export default function WidgetPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState({
    iconUrl: "",
    iconSize: 70,
    online: true,
    primaryColor: "#6b5dfc",
    welcomeMessage: "Hi! How can I help you today?",
    agentName: "Jeany AI",
    agentPhotoUrl: "",
    widgetTheme: "light" as "light" | "dark",
    bubblePosition: "right" as "left" | "right",
  });

  const { data: merchant, isLoading } = useQuery<Merchant>({
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
        agentName: merchant.agentName || "Jeany AI",
        agentPhotoUrl: merchant.agentPhotoUrl || "",
        widgetTheme: (merchant.widgetTheme as "light" | "dark") || "light",
        bubblePosition: (merchant.bubblePosition as "left" | "right") || "right",
      });
    }
  }, [merchant]);

  const handleAgentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setConfig({ ...config, agentPhotoUrl: reader.result as string });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

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

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <Label className="text-base font-semibold">Agent & Theme Settings</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={config.agentPhotoUrl} alt={config.agentName} />
                            <AvatarFallback className="bg-primary/20">
                              <Bot className="w-6 h-6 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            data-testid="button-upload-agent-photo"
                          >
                            {isUploading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Camera className="w-3 h-3" />
                            )}
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAgentPhotoUpload}
                            data-testid="input-agent-photo-file"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">Agent Name</Label>
                          <Input
                            value={config.agentName}
                            onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                            placeholder="Jeany AI"
                            data-testid="input-agent-name"
                          />
                        </div>
                      </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Widget Theme</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={config.widgetTheme === "light" ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfig({ ...config, widgetTheme: "light" })}
                            data-testid="button-theme-light"
                          >
                            <Sun className="w-4 h-4 mr-1" />
                            Light
                          </Button>
                          <Button
                            variant={config.widgetTheme === "dark" ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfig({ ...config, widgetTheme: "dark" })}
                            data-testid="button-theme-dark"
                          >
                            <Moon className="w-4 h-4 mr-1" />
                            Dark
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Bubble Position</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={config.bubblePosition === "left" ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfig({ ...config, bubblePosition: "left" })}
                            data-testid="button-position-left"
                          >
                            <AlignLeft className="w-4 h-4 mr-1" />
                            Left
                          </Button>
                          <Button
                            variant={config.bubblePosition === "right" ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfig({ ...config, bubblePosition: "right" })}
                            data-testid="button-position-right"
                          >
                            <AlignRight className="w-4 h-4 mr-1" />
                            Right
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
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
              <div className="relative bg-muted/30 rounded-lg h-[500px] flex items-end justify-end p-4">
                <div className="absolute top-4 left-4 right-4 h-8 bg-muted rounded flex items-center px-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-status-away/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-status-online/50" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-3">yourwebsite.com</span>
                </div>

                <div
                  className={`rounded-full cursor-pointer shadow-lg flex items-center justify-center relative ${config.bubblePosition === "left" ? "mr-auto" : "ml-auto"}`}
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

                <div 
                  className={`absolute bottom-20 ${config.bubblePosition === "left" ? "left-4" : "right-4"} w-[300px] rounded-xl shadow-xl overflow-hidden border`}
                  style={{
                    backgroundColor: config.widgetTheme === "dark" ? "#1a1a2e" : "#ffffff",
                    borderColor: config.widgetTheme === "dark" ? "#2d2d44" : "#e5e7eb",
                  }}
                >
                  <div
                    className="p-3 flex items-center justify-between"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <div className="flex items-center gap-2">
                      {config.agentPhotoUrl ? (
                        <img
                          src={config.agentPhotoUrl}
                          alt={config.agentName}
                          className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="text-white">
                        <p className="text-sm font-semibold">{config.agentName}</p>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${config.online ? "bg-green-400" : "bg-gray-400"}`} />
                          <p className="text-xs opacity-90">{config.online ? "Online" : "Offline"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <RefreshCw className="w-4 h-4 text-white" />
                      </button>
                      <button className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="p-3 min-h-[150px]"
                    style={{
                      backgroundColor: config.widgetTheme === "dark" ? "#1a1a2e" : "#ffffff",
                    }}
                  >
                    <div className="flex gap-2">
                      {config.agentPhotoUrl ? (
                        <img
                          src={config.agentPhotoUrl}
                          alt={config.agentName}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${config.primaryColor}20` }}
                        >
                          <Bot className="w-4 h-4" style={{ color: config.primaryColor }} />
                        </div>
                      )}
                      <div 
                        className="rounded-lg rounded-tl-sm p-2.5 text-xs max-w-[200px]"
                        style={{
                          backgroundColor: config.widgetTheme === "dark" ? "#2d2d44" : "#f3f4f6",
                          color: config.widgetTheme === "dark" ? "#e5e7eb" : "#374151",
                        }}
                      >
                        {config.welcomeMessage}
                      </div>
                    </div>
                  </div>

                  <div 
                    className="p-2 border-t flex items-center gap-2"
                    style={{
                      backgroundColor: config.widgetTheme === "dark" ? "#1a1a2e" : "#ffffff",
                      borderColor: config.widgetTheme === "dark" ? "#2d2d44" : "#e5e7eb",
                    }}
                  >
                    <button 
                      className="p-1.5 rounded-full transition-colors"
                      style={{ color: config.widgetTheme === "dark" ? "#9ca3af" : "#6b7280" }}
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 rounded-full transition-colors"
                      style={{ color: config.widgetTheme === "dark" ? "#9ca3af" : "#6b7280" }}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 rounded-full transition-colors"
                      style={{ color: config.widgetTheme === "dark" ? "#9ca3af" : "#6b7280" }}
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <div 
                      className="flex-1 text-xs px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: config.widgetTheme === "dark" ? "#2d2d44" : "#f3f4f6",
                        color: config.widgetTheme === "dark" ? "#9ca3af" : "#9ca3af",
                      }}
                    >
                      Type a message...
                    </div>
                    <button 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <div 
                    className="py-1.5 text-center border-t"
                    style={{
                      backgroundColor: config.widgetTheme === "dark" ? "#151524" : "#f9fafb",
                      borderColor: config.widgetTheme === "dark" ? "#2d2d44" : "#e5e7eb",
                    }}
                  >
                    <span 
                      className="text-[10px]"
                      style={{ color: config.widgetTheme === "dark" ? "#6b7280" : "#9ca3af" }}
                    >
                      Powered by <span className="font-medium" style={{ color: config.primaryColor }}>Jeany AI</span>
                    </span>
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
