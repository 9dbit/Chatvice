import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddonConfig {
  id: number;
  addonType: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  isEnabled: boolean;
}

interface MerchantAddon {
  id: string;
  merchantId: string;
  addonType: string;
  isActive: boolean;
  calendarToken: string | null;
  subscribedAt: string | null;
}

const addonIcons: Record<string, React.ComponentType<any>> = {
  appointment_scheduling: Calendar,
};

export default function AdditionalServicesPage() {
  const { toast } = useToast();

  const { data: addonConfigs = [], isLoading: configsLoading } = useQuery<AddonConfig[]>({
    queryKey: ["/api/addon-configs"],
  });

  const { data: merchantAddons = [], isLoading: addonsLoading } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const subscribeMutation = useMutation({
    mutationFn: (addonType: string) =>
      apiRequest("POST", "/api/merchant/addons/subscribe", { addonType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      toast({ title: "Addon aktif!", description: "Layanan tambahan berhasil diaktifkan." });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (addonType: string) =>
      apiRequest("DELETE", `/api/merchant/addons/${addonType}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
      toast({ title: "Addon dinonaktifkan", description: "Layanan tambahan telah dinonaktifkan." });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    },
  });

  const getActiveAddon = (addonType: string) =>
    merchantAddons.find(a => a.addonType === addonType && a.isActive);

  const isLoading = configsLoading || addonsLoading;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Layanan Tambahan</h1>
        <p className="text-muted-foreground mt-1">
          Aktifkan fitur premium untuk meningkatkan kapabilitas chatbot Anda.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : addonConfigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Sparkles className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Belum ada layanan tambahan yang tersedia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addonConfigs.map((config) => {
            const active = getActiveAddon(config.addonType);
            const Icon = addonIcons[config.addonType] || Sparkles;

            return (
              <Card key={config.addonType} data-testid={`card-addon-${config.addonType}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{config.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-primary">
                            ${config.monthlyPriceUsd}/bulan
                          </span>
                          {active ? (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Aktif
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config.description && (
                    <CardDescription className="text-sm leading-relaxed">
                      {config.description}
                    </CardDescription>
                  )}

                  {config.addonType === "appointment_scheduling" && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Manajemen divisi &amp; staf</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Kalender internal berbagi link</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Cek ketersediaan via AI chatbot</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Notifikasi WhatsApp otomatis</li>
                    </ul>
                  )}

                  <div className="flex gap-2 pt-1">
                    {active ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = "/dashboard/appointments"}
                          data-testid={`button-manage-${config.addonType}`}
                        >
                          Kelola
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelMutation.mutate(config.addonType)}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-${config.addonType}`}
                        >
                          {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Nonaktifkan"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => subscribeMutation.mutate(config.addonType)}
                        disabled={subscribeMutation.isPending}
                        data-testid={`button-subscribe-${config.addonType}`}
                      >
                        {subscribeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Aktifkan — ${config.monthlyPriceUsd}/bln
                      </Button>
                    )}
                  </div>

                  {!active && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Pembayaran akan diproses saat konfirmasi.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
