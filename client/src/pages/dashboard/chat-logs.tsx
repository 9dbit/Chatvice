import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, Download, Calendar as CalendarIcon, MessageSquare, 
  Bot, HeadphonesIcon, Clock, User
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatLog } from "@shared/schema";

export default function ChatLogsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: chatLogs, isLoading } = useQuery<ChatLog[]>({
    queryKey: ["/api/chat-logs", selectedDate?.toISOString()],
    enabled: !!merchantId,
  });

  const handleDownload = async (logId: string) => {
    try {
      const response = await fetch(`/api/chat-logs/${logId}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-log-${logId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const filteredLogs = selectedDate 
    ? chatLogs?.filter(log => {
        const logDate = log.clearedAt ? new Date(log.clearedAt) : null;
        if (!logDate) return false;
        return logDate.toDateString() === selectedDate.toDateString();
      })
    : chatLogs;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            Chat Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Archived conversation history with downloadable transcripts
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
              data-testid="button-date-picker"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
            {selectedDate && (
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setSelectedDate(undefined)}
                  data-testid="button-clear-date"
                >
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Archived Conversations</CardTitle>
          <CardDescription>
            {selectedDate 
              ? `Logs from ${format(selectedDate, "MMMM d, yyyy")}`
              : "All archived chat logs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3 pr-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    data-testid={`chat-log-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {log.customerName || "Anonymous"}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {log.messageCount} messages
                          </Badge>
                          {log.supervisorId && (
                            <Badge variant="outline" className="text-xs">
                              <HeadphonesIcon className="w-3 h-3 mr-1" />
                              Escalated
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {log.summary}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {log.sessionStartedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Started: {format(new Date(log.sessionStartedAt), "MMM d, h:mm a")}
                            </span>
                          )}
                          {log.clearedAt && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Archived: {format(new Date(log.clearedAt), "MMM d, h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(log.id)}
                        className="flex-shrink-0"
                        data-testid={`button-download-${log.id}`}
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No chat logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDate 
                  ? "No archived conversations for this date"
                  : "Archived conversations will appear here after they expire based on your plan"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Chat Retention Policy</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chats are automatically archived based on your subscription plan:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>Free plan: 1 hour</li>
                <li>Starter plan: 12 hours</li>
                <li>Pro/Enterprise/Custom: 24 hours</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                All messages and knowledge are preserved in the archived logs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
