# Chatvice - Customer Service Chatbot Platform

## Overview
Chatvice is an AI-powered customer service chatbot platform designed to automate customer support for businesses. It provides intelligent responses, seamless escalation to human supervisors, and a customizable chat widget for merchant websites. The platform includes a merchant dashboard for configuration and monitoring, and a supervisor panel for managing escalated conversations. Its primary goal is to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms, offering significant market potential for businesses seeking efficient customer engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming, real-time status, media upload, suggested questions, and programmatic control via a script embed method using `postMessage`. Features customer name collection form on first visit with profanity filtering (Indonesian and English), input validation, and AI-generated personalized greetings.
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
- **Chat Security Monitoring**: AI-powered monitoring of supervisor conversations to detect suspicious activities (financial fraud, data theft, external contact attempts, inappropriate content). Features configurable sensitivity (0-100), custom pattern detection, tolerance settings for jokes/off-topic messages, real-time alerts with severity levels (low/medium/high/critical), and email notifications to merchant admins. Uses Gemini 2.5 Flash for analysis. Default protection applies to new merchants immediately without manual configuration.
- **Knowledge Base with Help Articles**: Unified knowledge management page at `/dashboard/knowledge` with two tabs:
  - **Training Data Tab**: AI training content editor with web crawler, agent selector, suggested questions management
  - **Help Articles Tab**: AI-generated help center articles based on business type templates
    - **Business Types**: Retail Physical (10 categories), Retail Digital (6 categories), Company Profile (26 A-Z categories)
    - **AI Generation**: GPT-4.1-mini generates articles with title, content, tags, and suggested topics
    - **Article Management**: Create, edit, publish, archive articles with search and status filtering
    - **Pre-seeded Templates**: 42 business type templates with suggested topics, sample questions, and content structure
  - **Auto-Sync Feature**: Published articles are automatically synchronized to Training Data:
    - When article status changes to "published", content is added to knowledge base
    - When published article is updated, knowledge base is refreshed
    - When published article is unpublished/deleted, knowledge base is updated
    - Synced content is wrapped in markers for clean separation from manual training data
    - AI embeddings are automatically reprocessed for semantic search
- **Product Catalog Crawler**: AI-powered product scanning system for intelligent product recommendations:
  - **Location**: Product Cards page in Merchant Dashboard
  - **Workflow**: Add URL → AI scans with GPT-4.1-mini → Human review → Approve/Reject → Sync to AI
  - **Human-in-the-Loop**: All crawled products require explicit approval before syncing to AI knowledge base
  - **Extracted Data**: title, description, price, imageUrl, productUrl, category, brand, availability, rating, specifications, variants
  - **Database Tables**: `productCrawlSources` (source URLs) and `crawledProducts` (extracted product data)
  - **Auto-Sync Markers**: Product catalog wrapped in `<!-- AUTO-SYNCED PRODUCT CATALOG START/END -->` markers
  - **Use Cases**: Product comparisons, intelligent recommendations, add-to-cart assistance, catalog browsing

**Data Model Highlights**:
Core entities include Merchants, Supervisors, Sessions, Messages, Triggers, Knowledge Base content, Subscription Plans, and Agents. New tables support supervisor roles, shifts, product cards, quick replies, chat buttons, welcome bubbles, notification settings, widget sites, site domains, coin orders, and topup nominals.

**Chat Widget Message Reconciliation**: Optimistic UI updates using `clientId` for immediate feedback, with server-side reconciliation based on `clientMessageId` and content/timestamp fallbacks.

**AI Conversation Memory Optimization**: AI agents maintain conversation context by fetching the last 10 session messages from the database and using system prompts with CONVERSATION CONTEXT instructions.

**Interactive AI Responses**: AI responses can include interactive buttons (`[BTN:Label:action text]`) and clickable links (`[LINK:Display Text:/path]`) which are parsed and rendered in both Chatvice Guide and the merchant embedded widget.

## Test Credentials
- **Merchant Login**: internal@marketplayid.com / #Marketadmin1
- **Master Admin**: master@chatvice.app / chatvice2024

## External Dependencies
-   **AI Services**: OpenAI API (GPT-4.1-mini, text-embedding-3-small).
-   **Database**: PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn/ui.
-   **Payment Gateways**: Kompas Pay (Indonesian payment gateway), PayPal, Cryptocurrency (BTC, ETH, SOL, BNB, USDT, XRP with CoinGecko live pricing).
-   **Development Environment**: Replit Platform.

## Cryptocurrency Payment UI
The checkout page features a premium crypto payment interface with:
- **6 Supported Coins**: Bitcoin (BTC), Ethereum (ETH), Solana (SOL), Binance Coin (BNB), Tether (USDT), XRP
- **Live Pricing**: Real-time prices from CoinGecko API with 60-second cache and 3% transaction fee
- **Premium Design**: Clean, simplified dialogs with purple gradient branding
- **CSS Classes**: crypto-card, crypto-coin-btn, crypto-purple-btn, crypto-dialog-glass
- **Responsive Grid**: 2-column (mobile) / 3-column (desktop) coin selection with hover effects

## Crypto Payment Confirmation System
A comprehensive payment verification workflow for cryptocurrency payments:
- **User Flow**: After sending crypto payment, merchants click "Confirm Payment" to submit proof of payment
- **Proof Submission**: Upload screenshot of transaction + enter transaction hash (TXID)
- **Order Summary**: Shows plan, billing interval, crypto amount, and upgrade/downgrade badges
- **Database Table**: `crypto_payment_confirmations` stores all payment submissions with status tracking
- **Admin Review Dashboard**: Located at `/admin/crypto-payments` in admin sidebar with filter tabs (All/Pending/Approved/Rejected)
- **Admin Actions**: Review proof image, approve (activates subscription) or reject payments
- **Email Notifications**: 
  - On submission: Email to hello@chatvice.app with payment details and proof image
  - On approval: Confirmation email sent to merchant with subscription details
- **Subscription Activation**: Upon approval, merchant subscription is automatically activated with correct billing interval
- **Review Notes**: Admin can add notes during review process