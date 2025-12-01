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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, Save, Globe, Loader2, Plus, Bot, Send, Trash2, ExternalLink, Check, X, RefreshCw, Copy, ChevronDown, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Merchant, CrawledLink, Agent } from "@shared/schema";

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

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

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
        { from: "jeany", content: data.answer },
      ]);
    },
    onError: () => {
      setPreviewMessages((prev) => [
        ...prev,
        { from: "jeany", content: "Sorry, I couldn't process that. Please try again." },
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
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Column - Knowledge Editor */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Train your AI agent with company information, FAQs, and policies.
            </p>
          </div>
          {agents && agents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Training:</span>
              <Select
                value={activeAgentId || "none"}
                onValueChange={(value) => {
                  if (value !== "none") {
                    selectAgentMutation.mutate(value);
                  }
                }}
                disabled={selectAgentMutation.isPending}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-agent-knowledge">
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
              Add information that Jeany AI will use to answer customer questions.
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
                Test how Jeany AI responds using your knowledge base.
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
                    <p className="font-medium text-sm">{merchant?.companyName || "Jeany AI"}</p>
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
