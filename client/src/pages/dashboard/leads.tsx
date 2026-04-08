import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Target, TrendingUp, DollarSign, Flame, Thermometer, 
  Snowflake, CheckCircle, XCircle, Edit, Trash2, Phone, Mail, 
  MessageSquare, Calendar, ArrowUpRight, Filter
} from "lucide-react";
import type { Lead } from "@shared/schema";

const STAGE_CONFIG = {
  cold: { label: "Cold", icon: Snowflake, color: "bg-blue-500", textColor: "text-blue-600" },
  warm: { label: "Warm", icon: Thermometer, color: "bg-yellow-500", textColor: "text-yellow-600" },
  hot: { label: "Hot", icon: Flame, color: "bg-orange-500", textColor: "text-orange-600" },
  qualified: { label: "Qualified", icon: Target, color: "bg-purple-500", textColor: "text-purple-600" },
  converted: { label: "Converted", icon: CheckCircle, color: "bg-green-500", textColor: "text-green-600" },
  lost: { label: "Lost", icon: XCircle, color: "bg-gray-500", textColor: "text-gray-600" },
};

interface LeadStats {
  total: number;
  byStage: Record<string, number>;
  avgScore: number;
  totalConvertedValue: number;
  conversionRate: number;
}

export default function LeadsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return apiRequest("PUT", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setIsEditDialogOpen(false);
      setSelectedLead(null);
      toast({
        title: "Lead updated",
        description: "Lead information has been updated successfully.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({
        title: "Lead deleted",
        description: "Lead has been removed.",
      });
    },
  });

  const filteredLeads = leads?.filter(lead => {
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    const matchesSearch = !searchQuery || 
      lead.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  }) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value / 100);
  };

  const getStageInfo = (stage: string) => {
    return STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.cold;
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleUpdateStage = (leadId: string, newStage: string) => {
    updateMutation.mutate({ id: leadId, data: { stage: newStage } });
  };

  if (leadsLoading || statsLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.leads.title")}</h1>
          <p className="text-muted-foreground">Track and manage your sales pipeline</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-background/70 backdrop-blur-md border-white/20" data-testid="card-stat-total-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-leads">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-background/70 backdrop-blur-md border-white/20" data-testid="card-stat-hot-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500" data-testid="text-hot-leads">{stats?.byStage?.hot || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-background/70 backdrop-blur-md border-white/20" data-testid="card-stat-conversion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-conversion-rate">{stats?.conversionRate || 0}%</div>
          </CardContent>
        </Card>

        <Card className="bg-background/70 backdrop-blur-md border-white/20" data-testid="card-stat-converted-value">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Converted Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold" data-testid="text-converted-value">{formatCurrency(stats?.totalConvertedValue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card className="bg-background/70 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Overview</CardTitle>
          <CardDescription>Leads by stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
              const count = stats?.byStage?.[stage] || 0;
              const Icon = config.icon;
              return (
                <Button
                  key={stage}
                  variant={stageFilter === stage ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
                  data-testid={`button-filter-${stage}`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </Button>
              );
            })}
            {stageFilter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setStageFilter("all")}>
                Clear filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card className="bg-background/70 backdrop-blur-md border-white/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">All Leads</CardTitle>
              <CardDescription>{filteredLeads.length} leads</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search leads..." 
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-leads"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("dashboard.leads.noLeads")}</h3>
              <p className="text-muted-foreground">
                Leads will appear here when customers interact with your Sales Agent.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => {
                const stageInfo = getStageInfo(lead.stage || "cold");
                const StageIcon = stageInfo.icon;
                return (
                  <div 
                    key={lead.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                    data-testid={`lead-card-${lead.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {(lead.customerName || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium" data-testid={`text-lead-name-${lead.id}`}>{lead.customerName || "Unknown"}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {lead.customerEmail && (
                            <span className="flex items-center gap-1" data-testid={`text-lead-email-${lead.id}`}>
                              <Mail className="w-3 h-3" />
                              {lead.customerEmail}
                            </span>
                          )}
                          {lead.customerPhone && (
                            <span className="flex items-center gap-1" data-testid={`text-lead-phone-${lead.id}`}>
                              <Phone className="w-3 h-3" />
                              {lead.customerPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Score */}
                      <div className="text-center">
                        <div className="text-lg font-bold" data-testid={`text-lead-score-${lead.id}`}>{lead.score || 0}</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>

                      {/* Stage Badge */}
                      <Badge className={`${stageInfo.color} text-white gap-1`} data-testid={`badge-lead-stage-${lead.id}`}>
                        <StageIcon className="w-3 h-3" />
                        {stageInfo.label}
                      </Badge>

                      {/* Last Contact */}
                      {lead.lastContactAt && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.lastContactAt).toLocaleDateString()}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {lead.sessionId && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/dashboard/sessions?session=${lead.sessionId}`}>
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditLead(lead)}
                          data-testid={`button-edit-lead-${lead.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteMutation.mutate(lead.id)}
                          data-testid={`button-delete-lead-${lead.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update lead information and stage</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input 
                  value={selectedLead.customerName || ""} 
                  onChange={(e) => setSelectedLead({...selectedLead, customerName: e.target.value})}
                  data-testid="input-edit-lead-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={selectedLead.customerEmail || ""} 
                  onChange={(e) => setSelectedLead({...selectedLead, customerEmail: e.target.value})}
                  data-testid="input-edit-lead-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={selectedLead.customerPhone || ""} 
                  onChange={(e) => setSelectedLead({...selectedLead, customerPhone: e.target.value})}
                  data-testid="input-edit-lead-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select 
                  value={selectedLead.stage || "cold"} 
                  onValueChange={(value) => setSelectedLead({...selectedLead, stage: value})}
                >
                  <SelectTrigger data-testid="select-edit-lead-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_CONFIG).map(([stage, config]) => (
                      <SelectItem key={stage} value={stage}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score (0-100)</Label>
                <Input 
                  type="number"
                  min={0}
                  max={100}
                  value={selectedLead.score || 0} 
                  onChange={(e) => setSelectedLead({...selectedLead, score: parseInt(e.target.value) || 0})}
                  data-testid="input-edit-lead-score"
                />
              </div>
              <div className="space-y-2">
                <Label>Converted Value (IDR)</Label>
                <Input 
                  type="number"
                  min={0}
                  value={(selectedLead.convertedValue || 0) / 100} 
                  onChange={(e) => setSelectedLead({...selectedLead, convertedValue: (parseInt(e.target.value) || 0) * 100})}
                  data-testid="input-edit-lead-value"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={selectedLead.notes || ""} 
                  onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
                  data-testid="input-edit-lead-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedLead) {
                  updateMutation.mutate({
                    id: selectedLead.id,
                    data: {
                      customerName: selectedLead.customerName,
                      customerEmail: selectedLead.customerEmail,
                      customerPhone: selectedLead.customerPhone,
                      stage: selectedLead.stage,
                      score: selectedLead.score,
                      convertedValue: selectedLead.convertedValue,
                      notes: selectedLead.notes,
                    }
                  });
                }
              }}
              disabled={updateMutation.isPending}
              data-testid="button-save-lead"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
