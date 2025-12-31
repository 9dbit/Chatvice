import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Layers,
  ArrowRight,
  Code,
  Globe,
  MessageCircle,
  CreditCard,
  Webhook,
  Check,
  Clock,
  Plug,
  Search,
  ExternalLink,
} from "lucide-react";
import { 
  SiSlack, 
  SiWhatsapp, 
  SiTelegram, 
  SiMessenger, 
  SiInstagram,
  SiShopify,
  SiZendesk,
  SiSalesforce,
  SiHubspot,
  SiIntercom,
  SiZapier,
} from "react-icons/si";
import PublicPageLayout from "./public-layout";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "core" | "messaging" | "crm" | "ecommerce" | "helpdesk" | "automation" | "payment";
  status: "available" | "coming_soon" | "connected";
  popular?: boolean;
}

const integrations: Integration[] = [
  {
    id: "website-widget",
    name: "Website Widget",
    description: "Embed our chat widget on any website with a simple JavaScript snippet. Full customization options available.",
    icon: Globe,
    category: "core",
    status: "available",
    popular: true,
  },
  {
    id: "rest-api",
    name: "REST API",
    description: "Full API access for custom integrations and automation. Build your own solutions with our comprehensive endpoints.",
    icon: Code,
    category: "core",
    status: "available",
    popular: true,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Real-time notifications for chat events and escalations. Integrate with your existing systems seamlessly.",
    icon: Webhook,
    category: "core",
    status: "available",
  },
  {
    id: "kompaspay",
    name: "Kompas Pay (QRIS)",
    description: "Indonesian payment gateway with QRIS support for easy subscriptions. Compatible with all Indonesian e-wallets.",
    icon: CreditCard,
    category: "payment",
    status: "available",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Receive escalation notifications and manage conversations directly in Slack channels.",
    icon: SiSlack,
    category: "messaging",
    status: "available",
    popular: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect your WhatsApp Business account to handle customer inquiries with AI-powered responses.",
    icon: SiWhatsapp,
    category: "messaging",
    status: "coming_soon",
    popular: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Integrate Telegram bot for seamless customer communication with your AI agents.",
    icon: SiTelegram,
    category: "messaging",
    status: "available",
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Manage Facebook Messenger conversations through Chatvice with AI assistance.",
    icon: SiMessenger,
    category: "messaging",
    status: "coming_soon",
    popular: true,
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "Handle Instagram Direct Messages with AI-powered responses and human escalation.",
    icon: SiInstagram,
    category: "messaging",
    status: "coming_soon",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Sync tickets and conversations with your Zendesk helpdesk for unified support management.",
    icon: SiZendesk,
    category: "helpdesk",
    status: "available",
    popular: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Integrate with Salesforce CRM for unified customer data and conversation history.",
    icon: SiSalesforce,
    category: "crm",
    status: "coming_soon",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Connect HubSpot CRM to sync contacts, deals, and conversation history automatically.",
    icon: SiHubspot,
    category: "crm",
    status: "available",
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Migrate from Intercom or use alongside for enhanced multi-channel support.",
    icon: SiIntercom,
    category: "helpdesk",
    status: "coming_soon",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Access order data and provide shopping assistance to customers directly in chat.",
    icon: SiShopify,
    category: "ecommerce",
    status: "available",
    popular: true,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect Chatvice to 5,000+ apps with automated workflows and triggers.",
    icon: SiZapier,
    category: "automation",
    status: "coming_soon",
    popular: true,
  },
];

const categoryLabels: Record<string, string> = {
  all: "All",
  core: "Core",
  messaging: "Messaging",
  crm: "CRM",
  ecommerce: "E-Commerce",
  helpdesk: "Helpdesk",
  automation: "Automation",
  payment: "Payment",
};

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(integrations.map((i) => i.category)))];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <Layers className="w-3 h-3 mr-1" />
            Integrations
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-left">
            Connect Chatvice to<br />Your Favorite Tools
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8 text-left">
            Seamlessly integrate AI customer service with your existing tech stack. 
            Connect messaging platforms, CRMs, and helpdesk tools in minutes.
          </p>
          <Link href="/api-docs">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              View API Docs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-integrations"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap ${selectedCategory === category ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                  data-testid={`button-category-${category}`}
                >
                  {categoryLabels[category] || category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card 
                key={integration.id} 
                className={`hover-elevate transition-all ${integration.status === "coming_soon" ? "opacity-75" : ""}`}
                data-testid={`card-integration-${integration.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        integration.status === "available" 
                          ? "bg-purple-100 dark:bg-purple-900/30" 
                          : "bg-muted"
                      }`}>
                        <integration.icon className={`w-6 h-6 ${
                          integration.status === "available" 
                            ? "text-purple-600" 
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                          {integration.name}
                          {integration.popular && (
                            <Badge variant="secondary" className="text-xs">Popular</Badge>
                          )}
                        </CardTitle>
                        <Badge 
                          variant={integration.status === "available" ? "default" : "outline"}
                          className={`mt-1 text-xs ${integration.status === "available" ? "bg-green-600" : ""}`}
                        >
                          {integration.status === "available" && <Check className="w-3 h-3 mr-1" />}
                          {integration.status === "coming_soon" && <Clock className="w-3 h-3 mr-1" />}
                          {integration.status === "available" ? "Available" : "Coming Soon"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-4 line-clamp-2 text-left">
                    {integration.description}
                  </CardDescription>
                  <Button 
                    variant={integration.status === "coming_soon" ? "outline" : "default"}
                    size="sm"
                    className={`w-full ${integration.status === "available" ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                    disabled={integration.status === "coming_soon"}
                    data-testid={`button-connect-${integration.id}`}
                  >
                    {integration.status === "available" ? (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Learn More
                      </>
                    ) : (
                      "Coming Soon"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Plug className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No integrations found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background border-purple-200 dark:border-purple-800/50">
            <CardContent className="py-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Need a Custom Integration?</h3>
                  <p className="text-muted-foreground text-left">
                    Our API allows you to build custom integrations for your specific needs. 
                    Enterprise customers get dedicated integration support and priority access to new integrations.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Link href="/api-docs">
                    <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                      Explore API
                      <Code className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicPageLayout>
  );
}
