import { useEffect, useState, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { MetricTooltip } from "./MetricTooltip";
import { getMetricInfo } from "@/lib/metricGlossary";

interface DataPoint {
  time: number;
  value: number;
}

interface RealtimeSparklineProps {
  metricKey: string;
  color?: string;
  height?: number;
  maxPoints?: number;
  updateInterval?: number;
  valueGenerator?: () => number;
}

export function RealtimeSparkline({ 
  metricKey, 
  color = "hsl(var(--primary))",
  height = 60,
  maxPoints = 30,
  updateInterval = 500,
  valueGenerator
}: RealtimeSparklineProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [currentValue, setCurrentValue] = useState(0);
  const intervalRef = useRef<number>();

  useEffect(() => {
    const initialData: DataPoint[] = [];
    for (let i = 0; i < maxPoints; i++) {
      initialData.push({
        time: Date.now() - (maxPoints - i) * updateInterval,
        value: valueGenerator ? valueGenerator() : Math.random() * 100
      });
    }
    setData(initialData);
    setCurrentValue(initialData[initialData.length - 1]?.value || 0);

    intervalRef.current = window.setInterval(() => {
      const newValue = valueGenerator ? valueGenerator() : Math.random() * 100;
      setCurrentValue(newValue);
      setData(prev => {
        const newData = [...prev.slice(1), { time: Date.now(), value: newValue }];
        return newData;
      });
    }, updateInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [maxPoints, updateInterval, valueGenerator]);

  const info = getMetricInfo(metricKey);

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <MetricTooltip metricKey={metricKey}>
          <span className="text-sm font-medium text-muted-foreground">{info.title}</span>
        </MetricTooltip>
        <span className="text-lg font-bold">
          {currentValue.toFixed(1)} {info.unit || ''}
        </span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${metricKey})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface GrowthChartData {
  label: string;
  value: number;
  previousValue?: number;
}

interface GrowthAreaChartProps {
  title: string;
  metricKey: string;
  data: GrowthChartData[];
  color?: string;
  height?: number;
  showComparison?: boolean;
}

export function GrowthAreaChart({
  title,
  metricKey,
  data,
  color = "hsl(var(--primary))",
  height = 200,
  showComparison = false
}: GrowthAreaChartProps) {
  const info = getMetricInfo(metricKey);
  const latestValue = data[data.length - 1]?.value || 0;
  const previousValue = data[data.length - 2]?.value || latestValue;
  const growthPercent = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <MetricTooltip metricKey={metricKey}>
          <span className="text-sm font-medium">{title}</span>
        </MetricTooltip>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{latestValue.toLocaleString()}</span>
          {info.unit && <span className="text-sm text-muted-foreground">{info.unit}</span>}
          <span className={`text-sm ${growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`growth-gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [value.toLocaleString(), info.title]}
            />
            {showComparison && (
              <Area
                type="monotone"
                dataKey="previousValue"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
                fill="none"
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#growth-gradient-${metricKey})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
