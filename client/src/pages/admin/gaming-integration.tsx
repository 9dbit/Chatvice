import { useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Gamepad2, CheckCircle, Users, ArrowDownLeft, ArrowUpLeft,
  TrendingUp, Database, Wifi, Activity, AlertTriangle, Bot,
  Shield, Layers, ArrowLeft,
} from "lucide-react";
import {
  GamingOverviewTab,
  GamingAuditTab,
  GamingPlayersTab,
  GamingDepositsTab,
  GamingWithdrawalsTab,
  GamingTurnoversTab,
  GamingBalancesTab,
  GamingWebhooksTab,
  GamingHealthTab,
  GamingFailedEventsTab,
  GamingAiRulesTab,
  GamingSecurityTab,
  GamingRoadmapTab,
} from "@/components/admin/GamingIntegrationTab";

const GAMING_NAV = [
  { id: "", label: "Overview", icon: Gamepad2 },
  { id: "audit", label: "Audit Checklist", icon: CheckCircle },
  { id: "player-mapping", label: "Player Mapping", icon: Users },
  { id: "deposit-monitor", label: "Deposit Monitor", icon: ArrowDownLeft },
  { id: "withdraw-monitor", label: "Withdrawal Monitor", icon: ArrowUpLeft },
  { id: "turnover-monitor", label: "Turnover Tracker", icon: TrendingUp },
  { id: "balance-monitor", label: "Balance Snapshots", icon: Database },
  { id: "webhook-logs", label: "Webhook Logs", icon: Wifi },
  { id: "api-health", label: "API Health", icon: Activity },
  { id: "failed-events", label: "Failed Events", icon: AlertTriangle },
  { id: "ai-response-rules", label: "AI Response Rules", icon: Bot },
  { id: "security-settings", label: "Security Settings", icon: Shield },
  { id: "roadmap", label: "Integration Roadmap", icon: Layers },
];

function renderPage(subpage: string, toast: Parameters<typeof GamingOverviewTab>[0]["toast"]) {
  switch (subpage) {
    case "":            return <GamingOverviewTab toast={toast} />;
    case "audit":       return <GamingAuditTab toast={toast} />;
    case "player-mapping": return <GamingPlayersTab toast={toast} />;
    case "deposit-monitor": return <GamingDepositsTab toast={toast} />;
    case "withdraw-monitor": return <GamingWithdrawalsTab toast={toast} />;
    case "turnover-monitor": return <GamingTurnoversTab toast={toast} />;
    case "balance-monitor": return <GamingBalancesTab toast={toast} />;
    case "webhook-logs": return <GamingWebhooksTab toast={toast} />;
    case "api-health":  return <GamingHealthTab toast={toast} />;
    case "failed-events": return <GamingFailedEventsTab toast={toast} />;
    case "ai-response-rules": return <GamingAiRulesTab toast={toast} />;
    case "security-settings": return <GamingSecurityTab toast={toast} />;
    case "roadmap":     return <GamingRoadmapTab toast={toast} />;
    default:            return <GamingOverviewTab toast={toast} />;
  }
}

export default function GamingIntegrationPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ subpage?: string }>();
  const subpage = params.subpage ?? "";
  const { toast } = useToast();

  useEffect(() => {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-60 border-r bg-muted/30 flex flex-col flex-shrink-0">
        <div className="p-3 border-b">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="nav-back-to-admin">
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Back to Admin</span>
            </Button>
          </Link>
        </div>
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Gaming Integration</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {GAMING_NAV.map((item) => {
            const isActive = subpage === item.id;
            const href = `/admin/gaming-integration${item.id ? `/${item.id}` : ""}`;
            return (
              <Link key={item.id} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start gap-2 h-8 ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                  data-testid={`nav-gaming-${item.id || "overview"}`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-xs">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {renderPage(subpage, toast)}
      </main>
    </div>
  );
}
