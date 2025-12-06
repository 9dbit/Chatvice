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
import { MessageCircle, X, Save, Eye } from "lucide-react";
import type { WelcomeBubble } from "@shared/schema";

export default function WelcomeBubblePage() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(true);
  const [form, setForm] = useState({
    headline: "Hi!",
    message: "Looking for something specific? We'll help you find it!",
    button1Label: "Chat with us",
    button1Url: "",
    button1Color: "#E84E3C",
    button2Label: "Product expert",
    button2Url: "",
    button2Color: "#1a1a1a",
    isEnabled: true,
  });

  const { data: bubble, isLoading } = useQuery<WelcomeBubble>({
    queryKey: ["/api/welcome-bubble"],
  });

  useEffect(() => {
    if (bubble) {
      setForm({
        headline: bubble.headline || "Hi!",
        message: bubble.message || "Looking for something specific? We'll help you find it!",
        button1Label: bubble.button1Label || "Chat with us",
        button1Url: bubble.button1Url || "",
        button1Color: bubble.button1Color || "#E84E3C",
        button2Label: bubble.button2Label || "Product expert",
        button2Url: bubble.button2Url || "",
        button2Color: bubble.button2Color || "#1a1a1a",
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
                  placeholder="Hi!"
                  data-testid="input-headline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Pesan</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Looking for something specific? We'll help you find it!"
                  rows={3}
                  data-testid="input-message"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button 1</CardTitle>
              <CardDescription>Primary button (usually to start chat)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="button1Label">Button Label</Label>
                <Input
                  id="button1Label"
                  value={form.button1Label}
                  onChange={(e) => setForm({ ...form, button1Label: e.target.value })}
                  placeholder="Chat with us"
                  data-testid="input-button1-label"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="button1Url">URL (optional)</Label>
                <Input
                  id="button1Url"
                  value={form.button1Url}
                  onChange={(e) => setForm({ ...form, button1Url: e.target.value })}
                  placeholder="https://..."
                  data-testid="input-button1-url"
                />
                <p className="text-xs text-muted-foreground">Leave empty to open chat widget</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="button1Color">Button Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="button1Color"
                    type="color"
                    value={form.button1Color}
                    onChange={(e) => setForm({ ...form, button1Color: e.target.value })}
                    className="w-12 h-10 p-1"
                    data-testid="input-button1-color"
                  />
                  <Input
                    value={form.button1Color}
                    onChange={(e) => setForm({ ...form, button1Color: e.target.value })}
                    placeholder="#E84E3C"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button 2</CardTitle>
              <CardDescription>Secondary button (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="button2Label">Button Label</Label>
                <Input
                  id="button2Label"
                  value={form.button2Label}
                  onChange={(e) => setForm({ ...form, button2Label: e.target.value })}
                  placeholder="Product expert"
                  data-testid="input-button2-label"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="button2Url">URL (optional)</Label>
                <Input
                  id="button2Url"
                  value={form.button2Url}
                  onChange={(e) => setForm({ ...form, button2Url: e.target.value })}
                  placeholder="https://..."
                  data-testid="input-button2-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="button2Color">Button Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="button2Color"
                    type="color"
                    value={form.button2Color}
                    onChange={(e) => setForm({ ...form, button2Color: e.target.value })}
                    className="w-12 h-10 p-1"
                    data-testid="input-button2-color"
                  />
                  <Input
                    value={form.button2Color}
                    onChange={(e) => setForm({ ...form, button2Color: e.target.value })}
                    placeholder="#1a1a1a"
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
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6 min-h-[400px]">
                  {form.isEnabled && (
                    <div className="absolute right-4 top-4 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden">
                      <button className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5" />
                      </button>
                      <div className="p-6 pt-8">
                        <h3 className="text-xl font-bold mb-2">{form.headline}</h3>
                        <p className="text-gray-600 mb-6">{form.message}</p>
                        <div className="space-y-3">
                          <button
                            className="w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: form.button1Color }}
                          >
                            {form.button1Label}
                          </button>
                          <button
                            className="w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: form.button2Color }}
                          >
                            <MessageCircle className="w-4 h-4" />
                            {form.button2Label}
                          </button>
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
