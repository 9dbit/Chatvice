import { useEffect, useState, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, BarChart, Bar } from "recharts";
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
  showGrid?: boolean;
}

export function RealtimeSparkline({ 
  metricKey, 
  color = "hsl(var(--primary))",
  height = 60,
  maxPoints = 30,
  updateInterval = 500,
  valueGenerator,
  showGrid = true
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
          <AreaChart data={data} margin={{ top: 5, right: 5, left: showGrid ? 30 : 0, bottom: showGrid ? 20 : 0 }}>
            <defs>
              <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            )}
            {showGrid && (
              <XAxis 
                dataKey="time" 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).split(':')[2]}
                interval={Math.floor(maxPoints / 5)}
              />
            )}
            {showGrid && (
              <YAxis 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={25}
                tickFormatter={(value) => value.toFixed(0)}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px'
              }}
              labelFormatter={(label) => new Date(label).toLocaleTimeString()}
              formatter={(value: number) => [value.toFixed(1), info.title]}
            />
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

interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  label?: string;
}

export function MiniSparkline({ 
  data, 
  color = "hsl(var(--primary))",
  width = 60,
  height = 24,
  label
}: MiniSparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));
  
  return (
    <div className="flex items-center gap-1">
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="label" 
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
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

interface SubscriptionBarChartProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function SubscriptionBarChart({
  title,
  data,
  height = 200,
  xAxisLabel = "Time",
  yAxisLabel = "Count"
}: SubscriptionBarChartProps) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="label" 
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: xAxisLabel, position: 'bottom', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={35}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface MultiSeriesBarChartProps {
  title: string;
  data: Record<string, any>[];
  series: { key: string; color: string; label: string }[];
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function MultiSeriesBarChart({
  title,
  data,
  series,
  height = 250,
  xAxisLabel = "Time",
  yAxisLabel = "Merchants"
}: MultiSeriesBarChartProps) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex flex-wrap gap-3">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="label" 
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: xAxisLabel, position: 'bottom', offset: 5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={35}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
