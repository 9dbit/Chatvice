import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, Clock, TrendingUp, Bot, HeadphonesIcon } from "lucide-react";
import type { Session } from "@shared/schema";

export default function DashboardOverview() {
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats", merchantId],
    enabled: !!merchantId,
  });

  const isLoading = sessionsLoading || statsLoading;

  const statCards = [
    {
      title: "Active Sessions",
      value: stats?.activeSessions ?? 0,
      icon: Users,
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "Messages Today",
      value: stats?.messagesToday ?? 0,
      icon: MessageSquare,
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      title: "AI Resolution Rate",
      value: `${stats?.aiResolutionRate ?? 85}%`,
      icon: Bot,
      change: "+2%",
      changeType: "positive" as const,
    },
    {
      title: "Avg Response Time",
      value: `${stats?.avgResponseTime ?? 1.2}s`,
      icon: Clock,
      change: "-0.3s",
      changeType: "positive" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor your AI chatbot performance and customer interactions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className={`text-xs ${stat.changeType === "positive" ? "text-status-online" : "text-destructive"}`}>
                    {stat.change} from yesterday
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
              <TrendingUp className="w-5 h-5 text-primary" />
              Performance Metrics
            </CardTitle>
            <CardDescription>AI vs Human handled conversations this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    AI Handled
                  </span>
                  <span className="font-medium">85%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <HeadphonesIcon className="w-4 h-4 text-chart-2" />
                    Human Escalated
                  </span>
                  <span className="font-medium">15%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-chart-2 rounded-full" style={{ width: "15%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Latest customer conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session, index) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`session-item-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {(session.customerName || "C")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session.customerName || "Customer"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {session.id.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant={session.mode === "AI" ? "secondary" : "default"}>
                      {session.mode === "AI" ? (
                        <Bot className="w-3 h-3 mr-1" />
                      ) : (
                        <HeadphonesIcon className="w-3 h-3 mr-1" />
                      )}
                      {session.mode}
                    </Badge>
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
    </div>
  );
}
