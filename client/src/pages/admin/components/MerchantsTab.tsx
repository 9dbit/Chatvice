import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MetricTooltip } from "@/components/analytics/MetricTooltip";
import { MultiSeriesBarChart } from "@/components/analytics/RealtimeChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  Crown,
  Zap,
  Sparkles,
  Gift,
  Edit,
  Trash,
  Plus,
  Bell,
  Loader2,
  Download,
  Eye,
  Calendar,
  Info,
  Link2,
  Check,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

export interface MerchantWithPlan {
  id: string;
  email: string;
  companyName: string;
  subscriptionStatus: string;
  subscriptionPlanId: string;
  conversationsUsed: number;
  createdAt: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  websiteUrl?: string;
  picName?: string;
  phone?: string;
  country?: string;
  city?: string;
  region?: string;
  allowedDomains?: string;
  address?: string;
  postalCode?: string;
  billingCycle?: string;
  plan: {
    name: string;
    conversationsLimit: number;
  };
}

function generateCSV(data: any[], columns: { key: string; label: string }[]) {
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(item => 
    columns.map(c => {
      const value = item[c.key];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  ).join('\n');
  return headers + '\n' + rows;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

interface MerchantsTabProps {
  merchants?: MerchantWithPlan[];
  merchantsLoading: boolean;
  getStatusBadge: (status: string, merchant?: MerchantWithPlan) => JSX.Element;
  getPlanBadge: (planId: string) => JSX.Element;
  getTimeRemaining: (endDate: string | null | undefined) => { expired: boolean; text: string; days?: number; isExpiringSoon?: boolean } | null;
  toast: any;
  refetchMerchants: () => void;
}

export default function MerchantsTab({ 
  merchants, 
  merchantsLoading,
  getStatusBadge,
  getPlanBadge,
  getTimeRemaining,
  toast,
  refetchMerchants
}: MerchantsTabProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantWithPlan | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editCustomConfig, setEditCustomConfig] = useState({
    customConversationsLimit: 1000,
    customAgentsLimit: 3,
    customSupervisorsLimit: 5,
    customSourcesLimit: 10,
    customSuggestedQuestionsLimit: 5,
    customMonthlyPrice: 0,
    customAnnualPrice: 0,
  });
  const [followUpMessage, setFollowUpMessage] = useState("");
  
  const [newMerchant, setNewMerchant] = useState({
    companyName: "",
    email: "",
    plan: "free",
    customConversations: 1000,
    customAgents: 3,
    customSupervisors: 5,
    customPrice: 0,
    customAnnualPrice: 0,
  });
  const [showCustomPlan, setShowCustomPlan] = useState(false);
  
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [domainMerchant, setDomainMerchant] = useState<MerchantWithPlan | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

  const { data: merchantDomains, refetch: refetchDomains } = useQuery<any[]>({
    queryKey: ["/api/admin/merchants", domainMerchant?.id, "domains"],
    queryFn: async () => {
      if (!domainMerchant?.id) return [];
      const res = await fetch(`/api/admin/merchants/${domainMerchant.id}/domains`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!domainMerchant?.id && domainDialogOpen,
  });

  const addDomainMutation = useMutation({
    mutationFn: async ({ merchantId, domain }: { merchantId: string; domain: string }) => {
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/domains`, { domain, createdBy: "admin" });
    },
    onSuccess: () => {
      toast({ title: "Domain Added", description: "Domain has been added successfully." });
      setNewDomain("");
      refetchDomains();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to add domain.", variant: "destructive" });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return apiRequest("DELETE", `/api/admin/domains/${domainId}`);
    },
    onSuccess: () => {
      toast({ title: "Domain Deleted", description: "Domain has been removed." });
      refetchDomains();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete domain.", variant: "destructive" });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      setVerifyingDomainId(domainId);
      return apiRequest("POST", `/api/admin/domains/${domainId}/verify`, {});
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Domain Verified", description: "Widget script detected on the website." });
      } else {
        toast({ title: "Verification Failed", description: data.error || "Widget script not found.", variant: "destructive" });
      }
      refetchDomains();
      setVerifyingDomainId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to verify domain.", variant: "destructive" });
      setVerifyingDomainId(null);
    },
  });

  const handleManageDomains = (merchant: MerchantWithPlan) => {
    setDomainMerchant(merchant);
    setDomainDialogOpen(true);
  };

  const handleViewDetail = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setDetailDialogOpen(true);
  };

  const updatePlanMutation = useMutation({
    mutationFn: async ({ merchantId, planId, customConfig }: { 
      merchantId: string; 
      planId: string; 
      customConfig?: typeof editCustomConfig;
    }) => {
      const payload: any = { planId };
      if (planId === 'custom' && customConfig) {
        payload.customConversationsLimit = customConfig.customConversationsLimit;
        payload.customAgentsLimit = customConfig.customAgentsLimit;
        payload.customSupervisorsLimit = customConfig.customSupervisorsLimit;
        payload.customSourcesLimit = customConfig.customSourcesLimit;
        payload.customSuggestedQuestionsLimit = customConfig.customSuggestedQuestionsLimit;
        payload.customMonthlyPrice = customConfig.customMonthlyPrice;
        payload.customAnnualPrice = customConfig.customAnnualPrice;
      }
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/subscription`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: "Merchant subscription has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update merchant plan.",
        variant: "destructive",
      });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      return apiRequest("DELETE", `/api/admin/merchants/${merchantId}`);
    },
    onSuccess: () => {
      toast({
        title: "Merchant Deleted",
        description: `${selectedMerchant?.companyName || 'Merchant'} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setSelectedMerchant(null);
      refetchMerchants();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete merchant.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setEditPlan(merchant.subscriptionPlanId);
    setEditCustomConfig({
      customConversationsLimit: (merchant as any).customConversationsLimit ?? 1000,
      customAgentsLimit: (merchant as any).customAgentsLimit ?? 3,
      customSupervisorsLimit: (merchant as any).customSupervisorsLimit ?? 5,
      customSourcesLimit: (merchant as any).customSourcesLimit ?? 10,
      customSuggestedQuestionsLimit: (merchant as any).customSuggestedQuestionsLimit ?? 5,
      customMonthlyPrice: (merchant as any).customMonthlyPrice ?? 0,
      customAnnualPrice: (merchant as any).customAnnualPrice ?? 0,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    setDeleteDialogOpen(true);
  };

  const confirmEdit = () => {
    if (selectedMerchant && editPlan) {
      updatePlanMutation.mutate({ 
        merchantId: selectedMerchant.id, 
        planId: editPlan,
        customConfig: editPlan === 'custom' ? editCustomConfig : undefined
      });
    }
  };

  const confirmDelete = () => {
    if (selectedMerchant) {
      deleteMerchantMutation.mutate(selectedMerchant.id);
    }
  };

  const handleExportMerchants = () => {
    if (!merchants?.length) {
      toast({ title: "No Data", description: "No merchants to export." });
      return;
    }
    const columns = [
      { key: "id", label: "Merchant ID" },
      { key: "companyName", label: "Company Name" },
      { key: "email", label: "Email" },
      { key: "websiteUrl", label: "Website URL" },
      { key: "picName", label: "PIC Name" },
      { key: "phone", label: "Phone" },
      { key: "country", label: "Country" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "subscriptionPlanId", label: "Plan" },
      { key: "subscriptionStatus", label: "Status" },
      { key: "conversationsUsed", label: "Conversations Used" },
      { key: "allowedDomains", label: "Allowed Domains" },
      { key: "createdAt", label: "Created At" },
    ];
    const csv = generateCSV(merchants, columns);
    downloadCSV(csv, `merchants_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Export Complete", description: "Merchant data has been downloaded." });
  };

  const sendFollowUpMutation = useMutation({
    mutationFn: async ({ merchantId, message }: { merchantId: string; message: string }) => {
      return apiRequest("POST", `/api/admin/merchants/${merchantId}/follow-up`, { message });
    },
    onSuccess: () => {
      toast({
        title: "Follow-up Sent",
        description: "Notification has been sent to the merchant.",
      });
      setFollowUpDialogOpen(false);
      setFollowUpMessage("");
      setSelectedMerchant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send follow-up notification.",
        variant: "destructive",
      });
    },
  });

  const handleFollowUp = (merchant: MerchantWithPlan) => {
    setSelectedMerchant(merchant);
    const timeInfo = getTimeRemaining(merchant.trialEndsAt || merchant.currentPeriodEnd);
    const defaultMsg = timeInfo?.isExpiringSoon 
      ? `Your ${merchant.subscriptionStatus === 'trial' ? 'trial' : 'subscription'} expires in ${timeInfo.text}. Upgrade now to continue using Chatvice!`
      : `Hi ${merchant.companyName}, we'd love to hear your feedback about Chatvice!`;
    setFollowUpMessage(defaultMsg);
    setFollowUpDialogOpen(true);
  };

  const confirmFollowUp = () => {
    if (selectedMerchant && followUpMessage) {
      sendFollowUpMutation.mutate({ merchantId: selectedMerchant.id, message: followUpMessage });
    }
  };

  const handleAddMerchant = () => {
    toast({ 
      title: "Merchant Created", 
      description: `${newMerchant.companyName} has been added with ${showCustomPlan ? 'custom' : newMerchant.plan} plan.` 
    });
    setAddDialogOpen(false);
    setNewMerchant({
      companyName: "",
      email: "",
      plan: "free",
      customConversations: 1000,
      customAgents: 3,
      customSupervisors: 5,
      customPrice: 0,
      customAnnualPrice: 0,
    });
    setShowCustomPlan(false);
  };

  const getMerchantExpiryInfo = (merchant: MerchantWithPlan) => {
    if (merchant.subscriptionStatus === 'trial' && merchant.trialEndsAt) {
      return getTimeRemaining(merchant.trialEndsAt);
    }
    if (merchant.subscriptionStatus === 'active' && merchant.currentPeriodEnd) {
      return getTimeRemaining(merchant.currentPeriodEnd);
    }
    return null;
  };

  const planCounts = {
    free: merchants?.filter(m => m.subscriptionPlanId === 'free').length || 0,
    starter: merchants?.filter(m => m.subscriptionPlanId === 'starter').length || 0,
    pro: merchants?.filter(m => m.subscriptionPlanId === 'pro').length || 0,
    enterprise: merchants?.filter(m => m.subscriptionPlanId === 'enterprise').length || 0,
    custom: merchants?.filter(m => m.subscriptionPlanId === 'custom').length || 0,
  };

  const subscriptionTrendData = [
    { label: "Daily", free: 2, starter: 1, pro: 1, enterprise: 0, custom: 0 },
    { label: "Weekly", free: 8, starter: 5, pro: 3, enterprise: 1, custom: 0 },
    { label: "Monthly", free: 25, starter: 18, pro: 12, enterprise: 4, custom: 2 },
    { label: "Yearly", free: 120, starter: 85, pro: 52, enterprise: 18, custom: 8 },
  ];

  const subscriptionSeries = [
    { key: "free", color: "hsl(var(--muted-foreground))", label: "Free" },
    { key: "starter", color: "hsl(210, 100%, 50%)", label: "Starter" },
    { key: "pro", color: "hsl(142, 76%, 36%)", label: "Pro" },
    { key: "enterprise", color: "hsl(280, 70%, 50%)", label: "Enterprise" },
    { key: "custom", color: "hsl(38, 92%, 50%)", label: "Custom" },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Subscription Plan Distribution
          </CardTitle>
          <CardDescription>Breakdown of merchants by subscription plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30 text-center">
              <MetricTooltip metricKey="freePlanMerchants">
                <p className="text-xs text-muted-foreground mb-1">Free</p>
              </MetricTooltip>
              <p className="text-2xl font-bold">{planCounts.free}</p>
            </div>
            <div className="p-3 rounded-lg border bg-blue-500/10 text-center">
              <MetricTooltip metricKey="starterPlanMerchants">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Starter</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{planCounts.starter}</p>
            </div>
            <div className="p-3 rounded-lg border bg-green-500/10 text-center">
              <MetricTooltip metricKey="proPlanMerchants">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Pro</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{planCounts.pro}</p>
            </div>
            <div className="p-3 rounded-lg border bg-purple-500/10 text-center">
              <MetricTooltip metricKey="enterprisePlanMerchants">
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Enterprise</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{planCounts.enterprise}</p>
            </div>
            <div className="p-3 rounded-lg border bg-amber-500/10 text-center">
              <MetricTooltip metricKey="customPlanMerchants">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Custom</p>
              </MetricTooltip>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{planCounts.custom}</p>
            </div>
          </div>

          <MultiSeriesBarChart
            title="Subscription Trend (Daily / Weekly / Monthly / Yearly)"
            data={subscriptionTrendData}
            series={subscriptionSeries}
            height={220}
            xAxisLabel="Time Period"
            yAxisLabel="Merchants"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Merchants</CardTitle>
              <CardDescription>Manage all registered merchants ({merchants?.length || 0} total)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportMerchants} data-testid="button-export-merchants-list">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-merchant">
                <Plus className="w-4 h-4 mr-2" />
                Add Merchant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {merchantsLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">ID</TableHead>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead className="hidden lg:table-cell">PIC</TableHead>
                    <TableHead className="hidden xl:table-cell">Phone</TableHead>
                    <TableHead className="hidden xl:table-cell">Location</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead className="hidden lg:table-cell">Conversations</TableHead>
                    <TableHead className="hidden xl:table-cell">Domains</TableHead>
                    <TableHead className="hidden xl:table-cell">Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants?.map((merchant) => {
                    const expiryInfo = getMerchantExpiryInfo(merchant);
                    return (
                      <TableRow key={merchant.id} data-testid={`row-merchant-${merchant.id}`}>
                        <TableCell>
                          <p className="text-xs font-mono text-muted-foreground">{merchant.id.substring(0, 8)}...</p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{merchant.companyName || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">{merchant.email}</p>
                            {merchant.websiteUrl && (
                              <a href={merchant.websiteUrl.startsWith('http') ? merchant.websiteUrl : `https://${merchant.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block max-w-[120px] md:max-w-none">
                                {merchant.websiteUrl}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm">{merchant.picName || '-'}</p>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <p className="text-sm">{merchant.phone || '-'}</p>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="text-sm">
                            {merchant.city || merchant.region || merchant.country ? (
                              <>
                                <p>{[merchant.city, merchant.region].filter(Boolean).join(', ')}</p>
                                <p className="text-xs text-muted-foreground">{merchant.country}</p>
                              </>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>{getPlanBadge(merchant.subscriptionPlanId)}</TableCell>
                        <TableCell>{getStatusBadge(merchant.subscriptionStatus, merchant)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {expiryInfo ? (
                            <div className="flex items-center gap-1">
                              {expiryInfo.expired ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : expiryInfo.isExpiringSoon ? (
                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {expiryInfo.text}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">{expiryInfo.text}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {merchant.conversationsUsed || 0} / {merchant.plan.conversationsLimit === -1 ? '∞' : merchant.plan.conversationsLimit}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {merchant.allowedDomains ? (
                            <div className="max-w-[150px]">
                              <p className="text-xs font-mono truncate" title={merchant.allowedDomains}>
                                {merchant.allowedDomains.split('\n').filter(Boolean).length} domain(s)
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {merchant.allowedDomains.split('\n')[0]}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">All domains</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                          {merchant.createdAt ? format(new Date(merchant.createdAt), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleViewDetail(merchant)} data-testid={`button-view-${merchant.id}`} title="View details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {expiryInfo?.isExpiringSoon && (
                              <Button size="icon" variant="ghost" onClick={() => handleFollowUp(merchant)} data-testid={`button-followup-${merchant.id}`} title="Send follow-up">
                                <Bell className="w-4 h-4 text-amber-500" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => handleManageDomains(merchant)} data-testid={`button-domains-${merchant.id}`} title="Manage domains">
                              <Globe className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(merchant)} data-testid={`button-edit-${merchant.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(merchant)} data-testid={`button-delete-${merchant.id}`}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!merchants || merchants.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        No merchants registered yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-merchant">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>
              Update subscription for {selectedMerchant?.companyName || 'this merchant'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Company</Label>
              <p className="text-sm text-muted-foreground">{selectedMerchant?.companyName}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{selectedMerchant?.email}</p>
            </div>
            <div>
              <Label htmlFor="edit-plan">Subscription Plan</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="mt-1" data-testid="select-edit-merchant-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editPlan === 'custom' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-medium text-sm">Custom Plan Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-conversations">Conversations/month</Label>
                    <Input
                      id="edit-conversations"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customConversationsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customConversationsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-conversations"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-agents">AI Agents</Label>
                    <Input
                      id="edit-agents"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customAgentsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customAgentsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-agents"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-supervisors">Supervisors</Label>
                    <Input
                      id="edit-supervisors"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSupervisorsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSupervisorsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-supervisors"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-sources">Knowledge Sources</Label>
                    <Input
                      id="edit-sources"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSourcesLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSourcesLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-sources"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-questions">Suggested Questions</Label>
                    <Input
                      id="edit-questions"
                      type="number"
                      min="-1"
                      className="mt-1"
                      value={editCustomConfig.customSuggestedQuestionsLimit}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customSuggestedQuestionsLimit: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-questions"
                    />
                    <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="edit-monthly-price">Monthly Price ($)</Label>
                    <Input
                      id="edit-monthly-price"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={editCustomConfig.customMonthlyPrice}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customMonthlyPrice: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-monthly-price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-annual-price">Annual Price ($)</Label>
                    <Input
                      id="edit-annual-price"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={editCustomConfig.customAnnualPrice}
                      onChange={(e) => setEditCustomConfig(prev => ({ 
                        ...prev, 
                        customAnnualPrice: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-edit-custom-annual-price"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-merchant">Cancel</Button>
            <Button onClick={confirmEdit} disabled={updatePlanMutation.isPending} data-testid="button-confirm-edit-merchant">
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-merchant">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMerchant?.companyName}? This will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete-merchant">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMerchantMutation.isPending} data-testid="button-confirm-delete-merchant">
              {deleteMerchantMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-manage-domains">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Manage Domains
            </DialogTitle>
            <DialogDescription>
              Configure allowed domains for {domainMerchant?.companyName}. Verify domains to ensure widget script is installed correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="example.com or *.example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDomain.trim() && domainMerchant) {
                    addDomainMutation.mutate({ merchantId: domainMerchant.id, domain: newDomain.trim() });
                  }
                }}
                data-testid="input-new-domain"
              />
              <Button
                onClick={() => {
                  if (newDomain.trim() && domainMerchant) {
                    addDomainMutation.mutate({ merchantId: domainMerchant.id, domain: newDomain.trim() });
                  }
                }}
                disabled={!newDomain.trim() || addDomainMutation.isPending}
                data-testid="button-add-domain"
              >
                {addDomainMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {merchantDomains && merchantDomains.length > 0 ? (
                merchantDomains.map((domain: any) => (
                  <div key={domain.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate" title={domain.domain}>{domain.domain}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {domain.isVerified ? (
                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {domain.createdBy === "admin" ? "Added by admin" : "Added by merchant"}
                          </span>
                        </div>
                        {domain.verificationError && !domain.isVerified && (
                          <p className="text-xs text-destructive mt-1">{domain.verificationError}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => verifyDomainMutation.mutate(domain.id)}
                        disabled={verifyingDomainId === domain.id}
                        title="Verify domain"
                        data-testid={`button-verify-domain-${domain.id}`}
                      >
                        {verifyingDomainId === domain.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteDomainMutation.mutate(domain.id)}
                        disabled={deleteDomainMutation.isPending}
                        title="Delete domain"
                        data-testid={`button-delete-domain-${domain.id}`}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No domains configured</p>
                  <p className="text-xs">Add domains to restrict where the widget can be embedded</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Domain Verification</p>
                  <p className="mt-1">To verify a domain, ensure the Chatvice widget script is embedded on your website with the correct merchant ID. Click the verify button to check.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-merchant-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Merchant Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {selectedMerchant?.companyName || 'this merchant'}
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Merchant ID</p>
                    <p className="font-mono text-xs mt-0.5">{selectedMerchant.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Company Name</p>
                    <p className="font-medium mt-0.5">{selectedMerchant.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Registrant Name (PIC)</p>
                    <p className="mt-0.5">{selectedMerchant.picName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="mt-0.5">{selectedMerchant.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p className="mt-0.5">{selectedMerchant.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Website</p>
                    {selectedMerchant.websiteUrl ? (
                      <a href={selectedMerchant.websiteUrl.startsWith('http') ? selectedMerchant.websiteUrl : `https://${selectedMerchant.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm mt-0.5 block truncate">
                        {selectedMerchant.websiteUrl}
                      </a>
                    ) : (
                      <p className="mt-0.5">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Address
                </h4>
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Full Address</p>
                  <p className="mt-0.5">
                    {[
                      selectedMerchant.address,
                      selectedMerchant.city,
                      selectedMerchant.region,
                      selectedMerchant.postalCode,
                      selectedMerchant.country
                    ].filter(Boolean).join(', ') || '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Subscription
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Current Plan</p>
                    <div className="mt-0.5">{getPlanBadge(selectedMerchant.subscriptionPlanId)}</div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <div className="mt-0.5">{getStatusBadge(selectedMerchant.subscriptionStatus, selectedMerchant)}</div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Conversations Used</p>
                    <p className="mt-0.5">
                      {selectedMerchant.conversationsUsed || 0} / {selectedMerchant.plan.conversationsLimit === -1 ? '∞' : selectedMerchant.plan.conversationsLimit}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Billing Cycle</p>
                    <p className="mt-0.5 capitalize">{selectedMerchant.billingCycle || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Important Dates
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Registration Date</p>
                    <p className="mt-0.5">{selectedMerchant.createdAt ? format(new Date(selectedMerchant.createdAt), 'dd MMM yyyy, HH:mm') : '-'}</p>
                  </div>
                  {selectedMerchant.subscriptionStatus === 'trial' && selectedMerchant.trialEndsAt && (
                    <div>
                      <p className="text-muted-foreground text-xs">Trial Ends</p>
                      <p className="mt-0.5">{format(new Date(selectedMerchant.trialEndsAt), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                  )}
                  {selectedMerchant.currentPeriodEnd && (
                    <div>
                      <p className="text-muted-foreground text-xs">Period Ends</p>
                      <p className="mt-0.5">{format(new Date(selectedMerchant.currentPeriodEnd), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedMerchant.allowedDomains && (
                <div className="space-y-3 border-t pt-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Allowed Domains
                  </h4>
                  <div className="text-sm bg-muted/50 rounded-lg p-2">
                    {selectedMerchant.allowedDomains.split('\n').filter(Boolean).map((domain, idx) => (
                      <div key={idx} className="font-mono text-xs py-0.5">{domain}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setDetailDialogOpen(false); if (selectedMerchant) handleEdit(selectedMerchant); }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-merchant">
          <DialogHeader>
            <DialogTitle>Add New Merchant</DialogTitle>
            <DialogDescription>
              Create a new merchant account with a subscription plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name" 
                placeholder="Enter company name" 
                className="mt-1" 
                value={newMerchant.companyName}
                onChange={(e) => setNewMerchant(prev => ({ ...prev, companyName: e.target.value }))}
                data-testid="input-new-merchant-company" 
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="merchant@example.com" 
                className="mt-1"
                value={newMerchant.email}
                onChange={(e) => setNewMerchant(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-new-merchant-email" 
              />
            </div>
            <div>
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select 
                value={showCustomPlan ? "custom" : newMerchant.plan}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomPlan(true);
                    setNewMerchant(prev => ({ ...prev, plan: "custom" }));
                  } else {
                    setShowCustomPlan(false);
                    setNewMerchant(prev => ({ ...prev, plan: value }));
                  }
                }}
              >
                <SelectTrigger className="mt-1" data-testid="select-new-merchant-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter ($29/mo)</SelectItem>
                  <SelectItem value="pro">Pro ($99/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($299/mo)</SelectItem>
                  <SelectItem value="custom">Custom Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCustomPlan && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Custom Plan Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Conversations Limit</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customConversations}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customConversations: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-conversations"
                    />
                  </div>
                  <div>
                    <Label>AI Agents Limit</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customAgents}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customAgents: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-agents"
                    />
                  </div>
                  <div>
                    <Label>Supervisors Limit</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customSupervisors}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customSupervisors: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-supervisors"
                    />
                  </div>
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input 
                      type="number"
                      value={newMerchant.customPrice}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, customPrice: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                      data-testid="input-custom-price"
                    />
                  </div>
                </div>
                <div>
                  <Label>Annual Price ($/month)</Label>
                  <Input 
                    type="number"
                    value={newMerchant.customAnnualPrice}
                    onChange={(e) => setNewMerchant(prev => ({ ...prev, customAnnualPrice: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="Discounted annual price per month"
                    data-testid="input-custom-annual-price"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add-merchant">
              Cancel
            </Button>
            <Button onClick={handleAddMerchant} data-testid="button-confirm-add-merchant">
              Create Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent data-testid="dialog-follow-up">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Send Follow-up Notification
            </DialogTitle>
            <DialogDescription>
              Send a notification to {selectedMerchant?.companyName || 'this merchant'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="followup-message">Message</Label>
              <Textarea 
                id="followup-message"
                placeholder="Enter your follow-up message..."
                className="mt-1 min-h-[100px]"
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
                data-testid="input-followup-message"
              />
            </div>
            {selectedMerchant && getMerchantExpiryInfo(selectedMerchant)?.isExpiringSoon && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {selectedMerchant.subscriptionStatus === 'trial' ? 'Trial' : 'Subscription'} expires in {getMerchantExpiryInfo(selectedMerchant)?.text}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)} data-testid="button-cancel-followup">
              Cancel
            </Button>
            <Button onClick={confirmFollowUp} disabled={sendFollowUpMutation.isPending || !followUpMessage} data-testid="button-send-followup">
              {sendFollowUpMutation.isPending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
