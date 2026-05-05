import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bot, Code, MessageSquare, Check, ChevronDown, ChevronUp, X, Rocket, HelpCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Agent, Merchant } from "@shared/schema";

interface HelpGuide {
  title: string;
  steps: string[];
}

interface ChecklistStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  completed: boolean;
  action?: { label: string; onClick: () => void };
  helpGuide?: HelpGuide;
  accentClass: string;
}

interface GettingStartedChecklistProps {
  merchant: Merchant | null | undefined;
  agents: Agent[];
  hasReceivedMessage: boolean;
  disableAutoDismiss?: boolean;
}

export function GettingStartedChecklist({ merchant, agents, hasReceivedMessage, disableAutoDismiss = false }: GettingStartedChecklistProps) {
  const [, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const autoDismissedRef = useRef(false);

  const hasAgent = agents.length > 0;
  const widgetInstalled = merchant?.onboardingWidgetInstalled ?? false;
  const dismissed = merchant?.onboardingDismissed ?? false;

  const completedCount = [hasAgent, widgetInstalled, hasReceivedMessage].filter(Boolean).length;
  const allDone = completedCount === 3;

  const dismissMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/merchant/onboarding/dismiss"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
    },
  });

  const widgetInstalledMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/merchant/onboarding/widget-installed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
    },
  });

  useEffect(() => {
    if (allDone && !dismissed && !disableAutoDismiss && !autoDismissedRef.current && !dismissMutation.isPending) {
      autoDismissedRef.current = true;
      const timer = setTimeout(() => {
        dismissMutation.mutate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed, disableAutoDismiss]);

  if (dismissed) return null;

  const steps: ChecklistStep[] = [
    {
      id: "create-agent",
      icon: Bot,
      title: "Create your first AI agent",
      description: "Set up an AI agent to handle customer conversations automatically.",
      completed: hasAgent,
      action: !hasAgent
        ? { label: "Create agent", onClick: () => navigate("/dashboard/agents") }
        : undefined,
      helpGuide: !hasAgent
        ? {
            title: "How to create an AI agent",
            steps: [
              "Go to the Agents section in the left sidebar.",
              'Click "New Agent" and give it a name (e.g. "Support Bot").',
              "Write a system prompt that describes how the agent should behave and what it knows.",
              "Save the agent — it will be immediately available for your widget.",
            ],
          }
        : undefined,
      accentClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      id: "install-widget",
      icon: Code,
      title: "Install the chat widget",
      description: "Embed the widget snippet on your website so visitors can start chatting.",
      completed: widgetInstalled,
      action: !widgetInstalled
        ? {
            label: "Mark as done",
            onClick: () => widgetInstalledMutation.mutate(),
          }
        : undefined,
      helpGuide: !widgetInstalled
        ? {
            title: "How to install the chat widget",
            steps: [
              "Open the Widget section in the sidebar to find your embed snippet.",
              "Copy the script tag shown on that page.",
              "Paste it just before the closing body tag in your website's HTML.",
              'Once the widget appears on your site, click "Mark as done" above.',
            ],
          }
        : undefined,
      accentClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      id: "first-message",
      icon: MessageSquare,
      title: "Receive your first message",
      description: "Once the widget is live, customers can start a conversation with your agent.",
      completed: hasReceivedMessage,
      helpGuide: !hasReceivedMessage
        ? {
            title: "How to get your first message",
            steps: [
              "Make sure the widget is installed and an agent is active.",
              "Open your website and click the chat bubble — you can test it yourself.",
              "Send a message; your AI agent will respond automatically.",
              "This step completes automatically once a message is received.",
            ],
          }
        : undefined,
      accentClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <Card data-testid="card-getting-started">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              Getting Started
            </CardTitle>
            <Badge
              variant={allDone ? "default" : "secondary"}
              className="text-[10px]"
              data-testid="badge-onboarding-progress"
            >
              {completedCount}/3 complete
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
              data-testid="button-checklist-collapse"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => dismissMutation.mutate()}
              disabled={dismissMutation.isPending}
              aria-label="Dismiss checklist"
              data-testid="button-checklist-dismiss"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {!collapsed && (
          <div className="mt-2">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / 3) * 100}%` }}
                data-testid="progress-bar-onboarding"
              />
            </div>
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-2">
          {allDone ? (
            <div
              className="flex flex-col items-center justify-center py-6 text-center"
              data-testid="container-onboarding-complete"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold">You are all set!</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Your chatbot is live and ready to handle customer conversations.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => dismissMutation.mutate()}
                disabled={dismissMutation.isPending}
                data-testid="button-dismiss-complete"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Dismiss
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    step.completed
                      ? "bg-muted/30 border-border/40 opacity-70"
                      : "bg-muted/40 border-border/50"
                  }`}
                  data-testid={`checklist-step-${step.id}`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.completed ? "bg-emerald-500/10" : step.accentClass
                  }`}>
                    {step.completed ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                      {step.title}
                    </p>
                    {!step.completed && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                    {!step.completed && step.helpGuide && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                            data-testid={`link-help-${step.id}`}
                          >
                            <HelpCircle className="w-3 h-3" />
                            Learn how
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="start"
                          className="w-72 p-4"
                          data-testid={`popover-help-${step.id}`}
                        >
                          <p className="text-sm font-semibold mb-2">{step.helpGuide.title}</p>
                          <ol className="space-y-1.5 list-none">
                            {step.helpGuide.steps.map((text, i) => (
                              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[10px] mt-0.5">
                                  {i + 1}
                                </span>
                                <span>{text}</span>
                              </li>
                            ))}
                          </ol>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  {step.action && !step.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 gap-1.5 text-xs"
                      onClick={step.action.onClick}
                      disabled={widgetInstalledMutation.isPending}
                      data-testid={`button-step-action-${step.id}`}
                    >
                      {step.id === "install-widget" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {step.action.label}
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5" />
                          {step.action.label}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
