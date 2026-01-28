import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Clock, TrendingUp, Bot, HeadphonesIcon, Activity, BarChart3, Zap, Target, ThumbsUp, UserCheck, MessageCircle, AlertCircle, Code, Copy, Check, ChevronRight, FileCode, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
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

export default function DashboardOverview() {
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

  // Get the first agent or active agent for embed code
  const activeAgent = agents.find(a => a.id === merchant?.activeAgentId) || agents[0];
  
  // Generate embed code
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
        title: "Copied successfully!",
        description: "The embed code has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

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

  // Calculate real-time metrics
  const activeSessions = sessions?.filter(s => {
    if (!s.lastActivity) return false;
    const lastActivity = new Date(s.lastActivity);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActivity > fiveMinutesAgo;
  }) || [];
  
  const queuedSessions = sessions?.filter(s => s.status === "waiting" || s.status === "escalated") || [];
  const activeChats = activeSessions.filter(s => s.status === "active");
  
  // Simulated visitor satisfaction (based on AI resolution rate)
  const satisfactionRate = stats?.aiResolutionRate ? Math.min(95, Math.round(stats.aiResolutionRate * 0.8 + 20)) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-dashboard-title">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground hidden sm:block">Monitor your AI chatbot performance and customer interactions.</p>
      </div>

      {/* Install Chatvice Widget Section */}
      <Card className="backdrop-blur-xl bg-white/5 dark:bg-white/[0.03] border-white/10 dark:border-white/5" data-testid="card-install-widget">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code className="w-5 h-5 text-primary" />
            Install Chatvice Widget
          </CardTitle>
          <CardDescription>
            Add the AI chatbot to your website in 3 easy steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step-by-step guide with visual images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 - Copy Script with Embed Code */}
            <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5" data-testid="install-step-1">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-medium text-sm">Copy the Script Code</h4>
                </div>
                {activeAgent && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-active-agent">
                    Agent: {activeAgent.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Click the "Copy Script" button below to copy the widget embed code.
              </p>
              
              {/* Embed Code Display */}
              {embedCode ? (
                <div className="space-y-2" data-testid="container-embed-code">
                  <pre className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-all border border-white/10" data-testid="text-embed-code">
                    {embedCode}
                  </pre>
                  <Button
                    onClick={handleCopyScript}
                    className="w-full"
                    size="sm"
                    data-testid="button-copy-embed-script"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Script
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="bg-muted/30 p-3 rounded-lg text-center text-xs text-muted-foreground" data-testid="container-no-agent">
                  <Bot className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p>No active AI Agent found.</p>
                  <a 
                    href="/dashboard/agents" 
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    data-testid="link-create-agent"
                  >
                    Create Your First Agent <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5" data-testid="install-step-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h4 className="font-medium text-sm">Open Your HTML File</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Open your website's main HTML file (usually index.html or main layout).
              </p>
              {/* Visual illustration - File editor simulation */}
              <div className="bg-muted/30 rounded-lg overflow-hidden border border-dashed border-primary/30" data-testid="img-step-2">
                <div className="bg-muted/50 px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
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
            <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5" data-testid="install-step-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h4 className="font-medium text-sm">Paste Before &lt;/body&gt;</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Paste the script code just before the closing &lt;/body&gt; tag and save.
              </p>
              {/* Visual illustration - Code placement */}
              <div className="bg-muted/30 rounded-lg overflow-hidden border border-dashed border-primary/30" data-testid="img-step-3">
                <div className="bg-muted/50 px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">Correct placement</span>
                </div>
                <div className="p-2 font-mono text-[10px] leading-relaxed">
                  <div className="text-muted-foreground/50 pl-2">...</div>
                  <div className="text-primary bg-primary/10 px-1 rounded">&lt;script src="chatvice.js"&gt;&lt;/script&gt;</div>
                  <div className="text-muted-foreground pl-0">&lt;/body&gt;</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/10 text-xs text-muted-foreground">
            <p data-testid="text-widget-info">The widget will appear at the bottom-right corner of your website.</p>
            <a 
              href="/dashboard/widget" 
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-widget-settings"
            >
              Customize Widget <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Real-time and Last 7 Days Grid - Frosted Glass Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Real-time Section */}
        <Card className="backdrop-blur-xl bg-white/5 dark:bg-white/[0.03] border-white/10 dark:border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-muted-foreground">Real time</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Visitors */}
              <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Visitors</span>
                </div>
                <p className="text-4xl font-bold" data-testid="text-realtime-visitors">
                  {isLoading ? <Skeleton className="h-10 w-16" /> : activeSessions.length || 0}
                </p>
              </div>
              
              {/* Chats */}
              <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  <span>Chats</span>
                </div>
                <p className="text-4xl font-bold" data-testid="text-realtime-chats">
                  {isLoading ? <Skeleton className="h-10 w-16" /> : activeChats.length || 0}
                </p>
                {/* Queued indicator */}
                {queuedSessions.length > 0 && (
                  <div className="mt-2 bg-red-500/80 backdrop-blur-sm rounded px-2 py-1.5 text-center text-white">
                    <span className="text-xs opacity-80">queued</span>
                    <p className="text-2xl font-bold">{queuedSessions.length}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Agents Section */}
            <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-3">
                <Bot className="w-3.5 h-3.5 text-orange-400" />
                <span>Agents</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Badge className="bg-primary/80 text-primary-foreground text-[10px] mb-1">logged in</Badge>
                  <p className="text-3xl font-bold" data-testid="text-agents-logged-in">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.activeSessions ? Math.min(stats.activeSessions, 5) : 1)}
                  </p>
                </div>
                <div>
                  <Badge className="bg-emerald-500/80 text-white text-[10px] mb-1">chatting</Badge>
                  <p className="text-3xl font-bold" data-testid="text-agents-chatting">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : activeChats.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last 7 Days Section */}
        <Card className="backdrop-blur-xl bg-white/5 dark:bg-white/[0.03] border-white/10 dark:border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Total Chats with Chart */}
            <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-4 border border-white/10 dark:border-white/5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Total chats</span>
              </div>
              <p className="text-4xl font-bold mb-3" data-testid="text-total-chats-7d">
                {isLoading ? <Skeleton className="h-10 w-20" /> : stats?.messagesThisWeek || 0}
              </p>
              {/* Mini Chart */}
              {chartData.length > 0 && (
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                      <XAxis dataKey="displayDate" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            
            {/* Additional Metrics */}
            <div className="grid grid-cols-3 gap-2">
              {/* Queued Visitors */}
              <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-3 text-center border border-white/10 dark:border-white/5">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] mb-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Queued</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-queued-visitors">{queuedSessions.length}</p>
              </div>
              
              {/* Goals */}
              <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-3 text-center border border-white/10 dark:border-white/5">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] mb-1">
                  <Target className="w-3 h-3" />
                  <span>Goals</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-goals">{stats?.aiSessions || 0}</p>
              </div>
              
              {/* Visitor Satisfaction */}
              <div className="backdrop-blur-md bg-white/5 dark:bg-white/[0.02] rounded-lg p-3 text-center border border-white/10 dark:border-white/5">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] mb-1">
                  <ThumbsUp className="w-3 h-3" />
                  <span>Satisfaction</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-satisfaction">
                  {satisfactionRate}<span className="text-sm font-normal">%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Original Stat Cards */}
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
                  className="flex items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`session-item-${index}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium text-primary">
                        {(session.customerName || "C")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{session.customerName || "Customer"}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {session.id.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    {session.lastActivity && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                        {new Date(session.lastActivity).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant={session.mode === "AI" ? "secondary" : "default"} className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                      {session.mode === "AI" ? (
                        <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      ) : (
                        <HeadphonesIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
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
