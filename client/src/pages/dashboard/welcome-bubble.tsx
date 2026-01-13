import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, X, Save, Eye, ImageIcon, Upload, Loader2 } from "lucide-react";
import type { WelcomeBubble } from "@shared/schema";

export default function WelcomeBubblePage() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    headline: "Need help?",
    message: "I can guide you through our features.",
    buttonLabel: "Chat with us",
    buttonColor: "#7c3aed",
    promoImageEnabled: false,
    promoImageUrl: "",
    isEnabled: true,
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
        isEnabled: bubble.isEnabled ?? true,
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

    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setForm({ ...form, promoImageUrl: data.url, promoImageEnabled: true });
      toast({ title: "Image uploaded successfully" });
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
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
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="flex-1"
                        data-testid="input-promo-image-file"
                      />
                    </div>
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
                    <div className="relative">
                      <img 
                        src={form.promoImageUrl} 
                        alt="Promo preview" 
                        className="w-full max-w-[200px] rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
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
        </div>

        <div className="lg:sticky lg:top-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview && (
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 min-h-[500px]">
                  {form.isEnabled && (
                    <div className="absolute right-4 bottom-20">
                      <div className="w-52">
                        {form.promoImageEnabled && form.promoImageUrl && (
                          <img 
                            src={form.promoImageUrl} 
                            alt="Promotion" 
                            className="w-full h-auto object-cover rounded-t-xl relative z-20"
                            style={{ marginBottom: '-16px' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            data-testid="img-preview-promo"
                          />
                        )}
                        <div className={`bg-card shadow-xl px-4 pt-6 pb-4 border border-border relative z-10 ${form.promoImageEnabled && form.promoImageUrl ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}>
                          <button
                            className="absolute top-2 right-2 p-0 hover:opacity-70 transition-opacity"
                            data-testid="button-preview-dismiss"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <div className="mb-2 pr-4">
                            <p className="font-semibold text-base text-foreground">
                              {form.headline || "Need help?"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal mb-3">
                            {form.message || "I can guide you through our features."}
                          </p>
                          <Button
                            size="default"
                            className="w-full text-white"
                            style={{ backgroundColor: form.buttonColor }}
                            data-testid="button-preview-cta"
                          >
                            {form.buttonLabel || "Chat with us"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute right-4 bottom-4">
                    <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center shadow-lg">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
