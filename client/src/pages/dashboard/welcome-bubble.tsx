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
}

export default function WelcomeBubblePage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    headline: "Need help?",
    message: "I can guide you through our features.",
    buttonLabel: "Chat with us",
    buttonColor: "#7c3aed",
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
      toast({ title: "Welcome bubble saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save welcome bubble", variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Please select a PNG, GIF, JPG, or WebP image", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
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
      toast({ title: "Image uploaded successfully" });
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
      toast({ title: "Maksimum 5 tombol aksi", variant: "destructive" });
      return;
    }
    setForm({
      ...form,
      actionButtons: [...form.actionButtons, { label: "", url: "" }],
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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <MessageCircle className="w-6 h-6" />
            Welcome Bubble
          </h1>
          <p className="text-muted-foreground">Configure welcome message pop-up for visitors</p>
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
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Enable or disable welcome bubble</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Show Welcome Bubble</Label>
                  <p className="text-sm text-muted-foreground">Bubble will appear when page loads</p>
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
              <CardDescription>Time before bubble reappears after being closed</CardDescription>
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
                  <span>1 min</span>
                  <span>30 min</span>
                  <span>1 hour</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Promo Image</CardTitle>
              <CardDescription>Add a promotional image above the bubble</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="promoEnabled">Enable Promo Image</Label>
                  <p className="text-sm text-muted-foreground">Display image above the welcome bubble</p>
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
                    <Label>Upload Image</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/gif,image/jpeg,image/jpg,image/webp"
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
                    <Label htmlFor="promoImageUrl">Or enter image URL</Label>
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
                      <p className="text-xs text-muted-foreground mb-2">Supports GIF, JPEG & PNG. Width = bubble width.</p>
                      <div className="bg-muted rounded-t-xl border overflow-hidden">
                        <img 
                          src={form.promoImageUrl} 
                          alt="Promo preview" 
                          className="w-full h-auto object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
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
              <CardTitle>Message Content</CardTitle>
              <CardDescription>Configure text displayed in the bubble</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
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
              <CardDescription>Configure the action button</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buttonLabel">Button Label</Label>
                <Input
                  id="buttonLabel"
                  value={form.buttonLabel}
                  onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
                  placeholder="Chat with us"
                  data-testid="input-button-label"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buttonColor">Button Color</Label>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Action Buttons
              </CardTitle>
              <CardDescription>
                Tambahkan tombol aksi dengan URL target (maksimum 5 tombol)
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
                        placeholder="Nama tombol..."
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
                  Tambah Tombol ({form.actionButtons.length}/5)
                </Button>
              )}
              
              {form.actionButtons.length === 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  Maksimum 5 tombol tercapai
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
                Tampilkan ikon sosial media di bawah welcome bubble
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="socialIconsEnabled">Aktifkan Social Icons</Label>
                  <p className="text-sm text-muted-foreground">
                    Ikon akan tampil di bawah welcome bubble (konfigurasi link di halaman Widget)
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
