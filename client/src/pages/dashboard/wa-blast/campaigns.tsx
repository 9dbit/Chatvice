import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Loader2, Play, Pause, Eye, Trash2, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Users, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { InfoTooltip, StepIndicator } from "@/components/info-tooltip";

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "paused" | "failed";
  messageContent: string;
  scheduledAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  stats?: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

interface Channel {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface ContactList {
  id: string;
  name: string;
  contactCount: number;
}

export default function WABlastCampaignsPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [newCampaign, setNewCampaign] = useState({
    channelId: "",
    templateId: "",
    name: "",
    messageContent: "",
    listIds: [] as string[],
    scheduledAt: "",
  });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/wa-blast/campaigns", activeTab],
    queryFn: async () => {
      const params = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await fetch(`/api/wa-blast/campaigns${params}`);
      return res.json();
    },
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/wa-blast/channels"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/wa-blast/templates"],
  });

  const { data: lists = [] } = useQuery<ContactList[]>({
    queryKey: ["/api/wa-blast/contact-lists"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await apiRequest("POST", "/api/wa-blast/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/campaigns"] });
      setIsCreateOpen(false);
      setNewCampaign({
        channelId: "",
        templateId: "",
        name: "",
        messageContent: "",
        listIds: [],
        scheduledAt: "",
      });
      toast({ title: "Campaign berhasil dibuat" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal membuat campaign", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/wa-blast/campaigns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/campaigns"] });
      toast({ title: "Campaign berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menghapus campaign", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: Campaign["status"]) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-600"><Calendar className="w-3 h-3 mr-1" /> Dijadwalkan</Badge>;
      case "sending":
        return <Badge className="bg-yellow-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengirim</Badge>;
      case "completed":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Selesai</Badge>;
      case "paused":
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" /> Dijeda</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Gagal</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setNewCampaign({
        ...newCampaign,
        templateId,
        messageContent: template.content,
      });
    }
  };

  const handleSubmit = () => {
    if (!newCampaign.channelId || !newCampaign.name || !newCampaign.messageContent) {
      toast({ title: "Channel, nama, dan pesan wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate(newCampaign);
  };

  const toggleListSelection = (listId: string) => {
    const ids = newCampaign.listIds.includes(listId)
      ? newCampaign.listIds.filter((id) => id !== listId)
      : [...newCampaign.listIds, listId];
    setNewCampaign({ ...newCampaign, listIds: ids });
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Campaigns</h1>
            <p className="text-muted-foreground">Create and manage WhatsApp broadcasts</p>
          </div>
          <InfoTooltip 
            title="Campaign Management" 
            description="Campaigns let you send messages to your contact lists. You can send immediately or schedule for later."
            nextStep="Create your first campaign to start sending broadcasts"
            id="campaigns"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Plus className="w-4 h-4 mr-2" />
              Buat Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Campaign Baru</DialogTitle>
              <DialogDescription>
                Kirim pesan broadcast ke kontak Anda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Campaign *</Label>
                  <Input
                    placeholder="Contoh: Promo Januari 2026"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    data-testid="input-campaign-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Channel WhatsApp *</Label>
                  <Select
                    value={newCampaign.channelId}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, channelId: value })}
                  >
                    <SelectTrigger data-testid="select-campaign-channel">
                      <SelectValue placeholder="Pilih channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.filter((c) => c.status === "connected").map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name} {channel.phoneNumber && `(${channel.phoneNumber})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Template (opsional)</Label>
                <Select
                  value={newCampaign.templateId}
                  onValueChange={handleTemplateSelect}
                >
                  <SelectTrigger data-testid="select-campaign-template">
                    <SelectValue placeholder="Pilih template atau tulis manual" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pesan *</Label>
                <Textarea
                  placeholder="Tulis pesan broadcast Anda..."
                  value={newCampaign.messageContent}
                  onChange={(e) => setNewCampaign({ ...newCampaign, messageContent: e.target.value })}
                  rows={5}
                  data-testid="textarea-campaign-message"
                />
              </div>

              <div className="space-y-2">
                <Label>Pilih List Penerima</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {lists.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                      Belum ada list kontak
                    </p>
                  ) : (
                    lists.map((list) => (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => toggleListSelection(list.id)}
                        className={`flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                          newCampaign.listIds.includes(list.id)
                            ? "bg-primary text-primary-foreground"
                            : "hover-elevate"
                        }`}
                        data-testid={`button-select-list-${list.id}`}
                      >
                        <span className="truncate">{list.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {list.contactCount}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jadwalkan (opsional)</Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduledAt}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduledAt: e.target.value })}
                  data-testid="input-campaign-schedule"
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan untuk mengirim segera setelah memulai campaign
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan sebagai Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
        <button 
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full"
          data-testid="button-toggle-tutorial"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-base text-orange-900 dark:text-orange-100">Step-by-Step Tutorial</CardTitle>
            </div>
            {showTutorial ? <ChevronUp className="w-5 h-5 text-orange-600" /> : <ChevronDown className="w-5 h-5 text-orange-600" />}
          </CardHeader>
        </button>
        {showTutorial && (
          <CardContent className="pt-0 pb-4">
            <div className="grid gap-3 md:grid-cols-4">
              <StepIndicator 
                step={1} 
                title="Select Channel" 
                description="Choose a connected WhatsApp channel to send from"
                isActive={channels.filter(c => c.status === "connected").length === 0}
                isCompleted={channels.filter(c => c.status === "connected").length > 0}
              />
              <StepIndicator 
                step={2} 
                title="Choose Recipients" 
                description="Select contact lists to receive your broadcast"
                isActive={channels.filter(c => c.status === "connected").length > 0 && lists.length === 0}
                isCompleted={lists.length > 0}
              />
              <StepIndicator 
                step={3} 
                title="Compose Message" 
                description="Use a template or write a custom message"
                isActive={lists.length > 0}
              />
              <StepIndicator 
                step={4} 
                title="Send or Schedule" 
                description="Send immediately or schedule for optimal timing"
              />
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">Semua</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">Dijadwalkan</TabsTrigger>
          <TabsTrigger value="sending" data-testid="tab-sending">Mengirim</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Selesai</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum ada campaign</h3>
            <p className="text-muted-foreground text-center mb-4">
              Buat campaign pertama untuk mengirim broadcast
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Campaign Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const progress = campaign.totalRecipients > 0
              ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
              : 0;

            return (
              <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {campaign.totalRecipients} penerima
                    {campaign.scheduledAt && (
                      <>
                        <Clock className="w-3 h-3 ml-2" />
                        {new Date(campaign.scheduledAt).toLocaleDateString("id-ID")}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {campaign.messageContent}
                  </p>
                  {(campaign.status === "sending" || campaign.status === "completed") && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="text-green-600">{campaign.deliveredCount} terkirim</span>
                        {campaign.failedCount > 0 && (
                          <span className="text-red-600">{campaign.failedCount} gagal</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="gap-2">
                  <Button size="sm" variant="outline" data-testid={`button-view-campaign-${campaign.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {campaign.status === "draft" && (
                    <Button size="sm" variant="default" data-testid={`button-start-campaign-${campaign.id}`}>
                      <Play className="w-4 h-4 mr-1" />
                      Mulai
                    </Button>
                  )}
                  {campaign.status === "sending" && (
                    <Button size="sm" variant="secondary" data-testid={`button-pause-campaign-${campaign.id}`}>
                      <Pause className="w-4 h-4 mr-1" />
                      Jeda
                    </Button>
                  )}
                  {campaign.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Hapus campaign ini?")) {
                          deleteMutation.mutate(campaign.id);
                        }
                      }}
                      data-testid={`button-delete-campaign-${campaign.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
