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
- **AI-Powered Chatbot**: Automates customer responses using semantic search from a per-agent knowledge base with conversation memory optimization. Supports multi-language and AI media analysis.
- **Human Escalation**: Automatic or manual escalation to human supervisors based on triggers or customer requests.
- **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming, real-time status, media upload, suggested questions, and programmatic control. Includes customer name collection with profanity filtering, input validation, and AI-generated personalized greetings. Social media integration (Instagram, Facebook, Telegram, WhatsApp, Discord) with configurable icon links in widget header.
- **AI Media Analysis**: AI analyzes uploaded images (OpenAI Vision) and documents (summarization) for contextual responses.
- **Merchant Dashboard**: Provides analytics, knowledge base management (with web crawler), trigger configuration, supervisor management, subscription management, quick replies, product cards, and notification settings. Includes a draggable/hideable Chatvice Guide AI assistant.
- **Product Offer Messages**: Supervisors and AI can recommend products as rich cards.
- **Supervisor Panel**: Real-time interface for handling escalated conversations and team activity monitoring.
- **Admin Menu Order Configuration**: Allows drag-and-drop reordering and enabling/disabling of merchant sidebar menu items, saved globally.
- **Authentication & Authorization**: Session-based authentication with bcrypt, supporting Merchant and Supervisor roles with role-based permissions. OAuth via Google and GitHub.
- **Simplified Registration Flow**: Requires username, email, password, and email verification.
- **Multi-Step Profile Wizard**: Guides new merchants through business info, contact info, and domain setup with real-time availability check.
- **Domain Registration System**: Enforces unique business domains, with automatic normalization and Indonesian error messaging.
- **Real-time Communication**: WebSocket architecture for instant message delivery and updates.
- **Per-Agent Knowledge Base & System Prompt**: Knowledge base content and customizable AI system prompts are scoped to individual AI agents.
- **Widget Identity Verification**: Secure customer authentication for embedded widgets using JWT tokens for Pro/Enterprise plans.
- **Work Scheduler**: Shift management system for supervisors and AI agents.
- **Landing Page Customization**: Admin Panel allows non-technical customization of the public landing page.
- **Configurable Trial Period**: Admin-configurable trial days that dynamically update for active trial merchants.
- **Extended Plan Features Configuration**: Admin can configure all plan feature limits (conversations, AI agents, supervisors, knowledge sources, etc.) via the Master Control Panel, with real-time sync.
- **Chatvice Guide Configuration**: Admin dashboard tab for managing the AI help widget across landing page and merchant dashboard. Enhanced with real-time merchant data access (agents, supervisors, sessions, triggers, knowledge sources, work schedules, promo codes), today's statistics (chat count, messages, escalations), workflow guidance for common tasks, and action capabilities (add triggers, add knowledge, update widget settings) via `/api/help/action` endpoint.
- **Promotional Discount System**: Comprehensive promo code system with admin CRUD, plan targeting, and usage limits.
- **Chatvice Top Up v2 (Multi-Tenant Payment System)**: Multi-tenant coin top-up system for widget-embedded game/app monetization with JWT-based SSO.
- **Chat Security Monitoring**: AI-powered monitoring of supervisor conversations to detect suspicious activities using Gemini 2.5 Flash. Features configurable sensitivity, custom pattern detection, tolerance settings, real-time alerts, and email notifications.
- **Knowledge Base with Help Articles**: Unified knowledge management page with two tabs: Training Data (AI training content editor with web crawler) and Help Articles (AI-generated help center articles based on business type templates). Includes auto-sync to Training Data and automatic re-processing of AI embeddings.
- **Knowledge Base Templates**: Admin can create knowledge templates categorized as casual/formal/corporate with multi-language support. Merchants can apply templates to their agent knowledge base with replace or append mode, featuring preview and confirmation dialogs.
- **Automatic Knowledge Base Sync**: Crawled website sources auto-sync every 60 minutes with background job. Features green blinking dot for active sources, spinning icon during sync, last sync timestamp, and manual "Update" button for on-demand refresh.
- **Product Catalog Crawler**: AI-powered product scanning system for intelligent product recommendations. Workflow includes adding URL, AI scanning, human review, and syncing to AI knowledge base.
- **Custom Plan Request System**: Interactive budget simulator for merchants to configure and request custom plans, with real-time price calculation and admin review dashboard.
- **Closing Statement Feature**: Automatic or manual closing statements when chat becomes inactive. Supports two modes: manual (custom message) and automatic (AI-generated contextual closing matching agent's tone style). Configurable to include business name and customer name. Triggers after 2 minutes of inactivity.
- **Automatic Chat Cleanup**: Background job running every 60 minutes that archives expired sessions and generates chat logs with full transcripts. Retention periods vary by plan: Free (24 hours), Starter (7 days), Pro (30 days), Enterprise (90 days).
- **Welcome Description in Chat**: Welcome description message appears as the first message in chat history after customer starts the conversation, providing context before the AI greeting.
- **Smart Notification Sound System**: Context-aware audio alerts with three distinct sounds: (1) "Incoming Chat" sound plays on merchant/supervisor side when a new session is escalated, (2) "Chat Reply" sound plays on both sides for subsequent messages in active sessions, (3) "Angry Alert" sound plays on merchant/supervisor side when anger is detected or trigger words are hit. Customer widget handles sounds for AI/supervisor responses including proactive outreach. Sound preferences are saved per-user with toggle controls.

**Data Model Highlights**: Core entities include Merchants, Supervisors, Sessions, Messages, Triggers, Knowledge Base content, Subscription Plans, and Agents.
**Chat Widget Message Reconciliation**: Optimistic UI updates using `clientId` with server-side reconciliation.
**AI Conversation Memory Optimization**: AI agents maintain conversation context by fetching the last 10 session messages and using system prompts.
**Interactive AI Responses**: AI responses can include interactive buttons and clickable links.

## External Dependencies
-   **AI Services**: OpenAI API (GPT-4.1-mini, text-embedding-3-small).
-   **Database**: PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn/ui.
-   **Payment Gateways**: Kompas Pay, PayPal, Cryptocurrency (BTC, ETH, SOL, BNB, USDT, XRP with CoinGecko live pricing).
-   **AI Models for Security**: Gemini 2.5 Flash.