# Jeany AI - Customer Service Chatbot Platform

## Overview

Jeany AI is an AI-powered customer service chatbot platform designed to automate customer support for businesses. It provides intelligent responses, seamless escalation to human supervisors, and a customizable chat widget for merchant websites. The platform includes a merchant dashboard for configuration and monitoring, and a supervisor panel for managing escalated conversations. Its primary goal is to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure and Design

Jeany AI is built as a monorepo, separating client (`/client`), server (`/server`), and shared (`/shared`) components. It features a multi-panel design catering to different user roles: a public Landing Page, a Merchant Dashboard for configuration and analytics, a Supervisor Panel for real-time human intervention, an embeddable Chat Widget for customers, and an Admin Master Panel for system-wide management. The UI/UX is based on Shadcn/ui and Radix UI, utilizing Tailwind CSS for styling with a custom "new-york" theme and dark mode support. Typography uses Inter for UI and JetBrains Mono for technical data.

### Technology Stack

-   **Frontend**: React with TypeScript, Vite, Wouter for routing, TanStack Query for server state, React Hook Form with Zod for validation.
-   **Backend**: Express.js with TypeScript, `ws` for WebSocket communication, `express-session` for session management.
-   **Database**: PostgreSQL with Drizzle ORM, storing core entities like Merchants, Supervisors, Sessions, Messages, Triggers, Knowledge Base content, and Vector Embeddings.
-   **AI Integration**: OpenAI API (via Replit AI Integrations) for GPT-4.1-mini chat completions and text-embedding-3-small for vector embeddings, enabling semantic search and multi-language support.

### Key Features

-   **AI-Powered Chatbot**: Automates customer responses, with semantic search using vector embeddings from the knowledge base.
-   **Human Escalation**: Automatically escalates conversations to human supervisors based on predefined triggers or customer requests.
-   **Multi-Language Support**: Automatic language detection and AI responses in the customer's language.
-   **Configurable Chat Widget**: Embeddable, customizable widget with dynamic theming and real-time status display.
-   **Merchant Dashboard**: Comprehensive analytics, knowledge base management (with web crawler for FAQ extraction), trigger configuration, supervisor management, and subscription plan management.
-   **Supervisor Panel**: Real-time interface for handling escalated customer conversations, including message sending and session management.
-   **Authentication & Authorization**: Session-based authentication with bcrypt for password hashing, supporting Merchant and Supervisor roles.
-   **Real-time Communication**: WebSocket architecture for instant message delivery and updates, with polling fallbacks.

### Data Model Highlights

Core entities include Merchants (with customizable configurations), Supervisors, Sessions (tracking AI/HUMAN mode), Messages, Triggers (for escalation), Knowledge Base content (for AI training), Knowledge Chunks (vector embeddings for semantic search), Notifications, Subscription Plans (tiered pricing), Merchant Subscriptions (Stripe integration), Agents (AI agents with plan-based limits), and Sources (for AI knowledge input).

## External Dependencies

-   **AI Services**: OpenAI API (GPT-4.1-mini for chat, text-embedding-3-small for embeddings) via Replit AI Integrations.
-   **Database**: PostgreSQL (via `pg` driver) with Drizzle ORM.
-   **UI Component Libraries**: Radix UI (accessible primitives) and Shadcn/ui (styled components).
-   **Development Environment**: Replit Platform (hosting, plugins).
-   **Build Tools**: Vite (frontend), esbuild (backend), Tailwind CSS.
-   **Session Management**: `express-session`.
-   **Real-time Communication**: `ws` (WebSocket server).