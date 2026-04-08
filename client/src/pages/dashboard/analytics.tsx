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

  const { data: performanceAnalytics, isLoading: performanceLoading } = useQuery<PerformanceAnalytics>({
    queryKey: ["/api/analytics/performance", performancePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/performance?period=${performancePeriod}`);
      if (!res.ok) throw new Error("Failed to fetch performance analytics");
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
      title: "Total Sessions",
      value: analytics?.totalSessions || 0,
      icon: MessageSquare,
      change: "+12%",
      trend: "up",
    },
    {
      title: "AI Resolution Rate",
      value: `${analytics?.aiResolutionRate || 0}%`,
      icon: Bot,
      change: "+5%",
      trend: "up",
    },
    {
      title: "Avg Response Time (AI)",
      value: analytics?.avgResponseTimeAI || "1.2s",
      icon: Clock,
      change: "-0.3s",
      trend: "up",
    },
    {
      title: "Satisfaction Rate",
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
          <h1 className="text-2xl font-bold">{t("dashboard.analytics.title")}</h1>
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
          <Card key={index} data-testid={`stat-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
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
          <TabsTrigger value="performance">Response Times</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          {!canViewChatTopics ? (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Chat Topics Analytics</h3>
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
                <h3 className="font-semibold mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Chat topics will appear here once customers start conversations with your AI agent.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Top 20 Chat Topics</CardTitle>
                <CardDescription>Most frequently discussed topics by customers</CardDescription>
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
              <CardTitle>Popular Keywords with Popularity Ranking</CardTitle>
              <CardDescription>Most frequently used words in customer conversations with popularity level</CardDescription>
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
                  <h3 className="font-semibold mb-2">No keywords yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Keywords will appear here once customers start conversations with your AI agent.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Customer Locations
                </CardTitle>
                <CardDescription>
                  Geographic data from uploaded images ({locationAnalytics?.totalLocations || 0} locations tracked)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationAnalytics && locationAnalytics.totalLocations > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="text-sm text-muted-foreground">EXIF Data</span>
                        </div>
                        <p className="text-2xl font-bold">{locationAnalytics.sourceDistribution.exif}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-green-500" />
                          </div>
                          <span className="text-sm text-muted-foreground">GPS Browser</span>
                        </div>
                        <p className="text-2xl font-bold">{locationAnalytics.sourceDistribution.browser}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recent Locations</h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {locationAnalytics.recentLocations.map((loc, idx) => (
                          <a
                            key={idx}
                            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                            data-testid={`location-point-${idx}`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-red-500" />
                              <span>{loc.customerName || "Customer"}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {loc.source === 'exif' ? 'EXIF' : 'GPS'}
                            </Badge>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MapPin className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">No location data yet</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Location data will appear when customers upload images with GPS metadata.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Location Insights
                </CardTitle>
                <CardDescription>
                  Smart analysis and action recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {locationAnalytics && locationAnalytics.totalLocations > 0 ? (
                  <>
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Insight</h4>
                          <p className="text-sm text-muted-foreground">
                            {locationAnalytics.sourceDistribution.exif > locationAnalytics.sourceDistribution.browser 
                              ? "Most customers share photos with embedded location data (EXIF). This indicates they're using mobile devices with GPS enabled."
                              : "Customers prefer sharing browser-based location. Consider prompting for image uploads to get more precise location data."}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Action Suggestion</h4>
                          <p className="text-sm text-muted-foreground">
                            {locationAnalytics.totalLocations < 10 
                              ? "Encourage customers to share product photos to better understand your customer geography and optimize delivery/service areas."
                              : locationAnalytics.totalLocations < 50
                                ? "You're building a good location profile. Consider creating targeted promotions for your most active regions."
                                : "Excellent geographic coverage! Use this data to optimize inventory distribution and create location-based marketing campaigns."}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Analytics Summary</h4>
                          <p className="text-sm text-muted-foreground">
                            Tracked {locationAnalytics.totalLocations} customer locations. 
                            {locationAnalytics.sourceDistribution.exif > 0 && ` ${Math.round((locationAnalytics.sourceDistribution.exif / locationAnalytics.totalLocations) * 100)}% from photo metadata.`}
                            {locationAnalytics.sourceDistribution.browser > 0 && ` ${Math.round((locationAnalytics.sourceDistribution.browser / locationAnalytics.totalLocations) * 100)}% from browser GPS.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium mb-1">Getting Started</h4>
                        <p className="text-sm text-muted-foreground">
                          When customers upload images in chat, location data will be extracted automatically from photo metadata (EXIF) or browser GPS. This helps you understand your customer geography.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
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
                    <CardDescription>Messages handled per day</CardDescription>
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
                    <CardDescription>Average response time per day (seconds)</CardDescription>
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
                <CardTitle>Individual Performance</CardTitle>
                <CardDescription>Detailed breakdown by team member</CardDescription>
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
                <CardTitle>Response Times</CardTitle>
                <CardDescription>Average time to respond</CardDescription>
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
                <CardTitle>Chat Duration</CardTitle>
                <CardDescription>Average conversation length</CardDescription>
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
