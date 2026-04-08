import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Zap, Plus, X, AlertTriangle, HeadphonesIcon, Lightbulb } from "lucide-react";
import type { Trigger } from "@shared/schema";

export default function TriggersPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [newTrigger, setNewTrigger] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ triggered: boolean; keyword?: string } | null>(null);

  const { data: triggers, isLoading } = useQuery<Trigger[]>({
    queryKey: ["/api/triggers", merchantId],
    enabled: !!merchantId,
  });

  const addTriggerMutation = useMutation({
    mutationFn: async (keyword: string) => {
      return apiRequest("POST", "/api/triggers/add", {
        merchantId,
        keyword,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triggers", merchantId] });
      setNewTrigger("");
      toast({
        title: "Trigger added",
        description: "This keyword will now escalate chats to supervisors.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add trigger",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      return apiRequest("DELETE", `/api/triggers/${triggerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triggers", merchantId] });
      toast({
        title: "Trigger removed",
        description: "This keyword will no longer escalate chats.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove trigger",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddTrigger = () => {
    if (newTrigger.trim()) {
      addTriggerMutation.mutate(newTrigger.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTrigger();
    }
  };

  const handleTestTrigger = () => {
    if (!testInput.trim() || !triggers) {
      setTestResult(null);
      return;
    }
    
    const lowerInput = testInput.toLowerCase();
    const matchedTrigger = triggers.find((t) =>
      lowerInput.includes(t.keyword.toLowerCase())
    );
    
    setTestResult({
      triggered: !!matchedTrigger,
      keyword: matchedTrigger?.keyword,
    });
  };

  useEffect(() => {
    if (testInput) {
      handleTestTrigger();
    } else {
      setTestResult(null);
    }
  }, [testInput, triggers]);

  const suggestedTriggers = [
    "deposit not received",
    "withdrawal pending",
    "refund request",
    "speak to manager",
    "complaint",
    "cancel order",
    "urgent help",
    "not working",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.triggers.title")}</h1>
        <p className="text-muted-foreground">
          Define keywords that automatically escalate conversations to human supervisors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle>{t("dashboard.triggers.keywords")}</CardTitle>
            </div>
            <CardDescription>
              When a customer message contains any of these keywords, Chatvice will
              automatically escalate the conversation to a human supervisor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter trigger keyword..."
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                onKeyDown={handleKeyPress}
                data-testid="input-new-trigger"
              />
              <Button
                onClick={handleAddTrigger}
                disabled={addTriggerMutation.isPending || !newTrigger.trim()}
                data-testid="button-add-trigger"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : triggers && triggers.length > 0 ? (
              <div className="space-y-2">
                {triggers.map((trigger) => (
                  <div
                    key={trigger.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`trigger-item-${trigger.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-status-away" />
                      <span className="font-medium">{trigger.keyword}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTriggerMutation.mutate(trigger.id)}
                      disabled={deleteTriggerMutation.isPending}
                      data-testid={`button-delete-trigger-${trigger.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t("dashboard.triggers.noTriggers")}</p>
                <p className="text-sm text-muted-foreground">
                  Add keywords that should escalate to supervisors
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-3">Suggested triggers:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTriggers
                  .filter((s) => !triggers?.some((t) => t.keyword.toLowerCase() === s.toLowerCase()))
                  .map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover-elevate"
                      onClick={() => setNewTrigger(suggestion)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {suggestion}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">{t("dashboard.triggers.test")}</CardTitle>
              </div>
              <CardDescription>
                Type a message to test if it would trigger escalation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Type a test message..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                data-testid="input-test-trigger"
              />
              {testResult && (
                <div
                  className={`p-3 rounded-lg ${
                    testResult.triggered
                      ? "bg-status-away/10 border border-status-away/20"
                      : "bg-status-online/10 border border-status-online/20"
                  }`}
                >
                  {testResult.triggered ? (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-status-away" />
                      <div>
                        <p className="text-sm font-medium">Would escalate!</p>
                        <p className="text-xs text-muted-foreground">
                          Matched trigger: "{testResult.keyword}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-status-online" />
                      <div>
                        <p className="text-sm font-medium">{t("dashboard.triggers.noEscalation")}</p>
                        <p className="text-xs text-muted-foreground">
                          AI will handle this message
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Lightbulb className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">How it works</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a customer message contains a trigger keyword, Chatvice
                    will notify supervisors and switch the conversation to human mode.
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
