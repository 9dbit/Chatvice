import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bot,
  Sparkles,
  Save,
  Trash,
  Plus,
  Clock,
  RefreshCw,
  Loader2,
  Eye,
  Link2,
  Globe,
  CheckCircle,
  X,
  Upload,
  Database,
  Send,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";

interface ChatviceGuideTabProps {
  toast: any;
}

export default function ChatviceGuideTab({ toast }: ChatviceGuideTabProps) {
  const [guideSettings, setGuideSettings] = useState({
    enabled: true,
    name: "Chatvice Guide",
    description: "AI assistant to help users navigate the platform",
    systemPrompt: "You are Chatvice Guide, a helpful AI assistant that helps users understand the Chatvice platform. Be friendly, concise, and helpful.",
    welcomeMessage: "Hi! I'm Chatvice Guide. I can help you learn about our AI customer service platform.",
    temperature: "0.7",
    showOnLanding: true,
    showOnDashboard: true,
    widgetPosition: "bottom-right",
    widgetColor: "#7c3aed",
    bubbleEnabled: true,
    bubbleText: "Need help?",
    buttonIconUrl: "",
    buttonIconWidth: 0,
    buttonIconHeight: 0,
  });

  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [sources, setSources] = useState<{ id: string; name: string; url: string; status: string; content?: string }[]>([]);
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoImageEnabled, setPromoImageEnabled] = useState(false);
  const [iconUploadProgress, setIconUploadProgress] = useState<number | null>(null);
  const [promoUploadProgress, setPromoUploadProgress] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<{ role: string; content: string }[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [isPreviewTyping, setIsPreviewTyping] = useState(false);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: platformSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
  });

  useEffect(() => {
    if (platformSettings) {
      const settings = platformSettings as any;
      if (settings.guide_enabled !== undefined) {
        setGuideSettings(prev => ({
          ...prev,
          enabled: settings.guide_enabled === "true",
          name: settings.guide_name || prev.name,
          description: settings.guide_description || prev.description,
          systemPrompt: settings.guide_system_prompt || prev.systemPrompt,
          welcomeMessage: settings.guide_welcome_message || prev.welcomeMessage,
          temperature: settings.guide_temperature || prev.temperature,
          showOnLanding: settings.guide_show_landing !== "false",
          showOnDashboard: settings.guide_show_dashboard !== "false",
          widgetPosition: settings.guide_widget_position || prev.widgetPosition,
          widgetColor: settings.guide_widget_color || prev.widgetColor,
          bubbleEnabled: settings.guide_bubble_enabled !== "false",
          bubbleText: settings.guide_bubble_text || prev.bubbleText,
          buttonIconUrl: settings.guide_button_icon_url || "",
          buttonIconWidth: parseInt(settings.guide_button_icon_width || "0") || 0,
          buttonIconHeight: parseInt(settings.guide_button_icon_height || "0") || 0,
        }));
      }
      if (!hasLoadedInitialContent) {
        if (settings.guide_knowledge_content !== undefined) {
          setKnowledgeContent(settings.guide_knowledge_content);
        }
        if (settings.guide_promo_image_enabled !== undefined) {
          setPromoImageEnabled(settings.guide_promo_image_enabled === "true");
        }
        if (settings.guide_promo_image_url) {
          setPromoImageUrl(settings.guide_promo_image_url);
        }
        setHasLoadedInitialContent(true);
      }
      if (settings.guide_last_updated) {
        setLastUpdated(settings.guide_last_updated);
      }
    }
  }, [platformSettings, hasLoadedInitialContent]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const response = await apiRequest("POST", "/api/admin/platform-settings/batch", {
        settings: {
          guide_enabled: String(guideSettings.enabled),
          guide_name: guideSettings.name,
          guide_description: guideSettings.description,
          guide_system_prompt: guideSettings.systemPrompt,
          guide_welcome_message: guideSettings.welcomeMessage,
          guide_temperature: guideSettings.temperature,
          guide_show_landing: String(guideSettings.showOnLanding),
          guide_show_dashboard: String(guideSettings.showOnDashboard),
          guide_widget_position: guideSettings.widgetPosition,
          guide_widget_color: guideSettings.widgetColor,
          guide_bubble_enabled: String(guideSettings.bubbleEnabled),
          guide_bubble_text: guideSettings.bubbleText,
          guide_button_icon_url: guideSettings.buttonIconUrl,
          guide_button_icon_width: String(guideSettings.buttonIconWidth),
          guide_button_icon_height: String(guideSettings.buttonIconHeight),
          guide_knowledge_content: knowledgeContent,
          guide_promo_image_enabled: String(promoImageEnabled),
          guide_promo_image_url: promoImageUrl,
          guide_last_updated: now,
        },
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data?.guide_last_updated) {
        setLastUpdated(data.guide_last_updated);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      toast({
        title: "Settings Saved",
        description: "Chatvice Guide settings have been updated.",
      });
      refetchSettings();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  useEffect(() => {
    if (!hasLoadedInitialContent) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      saveMutation.mutate(undefined, {
        onSuccess: () => {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        },
        onError: () => {
          setAutoSaveStatus('idle');
        }
      });
    }, 1500);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [guideSettings, promoImageEnabled, promoImageUrl, hasLoadedInitialContent]);

  const { data: sourcesData, refetch: refetchSources } = useQuery({
    queryKey: ["/api/admin/guide/sources"],
  });

  useEffect(() => {
    if (sourcesData) {
      setSources(sourcesData as any);
    }
  }, [sourcesData]);

  const crawlMutation = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      setIsCrawling(true);
      const res = await apiRequest("POST", "/api/admin/guide/crawl", { url, name });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to crawl URL");
      }
      return data;
    },
    onSuccess: (data) => {
      setIsCrawling(false);
      setSources(data.sources);
      if (data.extractedContent && data.source?.name) {
        setKnowledgeContent(prev => {
          if (prev && prev.trim()) {
            return prev + "\n\n---\n\n" + `[Source: ${data.source.name}]\n${data.extractedContent}`;
          }
          return `[Source: ${data.source.name}]\n${data.extractedContent}`;
        });
      }
      setShowAddSourceDialog(false);
      setNewSourceUrl("");
      setNewSourceName("");
      toast({
        title: "Source Added",
        description: "URL has been crawled and content extracted successfully.",
      });
      refetchSources();
    },
    onError: async (error: any) => {
      setIsCrawling(false);
      let errorMessage = "Failed to extract content from URL.";
      if (error?.response) {
        try {
          const data = await error.response.json();
          errorMessage = data.error || errorMessage;
        } catch {}
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Crawl Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/guide/sources/${sourceId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setSources(data.sources);
      if (data.knowledgeContent !== undefined) {
        setKnowledgeContent(data.knowledgeContent);
      }
      toast({
        title: "Source Deleted",
        description: "Knowledge source and its content have been removed.",
      });
      refetchSources();
      refetchSettings();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete source.",
        variant: "destructive",
      });
    },
  });

  const handleAddSource = () => {
    if (!newSourceUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to crawl.",
        variant: "destructive",
      });
      return;
    }
    let urlToProcess = newSourceUrl.trim();
    if (!urlToProcess.startsWith('http://') && !urlToProcess.startsWith('https://')) {
      urlToProcess = 'https://' + urlToProcess;
    }
    crawlMutation.mutate({ url: urlToProcess, name: newSourceName.trim() });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Chatvice Guide AI Agent
          </CardTitle>
          <CardDescription>Configure the AI assistant that helps users on landing page and merchant dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Enable Chatvice Guide</p>
              <p className="text-sm text-muted-foreground">Show the AI help bubble across the platform</p>
            </div>
            <Checkbox 
              checked={guideSettings.enabled} 
              onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, enabled: !!checked }))}
              data-testid="checkbox-guide-enabled"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guide-name">Agent Name</Label>
              <Input 
                id="guide-name"
                value={guideSettings.name}
                onChange={(e) => setGuideSettings(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
                data-testid="input-guide-name"
              />
            </div>
            <div>
              <Label htmlFor="guide-temp">Temperature</Label>
              <Select 
                value={guideSettings.temperature} 
                onValueChange={(value) => setGuideSettings(prev => ({ ...prev, temperature: value }))}
              >
                <SelectTrigger className="mt-1" data-testid="select-guide-temperature">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">0.3 - More Focused</SelectItem>
                  <SelectItem value="0.5">0.5 - Balanced</SelectItem>
                  <SelectItem value="0.7">0.7 - Creative</SelectItem>
                  <SelectItem value="0.9">0.9 - Very Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="guide-desc">Description</Label>
            <Input 
              id="guide-desc"
              value={guideSettings.description}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1"
              data-testid="input-guide-description"
            />
          </div>

          <div>
            <Label htmlFor="guide-welcome">Welcome Message</Label>
            <Textarea 
              id="guide-welcome"
              value={guideSettings.welcomeMessage}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="mt-1"
              rows={2}
              data-testid="input-guide-welcome"
            />
          </div>

          <div>
            <Label htmlFor="guide-prompt">System Prompt</Label>
            <Textarea 
              id="guide-prompt"
              value={guideSettings.systemPrompt}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="mt-1"
              rows={4}
              data-testid="input-guide-prompt"
            />
            <p className="text-xs text-muted-foreground mt-1">Define the AI's personality and behavior</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Widget Settings
          </CardTitle>
          <CardDescription>Configure where and how the Chatvice Guide appears</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Show on Landing Page</p>
                <p className="text-xs text-muted-foreground">Display on public website</p>
              </div>
              <Checkbox 
                checked={guideSettings.showOnLanding} 
                onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, showOnLanding: !!checked }))}
                data-testid="checkbox-guide-landing"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Show on Merchant Dashboard</p>
                <p className="text-xs text-muted-foreground">Help merchants navigate</p>
              </div>
              <Checkbox 
                checked={guideSettings.showOnDashboard} 
                onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, showOnDashboard: !!checked }))}
                data-testid="checkbox-guide-dashboard"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Widget Position</Label>
              <Select 
                value={guideSettings.widgetPosition} 
                onValueChange={(value) => setGuideSettings(prev => ({ ...prev, widgetPosition: value }))}
              >
                <SelectTrigger className="mt-1" data-testid="select-guide-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="guide-color">Widget Color</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  id="guide-color"
                  type="color"
                  value={guideSettings.widgetColor}
                  onChange={(e) => setGuideSettings(prev => ({ ...prev, widgetColor: e.target.value }))}
                  className="w-12 h-9 p-1"
                  data-testid="input-guide-color"
                />
                <Input 
                  value={guideSettings.widgetColor}
                  onChange={(e) => setGuideSettings(prev => ({ ...prev, widgetColor: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="p-3 border rounded-lg space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium text-sm">Custom Button Icon</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Upload a custom icon for the widget button. Button size will match the image dimensions (no masking/cropping).</p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="button-icon-url" className="text-xs">Image URL or Upload</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      id="button-icon-url"
                      value={guideSettings.buttonIconUrl}
                      onChange={(e) => {
                        const url = e.target.value;
                        setGuideSettings(prev => ({ ...prev, buttonIconUrl: url, buttonIconWidth: 0, buttonIconHeight: 0 }));
                        if (url) {
                          const img = new (window as any).Image();
                          img.onload = () => {
                            setGuideSettings(prev => ({ ...prev, buttonIconWidth: img.width, buttonIconHeight: img.height }));
                          };
                          img.src = url;
                        }
                      }}
                      placeholder="https://example.com/icon.png or upload below"
                      className="flex-1"
                      data-testid="input-guide-button-icon-url"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="button-icon-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("type", "guide_icon");
                          
                          const xhr = new XMLHttpRequest();
                          xhr.upload.addEventListener('progress', (event) => {
                            if (event.lengthComputable) {
                              const percent = Math.round((event.loaded / event.total) * 100);
                              setIconUploadProgress(percent);
                            }
                          });
                          xhr.addEventListener('load', () => {
                            setIconUploadProgress(null);
                            if (xhr.status === 200) {
                              const data = JSON.parse(xhr.responseText);
                              const url = data.url;
                              const img = new (window as any).Image();
                              img.onload = () => {
                                setGuideSettings(prev => ({ 
                                  ...prev, 
                                  buttonIconUrl: url,
                                  buttonIconWidth: img.width, 
                                  buttonIconHeight: img.height 
                                }));
                              };
                              img.src = url;
                            } else {
                              toast({
                                title: "Upload Failed",
                                description: "Failed to upload icon image",
                                variant: "destructive",
                              });
                            }
                          });
                          xhr.addEventListener('error', () => {
                            setIconUploadProgress(null);
                            toast({
                              title: "Upload Failed",
                              description: "Failed to upload icon image",
                              variant: "destructive",
                            });
                          });
                          xhr.open('POST', '/api/admin/brand-upload');
                          xhr.withCredentials = true;
                          xhr.send(formData);
                        }
                        e.target.value = '';
                      }}
                      data-testid="input-guide-button-icon-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('button-icon-upload')?.click()}
                      disabled={iconUploadProgress !== null}
                      data-testid="button-upload-icon"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {iconUploadProgress !== null ? `${iconUploadProgress}%` : 'Upload'}
                    </Button>
                  </div>
                  {iconUploadProgress !== null && (
                    <div className="mt-2">
                      <Progress value={iconUploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
                {guideSettings.buttonIconUrl && (
                  <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border">
                    <div className="flex-shrink-0">
                      <img 
                        src={guideSettings.buttonIconUrl} 
                        alt="Button icon preview" 
                        className="max-w-[100px] max-h-[100px] object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Detected size: {guideSettings.buttonIconWidth} x {guideSettings.buttonIconHeight}px
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setGuideSettings(prev => ({ ...prev, buttonIconUrl: "", buttonIconWidth: 0, buttonIconHeight: 0 }))}
                        className="text-destructive hover:text-destructive"
                        data-testid="button-remove-icon"
                      >
                        <Trash className="w-3 h-3 mr-1" />
                        Remove Icon
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Welcome Bubble</p>
                <Checkbox 
                  checked={guideSettings.bubbleEnabled} 
                  onCheckedChange={(checked) => setGuideSettings(prev => ({ ...prev, bubbleEnabled: !!checked }))}
                  data-testid="checkbox-guide-bubble"
                />
              </div>
              <p className="text-xs text-muted-foreground">Show a tooltip bubble to attract attention</p>
            </div>
            <Input 
              value={guideSettings.bubbleText}
              onChange={(e) => setGuideSettings(prev => ({ ...prev, bubbleText: e.target.value }))}
              className="w-48"
              placeholder="Need help?"
              disabled={!guideSettings.bubbleEnabled}
              data-testid="input-guide-bubble-text"
            />
          </div>

          <div className="p-3 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Promo Image</p>
                  <Checkbox 
                    checked={promoImageEnabled} 
                    onCheckedChange={(checked) => setPromoImageEnabled(!!checked)}
                    data-testid="checkbox-guide-promo-image"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Display a promotional image near the chat bubble</p>
              </div>
            </div>
            {promoImageEnabled && (
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-xs font-medium mb-2">Upload Promo Image</p>
                  <p className="text-xs text-muted-foreground mb-3">Suggested dimensions: 200x100px. Supports JPG, PNG, GIF formats.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      id="promo-image-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                          if (!validTypes.includes(file.type)) {
                            toast({
                              title: "Invalid Format",
                              description: "Please upload JPG, PNG, or GIF image only.",
                              variant: "destructive",
                            });
                            e.target.value = '';
                            return;
                          }
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("type", "promo_image");
                          
                          const xhr = new XMLHttpRequest();
                          xhr.upload.addEventListener('progress', (event) => {
                            if (event.lengthComputable) {
                              const percent = Math.round((event.loaded / event.total) * 100);
                              setPromoUploadProgress(percent);
                            }
                          });
                          xhr.addEventListener('load', () => {
                            setPromoUploadProgress(null);
                            if (xhr.status === 200) {
                              const data = JSON.parse(xhr.responseText);
                              setPromoImageUrl(data.url);
                              toast({
                                title: "Uploaded",
                                description: "Promo image uploaded successfully.",
                              });
                            } else {
                              toast({
                                title: "Upload Failed",
                                description: "Failed to upload promo image",
                                variant: "destructive",
                              });
                            }
                          });
                          xhr.addEventListener('error', () => {
                            setPromoUploadProgress(null);
                            toast({
                              title: "Upload Error",
                              description: "Failed to upload image. Please try again.",
                              variant: "destructive",
                            });
                          });
                          xhr.open('POST', '/api/admin/brand-upload');
                          xhr.withCredentials = true;
                          xhr.send(formData);
                        }
                        e.target.value = '';
                      }}
                      data-testid="input-promo-image-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('promo-image-upload')?.click()}
                      disabled={promoUploadProgress !== null}
                      data-testid="button-upload-promo-image"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {promoUploadProgress !== null ? `${promoUploadProgress}%` : 'Upload Image'}
                    </Button>
                    {promoImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPromoImageUrl("")}
                        data-testid="button-remove-promo-image"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {promoUploadProgress !== null && (
                    <div className="mt-2">
                      <Progress value={promoUploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-image-url">Or Enter Image URL</Label>
                  <Input 
                    id="promo-image-url"
                    value={promoImageUrl}
                    onChange={(e) => setPromoImageUrl(e.target.value)}
                    placeholder="https://example.com/promo-image.png"
                    data-testid="input-guide-promo-image-url"
                  />
                </div>
                {promoImageUrl && (
                  <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <img 
                      src={promoImageUrl} 
                      alt="Promo preview" 
                      className="max-w-[200px] max-h-[100px] object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2 break-all">{promoImageUrl}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Knowledge Base
          </CardTitle>
          <CardDescription>Train the Chatvice Guide with platform information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="guide-knowledge">Knowledge Content</Label>
            <Textarea 
              id="guide-knowledge"
              value={knowledgeContent}
              onChange={(e) => setKnowledgeContent(e.target.value)}
              className="mt-1 font-mono text-sm"
              rows={8}
              placeholder="Add information about Chatvice features, pricing, FAQs, etc..."
              data-testid="input-guide-knowledge"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This content will be used to train the AI to answer questions about your platform
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Knowledge Sources
          </CardTitle>
          <CardDescription>Web pages and documents to crawl for knowledge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sources added yet. Add a URL to crawl for knowledge content.
              </p>
            ) : (
              sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-sm truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={source.status === "active" ? "default" : "secondary"}>
                      {source.status}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => deleteSourceMutation.mutate(source.id)}
                      disabled={deleteSourceMutation.isPending}
                      data-testid={`button-delete-source-${source.id}`}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowAddSourceDialog(true)}
              data-testid="button-add-guide-source"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source URL
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent data-testid="dialog-add-source">
          <DialogHeader>
            <DialogTitle>Add Knowledge Source</DialogTitle>
            <DialogDescription>
              Enter a URL to crawl and extract content for the Chatvice Guide knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="source-url">URL to Crawl</Label>
              <Input
                id="source-url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="https://example.com/faq"
                className="mt-1"
                data-testid="input-source-url"
              />
            </div>
            <div>
              <Label htmlFor="source-name">Source Name (optional)</Label>
              <Input
                id="source-name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g., FAQ Page, Product Info"
                className="mt-1"
                data-testid="input-source-name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use the domain name automatically
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddSourceDialog(false);
                setNewSourceUrl("");
                setNewSourceName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSource}
              disabled={isCrawling || !newSourceUrl.trim()}
              data-testid="button-crawl-source"
            >
              {isCrawling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Crawl URL
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
              <CardDescription>Test the Chatvice Guide with current settings</CardDescription>
            </div>
            <Button
              variant={showPreview ? "default" : "outline"}
              onClick={() => {
                setShowPreview(!showPreview);
                if (!showPreview) {
                  setPreviewMessages([{ role: "assistant", content: guideSettings.welcomeMessage }]);
                }
              }}
              data-testid="button-toggle-preview"
            >
              {showPreview ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Close Preview
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Preview
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="border rounded-lg overflow-hidden" style={{ maxWidth: "400px" }}>
              <div 
                className="p-3 text-white flex items-center gap-2"
                style={{ backgroundColor: guideSettings.widgetColor }}
              >
                <Bot className="w-5 h-5" />
                <span className="font-medium">{guideSettings.name}</span>
              </div>
              <ScrollArea className="h-[300px] p-4 bg-background">
                <div className="space-y-3">
                  {previewMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isPreviewTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <span className="flex gap-1">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input 
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Type a test message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && previewInput.trim() && !isPreviewTyping) {
                      const userMessage = previewInput.trim();
                      setPreviewMessages(prev => [...prev, { role: "user", content: userMessage }]);
                      setPreviewInput("");
                      setIsPreviewTyping(true);
                      
                      fetch("/api/chatvice-guide/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          message: userMessage,
                          context: "admin_preview"
                        }),
                      })
                        .then(res => res.json())
                        .then(data => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: data.response || "I'm here to help with any questions about Chatvice."
                          }]);
                        })
                        .catch(() => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: "Preview mode: AI response will appear here in production."
                          }]);
                        });
                    }
                  }}
                  data-testid="input-preview-message"
                />
                <Button 
                  size="icon" 
                  disabled={!previewInput.trim() || isPreviewTyping}
                  onClick={() => {
                    if (previewInput.trim() && !isPreviewTyping) {
                      const userMessage = previewInput.trim();
                      setPreviewMessages(prev => [...prev, { role: "user", content: userMessage }]);
                      setPreviewInput("");
                      setIsPreviewTyping(true);
                      
                      fetch("/api/chatvice-guide/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          message: userMessage,
                          context: "admin_preview"
                        }),
                      })
                        .then(res => res.json())
                        .then(data => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: data.response || "I'm here to help with any questions about Chatvice."
                          }]);
                        })
                        .catch(() => {
                          setIsPreviewTyping(false);
                          setPreviewMessages(prev => [...prev, { 
                            role: "assistant", 
                            content: "Preview mode: AI response will appear here in production."
                          }]);
                        });
                    }
                  }}
                  data-testid="button-send-preview"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {promoImageEnabled && promoImageUrl && (
                <div className="p-3 border-t bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Promo image preview:</p>
                  <img 
                    src={promoImageUrl} 
                    alt="Promo" 
                    className="max-w-full max-h-[80px] object-contain rounded"
                  />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setPreviewMessages([{ role: "assistant", content: guideSettings.welcomeMessage }]);
                }}
                data-testid="button-reset-preview"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Preview
              </Button>
              <p className="text-xs text-muted-foreground">
                Test messages are processed using current knowledge base settings
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {lastUpdated && (
            <>
              <Clock className="w-4 h-4" />
              <span>
                Last updated: {new Date(lastUpdated).toLocaleDateString("id-ID", { 
                  day: "numeric", 
                  month: "long", 
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(autoSaveStatus === 'saving' || saveMutation.isPending) && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {(autoSaveStatus === 'saved' || saveSuccess) && !saveMutation.isPending && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Saved successfully
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending} 
            data-testid="button-save-guide"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Chatvice Guide Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
