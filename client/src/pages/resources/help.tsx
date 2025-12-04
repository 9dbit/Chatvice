import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  Search,
  MessageCircle,
  BookOpen,
  Mail,
  ArrowRight,
  Lightbulb,
  Video,
  FileText,
} from "lucide-react";
import PublicPageLayout from "../public-layout";

export default function HelpCenterPage() {
  const helpTopics = [
    {
      icon: Lightbulb,
      title: "Getting Started",
      description: "New to Chatvice? Start here.",
      link: "/docs"
    },
    {
      icon: MessageCircle,
      title: "Chat Widget",
      description: "Setup and customize your widget.",
      link: "/docs"
    },
    {
      icon: BookOpen,
      title: "Knowledge Base",
      description: "Train your AI agent.",
      link: "/docs"
    },
    {
      icon: FileText,
      title: "Billing & Plans",
      description: "Subscriptions and payments.",
      link: "/pricing"
    },
  ];

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "Click 'Forgot Password' on the login page and follow the instructions sent to your email."
    },
    {
      question: "How do I add more agents?",
      answer: "Go to Dashboard → Agents → Create New Agent. Your plan determines how many agents you can create."
    },
    {
      question: "How do I change my subscription?",
      answer: "Go to Dashboard → Settings → Billing to upgrade, downgrade, or cancel your plan."
    },
    {
      question: "How do I contact support?",
      answer: "Use the chat widget on this page, email us at support@chatvice.com, or visit our contact page."
    },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <HelpCircle className="w-3 h-3 mr-1" />
            Help Center
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How can we help you?
          </h1>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <Input
              placeholder="Describe your issue..."
              className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus-visible:ring-white"
              data-testid="input-help-search"
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {helpTopics.map((topic, index) => (
              <Link key={index} href={topic.link}>
                <Card className="p-6 text-center hover-elevate h-full cursor-pointer">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                    <topic.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-1">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={index} className="p-4">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </Card>
                ))}
              </div>
              <Link href="/faq">
                <Button variant="link" className="px-0 mt-4 text-purple-600">
                  View all FAQs
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">Contact Support</h2>
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Live Chat</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Chat with our AI assistant or request human support.
                      </p>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        Start Chat
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Email Support</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Send us an email and we'll respond within 24 hours.
                      </p>
                      <Button variant="outline">
                        support@chatvice.com
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <Video className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Video Tutorials</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Watch step-by-step guides and tutorials.
                      </p>
                      <Button variant="outline">
                        Watch Tutorials
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
