import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Database, Save, Sparkles, FileText, AlertCircle } from "lucide-react";

export default function KnowledgePage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [content, setContent] = useState("");

  const { data: knowledge, isLoading } = useQuery({
    queryKey: ["/api/knowledge", merchantId],
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

  const handleSave = () => {
    saveMutation.mutate(content);
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
    </div>
  );
}
