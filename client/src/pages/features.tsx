import { Link } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  MessageCircle,
  Database,
  Shield,
  Zap,
  Globe,
  Users,
  BarChart3,
  Bot,
  HeadphonesIcon,
  Settings,
  Code,
  Sparkles,
  ArrowRight,
  Check,
  Upload,
  Search,
  Workflow,
  Clock,
  Target,
  Layers,
  Camera,
  Image as ImageIcon,
  Video,
  Lock,
  Key,
} from "lucide-react";
import PublicPageLayout from "./public-layout";

function useParallaxScroll() {
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.parallax-fade-in, .parallax-slide-left, .parallax-slide-right, .parallax-scale');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight * 0.85) {
          el.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}

export default function FeaturesPage() {
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;

  const mainFeatures = [
    {
      icon: Brain,
      title: "LEXA1 AI Engine",
      description: "Our advanced AI engine built on GPT-4 with reasoning capabilities. Understands context, handles complex queries, and provides accurate responses.",
      highlights: [
        "Context-aware conversations",
        "Multi-turn dialogue support",
        "Semantic understanding",
        "Automatic language detection",
      ],
    },
    {
      icon: Database,
      title: "Smart Knowledge Base",
      description: "Train your AI with your business knowledge. Upload documents, add FAQs, or crawl your website. Vector embeddings enable semantic search.",
      highlights: [
        "PDF, TXT, DOCX upload",
        "Website crawling",
        "Manual Q&A pairs",
        "Vector embeddings",
      ],
    },
    {
      icon: HeadphonesIcon,
      title: "Human Escalation",
      description: "Seamless handoff to human supervisors when needed. Configure triggers, round-robin assignment, and real-time chat takeover.",
      highlights: [
        "Keyword triggers",
        "Automatic escalation",
        "Round-robin assignment",
        "Real-time takeover",
      ],
    },
    {
      icon: MessageCircle,
      title: "Embeddable Widget",
      description: "Beautiful, customizable chat widget that works on any website. Just one line of code to get started.",
      highlights: [
        "Custom colors & styling",
        "Suggested questions",
        "Media uploads",
        "Mobile responsive",
      ],
    },
    {
      icon: Shield,
      title: "Identity Verification",
      description: "Secure customer authentication using JWT tokens. Personalize conversations with verified customer data.",
      highlights: [
        "JWT-based auth",
        "Secret key management",
        "Domain restrictions",
        "Customer data binding",
      ],
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Automatic language detection with AI responses in customer's preferred language. Support customers globally.",
      highlights: [
        "50+ languages",
        "Auto detection",
        "Native responses",
        "Indonesian support",
      ],
    },
  ];

  const additionalFeatures = [
    { icon: Bot, title: "Multiple Agents", description: "Create different agents for different purposes" },
    { icon: Settings, title: "Custom System Prompts", description: "Define AI behavior and personality" },
    { icon: BarChart3, title: "Analytics Dashboard", description: "Track performance and insights" },
    { icon: Users, title: "Team Management", description: "Invite supervisors and manage access" },
    { icon: Clock, title: "24/7 Availability", description: "AI never sleeps, always ready" },
    { icon: Zap, title: "Fast Response", description: "Sub-second response times" },
    { icon: Upload, title: "Media Support", description: "Photos, videos, and file uploads" },
    { icon: Camera, title: "Camera Capture", description: "Take photos directly in chat" },
    { icon: Search, title: "Semantic Search", description: "Meaning-based knowledge lookup" },
    { icon: Workflow, title: "Webhooks", description: "Integrate with external systems" },
    { icon: Lock, title: "Data Encryption", description: "Secure data at rest and in transit" },
    { icon: Key, title: "API Access", description: "Full REST API for integrations" },
  ];

  useParallaxScroll();
  
  return (
    <PublicPageLayout
      title="Features - AI Customer Service Platform | Chatvice"
      description="Explore Chatvice features: LEXA1 AI engine, smart knowledge base, human escalation, multi-language support, embeddable widget, and powerful analytics dashboard."
    >
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Features
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-left">
            Everything You Need for<br />AI Customer Service
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8 text-left">
            Chatvice powered by LEXA1 gives you all the tools to build, deploy, 
            and scale intelligent customer support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16 parallax-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Powerful features designed to transform your customer service experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className={`hover-elevate group parallax-scale parallax-delay-${(index % 5) + 1}`}>
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                    <feature.icon className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-purple-600 shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16 parallax-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">More Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Every feature you need to deliver exceptional customer experiences.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <Card key={index} className={`p-6 hover-elevate parallax-scale parallax-delay-${(index % 5) + 1}`}>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1 text-left">{feature.title}</h3>
                <p className="text-sm text-muted-foreground text-left">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="parallax-slide-left">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                AI Engine
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-left">
                Meet LEXA1
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                LEXA1 is our proprietary AI engine built specifically for customer service. 
                It combines the power of GPT-4 with semantic search and business context 
                to deliver accurate, helpful responses.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Context-Aware Understanding</p>
                    <p className="text-sm text-muted-foreground">
                      Understands the meaning behind questions, not just keywords.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Business Knowledge Integration</p>
                    <p className="text-sm text-muted-foreground">
                      Trained on your specific content, products, and policies.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Smart Escalation</p>
                    <p className="text-sm text-muted-foreground">
                      Knows when to hand off to humans for complex issues.
                    </p>
                  </div>
                </li>
              </ul>
              <Link href="/register">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Try LEXA1 Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-3xl blur-3xl" />
              <Card className="relative p-8 text-center">
                <Brain className="w-24 h-24 mx-auto text-purple-600 mb-6" />
                <h3 className="text-2xl font-bold mb-2">LEXA1</h3>
                <p className="text-muted-foreground">AI Engine v1.0</p>
                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">99%</p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">&lt;1s</p>
                    <p className="text-xs text-muted-foreground">Response</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">50+</p>
                    <p className="text-xs text-muted-foreground">Languages</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-left">
            Ready to Transform Your Customer Service?
          </h2>
          <p className="text-lg text-purple-100 mb-8 max-w-2xl text-left">
            Start your {trialDays}-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
