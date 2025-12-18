# Chatvice - Customer Service Chatbot Platform

## Overview

Chatvice is an AI-powered customer service chatbot platform designed to automate customer support for businesses. It provides intelligent responses, seamless escalation to human supervisors, and a customizable chat widget for merchant websites. The platform includes a merchant dashboard for configuration and monitoring, and a supervisor panel for managing escalated conversations. Its primary goal is to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

Chatvice is a monorepo application structured with `/client`, `/server`, and `/shared` components. It features a multi-panel design including a Landing Page, Merchant Dashboard, Supervisor Panel, embeddable Chat Widget, and an Admin Master Panel. The UI/UX leverages Shadcn/ui and Radix UI with Tailwind CSS, utilizing a custom "new-york" theme and dark mode.

**Technology Stack:**
- **Frontend**: React with TypeScript, Vite, Wouter, TanStack Query, React Hook Form with Zod.
- **Backend**: Express.js with TypeScript, `ws` for WebSockets, `express-session`.
- **Database**: PostgreSQL with Drizzle ORM.
- **AI Integration**: OpenAI API (GPT-4.1-mini for chat, text-embedding-3-small for embeddings).

**Key Features:**
- **AI-Powered Chatbot**: Automates customer responses using semantic search from a per-agent knowledge base with conversation memory optimization (last 10 messages for context continuity).
- **Human Escalation**: Automatically or manually escalates conversations to human supervisors based on triggers or customer requests, with localized messages and supervisor assignment.
- **Multi-Language Support**: Automatic language detection and AI responses.
- **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming, real-time status, media upload (photo/video/camera), suggested questions, optional welcome bubble, custom icon dimensions (width/height in pixels without circular mask), and draggable/hideable widget button. Script embed method (chatvice.js) uses postMessage communication between parent page and iframe for open/close synchronization, with source validation for security. Exposes `window.chatvice.open()`, `window.chatvice.close()`, and `window.chatvice.toggle()` APIs for programmatic control.
- **AI Media Analysis**: When customers upload images, the AI automatically analyzes them using OpenAI Vision (GPT-4.1-mini) and provides contextual responses. For documents (CSV, TXT), AI reads and summarizes the content. Videos and other document types (PDF, Word, Excel) receive acknowledgment messages with offer to assist.
- **Merchant Dashboard**: Comprehensive analytics, knowledge base management (with web crawler), trigger configuration, supervisor management, subscription management, quick replies, product cards, and notification settings. Includes draggable/hideable Chatvice Guide AI assistant for dashboard help. Chat sessions page includes "+ offer product" button for supervisor product recommendations with popup selection.
- **Landing Page Chatvice Guide**: Public AI help bubble on landing page with rate-limited endpoint (10 req/min per IP), scoped localStorage keys to prevent cross-context interference with dashboard guide.
- **Product Offer Messages**: Both supervisors and AI can offer products to customers. Supervisors use the "+ offer product" button in sessions page, while AI automatically recommends products based on keyword triggers and conversation context. Product offers display as rich cards with images, prices, and action buttons.
- **Supervisor Panel**: Real-time interface for handling escalated conversations, including team activity monitoring.
- **Authentication & Authorization**: Session-based authentication with bcrypt, supporting Merchant and Supervisor roles, and planned Role-Based Access Control.
- **Real-time Communication**: WebSocket architecture for instant message delivery and updates.
- **Per-Agent Knowledge Base**: Knowledge base content, embeddings, and chat responses are scoped to individual AI agents.
- **Agent System Prompt**: Customizable AI system prompts for each agent to define specific behavior, language style, and business rules.
- **Widget Identity Verification**: Secure customer authentication for embedded widgets using JWT tokens signed with merchant secret keys for Pro/Enterprise plans.
- **Work Scheduler**: Shift management system for supervisors and AI agents, including assignments and reports.
- **Landing Page Customization**: Admin Panel allows non-technical customization of the public landing page (hero section, colors, banner, features layout).
- **Configurable Trial Period**: Admin-configurable trial days setting in Pricing tab. All public pages (pricing, features, FAQ, auth, billing) dynamically fetch trial days from `/api/platform-settings` endpoint.
- **Chatvice Guide Configuration**: Admin dashboard "Chatvice Guide" tab for managing the AI help widget across landing page and merchant dashboard. Settings include AI agent name, system prompt, welcome message, temperature, widget position, color, visibility toggles, promo image option for chat bubble, and live preview widget to test settings and knowledge base.
- **Trial Expiry Sync**: When admin changes trial days in Pricing tab, all active trial merchants automatically have their trialEndsAt recalculated based on their account creation date + new trial days.
- **Admin Accounts**: Master admin panel accessible at /admin/login. Admin credentials: master@chatvice.app / #Chatadmin1 (created December 2025).
- **Documentation System**: Comprehensive docs at /docs with individual article pages (/docs/:slug). Articles stored in docs-data.ts with categories: Getting Started, AI & Knowledge Base, Chat Widget, Team & Escalation, API Reference, Security & Compliance. Brand identity section in Admin SEO tab now displays uploaded file URLs below preview images.
- **Blog System**: Blog at /blog with individual article pages (/blog/:slug). Articles stored in blog-data.ts with SEO meta descriptions and hero images.

**Data Model Highlights**:
Core entities include Merchants, Supervisors, Sessions, Messages (with `clientMessageId` for optimistic UI reconciliation), Triggers, Knowledge Base content (with `agentId` scoping), Knowledge Chunks, Notifications, Subscription Plans, Merchant Subscriptions, Agents, and Sources. New tables support `supervisor_roles`, `shifts`, `shift_assignments`, `work_reports`, `product_cards`, `product_card_buttons`, `quick_replies`, `chat_buttons`, `welcome_bubbles`, and `notification_settings`.

**Chat Widget Message Reconciliation**:
- Widget uses optimistic updates with `pendingMessages` for immediate UI feedback
- Each message gets a unique `clientId` (format: `client_{timestamp}_{random}`)
- Server stores `clientMessageId` and returns `responseClientId` for AI responses
- Reconciliation uses `serverMsg.clientMessageId === pending.clientId` as primary match
- Fallback: content + timestamp within 10 seconds
- Notification sounds use `lastProcessedServerMsgId` to prevent duplicates

**AI Conversation Memory Optimization**:
- All AI agents maintain conversation context across messages for natural follow-up discussions
- Chatvice Guide (landing page and dashboard) sends conversation history with each request
- Conversation history persisted in sessionStorage to survive component remounts
- Merchant widget AI agents fetch last 10 session messages from database for context
- System prompts include CONVERSATION CONTEXT instructions to properly use history
- Memory is token-efficient (limited to 10 messages) while maintaining meaningful context
- Supports pronoun references ("it", "that") and follow-up questions about previous topics
- Endpoints: `/api/help/public-ask`, `/api/help/ask`, `/api/chatvice-guide/chat`, and `askChatvice` function

**Interactive AI Responses**:
- AI responses can include interactive buttons and clickable links for practical customer interaction
- Button format: `[BTN:Label:action text]` - Creates clickable button that sends "action text" as user message
- Link format: `[LINK:Display Text:/path]` - Creates clickable link to specified page
- parseMessageContent() function parses and renders these elements in both:
  - ai-help-bubble.tsx (Chatvice Guide on landing page and dashboard)
  - chat-widget.tsx (Merchant embedded widget for customer support)
- Available links: /features, /pricing, /register, /docs, /blog (public), /agents, /sources, /analytics, etc. (dashboard)
- Buttons appear at bottom of AI message with primary hover styling
- Links render inline with underline on hover and external link icon for external URLs
- System prompts in askChatvice (merchant widget) and Chatvice Guide endpoints include INTERACTIVE FORMATTING instructions

## External Dependencies

-   **AI Services**: OpenAI API (GPT-4.1-mini, text-embedding-3-small) via Replit AI Integrations.
-   **Database**: PostgreSQL (via `pg` driver).
-   **UI Component Libraries**: Radix UI, Shadcn/ui.
-   **Payment Gateway**: 1-Pay Indonesian payment gateway (https://1-pay.id) for subscription billing.
-   **Development Environment**: Replit Platform.
-   **Build Tools**: Vite, esbuild, Tailwind CSS.
-   **Session Management**: `express-session`.
-   **Real-time Communication**: `ws` (WebSocket server).