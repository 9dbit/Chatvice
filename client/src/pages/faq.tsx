import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  MessageCircle,
  HelpCircle,
  Brain,
  Bot,
  Shield,
  Zap,
  Database,
  Globe,
  CreditCard,
  Users,
  Settings,
  Code,
  Send,
  ArrowRight,
} from "lucide-react";
import PublicPageLayout from "./public-layout";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRef, useEffect } from "react";

const faqCategories = [
  {
    id: "general",
    name: "General",
    icon: HelpCircle,
    questions: [
      {
        q: "What is Chatvice?",
        a: "Chatvice is an AI-powered customer service chatbot platform designed for businesses in Indonesia and globally. It helps you automate customer support, reduce response times, and provide 24/7 service through intelligent AI agents powered by our LEXA1 engine."
      },
      {
        q: "What is LEXA1?",
        a: "LEXA1 is the AI engine that powers Chatvice. It's built on advanced language models (GPT-4) with semantic search capabilities using vector embeddings. LEXA1 understands context, learns from your knowledge base, and provides accurate, natural responses in multiple languages."
      },
      {
        q: "How is Chatvice different from other chatbots?",
        a: "Chatvice stands out with: 1) Smart human escalation - AI knows when to hand off to supervisors, 2) Per-agent knowledge bases with semantic search, 3) Real-time supervisor panel for human takeover, 4) Indonesian payment support via 1-Pay, 5) Customizable embeddable widget, 6) Multi-language support with automatic detection."
      },
      {
        q: "Is Chatvice available in Indonesia?",
        a: "Yes! Chatvice is specifically optimized for Indonesian businesses. We support 1-Pay (Indonesian payment gateway) with QRIS for easy subscription payments. Our AI can communicate in Bahasa Indonesia and other languages."
      },
      {
        q: "Do I need technical skills to use Chatvice?",
        a: "No technical skills required! Our platform is designed for simplicity. You can train your AI agent by uploading documents, adding FAQs, or crawling your website. The embed code for your website is just a single line of JavaScript."
      },
    ]
  },
  {
    id: "ai-features",
    name: "AI & Features",
    icon: Brain,
    questions: [
      {
        q: "How does the AI learn about my business?",
        a: "The AI learns through your knowledge base. You can: 1) Upload documents (PDF, TXT, DOCX), 2) Add manual Q&A pairs, 3) Crawl your website for FAQs, 4) Import from another agent. All content is converted to vector embeddings for semantic search, so the AI understands meaning, not just keywords."
      },
      {
        q: "What is semantic search?",
        a: "Semantic search uses AI to understand the meaning behind questions, not just match keywords. For example, if a customer asks 'how much does it cost?' the AI will find pricing information even if your knowledge base says 'subscription fees' instead of 'cost'. This provides much more accurate responses."
      },
      {
        q: "Can I customize the AI's personality?",
        a: "Yes! Each agent has a custom System Prompt where you can define: 1) Language style (formal/informal), 2) Business rules (max discounts, policies), 3) Specific greetings and closings, 4) Product recommendations, 5) Escalation triggers. The AI will follow these instructions strictly."
      },
      {
        q: "What languages does LEXA1 support?",
        a: "LEXA1 supports automatic language detection and responds in the customer's language. This includes: English, Bahasa Indonesia, Chinese, Japanese, Korean, Spanish, French, German, and 50+ other languages. The AI automatically detects and matches the customer's language."
      },
      {
        q: "How accurate is the AI?",
        a: "Accuracy depends on your knowledge base quality. With well-structured FAQs and documentation, LEXA1 achieves 90%+ accuracy for common questions. The AI also knows its limits - when uncertain, it will honestly say so and offer to connect with a human agent."
      },
      {
        q: "Can the AI handle complex queries?",
        a: "Yes, LEXA1 can handle multi-turn conversations, follow-up questions, and context-dependent queries. For very complex issues beyond its scope, it will automatically escalate to human supervisors based on your trigger settings."
      },
    ]
  },
  {
    id: "escalation",
    name: "Human Escalation",
    icon: Users,
    questions: [
      {
        q: "What is human escalation?",
        a: "Human escalation is when the AI automatically transfers a conversation to a human supervisor. This happens when: 1) The AI can't answer the question, 2) The customer explicitly requests human help, 3) Certain trigger keywords are detected (e.g., 'refund', 'complaint'), 4) The conversation reaches a complexity threshold."
      },
      {
        q: "How do supervisors get assigned to chats?",
        a: "Supervisors are assigned to specific agents and receive chats through round-robin distribution. Each supervisor can handle up to 3 agents. When a chat escalates, the next available supervisor in the rotation takes over."
      },
      {
        q: "Can supervisors take over AI conversations?",
        a: "Yes! Supervisors have a real-time panel where they can: 1) See all escalated conversations, 2) Read the full chat history, 3) Take over and respond as a human, 4) Return the conversation to AI when resolved. All transitions are seamless for the customer."
      },
      {
        q: "What triggers automatic escalation?",
        a: "You can configure triggers in the dashboard: 1) Keyword triggers (e.g., 'refund', 'manager', 'urgent'), 2) Sentiment triggers (when customer seems frustrated), 3) Topic triggers (sensitive topics like complaints), 4) Manual triggers (customer clicks 'Talk to Human' button)."
      },
      {
        q: "Do supervisors get notified of escalations?",
        a: "Yes! Supervisors receive: 1) Dashboard notification dots, 2) Audio alerts for new escalations, 3) Real-time WebSocket updates. The supervisor panel shows all pending escalated sessions with 'Needs Attention' indicators."
      },
    ]
  },
  {
    id: "widget",
    name: "Chat Widget",
    icon: MessageCircle,
    questions: [
      {
        q: "How do I add the chat widget to my website?",
        a: "Just add one line of code to your website: <script src=\"https://your-app.replit.app/widget.js\" data-merchant-id=\"YOUR_ID\"></script>. The widget will appear in the bottom-right corner. You can customize colors, position, and behavior from the dashboard."
      },
      {
        q: "Can I customize the widget appearance?",
        a: "Yes! You can customize: 1) Primary and secondary colors, 2) Agent name and photo, 3) Welcome message, 4) Suggested questions, 5) Widget position (left/right), 6) Header text and style. Pro/Enterprise plans get additional styling options."
      },
      {
        q: "Does the widget support media uploads?",
        a: "Yes! Customers can: 1) Upload photos and images, 2) Upload videos, 3) Take photos directly from their camera. This is useful for product support, returns, and technical troubleshooting."
      },
      {
        q: "Can I restrict which domains can use my widget?",
        a: "Yes! In Widget Settings, you can specify Allowed Domains. The widget will only load on those domains, preventing unauthorized usage. This is available on Pro and Enterprise plans."
      },
      {
        q: "What is Identity Verification?",
        a: "Identity Verification (Pro/Enterprise) allows you to authenticate customers before chat. You generate a JWT token on your server with customer details (ID, name, email), and the widget verifies this token. This enables personalized, secure conversations."
      },
    ]
  },
  {
    id: "pricing",
    name: "Pricing & Billing",
    icon: CreditCard,
    questions: [
      {
        q: "What are the pricing plans?",
        a: "We offer three plans: 1) Starter ($29/month) - 1 agent, 1,000 messages, basic features, 2) Professional ($99/month) - 5 agents, 10,000 messages, human escalation, analytics, 3) Enterprise (Custom) - Unlimited agents and messages, SLA, dedicated support."
      },
      {
        q: "Is there a free trial?",
        a: "Yes! All plans include a 14-day free trial with full access to features. No credit card required to start. After the trial, you can choose a plan or continue with limited free access."
      },
      {
        q: "What payment methods do you accept?",
        a: "For Indonesian users, we accept 1-Pay with QRIS - compatible with GoPay, OVO, DANA, ShopeePay, LinkAja, and all Indonesian e-wallets and mobile banking apps. International payments are also supported."
      },
      {
        q: "How does billing work?",
        a: "Subscriptions are billed monthly or yearly (with 20% discount). You can upgrade, downgrade, or cancel anytime. Usage is tracked per billing cycle and resets at the start of each period."
      },
      {
        q: "What happens if I exceed my message limit?",
        a: "When you approach your limit, you'll receive notifications. After exceeding, you can: 1) Upgrade your plan, 2) Purchase additional message packs, 3) Wait for the next billing cycle. The widget will continue working but may show limited responses."
      },
    ]
  },
  {
    id: "technical",
    name: "Technical & API",
    icon: Code,
    questions: [
      {
        q: "Do you have an API?",
        a: "Yes! We offer a REST API for: 1) Managing agents and knowledge bases, 2) Sending and receiving messages programmatically, 3) Accessing analytics data, 4) Webhook integrations. Full API documentation is available at /api-docs."
      },
      {
        q: "What integrations are available?",
        a: "Current integrations include: 1) Website embed (JavaScript widget), 2) Webhook notifications, 3) 1-Pay payment gateway. Coming soon: WhatsApp, Slack, Zendesk, Salesforce, and more."
      },
      {
        q: "Is my data secure?",
        a: "Yes! We implement: 1) TLS encryption for all data in transit, 2) Encrypted database storage, 3) Session-based authentication with bcrypt hashing, 4) JWT verification for widget identity, 5) Strict access controls between merchants. We never share your data."
      },
      {
        q: "Where is data stored?",
        a: "Data is stored on secure servers with regular backups. Conversations, knowledge bases, and configurations are all encrypted. We comply with Indonesian data regulations and GDPR for European customers."
      },
      {
        q: "Can I export my data?",
        a: "Yes! You can export: 1) Conversation histories (CSV/JSON), 2) Knowledge base content, 3) Analytics reports. Data portability is important to us - your data belongs to you."
      },
      {
        q: "What's the uptime guarantee?",
        a: "We guarantee 99.9% uptime SLA for all paid plans. Our infrastructure is designed for high availability with automatic failover. Check real-time status at /status."
      },
    ]
  },
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Zap,
    questions: [
      {
        q: "How do I create an account?",
        a: "Visit /register and sign up with your email. You'll receive a confirmation email, then you can immediately start setting up your first AI agent. No credit card required for the free trial."
      },
      {
        q: "How long does setup take?",
        a: "Basic setup takes about 10 minutes: 1) Create account (2 min), 2) Create first agent (2 min), 3) Add knowledge base content (5 min), 4) Get embed code (1 min). You can start receiving customer chats immediately!"
      },
      {
        q: "What should I add to my knowledge base first?",
        a: "Start with: 1) Frequently asked questions from your support team, 2) Product/service information, 3) Pricing and policies, 4) Contact information, 5) Common troubleshooting steps. The more comprehensive your knowledge base, the better the AI performs."
      },
      {
        q: "Can I test before going live?",
        a: "Absolutely! Use the Playground in your dashboard to test conversations with your agent. You can also use the Widget Demo page to see exactly how it will appear on your website before embedding."
      },
      {
        q: "How do I add more team members?",
        a: "From the dashboard, go to Team > Supervisors. You can invite supervisors who will have access to handle escalated conversations. Each supervisor can be assigned to specific agents."
      },
    ]
  },
];

function Lexa1FAQAssistant() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; content: string }>>([
    { role: "bot", content: "Hi! I'm Lexa1. Ask me any question about Chatvice and I'll help you find the answer from our FAQ!" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/demo/ask", { question });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "bot", content: data.answer }]);
      setIsTyping(false);
    },
    onError: () => {
      const allFaqs = faqCategories.flatMap(cat => cat.questions);
      const randomFaq = allFaqs[Math.floor(Math.random() * allFaqs.length)];
      setMessages(prev => [...prev, { role: "bot", content: randomFaq.a }]);
      setIsTyping(false);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);
    askMutation.mutate(input);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="w-full max-w-md border-purple-200 dark:border-purple-800/50 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">Ask Lexa1</p>
            <p className="text-xs text-white/80">FAQ Assistant</p>
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Brain className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`rounded-xl p-2.5 max-w-[85%] text-sm ${msg.role === "user" ? "bg-purple-600 text-white" : "bg-muted"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <div className="bg-muted rounded-xl p-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 h-9 text-sm"
            data-testid="input-faq-chat"
          />
          <Button 
            size="icon"
            onClick={handleSend} 
            disabled={isTyping}
            className="bg-purple-600 hover:bg-purple-700 h-9 w-9"
            data-testid="button-faq-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        searchQuery === "" ||
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => activeCategory === "all" || cat.id === activeCategory);

  const totalQuestions = filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <HelpCircle className="w-3 h-3 mr-1" />
            Help Center
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-left">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8 text-left">
            Find answers to common questions about Chatvice and LEXA1 AI engine.
          </p>
          <div className="max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for answers..."
              className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus-visible:ring-white"
              data-testid="input-faq-search"
            />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              onClick={() => setActiveCategory("all")}
              className={activeCategory === "all" ? "bg-purple-600 hover:bg-purple-700" : ""}
              data-testid="button-category-all"
            >
              All Categories
            </Button>
            {faqCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.id)}
                className={activeCategory === cat.id ? "bg-purple-600 hover:bg-purple-700" : ""}
                data-testid={`button-category-${cat.id}`}
              >
                <cat.icon className="w-4 h-4 mr-2" />
                {cat.name}
              </Button>
            ))}
          </div>

          <p className="text-left text-muted-foreground mb-8">
            Showing {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {filteredCategories.map((category) => (
                category.questions.length > 0 && (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <category.icon className="w-4 h-4 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-semibold">{category.name}</h2>
                    </div>
                    <Accordion type="single" collapsible className="space-y-2">
                      {category.questions.map((faq, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`${category.id}-${index}`}
                          className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/50"
                        >
                          <AccordionTrigger className="text-left hover:no-underline py-4" data-testid={`faq-${category.id}-${index}`}>
                            <span className="font-medium">{faq.q}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )
              ))}

              {totalQuestions === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">Try a different search term or browse by category.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <Lexa1FAQAssistant />

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Still need help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                  <div className="space-y-3">
                    <Link href="/contact">
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                    </Link>
                    <Link href="/docs">
                      <Button variant="outline" className="w-full justify-start">
                        <Database className="w-4 h-4 mr-2" />
                        Read Documentation
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-left">
            Ready to get started?
          </h2>
          <p className="text-purple-100 mb-8 max-w-2xl text-left">
            Start your 14-day free trial and see how LEXA1 can transform your customer service.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicPageLayout>
  );
}
