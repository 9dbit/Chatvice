import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Clock,
  Users,
  Bot,
  HeadphonesIcon,
  Crown,
  ArrowUpRight,
  Sparkles,
  Search,
  Lock,
  MapPin,
  Lightbulb,
  Target,
  Zap,
  AlertTriangle,
  Star,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import type { Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

interface KeywordData {
  keyword: string;
  count: number;
  trend: "up" | "down" | "stable";
}

interface DetailedAnalytics {
  totalSessions: number;
  activeSessions: number;
  messagesToday: number;
  messagesThisWeek: number;
  aiSessions: number;
  humanSessions: number;
  aiResolutionRate: number;
  dailyMessageCounts: { date: string; count: number }[];
  avgResponseTime: number;
  chatTopics: { topic: string; count: number }[];
  popularKeywords: KeywordData[];
  avgChatDuration: string;
  avgResponseTimeAI: string;
  avgResponseTimeHuman: string;
  satisfactionRate: number;
  resolutionRate: number;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  source: 'exif' | 'browser';
  timestamp: string;
  sessionId: string;
  customerName: string;
}

interface LocationAnalytics {
  totalLocations: number;
  locationPoints: LocationPoint[];
  sourceDistribution: { exif: number; browser: number };
  recentLocations: LocationPoint[];
}

interface SessionLocationEntry {
  countryCode: string;
  countryName: string;
  count: number;
  percentage: number;
}

interface CityLocationEntry {
  cityName: string;
  countryCode: string;
  countryName: string;
  count: number;
  percentage: number;
}

interface SessionLocationAnalytics {
  totalSessions: number;
  sessionsWithGeo: number;
  byCountry: SessionLocationEntry[];
  byCity: CityLocationEntry[];
}

interface PerformanceData {
  id: string;
  name: string;
  photoUrl: string | null;
  type: "agent" | "supervisor";
  messagesHandled: number;
  avgResponseTime: number;
  avgResponseTimeFormatted: string;
  avgRating: number;
  totalRatings: number;
}

interface PerformanceAnalytics {
  period: string;
  agents: PerformanceData[];
  supervisors: PerformanceData[];
  dailyData: Array<{
    date: string;
    dateLabel: string;
    [key: string]: number | string;
  }>;
  comparison: {
    agents: {
      totalMessages: number;
      avgResponseTime: number;
      avgResponseTimeFormatted: string;
    };
    supervisors: {
      totalMessages: number;
      avgResponseTime: number;
      avgResponseTimeFormatted: string;
    };
  };
  needsUpgrade: boolean;
}

// Color palette for team members
const TEAM_COLORS = [
  "#3b82f6", // blue
  "#eab308", // yellow
  "#22c55e", // green
  "#f97316", // orange
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f43f5e", // rose
];

const CHART_COLORS = ["#6b5dfc", "#8b7dfc", "#ab9dfc", "#cbbdfc", "#ebddfc"];
const AGENT_COLOR = "#6b5dfc";
const SUPERVISOR_COLOR = "#22c55e";

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const [performancePeriod, setPerformancePeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: analytics, isLoading } = useQuery<DetailedAnalytics>({
    queryKey: ["/api/analytics/detailed"],
    refetchInterval: 30000,
  });

  const { data: locationAnalytics } = useQuery<LocationAnalytics>({
    queryKey: ["/api/analytics/locations"],
    refetchInterval: 60000,
  });

  const { data: sessionLocations } = useQuery<SessionLocationAnalytics>({
    queryKey: ["/api/analytics/session-locations"],
    refetchInterval: 60000,
  });

  const { data: performanceAnalytics, isLoading: performanceLoading } = useQuery<PerformanceAnalytics>({
    queryKey: ["/api/analytics/performance", performancePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/performance?period=${performancePeriod}`);
      if (!res.ok) throw new Error(t("dashboard.analytics.fetchFailed"));
      return res.json();
    },
    refetchInterval: 30000,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  const canViewChatTopics = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";
  const hasConversations = (analytics?.totalSessions || 0) > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const statsCards = [
    {
      title: t("dashboard.analytics.totalSessions"),
      value: analytics?.totalSessions || 0,
      icon: MessageSquare,
      change: "+12%",
      trend: "up",
    },
    {
      title: t("dashboard.analytics.aiResolutionRate"),
      value: `${analytics?.aiResolutionRate || 0}%`,
      icon: Bot,
      change: "+5%",
      trend: "up",
    },
    {
      title: t("dashboard.analytics.toast.avgResponseTimeAi"),
      value: analytics?.avgResponseTimeAI || "1.2s",
      icon: Clock,
      change: "-0.3s",
      trend: "up",
    },
    {
      title: t("dashboard.analytics.satisfactionRate"),
      value: `${analytics?.satisfactionRate || 0}%`,
      icon: TrendingUp,
      change: "+2%",
      trend: "up",
    },
  ];

  const pieData = [
    { name: "AI Handled", value: analytics?.aiSessions || 0 },
    { name: "Human Handled", value: analytics?.humanSessions || 0 },
  ];

  const keywordsWithPopularity: KeywordData[] = analytics?.popularKeywords || [];
  const maxKeywordCount = Math.max(...keywordsWithPopularity.map(k => k.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.analytics.title")}</h1>
          <p className="text-muted-foreground">
            Monitor your chatbot performance and customer insights.
          </p>
        </div>
        {!canViewChatTopics && (
          <Link href="/dashboard/plans">
            <Button data-testid="button-upgrade-analytics">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade for Chat Topics
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} data-testid={`stat-card-${index}`} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <span className={`font-medium ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {stat.change}
                </span>
                from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.analytics.messagesOverTime")}</CardTitle>
            <CardDescription>{t("dashboard.analytics.messagesOverTimeDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.dailyMessageCounts || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.analytics.aiVsHuman")}</CardTitle>
            <CardDescription>{t("dashboard.analytics.aiVsHumanDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="topics">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="topics" className="flex items-center gap-2">
            Chat Topics
            {!canViewChatTopics && <Lock className="w-3 h-3" />}
          </TabsTrigger>
          <TabsTrigger value="keywords">{t("dashboard.analytics.popularKeywords")}</TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="team-performance" className="flex items-center gap-2">
            <Users className="w-3 h-3" />
            Team Performance
          </TabsTrigger>
          <TabsTrigger value="performance">{t("dashboard.analytics.responseTimes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          {!canViewChatTopics ? (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t("dashboard.analytics.chatTopics")}</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Unlock detailed chat topic analysis to understand what your customers are asking about. Available on Pro and Enterprise plans.
                </p>
                <Link href="/dashboard/plans">
                  <Button data-testid="button-upgrade-topics">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : !hasConversations ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">{t("dashboard.analytics.noConversations")}</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Chat topics will appear here once customers start conversations with your AI agent.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.top20Topics")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.topicsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {(analytics?.chatTopics || []).slice(0, 20).map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {index + 1}.
                        </span>
                        <span className="font-medium">{topic.topic}</span>
                      </div>
                      <Badge variant="secondary">{topic.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.analytics.popularKeywords")}</CardTitle>
              <CardDescription>{t("dashboard.analytics.keywordsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {keywordsWithPopularity.length > 0 ? (
                <div className="space-y-3">
                  {keywordsWithPopularity.slice(0, 50).map((keywordData, index) => {
                    const popularityPercent = (keywordData.count / maxKeywordCount) * 100;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover-elevate"
                        data-testid={`keyword-row-${index}`}
                      >
                        <span className="text-sm font-medium text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{keywordData.keyword}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {keywordData.count} mentions
                              </Badge>
                              {keywordData.trend === "up" && (
                                <TrendingUp className="w-3 h-3 text-green-500" />
                              )}
                              {keywordData.trend === "down" && (
                                <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                              )}
                            </div>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${popularityPercent}%`,
                                background: `linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("dashboard.analytics.noKeywords")}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Keywords will appear here once customers start conversations with your AI agent.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{sessionLocations?.totalSessions ?? "—"}</div>
                  <p className="text-sm text-muted-foreground mt-1">Total Sessions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{sessionLocations?.sessionsWithGeo ?? "—"}</div>
                  <p className="text-sm text-muted-foreground mt-1">Sessions with Location</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {sessionLocations && sessionLocations.totalSessions > 0
                      ? `${Math.round((sessionLocations.sessionsWithGeo / sessionLocations.totalSessions) * 100)}%`
                      : "—"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Location Coverage</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* By Country */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4" />
                    By Country
                  </CardTitle>
                  <CardDescription>
                    {sessionLocations?.byCountry?.length ?? 0} countries detected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionLocations && sessionLocations.byCountry.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {sessionLocations.byCountry.map((entry, idx) => (
                        <div key={entry.countryCode} className="space-y-1" data-testid={`country-row-${idx}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={`https://flagcdn.com/16x12/${entry.countryCode}.png`}
                                alt={entry.countryName}
                                width={16}
                                height={12}
                                className="rounded-sm flex-shrink-0"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                              <span className="text-sm font-medium truncate">{entry.countryName}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm text-muted-foreground">{entry.count}</span>
                              <Badge variant="secondary" className="text-xs">
                                {entry.percentage}%
                              </Badge>
                            </div>
                          </div>
                          <Progress value={entry.percentage} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10">
                      <MapPin className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground text-center">
                        No location data yet. Location is tracked automatically from new chat sessions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By City */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4" />
                    By City
                  </CardTitle>
                  <CardDescription>
                    Top {Math.min(sessionLocations?.byCity?.length ?? 0, 50)} cities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionLocations && sessionLocations.byCity.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {sessionLocations.byCity.map((entry, idx) => (
                        <div key={`${entry.cityName}-${entry.countryCode}`} className="space-y-1" data-testid={`city-row-${idx}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={`https://flagcdn.com/16x12/${entry.countryCode}.png`}
                                alt={entry.countryName}
                                width={16}
                                height={12}
                                className="rounded-sm flex-shrink-0"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                              <div className="min-w-0">
                                <span className="text-sm font-medium">{entry.cityName}</span>
                                <span className="text-xs text-muted-foreground ml-1">{entry.countryName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm text-muted-foreground">{entry.count}</span>
                              <Badge variant="secondary" className="text-xs">
                                {entry.percentage}%
                              </Badge>
                            </div>
                          </div>
                          <Progress value={entry.percentage} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Target className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground text-center">
                        City data will appear as new sessions come in.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team-performance" className="mt-4">
          <div className="space-y-6">
            {/* Period Filter */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t("dashboard.analytics.performanceByAgent")}</h3>
                <p className="text-sm text-muted-foreground">Compare message handling and response times</p>
              </div>
              <Select value={performancePeriod} onValueChange={(v) => setPerformancePeriod(v as typeof performancePeriod)}>
                <SelectTrigger className="w-[140px]" data-testid="select-performance-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("dashboard.analytics.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("dashboard.analytics.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("dashboard.analytics.monthly")}</SelectItem>
                  <SelectItem value="yearly">{t("dashboard.analytics.yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upselling Alert if AI response time > 3s */}
            {performanceAnalytics?.needsUpgrade && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-600 dark:text-yellow-400">AI Response Time Alert</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Your AI agent's average response time exceeds 3 seconds. Upgrade your plan for faster AI processing and improved customer experience.
                  <Link href="/dashboard/plans">
                    <Button size="sm" className="ml-3" data-testid="button-upgrade-speed">
                      <Zap className="w-3 h-3 mr-1" />
                      Upgrade Now
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {/* Comparison Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    All AI Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t("dashboard.analytics.totalMessages")}</span>
                    <span className="text-2xl font-bold">{performanceAnalytics?.comparison.agents.totalMessages || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t("dashboard.analytics.avgResponseTime")}</span>
                    <span className="text-lg font-semibold">{performanceAnalytics?.comparison.agents.avgResponseTimeFormatted || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-green-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <HeadphonesIcon className="w-4 h-4 text-green-500" />
                    {t("dashboard.analytics.allSupervisors")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t("dashboard.analytics.totalMessages")}</span>
                    <span className="text-2xl font-bold">{performanceAnalytics?.comparison.supervisors.totalMessages || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t("dashboard.analytics.avgResponseTime")}</span>
                    <span className="text-lg font-semibold">{performanceAnalytics?.comparison.supervisors.avgResponseTimeFormatted || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Total Messages Time-Series Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("dashboard.analytics.totalMessages")}</CardTitle>
                    <CardDescription>{t("dashboard.analytics.messagesPerDay")}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[...(performanceAnalytics?.agents || []), ...(performanceAnalytics?.supervisors || [])].map((member, idx) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }} 
                        />
                        <span className="text-xs text-muted-foreground">{member.name}</span>
                        <span className="text-sm font-bold">{member.messagesHandled}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={performanceAnalytics?.dailyData || []}
                        margin={{ left: 0, right: 20, top: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="dateLabel" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        {[...(performanceAnalytics?.agents || []), ...(performanceAnalytics?.supervisors || [])].map((member, idx) => (
                          <Bar
                            key={member.id}
                            dataKey={member.type === "agent" ? `agent_${member.id}_messages` : `supervisor_${member.id}_messages`}
                            fill={TEAM_COLORS[idx % TEAM_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                            name={member.name}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Breakdown Table */}
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Series</th>
                          <th className="text-left p-2 font-medium">Member</th>
                          {(performanceAnalytics?.dailyData || []).map(d => (
                            <th key={d.date} className="text-center p-2 font-medium min-w-[60px]">{d.dateLabel}</th>
                          ))}
                          <th className="text-right p-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(performanceAnalytics?.agents || []), ...(performanceAnalytics?.supervisors || [])].map((member, idx) => (
                          <tr key={member.id} className="border-t">
                            <td className="p-2 text-muted-foreground">Messages</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  {member.photoUrl && <AvatarImage src={member.photoUrl} />}
                                  <AvatarFallback style={{ backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }} className="text-white text-[8px]">
                                    {member.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{member.name}</span>
                              </div>
                            </td>
                            {(performanceAnalytics?.dailyData || []).map(d => (
                              <td key={d.date} className="text-center p-2">
                                {d[member.type === "agent" ? `agent_${member.id}_messages` : `supervisor_${member.id}_messages`] || 0}
                              </td>
                            ))}
                            <td className="text-right p-2 font-medium">{member.messagesHandled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Time Time-Series Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Response Time</CardTitle>
                    <CardDescription>{t("dashboard.analytics.avgResponseTimeChart")}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[...(performanceAnalytics?.agents || []), ...(performanceAnalytics?.supervisors || [])].map((member, idx) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }} 
                        />
                        <span className="text-xs text-muted-foreground">{member.name}</span>
                        <span className="text-sm font-bold">{member.avgResponseTimeFormatted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={performanceAnalytics?.dailyData || []}
                        margin={{ left: 0, right: 20, top: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="dateLabel" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} unit="s" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value}s`, '']}
                        />
                        {[...(performanceAnalytics?.agents || []), ...(performanceAnalytics?.supervisors || [])].map((member, idx) => (
                          <Bar
                            key={member.id}
                            dataKey={member.type === "agent" ? `agent_${member.id}_responseTime` : `supervisor_${member.id}_responseTime`}
                            fill={TEAM_COLORS[idx % TEAM_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                            name={member.name}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Response Time Breakdown Table */}
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Series</th>
                          <th className="text-left p-2 font-medium">Member</th>
                          {(performanceAnalytics?.dailyData || []).map(d => (
                            <th key={d.date} className="text-center p-2 font-medium min-w-[60px]">{d.dateLabel}</th>
                          ))}
                          <th className="text-right p-2 font-medium">Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(performanceAnalytics?.agents || []), ...(performanceAnalytics?.supervisors || [])].map((member, idx) => (
                          <tr key={member.id} className="border-t">
                            <td className="p-2 text-muted-foreground">Response</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  {member.photoUrl && <AvatarImage src={member.photoUrl} />}
                                  <AvatarFallback style={{ backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }} className="text-white text-[8px]">
                                    {member.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{member.name}</span>
                              </div>
                            </td>
                            {(performanceAnalytics?.dailyData || []).map(d => {
                              const val = d[member.type === "agent" ? `agent_${member.id}_responseTime` : `supervisor_${member.id}_responseTime`];
                              return (
                                <td key={d.date} className="text-center p-2">
                                  {val ? `${val}s` : '-'}
                                </td>
                              );
                            })}
                            <td className="text-right p-2 font-medium">{member.avgResponseTimeFormatted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Performance List */}
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.individualPerformance")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.detailedBreakdown")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Agents Column */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      AI Agents
                    </h4>
                    <div className="space-y-2">
                      {(performanceAnalytics?.agents || []).length > 0 ? (
                        performanceAnalytics?.agents.map((agent) => (
                          <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`agent-performance-${agent.id}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {agent.photoUrl && <AvatarImage src={agent.photoUrl} alt={agent.name} />}
                                <AvatarFallback className="bg-primary/10">
                                  <Bot className="h-4 w-4 text-primary" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{agent.name}</p>
                                <p className="text-xs text-muted-foreground">{agent.messagesHandled} messages</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  <Star className={`h-3.5 w-3.5 ${agent.avgRating > 0 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                                  <span className="text-sm font-semibold">{agent.avgRating > 0 ? agent.avgRating.toFixed(1) : "-"}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{agent.totalRatings} ratings</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${agent.avgResponseTime > 3 ? "text-yellow-500" : "text-green-500"}`}>
                                  {agent.avgResponseTimeFormatted}
                                </p>
                                <p className="text-xs text-muted-foreground">avg response</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No agents found</p>
                      )}
                    </div>
                  </div>

                  {/* Supervisors Column */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <HeadphonesIcon className="w-4 h-4 text-green-500" />
                      {t("dashboard.supervisors.title")}
                    </h4>
                    <div className="space-y-2">
                      {(performanceAnalytics?.supervisors || []).length > 0 ? (
                        performanceAnalytics?.supervisors.map((supervisor) => (
                          <div key={supervisor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`supervisor-performance-${supervisor.id}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {supervisor.photoUrl && <AvatarImage src={supervisor.photoUrl} alt={supervisor.name} />}
                                <AvatarFallback className="bg-green-500/10">
                                  <HeadphonesIcon className="h-4 w-4 text-green-500" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{supervisor.name}</p>
                                <p className="text-xs text-muted-foreground">{supervisor.messagesHandled} messages</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  <Star className={`h-3.5 w-3.5 ${supervisor.avgRating > 0 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                                  <span className="text-sm font-semibold">{supervisor.avgRating > 0 ? supervisor.avgRating.toFixed(1) : "-"}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{supervisor.totalRatings} ratings</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-green-500">
                                  {supervisor.avgResponseTimeFormatted}
                                </p>
                                <p className="text-xs text-muted-foreground">avg response</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No supervisors found</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: AGENT_COLOR }} />
                <span className="text-muted-foreground">{t("dashboard.aiAgents")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: SUPERVISOR_COLOR }} />
                <span className="text-muted-foreground">{t("dashboard.supervisors.title")}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.responseTimes")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.avgTimeToRespond")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium">AI Response</span>
                    </div>
                    <span className="text-2xl font-bold">{analytics?.avgResponseTimeAI || "1.2s"}</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HeadphonesIcon className="w-4 h-4 text-primary" />
                      <span className="font-medium">Human Response</span>
                    </div>
                    <span className="text-2xl font-bold">{analytics?.avgResponseTimeHuman || "2m 15s"}</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.chatDuration")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.avgConversationLength")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-primary mx-auto mb-2" />
                    <p className="text-4xl font-bold">{analytics?.avgChatDuration || "4m 32s"}</p>
                    <p className="text-sm text-muted-foreground mt-1">Average duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
