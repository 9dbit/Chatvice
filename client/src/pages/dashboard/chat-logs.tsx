import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Calendar as CalendarIcon, MessageSquare, 
  Bot, HeadphonesIcon, Clock, User, Mail, Phone, CreditCard,
  Wallet, Building2, MapPin, ChevronRight, Eye, Filter, X,
  Target, UserCheck, UserX, UserPlus, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatLog } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface BankRecord {
  type: 'bank' | 'ewallet' | 'creditcard';
  name: string;
  number: string;
}

interface LocationDataItem {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  source: 'exif' | 'browser';
}

const leadStatusConfig = {
  new: { label: "New Lead", color: "bg-blue-500", icon: UserPlus },
  contacted: { label: "Contacted", color: "bg-yellow-500", icon: Phone },
  qualified: { label: "Qualified", color: "bg-purple-500", icon: Target },
  converted: { label: "Converted", color: "bg-green-500", icon: UserCheck },
  lost: { label: "Lost", color: "bg-red-500", icon: UserX },
};

export default function ChatLogsPage() {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [filterLeadStatus, setFilterLeadStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: chatLogs, isLoading } = useQuery<ChatLog[]>({
    queryKey: ["/api/chat-logs", selectedDate?.toISOString()],
    enabled: !!merchantId,
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ logId, status }: { logId: string; status: string }) => {
      return apiRequest("PATCH", `/api/chat-logs/${logId}/lead-status`, { leadStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-logs"] });
    },
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

  const filteredLogs = chatLogs?.filter(log => {
    let matches = true;
    
    if (selectedDate) {
      const logDate = log.clearedAt ? new Date(log.clearedAt) : null;
      if (!logDate || logDate.toDateString() !== selectedDate.toDateString()) {
        matches = false;
      }
    }
    
    if (filterLeadStatus !== "all" && log.leadStatus !== filterLeadStatus) {
      matches = false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        (log.customerName?.toLowerCase().includes(query)) ||
        (log.customerEmail?.toLowerCase().includes(query)) ||
        (log.customerPhone?.toLowerCase().includes(query)) ||
        (log.summary?.toLowerCase().includes(query));
      if (!matchesSearch) matches = false;
    }
    
    return matches;
  }) || [];

  const renderBankRecords = (records: BankRecord[] | null | undefined) => {
    if (!records || !Array.isArray(records) || records.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Payment Methods</Label>
        <div className="space-y-2">
          {records.map((record, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
              {record.type === 'bank' && <Building2 className="w-4 h-4 text-blue-500" />}
              {record.type === 'ewallet' && <Wallet className="w-4 h-4 text-green-500" />}
              {record.type === 'creditcard' && <CreditCard className="w-4 h-4 text-purple-500" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{record.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{record.number}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLocationData = (locations: LocationDataItem[] | null | undefined) => {
    if (!locations || !Array.isArray(locations) || locations.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Location History</Label>
        <div className="space-y-2">
          {locations.map((loc, idx) => (
            <a
              key={idx}
              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm hover:bg-muted transition-colors"
              data-testid={`link-location-${idx}`}
            >
              <MapPin className="w-4 h-4 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {loc.city && loc.country ? `${loc.city}, ${loc.country}` : 'View on Map'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)} ({loc.source === 'exif' ? 'EXIF' : 'GPS'})
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            {t("dashboard.chatLogs.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer conversation history with contact details and lead management
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Customer Conversations</CardTitle>
              <CardDescription>
                {filteredLogs.length} conversation{filteredLogs.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px] pl-8"
                  data-testid="input-search"
                />
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              
              <Select value={filterLeadStatus} onValueChange={setFilterLeadStatus}>
                <SelectTrigger className="w-[140px]" data-testid="select-lead-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Lead Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.chatLogs.allLeads")}</SelectItem>
                  {Object.entries(leadStatusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
                    {selectedDate ? format(selectedDate, "PP") : "Date"}
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3 pr-4">
                {filteredLogs.map((log) => {
                  const statusConfig = leadStatusConfig[log.leadStatus as keyof typeof leadStatusConfig] || leadStatusConfig.new;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
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
                            
                            <Badge 
                              className={cn("text-xs text-white", statusConfig.color)}
                              data-testid={`badge-lead-${log.id}`}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            
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
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            {log.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {log.customerEmail}
                              </span>
                            )}
                            {log.customerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {log.customerPhone}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {log.summary}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {log.sessionStartedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(log.sessionStartedAt), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            data-testid={`button-view-${log.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(log.id);
                            }}
                            data-testid={`button-download-${log.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No chat logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || filterLeadStatus !== "all" || selectedDate
                  ? "Try adjusting your filters"
                  : "Archived conversations will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Details
            </DialogTitle>
            <DialogDescription>
              Full conversation history and customer information
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info" data-testid="tab-customer-info">
                  <User className="w-4 h-4 mr-2" />
                  Info
                </TabsTrigger>
                <TabsTrigger value="transcript" data-testid="tab-transcript">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="insights" data-testid="tab-insights">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Insights
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="flex-1 overflow-auto mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Customer Name</Label>
                      <p className="font-medium">{selectedLog.customerName || "Anonymous"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Lead Status</Label>
                      <Select 
                        value={selectedLog.leadStatus || "new"}
                        onValueChange={(value) => {
                          updateLeadStatusMutation.mutate({ logId: selectedLog.id, status: value });
                          setSelectedLog({ ...selectedLog, leadStatus: value });
                        }}
                      >
                        <SelectTrigger data-testid="select-update-lead-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(leadStatusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", config.color)} />
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Contact Information</Label>
                    {selectedLog.customerEmail && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <a href={`mailto:${selectedLog.customerEmail}`} className="text-sm hover:underline">
                          {selectedLog.customerEmail}
                        </a>
                      </div>
                    )}
                    {selectedLog.customerPhone && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Phone className="w-4 h-4 text-green-500" />
                        <a href={`tel:${selectedLog.customerPhone}`} className="text-sm hover:underline">
                          {selectedLog.customerPhone}
                        </a>
                      </div>
                    )}
                    {!selectedLog.customerEmail && !selectedLog.customerPhone && (
                      <p className="text-sm text-muted-foreground">No contact information available</p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {renderBankRecords(selectedLog.bankRecords as BankRecord[] | null)}
                  
                  {renderLocationData(selectedLog.locationData as LocationDataItem[] | null)}
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Session Started</Label>
                      <p>{selectedLog.sessionStartedAt ? format(new Date(selectedLog.sessionStartedAt), "PPpp") : "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Session Ended</Label>
                      <p>{selectedLog.sessionEndedAt ? format(new Date(selectedLog.sessionEndedAt), "PPpp") : "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total Messages</Label>
                      <p>{selectedLog.messageCount}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Handled By</Label>
                      <p>{selectedLog.supervisorId ? "Human Supervisor" : "AI Agent"}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="transcript" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3 whitespace-pre-wrap text-sm font-mono bg-muted/30 p-4 rounded-lg">
                    {selectedLog.fullTranscript}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="insights" className="flex-1 overflow-auto mt-4">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <Label className="font-medium">AI Summary</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedLog.summary}</p>
                  </div>
                  
                  {selectedLog.extractedKnowledge && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Extracted Knowledge</Label>
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        {selectedLog.extractedKnowledge}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Lead Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Track customer journey through your sales funnel:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(leadStatusConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Badge key={key} variant="outline" className="text-xs">
                      <span className={cn("w-2 h-2 rounded-full mr-1.5", config.color)} />
                      {config.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
