import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, ExternalLink, Image, Link2, Loader2, Package } from "lucide-react";
import type { ProductCard, ProductCardButton, Agent } from "@shared/schema";

type ProductCardFormData = {
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  price: string;
  agentId?: string;
};

export default function ProductCardsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ProductCard | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [form, setForm] = useState<ProductCardFormData>({
    title: "",
    description: "",
    imageUrl: "",
    sourceUrl: "",
    price: "",
  });

  const { data: cards = [], isLoading } = useQuery<ProductCard[]>({
    queryKey: ["/api/product-cards"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
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
      
      setForm({
        ...form,
        title: data.title || form.title,
        description: data.description || form.description,
        imageUrl: data.imageUrl || form.imageUrl,
      });
      
      toast({ title: "Data fetched from URL successfully" });
    } catch {
      toast({ title: "Failed to fetch data from URL", variant: "destructive" });
    } finally {
      setIsCrawling(false);
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
          <DialogContent className="max-w-2xl">
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
                  <Label htmlFor="imageUrl">URL Gambar</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    data-testid="input-image-url"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Label>Preview</Label>
                <div className="rounded-lg border bg-card overflow-hidden">
                  {form.imageUrl ? (
                    <img 
                      src={form.imageUrl} 
                      alt={form.title || "Preview"} 
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x200?text=Invalid+Image+URL";
                      }}
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center">
                      <Image className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{form.title || "Nama Produk"}</h3>
                    {form.price && (
                      <p className="text-primary font-bold mt-1">{form.price}</p>
                    )}
                    {form.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{form.description}</p>
                    )}
                    {form.sourceUrl && (
                      <Button size="sm" className="mt-3 w-full" variant="outline">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Lihat Detail
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
