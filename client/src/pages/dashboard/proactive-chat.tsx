import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  Clock,
  Eye,
  MessageCircle,
  Plus,
  Save,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  Zap,
  Info,
  CheckCircle2,
} from "lucide-react";
import proactiveBanner from "../../assets/proactive-chat-banner.png";
import type { Merchant } from "@shared/schema";

const MIN_DELAY = 5;
const MAX_DELAY = 120;
const DEFAULT_DELAY = 8;
const MAX_TEMPLATES = 5;

export default function ProactiveChatPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const merchantId = localStorage.getItem("merchantId");

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const [enabled, setEnabled] = useState(false);
  const [greetingDelay, setGreetingDelay] = useState(DEFAULT_DELAY);
  const [dingEnabled, setDingEnabled] = useState(false);
  const [templates, setTemplates] = useState<string[]>([""]);

  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (merchant) {
      setEnabled(merchant.proactiveChatEnabled ?? false);
      setGreetingDelay(merchant.proactiveChatGreetingDelay ?? DEFAULT_DELAY);
      setDingEnabled(merchant.proactiveChatDingEnabled ?? false);
      const tpl: string[] = merchant.proactiveChatTemplates ?? [];
      setTemplates(tpl.length > 0 ? tpl : [""]);
    }
  }, [merchant]);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      proactiveChatEnabled: boolean;
      proactiveChatGreetingDelay: number;
      proactiveChatDingEnabled: boolean;
      proactiveChatTemplates: string[];
    }) => {
      const res = await apiRequest("POST", "/api/merchant/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({ title: "Settings saved", description: "Proactive Chat settings have been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save settings. Please try again.", variant: "destructive" });
    },
  });

  function handleToggleRequest(newValue: boolean) {
    setPendingToggle(newValue);
    setConfirmOpen(true);
  }

  function handleConfirmToggle() {
    if (pendingToggle !== null) {
      setEnabled(pendingToggle);
    }
    setConfirmOpen(false);
    setPendingToggle(null);
  }

  function handleCancelToggle() {
    setConfirmOpen(false);
    setPendingToggle(null);
  }

  function handleDelayChange(val: string) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    setGreetingDelay(Math.min(MAX_DELAY, Math.max(MIN_DELAY, num)));
  }

  function addTemplate() {
    if (templates.length >= MAX_TEMPLATES) return;
    setTemplates([...templates, ""]);
  }

  function removeTemplate(idx: number) {
    if (templates.length <= 1) {
      setTemplates([""]);
      return;
    }
    setTemplates(templates.filter((_, i) => i !== idx));
  }

  function updateTemplate(idx: number, val: string) {
    const next = [...templates];
    next[idx] = val;
    setTemplates(next);
  }

  function handleSave() {
    const cleanTemplates = templates.map(t => t.trim()).filter(Boolean);
    saveMutation.mutate({
      proactiveChatEnabled: enabled,
      proactiveChatGreetingDelay: greetingDelay,
      proactiveChatDingEnabled: dingEnabled,
      proactiveChatTemplates: cleanTemplates,
    });
  }

  const isEnabling = pendingToggle === true;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-md overflow-hidden h-44 sm:h-52">
        <img
          src={proactiveBanner}
          alt="Proactive Chat feature banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="text-xs font-medium">Widget Setting</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{t("dashboard.proactiveChat.title")}</h1>
          <p className="text-sm text-white/80 mt-1 max-w-md">
            Automatically reach out to visitors before they ask — turning passive browsing into active conversations.
          </p>
        </div>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            icon: Eye,
            title: "Visitor Tracking",
            desc: "Every visitor on your website is silently tracked in real time — always active, no opt-in needed.",
          },
          {
            icon: Bot,
            title: "AI Greeting",
            desc: "After the configured delay, your AI agent sends a warm, context-aware greeting to the visitor.",
          },
          {
            icon: MessageCircle,
            title: "Widget Auto-Open",
            desc: "The chat widget automatically opens when the AI greeting is sent, inviting visitors to respond.",
          },
          {
            icon: Users,
            title: "Live Visitor Panel",
            desc: "Supervisors see all active website visitors in real time and can initiate conversations proactively.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Settings Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Proactive Chat Settings
          </CardTitle>
          <CardDescription>Configure how and when your AI agent reaches out to visitors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable / Disable Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm font-medium">Enable Proactive Chat</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, your AI agent will automatically send a greeting after the configured delay.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleRequest}
              data-testid="switch-proactive-chat-enabled"
            />
          </div>

          {enabled && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Proactive Chat is active. Visitors will receive an AI greeting after {greetingDelay}s.
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Greeting Delay */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Greeting Delay
              </Label>
              <p className="text-xs text-muted-foreground">
                How many seconds after a visitor lands on the page before the AI greeting is sent. Min {MIN_DELAY}s, max {MAX_DELAY}s.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={MIN_DELAY}
                max={MAX_DELAY}
                value={greetingDelay}
                onChange={(e) => handleDelayChange(e.target.value)}
                className="w-20 text-center"
                data-testid="input-greeting-delay"
              />
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Ding Sound Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                {dingEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                Ding Sound on Auto-Open
              </Label>
              <p className="text-xs text-muted-foreground">
                Play a soft "Ding" notification tone in the visitor's browser when the chat widget auto-opens due to a proactive greeting.
              </p>
            </div>
            <Switch
              checked={dingEnabled}
              onCheckedChange={setDingEnabled}
              data-testid="switch-ding-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message Templates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Welcome Message Templates
          </CardTitle>
          <CardDescription>
            Add up to {MAX_TEMPLATES} custom greeting templates. The AI will randomly pick one when greeting a visitor.
            Leave empty to let the AI generate a greeting based on your knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Templates are sent exactly as written — no AI paraphrasing. You can use the visitor's page URL context by writing greetings that reference your products or services. Keep them warm, brief, and inviting.
            </span>
          </div>

          <div className="space-y-2">
            {templates.map((tpl, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1">
                  <Textarea
                    value={tpl}
                    onChange={(e) => updateTemplate(idx, e.target.value)}
                    placeholder={`Template ${idx + 1}: e.g. "Hi there! 👋 Looking for something specific? I'm here to help!"`}
                    className="resize-none text-sm min-h-[70px]"
                    data-testid={`textarea-template-${idx}`}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeTemplate(idx)}
                  className="mt-1 text-muted-foreground"
                  data-testid={`button-remove-template-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {templates.length < MAX_TEMPLATES && (
            <Button
              variant="outline"
              size="sm"
              onClick={addTemplate}
              className="w-full"
              data-testid="button-add-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Template ({templates.length}/{MAX_TEMPLATES})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-proactive-chat"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEnabling ? "Enable Proactive Chat?" : "Disable Proactive Chat?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {isEnabling ? (
                  <>
                    <p>Turning on Proactive Chat will make the following changes:</p>
                    <ul className="space-y-2 text-sm">
                      {[
                        { icon: Eye, text: "Visitor sessions will be tracked on your website (always active regardless of this toggle)." },
                        { icon: Clock, text: `Your AI agent will automatically send a greeting after ${greetingDelay} seconds of a visitor browsing.` },
                        { icon: MessageCircle, text: "The chat widget will auto-open to display the AI greeting." },
                        { icon: Users, text: "Supervisors will see all live visitors in their panel." },
                      ].map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-2">
                          <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <span className="text-muted-foreground">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p>Turning off Proactive Chat will:</p>
                    <ul className="space-y-2 text-sm">
                      {[
                        { text: "Stop the AI agent from automatically greeting visitors." },
                        { text: "The chat widget will no longer auto-open for new visitors." },
                        { text: "Visitor tracking and the supervisor live visitor panel remain active." },
                      ].map(({ text }) => (
                        <li key={text} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelToggle} data-testid="button-confirm-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle} data-testid="button-confirm-toggle">
              {isEnabling ? "Yes, Enable" : "Yes, Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
