# Chatvice - Customer Service Chatbot Platform

## Overview
Chatvice is an AI-powered customer service chatbot platform designed to automate customer support for businesses. It provides intelligent responses, seamless escalation to human supervisors, and a customizable chat widget for merchant websites. The platform includes a merchant dashboard for configuration and monitoring, and a supervisor panel for managing escalated conversations. Its primary goal is to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Chatvice is a monorepo application with `/client`, `/server`, and `/shared` components, featuring a multi-panel design including a Landing Page, Merchant Dashboard, Supervisor Panel, embeddable Chat Widget, and an Admin Master Panel. The UI/UX leverages Shadcn/ui and Radix UI with Tailwind CSS, utilizing a custom "new-york" theme and dark mode.

**Technology Stack:**
- **Frontend**: React with TypeScript, Vite, Wouter, TanStack Query, React Hook Form with Zod.
- **Backend**: Express.js with TypeScript, `ws` for WebSockets, `express-session`.
- **Database**: PostgreSQL with Drizzle ORM.
- **AI Integration**: OpenAI API (GPT-4.1-mini for chat, text-embedding-3-small for embeddings).

**Key Features:**
- **AI-Powered Chatbot**: Automates customer responses using semantic search from a per-agent knowledge base with conversation memory optimization. Supports multi-language and AI media analysis.
- **Human Escalation**: Automatic or manual escalation to human supervisors.
- **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming, real-time status, media upload, suggested questions, and programmatic control. Includes customer name collection, profanity filtering, input validation, and AI-generated personalized greetings. Social media integration is supported.
- **AI Media Analysis**: AI analyzes uploaded images (OpenAI Vision) and documents (summarization).
- **Merchant Dashboard**: Provides analytics, knowledge base management (with web crawler and AI generation), trigger configuration, supervisor management, subscription management, quick replies, product cards, and notification settings. Includes a draggable/hideable Chatvice Guide AI assistant.
- **Supervisor Panel**: Real-time interface for handling escalated conversations and team activity monitoring.
- **Authentication & Authorization**: Session-based authentication with bcrypt, supporting Merchant and Supervisor roles with role-based permissions. OAuth via Google and GitHub.
- **Real-time Communication**: WebSocket architecture for instant message delivery and updates.
- **Per-Agent Knowledge Base & System Prompt**: Knowledge base content and customizable AI system prompts are scoped to individual AI agents.
- **Widget Identity Verification**: Secure customer authentication for embedded widgets using JWT tokens.
- **Work Scheduler**: Shift management system for supervisors and AI agents.
- **Landing Page & Feature Configuration**: Admin Panel allows non-technical customization of the public landing page and configuration of all plan feature limits (conversations, AI agents, supervisors, knowledge sources, etc.).
- **Promotional Discount System**: Comprehensive promo code system with admin CRUD, plan targeting, and usage limits.
- **Chat Security Monitoring**: AI-powered monitoring of supervisor conversations to detect suspicious activities using Gemini 2.5 Flash, with configurable sensitivity and real-time alerts.
- **Knowledge Base Management**: Unified system with Training Data (multi-entry knowledge), Active Sources (URL sources with auto-sync), and Create with AI (AI-generated articles). Supports templates, auto-sync for crawled content, drag-and-drop card reordering (via @dnd-kit), and AI auto-formatting of knowledge content on save.
- **Product Catalog Crawler**: AI-powered product scanning system for intelligent product recommendations. Uses Puppeteer for screenshots sent to OpenAI Vision (GPT-4.1) for product extraction, with mandatory human review.
- **Custom Plan Request System**: Interactive budget simulator for merchants to configure and request custom plans.
- **Closing Statement Feature**: Automatic or manual closing statements when chat becomes inactive, configurable to include business and customer names.
- **Automatic Chat Cleanup**: Background job for archiving expired sessions and generating chat logs with full transcripts based on plan retention policies.
- **Smart Notification Sound System**: Context-aware audio alerts for incoming chats, replies, and "angry" alerts, with user-specific preferences.
- **Affiliate Withdrawal Request System**: Complete affiliate payout system with saved payment methods, withdrawal workflow, minimum payout, and admin approval.
- **Merchant Analytics & Filtering System**: Comprehensive admin filtering for Master Control Panel with 12+ filter categories and analytics API providing total spending, team counts, average ratings, response times, and escalation rates.
- **Customer Chat Platform (chat.chatvice.app)**: Separate customer-facing mobile chat app with subdomain-based routing and two-tier authentication (WhatsApp/SMS OTP for first-time, phone+PIN for returning users).
- **External Chat Bridge API**: Endpoints for sending customer messages to merchants and retrieving replies, secured via API key and CORS.
- **Google Sheet Transaction Lookup**: AI agent detects transaction queries and performs real-time Google Sheet fetches to inject structured data into the prompt for accurate lookups.
- **Base64 Image Serving Endpoints**: Dedicated endpoints for serving merchant and supervisor base64-encoded images stored in the database as binary responses with caching.

## External Dependencies
- **AI Services**: OpenAI API (GPT-4.1-mini, text-embedding-3-small, Vision), Gemini 2.5 Flash.
- **Database**: PostgreSQL.
- **UI Component Libraries**: Radix UI, Shadcn/ui.
- **Payment Gateways**: Kompas Pay, PayPal, Cryptocurrency (BTC, ETH, SOL, BNB, USDT, XRP).