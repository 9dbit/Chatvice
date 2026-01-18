import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, ExternalLink, Image, Link2, Loader2, Package, Settings, Bot, Users, ChevronDown, Sparkles, Zap, Globe, RefreshCw, Check, X, ShoppingCart, Eye, Database, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ProductCard, ProductCardButton, Agent, ProductRecommendationSetting, ProductCrawlSource, CrawledProduct } from "@shared/schema";

type ProductCardFormData = {
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  price: string;
  agentId?: string;
};

type RecommendationSettings = {
  aiAutoRecommendEnabled: boolean;
  triggerKeywords: string;
  aiContextTriggerEnabled: boolean;
  supervisorCanRecommend: boolean;
  maxProductsPerRecommendation: number;
  showPriceInRecommendation: boolean;
  ctaButtonEnabled: boolean;
  ctaButtonText: string;
  ctaButtonColor: string;
};

export default function ProductCardsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ProductCard | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCrawlerOpen, setIsCrawlerOpen] = useState(true);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [crawlerUrl, setCrawlerUrl] = useState("");
  const [crawlerName, setCrawlerName] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showPendingProducts, setShowPendingProducts] = useState(false);
  const [form, setForm] = useState<ProductCardFormData>({
    title: "",
    description: "",
    imageUrl: "",
    sourceUrl: "",
    price: "",
  });
  const [recommendSettings, setRecommendSettings] = useState<RecommendationSettings>({
    aiAutoRecommendEnabled: true,
    triggerKeywords: "product,recommend,buy,shop,item,catalog",
    aiContextTriggerEnabled: true,
    supervisorCanRecommend: true,
    maxProductsPerRecommendation: 3,
    showPriceInRecommendation: true,
    ctaButtonEnabled: true,
    ctaButtonText: "View",
    ctaButtonColor: "#6b5dfc",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: cards = [], isLoading } = useQuery<ProductCard[]>({
    queryKey: ["/api/product-cards"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: settingsData } = useQuery<RecommendationSettings>({
    queryKey: ["/api/product-recommendation-settings"],
  });

  const { data: crawlSources = [] } = useQuery<ProductCrawlSource[]>({
    queryKey: ["/api/product-crawl-sources"],
  });

  const { data: crawledProducts = [] } = useQuery<CrawledProduct[]>({
    queryKey: ["/api/crawled-products"],
  });

  useEffect(() => {
    if (settingsData) {
      setRecommendSettings(settingsData);
    }
  }, [settingsData]);

  // Crawler mutations
  const addSourceMutation = useMutation({
    mutationFn: async (data: { url: string; name: string }) => {
      return apiRequest("POST", "/api/product-crawl-sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-crawl-sources"] });
      setIsAddSourceOpen(false);
      setCrawlerUrl("");
      setCrawlerName("");
      toast({ title: "Product source added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add source", variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/product-crawl-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-crawl-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crawled-products"] });
      toast({ title: "Source deleted successfully" });
    },
  });

  const crawlSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/product-crawl-sources/${id}/crawl`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-crawl-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crawled-products"] });
      setShowPendingProducts(true);
      toast({ title: `Found ${data.productsFound} products. Please review and approve.` });
    },
    onError: () => {
      toast({ title: "Failed to crawl URL", variant: "destructive" });
    },
  });

  const approveProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/crawled-products/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawled-products"] });
      toast({ title: "Product approved" });
    },
  });

  const rejectProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/crawled-products/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawled-products"] });
      toast({ title: "Product rejected" });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/crawled-products/approve-all");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawled-products"] });
      toast({ title: `Approved ${data.approvedCount} products` });
    },
  });

  const syncToKnowledgeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/product-crawl-sources/sync-to-knowledge");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: "Failed to sync products to AI", variant: "destructive" });
    },
  });

  const pendingProducts = crawledProducts.filter(p => p.status === "pending");
  const approvedProducts = crawledProducts.filter(p => p.status === "approved");

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<RecommendationSettings>) => {
      return apiRequest("PUT", "/api/product-recommendation-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-recommendation-settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductCardFormData) => {
      return apiRequest("POST", "/api/product-cards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-cards"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Product card created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product card", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductCard> }) => {
      return apiRequest("PATCH", `/api/product-cards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-cards"] });
      setIsDialogOpen(false);
      setEditingCard(null);
      resetForm();
      toast({ title: "Product card updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/product-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-cards"] });
      toast({ title: "Product card deleted successfully" });
    },
  });

  async function handleCrawlUrl() {
    if (!form.sourceUrl) {
      toast({ title: "Please enter URL first", variant: "destructive" });
      return;
    }

    setIsCrawling(true);
    try {
      const res = await apiRequest("POST", "/api/product-cards/crawl-image", { url: form.sourceUrl });
      const data = await res.json();
      
      const newForm = {
        ...form,
        title: data.title || form.title,
        description: data.description || form.description,
        imageUrl: data.imageUrl || form.imageUrl,
        price: data.price || form.price,
      };
      
      setForm(newForm);
      
      if (data.found) {
        const foundItems = [];
        if (data.title) foundItems.push("title");
        if (data.description) foundItems.push("description");
        if (data.imageUrl) foundItems.push("image");
        if (data.price) foundItems.push("price");
        toast({ title: `Data fetched successfully: ${foundItems.join(", ")}` });
      } else if (data.error === "spa_website") {
        toast({ 
          title: "Website SPA Detected", 
          description: data.message || "Website uses JavaScript. Please fill in the data manually.",
          variant: "destructive" 
        });
      } else if (data.message) {
        toast({ title: data.message, variant: "destructive" });
      } else {
        toast({ title: "URL fetched but no product data found. Please fill in manually.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to fetch data from URL", variant: "destructive" });
    } finally {
      setIsCrawling(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Please select a PNG, GIF, JPG, or WebP image", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product_card');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setForm({ ...form, imageUrl: data.url });
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      clearInterval(progressInterval);
      toast({ title: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  }

  function resetForm() {
    setForm({ title: "", description: "", imageUrl: "", sourceUrl: "", price: "" });
  }

  function handleEdit(card: ProductCard) {
    setEditingCard(card);
    setForm({
      title: card.title,
      description: card.description || "",
      imageUrl: card.imageUrl || "",
      sourceUrl: card.sourceUrl || "",
      price: card.price || "",
      agentId: card.agentId || undefined,
    });
    setIsDialogOpen(true);
  }

  function handleSubmit() {
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Package className="w-6 h-6" />
            Product Cards
          </h1>
          <p className="text-muted-foreground">Create product cards that can be displayed in the chat widget</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCard(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-card">
              <Plus className="w-4 h-4 mr-2" />
              Add Product Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCard ? "Edit Product Card" : "Create New Product Card"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL (for auto-fill)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sourceUrl"
                      value={form.sourceUrl}
                      onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                      placeholder="https://example.com/product"
                      data-testid="input-source-url"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCrawlUrl}
                      disabled={isCrawling}
                      data-testid="button-crawl-url"
                    >
                      {isCrawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Product Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Product Name"
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="$99.00"
                    data-testid="input-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief product description..."
                    rows={3}
                    data-testid="input-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/gif,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        className="flex-1"
                        disabled={isUploading}
                        data-testid="input-image-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isUploading}
                        onClick={() => (document.querySelector('[data-testid="input-image-file"]') as HTMLInputElement)?.click()}
                        data-testid="button-upload-image"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    {isUploading && (
                      <div className="space-y-1">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>or enter URL:</span>
                    </div>
                    <Input
                      id="imageUrl"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-image-url"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label>Preview (Square Format)</Label>
                <div className="rounded-lg border bg-card overflow-hidden max-w-[200px]">
                  {form.imageUrl ? (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <img 
                        src={form.imageUrl} 
                        alt={form.title || "Preview"} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://via.placeholder.com/200x200?text=Invalid+Image";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <Image className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{form.title || "Product Name"}</h3>
                    {form.price && (
                      <p className="text-primary font-bold mt-1">{form.price}</p>
                    )}
                    {form.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{form.description}</p>
                    )}
                    {form.sourceUrl && (
                      <Button size="sm" className="mt-3 w-full" variant="outline">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!form.title || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-card"
              >
                {editingCard ? "Save Changes" : "Create Product Card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product Catalog Crawler Section */}
      <Card>
        <Collapsible open={isCrawlerOpen} onOpenChange={setIsCrawlerOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Product Catalog Crawler</CardTitle>
                    <CardDescription>Scan product pages to power AI recommendations and comparisons</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {approvedProducts.length > 0 && (
                    <Badge variant="secondary">{approvedProducts.length} synced</Badge>
                  )}
                  {pendingProducts.length > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {pendingProducts.length} pending
                    </Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isCrawlerOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Info Box */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  How it works
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Add your product page or catalog URL</li>
                  <li>AI scans and extracts product information</li>
                  <li>Review and approve products</li>
                  <li>Sync to AI knowledge base for smart recommendations</li>
                </ol>
              </div>

              {/* Add Source Section */}
              <div className="flex gap-2">
                <Dialog open={isAddSourceOpen} onOpenChange={setIsAddSourceOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-source">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product URL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Product Source</DialogTitle>
                      <DialogDescription>
                        Enter a product page or catalog URL to scan for products
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="crawlerUrl">Product URL</Label>
                        <Input
                          id="crawlerUrl"
                          value={crawlerUrl}
                          onChange={(e) => setCrawlerUrl(e.target.value)}
                          placeholder="https://example.com/products"
                          data-testid="input-crawler-url"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crawlerName">Source Name (optional)</Label>
                        <Input
                          id="crawlerName"
                          value={crawlerName}
                          onChange={(e) => setCrawlerName(e.target.value)}
                          placeholder="My Product Catalog"
                          data-testid="input-crawler-name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddSourceOpen(false)}>Cancel</Button>
                      <Button
                        onClick={() => addSourceMutation.mutate({ url: crawlerUrl, name: crawlerName })}
                        disabled={!crawlerUrl || addSourceMutation.isPending}
                        data-testid="button-save-source"
                      >
                        {addSourceMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Add Source
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {approvedProducts.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => syncToKnowledgeMutation.mutate()}
                    disabled={syncToKnowledgeMutation.isPending}
                    data-testid="button-sync-ai"
                  >
                    {syncToKnowledgeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Sync to AI
                  </Button>
                )}
              </div>

              {/* Sources List */}
              {crawlSources.length > 0 && (
                <div className="space-y-3">
                  <Label>Product Sources</Label>
                  {crawlSources.map((source) => {
                    let displayName = source.name;
                    if (!displayName) {
                      try {
                        displayName = new URL(source.url).hostname;
                      } catch {
                        displayName = source.url.slice(0, 30);
                      }
                    }
                    return (
                    <div key={source.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`source-${source.id}`}>
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{displayName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{source.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {source.totalProducts ? (
                          <Badge variant="secondary">{source.totalProducts} products</Badge>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSourceId(source.id);
                            crawlSourceMutation.mutate(source.id);
                          }}
                          disabled={crawlSourceMutation.isPending && selectedSourceId === source.id}
                          data-testid={`button-crawl-${source.id}`}
                        >
                          {crawlSourceMutation.isPending && selectedSourceId === source.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteSourceMutation.mutate(source.id)}
                          data-testid={`button-delete-source-${source.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Pending Products Review */}
              {pendingProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Products Pending Review ({pendingProducts.length})
                    </Label>
                    <Button
                      size="sm"
                      onClick={() => approveAllMutation.mutate()}
                      disabled={approveAllMutation.isPending}
                      data-testid="button-approve-all"
                    >
                      {approveAllMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Approve All
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {pendingProducts.map((product) => (
                        <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border" data-testid={`pending-product-${product.id}`}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.title} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.title}</p>
                            <div className="flex items-center gap-2">
                              {product.price && <span className="text-xs text-primary font-medium">{product.price}</span>}
                              {product.category && <span className="text-xs text-muted-foreground">{product.category}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600"
                              onClick={() => approveProductMutation.mutate(product.id)}
                              disabled={approveProductMutation.isPending}
                              data-testid={`button-approve-${product.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => rejectProductMutation.mutate(product.id)}
                              disabled={rejectProductMutation.isPending}
                              data-testid={`button-reject-${product.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Approved Products */}
              {approvedProducts.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Approved Products ({approvedProducts.length})
                  </Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {approvedProducts.slice(0, 6).map((product) => (
                      <div key={product.id} className="flex items-center gap-3 p-2 bg-green-500/5 rounded-lg border border-green-500/10" data-testid={`approved-product-${product.id}`}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.title}</p>
                          {product.price && <span className="text-xs text-primary">{product.price}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {approvedProducts.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{approvedProducts.length - 6} more products
                    </p>
                  )}
                </div>
              )}

              {/* Empty State */}
              {crawlSources.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No product sources yet</p>
                  <p className="text-sm">Add a product URL to start scanning your catalog</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card>
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-base">Recommendation Triggers</CardTitle>
                    <CardDescription>Configure when products are recommended to customers</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <Tabs defaultValue="ai">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ai" className="gap-2">
                    <Bot className="w-4 h-4" />
                    AI Automatic
                  </TabsTrigger>
                  <TabsTrigger value="supervisor" className="gap-2">
                    <Users className="w-4 h-4" />
                    Supervisor Manual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI Auto-Recommend
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically show products when trigger words are detected
                      </p>
                    </div>
                    <Switch
                      checked={recommendSettings.aiAutoRecommendEnabled}
                      onCheckedChange={(checked) => setRecommendSettings({ ...recommendSettings, aiAutoRecommendEnabled: checked })}
                      data-testid="switch-ai-auto-recommend"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="triggerKeywords">Trigger Keywords</Label>
                    <Input
                      id="triggerKeywords"
                      value={recommendSettings.triggerKeywords}
                      onChange={(e) => setRecommendSettings({ ...recommendSettings, triggerKeywords: e.target.value })}
                      placeholder="product, recommend, buy, shop"
                      data-testid="input-trigger-keywords"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate keywords with commas. Products will be shown when any keyword is detected.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Context-Aware Recommendations
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        AI analyzes conversation context to recommend relevant products
                      </p>
                    </div>
                    <Switch
                      checked={recommendSettings.aiContextTriggerEnabled}
                      onCheckedChange={(checked) => setRecommendSettings({ ...recommendSettings, aiContextTriggerEnabled: checked })}
                      data-testid="switch-ai-context"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Products per Recommendation: {recommendSettings.maxProductsPerRecommendation}</Label>
                    <Slider
                      value={[recommendSettings.maxProductsPerRecommendation]}
                      onValueChange={(value) => setRecommendSettings({ ...recommendSettings, maxProductsPerRecommendation: value[0] })}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                      data-testid="slider-max-products"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of products shown in the carousel at once
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="supervisor" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        Supervisor Can Recommend
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow supervisors to manually send product recommendations
                      </p>
                    </div>
                    <Switch
                      checked={recommendSettings.supervisorCanRecommend}
                      onCheckedChange={(checked) => setRecommendSettings({ ...recommendSettings, supervisorCanRecommend: checked })}
                      data-testid="switch-supervisor-recommend"
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">How Supervisors Recommend Products</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Open a chat session in the Supervisor Panel</li>
                      <li>Click the product icon in the message input area</li>
                      <li>Select one or more products to recommend</li>
                      <li>Products will be sent as a carousel to the customer</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Price in Recommendations</Label>
                      <p className="text-sm text-muted-foreground">
                        Display product prices when recommending to customers
                      </p>
                    </div>
                    <Switch
                      checked={recommendSettings.showPriceInRecommendation}
                      onCheckedChange={(checked) => setRecommendSettings({ ...recommendSettings, showPriceInRecommendation: checked })}
                      data-testid="switch-show-price"
                    />
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-purple-500" />
                          CTA Button
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show button below product card text
                        </p>
                      </div>
                      <Switch
                        checked={recommendSettings.ctaButtonEnabled}
                        onCheckedChange={(checked) => setRecommendSettings({ ...recommendSettings, ctaButtonEnabled: checked })}
                        data-testid="switch-cta-button"
                      />
                    </div>

                    {recommendSettings.ctaButtonEnabled && (
                      <div className="space-y-3 pl-6">
                        <div className="space-y-2">
                          <Label>Button Text</Label>
                          <Input
                            value={recommendSettings.ctaButtonText}
                            onChange={(e) => setRecommendSettings({ ...recommendSettings, ctaButtonText: e.target.value })}
                            placeholder="View"
                            maxLength={20}
                            data-testid="input-cta-text"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Button Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={recommendSettings.ctaButtonColor}
                              onChange={(e) => setRecommendSettings({ ...recommendSettings, ctaButtonColor: e.target.value })}
                              className="w-10 h-10 rounded border cursor-pointer"
                              data-testid="input-cta-color"
                            />
                            <Input
                              value={recommendSettings.ctaButtonColor}
                              onChange={(e) => setRecommendSettings({ ...recommendSettings, ctaButtonColor: e.target.value })}
                              placeholder="#6b5dfc"
                              className="flex-1"
                              data-testid="input-cta-color-text"
                            />
                          </div>
                          <div 
                            className="mt-2 py-1.5 px-4 rounded text-center text-sm text-white font-medium"
                            style={{ backgroundColor: recommendSettings.ctaButtonColor }}
                          >
                            {recommendSettings.ctaButtonText || "View"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={() => updateSettingsMutation.mutate(recommendSettings)}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No product cards yet</h3>
            <p className="text-muted-foreground mb-4">Create your first product card to display products in chat</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-card">
              <Plus className="w-4 h-4 mr-2" />
              Create First Product Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.id} className="overflow-hidden" data-testid={`card-product-${card.id}`}>
              {card.imageUrl ? (
                <img 
                  src={card.imageUrl} 
                  alt={card.title} 
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-muted flex items-center justify-center">
                  <Image className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-1">{card.title}</h3>
                {card.price && (
                  <p className="text-primary font-bold text-sm mt-1">{card.price}</p>
                )}
                {card.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{card.description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEdit(card)}
                    className="flex-1"
                    data-testid={`button-edit-card-${card.id}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(card.id)}
                    data-testid={`button-delete-card-${card.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
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
