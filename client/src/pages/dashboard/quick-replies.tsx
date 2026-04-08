import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, MessageSquare, Zap, Copy } from "lucide-react";
import type { QuickReply } from "@shared/schema";

type QuickReplyFormData = {
  shortcut: string;
  label: string;
  content: string;
  category: string;
};

export default function QuickRepliesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [form, setForm] = useState<QuickReplyFormData>({
    shortcut: "",
    label: "",
    content: "",
    category: "general",
  });

  const { data: replies = [], isLoading } = useQuery<QuickReply[]>({
    queryKey: ["/api/quick-replies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuickReplyFormData) => {
      return apiRequest("POST", "/api/quick-replies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Quick reply created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create quick reply", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuickReply> }) => {
      return apiRequest("PATCH", `/api/quick-replies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      setIsDialogOpen(false);
      setEditingReply(null);
      resetForm();
      toast({ title: "Quick reply updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/quick-replies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      toast({ title: "Quick reply deleted successfully" });
    },
  });

  function resetForm() {
    setForm({ shortcut: "", label: "", content: "", category: "general" });
  }

  function handleEdit(reply: QuickReply) {
    setEditingReply(reply);
    setForm({
      shortcut: reply.shortcut,
      label: reply.label,
      content: reply.content,
      category: reply.category || "general",
    });
    setIsDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.shortcut.startsWith("/")) {
      setForm({ ...form, shortcut: "/" + form.shortcut });
    }
    
    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("dashboard.quickReplies.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.quickReplies.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingReply(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-reply">
              <Plus className="w-4 h-4 mr-2" />{t("dashboard.quickReplies.addQuickReply")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReply ? "Edit Quick Reply" : "Create New Quick Reply"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut">{t("dashboard.quickReplies.shortcut")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    id="shortcut"
                    value={form.shortcut.replace(/^\//, "")}
                    onChange={(e) => setForm({ ...form, shortcut: "/" + e.target.value.replace(/^\//, "") })}
                    placeholder="greeting"
                    data-testid="input-shortcut"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Type /{form.shortcut.replace(/^\//, "") || "greeting"} to use</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">{t("dashboard.quickReplies.label")}</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Initial Greeting"
                  data-testid="input-label"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">{t("dashboard.quickReplies.messageContent")}</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Hello! Welcome to our customer service. How can I help you?"
                  rows={4}
                  data-testid="input-content"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("dashboard.common.cancel")}</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!form.shortcut || !form.label || !form.content || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-reply"
              >
                {editingReply ? "Save Changes" : "Create Quick Reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            How to Use
          </CardTitle>
          <CardDescription>
            Type a shortcut in the chat field to use quick replies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t("dashboard.quickReplies.typeHint")}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.quickReplies.example")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {replies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t("dashboard.quickReplies.noReplies")}</h3>
            <p className="text-muted-foreground mb-4">{t("dashboard.quickReplies.emptyState")}</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-reply">
              <Plus className="w-4 h-4 mr-2" />
              Create First Quick Reply
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {replies.map((reply) => (
            <Card key={reply.id} data-testid={`card-reply-${reply.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="secondary" className="mb-2 font-mono">
                      {reply.shortcut}
                    </Badge>
                    <CardTitle className="text-base">{reply.label}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{reply.content}</p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(reply.content)}
                    data-testid={`button-copy-reply-${reply.id}`}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEdit(reply)}
                    data-testid={`button-edit-reply-${reply.id}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(reply.id)}
                    data-testid={`button-delete-reply-${reply.id}`}
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
