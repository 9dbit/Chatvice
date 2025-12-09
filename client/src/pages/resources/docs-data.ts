export interface DocArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  icon: string;
  readTime: string;
  content: string;
}

export const docCategories = [
  { slug: "getting-started", title: "Getting Started", icon: "Rocket" },
  { slug: "ai-knowledge-base", title: "AI & Knowledge Base", icon: "Brain" },
  { slug: "chat-widget", title: "Chat Widget", icon: "MessageCircle" },
  { slug: "team-escalation", title: "Team & Escalation", icon: "Users" },
  { slug: "api-reference", title: "API Reference", icon: "Code" },
  { slug: "security", title: "Security & Compliance", icon: "Shield" },
];

export const docArticles: DocArticle[] = [
  {
    slug: "creating-your-account",
    title: "Creating Your Chatvice Account",
    description: "Complete guide to setting up your Chatvice account and verifying your email address.",
    category: "Getting Started",
    categorySlug: "getting-started",
    icon: "Rocket",
    readTime: "3 min",
    content: `<p class="lead">Welcome to Chatvice! This guide will walk you through creating your account and getting started with our AI-powered customer service platform.</p>

<h2>Step 1: Sign Up</h2>

<p>Visit <a href="/register">chatvice.app/register</a> to create your free account. You'll need:</p>

<ul>
<li><strong>Business name</strong> — Your company or store name</li>
<li><strong>Email address</strong> — A valid business email for verification</li>
<li><strong>Password</strong> — At least 8 characters with mixed case and numbers</li>
</ul>

<h2>Step 2: Verify Your Email</h2>

<p>After registration, check your inbox for a verification email from <strong>hello@chatvice.app</strong>. Click the verification link to activate your account.</p>

<div class="bg-muted p-4 rounded-lg my-4">
<p class="text-sm"><strong>Tip:</strong> If you don't see the email, check your spam folder or <a href="/contact">contact support</a>.</p>
</div>

<h2>Step 3: Complete Your Profile</h2>

<p>Once verified, you'll be directed to your dashboard where you can:</p>

<ol>
<li>Add your company logo and branding</li>
<li>Set your timezone and language preferences</li>
<li>Choose your subscription plan (free plan available!)</li>
</ol>

<h2>Step 4: Create Your First AI Agent</h2>

<p>Navigate to <strong>Settings → Agents</strong> to create your first AI assistant. Give it a name, personality, and start building your knowledge base.</p>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/setting-up-first-agent">Setting up your first AI agent</a></li>
<li><a href="/docs/building-knowledge-base">Building your knowledge base</a></li>
<li><a href="/docs/embedding-chat-widget">Embedding the chat widget</a></li>
</ul>`
  },
  {
    slug: "setting-up-first-agent",
    title: "Setting Up Your First AI Agent",
    description: "Learn how to configure your AI agent with custom name, personality, and branding.",
    category: "Getting Started",
    categorySlug: "getting-started",
    icon: "Rocket",
    readTime: "5 min",
    content: `<p class="lead">Your AI agent is the heart of Chatvice. This guide shows you how to create an effective, branded AI assistant that represents your business.</p>

<h2>Accessing Agent Settings</h2>

<p>From your dashboard, navigate to <strong>Settings → Agents</strong> or click the "Create Agent" button on your overview page.</p>

<h2>Basic Configuration</h2>

<h3>Agent Name</h3>
<p>Choose a name that reflects your brand. Examples:</p>
<ul>
<li>"Alex" — A friendly, approachable name</li>
<li>"Support Bot" — Clear and functional</li>
<li>"Your Brand Assistant" — Branded approach</li>
</ul>

<h3>Agent Avatar</h3>
<p>Upload a profile picture for your agent. This appears in the chat widget and helps humanize interactions. Recommended size: 128x128 pixels.</p>

<h2>Personality Configuration</h2>

<h3>System Prompt</h3>
<p>The system prompt defines your agent's personality and behavior. A good system prompt includes:</p>

<ul>
<li><strong>Role definition</strong> — "You are a helpful customer service agent for [Company]"</li>
<li><strong>Tone guidelines</strong> — "Be friendly, professional, and concise"</li>
<li><strong>Knowledge scope</strong> — "You help with products, orders, and general inquiries"</li>
<li><strong>Escalation rules</strong> — "For billing issues, offer to connect with a human"</li>
</ul>

<h2>Advanced Settings</h2>

<h3>Temperature</h3>
<p>Controls response creativity (0.0-1.0):</p>
<ul>
<li><strong>0.0-0.3</strong> — Very consistent, factual responses</li>
<li><strong>0.4-0.6</strong> — Balanced (recommended)</li>
<li><strong>0.7-1.0</strong> — More creative, varied responses</li>
</ul>

<h2>Testing Your Agent</h2>

<p>Use the <strong>Live Preview</strong> feature to test your agent before going live. Try common customer questions and edge cases to ensure proper responses.</p>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/building-knowledge-base">Building your knowledge base</a></li>
<li><a href="/docs/customizing-responses">Customizing AI responses</a></li>
</ul>`
  },
  {
    slug: "building-knowledge-base",
    title: "Building Your Knowledge Base",
    description: "Create an effective knowledge base with FAQs, documents, and website content.",
    category: "AI & Knowledge Base",
    categorySlug: "ai-knowledge-base",
    icon: "Brain",
    readTime: "7 min",
    content: `<p class="lead">Your knowledge base is what makes your AI agent smart. The better your knowledge base, the more accurate and helpful your AI responses will be.</p>

<h2>What Goes in a Knowledge Base?</h2>

<p>Include any information your customers might ask about:</p>

<ul>
<li><strong>FAQs</strong> — Common questions and answers</li>
<li><strong>Product information</strong> — Features, pricing, specifications</li>
<li><strong>Policies</strong> — Shipping, returns, warranties</li>
<li><strong>Company info</strong> — About us, contact details, hours</li>
<li><strong>Troubleshooting</strong> — Common issues and solutions</li>
</ul>

<h2>Adding Content Manually</h2>

<p>From <strong>Knowledge → Add Content</strong>, you can:</p>

<ol>
<li>Give your entry a descriptive title</li>
<li>Write the content in natural language</li>
<li>Add tags for organization</li>
<li>Save and the AI will automatically index it</li>
</ol>

<h2>Importing from URLs</h2>

<p>Use our <strong>Web Crawler</strong> to automatically import content from your website:</p>

<ol>
<li>Go to <strong>Sources → Add Source</strong></li>
<li>Enter your website URL</li>
<li>Choose crawl depth (1-3 levels)</li>
<li>Select pages to include</li>
<li>Click "Import" and we'll extract the content</li>
</ol>

<h2>How Semantic Search Works</h2>

<p>Unlike keyword matching, Chatvice uses semantic search with embeddings:</p>

<ol>
<li>Your content is converted to mathematical vectors</li>
<li>Customer questions are also vectorized</li>
<li>We find the most relevant content by similarity</li>
<li>The AI uses this context to generate responses</li>
</ol>

<p>This means customers don't need to use exact keywords — the AI understands intent.</p>

<h2>Best Practices</h2>

<ul>
<li><strong>Be complete</strong> — Include all details a customer might need</li>
<li><strong>Use natural language</strong> — Write as you'd speak to a customer</li>
<li><strong>Update regularly</strong> — Keep information current</li>
<li><strong>Review analytics</strong> — See what customers ask and fill gaps</li>
</ul>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/semantic-search-explained">Understanding semantic search</a></li>
<li><a href="/docs/writing-system-prompts">Writing effective system prompts</a></li>
</ul>`
  },
  {
    slug: "embedding-chat-widget",
    title: "Embedding the Chat Widget",
    description: "Step-by-step guide to adding the Chatvice chat widget to your website.",
    category: "Chat Widget",
    categorySlug: "chat-widget",
    icon: "MessageCircle",
    readTime: "4 min",
    content: `<p class="lead">Add the Chatvice chat widget to your website in minutes. Our lightweight widget works on any platform — WordPress, Shopify, Wix, or custom HTML.</p>

<h2>Getting Your Widget Code</h2>

<ol>
<li>Go to <strong>Settings → Widget</strong> in your dashboard</li>
<li>Configure your widget appearance (colors, position, etc.)</li>
<li>Copy the embed code</li>
</ol>

<h2>Installation Methods</h2>

<h3>WordPress</h3>

<ol>
<li>Go to <strong>Appearance → Theme Editor</strong></li>
<li>Open <strong>footer.php</strong></li>
<li>Paste the widget code before the closing body tag</li>
<li>Or use a plugin like "Insert Headers and Footers"</li>
</ol>

<h3>Shopify</h3>

<ol>
<li>Go to <strong>Online Store → Themes</strong></li>
<li>Click <strong>Actions → Edit Code</strong></li>
<li>Open <strong>theme.liquid</strong></li>
<li>Paste the code before the closing body tag</li>
</ol>

<h3>Wix</h3>

<ol>
<li>Go to <strong>Settings → Custom Code</strong></li>
<li>Click <strong>Add Custom Code</strong></li>
<li>Paste the widget code</li>
<li>Set placement to "Body - end"</li>
</ol>

<h2>Allowed Domains</h2>

<p>For security, configure which domains can use your widget:</p>

<ol>
<li>Go to <strong>Settings → Widget → Security</strong></li>
<li>Add your domain(s): example.com, www.example.com</li>
<li>Save settings</li>
</ol>

<h2>Testing Your Widget</h2>

<p>After installation:</p>

<ol>
<li>Clear your browser cache</li>
<li>Visit your website</li>
<li>Look for the chat bubble in the corner</li>
<li>Send a test message</li>
</ol>

<h2>Troubleshooting</h2>

<ul>
<li><strong>Widget not appearing?</strong> — Check browser console for errors</li>
<li><strong>Wrong colors?</strong> — Clear cache or check CSS conflicts</li>
<li><strong>Not responding?</strong> — Verify your agent is active</li>
</ul>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/widget-customization">Widget customization options</a></li>
<li><a href="/docs/suggested-questions">Setting up suggested questions</a></li>
</ul>`
  },
  {
    slug: "widget-customization",
    title: "Widget Customization Options",
    description: "Customize colors, position, branding, and behavior of your chat widget.",
    category: "Chat Widget",
    categorySlug: "chat-widget",
    icon: "MessageCircle",
    readTime: "5 min",
    content: `<p class="lead">Make the Chatvice widget match your brand perfectly. Customize every aspect from colors and icons to behavior and messages.</p>

<h2>Appearance Settings</h2>

<h3>Colors</h3>
<p>In <strong>Settings → Widget</strong>, you can customize:</p>
<ul>
<li><strong>Primary color</strong> — Chat bubble and header background</li>
<li><strong>Text color</strong> — Message text colors</li>
<li><strong>Background</strong> — Chat window background</li>
</ul>

<h3>Widget Position</h3>
<p>Choose where the chat bubble appears:</p>
<ul>
<li><strong>Bottom Right</strong> — Most common, standard UX</li>
<li><strong>Bottom Left</strong> — Alternative placement</li>
</ul>

<h3>Custom Icon</h3>
<p>Upload your own chat button icon (PNG or SVG). Recommended size: 48x48 pixels.</p>

<h2>Welcome Message</h2>

<p>Configure the initial greeting when customers open the chat.</p>

<h2>Welcome Bubble</h2>

<p>Show a proactive bubble that appears before customers click:</p>

<ul>
<li><strong>Enable/disable</strong> — Toggle the welcome bubble</li>
<li><strong>Delay</strong> — How many seconds before it appears</li>
<li><strong>Message</strong> — Short attention-grabbing text</li>
</ul>

<h2>Suggested Questions</h2>

<p>Help customers start conversations with pre-defined questions:</p>

<ol>
<li>Go to <strong>Settings → Chat Buttons</strong></li>
<li>Add common questions customers might have</li>
</ol>

<h2>Mobile Responsiveness</h2>

<p>The widget automatically adapts to mobile devices:</p>

<ul>
<li>Full-screen mode on mobile</li>
<li>Touch-optimized buttons</li>
<li>Keyboard-aware layout</li>
</ul>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/product-cards">Setting up product cards</a></li>
<li><a href="/docs/quick-replies">Configuring quick replies</a></li>
</ul>`
  },
  {
    slug: "adding-supervisors",
    title: "Adding and Managing Supervisors",
    description: "Set up human agents to handle escalated conversations and complex inquiries.",
    category: "Team & Escalation",
    categorySlug: "team-escalation",
    icon: "Users",
    readTime: "4 min",
    content: `<p class="lead">Supervisors are your human agents who handle conversations when AI isn't enough. Learn how to add and manage your support team.</p>

<h2>What Supervisors Can Do</h2>

<ul>
<li>Take over conversations from AI</li>
<li>View and respond to escalated chats</li>
<li>Access customer conversation history</li>
<li>Manage their availability status</li>
</ul>

<h2>Adding a New Supervisor</h2>

<ol>
<li>Go to <strong>Settings → Supervisors</strong></li>
<li>Click <strong>Add Supervisor</strong></li>
<li>Enter their details: Name, Email address, Temporary password, Role (optional)</li>
<li>Click <strong>Create</strong></li>
</ol>

<h2>Supervisor Roles</h2>

<p>Assign roles to organize your team:</p>

<ul>
<li><strong>General Support</strong> — Handles all inquiries</li>
<li><strong>Technical Support</strong> — Product/technical issues</li>
<li><strong>Billing</strong> — Payment and subscription questions</li>
<li><strong>VIP Support</strong> — High-value customers</li>
</ul>

<h2>Supervisor Dashboard</h2>

<p>Supervisors access their panel at /supervisor where they can:</p>

<ul>
<li>See queue of waiting conversations</li>
<li>View real-time chat messages</li>
<li>Take over from AI</li>
<li>Mark conversations as resolved</li>
<li>Add internal notes</li>
</ul>

<h2>Round-Robin Distribution</h2>

<p>When multiple supervisors are online, Chatvice distributes conversations evenly using round-robin assignment.</p>

<h2>Availability Status</h2>

<p>Supervisors can set their status:</p>

<ul>
<li><strong>Online</strong> — Available to receive chats</li>
<li><strong>Away</strong> — Temporarily unavailable</li>
<li><strong>Offline</strong> — Not receiving new chats</li>
</ul>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/escalation-triggers">Configuring escalation triggers</a></li>
<li><a href="/docs/round-robin-assignment">Understanding round-robin assignment</a></li>
</ul>`
  },
  {
    slug: "escalation-triggers",
    title: "Configuring Escalation Triggers",
    description: "Set up automatic rules for when conversations should be handed to humans.",
    category: "Team & Escalation",
    categorySlug: "team-escalation",
    icon: "Users",
    readTime: "5 min",
    content: `<p class="lead">Not every conversation should stay with AI. Configure triggers to automatically escalate conversations to human supervisors when needed.</p>

<h2>Types of Triggers</h2>

<h3>Keyword Triggers</h3>
<p>Escalate when customers use specific words:</p>
<ul>
<li>"speak to human"</li>
<li>"manager"</li>
<li>"complaint"</li>
<li>"refund" (optional)</li>
<li>"cancel subscription"</li>
</ul>

<h3>Sentiment Triggers</h3>
<p>Automatically detect frustrated customers and escalate when:</p>
<ul>
<li>Negative sentiment is detected</li>
<li>Multiple failed responses occur</li>
<li>Customer uses capital letters or exclamation marks</li>
</ul>

<h3>Topic Triggers</h3>
<p>Route specific topics to humans:</p>
<ul>
<li>Billing and payment issues</li>
<li>Account security concerns</li>
<li>Legal or compliance matters</li>
</ul>

<h2>Setting Up Triggers</h2>

<ol>
<li>Go to <strong>Settings → Triggers</strong></li>
<li>Click <strong>Add Trigger</strong></li>
<li>Choose trigger type</li>
<li>Configure conditions: Keywords to match, Match type, Case sensitivity</li>
<li>Set priority (determines routing order)</li>
<li>Save</li>
</ol>

<h2>Trigger Actions</h2>

<p>When triggered, you can:</p>

<ul>
<li><strong>Escalate immediately</strong> — Transfer to supervisor queue</li>
<li><strong>Notify supervisor</strong> — Alert but keep AI engaged</li>
<li><strong>Send custom message</strong> — Acknowledge the escalation</li>
<li><strong>Route to specific role</strong> — E.g., billing issues to billing team</li>
</ul>

<h2>Best Practices</h2>

<ul>
<li>Start with common escalation keywords</li>
<li>Don't over-trigger — let AI handle simple questions</li>
<li>Review escalation logs regularly</li>
<li>Adjust triggers based on customer feedback</li>
</ul>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/work-scheduler">Setting up work schedules</a></li>
<li><a href="/docs/team-activity">Monitoring team activity</a></li>
</ul>`
  },
  {
    slug: "api-authentication",
    title: "API Authentication",
    description: "Learn how to authenticate with the Chatvice API using security tokens.",
    category: "API Reference",
    categorySlug: "api-reference",
    icon: "Code",
    readTime: "4 min",
    content: `<p class="lead">The Chatvice API allows you to programmatically manage agents, sessions, and messages. This guide covers authentication requirements.</p>

<h2>Getting Your API Key</h2>

<ol>
<li>Go to <strong>Settings → Integrations</strong></li>
<li>Click <strong>Generate API Key</strong></li>
<li>Copy and securely store your key</li>
</ol>

<div class="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg my-4">
<p class="text-sm text-yellow-800 dark:text-yellow-200"><strong>Warning:</strong> Never expose your API key in client-side code. Always use it server-side only.</p>
</div>

<h2>Authentication Methods</h2>

<h3>Bearer Token</h3>
<p>Include your API key in the Authorization header:</p>

<pre class="bg-muted p-4 rounded-lg overflow-x-auto text-sm">Authorization: Bearer YOUR_API_KEY</pre>

<h2>API Base URL</h2>

<pre class="bg-muted p-4 rounded-lg overflow-x-auto text-sm">https://chatvice.app/api/v1</pre>

<h2>Rate Limits</h2>

<p>API requests are rate-limited by plan:</p>

<ul>
<li><strong>Free</strong> — 100 requests/hour</li>
<li><strong>Pro</strong> — 1,000 requests/hour</li>
<li><strong>Enterprise</strong> — Unlimited</li>
</ul>

<h2>Error Responses</h2>

<ul>
<li><strong>401</strong> — Missing or invalid API key</li>
<li><strong>403</strong> — Insufficient permissions</li>
<li><strong>429</strong> — Rate limit exceeded</li>
</ul>

<h2>Widget Identity Verification</h2>

<p>For Pro/Enterprise plans, verify customer identity with JWT tokens signed using your secret key. This prevents widget spoofing.</p>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/sessions-api">Sessions API reference</a></li>
<li><a href="/docs/messages-api">Messages API reference</a></li>
<li><a href="/docs/webhooks">Setting up webhooks</a></li>
</ul>`
  },
  {
    slug: "data-security",
    title: "Data Security & Encryption",
    description: "Learn how Chatvice protects your data with enterprise-grade security measures.",
    category: "Security & Compliance",
    categorySlug: "security",
    icon: "Shield",
    readTime: "5 min",
    content: `<p class="lead">Security is fundamental to Chatvice. Learn about our comprehensive security measures that protect your data and your customers' information.</p>

<h2>Encryption Standards</h2>

<h3>Data in Transit</h3>
<ul>
<li>TLS 1.3 encryption for all connections</li>
<li>HTTPS enforced on all endpoints</li>
<li>WebSocket connections are encrypted</li>
</ul>

<h3>Data at Rest</h3>
<ul>
<li>AES-256 encryption for stored data</li>
<li>Encrypted database backups</li>
<li>Secure key management</li>
</ul>

<h2>Infrastructure Security</h2>

<ul>
<li>Hosted on secure cloud infrastructure</li>
<li>Regular security audits</li>
<li>DDoS protection</li>
<li>Firewall and intrusion detection</li>
<li>Automatic security patching</li>
</ul>

<h2>Access Controls</h2>

<p>Chatvice implements role-based access control (RBAC):</p>

<ul>
<li><strong>Merchant</strong> — Full access to dashboard</li>
<li><strong>Supervisor</strong> — Access to assigned conversations</li>
<li><strong>API</strong> — Scoped permissions via tokens</li>
</ul>

<h2>Authentication Security</h2>

<ul>
<li>Passwords hashed with bcrypt</li>
<li>Session tokens with expiration</li>
<li>Secure password reset flow</li>
<li>Login attempt monitoring</li>
</ul>

<h2>Data Retention</h2>

<p>By default:</p>
<ul>
<li>Chat messages retained for 2 years</li>
<li>Session data retained for 1 year</li>
<li>Logs retained for 90 days</li>
</ul>

<p>Enterprise plans can customize retention policies.</p>

<h2>GDPR Compliance</h2>

<p>Chatvice supports GDPR requirements:</p>

<ul>
<li><strong>Right to Access</strong> — Export customer data</li>
<li><strong>Right to Erasure</strong> — Delete customer data</li>
<li><strong>Data Portability</strong> — Export in standard formats</li>
<li><strong>Consent Management</strong> — Widget consent options</li>
</ul>

<h2>Security Best Practices</h2>

<ul>
<li>Use strong, unique passwords</li>
<li>Restrict API key access</li>
<li>Review supervisor access regularly</li>
<li>Monitor audit logs</li>
<li>Enable allowed domains for widget</li>
</ul>

<h2>Reporting Security Issues</h2>

<p>Found a vulnerability? Contact us at <a href="mailto:hello@chatvice.app">hello@chatvice.app</a>. We take security reports seriously and respond within 24 hours.</p>

<h2>What's Next?</h2>

<ul>
<li><a href="/docs/gdpr-compliance">GDPR compliance details</a></li>
<li><a href="/docs/audit-logs">Using audit logs</a></li>
</ul>`
  }
];

export function getDocArticleBySlug(slug: string): DocArticle | undefined {
  return docArticles.find(article => article.slug === slug);
}

export function getDocArticlesByCategory(categorySlug: string): DocArticle[] {
  return docArticles.filter(article => article.categorySlug === categorySlug);
}
