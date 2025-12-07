import { useState } from "react";
import { X, Crown, Users, Bot, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface PlanLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueManual?: () => void;
  limitType: "agent" | "supervisor" | "conversation" | "source";
  currentPlan: string;
  currentLimit: number;
}

export function PlanLimitPopup({
  isOpen,
  onClose,
  onContinueManual,
  limitType,
  currentPlan,
  currentLimit,
}: PlanLimitPopupProps) {
  if (!isOpen) return null;

  const limitConfig = {
    agent: {
      icon: Bot,
      title: "AI Agent Limit Reached",
      description: `You've reached the maximum of ${currentLimit} AI agent${currentLimit !== 1 ? 's' : ''} on your ${currentPlan} plan.`,
      showManualOption: true,
      manualText: "Continue without AI Agent",
      manualDescription: "Your supervisors can still handle chats manually",
    },
    supervisor: {
      icon: Users,
      title: "Supervisor Limit Reached",
      description: `You've reached the maximum of ${currentLimit} supervisor${currentLimit !== 1 ? 's' : ''} on your ${currentPlan} plan.`,
      showManualOption: false,
      manualText: "",
      manualDescription: "",
    },
    conversation: {
      icon: AlertTriangle,
      title: "Conversation Limit Reached",
      description: `You've used all ${currentLimit} conversations available on your ${currentPlan} plan this month.`,
      showManualOption: true,
      manualText: "Continue with Manual Support",
      manualDescription: "Supervisors can still respond to customers",
    },
    source: {
      icon: AlertTriangle,
      title: "Knowledge Source Limit Reached",
      description: `You've reached the maximum of ${currentLimit} knowledge source${currentLimit !== 1 ? 's' : ''} on your ${currentPlan} plan.`,
      showManualOption: false,
      manualText: "",
      manualDescription: "",
    },
  };

  const config = limitConfig[limitType];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          data-testid="button-close-limit-popup"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 backdrop-blur-sm">
            <Icon className="h-8 w-8 text-amber-400" />
          </div>

          <h2 className="mb-2 text-xl font-bold text-white">
            {config.title}
          </h2>

          <p className="mb-6 text-sm text-white/70">
            {config.description}
          </p>

          <div className="flex w-full flex-col gap-3">
            <Link href="/dashboard/plans">
              <Button 
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25"
                data-testid="button-upgrade-plan"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>

            {config.showManualOption && onContinueManual && (
              <Button
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
                onClick={() => {
                  onContinueManual();
                  onClose();
                }}
                data-testid="button-continue-manual"
              >
                {config.manualText}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full text-white/60 hover:text-white hover:bg-white/5"
              onClick={onClose}
              data-testid="button-dismiss-limit"
            >
              Maybe Later
            </Button>
          </div>

          {config.showManualOption && (
            <p className="mt-4 text-xs text-white/50">
              {config.manualDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function usePlanLimitPopup() {
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    limitType: "agent" | "supervisor" | "conversation" | "source";
    currentPlan: string;
    currentLimit: number;
    onContinueManual?: () => void;
  }>({
    isOpen: false,
    limitType: "agent",
    currentPlan: "Free",
    currentLimit: 0,
  });

  const showLimitPopup = (
    limitType: "agent" | "supervisor" | "conversation" | "source",
    currentPlan: string,
    currentLimit: number,
    onContinueManual?: () => void
  ) => {
    setPopupState({
      isOpen: true,
      limitType,
      currentPlan,
      currentLimit,
      onContinueManual,
    });
  };

  const closeLimitPopup = () => {
    setPopupState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    popupState,
    showLimitPopup,
    closeLimitPopup,
  };
}
