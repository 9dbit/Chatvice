import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  MessageSquare,
  Zap,
  Users,
  BarChart3,
  Globe,
  Database,
  CheckCircle2,
  ArrowRight,
  Bot,
  HeadphonesIcon,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import heroBackgroundUrl from "@assets/IMG_0078_1764426562564.jpeg";

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Jeany AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge variant="secondary" className="px-3 py-1 bg-white/10 text-white border-white/20">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Customer Service
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              Automate Support with{" "}
              <span className="text-primary">Intelligent AI</span>
            </h1>
            <p className="text-lg text-white/80 max-w-lg">
              Jeany AI handles customer inquiries 24/7 with natural conversations.
              When things get complex, it seamlessly escalates to your team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-hero-get-started">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 text-white border-white/20 hover:bg-white/20" data-testid="button-hero-demo">
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xs font-medium text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/70">
                Trusted by <span className="font-semibold text-white">500+</span> merchants
              </p>
            </div>
          </div>
          <div className="relative lg:pl-8">
            <div className="relative bg-card rounded-2xl border border-card-border shadow-xl overflow-hidden">
              <div className="bg-primary/10 dark:bg-primary/20 p-4 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Jeany AI</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-status-online" />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4 h-80">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm p-3 max-w-[80%]">
                    <p className="text-sm">Hi! Welcome to TechStore. How can I help you today?</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm p-3 max-w-[80%]">
                    <p className="text-sm">I'd like to check my order status</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm p-3 max-w-[80%]">
                    <p className="text-sm">Sure! Please provide your order number and I'll look that up for you right away.</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm p-3 max-w-[80%]">
                    <p className="text-sm">Order #12345</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    disabled
                  />
                  <Button size="sm" disabled>
                    Send
                  </Button>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "AI-Powered Responses",
      description: "Natural language processing delivers human-like conversations that understand context and intent.",
    },
    {
      icon: Users,
      title: "Smart Escalation",
      description: "Automatically detect when customers need human help and seamlessly transfer to your team.",
    },
    {
      icon: MessageSquare,
      title: "Customizable Widget",
      description: "Match your brand with custom colors, icons, and welcome messages. Easy embed with one script.",
    },
    {
      icon: BarChart3,
      title: "Real-time Dashboard",
      description: "Track conversations, response times, and resolution rates with beautiful analytics.",
    },
    {
      icon: Globe,
      title: "Multi-language Support",
      description: "Serve customers globally with automatic language detection and translation.",
    },
    {
      icon: Database,
      title: "Knowledge Base",
      description: "Train Jeany with your FAQs, policies, and product info for accurate responses.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need for AI Customer Service
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to help you deliver exceptional customer experiences at scale.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Set Up Your Account",
      description: "Register your merchant account and configure your company details in minutes.",
      icon: Shield,
    },
    {
      number: "02",
      title: "Train Your AI",
      description: "Add your knowledge base, FAQs, and escalation triggers. Jeany learns your business.",
      icon: Bot,
    },
    {
      number: "03",
      title: "Embed & Go Live",
      description: "Copy one line of code to your website. Start serving customers instantly.",
      icon: Sparkles,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get Started in 3 Simple Steps
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From signup to serving customers in under 10 minutes.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-border" />
              )}
              <div className="relative bg-card rounded-xl border border-card-border p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small businesses just getting started",
      features: [
        "500 AI conversations/month",
        "1 Team member",
        "Basic analytics",
        "Email support",
        "Widget customization",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      price: "$79",
      period: "/month",
      description: "For growing businesses with higher volume",
      features: [
        "5,000 AI conversations/month",
        "5 Team members",
        "Advanced analytics",
        "Priority support",
        "Custom triggers",
        "Knowledge base",
        "API access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with custom needs",
      features: [
        "Unlimited conversations",
        "Unlimited team members",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option",
        "White-label solution",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade as you grow. No hidden fees.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "98%", label: "Customer Satisfaction", icon: TrendingUp },
    { value: "24/7", label: "Always Available", icon: Clock },
    { value: "500+", label: "Happy Merchants", icon: Users },
    { value: "2M+", label: "Conversations Handled", icon: MessageSquare },
  ];

  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon className="w-8 h-8 mx-auto mb-4 opacity-80" />
              <p className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Jeany AI has transformed our customer support. We handle 3x more inquiries with the same team size.",
      author: "Sarah Chen",
      role: "CEO, TechStore",
      company: "E-commerce",
    },
    {
      quote: "The seamless escalation to human agents is brilliant. Customers don't even notice the transition.",
      author: "Michael Rodriguez",
      role: "Support Manager, FinanceHub",
      company: "Financial Services",
    },
  ];

  return (
    <section className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by Support Teams
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-8">
              <blockquote className="text-lg mb-6">"{testimonial.quote}"</blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {testimonial.author.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.company}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const [email, setEmail] = useState("");

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Transform Your Customer Service?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Join 500+ merchants using Jeany AI to deliver exceptional support experiences.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            data-testid="input-cta-email"
          />
          <Link href="/register">
            <Button size="lg" data-testid="button-cta-start">
              Start Free Trial
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          No credit card required • 14-day free trial
        </p>
      </div>
    </section>
  );
}

function Footer() {
  const links = {
    Product: ["Features", "Pricing", "Integrations", "API"],
    Company: ["About", "Blog", "Careers", "Press"],
    Resources: ["Documentation", "Help Center", "Contact", "Status"],
    Legal: ["Privacy", "Terms", "Security", "GDPR"],
  };

  return (
    <footer className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Jeany AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered customer service for modern businesses.
            </p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Jeany AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
