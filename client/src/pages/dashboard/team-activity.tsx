import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Bot, Clock, CheckCircle, AlertCircle, XCircle, Calendar, BarChart3, Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface SupervisorActivity {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  status: string;
  lastSeen?: string;
  role?: string;
  assignedShift?: string | null;
  isOnShift?: boolean;
}

interface AgentActivity {
  id: string;
  name: string;
  photoUrl?: string;
  isActive: boolean;
  assignedShift?: string | null;
  isOnShift?: boolean;
}

interface TeamActivity {
  supervisors: SupervisorActivity[];
  agents: AgentActivity[];
}

interface SupervisorPerformanceMetrics {
  totalChatsHandled: number;
  escalationsReceived: number;
  sessionsResolved: number;
  resolutionRate: number | null;
  averageRating: number | null;
  ratedSessionsCount: number;
}

interface SupervisorPerformance {
  supervisorId: string;
  supervisorName: string;
  supervisorEmail: string;
  photoUrl?: string;
  status: string;
  metrics: SupervisorPerformanceMetrics;
}

interface PerformanceData {
  supervisors: SupervisorPerformance[];
  summary: {
    totalSupervisors: number;
    totalChatsHandled: number;
    averageRating: number | null;
  };
}

function getStatusBadge(status: string) {
  switch (status) {
    case "online":
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    case "busy":
      return <Badge variant="default" className="bg-amber-500">Busy</Badge>;
    case "away":
      return <Badge variant="secondary">Away</Badge>;
    default:
      return <Badge variant="outline">Offline</Badge>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "online":
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case "busy":
      return <AlertCircle className="w-3 h-3 text-amber-500" />;
    case "away":
      return <Clock className="w-3 h-3 text-muted-foreground" />;
    default:
      return <XCircle className="w-3 h-3 text-muted-foreground" />;
  }
}

export default function TeamActivityPage() {
  const { t } = useLanguage();
  const { data: activity, isLoading } = useQuery<TeamActivity>({
    queryKey: ["/api/team/activity"],
    refetchInterval: 10000,
  });

  const { data: performanceData, isLoading: perfLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/team/supervisor-performance"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const supervisors = activity?.supervisors || [];
  const agents = activity?.agents || [];

  const onlineSupervisors = supervisors.filter(s => s.status === "online").length;
  const activeAgents = agents.filter(a => a.isActive).length;
  const supervisorsOnShift = supervisors.filter(s => s.isOnShift).length;
  const agentsOnShift = agents.filter(a => a.isOnShift).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Users className="w-6 h-6" />
          {t("dashboard.teamActivity.title")}
        </h1>
        <p className="text-muted-foreground">Monitor supervisor and AI agent activity in real-time</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.teamActivity.totalSupervisors")}</CardDescription>
            <CardTitle className="text-3xl">{supervisors.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium">{onlineSupervisors}</span> online now
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.teamActivity.totalAgents")}</CardDescription>
            <CardTitle className="text-3xl">{agents.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium">{activeAgents}</span> active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.teamActivity.onShift")}</CardDescription>
            <CardTitle className="text-3xl text-green-500">{supervisorsOnShift + agentsOnShift}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{supervisorsOnShift}</span> supervisors, <span className="font-medium">{agentsOnShift}</span> agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.teamActivity.supervisorOnline")}</CardDescription>
            <CardTitle className="text-3xl text-green-500">{onlineSupervisors}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Ready to handle escalations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.teamActivity.supervisorOffline")}</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">{supervisors.length - onlineSupervisors}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Not available
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="supervisors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="supervisors" className="flex items-center gap-2" data-testid="tab-supervisors">
            <Users className="w-4 h-4" />
            Supervisors ({supervisors.length})
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2" data-testid="tab-agents">
            <Bot className="w-4 h-4" />
            AI Agents ({agents.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2" data-testid="tab-performance">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supervisors" className="space-y-4">
          {supervisors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No supervisors yet</h3>
                <p className="text-muted-foreground">Add supervisors in the Supervisors page</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {supervisors.map((supervisor) => (
                <Card key={supervisor.id} data-testid={`card-supervisor-${supervisor.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={supervisor.photoUrl} />
                          <AvatarFallback>
                            {supervisor.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${
                          supervisor.status === "online" ? "bg-green-500" :
                          supervisor.status === "busy" ? "bg-amber-500" :
                          supervisor.status === "away" ? "bg-yellow-500" : "bg-gray-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">{supervisor.name}</h3>
                          {getStatusBadge(supervisor.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{supervisor.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {supervisor.role && (
                            <Badge variant="outline" className="text-xs">{supervisor.role}</Badge>
                          )}
                          {supervisor.assignedShift && (
                            <Badge 
                              variant={supervisor.isOnShift ? "default" : "secondary"} 
                              className={`text-xs flex items-center gap-1 ${supervisor.isOnShift ? "bg-green-500" : ""}`}
                            >
                              <Calendar className="w-3 h-3" />
                              {supervisor.assignedShift}
                              {supervisor.isOnShift && " (On Shift)"}
                            </Badge>
                          )}
                        </div>
                        {supervisor.lastSeen && supervisor.status !== "online" && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last active {formatDistanceToNow(new Date(supervisor.lastSeen), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No AI agents yet</h3>
                <p className="text-muted-foreground">Create AI agents in the Agents page</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Card key={agent.id} data-testid={`card-agent-${agent.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={agent.photoUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Bot className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${
                          agent.isActive ? "bg-green-500" : "bg-gray-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">{agent.name}</h3>
                          <Badge variant={agent.isActive ? "default" : "secondary"}>
                            {agent.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">AI Agent</p>
                        {agent.assignedShift && (
                          <Badge 
                            variant={agent.isOnShift ? "default" : "secondary"} 
                            className={`text-xs flex items-center gap-1 mt-2 w-fit ${agent.isOnShift ? "bg-green-500" : ""}`}
                          >
                            <Calendar className="w-3 h-3" />
                            {agent.assignedShift}
                            {agent.isOnShift && " (On Shift)"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {perfLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded w-1/4 mx-auto" />
                  <div className="h-32 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ) : !performanceData?.supervisors?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No performance data yet</h3>
                <p className="text-muted-foreground">Performance metrics will appear after supervisors handle chats</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Performance Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card data-testid="card-total-chats">
                  <CardHeader className="pb-2">
                    <CardDescription>Total Chats Handled</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <MessageSquare className="w-6 h-6 text-foreground" />
                      <span data-testid="text-total-chats">{performanceData.summary.totalChatsHandled}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      By {performanceData.summary.totalSupervisors} supervisors
                    </p>
                  </CardContent>
                </Card>
                <Card data-testid="card-average-rating">
                  <CardHeader className="pb-2">
                    <CardDescription>Average Rating</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <Star className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                      <span data-testid="text-average-rating">{performanceData.summary.averageRating?.toFixed(1) || "N/A"}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Team average customer rating
                    </p>
                  </CardContent>
                </Card>
                <Card data-testid="card-active-supervisors">
                  <CardHeader className="pb-2">
                    <CardDescription>Active Supervisors</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      <span data-testid="text-active-supervisors">{performanceData.supervisors.filter(s => s.status === "online").length}/{performanceData.summary.totalSupervisors}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Currently online
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Individual Supervisor Performance */}
              <Card data-testid="card-individual-performance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Individual Performance
                  </CardTitle>
                  <CardDescription>Performance metrics for each supervisor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceData.supervisors.map((supervisor) => (
                      <div key={supervisor.supervisorId} className="p-4 border rounded-md" data-testid={`perf-supervisor-${supervisor.supervisorId}`}>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={supervisor.photoUrl} />
                            <AvatarFallback>
                              {supervisor.supervisorName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                              <div>
                                <h4 className="font-medium" data-testid={`text-name-${supervisor.supervisorId}`}>{supervisor.supervisorName}</h4>
                                <p className="text-sm text-muted-foreground">{supervisor.supervisorEmail}</p>
                              </div>
                              <Badge variant={supervisor.status === "online" ? "default" : "secondary"} data-testid={`badge-status-${supervisor.supervisorId}`}>
                                {supervisor.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Chats Handled</p>
                                <p className="text-lg font-semibold flex items-center gap-1" data-testid={`text-chats-${supervisor.supervisorId}`}>
                                  <MessageSquare className="w-4 h-4 text-foreground" />
                                  {supervisor.metrics.totalChatsHandled}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Resolution Rate</p>
                                <div className="flex items-center gap-2" data-testid={`text-resolution-${supervisor.supervisorId}`}>
                                  <p className="text-lg font-semibold">
                                    {supervisor.metrics.resolutionRate !== null ? `${supervisor.metrics.resolutionRate}%` : "N/A"}
                                  </p>
                                  {supervisor.metrics.resolutionRate !== null && (
                                    <Progress value={supervisor.metrics.resolutionRate} className="w-16 h-2" />
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Rating</p>
                                <p className="text-lg font-semibold flex items-center gap-1" data-testid={`text-rating-${supervisor.supervisorId}`}>
                                  <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                  {supervisor.metrics.averageRating !== null 
                                    ? `${supervisor.metrics.averageRating}/5` 
                                    : "N/A"}
                                  {supervisor.metrics.ratedSessionsCount > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      ({supervisor.metrics.ratedSessionsCount})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
