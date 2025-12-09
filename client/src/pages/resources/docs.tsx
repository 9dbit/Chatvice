import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  ArrowRight,
  Rocket,
  Code,
  MessageCircle,
  Database,
  Users,
  Settings,
  Shield,
  Zap,
  Brain,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function DocsPage() {
  const categories = [
    {
      icon: Rocket,
      title: "Getting Started",
      description: "Complete guides to set up your AI-powered customer service in minutes.",
      articles: [
        "Creating your Chatvice account and verifying email",
        "Setting up your first AI agent with custom name and branding",
        "Building your knowledge base with FAQs and website content",
        "Embedding the chat widget on your website or app",
        "Testing your AI agent before going live",
      ]
    },
    {
      icon: Brain,
      title: "AI & Knowledge Base",
      description: "Train your AI agents to provide accurate, helpful responses.",
      articles: [
        "Understanding LEXA1 AI engine and capabilities",
        "Knowledge base best practices for accurate responses",
        "Writing effective system prompts for your business",
        "Semantic search and how embeddings work",
        "Importing content from URLs, PDFs, and documents",
        "Managing multiple knowledge sources",
      ]
    },
    {
      icon: MessageCircle,
      title: "Chat Widget",
      description: "Customize every aspect of your customer chat experience.",
      articles: [
        "Widget color, position, and branding customization",
        "Welcome messages and suggested questions",
        "Mobile responsive design and behavior",
        "Product cards and quick reply buttons",
        "Custom button icons and dimensions",
        "Allowed domains and security settings",
      ]
    },
    {
      icon: Users,
      title: "Team & Escalation",
      description: "Set up human support for complex customer inquiries.",
      articles: [
        "Adding and managing supervisor accounts",
        "Configuring automatic escalation triggers",
        "Round-robin and priority-based assignment",
        "Live chat takeover from AI to human",
        "Supervisor work schedules and shifts",
        "Team activity monitoring and reports",
      ]
    },
    {
      icon: Code,
      title: "API Reference",
      description: "Full API documentation for custom integrations.",
      articles: [
        "API authentication and security tokens",
        "Agents API: Create, update, delete agents",
        "Sessions API: Manage customer conversations",
        "Messages API: Send and receive messages",
        "Webhooks for real-time event notifications",
        "Rate limits and best practices",
      ]
    },
    {
      icon: Shield,
      title: "Security & Compliance",
      description: "Enterprise-grade security and data protection measures.",
      articles: [
        "End-to-end encryption for all data",
        "GDPR compliance and data subject rights",
        "Role-based access controls (RBAC)",
        "Session security and JWT verification",
        "Data retention and deletion policies",
        "Security audit logs and monitoring",
      ]
    },
  ];

  const popularArticles = [
    { title: "Quick Start Guide", category: "Getting Started", views: "5.2k" },
    { title: "Widget Customization", category: "Chat Widget", views: "3.8k" },
    { title: "Creating Effective FAQs", category: "Knowledge Base", views: "2.9k" },
    { title: "API Authentication", category: "API Reference", views: "2.4k" },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <BookOpen className="w-3 h-3 mr-1" />
            Documentation
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How can we help?
          </h1>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <Input
              placeholder="Search documentation..."
              className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus-visible:ring-white"
              data-testid="input-docs-search"
            />
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold mb-4">Popular Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularArticles.map((article, index) => (
              <Card key={index} className="p-4 hover-elevate cursor-pointer">
                <Badge variant="secondary" className="mb-2 text-xs">{article.category}</Badge>
                <h3 className="font-medium mb-1">{article.title}</h3>
                <p className="text-xs text-muted-foreground">{article.views} views</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Card key={index} className="p-6 hover-elevate">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <category.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.articles.map((article, i) => (
                    <li key={i}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-purple-600 flex items-center gap-2 group">
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="px-0 mt-4 text-purple-600 hover:text-purple-700 hover:bg-transparent">
                  View all articles
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-purple-100 mb-6">
            Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                Contact Support
              </Button>
            </Link>
            <Link href="/faq">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                View FAQ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
