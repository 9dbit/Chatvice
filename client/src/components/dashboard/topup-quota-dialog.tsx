import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Zap, ArrowUpRight, Loader2, CheckCircle2 } from "lucide-react";
import { TOPUP_PACKS, formatIdr, type TopUpPack } from "@/lib/pricing";
import { Link } from "wouter";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface CustomRequest {
  id: string;
  status: string;
}

export function TopUpQuotaDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<TopUpPack>(TOPUP_PACKS[1]);

  const { data: requests = [] } = useQuery<CustomRequest[]>({
    queryKey: ["/api/merchant/custom-plan-requests"],
    enabled: open,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/custom-plan-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredConversations: selected.conversations,
          desiredAgents: 0,
          desiredSupervisors: 0,
          desiredSources: 0,
          desiredSuggestedQuestions: 0,
          message: `[TOP-UP KUOTA] Tambah ${selected.conversations.toLocaleString("id-ID")} percakapan untuk billing cycle berjalan. Estimasi biaya ${formatIdr(selected.priceIdr)}.`,
        }),
      });
      if (!res.ok) throw new Error("Gagal mengirim permintaan top-up");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Permintaan top-up terkirim",
        description: "Tim kami akan menerbitkan invoice top-up dalam 1x24 jam.",
      });
      qc.invalidateQueries({ queryKey: ["/api/merchant/custom-plan-requests"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Gagal", description: e.message || "Coba lagi", variant: "destructive" });
    },
  });

  const hasPending = requests.some(r => r.status === "submitted" || r.status === "under_review" || r.status === "pricing_proposed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Top-up percakapan
          </DialogTitle>
          <DialogDescription>
            Tambah kuota percakapan untuk billing cycle berjalan tanpa harus upgrade plan. Top-up berlaku sampai akhir periode.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3 my-2">
          {TOPUP_PACKS.map((p) => {
            const isSelected = selected.id === p.id;
            return (
              <Card
                key={p.id}
                className={`p-4 cursor-pointer transition-all hover-elevate ${isSelected ? "border-purple-500 ring-2 ring-purple-500/30" : ""}`}
                onClick={() => setSelected(p)}
                data-testid={`topup-pack-${p.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Pack {p.id}</div>
                  {p.badge && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs">{p.badge}</Badge>}
                  {isSelected && !p.badge && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <div className="text-2xl font-bold mb-1">{p.conversations.toLocaleString("id-ID")}</div>
                <div className="text-xs text-muted-foreground mb-3">percakapan tambahan</div>
                <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">{formatIdr(p.priceIdr)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatIdr(Math.round(p.priceIdr / p.conversations))} / percakapan
                </div>
              </Card>
            );
          })}
        </div>

        {hasPending && (
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm">
            Anda sudah punya permintaan tertunda. Cek status di{" "}
            <Link href="/dashboard/billing-details" className="text-purple-600 underline">Riwayat Billing</Link>.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center pt-2 border-t">
          <div className="text-sm">
            <div className="text-muted-foreground">Total</div>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400" data-testid="text-topup-total">
              {formatIdr(selected.priceIdr)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-topup-cancel">Batal</Button>
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending || hasPending}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              data-testid="button-topup-submit"
            >
              {submit.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Minta invoice top-up
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
