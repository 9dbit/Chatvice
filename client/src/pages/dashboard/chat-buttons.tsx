import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, MousePointer2, ExternalLink, Zap, Hash } from "lucide-react";
import type { ChatButton } from "@shared/schema";

type ChatButtonFormData = {
  label: string;
  url: string;
  buttonType: string;
  triggerWord: string;
};

export default function ChatButtonsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<ChatButton | null>(null);
  const [form, setForm] = useState<ChatButtonFormData>({
    label: "",
    url: "",
    buttonType: "link",
    triggerWord: "",
  });

  const { data: buttons = [], isLoading } = useQuery<ChatButton[]>({
    queryKey: ["/api/chat-buttons"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChatButtonFormData) => {
      return apiRequest("POST", "/api/chat-buttons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-buttons"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Chat button created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create chat button", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ChatButton> }) => {
      return apiRequest("PATCH", `/api/chat-buttons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-buttons"] });
      setIsDialogOpen(false);
      setEditingButton(null);
      resetForm();
      toast({ title: "Chat button updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/chat-buttons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-buttons"] });
      toast({ title: "Chat button deleted successfully" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/chat-buttons/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-buttons"] });
    },
  });

  function resetForm() {
    setForm({ label: "", url: "", buttonType: "link", triggerWord: "" });
  }

  function handleEdit(button: ChatButton) {
    setEditingButton(button);
    setForm({
      label: button.label,
      url: button.url || "",
      buttonType: button.buttonType || "link",
      triggerWord: button.triggerWord || "",
    });
    setIsDialogOpen(true);
  }

  function handleSubmit() {
    if (editingButton) {
      updateMutation.mutate({ id: editingButton.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function getButtonTypeIcon(type: string) {
    switch (type) {
      case "link":
        return <ExternalLink className="w-4 h-4" />;
      case "action":
        return <Zap className="w-4 h-4" />;
      case "trigger":
        return <Hash className="w-4 h-4" />;
      default:
        return <MousePointer2 className="w-4 h-4" />;
    }
  }

  function getButtonTypeLabel(type: string) {
    switch (type) {
      case "link":
        return "Link";
      case "action":
        return "Action";
      case "trigger":
        return "Trigger";
      default:
        return type;
    }
  }

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
            <MousePointer2 className="w-6 h-6" />
            Chat Buttons
          </h1>
          <p className="text-muted-foreground">Create action buttons that appear in chat based on trigger words</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingButton(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-chat-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Chat Button
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingButton ? "Edit Chat Button" : "Create New Chat Button"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Button Label</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="View Product"
                  data-testid="input-button-label"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buttonType">Button Type</Label>
                <Select value={form.buttonType} onValueChange={(v) => setForm({ ...form, buttonType: v })}>
                  <SelectTrigger id="buttonType" data-testid="select-button-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link (Open URL)</SelectItem>
                    <SelectItem value="action">Action (Send Message)</SelectItem>
                    <SelectItem value="trigger">Trigger (Execute Action)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.buttonType === "link" || form.buttonType === "action") && (
                <div className="space-y-2">
                  <Label htmlFor="url">{form.buttonType === "link" ? "Target URL" : "Message to Send"}</Label>
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder={form.buttonType === "link" ? "https://example.com/product" : "I want to know more"}
                    data-testid="input-button-url"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="triggerWord">Trigger Word (Optional)</Label>
                <Input
                  id="triggerWord"
                  value={form.triggerWord}
                  onChange={(e) => setForm({ ...form, triggerWord: e.target.value })}
                  placeholder="product, price, catalog"
                  data-testid="input-trigger-word"
                />
                <p className="text-xs text-muted-foreground">
                  Button will appear when these words are detected in conversation. Separate with comma.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!form.label || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-chat-button"
              >
                {editingButton ? "Save Changes" : "Create Chat Button"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            How It Works
          </CardTitle>
          <CardDescription>
            Chat buttons are action buttons that appear in the chat widget to help customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Link</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Opens external URL in a new tab when clicked
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="font-medium">Action</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Mengirim pesan otomatis ke chat saat diklik
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-green-500" />
                <span className="font-medium">Trigger</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Menjalankan aksi khusus seperti eskalasi ke supervisor
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {buttons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MousePointer2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No chat buttons yet</h3>
            <p className="text-muted-foreground mb-4">Create your first chat button to help customers</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-chat-button">
              <Plus className="w-4 h-4 mr-2" />
              Create First Chat Button
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buttons.map((button) => (
            <Card key={button.id} data-testid={`card-chat-button-${button.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getButtonTypeIcon(button.buttonType || "link")}
                    <CardTitle className="text-base">{button.label}</CardTitle>
                  </div>
                  <Switch
                    checked={button.isActive ?? true}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: button.id, isActive: checked })}
                    data-testid={`switch-toggle-${button.id}`}
                  />
                </div>
                <Badge variant="secondary" className="w-fit">
                  {getButtonTypeLabel(button.buttonType || "link")}
                </Badge>
              </CardHeader>
              <CardContent>
                {button.url && (
                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    <span className="text-foreground/70">URL:</span> {button.url}
                  </p>
                )}
                {button.triggerWord && (
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="text-foreground/70">Trigger:</span> {button.triggerWord}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEdit(button)}
                    className="flex-1"
                    data-testid={`button-edit-chat-button-${button.id}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(button.id)}
                    data-testid={`button-delete-chat-button-${button.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
