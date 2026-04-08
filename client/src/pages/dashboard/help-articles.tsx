import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Sparkles, Edit2, Trash2, Eye, Save, Loader2, Search, Filter, ChevronDown, FileText, Globe, Clock, Tag, RefreshCw, Check, X, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KnowledgebaseArticle, KnowledgebaseTemplate, Merchant } from "@shared/schema";

const BUSINESS_TYPES = [
  { value: "retail_physical", label: "Retail - Physical Products" },
  { value: "retail_digital", label: "Retail - Digital Products" },
  { value: "company_profile", label: "Company/Service Profile" },
];

const RETAIL_PHYSICAL_CATEGORIES = [
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics & Gadgets" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "home_furniture", label: "Home & Furniture" },
  { value: "sports_outdoor", label: "Sports & Outdoor" },
  { value: "toys_games", label: "Toys & Games" },
  { value: "jewelry_watches", label: "Jewelry & Watches" },
  { value: "automotive", label: "Automotive & Parts" },
  { value: "pet_supplies", label: "Pet Supplies" },
];

const RETAIL_DIGITAL_CATEGORIES = [
  { value: "software", label: "Software & SaaS" },
  { value: "ebooks_courses", label: "E-books & Online Courses" },
  { value: "gaming", label: "Games & Digital Entertainment" },
  { value: "streaming", label: "Streaming & Media" },
  { value: "photography", label: "Digital Photos & Graphics" },
  { value: "music_audio", label: "Music & Audio" },
];

const COMPANY_CATEGORIES = [
  { value: "architect", label: "Architect & Design Firm" },
  { value: "banking_finance", label: "Banking & Financial Services" },
  { value: "consulting", label: "Consulting Firm" },
  { value: "dental_clinic", label: "Dental Clinic" },
  { value: "education", label: "Educational Institution" },
  { value: "fitness_gym", label: "Fitness & Gym" },
  { value: "government", label: "Government Agency" },
  { value: "hotel_resort", label: "Hotel & Resort" },
  { value: "insurance", label: "Insurance Company" },
  { value: "jewelry_store", label: "Jewelry Store" },
  { value: "kitchen_catering", label: "Kitchen & Catering" },
  { value: "legal_law", label: "Law Firm" },
  { value: "medical_hospital", label: "Medical & Hospital" },
  { value: "ngo_nonprofit", label: "NGO & Nonprofit" },
  { value: "optical_eyecare", label: "Optical & Eye Care" },
  { value: "photography_studio", label: "Photography Studio" },
  { value: "quality_testing", label: "Quality & Testing Lab" },
  { value: "real_estate", label: "Real Estate Agency" },
  { value: "salon_spa", label: "Salon & Spa" },
  { value: "travel_agency", label: "Travel Agency" },
  { value: "university", label: "University" },
  { value: "veterinary", label: "Veterinary Clinic" },
  { value: "warehouse_logistics", label: "Warehouse & Logistics" },
  { value: "xray_diagnostic", label: "X-Ray & Diagnostic Center" },
  { value: "yoga_wellness", label: "Yoga & Wellness" },
  { value: "zoo_wildlife", label: "Zoo & Wildlife Park" },
];

function getCategoriesForBusinessType(businessType: string) {
  switch (businessType) {
    case "retail_physical":
      return RETAIL_PHYSICAL_CATEGORIES;
    case "retail_digital":
      return RETAIL_DIGITAL_CATEGORIES;
    case "company_profile":
      return COMPANY_CATEGORIES;
    default:
      return [];
  }
}

function getCategoryLabel(businessType: string, category: string) {
  const categories = getCategoriesForBusinessType(businessType);
  const found = categories.find(c => c.value === category);
  return found?.label || category;
}

function getBusinessTypeLabel(businessType: string) {
  const found = BUSINESS_TYPES.find(t => t.value === businessType);
  return found?.label || businessType;
}

export default function HelpArticlesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgebaseArticle | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  const [generateForm, setGenerateForm] = useState({
    businessType: "",
    category: "",
    topic: "",
    businessInfo: "",
  });
  
  const [editorForm, setEditorForm] = useState({
    title: "",
    content: "",
    tags: [] as string[],
    category: "",
    status: "draft",
    businessType: "",
    businessCategory: "",
  });
  const [newTag, setNewTag] = useState("");
  
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery<KnowledgebaseArticle[]>({
    queryKey: ["/api/knowledgebase/articles", statusFilter !== "all" ? statusFilter : undefined],
    enabled: !!merchantId,
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { businessType: string; category: string; topic?: string; businessInfo?: string }): Promise<{ article: KnowledgebaseArticle; suggestedTopics: string[] }> => {
      const response = await apiRequest("POST", "/api/knowledgebase/generate", data);
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      setIsGenerateOpen(false);
      setGenerateForm({ businessType: "", category: "", topic: "", businessInfo: "" });
      toast({
        title: t("dashboard.articles.generated"),
        description: t("dashboard.articles.generatedDesc"),
      });
      setSelectedArticle(response.article);
      setEditorForm({
        title: response.article.title,
        content: response.article.content,
        tags: response.article.tags || [],
        category: response.article.category || "",
        status: response.article.status || "draft",
        businessType: response.article.businessType || "",
        businessCategory: response.article.businessCategory || "",
      });
      setIsEditorOpen(true);
    },
    onError: () => {
      toast({
        title: t("dashboard.articles.generationFailed"),
        description: t("dashboard.articles.generateFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgebaseArticle>) => {
      if (selectedArticle) {
        return apiRequest("PUT", `/api/knowledgebase/articles/${selectedArticle.id}`, data);
      } else {
        return apiRequest("POST", "/api/knowledgebase/articles", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      setIsEditorOpen(false);
      setSelectedArticle(null);
      toast({
        title: t("dashboard.articles.saved"),
        description: t("dashboard.articles.savedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.articles.saveFailed"),
        description: t("dashboard.articles.saveFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledgebase/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      toast({
        title: t("dashboard.help-articles.toast.articleDeleted"),
        description: t("dashboard.help-articles.toast.theArticleHasBeenDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.help-articles.toast.deleteFailed"),
        description: t("dashboard.help-articles.toast.failedToDeleteArticleDesc"),
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !editorForm.tags.includes(newTag.trim())) {
      setEditorForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditorForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleOpenEditor = (article?: KnowledgebaseArticle) => {
    if (article) {
      setSelectedArticle(article);
      setEditorForm({
        title: article.title,
        content: article.content,
        tags: article.tags || [],
        category: article.category || "",
        status: article.status || "draft",
        businessType: article.businessType || "",
        businessCategory: article.businessCategory || "",
      });
    } else {
      setSelectedArticle(null);
      setEditorForm({
        title: "",
        content: "",
        tags: [],
        category: "",
        status: "draft",
        businessType: "",
        businessCategory: "",
      });
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      title: editorForm.title,
      content: editorForm.content,
      tags: editorForm.tags,
      category: editorForm.category,
      status: editorForm.status,
      businessType: editorForm.businessType,
      businessCategory: editorForm.businessCategory,
    });
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <BookOpen className="w-6 h-6 text-primary" />
            Help Center Articles
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage AI-powered help center articles for your customers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenEditor()} data-testid="button-create-article">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
          <Button onClick={() => setIsGenerateOpen(true)} data-testid="button-generate-article">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-articles"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {articlesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No articles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first help center article or let AI generate one for you.
              </p>
              <Button onClick={() => setIsGenerateOpen(true)} data-testid="button-generate-first">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate First Article
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 border rounded-lg hover-elevate transition-all"
                  data-testid={`card-article-${article.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate" data-testid={`text-article-title-${article.id}`}>
                          {article.title}
                        </h3>
                        <Badge
                          variant={article.status === "published" ? "default" : article.status === "archived" ? "secondary" : "outline"}
                          data-testid={`badge-status-${article.id}`}
                        >
                          {article.status}
                        </Badge>
                        {article.generatedByAi && (
                          <Badge variant="outline" className="text-primary border-primary">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {article.businessCategory && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {getCategoryLabel(article.businessType || "", article.businessCategory)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(article.createdAt!).toLocaleDateString()}
                        </span>
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {article.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                            {article.tags.length > 3 && (
                              <span className="text-muted-foreground">+{article.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedArticle(article);
                          setIsViewOpen(true);
                        }}
                        data-testid={`button-view-${article.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditor(article)}
                        data-testid={`button-edit-${article.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(article.id)}
                        data-testid={`button-delete-${article.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Generate Article
            </DialogTitle>
            <DialogDescription>
              Let AI create a help center article based on your business type and category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select
                value={generateForm.businessType}
                onValueChange={(v) => setGenerateForm(prev => ({ ...prev, businessType: v, category: "" }))}
              >
                <SelectTrigger data-testid="select-generate-business-type">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {generateForm.businessType && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={generateForm.category}
                  onValueChange={(v) => setGenerateForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-generate-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoriesForBusinessType(generateForm.businessType).map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Specific Topic (Optional)</Label>
              <Input
                placeholder="e.g., Return Policy, Sizing Guide, Payment Methods"
                value={generateForm.topic}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, topic: e.target.value }))}
                data-testid="input-generate-topic"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Business Info (Optional)</Label>
              <Textarea
                placeholder="Add specific details about your business that should be included..."
                value={generateForm.businessInfo}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, businessInfo: e.target.value }))}
                rows={3}
                data-testid="input-generate-info"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateMutation.mutate(generateForm)}
              disabled={!generateForm.businessType || !generateForm.category || generateMutation.isPending}
              data-testid="button-submit-generate"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedArticle ? "Edit Article" : "New Article"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select
                    value={editorForm.businessType}
                    onValueChange={(v) => setEditorForm(prev => ({ ...prev, businessType: v, businessCategory: "" }))}
                  >
                    <SelectTrigger data-testid="select-editor-business-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editorForm.businessType && (
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editorForm.businessCategory}
                      onValueChange={(v) => setEditorForm(prev => ({ ...prev, businessCategory: v }))}
                    >
                      <SelectTrigger data-testid="select-editor-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoriesForBusinessType(editorForm.businessType).map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Article title"
                  value={editorForm.title}
                  onChange={(e) => setEditorForm(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-editor-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Content (Markdown supported)</Label>
                <Textarea
                  placeholder="Write your article content here... Markdown formatting is supported."
                  value={editorForm.content}
                  onChange={(e) => setEditorForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  className="font-mono text-sm"
                  data-testid="input-editor-content"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {editorForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    data-testid="input-editor-new-tag"
                  />
                  <Button variant="outline" onClick={handleAddTag} data-testid="button-add-tag">
                    Add
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editorForm.status}
                  onValueChange={(v) => setEditorForm(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger data-testid="select-editor-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editorForm.title || !editorForm.content || saveMutation.isPending}
              data-testid="button-save-article"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Article
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedArticle?.title}
              {selectedArticle?.generatedByAi && (
                <Badge variant="outline" className="text-primary border-primary ml-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              <Badge variant={selectedArticle?.status === "published" ? "default" : "secondary"}>
                {selectedArticle?.status}
              </Badge>
              {selectedArticle?.businessCategory && (
                <span className="text-sm">
                  {getCategoryLabel(selectedArticle?.businessType || "", selectedArticle?.businessCategory)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose dark:prose-invert max-w-none py-4 pr-4">
              <pre className="whitespace-pre-wrap font-sans text-sm bg-transparent p-0">
                {selectedArticle?.content}
              </pre>
            </div>
            {selectedArticle?.tags && selectedArticle.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-4 border-t">
                {selectedArticle.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewOpen(false);
                if (selectedArticle) handleOpenEditor(selectedArticle);
              }}
              data-testid="button-edit-from-view"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
