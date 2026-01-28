import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2, Pencil, Trash2, Copy, Megaphone, Wrench, Key, Image, Video, FileType, BookOpen, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { InfoTooltip, StepIndicator } from "@/components/info-tooltip";

interface Template {
  id: string;
  name: string;
  category: "marketing" | "utility" | "otp";
  content: string;
  variables: string[];
  mediaType: string | null;
  mediaUrl: string | null;
  status: string;
  createdAt: string;
}

const PREBUILT_TEMPLATES = {
  marketing: [
    {
      name: "Flash Sale Announcement",
      content: "Hi {{name}}! Flash Sale is here! Get up to 50% OFF on all products. Valid today only!\n\nShop now: {{link}}\n\nDon't miss out!",
      description: "Announce limited-time promotions"
    },
    {
      name: "New Product Launch",
      content: "Hello {{name}},\n\nWe're excited to introduce our newest product: {{product}}!\n\nKey features:\n- Premium quality\n- Best price guarantee\n- Free shipping\n\nOrder now: {{link}}",
      description: "Introduce new products to customers"
    },
    {
      name: "Loyalty Reward",
      content: "Dear {{name}},\n\nThank you for being a valued customer! As our appreciation, here's a special {{discount}}% discount just for you.\n\nUse code: {{code}}\nValid until: {{expiry}}\n\nShop now: {{link}}",
      description: "Reward loyal customers with discounts"
    },
  ],
  utility: [
    {
      name: "Order Confirmation",
      content: "Hi {{name}},\n\nYour order #{{order_id}} has been confirmed!\n\nItems: {{items}}\nTotal: {{total}}\n\nEstimated delivery: {{delivery_date}}\n\nTrack your order: {{tracking_link}}",
      description: "Confirm customer orders"
    },
    {
      name: "Shipping Update",
      content: "Hello {{name}},\n\nGreat news! Your order #{{order_id}} has been shipped.\n\nTracking number: {{tracking}}\nCarrier: {{carrier}}\n\nTrack here: {{link}}",
      description: "Notify about shipping status"
    },
    {
      name: "Appointment Reminder",
      content: "Hi {{name}},\n\nThis is a reminder for your appointment:\n\nDate: {{date}}\nTime: {{time}}\nLocation: {{location}}\n\nReply YES to confirm or contact us to reschedule.",
      description: "Remind customers of appointments"
    },
  ],
  otp: [
    {
      name: "Login Verification",
      content: "Your verification code is: {{code}}\n\nThis code expires in 5 minutes.\n\nDo not share this code with anyone.",
      description: "Secure login verification"
    },
    {
      name: "Transaction OTP",
      content: "Your transaction code: {{code}}\n\nAmount: {{amount}}\n\nValid for 3 minutes. Never share this code.",
      description: "Verify financial transactions"
    },
    {
      name: "Password Reset",
      content: "Your password reset code: {{code}}\n\nExpires in 10 minutes.\n\nIf you didn't request this, please ignore.",
      description: "Reset account password"
    },
  ],
};

export default function WABlastTemplatesPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showPrebuilt, setShowPrebuilt] = useState(true);
  const [prebuiltTab, setPrebuiltTab] = useState<"marketing" | "utility" | "otp">("marketing");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "marketing" as "marketing" | "utility" | "otp",
    content: "",
    mediaType: "",
    mediaUrl: "",
  });

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/wa-blast/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      const res = await apiRequest("POST", "/api/wa-blast/templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/templates"] });
      setIsAddDialogOpen(false);
      setNewTemplate({
        name: "",
        category: "marketing",
        content: "",
        mediaType: "",
        mediaUrl: "",
      });
      toast({ title: "Template berhasil dibuat" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal membuat template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/wa-blast/templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/templates"] });
      toast({ title: "Template berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menghapus template", description: error.message, variant: "destructive" });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "marketing":
        return <Megaphone className="w-4 h-4" />;
      case "utility":
        return <Wrench className="w-4 h-4" />;
      case "otp":
        return <Key className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "marketing":
        return <Badge className="bg-blue-600">{getCategoryIcon(category)} Marketing</Badge>;
      case "utility":
        return <Badge className="bg-green-600">{getCategoryIcon(category)} Utility</Badge>;
      case "otp":
        return <Badge className="bg-orange-600">{getCategoryIcon(category)} OTP</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  const getMediaIcon = (type: string | null) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "document":
        return <FileType className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleSubmit = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast({ title: "Nama dan konten wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate(newTemplate);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Template disalin ke clipboard" });
  };

  const usePrebuiltTemplate = (template: { name: string; content: string }, category: "marketing" | "utility" | "otp") => {
    setNewTemplate({
      ...newTemplate,
      name: template.name,
      content: template.content,
      category,
    });
    setIsAddDialogOpen(true);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Message Templates</h1>
            <p className="text-muted-foreground">Create and manage templates for broadcasts</p>
          </div>
          <InfoTooltip 
            title="Message Templates" 
            description="Templates allow you to create reusable messages with variables like {{name}} for personalization. Different categories have different costs."
            nextStep="Use pre-built templates or create your own"
            id="templates"
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-template">
              <Plus className="w-4 h-4 mr-2" />
              Buat Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Buat Template Baru</DialogTitle>
              <DialogDescription>
                Gunakan {"{{variable}}"} untuk variabel dinamis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Template</Label>
                <Input
                  placeholder="Contoh: Promo Akhir Tahun"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value: "marketing" | "utility" | "otp") =>
                    setNewTemplate({ ...newTemplate, category: value })
                  }
                >
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing (Rp 500/pesan)</SelectItem>
                    <SelectItem value="utility">Utility (Rp 300/pesan)</SelectItem>
                    <SelectItem value="otp">OTP (Rp 200/pesan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Konten Pesan</Label>
                <Textarea
                  placeholder="Halo {{nama}}, kami punya penawaran spesial untuk Anda!"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  rows={5}
                  data-testid="textarea-template-content"
                />
                <p className="text-xs text-muted-foreground">
                  Variabel: {"{{nama}}"}, {"{{produk}}"}, {"{{harga}}"}, dll.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tipe Media (opsional)</Label>
                <Select
                  value={newTemplate.mediaType}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, mediaType: value })}
                >
                  <SelectTrigger data-testid="select-media-type">
                    <SelectValue placeholder="Pilih tipe media" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Media</SelectItem>
                    <SelectItem value="image">Gambar</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Dokumen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newTemplate.mediaType && newTemplate.mediaType !== "none" && (
                <div className="space-y-2">
                  <Label>URL Media</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={newTemplate.mediaUrl}
                    onChange={(e) => setNewTemplate({ ...newTemplate, mediaUrl: e.target.value })}
                    data-testid="input-media-url"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <button 
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full"
          data-testid="button-toggle-tutorial"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base text-purple-900 dark:text-purple-100">Step-by-Step Tutorial</CardTitle>
            </div>
            {showTutorial ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </CardHeader>
        </button>
        {showTutorial && (
          <CardContent className="pt-0 pb-4">
            <div className="grid gap-3 md:grid-cols-4">
              <StepIndicator 
                step={1} 
                title="Choose Category" 
                description="Select Marketing (promos), Utility (notifications), or OTP (verification)"
                isActive={templates.length === 0}
                isCompleted={templates.length > 0}
              />
              <StepIndicator 
                step={2} 
                title="Create Template" 
                description="Use pre-built templates below or create custom ones with variables"
                isActive={templates.length > 0}
              />
              <StepIndicator 
                step={3} 
                title="Add Variables" 
                description="Use {{name}}, {{product}}, etc. for personalization"
              />
              <StepIndicator 
                step={4} 
                title="Use in Campaign" 
                description="Select your template when creating a new campaign"
              />
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <button 
          onClick={() => setShowPrebuilt(!showPrebuilt)}
          className="w-full"
          data-testid="button-toggle-prebuilt"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">Pre-built Templates</CardTitle>
              <Badge variant="secondary" className="text-xs">Ready to Use</Badge>
            </div>
            {showPrebuilt ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardHeader>
        </button>
        {showPrebuilt && (
          <CardContent className="pt-0 pb-4">
            <Tabs value={prebuiltTab} onValueChange={(v) => setPrebuiltTab(v as typeof prebuiltTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="marketing" className="gap-1">
                  <Megaphone className="w-3 h-3" /> Marketing
                </TabsTrigger>
                <TabsTrigger value="utility" className="gap-1">
                  <Wrench className="w-3 h-3" /> Utility
                </TabsTrigger>
                <TabsTrigger value="otp" className="gap-1">
                  <Key className="w-3 h-3" /> OTP
                </TabsTrigger>
              </TabsList>
              <TabsContent value="marketing" className="mt-0">
                <div className="grid gap-3 md:grid-cols-3">
                  {PREBUILT_TEMPLATES.marketing.map((template, idx) => (
                    <Card key={idx} className="hover-elevate cursor-pointer" onClick={() => usePrebuiltTemplate(template, "marketing")} data-testid={`card-prebuilt-marketing-${idx}`}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="py-0 pb-3">
                        <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted/50 p-2 rounded">
                          {template.content}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0 pb-3">
                        <Badge className="bg-blue-600 text-xs">Rp 500/msg</Badge>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="utility" className="mt-0">
                <div className="grid gap-3 md:grid-cols-3">
                  {PREBUILT_TEMPLATES.utility.map((template, idx) => (
                    <Card key={idx} className="hover-elevate cursor-pointer" onClick={() => usePrebuiltTemplate(template, "utility")} data-testid={`card-prebuilt-utility-${idx}`}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="py-0 pb-3">
                        <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted/50 p-2 rounded">
                          {template.content}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0 pb-3">
                        <Badge className="bg-green-600 text-xs">Rp 300/msg</Badge>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="otp" className="mt-0">
                <div className="grid gap-3 md:grid-cols-3">
                  {PREBUILT_TEMPLATES.otp.map((template, idx) => (
                    <Card key={idx} className="hover-elevate cursor-pointer" onClick={() => usePrebuiltTemplate(template, "otp")} data-testid={`card-prebuilt-otp-${idx}`}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="py-0 pb-3">
                        <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted/50 p-2 rounded">
                          {template.content}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0 pb-3">
                        <Badge className="bg-orange-600 text-xs">Rp 200/msg</Badge>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum ada template</h3>
            <p className="text-muted-foreground text-center mb-4">
              Buat template pesan untuk mempercepat broadcast
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Template Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                  {getCategoryBadge(template.category)}
                </div>
                <CardDescription className="flex items-center gap-2">
                  {template.mediaType && getMediaIcon(template.mediaType)}
                  {template.variables.length > 0 && (
                    <span className="text-xs">
                      {template.variables.length} variabel
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {template.content}
                </p>
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(template.content)}
                  data-testid={`button-copy-template-${template.id}`}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" data-testid={`button-edit-template-${template.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Hapus template ini?")) {
                      deleteMutation.mutate(template.id);
                    }
                  }}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
