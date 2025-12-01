import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "react-icons/si";
import { Search, ExternalLink, Check, Clock, Plug } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "messaging" | "crm" | "ecommerce" | "helpdesk";
  status: "available" | "coming_soon" | "connected";
  popular?: boolean;
}

const integrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Receive escalation notifications and manage conversations directly in Slack",
    icon: SiSlack,
    category: "messaging",
    status: "available",
    popular: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect your WhatsApp Business account to handle customer inquiries",
    icon: SiWhatsapp,
    category: "messaging",
    status: "coming_soon",
    popular: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Integrate Telegram bot for seamless customer communication",
    icon: SiTelegram,
    category: "messaging",
    status: "available",
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Manage Facebook Messenger conversations through Jeany AI",
    icon: SiMessenger,
    category: "messaging",
    status: "coming_soon",
    popular: true,
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "Handle Instagram Direct Messages with AI-powered responses",
    icon: SiInstagram,
    category: "messaging",
    status: "coming_soon",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Sync tickets and conversations with your Zendesk helpdesk",
    icon: SiZendesk,
    category: "helpdesk",
    status: "available",
    popular: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Integrate with Salesforce CRM for unified customer data",
    icon: SiSalesforce,
    category: "crm",
    status: "coming_soon",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Connect HubSpot CRM to sync contacts and conversation history",
    icon: SiHubspot,
    category: "crm",
    status: "available",
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Migrate from Intercom or use alongside for enhanced support",
    icon: SiIntercom,
    category: "helpdesk",
    status: "coming_soon",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Access order data and provide shopping assistance to customers",
    icon: SiShopify,
    category: "ecommerce",
    status: "available",
    popular: true,
  },
];

const categoryLabels: Record<string, string> = {
  messaging: "Messaging",
  crm: "CRM",
  ecommerce: "E-Commerce",
  helpdesk: "Helpdesk",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-integrations-title">Integrations</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Connect Jeany AI with your favorite tools and platforms
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
              className="whitespace-nowrap"
              data-testid={`button-category-${category}`}
            >
              {category === "all" ? "All" : categoryLabels[category] || category}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => (
          <Card 
            key={integration.id} 
            className="hover-elevate transition-all"
            data-testid={`card-integration-${integration.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <integration.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                      {integration.name}
                      {integration.popular && (
                        <Badge variant="secondary" className="text-xs">Popular</Badge>
                      )}
                    </CardTitle>
                    <Badge 
                      variant={integration.status === "connected" ? "default" : "outline"}
                      className="mt-1 text-xs"
                    >
                      {integration.status === "connected" && <Check className="w-3 h-3 mr-1" />}
                      {integration.status === "coming_soon" && <Clock className="w-3 h-3 mr-1" />}
                      {integration.status === "available" && <Plug className="w-3 h-3 mr-1" />}
                      {integration.status === "connected" ? "Connected" : 
                       integration.status === "coming_soon" ? "Coming Soon" : "Available"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm mb-4 line-clamp-2">
                {integration.description}
              </CardDescription>
              <Button 
                variant={integration.status === "coming_soon" ? "outline" : "default"}
                size="sm"
                className="w-full"
                disabled={integration.status === "coming_soon"}
                data-testid={`button-connect-${integration.id}`}
              >
                {integration.status === "connected" ? (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage
                  </>
                ) : integration.status === "coming_soon" ? (
                  "Coming Soon"
                ) : (
                  <>
                    <Plug className="w-4 h-4 mr-2" />
                    Connect
                  </>
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

      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Plug className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Need a custom integration?</h3>
              <p className="text-sm text-muted-foreground">
                We can build custom integrations for Enterprise customers. Contact our team to discuss your requirements.
              </p>
            </div>
            <Button variant="outline" className="whitespace-nowrap" data-testid="button-request-integration">
              Request Integration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
