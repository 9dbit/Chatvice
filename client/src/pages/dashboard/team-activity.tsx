import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Bot, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SupervisorActivity {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  status: string;
  lastSeen?: string;
  role?: string;
}

interface AgentActivity {
  id: string;
  name: string;
  photoUrl?: string;
  isActive: boolean;
}

interface TeamActivity {
  supervisors: SupervisorActivity[];
  agents: AgentActivity[];
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
  const { data: activity, isLoading } = useQuery<TeamActivity>({
    queryKey: ["/api/team/activity"],
    refetchInterval: 10000,
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Users className="w-6 h-6" />
          Team Activity
        </h1>
        <p className="text-muted-foreground">Monitor supervisor and AI agent activity in real-time</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Supervisor</CardDescription>
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
            <CardDescription>Total AI Agents</CardDescription>
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
            <CardDescription>Supervisor Online</CardDescription>
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
            <CardDescription>Supervisor Offline</CardDescription>
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
                        {supervisor.role && (
                          <Badge variant="outline" className="mt-2 text-xs">{supervisor.role}</Badge>
                        )}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
