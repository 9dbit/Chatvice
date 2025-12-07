import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Database, Save, Globe, Loader2, Plus, Bot, Send, Trash2, ExternalLink, Check, X, RefreshCw, Copy, ChevronDown, Sparkles, HelpCircle, Edit2, GripVertical, MessageSquare, Lock, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import type { Merchant, CrawledLink, Agent, SuggestedQuestion } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

export default function KnowledgePage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [extractedContent, setExtractedContent] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewMessages, setPreviewMessages] = useState<Array<{ from: string; content: string }>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportAgent, setSelectedImportAgent] = useState<string | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SuggestedQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

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
  const isQuestionFeatureAvailable = plan.suggestedQuestionsLimit !== 0;
  const questionsLimit = plan.suggestedQuestionsLimit === -1 ? Infinity : plan.suggestedQuestionsLimit;
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
    onSuccess: (data) => {
      setExtractedContent(data.content);
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: "Content extracted",
        description: "Review the extracted content and add it to your knowledge base.",
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract content from the URL.",
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

  const handleQuickQuestion = (question: string, preConfiguredAnswer?: string) => {
    setPreviewMessages((prev) => [...prev, { from: "user", content: question }]);
    if (preConfiguredAnswer) {
      setPreviewMessages((prev) => [...prev, { from: "chatvice", content: preConfiguredAnswer }]);
    } else {
      testMutation.mutate(question);
    }
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

  const handleAddExtracted = () => {
    const separator = content.trim() ? "\n\n---\n\n" : "";
    setContent(content + separator + extractedContent);
    setExtractedContent("");
    setCrawlUrl("");
    toast({
      title: "Content added",
      description: "The extracted content has been added to your knowledge base. Don't forget to save!",
    });
  };

  const testMutation = useMutation({
    mutationFn: async (testMessage: string) => {
      const sessionId = `test_${merchantId}_preview`;
      const res = await apiRequest("POST", "/api/chat/ask", {
        merchantId,
        sessionId,
        message: testMessage,
      });
      return res.json() as Promise<{ answer: string; mode: string }>;
    },
    onSuccess: (data) => {
      setPreviewMessages((prev) => [
        ...prev,
        { from: "chatvice", content: data.answer },
      ]);
    },
    onError: () => {
      setPreviewMessages((prev) => [
        ...prev,
        { from: "chatvice", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    },
  });

  const handleTestSend = () => {
    if (!previewMessage.trim()) return;
    setPreviewMessages((prev) => [...prev, { from: "user", content: previewMessage }]);
    testMutation.mutate(previewMessage);
    setPreviewMessage("");
  };

  const handleTestKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTestSend();
    }
  };

  const clearPreview = () => {
    setPreviewMessages([]);
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
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full">
      {/* Left Column - Knowledge Editor */}
      <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Train your AI with company info, FAQs, and policies.
            </p>
          </div>
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
              <CardTitle>Import from Website</CardTitle>
            </div>
            <CardDescription>
              Extract FAQs and policies from your website automatically.
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
                  "Extract"
                )}
              </Button>
            </div>

            {extractedContent && (
              <div className="space-y-3">
                <div className="max-h-48 overflow-auto p-3 rounded-md bg-muted text-sm">
                  <pre className="whitespace-pre-wrap font-sans">{extractedContent}</pre>
                </div>
                <Button
                  onClick={handleAddExtracted}
                  variant="outline"
                  className="w-full"
                  data-testid="button-add-extracted"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Knowledge Base
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crawled Links List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Link Sources</CardTitle>
              <Badge variant="secondary">{crawledLinks.length} links</Badge>
            </div>
            <CardDescription>
              Websites that have been crawled for content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linksLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : crawledLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No websites crawled yet. Use the form above to import content.
              </p>
            ) : (
              <div className="space-y-2">
                {crawledLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                    data-testid={`crawled-link-${link.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {link.status === "completed" ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : link.status === "failed" ? (
                          <X className="w-4 h-4 text-red-500" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{link.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(link.crawledAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                ))}
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
      </div>

      {/* Right Column - Live Widget Preview */}
      <div className="w-full lg:w-[380px] lg:flex-shrink-0">
        <div className="lg:sticky lg:top-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Live Preview</CardTitle>
                {previewMessages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearPreview} data-testid="button-clear-preview">
                    Clear
                  </Button>
                )}
              </div>
              <CardDescription>
                Test how Chatvice responds using your knowledge base.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="rounded-2xl border overflow-hidden bg-card shadow-lg"
                style={{ borderColor: merchant?.primaryColor || "#6b5dfc" }}
                data-testid="widget-preview-container"
              >
                {/* Widget Header */}
                <div 
                  className="p-3 flex items-center gap-3"
                  style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    {merchant?.iconUrl ? (
                      <img src={merchant.iconUrl} alt="Bot" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-white">
                    <p className="font-medium text-sm">{merchant?.companyName || "Chatvice"}</p>
                    <p className="text-xs text-white/80">Customer Support</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="h-[320px] p-3 bg-background">
                  <div className="space-y-3">
                    {previewMessages.length === 0 && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}>
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-lg p-2 max-w-[80%]">
                          <p className="text-sm">{merchant?.welcomeMessage || "Hi! How can I help you today?"}</p>
                        </div>
                      </div>
                    )}
                    {previewMessages.map((msg, index) => (
                      <div key={index} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : ""}`}>
                        {msg.from !== "user" && (
                          <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}>
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`rounded-lg p-2 max-w-[80%] ${msg.from === "user" ? "text-white" : "bg-muted"}`} style={{ backgroundColor: msg.from === "user" ? (merchant?.primaryColor || "#6b5dfc") : undefined }}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {testMutation.isPending && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}>
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-lg p-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick Questions - Always visible */}
                {suggestedQuestions.filter(q => q.isActive !== false).length > 0 && (
                  <div className="px-3 pb-2 pt-0">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Quick questions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedQuestions.filter(q => q.isActive !== false).slice(0, 4).map((q) => (
                        <button
                          key={q.id}
                          onClick={() => handleQuickQuestion(q.question, q.answer)}
                          disabled={testMutation.isPending}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors truncate max-w-[150px] ${
                            testMutation.isPending 
                              ? "opacity-50 cursor-not-allowed" 
                              : "hover-elevate"
                          }`}
                          style={{ 
                            borderColor: merchant?.primaryColor || "#6b5dfc",
                            color: merchant?.primaryColor || "#6b5dfc"
                          }}
                          data-testid={`quick-question-${q.id}`}
                        >
                          {q.question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a question..."
                      value={previewMessage}
                      onChange={(e) => setPreviewMessage(e.target.value)}
                      onKeyDown={handleTestKeyPress}
                      disabled={testMutation.isPending}
                      className="flex-1"
                      data-testid="input-preview-message"
                    />
                    <Button 
                      onClick={handleTestSend}
                      disabled={testMutation.isPending || !previewMessage.trim()}
                      size="icon"
                      style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}
                      data-testid="button-preview-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Save your knowledge base changes to test with updated content.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

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
  );
}
