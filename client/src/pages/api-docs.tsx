import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  Zap,
  Shield,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Key,
  Globe,
  MessageSquare,
  Database,
  Users,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import PublicPageLayout from "./public-layout";

export default function APIDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const endpoints = [
    {
      method: "GET",
      endpoint: "/api/agents",
      description: "List all AI agents",
      category: "Agents"
    },
    {
      method: "POST",
      endpoint: "/api/agents",
      description: "Create a new agent",
      category: "Agents"
    },
    {
      method: "GET",
      endpoint: "/api/sessions",
      description: "List chat sessions",
      category: "Sessions"
    },
    {
      method: "POST",
      endpoint: "/api/messages",
      description: "Send a message",
      category: "Messages"
    },
    {
      method: "GET",
      endpoint: "/api/knowledge",
      description: "List knowledge base items",
      category: "Knowledge"
    },
    {
      method: "POST",
      endpoint: "/api/knowledge",
      description: "Add knowledge item",
      category: "Knowledge"
    },
    {
      method: "GET",
      endpoint: "/api/analytics",
      description: "Get analytics data",
      category: "Analytics"
    },
  ];

  const codeExamples = {
    curl: `curl -X GET "https://api.chatvice.com/api/agents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    javascript: `const response = await fetch('https://api.chatvice.com/api/agents', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const agents = await response.json();
console.log(agents);`,
    python: `import requests

response = requests.get(
    'https://api.chatvice.com/api/agents',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
)

agents = response.json()
print(agents)`
  };

  const sendMessageExample = {
    curl: `curl -X POST "https://api.chatvice.com/api/messages" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "sess_123abc",
    "content": "Hello, I need help with my order",
    "role": "customer"
  }'`,
    javascript: `const response = await fetch('https://api.chatvice.com/api/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 'sess_123abc',
    content: 'Hello, I need help with my order',
    role: 'customer'
  })
});

const message = await response.json();
// { id: 'msg_xyz', content: '...', aiResponse: '...' }`,
    python: `import requests

response = requests.post(
    'https://api.chatvice.com/api/messages',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'sessionId': 'sess_123abc',
        'content': 'Hello, I need help with my order',
        'role': 'customer'
    }
)

message = response.json()
# { 'id': 'msg_xyz', 'content': '...', 'aiResponse': '...' }`
  };

  return (
    <PublicPageLayout>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="bg-white/20 text-white mb-4">
              <Code className="w-3 h-3 mr-1" />
              API Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Build with the Chatvice API
            </h1>
            <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
              Integrate AI-powered customer service into your applications with our comprehensive REST API.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                  Get API Key
                  <Key className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#quickstart">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Quick Start Guide
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="p-6 text-center">
              <Shield className="w-10 h-10 mx-auto text-purple-600 mb-4" />
              <h3 className="font-semibold mb-2">Secure</h3>
              <p className="text-sm text-muted-foreground">TLS encryption & API key auth</p>
            </Card>
            <Card className="p-6 text-center">
              <Zap className="w-10 h-10 mx-auto text-purple-600 mb-4" />
              <h3 className="font-semibold mb-2">Fast</h3>
              <p className="text-sm text-muted-foreground">Low latency responses</p>
            </Card>
            <Card className="p-6 text-center">
              <Globe className="w-10 h-10 mx-auto text-purple-600 mb-4" />
              <h3 className="font-semibold mb-2">RESTful</h3>
              <p className="text-sm text-muted-foreground">Standard REST conventions</p>
            </Card>
            <Card className="p-6 text-center">
              <Code className="w-10 h-10 mx-auto text-purple-600 mb-4" />
              <h3 className="font-semibold mb-2">JSON</h3>
              <p className="text-sm text-muted-foreground">JSON request/response</p>
            </Card>
          </div>
        </div>
      </section>

      <section id="quickstart" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started with the Chatvice API in minutes.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">1. Get Your API Key</h3>
              <p className="text-muted-foreground mb-4">
                Sign up for a Chatvice account and navigate to Settings → API to generate your API key.
              </p>
              <Card className="p-4 bg-muted/50">
                <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
              </Card>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">2. Make Your First Request</h3>
              <p className="text-muted-foreground mb-4">
                Use the examples below to list your AI agents.
              </p>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>
                {Object.entries(codeExamples).map(([lang, code]) => (
                  <TabsContent key={lang} value={lang}>
                    <Card className="relative">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(code, `list-${lang}`)}
                      >
                        {copiedCode === `list-${lang}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <pre className="p-4 overflow-x-auto text-sm">
                        <code>{code}</code>
                      </pre>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">API Endpoints</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive endpoints for managing agents, sessions, messages, and more.
            </p>
          </div>

          <div className="grid gap-4">
            {["Agents", "Sessions", "Messages", "Knowledge", "Analytics"].map((category) => (
              <Card key={category} className="overflow-hidden">
                <div className="p-4 bg-muted/50 border-b border-border flex items-center gap-3">
                  {category === "Agents" && <Users className="w-5 h-5 text-purple-600" />}
                  {category === "Sessions" && <MessageSquare className="w-5 h-5 text-purple-600" />}
                  {category === "Messages" && <MessageSquare className="w-5 h-5 text-purple-600" />}
                  {category === "Knowledge" && <Database className="w-5 h-5 text-purple-600" />}
                  {category === "Analytics" && <BarChart3 className="w-5 h-5 text-purple-600" />}
                  <h3 className="font-semibold">{category}</h3>
                </div>
                <div className="divide-y divide-border">
                  {endpoints.filter(e => e.category === category).map((endpoint, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <Badge 
                        className={`w-16 justify-center ${
                          endpoint.method === "GET" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                          endpoint.method === "POST" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }`}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono flex-1">{endpoint.endpoint}</code>
                      <span className="text-sm text-muted-foreground">{endpoint.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Send a Message</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Example: Send a customer message and receive an AI response.
            </p>
          </div>

          <Tabs defaultValue="curl" className="max-w-4xl mx-auto">
            <TabsList className="mb-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            {Object.entries(sendMessageExample).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <Card className="relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(code, `send-${lang}`)}
                  >
                    {copiedCode === `send-${lang}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <pre className="p-4 overflow-x-auto text-sm">
                    <code>{code}</code>
                  </pre>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Build?
          </h2>
          <p className="text-lg text-purple-100 mb-8">
            Start integrating Chatvice into your applications today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                Get Your API Key
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Full Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
