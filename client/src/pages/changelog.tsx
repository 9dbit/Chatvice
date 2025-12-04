import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Rocket,
  Zap,
  Bug,
  Sparkles,
  Shield,
  Globe,
  Brain,
  MessageCircle,
  CreditCard,
  Users,
} from "lucide-react";
import PublicPageLayout from "./public-layout";

export default function ChangelogPage() {
  const releases = [
    {
      version: "1.0.0",
      date: "December 9, 2025",
      title: "LEXA1 Official Launch",
      type: "major",
      description: "Official launch of Chatvice powered by LEXA1 AI Engine.",
      changes: [
        { type: "feature", text: "LEXA1 AI Engine with GPT-4 integration", icon: Brain },
        { type: "feature", text: "Semantic search with vector embeddings", icon: Sparkles },
        { type: "feature", text: "1-Pay Indonesian payment gateway", icon: CreditCard },
        { type: "feature", text: "Production deployment with custom domain support", icon: Globe },
      ]
    },
    {
      version: "0.9.0",
      date: "November 28, 2025",
      title: "Human Escalation & Supervisor Panel",
      type: "minor",
      description: "Complete human escalation system with supervisor assignment.",
      changes: [
        { type: "feature", text: "Real-time supervisor panel for chat takeover", icon: Users },
        { type: "feature", text: "Round-robin supervisor assignment", icon: Zap },
        { type: "feature", text: "Keyword and sentiment-based escalation triggers", icon: MessageCircle },
        { type: "feature", text: "Indonesian escalation messages", icon: Globe },
        { type: "improvement", text: "WebSocket optimization for real-time updates", icon: Zap },
      ]
    },
    {
      version: "0.8.0",
      date: "November 20, 2025",
      title: "Widget Customization & Identity Verification",
      type: "minor",
      description: "Enhanced widget features with secure customer verification.",
      changes: [
        { type: "feature", text: "Custom widget styling (colors, position, theme)", icon: Sparkles },
        { type: "feature", text: "JWT-based identity verification for Pro/Enterprise", icon: Shield },
        { type: "feature", text: "Allowed domains restriction", icon: Shield },
        { type: "feature", text: "Secret key generation and management", icon: Shield },
        { type: "feature", text: "Media uploads (photo, video, camera)", icon: MessageCircle },
      ]
    },
    {
      version: "0.7.0",
      date: "November 12, 2025",
      title: "Per-Agent Knowledge Base",
      type: "minor",
      description: "Knowledge base content now scoped per agent.",
      changes: [
        { type: "feature", text: "Per-agent knowledge base with agentId scoping", icon: Brain },
        { type: "feature", text: "Import knowledge from another agent", icon: Zap },
        { type: "feature", text: "Website crawler for FAQ extraction", icon: Globe },
        { type: "improvement", text: "Automatic widget sync with agent settings", icon: MessageCircle },
      ]
    },
    {
      version: "0.6.0",
      date: "November 5, 2025",
      title: "Agent System Prompts",
      type: "minor",
      description: "Custom AI behavior configuration per agent.",
      changes: [
        { type: "feature", text: "Custom system prompts for AI behavior", icon: Brain },
        { type: "feature", text: "Language style configuration", icon: Globe },
        { type: "feature", text: "Business rules integration", icon: Shield },
        { type: "improvement", text: "OpenAI system role message support", icon: Zap },
      ]
    },
    {
      version: "0.5.0",
      date: "October 28, 2025",
      title: "Vector Embeddings & Semantic Search",
      type: "minor",
      description: "AI-powered knowledge retrieval using embeddings.",
      changes: [
        { type: "feature", text: "OpenAI text-embedding-3-small integration", icon: Brain },
        { type: "feature", text: "Vector embeddings for knowledge chunks", icon: Sparkles },
        { type: "feature", text: "Semantic search for accurate responses", icon: Zap },
        { type: "feature", text: "Multi-language embedding support", icon: Globe },
      ]
    },
    {
      version: "0.4.0",
      date: "October 15, 2025",
      title: "Knowledge Base Management",
      type: "minor",
      description: "Comprehensive content management for AI training.",
      changes: [
        { type: "feature", text: "File upload (PDF, TXT, DOCX)", icon: Sparkles },
        { type: "feature", text: "Manual Q&A pairs", icon: MessageCircle },
        { type: "feature", text: "Suggested questions configuration", icon: Zap },
        { type: "feature", text: "Knowledge categories and organization", icon: Brain },
      ]
    },
    {
      version: "0.3.0",
      date: "October 1, 2025",
      title: "Embeddable Chat Widget",
      type: "minor",
      description: "First version of the embeddable widget.",
      changes: [
        { type: "feature", text: "JavaScript embed code generation", icon: MessageCircle },
        { type: "feature", text: "Real-time WebSocket messaging", icon: Zap },
        { type: "feature", text: "Mobile responsive design", icon: Sparkles },
        { type: "feature", text: "Dark/light theme support", icon: Sparkles },
      ]
    },
    {
      version: "0.2.0",
      date: "September 15, 2025",
      title: "Merchant Dashboard",
      type: "minor",
      description: "Complete merchant management interface.",
      changes: [
        { type: "feature", text: "Agent creation and management", icon: Brain },
        { type: "feature", text: "Chat session viewer", icon: MessageCircle },
        { type: "feature", text: "Analytics dashboard", icon: Sparkles },
        { type: "feature", text: "Team and supervisor management", icon: Users },
      ]
    },
    {
      version: "0.1.0",
      date: "September 1, 2025",
      title: "Initial Platform",
      type: "major",
      description: "Foundation of the Chatvice platform.",
      changes: [
        { type: "feature", text: "Multi-tenant architecture", icon: Shield },
        { type: "feature", text: "User authentication system", icon: Shield },
        { type: "feature", text: "PostgreSQL database with Drizzle ORM", icon: Zap },
        { type: "feature", text: "Express.js backend with TypeScript", icon: Zap },
        { type: "feature", text: "React frontend with Vite", icon: Sparkles },
      ]
    },
  ];

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-4">
            <Rocket className="w-3 h-3 mr-1" />
            Changelog
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What's New in Chatvice
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            Follow our journey as we build the future of AI customer service.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-purple-200 dark:bg-purple-800/50" />

            <div className="space-y-12">
              {releases.map((release, index) => (
                <div key={index} className="relative pl-20">
                  <div className="absolute left-4 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center z-10">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>

                  <Card className="p-6">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <Badge className={`${release.type === "major" ? "bg-purple-600" : "bg-blue-600"}`}>
                        v{release.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{release.date}</span>
                      {index === 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Latest
                        </Badge>
                      )}
                    </div>

                    <h2 className="text-xl font-bold mb-2">{release.title}</h2>
                    <p className="text-muted-foreground mb-6">{release.description}</p>

                    <div className="space-y-3">
                      {release.changes.map((change, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                            change.type === "feature" ? "bg-green-100 dark:bg-green-900/30" :
                            change.type === "improvement" ? "bg-blue-100 dark:bg-blue-900/30" :
                            "bg-yellow-100 dark:bg-yellow-900/30"
                          }`}>
                            <change.icon className={`w-3.5 h-3.5 ${
                              change.type === "feature" ? "text-green-600" :
                              change.type === "improvement" ? "text-blue-600" :
                              "text-yellow-600"
                            }`} />
                          </div>
                          <span className="text-sm">{change.text}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
