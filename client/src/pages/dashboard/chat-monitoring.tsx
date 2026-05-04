import { useLanguage } from "@/hooks/use-language";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Eye,
  RefreshCw,
  Loader2,
  User,
  MessageSquare,
  Clock,
} from "lucide-react";

interface SupervisorMessage {
  id: string;
  sessionId: string;
  customerName: string;
  from: "supervisor" | "customer";
  content: string;
  timestamp: string;
}

interface SupervisorLog {
  supervisorId: string;
  supervisorName: string;
  supervisorEmail: string;
  status: string;
  messages: SupervisorMessage[];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    online: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Online" },
    away: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: "Away" },
    busy: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "Busy" },
    offline: { className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", label: "Offline" },
  };
  
  const variant = variants[status] || variants.offline;
  return <Badge className={variant.className} data-testid={`badge-status-${status}`}>{variant.label}</Badge>;
}

function formatDateTime(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function MessageItem({ message }: { message: SupervisorMessage }) {
  const { date, time } = formatDateTime(message.timestamp);
  const isSupervisor = message.from === "supervisor";
  
  return (
    <div 
      className={`p-3 rounded-lg border ${
        isSupervisor 
          ? "bg-primary/5 border-primary/20" 
          : "bg-muted/50 border-border"
      }`}
      data-testid={`message-${message.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Badge variant={isSupervisor ? "default" : "secondary"} className="text-xs">
            {isSupervisor ? "Supervisor" : message.customerName}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{date}</span>
          <span>{time}</span>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );
}

function SupervisorColumn({ log }: { log: SupervisorLog }) {
  return (
    <Card className="flex flex-col h-[500px]" data-testid={`column-supervisor-${log.supervisorId}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{log.supervisorName}</CardTitle>
              <p className="text-xs text-muted-foreground">{log.supervisorEmail}</p>
            </div>
          </div>
          <StatusBadge status={log.status} />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <MessageSquare className="w-3 h-3" />
          <span>{log.messages.length} messages</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {log.messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active conversations</p>
              </div>
            ) : (
              log.messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function ChatMonitoringPage() {
  const { t } = useLanguage();
  const { data: logs, isLoading, isError, refetch, isFetching } = useQuery<SupervisorLog[]>({
    queryKey: ["/api/chat-monitoring/logs"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: ["/api/chat-monitoring/logs"] });
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center" data-testid="loading-monitoring">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const supervisorData = logs || [];
  const activeSupervisors = supervisorData.filter(log => log.messages.length > 0);
  const inactiveSupervisors = supervisorData.filter(log => log.messages.length === 0);
  const sortedLogs = [...activeSupervisors, ...inactiveSupervisors];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t("dashboard.chatMonitoring.title")}</h1>
            <p className="text-muted-foreground">
              Realtime supervisor conversation logs
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>{logs?.filter(l => l.status === 'online').length || 0} Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>{logs?.filter(l => l.status === 'away').length || 0} Away</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>{logs?.filter(l => l.status === 'offline').length || 0} Offline</span>
        </div>
      </div>

      {sortedLogs.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t("dashboard.chatMonitoring.noSupervisors")}</h3>
            <p className="text-sm">{t("dashboard.chatMonitoring.noSupervisorsDesc")}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedLogs.map((log) => (
            <SupervisorColumn key={log.supervisorId} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
