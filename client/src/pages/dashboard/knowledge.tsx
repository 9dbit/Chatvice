import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Database, Save, Sparkles, FileText, AlertCircle, Globe, Loader2, Plus, Bot, Send, Eye } from "lucide-react";
import type { Merchant } from "@shared/schema";

export default function KnowledgePage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [extractedContent, setExtractedContent] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewMessages, setPreviewMessages] = useState<Array<{ from: string; content: string }>>([]);

  const { data: knowledge, isLoading } = useQuery<{ content: string }>({
    queryKey: ["/api/knowledge", merchantId],
    enabled: !!merchantId,
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge", merchantId] });
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

  const crawlMutation = useMutation<{ content: string }, Error, string>({
    mutationFn: async (url: string) => {
      return apiRequest("POST", "/api/knowledge/crawl", { url }) as Promise<{ content: string }>;
    },
    onSuccess: (data) => {
      setExtractedContent(data.content);
      toast({
        title: "Content extracted",
        description: "Review the extracted content and add it to your knowledge base.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract content from the URL.",
        variant: "destructive",
      });
    },
  });

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
      const sessionId = `test_${Date.now()}`;
      return apiRequest("POST", "/api/chat/ask", {
        merchantId,
        sessionId,
        message: testMessage,
      }) as Promise<{ answer: string; mode: string }>;
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

  const examples = [
    {
      title: "Company Info",
      example: "Our company, TechStore, was founded in 2020. We specialize in selling electronics and gadgets.",
    },
    {
      title: "Return Policy",
      example: "We offer a 30-day return policy for all unused items in original packaging. Refunds are processed within 5-7 business days.",
    },
    {
      title: "Contact Info",
      example: "Customer support hours: Mon-Fri 9AM-6PM. Email: support@example.com, Phone: 1-800-EXAMPLE",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Train Jeany AI with your company information, FAQs, and policies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>Knowledge Content</CardTitle>
            </div>
            <CardDescription>
              Add information that Jeany AI will use to answer customer questions.
              Be specific and include common questions and their answers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <Textarea
                  placeholder="Enter your knowledge base content here...

Example:
- Our store hours are 9 AM to 9 PM, Monday through Saturday.
- We offer free shipping on orders over $50.
- Returns are accepted within 30 days of purchase.
- Contact support at support@example.com"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] resize-none"
                  data-testid="textarea-knowledge-content"
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {content.length} characters
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-knowledge"
                  >
                    {saveMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Knowledge
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Import from Website</CardTitle>
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
                  variant="outline"
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

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Include frequently asked questions and their answers</span>
                </li>
                <li className="flex gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Add product information, pricing, and availability</span>
                </li>
                <li className="flex gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Document company policies (returns, shipping, etc.)</span>
                </li>
                <li className="flex gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Provide contact information and support hours</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {examples.map((item, index) => (
                <div key={index}>
                  <p className="text-sm font-medium mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {item.example}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Pro Tip</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The more detailed and structured your knowledge base, the better Jeany AI will respond to customer inquiries.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <CardTitle>Live Widget Preview</CardTitle>
            </div>
            {previewMessages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearPreview} data-testid="button-clear-preview">
                Clear Chat
              </Button>
            )}
          </div>
          <CardDescription>
            Test how Jeany AI responds to questions using your current knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="mx-auto max-w-sm rounded-2xl border overflow-hidden bg-card shadow-lg"
            style={{ borderColor: merchant?.primaryColor || "#6b5dfc" }}
            data-testid="widget-preview-container"
          >
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

            <ScrollArea className="h-[280px] p-3 bg-background">
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
            This preview uses the current saved knowledge base. Save your changes to test with updated content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
