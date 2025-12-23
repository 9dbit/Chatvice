import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Gift,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  Info,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  maxUses?: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPublic: boolean;
  showUpsell: boolean;
  bgColor?: string | null;
  textColor?: string | null;
  bannerMode?: string | null;
  bannerImageUrl?: string | null;
  createdAt: string;
}

interface PricingTabProps {
  toast: any;
}

export default function PricingTab({ toast }: PricingTabProps) {
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [trialDays, setTrialDays] = useState(14);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editAnnualPrice, setEditAnnualPrice] = useState(0);
  const [editConversationsLimit, setEditConversationsLimit] = useState(0);
  const [editAgentsLimit, setEditAgentsLimit] = useState(0);
  
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(20);
  const [promoTargetPlans, setPromoTargetPlans] = useState("all");
  const [promoBillingCycle, setPromoBillingCycle] = useState("both");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");
  const [promoIsPublic, setPromoIsPublic] = useState(false);
  const [promoShowUpsell, setPromoShowUpsell] = useState(true);
  const [promoBgColor, setPromoBgColor] = useState("#16a34a");
  const [promoTextColor, setPromoTextColor] = useState("#ffffff");
  const [promoBannerMode, setPromoBannerMode] = useState<"color" | "image" | "overlay">("color");
  const [promoBannerImageUrl, setPromoBannerImageUrl] = useState("");
  const [promoBannerImageMobileUrl, setPromoBannerImageMobileUrl] = useState("");
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [uploadingMobileBannerImage, setUploadingMobileBannerImage] = useState(false);
  
  const { data: plans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  const { data: promotions = [], isLoading: promosLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
  });
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
  });

  useEffect(() => {
    if (platformSettings && (platformSettings as any).trial_days) {
      setTrialDays(parseInt((platformSettings as any).trial_days));
    }
  }, [platformSettings]);

  const saveTrialDaysMutation = useMutation({
    mutationFn: async (days: number) => {
      return apiRequest("PUT", "/api/admin/platform-settings", {
        key: "trial_days",
        value: String(days),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: `Trial period set to ${trialDays} days. Existing trial merchants have been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save trial settings.",
        variant: "destructive",
      });
    },
  });
  
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, monthlyPrice, annualPrice, conversationsLimit, agentsLimit }: { 
      planId: string; 
      monthlyPrice: number; 
      annualPrice: number;
      conversationsLimit: number;
      agentsLimit: number;
    }) => {
      return apiRequest("PUT", `/api/admin/subscription-plans/${planId}`, {
        monthlyPrice,
        annualPrice,
        conversationsLimit,
        agentsLimit,
      });
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: "Subscription plan has been modified and synced across the platform.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setEditPlanOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subscription plan.",
        variant: "destructive",
      });
    },
  });
  
  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setEditMonthlyPrice(plan.monthlyPrice);
    setEditAnnualPrice(plan.annualPrice);
    setEditConversationsLimit(plan.conversationsLimit);
    setEditAgentsLimit(plan.agentsLimit);
    setEditPlanOpen(true);
  };
  
  const handleSavePlan = () => {
    if (selectedPlan) {
      updatePlanMutation.mutate({
        planId: selectedPlan.id,
        monthlyPrice: editMonthlyPrice,
        annualPrice: editAnnualPrice,
        conversationsLimit: editConversationsLimit,
        agentsLimit: editAgentsLimit,
      });
    }
  };

  const createPromoMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/admin/promotions", data),
    onSuccess: () => {
      toast({ title: "Promotion Created", description: "Discount code has been created and synced to pricing pages." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      setPromoDialogOpen(false);
      resetPromoForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to create promotion.", variant: "destructive" }),
  });

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/admin/promotions/${id}`, data),
    onSuccess: () => {
      toast({ title: "Promotion Updated", description: "Discount code has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      setPromoDialogOpen(false);
      setEditingPromo(null);
      resetPromoForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update promotion.", variant: "destructive" }),
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/promotions/${id}`),
    onSuccess: () => {
      toast({ title: "Promotion Deleted", description: "Discount code has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete promotion.", variant: "destructive" }),
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => 
      apiRequest("PUT", `/api/admin/promotions/${id}`, { isActive }),
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Promotion status has been changed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update promotion status.", variant: "destructive" }),
  });

  const resetPromoForm = () => {
    setPromoCode("");
    setPromoName("");
    setPromoDescription("");
    setPromoDiscountPercent(20);
    setPromoTargetPlans("all");
    setPromoBillingCycle("both");
    setPromoMaxUses("");
    setPromoStartDate("");
    setPromoEndDate("");
    setPromoIsPublic(false);
    setPromoShowUpsell(true);
    setPromoBgColor("#16a34a");
    setPromoTextColor("#ffffff");
    setPromoBannerMode("color");
    setPromoBannerImageUrl("");
    setPromoBannerImageMobileUrl("");
  };

  const openCreatePromo = () => {
    resetPromoForm();
    setEditingPromo(null);
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    setPromoStartDate(today);
    setPromoEndDate(endDate.toISOString().split('T')[0]);
    setPromoDialogOpen(true);
  };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoCode(promo.code);
    setPromoName(promo.name);
    setPromoDescription(promo.description || "");
    setPromoDiscountPercent(promo.discountPercent);
    setPromoTargetPlans(promo.targetPlans.includes("all") ? "all" : promo.targetPlans[0] || "all");
    setPromoBillingCycle(promo.billingCycle);
    setPromoMaxUses(promo.maxUses?.toString() || "");
    setPromoStartDate(new Date(promo.startDate).toISOString().split('T')[0]);
    setPromoEndDate(new Date(promo.endDate).toISOString().split('T')[0]);
    setPromoIsPublic(promo.isPublic);
    setPromoShowUpsell(promo.showUpsell);
    setPromoBgColor(promo.bgColor || "#16a34a");
    setPromoTextColor(promo.textColor || "#ffffff");
    setPromoBannerMode((promo.bannerMode as "color" | "image" | "overlay") || "color");
    setPromoBannerImageUrl(promo.bannerImageUrl || "");
    setPromoBannerImageMobileUrl((promo as any).bannerImageMobileUrl || "");
    setPromoDialogOpen(true);
  };

  const handleSavePromo = () => {
    const needsImage = promoBannerMode === "image" || promoBannerMode === "overlay";
    const effectiveBannerMode = needsImage && !promoBannerImageUrl ? "color" : promoBannerMode;
    
    const data = {
      code: promoCode.toUpperCase(),
      name: promoName,
      description: promoDescription || null,
      discountPercent: promoDiscountPercent,
      targetPlans: promoTargetPlans === "all" ? ["all"] : 
                   promoTargetPlans === "upgrade" ? ["upgrade"] : [promoTargetPlans],
      billingCycle: promoBillingCycle,
      maxUses: promoMaxUses ? parseInt(promoMaxUses) : null,
      startDate: promoStartDate,
      endDate: promoEndDate,
      isActive: true,
      isPublic: promoIsPublic,
      showUpsell: promoShowUpsell,
      bgColor: promoBgColor,
      textColor: promoTextColor,
      bannerMode: effectiveBannerMode,
      bannerImageUrl: promoBannerImageUrl || null,
      bannerImageMobileUrl: promoBannerImageMobileUrl || null,
    };
    if (editingPromo) {
      updatePromoMutation.mutate({ id: editingPromo.id, data });
    } else {
      createPromoMutation.mutate(data);
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingBannerImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-promo-banner', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      setPromoBannerImageUrl(result.url);
      toast({ title: "Success", description: "Banner image uploaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingBannerImage(false);
    }
  };

  const handleMobileBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingMobileBannerImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-promo-banner', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      setPromoBannerImageMobileUrl(result.url);
      toast({ title: "Success", description: "Mobile banner image uploaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingMobileBannerImage(false);
    }
  };

  const getPromoStatus = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);
    if (!promo.isActive) return { text: "Inactive", color: "secondary" as const };
    if (now < start) return { text: "Scheduled", color: "outline" as const };
    if (now > end) return { text: "Expired", color: "destructive" as const };
    return { text: "Active", color: "default" as const };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Free Plan Trial Settings
          </CardTitle>
          <CardDescription>Configure trial period for AI agent on Free plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="trial-days">AI Agent Trial Period (days)</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Number of days the AI agent will be active for free plan merchants before requiring upgrade
              </p>
              <Input 
                id="trial-days"
                type="number" 
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                min={1}
                max={90}
                className="max-w-[200px]"
                data-testid="input-trial-days"
              />
            </div>
            <Button onClick={() => saveTrialDaysMutation.mutate(trialDays)} disabled={saveTrialDaysMutation.isPending} data-testid="button-save-trial">
              {saveTrialDaysMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saveTrialDaysMutation.isPending ? "Saving..." : "Save Trial Settings"}
            </Button>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Free plan merchants will have full AI agent access for <strong>{trialDays} days</strong> before the trial expires.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Configure pricing and features for each plan</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button data-testid="button-add-plan">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-add-plan">
                <DialogHeader>
                  <DialogTitle>Add New Plan</DialogTitle>
                  <DialogDescription>Create a custom subscription plan</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Plan Name</Label>
                    <Input placeholder="e.g., Business" className="mt-1" data-testid="input-new-plan-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monthly Price ($)</Label>
                      <Input type="number" placeholder="49" className="mt-1" data-testid="input-new-plan-monthly" />
                    </div>
                    <div>
                      <Label>Annual Price ($)</Label>
                      <Input type="number" placeholder="39" className="mt-1" data-testid="input-new-plan-annual" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Conversations Limit</Label>
                      <Input type="number" placeholder="5000" className="mt-1" data-testid="input-new-plan-conversations" />
                    </div>
                    <div>
                      <Label>Agents Limit</Label>
                      <Input type="number" placeholder="5" className="mt-1" data-testid="input-new-plan-agents" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" data-testid="button-cancel-add-plan">Cancel</Button>
                  </DialogClose>
                  <Button onClick={() => toast({ title: "Plan Created", description: "New subscription plan has been added." })} data-testid="button-confirm-add-plan">
                    Create Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead className="hidden md:table-cell">Annual</TableHead>
                  <TableHead>Conversations</TableHead>
                  <TableHead className="hidden sm:table-cell">Agents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${plan.monthlyPrice}/mo</TableCell>
                    <TableCell className="hidden md:table-cell">${plan.annualPrice}/mo</TableCell>
                    <TableCell>{plan.conversationsLimit === -1 ? 'Unlimited' : plan.conversationsLimit.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">{plan.agentsLimit === -1 ? 'Unlimited' : plan.agentsLimit}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleEditPlan(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Promotional Discounts
            </CardTitle>
            <CardDescription>Active discount codes and promotions - synced with landing page and merchant dashboard</CardDescription>
          </div>
          <Button onClick={openCreatePromo} data-testid="button-create-discount">
            <Plus className="w-4 h-4 mr-2" />
            Create Discount
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm mb-4">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Discounts created here will automatically apply to the landing page pricing and merchant upgrade flows.
            </p>
          </div>
          
          {promosLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : promotions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No promotions yet. Create your first discount code.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="hidden sm:table-cell">Target</TableHead>
                    <TableHead className="hidden md:table-cell">Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promo) => {
                    const status = getPromoStatus(promo);
                    return (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                        <TableCell className="text-green-600 font-semibold">{promo.discountPercent}%</TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">
                          {promo.targetPlans.includes("all") ? "All Plans" : promo.targetPlans.join(", ")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                        </TableCell>
                        <TableCell>
                          {promo.usedCount}{promo.maxUses ? `/${promo.maxUses}` : ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color}>{status.text}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditPromo(promo)} data-testid={`button-edit-promo-${promo.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => togglePromoMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                              data-testid={`button-toggle-promo-${promo.id}`}
                            >
                              {promo.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-promo-${promo.id}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the "{promo.code}" discount code. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePromoMutation.mutate(promo.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={promoDialogOpen} onOpenChange={(open) => { setPromoDialogOpen(open); if (!open) { setEditingPromo(null); resetPromoForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-discount">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit Discount Code" : "Create Discount Code"}</DialogTitle>
            <DialogDescription>Configure promotional discount with target plan, billing cycle, and validity period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Code</Label>
                <Input 
                  placeholder="e.g., SAVE20" 
                  value={promoCode} 
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                  className="mt-1 uppercase" 
                  data-testid="input-discount-code" 
                />
              </div>
              <div>
                <Label>Promotion Name</Label>
                <Input 
                  placeholder="e.g., New Year Sale" 
                  value={promoName} 
                  onChange={(e) => setPromoName(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-name" 
                />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input 
                placeholder="e.g., Special discount for early adopters" 
                value={promoDescription} 
                onChange={(e) => setPromoDescription(e.target.value)} 
                className="mt-1" 
                data-testid="input-discount-description" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Plan</Label>
                <Select value={promoTargetPlans} onValueChange={setPromoTargetPlans}>
                  <SelectTrigger className="mt-1" data-testid="select-discount-target-plan">
                    <SelectValue placeholder="Select target plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="starter">Starter Only</SelectItem>
                    <SelectItem value="pro">Pro Only</SelectItem>
                    <SelectItem value="enterprise">Enterprise Only</SelectItem>
                    <SelectItem value="upgrade">Upgrade Only (Starter & Pro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <Select value={promoBillingCycle} onValueChange={setPromoBillingCycle}>
                  <SelectTrigger className="mt-1" data-testid="select-discount-billing">
                    <SelectValue placeholder="Select billing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Monthly & Annual</SelectItem>
                    <SelectItem value="monthly">Monthly Only</SelectItem>
                    <SelectItem value="annual">Annual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (%)</Label>
                <Input 
                  type="number" 
                  placeholder="20" 
                  value={promoDiscountPercent} 
                  onChange={(e) => setPromoDiscountPercent(parseInt(e.target.value) || 0)} 
                  min={1} 
                  max={100} 
                  className="mt-1" 
                  data-testid="input-discount-percent" 
                />
              </div>
              <div>
                <Label>Max Uses (optional)</Label>
                <Input 
                  type="number" 
                  placeholder="Unlimited" 
                  value={promoMaxUses} 
                  onChange={(e) => setPromoMaxUses(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-max-uses" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={promoStartDate} 
                  onChange={(e) => setPromoStartDate(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-start" 
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={promoEndDate} 
                  onChange={(e) => setPromoEndDate(e.target.value)} 
                  className="mt-1" 
                  data-testid="input-discount-expiry" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="promo-public" 
                  checked={promoIsPublic} 
                  onCheckedChange={setPromoIsPublic}
                  data-testid="switch-promo-public"
                />
                <Label htmlFor="promo-public" className="text-sm">Show publicly on pricing page</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="promo-upsell" 
                  checked={promoShowUpsell} 
                  onCheckedChange={setPromoShowUpsell}
                  data-testid="switch-promo-upsell"
                />
                <Label htmlFor="promo-upsell" className="text-sm">Show upsell info</Label>
              </div>
            </div>
            {promoIsPublic && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">Banner Display Mode</Label>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="banner-color" 
                      name="bannerMode" 
                      checked={promoBannerMode === "color"} 
                      onChange={() => setPromoBannerMode("color")}
                      data-testid="radio-banner-color"
                    />
                    <Label htmlFor="banner-color" className="text-sm cursor-pointer">Color + Text</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="banner-image" 
                      name="bannerMode" 
                      checked={promoBannerMode === "image"} 
                      onChange={() => setPromoBannerMode("image")}
                      data-testid="radio-banner-image"
                    />
                    <Label htmlFor="banner-image" className="text-sm cursor-pointer">Image Only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="banner-overlay" 
                      name="bannerMode" 
                      checked={promoBannerMode === "overlay"} 
                      onChange={() => setPromoBannerMode("overlay")}
                      data-testid="radio-banner-overlay"
                    />
                    <Label htmlFor="banner-overlay" className="text-sm cursor-pointer">Image + Text Overlay</Label>
                  </div>
                </div>

                {promoBannerMode === "color" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Background Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="color" 
                            value={promoBgColor} 
                            onChange={(e) => setPromoBgColor(e.target.value)}
                            className="w-10 h-9 rounded border cursor-pointer"
                            data-testid="input-promo-bgcolor"
                          />
                          <Input 
                            value={promoBgColor} 
                            onChange={(e) => setPromoBgColor(e.target.value)}
                            placeholder="#16a34a"
                            className="flex-1"
                            data-testid="input-promo-bgcolor-text"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Text Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="color" 
                            value={promoTextColor} 
                            onChange={(e) => setPromoTextColor(e.target.value)}
                            className="w-10 h-9 rounded border cursor-pointer"
                            data-testid="input-promo-textcolor"
                          />
                          <Input 
                            value={promoTextColor} 
                            onChange={(e) => setPromoTextColor(e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-promo-textcolor-text"
                          />
                        </div>
                      </div>
                    </div>
                    <div 
                      className="p-4 rounded-md flex flex-col items-center justify-end text-sm font-medium" 
                      style={{ backgroundColor: promoBgColor, color: promoTextColor, aspectRatio: "4/1" }}
                      data-testid="promo-color-preview"
                    >
                      <div className="text-center">
                        <div className="font-bold">{promoName || "Promotion Name"}</div>
                        <div>Save {promoDiscountPercent}% with code {promoCode || "CODE"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {(promoBannerMode === "image" || promoBannerMode === "overlay") && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
                      <div className="font-medium">Recommended Image Sizes:</div>
                      <div>Desktop: 1200x300px (4:1 ratio)</div>
                      <div>Mobile: 426x182px - Optional, will use desktop image if not provided</div>
                      <div>Formats: JPG, PNG, GIF, WebP (max 5MB)</div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Desktop Banner (1200x300px)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerImageUpload}
                          disabled={uploadingBannerImage}
                          className="flex-1"
                          data-testid="input-promo-banner-upload"
                        />
                        {uploadingBannerImage && <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                    {promoBannerImageUrl && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Desktop Preview:</Label>
                        <div className="relative rounded-md overflow-hidden" style={{ aspectRatio: "4/1" }}>
                          <img 
                            src={promoBannerImageUrl} 
                            alt="Desktop banner preview" 
                            className="w-full h-full object-cover"
                            data-testid="promo-banner-preview"
                          />
                          {promoBannerMode === "overlay" && (
                            <div 
                              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col items-start justify-end p-4"
                              style={{ color: promoTextColor }}
                            >
                              <h3 className="font-extrabold text-lg sm:text-xl drop-shadow-lg">{promoName || "Promotion Name"}</h3>
                              <p className="text-sm opacity-95 max-w-xs break-words">Save {promoDiscountPercent}% with code <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">{promoCode || "CODE"}</code></p>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPromoBannerImageUrl("")}
                          data-testid="button-remove-banner"
                        >
                          <X className="w-3 h-3 mr-1" /> Remove Desktop Image
                        </Button>
                      </div>
                    )}
                    {!promoBannerImageUrl && (
                      <div 
                        className="border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground text-sm" 
                        style={{ aspectRatio: "4/1" }}
                      >
                        Upload desktop image to preview
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Mobile Banner (426x182px) - Optional</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleMobileBannerImageUpload}
                          disabled={uploadingMobileBannerImage}
                          className="flex-1"
                          data-testid="input-promo-mobile-banner-upload"
                        />
                        {uploadingMobileBannerImage && <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                    {promoBannerImageMobileUrl && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Mobile Preview:</Label>
                        <div className="relative rounded-md overflow-hidden max-w-[300px]" style={{ aspectRatio: "3/1" }}>
                          <img 
                            src={promoBannerImageMobileUrl} 
                            alt="Mobile banner preview" 
                            className="w-full h-full object-cover"
                            data-testid="promo-mobile-banner-preview"
                          />
                          {promoBannerMode === "overlay" && (
                            <div 
                              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col items-start justify-end p-2"
                              style={{ color: promoTextColor }}
                            >
                              <h4 className="font-extrabold text-xs drop-shadow">{promoName || "Promo"}</h4>
                              <p className="text-[10px] opacity-95 break-words">Save {promoDiscountPercent}%</p>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPromoBannerImageMobileUrl("")}
                          data-testid="button-remove-mobile-banner"
                        >
                          <X className="w-3 h-3 mr-1" /> Remove Mobile Image
                        </Button>
                      </div>
                    )}
                    
                    {promoBannerMode === "overlay" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Text Color (overlay)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              type="color" 
                              value={promoTextColor} 
                              onChange={(e) => setPromoTextColor(e.target.value)}
                              className="w-10 h-9 rounded border cursor-pointer"
                            />
                            <Input 
                              value={promoTextColor} 
                              onChange={(e) => setPromoTextColor(e.target.value)}
                              placeholder="#ffffff"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)} data-testid="button-cancel-discount">Cancel</Button>
            <Button 
              onClick={handleSavePromo} 
              disabled={!promoCode || !promoName || !promoStartDate || !promoEndDate || createPromoMutation.isPending || updatePromoMutation.isPending}
              data-testid="button-confirm-discount"
            >
              {(createPromoMutation.isPending || updatePromoMutation.isPending) && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {editingPromo ? "Update Code" : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent data-testid="dialog-edit-plan">
          <DialogHeader>
            <DialogTitle>Edit Plan: {selectedPlan?.name}</DialogTitle>
            <DialogDescription>Modify subscription plan details. Changes will sync to landing page, dashboard, and payment system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Plan Name</Label>
              <Input value={selectedPlan?.name || ""} disabled className="mt-1 bg-muted" data-testid="input-edit-plan-name" />
              <p className="text-xs text-muted-foreground mt-1">Plan names cannot be changed</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Price ($)</Label>
                <Input 
                  type="number" 
                  value={editMonthlyPrice} 
                  onChange={(e) => setEditMonthlyPrice(parseInt(e.target.value) || 0)}
                  className="mt-1" 
                  data-testid="input-edit-plan-monthly" 
                />
              </div>
              <div>
                <Label>Annual Price ($)</Label>
                <Input 
                  type="number" 
                  value={editAnnualPrice} 
                  onChange={(e) => setEditAnnualPrice(parseInt(e.target.value) || 0)}
                  className="mt-1" 
                  data-testid="input-edit-plan-annual" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Conversations Limit</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editConversationsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditConversationsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-conversations" 
                />
                <p className="text-xs text-muted-foreground mt-1">Use -1 for unlimited</p>
              </div>
              <div>
                <Label>Agents Limit</Label>
                <Input 
                  type="number" 
                  min="-1"
                  value={editAgentsLimit} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    setEditAgentsLimit(parseInt(val));
                  }}
                  className="mt-1" 
                  data-testid="input-edit-plan-agents" 
                />
                <p className="text-xs text-muted-foreground mt-1">Use -1 for unlimited</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanOpen(false)} data-testid="button-cancel-edit-plan">Cancel</Button>
            <Button onClick={handleSavePlan} disabled={updatePlanMutation.isPending} data-testid="button-confirm-edit-plan">
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
