import { Info, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  title: string;
  description: string;
  nextStep?: string;
  id?: string;
}

export function InfoTooltip({ title, description, nextStep, id = "default" }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted hover-elevate text-muted-foreground"
          data-testid={`button-info-tooltip-${id}`}
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs p-3">
        <div className="space-y-2">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {nextStep && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Next: {nextStep}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface StepIndicatorProps {
  step: number;
  title: string;
  description: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export function StepIndicator({ step, title, description, isActive, isCompleted }: StepIndicatorProps) {
  return (
    <div className={`flex gap-3 p-3 rounded-lg transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" : isCompleted ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50"}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${isActive ? "bg-blue-600 text-white" : isCompleted ? "bg-green-600 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
        {isCompleted ? <Check className="w-4 h-4" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isActive ? "text-blue-700 dark:text-blue-300" : ""}`}>{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
