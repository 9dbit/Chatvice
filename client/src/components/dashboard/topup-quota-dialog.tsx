import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Zap, ArrowUpRight, Loader2, CheckCircle2 } from "lucide-react";
import { formatIdr } from "@/lib/pricing";
import { Link } from "wouter";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface BillingStatus {
  planId: string;
  planName: string;
}

interface PlanInfo {
  id: string;
  name: string;
  overageRateIdr?: number;
}

interface TopUpRequest {
  id: string;
  status: string;
  conversations: number;
  amountIdr: number;
  createdAt: string;
}

const BUNDLE_QTYS = [
  { qty: 500, label: "500", discountPct: 0 },
  { qty: 1500, label: "1.500", discountPct: 10 },
  { qty: 5000, label: "5.000", discountPct: 20 },
];

export function TopUpQuotaDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedQty, setSelectedQty] = useState<number>(1500);

  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    enabled: open,
  });
  const { data: plans = [] } = useQuery<PlanInfo[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: open,
  });
  const { data: pending = [] } = useQuery<TopUpRequest[]>({
    queryKey: ["/api/merchant/topup-requests"],
    enabled: open,
  });

  const currentPlan = plans.find((p) => p.id === billingStatus?.planId);
  const overageRateIdr = currentPlan?.overageRateIdr || 250;

  const packs = useMemo(() =>
    BUNDLE_QTYS.map((b) => {
      const baseIdr = b.qty * overageRateIdr;
      const finalIdr = Math.round(baseIdr * (1 - b.discountPct / 100));
      return { ...b, baseIdr, finalIdr };
    }), [overageRateIdr]);

  const selected = packs.find((p) => p.qty === selectedQty) || packs[1];

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/merchant/billing/topup-quota", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversations: selected.qty,
          amountIdr: selected.finalIdr,
          overageRateIdr,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengirim permintaan top-up");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Permintaan top-up terkirim",
        description: "Tim kami akan menerbitkan invoice top-up dalam 1x24 jam.",
      });
      qc.invalidateQueries({ queryKey: ["/api/merchant/topup-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/merchant/custom-plan-requests"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Gagal", description: e.message || "Coba lagi", variant: "destructive" });
    },
  });

  const hasPending = pending.some((r) => r.status === "submitted" || r.status === "under_review");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Top-up percakapan
          </DialogTitle>
          <DialogDescription>
            Tambah kuota percakapan untuk billing cycle berjalan tanpa upgrade plan. Harga dihitung dari overage rate plan
            <span className="font-semibold"> {currentPlan?.name || billingStatus?.planName || "—"}</span>: {formatIdr(overageRateIdr)} / percakapan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3 my-2">
          {packs.map((p) => {
            const isSelected = selectedQty === p.qty;
            return (
              <Card
                key={p.qty}
                className={`p-4 cursor-pointer transition-all hover-elevate ${isSelected ? "border-purple-500 ring-2 ring-purple-500/30" : ""}`}
                onClick={() => setSelectedQty(p.qty)}
                data-testid={`topup-pack-${p.qty}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Bundle</div>
                  {p.discountPct > 0 ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs">
                      Hemat {p.discountPct}%
                    </Badge>
                  ) : isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  ) : null}
                </div>
                <div className="text-2xl font-bold mb-1">{p.label}</div>
                <div className="text-xs text-muted-foreground mb-3">percakapan tambahan</div>
                <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">{formatIdr(p.finalIdr)}</div>
                {p.discountPct > 0 && (
                  <div className="text-xs text-muted-foreground line-through">{formatIdr(p.baseIdr)}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {formatIdr(Math.round(p.finalIdr / p.qty))} / percakapan
                </div>
              </Card>
            );
          })}
        </div>

        {hasPending && (
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm">
            Anda sudah punya permintaan top-up tertunda. Cek status di{" "}
            <Link href="/dashboard/billing-details" className="text-purple-600 underline">Riwayat Billing</Link>.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center pt-2 border-t">
          <div className="text-sm">
            <div className="text-muted-foreground">Total</div>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400" data-testid="text-topup-total">
              {formatIdr(selected.finalIdr)}
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
