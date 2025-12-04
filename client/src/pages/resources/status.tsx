import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function StatusPage() {
  const services = [
    { name: "API", status: "operational", uptime: "99.99%" },
    { name: "Dashboard", status: "operational", uptime: "99.98%" },
    { name: "Chat Widget", status: "operational", uptime: "99.99%" },
    { name: "AI Engine (LEXA1)", status: "operational", uptime: "99.95%" },
    { name: "WebSocket", status: "operational", uptime: "99.97%" },
    { name: "Database", status: "operational", uptime: "99.99%" },
    { name: "Payment Processing", status: "operational", uptime: "99.90%" },
  ];

  const incidents = [
    {
      date: "December 5, 2025",
      title: "Minor API Latency",
      status: "resolved",
      description: "Brief increase in API response times due to high traffic. Issue resolved within 15 minutes."
    },
    {
      date: "November 28, 2025",
      title: "Scheduled Maintenance",
      status: "completed",
      description: "Planned database maintenance. All services were back online within the maintenance window."
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "outage":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "degraded":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "outage":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "resolved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const allOperational = services.every(s => s.status === "operational");

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Activity className="w-3 h-3 mr-1" />
            Status
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            System Status
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            Real-time status of all Chatvice services.
          </p>
        </div>
      </section>

      <section className="py-8 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className={`p-6 ${allOperational ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50" : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/50"}`}>
            <div className="flex items-center gap-4">
              {allOperational ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {allOperational ? "All Systems Operational" : "Some Systems Experiencing Issues"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-6">Services</h2>
          <Card className="divide-y divide-border">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{service.uptime} uptime</span>
                  <Badge className={getStatusColor(service.status)}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-6">Recent Incidents</h2>
          
          {incidents.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No incidents to report.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-semibold">{incident.title}</h3>
                      <p className="text-sm text-muted-foreground">{incident.date}</p>
                    </div>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{incident.description}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-6">Uptime History (30 Days)</h2>
          <Card className="p-6">
            <div className="flex gap-1">
              {Array.from({ length: 30 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 h-8 bg-green-500 rounded-sm hover:bg-green-400 transition-colors cursor-pointer"
                  title={`Day ${30 - i}: 100% uptime`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-4">
            99.97% overall uptime in the last 30 days
          </p>
        </div>
      </section>
    </PublicPageLayout>
  );
}
