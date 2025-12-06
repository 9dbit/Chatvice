import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Volume2, Upload, Play, AlertTriangle, MessageCircle, UserPlus } from "lucide-react";
import type { NotificationSetting } from "@shared/schema";

const defaultSounds = [
  { id: "default", name: "Default", url: "" },
  { id: "chime", name: "Chime", url: "" },
  { id: "bell", name: "Bell", url: "" },
  { id: "alert", name: "Alert", url: "" },
  { id: "ping", name: "Ping", url: "" },
];

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<NotificationSetting>({
    queryKey: ["/api/notification-settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<NotificationSetting>) => {
      return apiRequest("PUT", "/api/notification-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Pengaturan notifikasi berhasil disimpan" });
    },
    onError: () => {
      toast({ title: "Gagal menyimpan pengaturan", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("sound", file);
      formData.append("name", file.name);
      
      const res = await fetch("/api/notification-settings/upload-sound", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Suara berhasil diupload" });
    },
    onError: () => {
      toast({ title: "Gagal mengupload suara", variant: "destructive" });
    },
  });

  function handleUpdate(key: string, value: any) {
    updateMutation.mutate({ [key]: value });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        toast({ title: "File harus berupa audio", variant: "destructive" });
        return;
      }
      uploadMutation.mutate(file);
    }
  }

  function playSound(soundId: string) {
    setIsPlaying(soundId);
    const audio = new Audio();
    audio.src = `/sounds/${soundId}.mp3`;
    audio.onended = () => setIsPlaying(null);
    audio.onerror = () => {
      setIsPlaying(null);
      toast({ title: "Tidak dapat memutar suara", variant: "destructive" });
    };
    audio.play().catch(() => {
      setIsPlaying(null);
    });
  }

  const customSounds = (settings?.customSounds as any[]) || [];
  const allSounds = [...defaultSounds, ...customSounds.map((s: any) => ({ id: s.url, name: s.name, url: s.url }))];

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Bell className="w-6 h-6" />
          Pengaturan Notifikasi
        </h1>
        <p className="text-muted-foreground">Atur suara dan notifikasi untuk berbagai event chat</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-500" />
              Chat Masuk Baru
            </CardTitle>
            <CardDescription>Notifikasi saat ada customer baru memulai chat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="incomingEnabled">Aktifkan Notifikasi</Label>
              <Switch
                id="incomingEnabled"
                checked={settings?.incomingChatEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate("incomingChatEnabled", checked)}
                data-testid="switch-incoming-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Pilih Suara</Label>
              <div className="flex gap-2">
                <Select 
                  value={settings?.incomingChatSound || "default"}
                  onValueChange={(value) => handleUpdate("incomingChatSound", value)}
                >
                  <SelectTrigger className="flex-1" data-testid="select-incoming-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSounds.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => playSound(settings?.incomingChatSound || "default")}
                  disabled={isPlaying === (settings?.incomingChatSound || "default")}
                  data-testid="button-play-incoming"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Balasan Chat
            </CardTitle>
            <CardDescription>Notifikasi saat ada pesan baru dari customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="replyEnabled">Aktifkan Notifikasi</Label>
              <Switch
                id="replyEnabled"
                checked={settings?.chatReplyEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate("chatReplyEnabled", checked)}
                data-testid="switch-reply-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Pilih Suara</Label>
              <div className="flex gap-2">
                <Select 
                  value={settings?.chatReplySound || "default"}
                  onValueChange={(value) => handleUpdate("chatReplySound", value)}
                >
                  <SelectTrigger className="flex-1" data-testid="select-reply-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSounds.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => playSound(settings?.chatReplySound || "default")}
                  disabled={isPlaying === (settings?.chatReplySound || "default")}
                  data-testid="button-play-reply"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Customer Marah
            </CardTitle>
            <CardDescription>Notifikasi saat sistem mendeteksi customer yang marah atau frustasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="angryEnabled">Aktifkan Notifikasi</Label>
              <Switch
                id="angryEnabled"
                checked={settings?.angryCustomerEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate("angryCustomerEnabled", checked)}
                data-testid="switch-angry-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Pilih Suara</Label>
              <div className="flex gap-2">
                <Select 
                  value={settings?.angryCustomerSound || "alert"}
                  onValueChange={(value) => handleUpdate("angryCustomerSound", value)}
                >
                  <SelectTrigger className="flex-1" data-testid="select-angry-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSounds.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => playSound(settings?.angryCustomerSound || "alert")}
                  disabled={isPlaying === (settings?.angryCustomerSound || "alert")}
                  data-testid="button-play-angry"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Suara Kustom
            </CardTitle>
            <CardDescription>Upload file audio untuk digunakan sebagai notifikasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Volume2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Seret file audio atau klik untuk memilih
              </p>
              <Input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="sound-upload"
                data-testid="input-upload-sound"
              />
              <Label htmlFor="sound-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Pilih File Audio
                  </span>
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                Format yang didukung: MP3, WAV, OGG
              </p>
            </div>

            {customSounds.length > 0 && (
              <div className="space-y-2">
                <Label>Suara Kustom Anda</Label>
                <div className="space-y-2">
                  {customSounds.map((sound: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      data-testid={`custom-sound-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{sound.name}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          const audio = new Audio(sound.url);
                          audio.play();
                        }}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
