import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  ArrowRight,
  Code,
  Globe,
  MessageCircle,
  CreditCard,
  Database,
  Webhook,
  Check,
} from "lucide-react";
import { SiSlack, SiZapier, SiWhatsapp, SiTelegram } from "react-icons/si";
import PublicPageLayout from "./public-layout";

export default function IntegrationsPage() {
  const currentIntegrations = [
    {
      name: "Website Widget",
      description: "Embed our chat widget on any website with a simple JavaScript snippet.",
      icon: Globe,
      status: "available",
      category: "Core"
    },
    {
      name: "REST API",
      description: "Full API access for custom integrations and automation.",
      icon: Code,
      status: "available",
      category: "Core"
    },
    {
      name: "Webhooks",
      description: "Real-time notifications for chat events and escalations.",
      icon: Webhook,
      status: "available",
      category: "Core"
    },
    {
      name: "1-Pay (QRIS)",
      description: "Indonesian payment gateway with QRIS support for easy subscriptions.",
      icon: CreditCard,
      status: "available",
      category: "Payment"
    },
  ];

  const comingSoon = [
    {
      name: "WhatsApp",
      description: "Connect your AI agents to WhatsApp Business.",
      icon: SiWhatsapp,
      status: "coming",
      category: "Messaging"
    },
    {
      name: "Slack",
      description: "Receive escalation alerts and manage chats from Slack.",
      icon: SiSlack,
      status: "coming",
      category: "Messaging"
    },
    {
      name: "Telegram",
      description: "Deploy AI agents on Telegram.",
      icon: SiTelegram,
      status: "coming",
      category: "Messaging"
    },
    {
      name: "Zapier",
      description: "Connect Chatvice to 5,000+ apps.",
      icon: SiZapier,
      status: "coming",
      category: "Automation"
    },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Layers className="w-3 h-3 mr-1" />
            Integrations
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Connect Chatvice to<br />Your Favorite Tools
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            Seamlessly integrate AI customer service with your existing tech stack.
          </p>
          <Link href="/api-docs">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              View API Docs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Available Integrations</h2>
            <p className="text-muted-foreground">Ready to use today.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {currentIntegrations.map((integration, index) => (
              <Card key={index} className="p-6 hover-elevate">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <integration.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{integration.name}</h3>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <Check className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{integration.description}</p>
                    <Button variant="outline" size="sm">
                      Learn More
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">We're working on these integrations.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {comingSoon.map((integration, index) => (
              <Card key={index} className="p-6 opacity-75">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <integration.icon className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{integration.name}</h3>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MessageCircle className="w-16 h-16 mx-auto text-purple-600 mb-6" />
          <h2 className="text-3xl font-bold mb-4">Need a Custom Integration?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Our API allows you to build custom integrations for your specific needs. 
            Enterprise customers get dedicated integration support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/api-docs">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Explore API
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
