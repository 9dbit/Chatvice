import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Database, Save, Globe, Loader2, Plus, Bot, Trash2, ExternalLink, Check, X, RefreshCw, Copy, ChevronDown, Sparkles, HelpCircle, Edit2, GripVertical, MessageSquare, Lock, Crown, BookOpen, Eye, Search, Filter, FileText, Tag, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import type { Merchant, CrawledLink, Agent, SuggestedQuestion, KnowledgebaseArticle } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

// Business type and category constants for Help Articles
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

export default function KnowledgePage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportAgent, setSelectedImportAgent] = useState<string | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SuggestedQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  
  // Help Articles state
  const [activeTab, setActiveTab] = useState("training");
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [articleStatusFilter, setArticleStatusFilter] = useState<string>("all");
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

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: suggestedQuestions = [] } = useQuery<SuggestedQuestion[]>({
    queryKey: ["/api/suggested-questions"],
    enabled: !!merchantId,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  // Use custom limits for custom plan, otherwise use base plan limits
  const effectiveSuggestedQuestionsLimit = merchant?.subscriptionPlanId === 'custom' && (merchant as any).customSuggestedQuestionsLimit !== undefined 
    ? (merchant as any).customSuggestedQuestionsLimit 
    : plan.suggestedQuestionsLimit;
  const isQuestionFeatureAvailable = effectiveSuggestedQuestionsLimit !== 0;
  const questionsLimit = effectiveSuggestedQuestionsLimit === -1 ? Infinity : effectiveSuggestedQuestionsLimit;
  const canAddMoreQuestions = suggestedQuestions.length < questionsLimit;

  const otherAgents = agents?.filter(a => a.id !== merchant?.activeAgentId) || [];

  const activeAgentId = merchant?.activeAgentId;
  const activeAgent = agents?.find(a => a.id === activeAgentId);

  const selectAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest("POST", "/api/merchant/select-agent", { agentId });
    },
    onSuccess: (_, newAgentId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/agent/${newAgentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      setContent("");
      toast({
        title: "Agent selected",
        description: "Now editing knowledge for the selected agent.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to select agent",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: knowledge, isLoading } = useQuery<{ content: string }>({
    queryKey: activeAgentId 
      ? [`/api/knowledge/agent/${activeAgentId}`]
      : [`/api/knowledge/${merchantId}`],
    enabled: !!merchantId,
  });

  const { data: crawledLinks = [], isLoading: linksLoading } = useQuery<CrawledLink[]>({
    queryKey: ["/api/knowledge/links", merchantId],
    enabled: !!merchantId,
  });

  // Help Articles queries
  const { data: articles = [], isLoading: articlesLoading } = useQuery<KnowledgebaseArticle[]>({
    queryKey: ["/api/knowledgebase/articles", articleStatusFilter !== "all" ? articleStatusFilter : undefined],
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
        title: "Article generated",
        description: "Your AI-generated article has been created as a draft.",
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
        title: "Generation failed",
        description: "Failed to generate article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveArticleMutation = useMutation({
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
        title: "Article saved",
        description: "Your article has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledgebase/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      toast({
        title: "Article deleted",
        description: "The article has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(articleSearchQuery.toLowerCase());
    const matchesStatus = articleStatusFilter === "all" || article.status === articleStatusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (knowledge?.content) {
      setContent(knowledge.content);
    }
  }, [knowledge]);

  const saveMutation = useMutation({
    mutationFn: async (knowledgeText: string) => {
      return apiRequest("POST", "/api/knowledge/set", {
        merchantId,
        knowledgeText,
        agentId: activeAgentId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeAgentId 
        ? [`/api/knowledge/agent/${activeAgentId}`]
        : [`/api/knowledge/${merchantId}`] 
      });
      toast({
        title: "Knowledge saved",
        description: "Your AI will now use this information to answer questions.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const crawlMutation = useMutation<{ content: string; linkId: string }, Error, string>({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/knowledge/crawl", { url });
      return res.json() as Promise<{ content: string; linkId: string }>;
    },
    onSuccess: () => {
      setCrawlUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      queryClient.invalidateQueries({ queryKey: activeAgentId 
        ? [`/api/knowledge/agent/${activeAgentId}`]
        : [`/api/knowledge/${merchantId}`] 
      });
      toast({
        title: "Website synced",
        description: "Content has been extracted and added to your AI knowledge base.",
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: "Sync failed",
        description: error.message || "Failed to extract content from the URL.",
        variant: "destructive",
      });
    },
  });

  const recrawlMutation = useMutation<{ content: string; lastSyncedAt: string }, Error, string>({
    mutationFn: async (linkId: string) => {
      const res = await apiRequest("POST", `/api/knowledge/recrawl/${linkId}`);
      return res.json() as Promise<{ content: string; lastSyncedAt: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      queryClient.invalidateQueries({ queryKey: activeAgentId 
        ? [`/api/knowledge/agent/${activeAgentId}`]
        : [`/api/knowledge/${merchantId}`] 
      });
      toast({
        title: "Website updated",
        description: "Content has been refreshed and synced to your AI knowledge base.",
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: "Update failed",
        description: error.message || "Failed to refresh content from the URL.",
        variant: "destructive",
      });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return apiRequest("DELETE", `/api/knowledge/links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: "Link deleted",
        description: "The crawled link has been removed.",
      });
    },
  });

  const importFromAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest("GET", `/api/knowledge/agent/${agentId}`);
      return res.json() as Promise<{ content: string }>;
    },
    onSuccess: (data) => {
      if (data.content) {
        const separator = content.trim() ? "\n\n---\n\n" : "";
        setContent(content + separator + data.content);
        toast({
          title: "Knowledge imported",
          description: "The knowledge from the selected agent has been added. Don't forget to save!",
        });
      } else {
        toast({
          title: "No knowledge found",
          description: "The selected agent has no knowledge base content.",
          variant: "destructive",
        });
      }
      setImportDialogOpen(false);
      setSelectedImportAgent(null);
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "Failed to import knowledge from the selected agent.",
        variant: "destructive",
      });
    },
  });

  const handleImportFromAgent = () => {
    if (selectedImportAgent) {
      importFromAgentMutation.mutate(selectedImportAgent);
    }
  };

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string }) => {
      return apiRequest("POST", "/api/suggested-questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      setIsAddQuestionOpen(false);
      setNewQuestion("");
      setNewAnswer("");
      toast({
        title: "Question added",
        description: "The suggested question has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add question",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (data: { id: string; question: string; answer: string; isActive: boolean }) => {
      const { id, ...rest } = data;
      return apiRequest("PUT", `/api/suggested-questions/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      setEditingQuestion(null);
      toast({
        title: "Question updated",
        description: "The suggested question has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/suggested-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      toast({
        title: "Question deleted",
        description: "The suggested question has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateQuestion = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both the question and answer.",
        variant: "destructive",
      });
      return;
    }
    createQuestionMutation.mutate({ question: newQuestion, answer: newAnswer });
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;
    updateQuestionMutation.mutate({
      id: editingQuestion.id,
      question: editingQuestion.question,
      answer: editingQuestion.answer,
      isActive: editingQuestion.isActive ?? true,
    });
  };

  const handleToggleQuestionActive = (q: SuggestedQuestion) => {
    updateQuestionMutation.mutate({
      id: q.id,
      question: q.question,
      answer: q.answer,
      isActive: !(q.isActive ?? true),
    });
  };

  const handleSave = () => {
    saveMutation.mutate(content);
  };

  const handleCrawl = () => {
    if (!crawlUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a website URL to extract content from.",
        variant: "destructive",
      });
      return;
    }
    crawlMutation.mutate(crawlUrl.trim());
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Train your AI with company info, FAQs, and help articles.
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="training" className="flex items-center gap-2" data-testid="tab-training">
            <Database className="w-4 h-4" />
            Training Data
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2" data-testid="tab-articles">
            <BookOpen className="w-4 h-4" />
            Help Articles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="mt-4">
    <div className="space-y-4 sm:space-y-6 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div></div>
          {agents && agents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Training:</span>
              <Select
                value={activeAgentId || "none"}
                onValueChange={(value) => {
                  if (value !== "none") {
                    selectAgentMutation.mutate(value);
                  }
                }}
                disabled={selectAgentMutation.isPending}
              >
                <SelectTrigger className="w-[160px] sm:w-[200px]" data-testid="select-agent-knowledge">
                  <div className="flex items-center gap-2">
                    {activeAgent ? (
                      <>
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={activeAgent.photoUrl || ""} />
                          <AvatarFallback className="text-[10px]">
                            <Bot className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{activeAgent.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Select agent...</span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {!activeAgentId && (
                    <SelectItem value="none" disabled>
                      <span className="text-muted-foreground">Select an agent to train...</span>
                    </SelectItem>
                  )}
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} data-testid={`select-agent-option-${agent.id}`}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={agent.photoUrl || ""} />
                          <AvatarFallback className="text-[10px]">
                            <Bot className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{agent.name}</span>
                        {agent.id === activeAgentId && (
                          <Badge variant="secondary" className="text-[10px] ml-1">Active</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Knowledge Content Editor */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>Knowledge Content</CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {otherAgents.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setImportDialogOpen(true)}
                    data-testid="button-import-from-agent"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Import from Agent
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-knowledge"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
            <CardDescription>
              Add information that Chatvice will use to answer customer questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter your knowledge base content here...

Example:
- Our store hours are 9 AM to 9 PM, Monday through Saturday.
- We offer free shipping on orders over $50.
- Returns are accepted within 30 days of purchase.
- Contact support at support@example.com"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[250px] resize-none"
                  data-testid="textarea-knowledge-content"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import from Website */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle>Sync Website Content</CardTitle>
            </div>
            <CardDescription>
              Add a website URL to automatically extract and sync content to your AI knowledge base. Content will be refreshed every 60 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/faq"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                disabled={crawlMutation.isPending}
                data-testid="input-crawl-url"
              />
              <Button
                onClick={handleCrawl}
                disabled={crawlMutation.isPending}
                data-testid="button-extract-content"
              >
                {crawlMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add Source"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Crawled Links List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Sources</CardTitle>
              <Badge variant="secondary">{crawledLinks.length} sources</Badge>
            </div>
            <CardDescription>
              Websites synced to your AI knowledge base. Auto-refreshed every 60 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linksLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : crawledLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sources yet. Add a website URL above to start syncing.
              </p>
            ) : (
              <div className="space-y-2">
                {crawledLinks.map((link) => {
                  const isSyncing = link.syncStatus === "syncing" || recrawlMutation.isPending;
                  const isActive = link.isActive && link.status === "completed";
                  const lastSync = link.lastSyncedAt ? new Date(link.lastSyncedAt) : null;
                  
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                      data-testid={`crawled-link-${link.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 relative">
                          {isSyncing ? (
                            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                          ) : link.status === "failed" ? (
                            <X className="w-4 h-4 text-red-500" />
                          ) : isActive ? (
                            <div className="relative">
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{link.url}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {lastSync 
                                ? `Last sync: ${formatDate(lastSync)}`
                                : `Added: ${formatDate(link.crawledAt)}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => recrawlMutation.mutate(link.id)}
                          disabled={isSyncing || recrawlMutation.isPending}
                          data-testid={`button-recrawl-${link.id}`}
                          className="text-xs"
                        >
                          {isSyncing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Update
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLinkMutation.mutate(link.id)}
                          disabled={deleteLinkMutation.isPending}
                          data-testid={`button-delete-link-${link.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested Questions Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <CardTitle>Suggested Questions</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {suggestedQuestions.length}{questionsLimit === Infinity ? "" : ` / ${questionsLimit}`}
                </Badge>
                {!isQuestionFeatureAvailable ? (
                  <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                    <Lock className="w-3 h-3 mr-1" />
                    Upgrade
                  </Badge>
                ) : null}
              </div>
            </div>
            <CardDescription>
              Pre-defined questions shown as quick buttons in the chat widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isQuestionFeatureAvailable ? (
              <div className="text-center py-6 px-4">
                <Crown className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-medium mb-1">Suggested Questions</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upgrade to a paid plan to add suggested questions that guide customer conversations.
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/billing">View Plans</Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Add New Question Form */}
                {isAddQuestionOpen ? (
                  <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Question</Label>
                      <Input
                        placeholder="e.g., What are your store hours?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        data-testid="input-new-question"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Answer</Label>
                      <Textarea
                        placeholder="Enter the answer that Chatvice will use..."
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        className="min-h-[80px] resize-none"
                        data-testid="textarea-new-answer"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddQuestionOpen(false);
                          setNewQuestion("");
                          setNewAnswer("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateQuestion}
                        disabled={createQuestionMutation.isPending}
                        data-testid="button-save-new-question"
                      >
                        {createQuestionMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddQuestionOpen(true)}
                    disabled={!canAddMoreQuestions}
                    data-testid="button-add-question"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {canAddMoreQuestions ? "Add Question" : `Limit Reached (${questionsLimit})`}
                  </Button>
                )}

                {/* Questions List */}
                {suggestedQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={`p-3 border rounded-lg transition-colors ${
                          q.isActive !== false ? "bg-card" : "bg-muted/40 opacity-60"
                        }`}
                        data-testid={`suggested-question-${q.id}`}
                      >
                        {editingQuestion?.id === q.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editingQuestion.question}
                              onChange={(e) =>
                                setEditingQuestion({ ...editingQuestion, question: e.target.value })
                              }
                              data-testid="input-edit-question"
                            />
                            <Textarea
                              value={editingQuestion.answer}
                              onChange={(e) =>
                                setEditingQuestion({ ...editingQuestion, answer: e.target.value })
                              }
                              className="min-h-[60px] resize-none"
                              data-testid="textarea-edit-answer"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingQuestion(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleUpdateQuestion}
                                disabled={updateQuestionMutation.isPending}
                                data-testid="button-save-edit"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-sm font-medium truncate">{q.question}</p>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                                {q.answer}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Switch
                                checked={q.isActive !== false}
                                onCheckedChange={() => handleToggleQuestionActive(q)}
                                data-testid={`switch-question-active-${q.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingQuestion(q)}
                                data-testid={`button-edit-question-${q.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteQuestionMutation.mutate(q.id)}
                                disabled={deleteQuestionMutation.isPending}
                                data-testid={`button-delete-question-${q.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !isAddQuestionOpen ? (
                  <div className="text-center py-6">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No suggested questions yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add questions to help guide customer conversations.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

      {/* Import from Agent Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Knowledge from Agent</DialogTitle>
            <DialogDescription>
              Select an agent to import their knowledge base content. This will append to your current knowledge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {otherAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedImportAgent(agent.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover-elevate ${
                    selectedImportAgent === agent.id
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                  data-testid={`button-select-agent-${agent.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agent.photoUrl || undefined} alt={agent.name} />
                    <AvatarFallback>
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">{agent.description || "No description"}</p>
                  </div>
                  {selectedImportAgent === agent.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
              {otherAgents.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No other agents available to import from.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportFromAgent}
              disabled={!selectedImportAgent || importFromAgentMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importFromAgentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
        </TabsContent>

        {/* Help Articles Tab */}
        <TabsContent value="articles" className="mt-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={articleSearchQuery}
                    onChange={(e) => setArticleSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-articles"
                  />
                </div>
                <Select value={articleStatusFilter} onValueChange={setArticleStatusFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
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
                  setIsEditorOpen(true);
                }} data-testid="button-new-article">
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Button>
                <Button onClick={() => setIsGenerateOpen(true)} data-testid="button-ai-generate">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generate
                </Button>
              </div>
            </div>

            {/* Articles List */}
            {articlesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No articles yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first help article or let AI generate one for you.
                  </p>
                  <Button onClick={() => setIsGenerateOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article) => (
                  <Card key={article.id} className="hover-elevate cursor-pointer" data-testid={`card-article-${article.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                        <Badge variant={article.status === "published" ? "default" : article.status === "archived" ? "secondary" : "outline"}>
                          {article.status}
                        </Badge>
                      </div>
                      {article.businessType && (
                        <p className="text-xs text-muted-foreground">
                          {getBusinessTypeLabel(article.businessType)} • {getCategoryLabel(article.businessType, article.businessCategory || "")}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {article.content.substring(0, 150)}...
                      </p>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {article.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{article.tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(article.updatedAt || article.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(article);
                          setIsViewOpen(true);
                        }} data-testid={`button-view-${article.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
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
                          setIsEditorOpen(true);
                        }} data-testid={`button-edit-${article.id}`}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this article?")) {
                            deleteArticleMutation.mutate(article.id);
                          }
                        }} data-testid={`button-delete-${article.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Generate Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
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
              <Select value={generateForm.businessType} onValueChange={(v) => setGenerateForm({ ...generateForm, businessType: v, category: "" })}>
                <SelectTrigger data-testid="select-business-type">
                  <SelectValue placeholder="Select business type..." />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={generateForm.category} onValueChange={(v) => setGenerateForm({ ...generateForm, category: v })} disabled={!generateForm.businessType}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {getCategoriesForBusinessType(generateForm.businessType).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Specific Topic (Optional)</Label>
              <Input
                placeholder="e.g., Return Policy, Size Guide..."
                value={generateForm.topic}
                onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                data-testid="input-topic"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Business Info (Optional)</Label>
              <Textarea
                placeholder="Add specific details about your business that should be included..."
                value={generateForm.businessInfo}
                onChange={(e) => setGenerateForm({ ...generateForm, businessInfo: e.target.value })}
                className="min-h-[80px]"
                data-testid="textarea-business-info"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => generateMutation.mutate(generateForm)} 
              disabled={!generateForm.businessType || !generateForm.category || generateMutation.isPending}
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editorForm.title}
                onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
                placeholder="Article title..."
                data-testid="input-article-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editorForm.content}
                onChange={(e) => setEditorForm({ ...editorForm, content: e.target.value })}
                placeholder="Article content (supports Markdown)..."
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-article-content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editorForm.status} onValueChange={(v) => setEditorForm({ ...editorForm, status: v })}>
                  <SelectTrigger data-testid="select-article-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag.trim()) {
                        e.preventDefault();
                        setEditorForm({ ...editorForm, tags: [...editorForm.tags, newTag.trim()] });
                        setNewTag("");
                      }
                    }}
                    data-testid="input-new-tag"
                  />
                  <Button type="button" size="icon" variant="outline" onClick={() => {
                    if (newTag.trim()) {
                      setEditorForm({ ...editorForm, tags: [...editorForm.tags, newTag.trim()] });
                      setNewTag("");
                    }
                  }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {editorForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editorForm.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => setEditorForm({ ...editorForm, tags: editorForm.tags.filter((_, idx) => idx !== i) })}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveArticleMutation.mutate(editorForm)} 
              disabled={!editorForm.title || !editorForm.content || saveArticleMutation.isPending}
              data-testid="button-save-article"
            >
              {saveArticleMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle?.title}</DialogTitle>
            {selectedArticle?.businessType && (
              <DialogDescription>
                {getBusinessTypeLabel(selectedArticle.businessType)} • {getCategoryLabel(selectedArticle.businessType, selectedArticle.businessCategory || "")}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{selectedArticle?.content}</div>
            </div>
            {selectedArticle?.tags && selectedArticle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t">
                {selectedArticle.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              if (selectedArticle) {
                setEditorForm({
                  title: selectedArticle.title,
                  content: selectedArticle.content,
                  tags: selectedArticle.tags || [],
                  category: selectedArticle.category || "",
                  status: selectedArticle.status || "draft",
                  businessType: selectedArticle.businessType || "",
                  businessCategory: selectedArticle.businessCategory || "",
                });
                setIsEditorOpen(true);
              }
            }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
