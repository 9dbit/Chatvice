import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Smartphone, Link2, CheckCircle2, XCircle, Loader2, Settings, Trash2, RefreshCw } from "lucide-react";

interface Channel {
  id: string;
  type: "meta_api" | "wa_web";
  name: string;
  phoneNumber: string | null;
  status: string;
  metaPhoneNumberId: string | null;
  createdAt: string;
}

export default function WABlastChannelsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    type: "meta_api" as "meta_api" | "wa_web",
    name: "",
    phoneNumber: "",
    metaPhoneNumberId: "",
    metaAccessToken: "",
    metaWabaId: "",
  });

  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/wa-blast/channels"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newChannel) => {
      const res = await apiRequest("POST", "/api/wa-blast/channels", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/channels"] });
      setIsAddDialogOpen(false);
      setNewChannel({
        type: "meta_api",
        name: "",
        phoneNumber: "",
        metaPhoneNumberId: "",
        metaAccessToken: "",
        metaWabaId: "",
      });
      toast({ title: "Channel berhasil ditambahkan" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menambahkan channel", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await apiRequest("POST", `/api/wa-blast/channels/${channelId}/test`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/channels"] });
      if (data.success) {
        toast({ title: "Koneksi berhasil!", description: "Channel terhubung dengan WhatsApp Business API" });
      } else {
        toast({ title: "Koneksi gagal", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await apiRequest("DELETE", `/api/wa-blast/channels/${channelId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/channels"] });
      toast({ title: "Channel berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menghapus channel", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!newChannel.name) {
      toast({ title: "Nama channel wajib diisi", variant: "destructive" });
      return;
    }
    createMutation.mutate(newChannel);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Terhubung</Badge>;
      case "disconnected":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Terputus</Badge>;
      case "pending":
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Menunggu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">WhatsApp Channels</h1>
          <p className="text-muted-foreground">Kelola koneksi WhatsApp Business API</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-channel">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Channel WhatsApp</DialogTitle>
              <DialogDescription>
                Hubungkan akun WhatsApp Business API Anda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipe Channel</Label>
                <Select
                  value={newChannel.type}
                  onValueChange={(value: "meta_api" | "wa_web") => setNewChannel({ ...newChannel, type: value })}
                >
                  <SelectTrigger data-testid="select-channel-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta_api">Meta Cloud API (Official)</SelectItem>
                    <SelectItem value="wa_web">WhatsApp Web (Automation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama Channel</Label>
                <Input
                  placeholder="Contoh: CS Utama"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  data-testid="input-channel-name"
                />
              </div>
              {newChannel.type === "meta_api" && (
                <>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input
                      placeholder="ID dari Meta Business Suite"
                      value={newChannel.metaPhoneNumberId}
                      onChange={(e) => setNewChannel({ ...newChannel, metaPhoneNumberId: e.target.value })}
                      data-testid="input-phone-number-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Token</Label>
                    <Input
                      type="password"
                      placeholder="Token dari Meta Developer"
                      value={newChannel.metaAccessToken}
                      onChange={(e) => setNewChannel({ ...newChannel, metaAccessToken: e.target.value })}
                      data-testid="input-access-token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WABA ID</Label>
                    <Input
                      placeholder="WhatsApp Business Account ID"
                      value={newChannel.metaWabaId}
                      onChange={(e) => setNewChannel({ ...newChannel, metaWabaId: e.target.value })}
                      data-testid="input-waba-id"
                    />
                  </div>
                </>
              )}
              {newChannel.type === "wa_web" && (
                <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Setelah membuat channel, Anda perlu memindai QR code untuk menghubungkan WhatsApp.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-channel">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : channels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum ada channel</h3>
            <p className="text-muted-foreground text-center mb-4">
              Tambahkan channel WhatsApp untuk mulai mengirim broadcast
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Channel Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id} data-testid={`card-channel-${channel.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    {channel.type === "meta_api" ? (
                      <Link2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{channel.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {channel.type === "meta_api" ? "Meta Cloud API" : "WhatsApp Web"}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(channel.status)}
              </CardHeader>
              <CardContent>
                {channel.phoneNumber && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {channel.phoneNumber}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate(channel.id)}
                    disabled={testMutation.isPending}
                    data-testid={`button-test-channel-${channel.id}`}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`button-settings-channel-${channel.id}`}>
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Hapus channel ini?")) {
                        deleteMutation.mutate(channel.id);
                      }
                    }}
                    data-testid={`button-delete-channel-${channel.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
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
