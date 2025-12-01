import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, Clock, TrendingUp, Bot, HeadphonesIcon, Activity, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { Session } from "@shared/schema";

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

export default function DashboardOverview() {
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/stats", merchantId],
    enabled: !!merchantId,
  });

  const isLoading = sessionsLoading || statsLoading;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const chartData = stats?.dailyMessageCounts?.map(item => ({
    ...item,
    displayDate: formatDate(item.date),
  })) || [];

  const statCards = [
    {
      title: "Active Sessions",
      value: stats?.activeSessions ?? 0,
      total: stats?.totalSessions ?? 0,
      icon: Users,
      description: "Active in last 24h",
    },
    {
      title: "Messages Today",
      value: stats?.messagesToday ?? 0,
      total: stats?.messagesThisWeek ?? 0,
      icon: MessageSquare,
      description: `${stats?.messagesThisWeek ?? 0} this week`,
    },
    {
      title: "AI Resolution Rate",
      value: `${stats?.aiResolutionRate ?? 0}%`,
      total: null,
      icon: Bot,
      description: `${stats?.aiSessions ?? 0} AI / ${stats?.humanSessions ?? 0} Human`,
    },
    {
      title: "Avg Response Time",
      value: `${stats?.avgResponseTime ?? 0}s`,
      total: null,
      icon: Clock,
      description: "AI response latency",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-dashboard-title">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground hidden sm:block">Monitor your AI chatbot performance and customer interactions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 sm:gap-2 pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
              ) : (
                <>
                  <p className="text-lg sm:text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Messages This Week
            </CardTitle>
            <CardDescription>Daily message volume over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="displayDate" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Messages"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No message data yet</p>
                  <p className="text-sm">Data will appear when customers start chatting</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Performance Metrics
            </CardTitle>
            <CardDescription>AI vs Human handled conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      AI Handled
                    </span>
                    <span className="font-medium">{stats?.aiResolutionRate ?? 0}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${stats?.aiResolutionRate ?? 0}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2">
                      <HeadphonesIcon className="w-4 h-4 text-chart-2" />
                      Human Escalated
                    </span>
                    <span className="font-medium">{100 - (stats?.aiResolutionRate ?? 0)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-chart-2 rounded-full transition-all duration-500" 
                      style={{ width: `${100 - (stats?.aiResolutionRate ?? 0)}%` }} 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary" data-testid="text-ai-sessions">{stats?.aiSessions ?? 0}</p>
                      <p className="text-xs text-muted-foreground">AI Sessions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-chart-2" data-testid="text-human-sessions">{stats?.humanSessions ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Human Sessions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Latest customer conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.slice(0, 8).map((session, index) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`session-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {(session.customerName || "C")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.customerName || "Customer"}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {session.id.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {session.lastActivity && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.lastActivity).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant={session.mode === "AI" ? "secondary" : "default"}>
                      {session.mode === "AI" ? (
                        <Bot className="w-3 h-3 mr-1" />
                      ) : (
                        <HeadphonesIcon className="w-3 h-3 mr-1" />
                      )}
                      {session.mode}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No sessions yet</p>
              <p className="text-sm text-muted-foreground">
                Sessions will appear when customers start chatting
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
