import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getMetricInfo } from "@/lib/metricGlossary";
import { Info } from "lucide-react";

interface MetricTooltipProps {
  metricKey: string;
  children: React.ReactNode;
  showIcon?: boolean;
}

export function MetricTooltip({ metricKey, children, showIcon = true }: MetricTooltipProps) {
  const info = getMetricInfo(metricKey);
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          {showIcon && (
            <Info className="h-3.5 w-3.5 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
          )}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4" side="top" align="start">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{info.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {info.description}
          </p>
          {info.unit && (
            <p className="text-xs text-muted-foreground/70">
              Unit: <span className="font-medium">{info.unit}</span>
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface MetricCardProps {
  metricKey: string;
  value: string | number;
  label?: string;
  trend?: number;
  className?: string;
}

export function MetricCard({ metricKey, value, label, trend, className }: MetricCardProps) {
  const info = getMetricInfo(metricKey);
  
  return (
    <div className={`p-4 rounded-lg border bg-card ${className || ''}`}>
      <MetricTooltip metricKey={metricKey}>
        <span className="text-sm font-medium text-muted-foreground">
          {label || info.title}
        </span>
      </MetricTooltip>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {info.unit && <span className="text-sm text-muted-foreground">{info.unit}</span>}
        {trend !== undefined && (
          <span className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
