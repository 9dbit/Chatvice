import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  Palette,
  MessageSquare,
  Globe,
  BookOpen,
  Code,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Rocket,
  ArrowRight,
  BookOpenCheck,
  CircleCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import type { Agent, Merchant, MerchantDomain, Source, KnowledgeEntry } from "@shared/schema";
import {
  onboardingPhases,
  type OnboardingCheckpointId,
  type OnboardingPhase,
} from "@shared/onboarding-content";

interface GettingStartedChecklistProps {
  merchant: Merchant | null | undefined;
  agents: Agent[];
  hasReceivedMessage: boolean;
  disableAutoDismiss?: boolean;
}

const PHASE_ICONS: Record<OnboardingCheckpointId, React.ElementType> = {
  agent: Bot,
  "widget-settings": Palette,
  prechat: MessageSquare,
  domain: Globe,
  knowledge: BookOpen,
  deploy: Code,
};

const PHASE_ACCENTS: Record<OnboardingCheckpointId, string> = {
  agent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "widget-settings": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  prechat: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  domain: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  knowledge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  deploy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function GettingStartedChecklist({
  merchant,
  agents,
  hasReceivedMessage,
  disableAutoDismiss = false,
}: GettingStartedChecklistProps) {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [tutorialPhase, setTutorialPhase] = useState<OnboardingPhase | null>(null);
  const queryClient = useQueryClient();
  const autoDismissedRef = useRef(false);

  const merchantId = merchant?.id;

  // Auto-detection data
  const { data: domainsData } = useQuery<{ domains: MerchantDomain[] }>({
    queryKey: ["/api/merchant/domains"],
    enabled: !!merchantId,
  });
  const { data: sources = [] } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
    enabled: !!merchantId,
  });
  const { data: knowledgeEntries = [] } = useQuery<KnowledgeEntry[]>({
    queryKey: ["/api/knowledge-entries"],
    enabled: !!merchantId,
  });

  const hasAgent = agents.length > 0;
  const hasValidatedDomain = (domainsData?.domains || []).some((d) => d.isValidated);
  const hasKnowledge =
    (sources || []).some((s) => s.isActive !== false) ||
    (knowledgeEntries || []).some((e) => e.isActive !== false);

  const completionMap: Record<OnboardingCheckpointId, boolean> = {
    agent: hasAgent,
    "widget-settings": merchant?.onboardingWidgetInstalled ?? false,
    prechat: merchant?.onboardingPrechatConfigured ?? false,
    domain: hasValidatedDomain || (merchant?.onboardingDomainRegistered ?? false),
    knowledge: hasKnowledge || (merchant?.onboardingKnowledgeConfigured ?? false),
    deploy: hasReceivedMessage || (merchant?.onboardingDeployed ?? false),
  };

  const totalPhases = onboardingPhases.length;
  const completedCount = onboardingPhases.filter((p) => completionMap[p.id]).length;
  const allDone = completedCount === totalPhases;
  const dismissed = merchant?.onboardingDismissed ?? false;

  const dismissMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/merchant/onboarding/dismiss"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
    },
  });

  const completeCheckpointMutation = useMutation({
    mutationFn: (checkpointId: string) =>
      apiRequest("POST", `/api/merchant/onboarding/checkpoint/${checkpointId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
    },
  });

  const tutorialsViewed = merchant?.onboardingTutorialsViewed || [];
  const markTutorialViewedMutation = useMutation({
    mutationFn: (tutorialId: string) =>
      apiRequest("POST", `/api/merchant/onboarding/tutorial/${tutorialId}/viewed`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
    },
  });

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!merchant || dismissed || collapsed) return;
    const firstUnseen = onboardingPhases.find(
      (p) => !completionMap[p.id] && !tutorialsViewed.includes(p.id),
    );
    if (firstUnseen) {
      autoOpenedRef.current = true;
      setTutorialPhase(firstUnseen);
    }
  }, [merchant, dismissed, collapsed, tutorialsViewed.length]);

  function closeTutorial() {
    if (tutorialPhase && !tutorialsViewed.includes(tutorialPhase.id)) {
      markTutorialViewedMutation.mutate(tutorialPhase.id);
    }
    setTutorialPhase(null);
  }

  useEffect(() => {
    if (
      allDone &&
      !dismissed &&
      !disableAutoDismiss &&
      !autoDismissedRef.current &&
      !dismissMutation.isPending
    ) {
      autoDismissedRef.current = true;
      const timer = setTimeout(() => {
        dismissMutation.mutate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed, disableAutoDismiss]);

  if (dismissed) return null;

  const progressPct = (completedCount / totalPhases) * 100;

  return (
    <>
      <Card data-testid="card-getting-started">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                {t("dashboard.gettingStarted.title")}
              </CardTitle>
              <Badge
                variant={allDone ? "default" : "secondary"}
                className="text-[10px]"
                data-testid="badge-onboarding-progress"
              >
                {t("dashboard.gettingStarted.progress").replace("{done}", String(completedCount)).replace("{total}", String(totalPhases))}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? t("dashboard.gettingStarted.expandAria") : t("dashboard.gettingStarted.collapseAria")}
                data-testid="button-checklist-collapse"
              >
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => dismissMutation.mutate()}
                disabled={dismissMutation.isPending}
                aria-label={t("dashboard.gettingStarted.dismissAria")}
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
                  style={{ width: `${progressPct}%` }}
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
                <p className="text-sm font-semibold">{t("dashboard.gettingStarted.congrats")}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {t("dashboard.gettingStarted.liveMessage")}
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
                  {t("dashboard.gettingStarted.close")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {onboardingPhases.map((phase) => {
                  const Icon = PHASE_ICONS[phase.id];
                  const completed = completionMap[phase.id];
                  return (
                    <div
                      key={phase.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        completed
                          ? "bg-muted/30 border-border/40 opacity-70"
                          : "bg-muted/40 border-border/50"
                      }`}
                      data-testid={`checklist-step-${phase.id}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          completed ? "bg-emerald-500/10" : PHASE_ACCENTS[phase.id]
                        }`}
                      >
                        {completed ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            completed ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {t("dashboard.gettingStarted.phaseLabel").replace("{n}", String(phase.number)).replace("{title}", t(`dashboard.gettingStarted.phases.${phase.id}.title`))}
                        </p>
                        {!completed && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(`dashboard.gettingStarted.phases.${phase.id}.description`)}
                          </p>
                        )}
                        {!completed && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1 font-normal"
                              onClick={() => setTutorialPhase(phase)}
                              data-testid={`button-tutorial-${phase.id}`}
                            >
                              <BookOpenCheck className="w-3 h-3" />
                              {t("dashboard.gettingStarted.tutorial")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-primary gap-1 font-normal"
                              onClick={() => navigate(phase.deepLinkHref)}
                              data-testid={`button-deeplink-${phase.id}`}
                            >
                              <ArrowRight className="w-3 h-3" />
                              {t(`dashboard.gettingStarted.phases.${phase.id}.deepLinkLabel`)}
                            </Button>
                          </div>
                        )}
                      </div>
                      {!completed && phase.manualMarkable && phase.flagKey && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0 gap-1.5 text-xs"
                          onClick={() => completeCheckpointMutation.mutate(phase.id)}
                          disabled={completeCheckpointMutation.isPending}
                          data-testid={`button-mark-done-${phase.id}`}
                        >
                          <CircleCheck className="w-3.5 h-3.5" />
                          {t("dashboard.gettingStarted.markDone")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={tutorialPhase !== null} onOpenChange={(open) => !open && closeTutorial()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-tutorial">
          {tutorialPhase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <span
                    className={`w-7 h-7 rounded-md inline-flex items-center justify-center ${PHASE_ACCENTS[tutorialPhase.id]}`}
                  >
                    {(() => {
                      const Icon = PHASE_ICONS[tutorialPhase.id];
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </span>
                  {t("dashboard.gettingStarted.tutorialTitle").replace("{n}", String(tutorialPhase.number)).replace("{title}", t(`dashboard.gettingStarted.phases.${tutorialPhase.id}.title`))}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t(`dashboard.gettingStarted.phases.${tutorialPhase.id}.description`)}
                </DialogDescription>
              </DialogHeader>
              <ol className="space-y-3 mt-2">
                {tutorialPhase.tutorial.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3"
                    data-testid={`tutorial-step-${tutorialPhase.id}-${idx + 1}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold inline-flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t(`dashboard.gettingStarted.phases.${tutorialPhase.id}.tutorial.${idx}.title`)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {t(`dashboard.gettingStarted.phases.${tutorialPhase.id}.tutorial.${idx}.body`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-[11px] text-muted-foreground border-t pt-2 mt-3">
                {t(`dashboard.gettingStarted.phases.${tutorialPhase.id}.autoDetectHint`)}
              </p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeTutorial}
                  data-testid="button-tutorial-close"
                >
                  {t("dashboard.gettingStarted.close")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const href = tutorialPhase.deepLinkHref;
                    closeTutorial();
                    navigate(href);
                  }}
                  data-testid="button-tutorial-open-page"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  {t(`dashboard.gettingStarted.phases.${tutorialPhase.id}.deepLinkLabel`)}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
