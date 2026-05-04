import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, X, Save, Eye, Loader2, Clock, Upload, Plus, Trash2, Link, Share2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { WelcomeBubble } from "@shared/schema";

interface ActionButton {
  label: string;
  url: string;
  color: string;
  textColor?: string;
}

export default function WelcomeBubblePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    headline: "Need help?",
    message: "I can guide you through our features.",
    buttonLabel: "Chat with us",
    buttonColor: "#7c3aed",
    buttonTextColor: "#ffffff",
    promoImageEnabled: false,
    promoImageUrl: "",
    reappearInterval: 60,
    isEnabled: true,
    actionButtons: [] as ActionButton[],
    socialIconsEnabled: false,
  });

  const { data: bubble, isLoading } = useQuery<WelcomeBubble>({
    queryKey: ["/api/welcome-bubble"],
  });

  useEffect(() => {
    if (bubble) {
      setForm({
        headline: bubble.headline || "Need help?",
        message: bubble.message || "I can guide you through our features.",
        buttonLabel: bubble.buttonLabel || "Chat with us",
        buttonColor: bubble.buttonColor || "#7c3aed",
        buttonTextColor: bubble.buttonTextColor || "#ffffff",
        promoImageEnabled: bubble.promoImageEnabled ?? false,
        promoImageUrl: bubble.promoImageUrl || "",
        reappearInterval: bubble.reappearInterval ?? 60,
        isEnabled: bubble.isEnabled ?? true,
        actionButtons: (bubble.actionButtons as ActionButton[]) || [],
        socialIconsEnabled: bubble.socialIconsEnabled ?? false,
      });
    }
  }, [bubble]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return apiRequest("PUT", "/api/welcome-bubble", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-bubble"] });
      toast({ title: t("dashboard.welcomeBubble.saved") });
    },
    onError: () => {
      toast({ title: t("dashboard.welcomeBubble.saveFailed"), variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: t("dashboard.welcomeBubble.invalidFormat"), variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("dashboard.welcomeBubble.fileTooLarge"), variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'welcome_bubble_promo');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setForm({ ...form, promoImageUrl: data.url, promoImageEnabled: true });
      toast({ title: t("dashboard.welcomeBubble.imageUploaded") });
    } catch (error: any) {
      clearInterval(progressInterval);
      toast({ title: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const addActionButton = () => {
    if (form.actionButtons.length >= 5) {
      toast({ title: t("dashboard.welcomeBubble.maxButtons"), variant: "destructive" });
      return;
    }
    setForm({
      ...form,
      actionButtons: [...form.actionButtons, { label: "", url: "", color: "#7c3aed", textColor: "#ffffff" }],
    });
  };

  const updateActionButton = (index: number, field: keyof ActionButton, value: string) => {
    const updated = [...form.actionButtons];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, actionButtons: updated });
  };

  const removeActionButton = (index: number) => {
    setForm({
      ...form,
      actionButtons: form.actionButtons.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <MessageCircle className="w-6 h-6" />
            Welcome Bubble
          </h1>
          <p className="text-muted-foreground">{t("dashboard.welcomeBubble.subtitle")}</p>
        </div>
        <Button 
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          data-testid="button-save-bubble"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.welcomeBubble.generalSettings")}</CardTitle>
              <CardDescription>{t("dashboard.welcomeBubble.enableDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">{t("dashboard.welcomeBubble.showBubble")}</Label>
                  <p className="text-sm text-muted-foreground">{t("dashboard.welcomeBubble.bubbleAppearDesc")}</p>
                </div>
                <Switch
                  id="enabled"
                  checked={form.isEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })}
                  data-testid="switch-bubble-enabled"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Reappear Interval
              </CardTitle>
              <CardDescription>{t("dashboard.welcomeBubble.reappearDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Interval: {form.reappearInterval} seconds</Label>
                  <span className="text-sm text-muted-foreground">
                    {form.reappearInterval < 60 
                      ? `${form.reappearInterval}s` 
                      : form.reappearInterval < 3600 
                        ? `${Math.floor(form.reappearInterval / 60)}m ${form.reappearInterval % 60}s`
                        : `${Math.floor(form.reappearInterval / 3600)}h ${Math.floor((form.reappearInterval % 3600) / 60)}m`}
                  </span>
                </div>
                <Slider
                  value={[form.reappearInterval]}
                  onValueChange={([value]) => setForm({ ...form, reappearInterval: value })}
                  min={10}
                  max={3600}
                  step={10}
                  className="w-full"
                  data-testid="slider-reappear-interval"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10s</span>
                  <span>{t("dashboard.welcomeBubble.min1")}</span>
                  <span>{t("dashboard.welcomeBubble.min30")}</span>
                  <span>{t("dashboard.welcomeBubble.hour1")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.welcomeBubble.promoImage")}</CardTitle>
              <CardDescription>{t("dashboard.welcomeBubble.promoImageDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="promoEnabled">{t("dashboard.welcomeBubble.enablePromo")}</Label>
                  <p className="text-sm text-muted-foreground">{t("dashboard.welcomeBubble.displayImageDesc")}</p>
                </div>
                <Switch
                  id="promoEnabled"
                  checked={form.promoImageEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, promoImageEnabled: checked })}
                  data-testid="switch-promo-enabled"
                />
              </div>
              
              {form.promoImageEnabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t("dashboard.welcomeBubble.uploadImageVideo")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/gif,image/jpeg,image/jpg,image/webp,video/mp4"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="flex-1"
                        data-testid="input-promo-image-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isUploading}
                        onClick={() => (document.querySelector('[data-testid="input-promo-image-file"]') as HTMLInputElement)?.click()}
                        data-testid="button-upload-promo"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    {isUploading && (
                      <div className="space-y-1">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="promoImageUrl">{t("dashboard.welcomeBubble.orEnterUrl")}</Label>
                    <Input
                      id="promoImageUrl"
                      value={form.promoImageUrl}
                      onChange={(e) => setForm({ ...form, promoImageUrl: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-promo-image-url"
                    />
                  </div>

                  {form.promoImageUrl && (
                    <div className="relative max-w-[200px]">
                      <Label className="mb-2 block">Preview (Full Width)</Label>
                      <p className="text-xs text-muted-foreground mb-2">Supports GIF, JPEG, PNG, WebP & MP4 (max 5MB).</p>
                      <div className="bg-muted rounded-t-xl border overflow-hidden">
                        {form.promoImageUrl.match(/\.mp4/i) ? (
                          <video
                            src={form.promoImageUrl}
                            className="w-full h-auto object-contain"
                            autoPlay
                            loop
                            muted
                            playsInline
                            data-testid="video-promo-preview"
                          />
                        ) : (
                          <img 
                            src={form.promoImageUrl} 
                            alt="Promo preview" 
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-8 right-2"
                        onClick={() => setForm({ ...form, promoImageUrl: "", promoImageEnabled: false })}
                        data-testid="button-remove-promo-image"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.welcomeBubble.messageContent")}</CardTitle>
              <CardDescription>{t("dashboard.welcomeBubble.messageContentDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">{t("dashboard.welcomeBubble.headline")}</Label>
                <Input
                  id="headline"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="Need help?"
                  data-testid="input-headline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="I can guide you through our features."
                  rows={3}
                  data-testid="input-message"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button</CardTitle>
              <CardDescription>{t("dashboard.welcomeBubble.buttonDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buttonLabel">{t("dashboard.welcomeBubble.buttonLabel")}</Label>
                <Input
                  id="buttonLabel"
                  value={form.buttonLabel}
                  onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
                  placeholder="Chat with us"
                  data-testid="input-button-label"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="buttonColor">{t("dashboard.welcomeBubble.buttonColor")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonColor"
                      type="color"
                      value={form.buttonColor}
                      onChange={(e) => setForm({ ...form, buttonColor: e.target.value })}
                      className="w-12 h-10 p-1"
                      data-testid="input-button-color"
                    />
                    <Input
                      value={form.buttonColor}
                      onChange={(e) => setForm({ ...form, buttonColor: e.target.value })}
                      placeholder="#7c3aed"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buttonTextColor">{t("dashboard.welcomeBubble.fontColor")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonTextColor"
                      type="color"
                      value={form.buttonTextColor}
                      onChange={(e) => setForm({ ...form, buttonTextColor: e.target.value })}
                      className="w-12 h-10 p-1"
                      data-testid="input-button-text-color"
                    />
                    <Input
                      value={form.buttonTextColor}
                      onChange={(e) => setForm({ ...form, buttonTextColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Action Buttons
              </CardTitle>
              <CardDescription>
                Add action buttons with URL targets (maximum 5 buttons)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.actionButtons.map((btn, index) => (
                <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Button Label</Label>
                      <Input
                        value={btn.label}
                        onChange={(e) => updateActionButton(index, "label", e.target.value)}
                        placeholder="Button name..."
                        data-testid={`input-action-btn-label-${index}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL Target</Label>
                      <Input
                        value={btn.url}
                        onChange={(e) => updateActionButton(index, "url", e.target.value)}
                        placeholder="https://example.com/page"
                        data-testid={`input-action-btn-url-${index}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Button Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={btn.color || "#7c3aed"}
                            onChange={(e) => updateActionButton(index, "color", e.target.value)}
                            className="w-12 h-9 p-1 cursor-pointer"
                            data-testid={`input-action-btn-color-${index}`}
                          />
                          <Input
                            value={btn.color || "#7c3aed"}
                            onChange={(e) => updateActionButton(index, "color", e.target.value)}
                            placeholder="#7c3aed"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Font Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={btn.textColor || "#ffffff"}
                            onChange={(e) => updateActionButton(index, "textColor", e.target.value)}
                            className="w-12 h-9 p-1 cursor-pointer"
                            data-testid={`input-action-btn-text-color-${index}`}
                          />
                          <Input
                            value={btn.textColor || "#ffffff"}
                            onChange={(e) => updateActionButton(index, "textColor", e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeActionButton(index)}
                    className="text-destructive hover:text-destructive shrink-0"
                    data-testid={`button-remove-action-btn-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {form.actionButtons.length < 5 && (
                <Button
                  variant="outline"
                  onClick={addActionButton}
                  className="w-full"
                  data-testid="button-add-action-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Button ({form.actionButtons.length}/5)
                </Button>
              )}
              
              {form.actionButtons.length === 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  Maximum 5 buttons reached
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Social Media Icons
              </CardTitle>
              <CardDescription>
                Display social media icons below the welcome bubble
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="socialIconsEnabled">{t("dashboard.welcomeBubble.enableSocialIcons")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Icons will appear below the welcome bubble (configure links in Widget page)
                  </p>
                </div>
                <Switch
                  id="socialIconsEnabled"
                  checked={form.socialIconsEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, socialIconsEnabled: checked })}
                  data-testid="switch-social-icons-enabled"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Eye className="w-5 h-5" />
            <span>Preview your changes in the <a href="/dashboard/live-preview" className="text-primary underline">Live Preview</a> page to see how all settings work together.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
