import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, CheckCircle, Users, DollarSign, Clock } from "lucide-react";

interface AddonConfig {
  id: number;
  addonType: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  isEnabled: boolean;
}

interface AddonSubscriber {
  merchantId: string;
  businessName: string;
  email: string;
  addonType: string;
  isActive: boolean;
  subscribedAt: string | null;
  trialEndsAt: string | null;
  paymentReference: string | null;
}

interface Props {
  toast: (args: any) => void;
}

export function AdditionalServicesTab({ toast }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);

  const { data: addonConfigs = [], isLoading: configsLoading } = useQuery<AddonConfig[]>({
    queryKey: ["/api/admin/addon-configs"],
  });

  const { data: subscribers = [], isLoading: subscribersLoading } = useQuery<AddonSubscriber[]>({
    queryKey: ["/api/admin/addon-configs/subscribers"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { monthlyPriceUsd?: number; isEnabled?: boolean } }) =>
      apiRequest("PATCH", `/api/admin/addon-configs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addon-configs"] });
      setEditingId(null);
      toast({ title: "Addon config updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const activateMutation = useMutation({
    mutationFn: ({ merchantId, addonType }: { merchantId: string; addonType: string }) =>
      apiRequest("POST", `/api/admin/merchant-addons/${merchantId}/activate`, { addonType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addon-configs/subscribers"] });
      toast({ title: "Addon activated for merchant" });
    },
    onError: () => toast({ title: "Failed to activate", variant: "destructive" }),
  });

  const startEdit = (config: AddonConfig) => {
    setEditingId(config.id);
    setEditPrice(String(config.monthlyPriceUsd));
    setEditEnabled(config.isEnabled);
  };

  const saveEdit = () => {
    if (editingId === null) return;
    updateConfigMutation.mutate({
      id: editingId,
      data: { monthlyPriceUsd: parseFloat(editPrice) || 0, isEnabled: editEnabled },
    });
  };

  const activeCount = subscribers.filter(s => s.isActive).length;
  const totalRevenue = addonConfigs.reduce((sum, c) => {
    const count = subscribers.filter(s => s.addonType === c.addonType && s.isActive).length;
    return sum + count * c.monthlyPriceUsd;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Additional Services</h2>
        <p className="text-sm text-muted-foreground">Manage addon configurations, pricing, and merchant subscriptions.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Active Subscribers</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Monthly Addon Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Addon Types</p>
                <p className="text-2xl font-bold">{addonConfigs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Addon configs table */}
      <Card>
        <CardHeader>
          <CardTitle>Addon Configurations</CardTitle>
          <CardDescription>Set pricing and enable/disable addons for all merchants.</CardDescription>
        </CardHeader>
        <CardContent>
          {configsLoading ? (
            <div className="flex items-center gap-2 py-6"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm text-muted-foreground">Loading...</span></div>
          ) : addonConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No addon configurations found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Addon</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price/Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addonConfigs.map(config => {
                  const subCount = subscribers.filter(s => s.addonType === config.addonType && s.isActive).length;
                  const isEditing = editingId === config.id;
                  return (
                    <TableRow key={config.id} data-testid={`row-addon-config-${config.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{config.name}</p>
                          {config.description && <p className="text-xs text-muted-foreground truncate max-w-48">{config.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">{config.addonType}</Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">$</span>
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={e => setEditPrice(e.target.value)}
                              className="w-24 text-sm"
                              step="0.01"
                              data-testid={`input-price-${config.id}`}
                            />
                          </div>
                        ) : (
                          <span className="font-medium">${config.monthlyPriceUsd}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editEnabled}
                              onCheckedChange={setEditEnabled}
                              data-testid={`switch-enabled-${config.id}`}
                            />
                            <Label className="text-xs">{editEnabled ? "Enabled" : "Disabled"}</Label>
                          </div>
                        ) : (
                          <Badge variant={config.isEnabled ? "secondary" : "outline"} className="text-xs">
                            {config.isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{subCount}</span>
                        <span className="text-xs text-muted-foreground ml-1">active</span>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={saveEdit} disabled={updateConfigMutation.isPending} data-testid={`button-save-addon-${config.id}`}>
                              {updateConfigMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-addon-${config.id}`}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => startEdit(config)} data-testid={`button-edit-addon-${config.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscribers table */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Subscribers</CardTitle>
          <CardDescription>All merchants with addon subscriptions. Activate pending payments here.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscribersLoading ? (
            <div className="flex items-center gap-2 py-6"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm text-muted-foreground">Loading...</span></div>
          ) : subscribers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No subscribers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Addon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub, idx) => {
                  const trialActive = sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
                  const trialDaysLeft = sub.trialEndsAt
                    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000))
                    : null;
                  return (
                    <TableRow key={`${sub.merchantId}-${sub.addonType}-${idx}`} data-testid={`row-subscriber-${sub.merchantId}-${sub.addonType}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{sub.businessName}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">{sub.addonType}</Badge>
                      </TableCell>
                      <TableCell>
                        {sub.isActive && trialActive ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            Trial
                          </Badge>
                        ) : (
                          <Badge variant={sub.isActive ? "secondary" : "outline"} className="text-xs">
                            {sub.isActive ? "Active" : "Pending"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sub.trialEndsAt ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(sub.trialEndsAt).toLocaleDateString("en-GB")}
                            {trialDaysLeft !== null && trialActive && (
                              <span className="ml-1 text-orange-500">({trialDaysLeft}d left)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.paymentReference ? (
                          <span className="text-xs font-mono text-muted-foreground truncate max-w-24 block" title={sub.paymentReference}>
                            {sub.paymentReference.substring(0, 12)}…
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!sub.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activateMutation.mutate({ merchantId: sub.merchantId, addonType: sub.addonType })}
                            disabled={activateMutation.isPending}
                            data-testid={`button-activate-${sub.merchantId}-${sub.addonType}`}
                          >
                            {activateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Activate"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
