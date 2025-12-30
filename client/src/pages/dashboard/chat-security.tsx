import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Eye,
  Check,
  X,
  ArrowUpRight,
  RefreshCw,
  Info,
  Loader2,
} from "lucide-react";
import type { ChatSecuritySettings, ChatSecurityAlert } from "@shared/schema";

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    low: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Low" },
    medium: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: "Medium" },
    high: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "High" },
    critical: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Critical" },
  };
  
  const variant = variants[severity] || variants.low;
  return <Badge className={variant.className} data-testid={`badge-severity-${severity}`}>{variant.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    new: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "New" },
    reviewed: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Reviewed" },
    dismissed: { className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", label: "Dismissed" },
    escalated: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", label: "Escalated" },
  };
  
  const variant = variants[status] || variants.new;
  return <Badge className={variant.className} data-testid={`badge-status-${status}`}>{variant.label}</Badge>;
}

export default function ChatSecurityPage() {
  const { toast } = useToast();
  const [customPatternInput, setCustomPatternInput] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery<ChatSecuritySettings>({
    queryKey: ["/api/chat-security/settings"],
  });

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<ChatSecurityAlert[]>({
    queryKey: ["/api/chat-security/alerts"],
  });

  const { data: stats } = useQuery<{ total: number; new: number; reviewed: number; dismissed: number; escalated: number }>({
    queryKey: ["/api/chat-security/stats"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ChatSecuritySettings>) => {
      return apiRequest("PUT", "/api/chat-security/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-security/settings"] });
      toast({ title: "Security settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/chat-security/alerts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-security/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-security/stats"] });
      toast({ title: "Alert updated" });
    },
    onError: () => {
      toast({ title: "Failed to update alert", variant: "destructive" });
    },
  });

  function handleUpdateSetting(key: string, value: any) {
    updateSettingsMutation.mutate({ [key]: value });
  }

  function handleAddCustomPattern() {
    if (!customPatternInput.trim()) return;
    const currentPatterns = (settings?.customPatterns as string[]) || [];
    if (currentPatterns.includes(customPatternInput.trim())) {
      toast({ title: "Pattern already exists", variant: "destructive" });
      return;
    }
    updateSettingsMutation.mutate({
      customPatterns: [...currentPatterns, customPatternInput.trim()],
    });
    setCustomPatternInput("");
  }

  function handleRemovePattern(pattern: string) {
    const currentPatterns = (settings?.customPatterns as string[]) || [];
    updateSettingsMutation.mutate({
      customPatterns: currentPatterns.filter(p => p !== pattern),
    });
  }

  if (settingsLoading) {
    return (
      <div className="p-6 flex items-center justify-center" data-testid="loading-security">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sensitivityLevel = settings?.sensitivity ?? 50;
  const customPatterns = (settings?.customPatterns as string[]) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Chat Security Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor supervisor conversations for suspicious activities and protect your customers
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList data-testid="tabs-security">
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts {stats?.new ? <Badge className="ml-2 bg-red-500 text-white">{stats.new}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                What is Chat Security Monitoring?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Chat Security Monitoring uses AI to analyze conversations between supervisors and customers 
                to detect potentially suspicious or harmful behavior. This helps protect your business and 
                customers from:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Financial Fraud
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Attempts to request payments outside official channels, share personal bank accounts, 
                    or collect payment information improperly.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Example: "Transfer the payment to my personal account at 1234567890"
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Data Theft
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Requests for sensitive customer data like passwords, ID numbers, 
                    or financial information that shouldn't be shared.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Example: "Please share your login password so I can check your account"
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    External Contact
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Attempts to move conversations outside official channels to personal 
                    WhatsApp, email, or social media accounts.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Example: "Contact me on my personal WhatsApp 08123456789 for faster response"
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-purple-500" />
                    Inappropriate Content
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Unprofessional language, harassment, or content that could harm 
                    your company's reputation or customer relationships.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Example: Offensive language, personal insults, or inappropriate suggestions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monitoring Configuration</CardTitle>
              <CardDescription>
                Configure how the security monitoring system analyzes conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled" className="text-base font-medium">Enable Security Monitoring</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, AI will analyze supervisor messages for suspicious patterns
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings?.isEnabled ?? false}
                  onCheckedChange={(checked) => handleUpdateSetting("isEnabled", checked)}
                  data-testid="switch-enabled"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Sensitivity Level: {sensitivityLevel}%</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Higher sensitivity catches more potential issues but may generate more false positives
                  </p>
                  <Slider
                    value={[sensitivityLevel]}
                    min={0}
                    max={100}
                    step={10}
                    onValueCommit={(value) => handleUpdateSetting("sensitivity", value[0])}
                    className="w-full"
                    data-testid="slider-sensitivity"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Relaxed (fewer alerts)</span>
                    <span>Strict (more alerts)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Detection Categories</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="monitorFinancialFraud">Financial Fraud</Label>
                      <p className="text-xs text-muted-foreground">Unauthorized payment requests</p>
                    </div>
                    <Switch
                      id="monitorFinancialFraud"
                      checked={settings?.monitorFinancialFraud ?? true}
                      onCheckedChange={(checked) => handleUpdateSetting("monitorFinancialFraud", checked)}
                      data-testid="switch-financial-fraud"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="monitorDataTheft">Data Theft</Label>
                      <p className="text-xs text-muted-foreground">Requests for sensitive information</p>
                    </div>
                    <Switch
                      id="monitorDataTheft"
                      checked={settings?.monitorDataTheft ?? true}
                      onCheckedChange={(checked) => handleUpdateSetting("monitorDataTheft", checked)}
                      data-testid="switch-data-theft"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="monitorExternalContact">External Contact</Label>
                      <p className="text-xs text-muted-foreground">Moving conversations off-platform</p>
                    </div>
                    <Switch
                      id="monitorExternalContact"
                      checked={settings?.monitorExternalContact ?? true}
                      onCheckedChange={(checked) => handleUpdateSetting("monitorExternalContact", checked)}
                      data-testid="switch-external-contact"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="monitorInappropriate">Inappropriate Content</Label>
                      <p className="text-xs text-muted-foreground">Unprofessional or harmful language</p>
                    </div>
                    <Switch
                      id="monitorInappropriate"
                      checked={settings?.monitorInappropriate ?? true}
                      onCheckedChange={(checked) => handleUpdateSetting("monitorInappropriate", checked)}
                      data-testid="switch-inappropriate"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Tolerance Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce false positives by allowing certain types of informal conversation
                </p>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tolerateJokes"
                      checked={settings?.tolerateJokes ?? true}
                      onCheckedChange={(checked) => handleUpdateSetting("tolerateJokes", checked)}
                      data-testid="switch-allow-jokes"
                    />
                    <Label htmlFor="tolerateJokes">Allow friendly jokes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tolerateOffTopic"
                      checked={settings?.tolerateOffTopic ?? true}
                      onCheckedChange={(checked) => handleUpdateSetting("tolerateOffTopic", checked)}
                      data-testid="switch-allow-offtopic"
                    />
                    <Label htmlFor="tolerateOffTopic">Allow off-topic chat</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Detection Patterns</CardTitle>
              <CardDescription>
                Add specific phrases or patterns you want to monitor for in supervisor messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom pattern to detect..."
                  value={customPatternInput}
                  onChange={(e) => setCustomPatternInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomPattern()}
                  data-testid="input-custom-pattern"
                />
                <Button onClick={handleAddCustomPattern} data-testid="button-add-pattern">
                  Add
                </Button>
              </div>
              {customPatterns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customPatterns.map((pattern, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {pattern}
                      <button
                        onClick={() => handleRemovePattern(pattern)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-pattern-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No custom patterns defined. The system uses built-in AI detection.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Get notified when security alerts are detected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="alertEmailEnabled">Enable Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for high and critical severity alerts
                  </p>
                </div>
                <Switch
                  id="alertEmailEnabled"
                  checked={settings?.alertEmailEnabled ?? false}
                  onCheckedChange={(checked) => handleUpdateSetting("alertEmailEnabled", checked)}
                  data-testid="switch-email-notifications"
                />
              </div>
              {settings?.alertEmailEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="alertEmails">Notification Email</Label>
                  <Input
                    id="alertEmails"
                    type="email"
                    placeholder="Enter email for notifications..."
                    defaultValue={(settings?.alertEmails as string[])?.[0] || ""}
                    onBlur={(e) => handleUpdateSetting("alertEmails", e.target.value ? [e.target.value] : [])}
                    data-testid="input-notification-email"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold" data-testid="text-total-alerts">{stats?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-500" data-testid="text-new-alerts">{stats?.new ?? 0}</div>
                <p className="text-xs text-muted-foreground">New</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-500" data-testid="text-reviewed-alerts">{stats?.reviewed ?? 0}</div>
                <p className="text-xs text-muted-foreground">Reviewed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-gray-500" data-testid="text-dismissed-alerts">{stats?.dismissed ?? 0}</div>
                <p className="text-xs text-muted-foreground">Dismissed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-purple-500" data-testid="text-escalated-alerts">{stats?.escalated ?? 0}</div>
                <p className="text-xs text-muted-foreground">Escalated</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Security Alerts</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetchAlerts()} data-testid="button-refresh-alerts">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !alerts?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No security alerts detected yet</p>
                  <p className="text-sm">Alerts will appear here when suspicious activity is detected</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 border rounded-lg space-y-3"
                        data-testid={`alert-${alert.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={alert.severity || "medium"} />
                            <StatusBadge status={alert.status || "new"} />
                            <span className="text-sm text-muted-foreground capitalize">
                              {alert.alertType.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt!).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="p-3 bg-muted rounded text-sm">
                            <p className="text-xs text-muted-foreground mb-1">Flagged Message:</p>
                            <p>{alert.suspiciousMessage}</p>
                          </div>
                          {alert.aiAnalysis && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                              <p className="text-xs text-muted-foreground mb-1">AI Analysis:</p>
                              <p>{alert.aiAnalysis}</p>
                            </div>
                          )}
                        </div>

                        {alert.status === "new" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAlertMutation.mutate({ id: alert.id, status: "reviewed" })}
                              data-testid={`button-review-${alert.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Mark Reviewed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAlertMutation.mutate({ id: alert.id, status: "dismissed" })}
                              data-testid={`button-dismiss-${alert.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateAlertMutation.mutate({ id: alert.id, status: "escalated" })}
                              data-testid={`button-escalate-${alert.id}`}
                            >
                              <ArrowUpRight className="w-4 h-4 mr-1" />
                              Escalate
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
