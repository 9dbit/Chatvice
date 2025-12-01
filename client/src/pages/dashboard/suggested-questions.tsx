import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Plus, Trash2, Edit2, Save, X, Loader2, Lock, Crown, GripVertical, MessageSquare } from "lucide-react";
import type { Merchant, SuggestedQuestion } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

export default function SuggestedQuestionsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SuggestedQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: questions = [], isLoading } = useQuery<SuggestedQuestion[]>({
    queryKey: ["/api/suggested-questions"],
    enabled: !!merchantId,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  const isFeatureAvailable = plan.suggestedQuestionsLimit !== 0;
  const questionsLimit = plan.suggestedQuestionsLimit === -1 ? Infinity : plan.suggestedQuestionsLimit;
  const canAddMore = questions.length < questionsLimit;

  const createMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string }) => {
      return apiRequest("POST", "/api/suggested-questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      setIsAddDialogOpen(false);
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

  const updateMutation = useMutation({
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

  const deleteMutation = useMutation({
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

  const handleCreate = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both the question and answer.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ question: newQuestion, answer: newAnswer });
  };

  const handleUpdate = () => {
    if (!editingQuestion) return;
    updateMutation.mutate({
      id: editingQuestion.id,
      question: editingQuestion.question,
      answer: editingQuestion.answer,
      isActive: editingQuestion.isActive ?? true,
    });
  };

  const handleToggleActive = (q: SuggestedQuestion) => {
    updateMutation.mutate({
      id: q.id,
      question: q.question,
      answer: q.answer,
      isActive: !(q.isActive ?? true),
    });
  };

  if (!isFeatureAvailable) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Suggested Questions Not Available</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Upgrade to a paid plan to enable suggested questions. This feature allows you to display quick-action buttons in your chat widget that customers can click to get instant answers.
            </p>
            <Button onClick={() => window.location.href = "/dashboard/plans"} data-testid="button-upgrade-plan">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Suggested Questions
              </CardTitle>
              <CardDescription>
                Create quick-action buttons that appear in your chat widget. Customers can click these to get instant answers.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!canAddMore}
              data-testid="button-add-question"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-6">
            <Badge variant="outline">
              {questions.length} / {questionsLimit === Infinity ? "Unlimited" : questionsLimit} questions
            </Badge>
            <Badge variant="secondary">
              Max 5 shown in widget
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No suggested questions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add questions that your customers frequently ask.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" data-testid="button-add-first-question">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <Card key={q.id} className={`transition-opacity ${!q.isActive ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              #{index + 1}
                            </Badge>
                            {index < 5 && q.isActive && (
                              <Badge variant="default" className="text-xs">
                                Visible in widget
                              </Badge>
                            )}
                            {!q.isActive && (
                              <Badge variant="outline" className="text-xs">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={q.isActive ?? true}
                              onCheckedChange={() => handleToggleActive(q)}
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
                              onClick={() => deleteMutation.mutate(q.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-question-${q.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="font-medium mb-1">{q.question}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{q.answer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widget Preview</CardTitle>
          <CardDescription>
            This is how suggested questions will appear in your chat widget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mx-auto">
            <div className="border rounded-lg overflow-hidden shadow-lg">
              <div className="p-3 text-white flex items-center gap-2" style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">Customer Support</p>
                  <p className="text-xs text-white/80">Online</p>
                </div>
              </div>
              <div className="p-4 bg-background min-h-[200px]">
                <div className="flex gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: merchant?.primaryColor || "#6b5dfc" }}>
                    <HelpCircle className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-muted rounded-lg p-2 max-w-[80%]">
                    <p className="text-sm">Hi! How can I help you today?</p>
                  </div>
                </div>
                
                {questions.filter(q => q.isActive).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {questions.filter(q => q.isActive).slice(0, 5).map((q) => (
                        <Button
                          key={q.id}
                          variant="outline"
                          size="sm"
                          className="h-auto py-1.5 px-3 text-xs font-normal whitespace-normal text-left"
                          data-testid={`preview-question-${q.id}`}
                        >
                          {q.question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Suggested Question</DialogTitle>
            <DialogDescription>
              Create a quick-action button for your chat widget.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="e.g., What are your business hours?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                data-testid="input-new-question"
              />
              <p className="text-xs text-muted-foreground">This is the button text that customers will see.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="e.g., We are open Monday to Friday, 9 AM to 5 PM."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={4}
                data-testid="input-new-answer"
              />
              <p className="text-xs text-muted-foreground">This is the instant reply when the button is clicked.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newQuestion.trim() || !newAnswer.trim()}
              data-testid="button-confirm-add"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Suggested Question</DialogTitle>
            <DialogDescription>
              Update the question and answer.
            </DialogDescription>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question">Question</Label>
                <Input
                  id="edit-question"
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  data-testid="input-edit-question"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-answer">Answer</Label>
                <Textarea
                  id="edit-answer"
                  value={editingQuestion.answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                  rows={4}
                  data-testid="input-edit-answer"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
