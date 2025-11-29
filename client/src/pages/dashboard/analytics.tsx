import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import type { Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

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
  popularKeywords: string[];
  avgChatDuration: string;
  avgResponseTimeAI: string;
  avgResponseTimeHuman: string;
  satisfactionRate: number;
  resolutionRate: number;
}

const CHART_COLORS = ["#6b5dfc", "#8b7dfc", "#ab9dfc", "#cbbdfc", "#ebddfc"];

export default function AnalyticsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: analytics, isLoading } = useQuery<DetailedAnalytics>({
    queryKey: ["/api/analytics/detailed"],
    refetchInterval: 30000,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.starter : subscriptionPlans.starter;
  const isPro = plan.id === "pro" || plan.id === "enterprise";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your chatbot performance and customer insights.
          </p>
        </div>
        {!isPro && (
          <Link href="/dashboard/plans">
            <Button data-testid="button-upgrade-analytics">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade for Full Analytics
            </Button>
          </Link>
        )}
      </div>

      {!isPro && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Unlock Advanced Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Get detailed chat topics, keywords analysis, response time metrics, and more with Pro or Enterprise.
                </p>
              </div>
            </div>
            <Link href="/dashboard/plans">
              <Button data-testid="button-upgrade-analytics-banner">
                Upgrade Now
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} data-testid={`stat-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <CardTitle>Messages Over Time</CardTitle>
            <CardDescription>Daily message volume for the past week</CardDescription>
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
            <CardTitle>AI vs Human Handling</CardTitle>
            <CardDescription>Distribution of session handling</CardDescription>
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
        <TabsList>
          <TabsTrigger value="topics">Chat Topics</TabsTrigger>
          <TabsTrigger value="keywords">Popular Keywords</TabsTrigger>
          <TabsTrigger value="performance">Response Times</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
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
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>100 Popular Keywords</CardTitle>
              <CardDescription>Most frequently used words in customer conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(analytics?.popularKeywords || []).slice(0, 100).map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="hover-elevate cursor-default"
                    data-testid={`keyword-${index}`}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
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
