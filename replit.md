# Chatvice - Customer Service Chatbot Platform

## Overview

Chatvice is an AI-powered customer service chatbot platform designed to automate customer support for businesses. It provides intelligent responses, seamless escalation to human supervisors, and a customizable chat widget for merchant websites. The platform includes a merchant dashboard for configuration and monitoring, and a supervisor panel for managing escalated conversations. Its primary goal is to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure and Design

Chatvice is built as a monorepo, separating client (`/client`), server (`/server`), and shared (`/shared`) components. It features a multi-panel design catering to different user roles: a public Landing Page, a Merchant Dashboard for configuration and analytics, a Supervisor Panel for real-time human intervention, an embeddable Chat Widget for customers, and an Admin Master Panel for system-wide management. The UI/UX is based on Shadcn/ui and Radix UI, utilizing Tailwind CSS for styling with a custom "new-york" theme and dark mode support. Typography uses Inter for UI and JetBrains Mono for technical data.

### Technology Stack

-   **Frontend**: React with TypeScript, Vite, Wouter for routing, TanStack Query for server state, React Hook Form with Zod for validation.
-   **Backend**: Express.js with TypeScript, `ws` for WebSocket communication, `express-session` for session management.
-   **Database**: PostgreSQL with Drizzle ORM, storing core entities like Merchants, Supervisors, Sessions, Messages, Triggers, Knowledge Base content, and Vector Embeddings.
-   **AI Integration**: OpenAI API (via Replit AI Integrations) for GPT-4.1-mini chat completions and text-embedding-3-small for vector embeddings, enabling semantic search and multi-language support.

### Key Features

-   **AI-Powered Chatbot**: Automates customer responses, with semantic search using vector embeddings from the knowledge base.
-   **Human Escalation**: Automatically escalates conversations to human supervisors based on predefined triggers or customer requests.
-   **Multi-Language Support**: Automatic language detection and AI responses in the customer's language.
-   **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming, real-time status display, and media upload support (photo/video/camera).
-   **Merchant Dashboard**: Comprehensive analytics, knowledge base management (with web crawler for FAQ extraction), trigger configuration, supervisor management, and subscription plan management.
-   **Supervisor Panel**: Real-time interface for handling escalated customer conversations, including message sending and session management.
-   **Authentication & Authorization**: Session-based authentication with bcrypt for password hashing, supporting Merchant and Supervisor roles.
-   **Real-time Communication**: WebSocket architecture for instant message delivery and updates, with polling fallbacks.
-   **Suggested Questions**: Merchants can configure quick question buttons that appear in the chat widget to guide customer conversations. Questions are managed in the Knowledge Base page with live preview testing.
-   **Media Upload Support**: Customers can share photos and videos through the chat widget. Supports photo upload, video upload, and camera capture.

### Data Model Highlights

Core entities include Merchants (with customizable configurations), Supervisors, Sessions (tracking AI/HUMAN mode), Messages, Triggers (for escalation), Knowledge Base content (for AI training), Knowledge Chunks (vector embeddings for semantic search), Notifications, Subscription Plans (tiered pricing), Merchant Subscriptions (1-Pay integration with QRIS), Agents (AI agents with plan-based limits), and Sources (for AI knowledge input).

### Payment Integration (1-Pay)

Chatvice uses 1-Pay Indonesian payment gateway (https://1-pay.id) for subscription billing, replacing Stripe to support Indonesian users.

**Payment Flow**:
1. Merchant selects a plan and billing interval
2. Backend creates QRIS payment via `/api/billing/checkout`
3. Frontend displays QR code with countdown timer
4. User scans QR with any Indonesian e-wallet (GoPay, OVO, DANA, ShopeePay, etc.)
5. 1-Pay webhook confirms payment at `/api/onepay/webhook`
6. Subscription is activated and features unlocked

**Key Files**:
- `server/onepayClient.ts` - 1-Pay API client with HMAC SHA256 signature generation
- `server/onepayWebhook.ts` - Webhook handler for payment confirmations
- `client/src/pages/dashboard/billing.tsx` - QRIS payment UI with QR display and polling

**Payment-related Database Fields** (in merchants table):
- `paymentCustomerId` - Customer ID in payment gateway
- `paymentSubscriptionId` - Active subscription/transaction ID
- `paymentProvider` - Payment provider (default: "onepay")
- `lastInvoiceId` - Last successful payment transaction ID
- `pendingTransactionId` - Currently pending payment transaction ID

**Currency**:
- Prices displayed in USD but charged in IDR using 1 USD = 16,000 IDR conversion rate
- Amount formatted with Indonesian Rupiah (Rp) format

**Supported Payment Methods**:
- QRIS (QR Code Indonesian Standard) - compatible with all Indonesian e-wallets and mobile banking apps

### Per-Agent Knowledge Base System

Knowledge base content is now scoped per-agent using the `agentId` field in the knowledge, knowledgeChunks, and crawledLinks tables. When a merchant has an active agent selected:
- Knowledge is stored and retrieved for that specific agent
- Embeddings are generated and stored per-agent
- Chat responses use the active agent's knowledge base
- Import from another agent feature allows copying knowledge between agents

The widget settings (agentName, agentPhotoUrl) automatically sync when an agent is updated or selected as active.

### Agent System Prompt Feature

Each agent can have a custom **System Prompt** that controls how the AI responds to customers. This allows merchants to define specific behavior rules such as:
- Language style (formal/informal)
- Business rules (e.g., maximum discounts allowed)
- Escalation conditions
- Custom greetings or closings
- Specific product recommendations

The system prompt is sent as a proper OpenAI system role message, ensuring highest priority for merchant instructions. The AI will follow these custom instructions strictly while still using the knowledge base for factual information.

### Widget Deployment & Identity Verification

The chat widget can be embedded on merchant websites using JavaScript. For secure deployments (Pro/Enterprise plans), merchants can use Identity Verification with JWT tokens to authenticate customers.

**Embed Code (Basic)**:
```html
<script src="https://[app-url]/widget.js" data-merchant-id="[MERCHANT_ID]"></script>
```

**Identity Verification (Secure)**:
For Pro/Enterprise plans, merchants can verify customer identities using JWT tokens signed with their Secret Key:

1. **Generate Secret Key**: In Widget Settings, Pro/Enterprise merchants can generate a secret key (format: `ctv_sk_[48-char-hex]`)

2. **Server-side JWT Creation**:
```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign({
  customerId: 'unique-customer-id',
  customerName: 'Customer Name',
  customerEmail: 'customer@example.com'
}, 'ctv_sk_[your-secret-key]', { expiresIn: '1h' });
```

3. **Embed with Identity Token**:
```html
<script src="https://[app-url]/widget.js" 
  data-merchant-id="[MERCHANT_ID]"
  data-identity-token="[JWT_TOKEN]"></script>
```

**Security Features**:
- Secret keys are stored encrypted and only shown once
- Regenerate keys anytime (invalidates old tokens)
- Allowed Domains restriction prevents widget usage on unauthorized sites
- JWT verification ensures only authenticated users can chat

## External Dependencies

-   **AI Services**: OpenAI API (GPT-4.1-mini for chat, text-embedding-3-small for embeddings) via Replit AI Integrations.
-   **Database**: PostgreSQL (via `pg` driver) with Drizzle ORM.
-   **UI Component Libraries**: Radix UI (accessible primitives) and Shadcn/ui (styled components).
-   **Development Environment**: Replit Platform (hosting, plugins).
-   **Build Tools**: Vite (frontend), esbuild (backend), Tailwind CSS.
-   **Session Management**: `express-session`.
-   **Real-time Communication**: `ws` (WebSocket server).

### Supervisor Assignment System

Supervisors can be assigned to specific agents to handle escalated conversations:
- **3-Agent Limit**: Each supervisor can handle a maximum of 3 agents
- **Round-Robin Distribution**: Chats from assigned agents are distributed among supervisors
- **Assignment Management**: Merchants can assign/unassign supervisors via the Agents page
- **Chat Session Display**: When in HUMAN mode, chat sessions show the supervisor name in header and message bubbles

### Escalation Messages (Indonesian)

Customer-facing escalation messages are localized in Indonesian:
- Initial escalation: "Terima kasih atas kesabarannya. Tim kami akan segera membantu Anda."
- Supervisor response: "Supervisor sedang menangani percakapan Anda. Mohon tunggu balasannya."
- Return to AI: "Agen kembali menangani percakapan Anda."

### Notification System

The dashboard sidebar shows notification dots for:
- Sessions escalated to HUMAN mode
- Sessions with `needsSupervisorAttention` flag set to true
- Alert sound plays when new escalated sessions are detected
