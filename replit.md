# Chatvice - Customer Service Chatbot Platform

## Overview
Chatvice is an AI-powered customer service chatbot platform designed to automate customer support for businesses. It provides intelligent responses, seamless escalation to human supervisors, and a customizable chat widget for merchant websites. The platform includes a merchant dashboard for configuration and monitoring, and a supervisor panel for managing escalated conversations. Its primary goal is to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms, offering significant market potential for businesses seeking efficient customer engagement.

## User Preferences
Preferred communication style: Simple, everyday language. Formal tone without casual honorifics (no "kak/bosku/gan/sis").

## System Architecture
Chatvice is a monorepo application structured with `/client`, `/server`, and `/shared` components, featuring a multi-panel design including a Landing Page, Merchant Dashboard, Supervisor Panel, embeddable Chat Widget, and an Admin Master Panel. The UI/UX leverages Shadcn/ui and Radix UI with Tailwind CSS, utilizing a custom "new-york" theme and dark mode.

**Technology Stack:**
- **Frontend**: React with TypeScript, Vite, Wouter, TanStack Query, React Hook Form with Zod.
- **Backend**: Express.js with TypeScript, `ws` for WebSockets, `express-session`.
- **Database**: PostgreSQL with Drizzle ORM.
- **AI Integration**: OpenAI API (GPT-4.1-mini for chat, text-embedding-3-small for embeddings).

**Key Features:**
- **AI-Powered Chatbot**: Automates customer responses using semantic search from a per-agent knowledge base with conversation memory optimization. Supports multi-language and AI media analysis for images and documents.
- **Human Escalation**: Automatic or manual escalation to human supervisors based on triggers or customer requests.
- **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming, real-time status, media upload, suggested questions, and programmatic control via a script embed method using `postMessage`.
- **AI Media Analysis**: AI analyzes uploaded images (OpenAI Vision) and documents (summarization for CSV, TXT) to provide contextual responses.
- **Merchant Dashboard**: Provides analytics, knowledge base management (with web crawler), trigger configuration, supervisor management, subscription management, quick replies, product cards, and notification settings. Includes a draggable/hideable Chatvice Guide AI assistant.
- **Product Offer Messages**: Both supervisors and AI can recommend products to customers, displayed as rich cards.
- **Supervisor Panel**: Real-time interface for handling escalated conversations and team activity monitoring, with restricted access to relevant features.
- **Admin Menu Order Configuration**: Allows drag-and-drop reordering and enabling/disabling of merchant sidebar menu items, saved globally. Merchant sidebar organized into collapsible dropdowns: Widget Setting (widget, welcome bubble, product cards), Message Setting (quick replies, chat buttons, triggers), Management (supervisors, team activity, work scheduler, integrations, plans, billing). Static purple Chat Sessions button at bottom with escalation indicator.
- **Authentication & Authorization**: Session-based authentication with bcrypt, supporting Merchant and Supervisor roles with role-based permissions.
- **Real-time Communication**: WebSocket architecture for instant message delivery and updates.
- **Per-Agent Knowledge Base & System Prompt**: Knowledge base content and customizable AI system prompts are scoped to individual AI agents.
- **Widget Identity Verification**: Secure customer authentication for embedded widgets using JWT tokens for Pro/Enterprise plans.
- **Work Scheduler**: Shift management system for supervisors and AI agents.
- **Landing Page Customization**: Admin Panel allows non-technical customization of the public landing page.
- **Configurable Trial Period**: Admin-configurable trial days that dynamically update for active trial merchants.
- **Chatvice Guide Configuration**: Admin dashboard tab for managing the AI help widget across landing page and merchant dashboard, including AI agent settings, welcome messages, and live preview.
- **Promotional Discount System**: Comprehensive promo code system with admin CRUD, plan targeting, usage limits, and integration into pricing and billing pages.
- **Chatvice Top Up v2 (Multi-Tenant Payment System)**: Multi-tenant coin top-up system for widget-embedded game/app monetization with JWT-based SSO, a defined payment flow, and API endpoints.

**Data Model Highlights**:
Core entities include Merchants, Supervisors, Sessions, Messages, Triggers, Knowledge Base content, Subscription Plans, and Agents. New tables support supervisor roles, shifts, product cards, quick replies, chat buttons, welcome bubbles, notification settings, widget sites, site domains, coin orders, and topup nominals.

**Chat Widget Message Reconciliation**: Optimistic UI updates using `clientId` for immediate feedback, with server-side reconciliation based on `clientMessageId` and content/timestamp fallbacks.

**AI Conversation Memory Optimization**: AI agents maintain conversation context by fetching the last 10 session messages from the database and using system prompts with CONVERSATION CONTEXT instructions.

**Interactive AI Responses**: AI responses can include interactive buttons (`[BTN:Label:action text]`) and clickable links (`[LINK:Display Text:/path]`) which are parsed and rendered in both Chatvice Guide and the merchant embedded widget.

## Scaling Guidelines

**Current Setup:** Reserved VM (single instance) with in-memory rate limiting.

**When to Upgrade to Redis + Autoscale:**

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Concurrent WebSocket connections | > 5,000 | Consider Redis pub/sub for WS |
| Messages per day | > 500,000 | Monitor rate limit store size |
| Rate limit store size | > 50,000 entries | Upgrade to Redis rate limiting |
| Response latency (P99) | > 2 seconds | Add Redis caching layer |
| CPU usage | > 80% sustained | Upgrade VM size or Autoscale |
| Memory usage | > 80% sustained | Upgrade VM size |

**Migration Steps for Autoscale:**
1. Add Redis (Upstash/Redis Cloud) for rate limiting stores
2. Migrate session store to Redis (connect-redis)
3. Implement Redis pub/sub for WebSocket message broadcasting
4. Add sticky sessions or session affinity for WebSocket connections
5. Test horizontal scaling with 2-3 instances before production

**Files to Modify:**
- `server/rateLimit.ts` - Replace Map with Redis client
- `server/cache.ts` - Replace LRU cache with Redis
- `server/index.ts` - Add Redis session store
- `server/websocket.ts` - Add Redis pub/sub for cross-instance messaging

## External Dependencies
-   **AI Services**: OpenAI API (GPT-4.1-mini, text-embedding-3-small).
-   **Database**: PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn/ui.
-   **Payment Gateway**: 1-Pay Indonesian payment gateway for subscription billing.
-   **Development Environment**: Replit Platform.