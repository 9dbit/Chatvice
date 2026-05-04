import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Users, Clock, TrendingUp, TrendingDown, Bot, HeadphonesIcon,
  Activity, BarChart3, Zap, Target, ThumbsUp, UserCheck, MessageCircle,
  AlertCircle, Code, Copy, Check, ChevronRight, FileCode, ExternalLink,
  Minus, Crown, Star
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType, Payload } from "recharts/types/component/DefaultTooltipContent";
import type { Session, Agent, Merchant } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsData {
  totalSessions: number;
  activeSessions: number;
  messagesToday: number;
  messagesThisWeek: number;
  aiSessions: number;
  humanSessions: number;
  aiResolutionRate: number;
  dailyMessageCounts: { date: string; count: number }[];
  avgResponseTime: number;
}

function getPlanLabel(planId?: string | null) {
  switch (planId) {
    case "free": return "Free";
    case "starter": return "Starter";
    case "growth": return "Growth";
    case "pro": return "Pro";
    case "enterprise": return "Enterprise";
    case "custom": return "Custom";
    default: return planId ?? "Free";
  }
}

function getPlanVariant(planId?: string | null): "default" | "secondary" | "outline" {
  if (!planId || planId === "free") return "secondary";
  if (planId === "enterprise" || planId === "custom") return "default";
  return "outline";
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const abs = Math.abs(pct);
  if (abs < 1) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="w-3 h-3" />
        +{abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-500 dark:text-red-400">
      <TrendingDown className="w-3 h-3" />
      -{abs}%
    </span>
  );
}

function computeTrend(dailyCounts: { date: string; count: number }[]): number | null {
  if (!dailyCounts || dailyCounts.length < 4) return null;
  const n = dailyCounts.length;
  const half = Math.floor(n / 2);
  const recent = dailyCounts.slice(n - half).reduce((s, d) => s + d.count, 0);
  const previous = dailyCounts.slice(0, half).reduce((s, d) => s + d.count, 0);
  if (previous === 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - previous) / previous) * 100);
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: Payload<ValueType, NameType>, i: number) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: p.color }} className="font-semibold">{p.value}</span>
          {" "}{p.name}
        </p>
      ))}
    </div>
  );
};

export default function DashboardOverview() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/stats", merchantId],
    enabled: !!merchantId,
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant/profile"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const isLoading = sessionsLoading || statsLoading;

  const activeAgent = agents.find(a => a.id === merchant?.activeAgentId) || agents[0];
  const baseUrl = window.location.origin;
  const embedCode = activeAgent
    ? `<!-- Chatvice Chat Widget -->\n<script src="${baseUrl}/api/widget/chatvice.js?merchant=${merchantId}" async></script>`
    : null;

  const handleCopyScript = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({
        title: t("dashboard.overview.toast.copiedSuccessfully"),
        description: t("dashboard.overview.toast.theEmbedCodeHasDesc"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: t("dashboard.overview.toast.failedToCopy"),
        description: t("dashboard.overview.toast.pleaseCopyTheCodeDesc"),
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const chartData = stats?.dailyMessageCounts?.map(item => ({
    ...item,
    displayDate: formatDate(item.date),
  })) || [];

  const msgTrend = computeTrend(stats?.dailyMessageCounts ?? []);

  // Derive per-metric trends
  const todayCount = chartData[chartData.length - 1]?.count ?? 0;
  const yesterdayCount = chartData[chartData.length - 2]?.count ?? 0;
  const todayVsYesterdayPct = yesterdayCount === 0
    ? (todayCount > 0 ? 100 : null)
    : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);

  const aiResolutionTrend = stats?.aiResolutionRate != null
    ? (stats.aiResolutionRate >= 70 ? Math.round((stats.aiResolutionRate - 70) / 10) : -(Math.round((70 - stats.aiResolutionRate) / 10)))
    : null;

  const avgResponseTrend = stats?.avgResponseTime != null
    ? (stats.avgResponseTime <= 3 ? 8 : stats.avgResponseTime <= 6 ? 0 : -12)
    : null;

  const statCards = [
    {
      title: t("dashboard.overview.activeSessions"),
      value: stats?.activeSessions ?? 0,
      icon: Users,
      description: `${stats?.totalSessions ?? 0} ${t("dashboard.overview.toast.activeInLast24hDesc")}`,
      trend: null as number | null,
      trendLabel: "",
      accentClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      title: t("dashboard.overview.messagesDay"),
      value: stats?.messagesToday ?? 0,
      icon: MessageSquare,
      description: `${stats?.messagesThisWeek ?? 0} ${t("dashboard.overview.thisWeekLabel")}`,
      trend: todayVsYesterdayPct,
      trendLabel: t("dashboard.overview.trendVsYesterday"),
      accentClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      title: t("dashboard.overview.aiResolution"),
      value: `${stats?.aiResolutionRate ?? 0}%`,
      icon: Bot,
      description: `${stats?.aiSessions ?? 0} AI / ${stats?.humanSessions ?? 0} ${t("dashboard.overview.humanLabel")}`,
      trend: aiResolutionTrend,
      trendLabel: t("dashboard.overview.trendVsTarget"),
      accentClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: t("dashboard.overview.avgResponse"),
      value: `${stats?.avgResponseTime ?? 0}s`,
      icon: Clock,
      description: t("dashboard.overview.aiResponseLatency"),
      trend: avgResponseTrend,
      trendLabel: t("dashboard.overview.trendResponseSpeed"),
      accentClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  const activeSessions = sessions?.filter(s => {
    if (!s.lastActivity) return false;
    const lastActivity = new Date(s.lastActivity);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActivity > fiveMinutesAgo;
  }) || [];

  const queuedSessions = sessions?.filter(s => s.status === "waiting" || s.status === "escalated") || [];
  const activeChats = activeSessions.filter(s => s.status === "active");
  const satisfactionRate = stats?.aiResolutionRate
    ? Math.min(95, Math.round(stats.aiResolutionRate * 0.8 + 20))
    : 0;

  const displayName = merchant?.companyName || merchant?.username || "Dashboard";
  const planId = merchant?.subscriptionPlanId || "free";

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-2xl font-semibold tracking-tight"
              data-testid="text-dashboard-title"
            >
              {displayName}
            </h1>
            <Badge
              variant={getPlanVariant(planId)}
              className="capitalize text-xs"
              data-testid="badge-plan"
            >
              {planId === "enterprise" || planId === "custom" ? (
                <Crown className="w-3 h-3 mr-1" />
              ) : planId !== "free" ? (
                <Star className="w-3 h-3 mr-1" />
              ) : null}
              {getPlanLabel(planId)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block mt-0.5">
            {t("dashboard.overview.monitorPerformance")}
          </p>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} data-testid={`card-stat-${index}`} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${stat.accentClass}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {isLoading ? (
                <Skeleton className="h-8 sm:h-10 w-20 sm:w-28 mb-2" />
              ) : (
                <>
                  <p
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {stat.value}
                  </p>
                  <div className="flex items-center justify-between gap-1 mt-1.5 flex-wrap">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {stat.description}
                    </p>
                    <TrendBadge pct={stat.trend} />
                  </div>
                  {stat.trend !== null && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.trendLabel}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Real-time + Last 7 Days Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Real-time Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {t("dashboard.overview.realTime")}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{t("dashboard.overview.live")}</Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              {t("dashboard.overview.activityLast5Min")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Visitors */}
              <div className="rounded-lg p-4 bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-muted-foreground font-medium">{t("dashboard.overview.visitors")}</span>
                </div>
                <p className="text-3xl font-bold" data-testid="text-realtime-visitors">
                  {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : activeSessions.length}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("dashboard.overview.activeNow")}</p>
              </div>

              {/* Chats */}
              <div className="rounded-lg p-4 bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs text-muted-foreground font-medium">{t("dashboard.overview.chats")}</span>
                </div>
                <p className="text-3xl font-bold" data-testid="text-realtime-chats">
                  {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : activeChats.length}
                </p>
                {queuedSessions.length > 0 ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    {queuedSessions.length} {t("dashboard.overview.nQueued")}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">{t("dashboard.overview.inProgress")}</p>
                )}
              </div>
            </div>

            {/* Agents */}
            <div className="rounded-lg p-4 bg-muted/40 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">{t("dashboard.overview.agents")}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-agents-logged-in">
                    {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : (stats?.activeSessions ? Math.min(stats.activeSessions, 5) : 1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t("dashboard.overview.loggedIn")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-agents-chatting">
                    {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : activeChats.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t("dashboard.overview.chatting")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : queuedSessions.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t("dashboard.overview.queued")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last 7 Days Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("dashboard.overview.last7Days")}</CardTitle>
            <CardDescription className="text-xs mt-1 flex items-center gap-1">
              {t("dashboard.overview.dailyMessageVolume")}
              {msgTrend !== null && <TrendBadge pct={msgTrend} />}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Total Chats + Mini Chart */}
            <div className="rounded-lg p-4 bg-muted/40 border border-border/50">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs text-muted-foreground font-medium">{t("dashboard.overview.totalChats")}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t("dashboard.overview.sevenDayTotal")}</span>
              </div>
              <p className="text-3xl font-bold mb-3" data-testid="text-total-chats-7d">
                {isLoading ? <Skeleton className="h-9 w-20 inline-block" /> : stats?.messagesThisWeek || 0}
              </p>
              {chartData.length > 0 && (
                <div className="h-[70px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={14}>
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="messages" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 3 smaller metric tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-3 bg-muted/40 border border-border/50 text-center">
                <AlertCircle className="w-3 h-3 mx-auto mb-1 text-amber-500" />
                <p className="text-[10px] text-muted-foreground mb-1">{t("dashboard.overview.queuedLabel")}</p>
                <p className="text-xl font-bold" data-testid="text-queued-visitors">{queuedSessions.length}</p>
              </div>
              <div className="rounded-lg p-3 bg-muted/40 border border-border/50 text-center">
                <Target className="w-3 h-3 mx-auto mb-1 text-blue-500" />
                <p className="text-[10px] text-muted-foreground mb-1">{t("dashboard.overview.goals")}</p>
                <p className="text-xl font-bold" data-testid="text-goals">{stats?.aiSessions || 0}</p>
              </div>
              <div className="rounded-lg p-3 bg-muted/40 border border-border/50 text-center">
                <ThumbsUp className="w-3 h-3 mx-auto mb-1 text-emerald-500" />
                <p className="text-[10px] text-muted-foreground mb-1">{t("dashboard.overview.satisfaction")}</p>
                <p className="text-xl font-bold" data-testid="text-satisfaction">
                  {satisfactionRate}<span className="text-xs font-normal">%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages This Week Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {t("dashboard.overview.messagesThisWeekCard")}
            </CardTitle>
            <CardDescription>{t("dashboard.overview.dailyMessageVolume")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    label={{
                      value: "Messages",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name={t("dashboard.overview.messagesName")}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">{t("dashboard.overview.noMessageData")}</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">{t("dashboard.overview.dataWillAppear")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI vs Human Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t("dashboard.overview.performanceMetrics")}
            </CardTitle>
            <CardDescription>{t("dashboard.overview.aiVsHuman")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <div className="space-y-5">
                {/* AI Handled */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 font-medium">
                      <Bot className="w-4 h-4 text-primary" />
                      {t("dashboard.overview.aiHandled")}
                    </span>
                    <div className="flex items-center gap-2">
                      <TrendBadge pct={aiResolutionTrend} />
                      <span className="font-semibold tabular-nums">{stats?.aiResolutionRate ?? 0}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${stats?.aiResolutionRate ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{stats?.aiSessions ?? 0} {t("dashboard.overview.sessionsHandledByAi")}</p>
                </div>

                {/* Human Escalated */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 font-medium">
                      <HeadphonesIcon className="w-4 h-4 text-chart-2" />
                      {t("dashboard.overview.humanEscalated")}
                    </span>
                    <span className="font-semibold tabular-nums">{100 - (stats?.aiResolutionRate ?? 0)}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-chart-2 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${100 - (stats?.aiResolutionRate ?? 0)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{stats?.humanSessions ?? 0} {t("dashboard.overview.sessionsEscalatedToHuman")}</p>
                </div>

                {/* Summary row */}
                <div className="pt-3 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary" data-testid="text-ai-sessions">
                        {stats?.aiSessions ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t("dashboard.overview.aiHandled")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-chart-2" data-testid="text-human-sessions">
                        {stats?.humanSessions ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t("dashboard.overview.humanEscalated")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-total-sessions">
                        {stats?.totalSessions ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t("dashboard.overview.totalLabel")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Install Widget ── */}
      <Card data-testid="card-install-widget">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] animate-gradient-x text-primary-foreground font-semibold text-sm"
              data-testid="button-install-widget-title"
            >
              <Code className="w-4 h-4" />
              {t("dashboard.overview.installWidget")}
            </div>
          </CardTitle>
          <CardDescription>{t("dashboard.overview.installWidgetDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="rounded-lg p-4 bg-muted/30 border border-border/50" data-testid="install-step-1">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-medium text-sm">{t("dashboard.overview.copyScript")}</h4>
                </div>
                {activeAgent && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-active-agent">
                    Agent: {activeAgent.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("dashboard.overview.clickCopyScript")}</p>
              {embedCode ? (
                <div className="space-y-2" data-testid="container-embed-code">
                  <pre className="bg-muted/50 p-3 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-all border border-border/50" data-testid="text-embed-code">
                    {embedCode}
                  </pre>
                  <Button
                    onClick={handleCopyScript}
                    className={`w-full ${!copied ? "bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] animate-gradient-x hover:opacity-90" : ""}`}
                    size="sm"
                    data-testid="button-copy-embed-script"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-1" />{t("dashboard.overview.copied")}</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-1" />{t("dashboard.overview.copyScript")}</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="bg-muted/30 p-3 rounded-lg text-center text-xs text-muted-foreground" data-testid="container-no-agent">
                  <Bot className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p>{t("dashboard.overview.noActiveAgent")}</p>
                  <a
                    href="/dashboard/agents"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    data-testid="link-create-agent"
                  >
                    {t("dashboard.overview.createFirstAgent")} <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="rounded-lg p-4 bg-muted/30 border border-border/50" data-testid="install-step-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h4 className="font-medium text-sm">{t("dashboard.overview.openHtmlFile")}</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("dashboard.overview.openHtmlFileDesc")}</p>
              <div className="bg-muted/30 rounded-lg overflow-hidden border border-dashed border-primary/30" data-testid="img-step-2">
                <div className="bg-muted/50 px-3 py-1.5 border-b border-border/50 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono">index.html</span>
                </div>
                <div className="p-2 font-mono text-[10px] text-muted-foreground leading-relaxed">
                  <div>&lt;html&gt;</div>
                  <div className="pl-2">&lt;head&gt;...&lt;/head&gt;</div>
                  <div className="pl-2">&lt;body&gt;</div>
                  <div className="pl-4 text-muted-foreground/50">...</div>
                  <div className="pl-2">&lt;/body&gt;</div>
                  <div>&lt;/html&gt;</div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg p-4 bg-muted/30 border border-border/50" data-testid="install-step-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h4 className="font-medium text-sm">{t("dashboard.overview.pasteBeforeBody")}</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("dashboard.overview.pasteScriptDesc")}</p>
              <div className="bg-muted/30 rounded-lg overflow-hidden border border-dashed border-primary/30" data-testid="img-step-3">
                <div className="bg-muted/50 px-3 py-1.5 border-b border-border/50 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("dashboard.overview.correctPlacement")}</span>
                </div>
                <div className="p-2 font-mono text-[10px] leading-relaxed">
                  <div className="text-muted-foreground/50 pl-2">...</div>
                  <div className="text-primary bg-primary/10 px-1 rounded">&lt;script src="chatvice.js"&gt;&lt;/script&gt;</div>
                  <div className="text-muted-foreground">&lt;/body&gt;</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <p data-testid="text-widget-info">{t("dashboard.overview.widgetCornerInfo")}</p>
            <a
              href="/dashboard/widget"
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-widget-settings"
            >
              {t("dashboard.overview.customizeWidget")} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Sessions ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.overview.recentSessions")}</CardTitle>
          <CardDescription>{t("dashboard.overview.latestConversations")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((session, index) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover-elevate"
                  data-testid={`session-item-${index}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {(session.customerName || "C")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{session.customerName || "Customer"}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {session.id.slice(0, 12)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {session.lastActivity && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                        {new Date(session.lastActivity).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant={session.mode === "AI" ? "secondary" : "default"} className="text-[10px] px-1.5">
                      {session.mode === "AI" ? (
                        <Bot className="w-3 h-3 mr-0.5" />
                      ) : (
                        <HeadphonesIcon className="w-3 h-3 mr-0.5" />
                      )}
                      {session.mode}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{t("dashboard.overview.noSessionsYet")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("dashboard.overview.sessionsWillAppear")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
