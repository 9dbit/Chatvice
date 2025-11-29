# Jeany AI - Customer Service Chatbot Platform

## Overview

Jeany AI is an AI-powered customer service chatbot platform that enables merchants to automate customer support with intelligent responses and seamless escalation to human supervisors. The platform provides a customizable chat widget that can be embedded on merchant websites, a merchant dashboard for configuration and monitoring, and a supervisor panel for handling escalated conversations.

The application targets businesses seeking to reduce support costs while maintaining high-quality customer service through smart AI-to-human handoff mechanisms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend Framework**: React with TypeScript
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching
- React Hook Form with Zod for form validation

**UI Component Library**: Shadcn/ui with Radix UI primitives
- Custom design system based on "new-york" style preset
- Tailwind CSS for styling with custom CSS variables for theming
- Dark mode support via theme provider
- Typography: Inter for UI/body text, JetBrains Mono for technical data

**Backend Framework**: Express.js with TypeScript
- HTTP server for REST API endpoints
- WebSocket server (ws) for real-time chat communication
- Session management using express-session with MemoryStore
- PostgreSQL database storage via Drizzle ORM

**Database**: PostgreSQL with Drizzle ORM
- Standard pg driver for database connections (not Neon serverless)
- Schema-first approach with type-safe queries
- Database schema defined in `shared/schema.ts` for shared types between client and server
- Vector embeddings stored in `knowledge_chunks` table for semantic search

**Build Process**: Custom build script using esbuild and Vite
- Client bundle: Vite builds React application to `dist/public`
- Server bundle: esbuild bundles server code to single CommonJS file with selective dependency bundling for faster cold starts

### Application Architecture

**Monorepo Structure**: Single repository with client/server separation
- `/client` - React frontend application
- `/server` - Express backend with routes, storage, and WebSocket handling
- `/shared` - Shared TypeScript types and Zod schemas
- `/attached_assets` - Planning documents and design notes

**Multi-Panel Design**: Five distinct user interfaces within one application
1. **Landing Page** (`/`) - Public marketing site with features, pricing, hero background image with dark wash overlay
2. **Merchant Dashboard** (`/dashboard/*`) - Administrative panel for merchants to configure chatbot, view sessions, manage knowledge base, triggers, supervisors, and subscription billing
3. **Supervisor Panel** (`/supervisor`) - Real-time interface for supervisors to handle escalated customer conversations with confirmation dialogs
4. **Chat Widget** (`/widget/:merchantId`) - Embeddable customer-facing chat interface with merchant branding
5. **Admin Master Panel** (`/admin/*`) - System administration for managing all merchants (credentials: admin@jeany.ai / admin123)

**Authentication & Authorization**:
- User types: Merchants and Supervisors
- Login/registration flows with email/password
- Password hashing using bcrypt (10 salt rounds) for secure storage
- Session-based authentication using express-session with MemoryStore
- HTTP-only session cookies with 24-hour expiry
- Route protection middleware: requireAuth, requireMerchant, requireSupervisor
- Server-side merchantId derived from session (not client-supplied) for protected operations
- localStorage used for client-side routing decisions (merchantId, userType)

### Data Model

**Core Entities** (defined in `shared/schema.ts`):

1. **Merchants** - Business accounts that deploy the chatbot
   - Configuration: company name, icon, colors, welcome message, online status
   - Customization: primary color, icon size, widget branding

2. **Supervisors** - Human agents associated with merchants
   - Linked to merchant via merchantId
   - Receive notifications for escalated sessions

3. **Sessions** - Individual customer chat conversations
   - Mode tracking: "AI" or "HUMAN" for escalation status
   - Supervisor assignment when escalated
   - Customer identification and activity timestamps

4. **Messages** - Individual messages within sessions
   - Sender identification (customer, AI, supervisor)
   - Chronological conversation history

5. **Triggers** - Keywords that cause AI-to-human escalation
   - Merchant-specific trigger phrases
   - Default triggers: "deposit not received", "withdrawal pending", "speak to manager", "refund"

6. **Knowledge Base** - Merchant-specific context for AI responses
   - Plain text content used to inform AI answers
   - Updatable via merchant dashboard
   - Web crawler can extract FAQs from merchant websites

7. **Knowledge Chunks** - Vector embeddings for semantic search
   - Content split into ~500 character chunks
   - OpenAI text-embedding-3-small for embeddings
   - Cosine similarity for relevance ranking

8. **Notifications** - Alerts for supervisors about escalated sessions
   - Linked to specific sessions
   - Read/unread tracking

9. **Subscription Plans** - Tiered pricing for merchants
   - Starter, Professional, Enterprise tiers with different limits
   - Monthly and annual billing options (16% discount for annual)
   - 7-day free trial for all plans

10. **Merchant Subscriptions** - Subscription tracking
    - Links merchants to their active subscription plan
    - Stripe subscription and customer IDs
    - Status tracking (trial, active, canceled, past_due)

### AI Integration

**Provider**: OpenAI API (via Replit AI Integrations)
- Configured via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`
- Model: GPT-4.1-mini for chat completions
- Model: text-embedding-3-small for vector embeddings
- Integration point: `server/routes.ts` - `askJeany` function

**Conversation Flow**:
1. Customer message received via WebSocket or REST
2. System checks for trigger keywords in message text
3. If triggered → escalate to HUMAN mode, notify supervisors
4. If not triggered → semantic search finds relevant knowledge chunks
5. AI generates response using knowledge context and customer's language
6. Response sent back to customer through appropriate channel

**Multi-Language Support**:
- Automatic language detection from customer messages
- AI responds in the same language as the customer
- No additional API calls needed - handled by the LLM

**Escalation Logic**:
- Trigger detection: Case-insensitive keyword matching
- Mode switching: Session updated from "AI" to "HUMAN"
- Supervisor notification: Creates notification record for all merchant supervisors
- Human takeover: Supervisor can send messages directly in HUMAN mode

### Real-Time Communication

**WebSocket Architecture**:
- WebSocket server runs alongside HTTP server on same port
- Session-based message broadcasting
- Real-time updates for both customers and supervisors

**Polling Fallback**:
- TanStack Query configured with `refetchInterval` for periodic updates
- Supervisor panel: 3-5 second intervals for notifications and sessions
- Chat widget: 2 second intervals for new messages

### Widget Embedding Strategy

**Deployment Approaches**:
1. **Standalone Route**: `/widget/:merchantId` - Fullscreen widget for testing
2. **Embedded Mode**: Same widget component with `embedded` prop for iframe usage
3. **Demo Mode**: `/widget-demo` - Preview page showing widget in context of sample website

**Customization System**:
- Merchant-specific configuration fetched via `/api/merchant/status/:merchantId`
- Dynamic theming: primary color, icon, welcome message
- Online/offline status display

### Dashboard Features

**Merchant Dashboard Sections** (sidebar navigation):
- Overview - Real-time analytics with active sessions, message counts, AI resolution rate, daily trends chart
- Chat Sessions - List and monitor active/past conversations with transcript export
- Knowledge Base - Edit AI training content with web crawler for FAQ extraction
- Triggers - Manage escalation keywords
- Widget - Customize appearance and get embed code
- Supervisors - Manage team members
- Settings - Account configuration

**Key Features**:
- Analytics Dashboard: Real-time metrics with batch-optimized queries
- Vector Embeddings: Semantic search for knowledge base using OpenAI embeddings
- Web Crawler: Extract FAQs from merchant websites with SSRF protections
- Multi-Language: Automatic language detection and response in customer's language
- Transcript Export: Download chat transcripts as text files
- Live Widget Preview: Interactive testing of AI responses on knowledge base page with typing indicator
- Profile Settings: Photo upload (base64, 2MB limit), theme customization, company info management
- Subscription Billing: Stripe checkout, plan management, 7-day trial, 16% annual discount

**Design Philosophy**:
- Information density prioritized over white space
- Efficiency-focused interactions
- Professional B2B SaaS aesthetic (inspired by Intercom, Zendesk, Drift per design guidelines)

### State Management Strategy

**Server State**: TanStack Query
- Query keys follow REST-like pattern: `["/api/endpoint", ...params]`
- Automatic caching and invalidation
- Optimistic updates disabled (`staleTime: Infinity`)
- Custom `apiRequest` helper for authenticated fetch calls

**Client State**: React hooks and context
- Theme provider for dark/light mode
- Local storage for authentication tokens
- Component-level state for UI interactions

**Form State**: React Hook Form
- Zod schema validation
- Type-safe form data with TypeScript inference
- Integration with Shadcn form components

### Styling System

**Tailwind Configuration**:
- Custom border radius values (9px/6px/3px)
- HSL color variables with alpha channel support
- Elevation system using CSS variables (`--elevate-1`, `--elevate-2`)
- Hover and active state utilities (`hover-elevate`, `active-elevate-2`)
- Responsive breakpoints for mobile/tablet/desktop

**CSS Variable Theming**:
- Dual theme support (light/dark) via CSS custom properties
- Semantic color tokens: background, foreground, primary, secondary, muted, accent, destructive
- Component-specific tokens: card, popover, sidebar, input, ring
- Font family variables for Inter (sans), Georgia (serif), JetBrains Mono (mono)

### Development Workflow

**Build Modes**:
- Development: Vite dev server with HMR, Express middleware mode
- Production: Static build to `dist/public`, bundled server to `dist/index.cjs`

**Hot Module Replacement**:
- Vite HMR for React components
- Server requires manual restart for backend changes
- WebSocket HMR path: `/vite-hmr`

**TypeScript Configuration**:
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`
- ESNext modules with bundler resolution
- Strict mode enabled for type safety

## External Dependencies

### AI Services
- **OpenAI API** (via Replit AI Integrations) - GPT model for conversational AI responses
  - Configured via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`
  - Model: GPT-4.1-mini for chat completions
  - Model: text-embedding-3-small for vector embeddings
  - No API key required - billed to Replit credits

### Database
- **PostgreSQL** - Primary data store with full persistence
  - Accessed via standard pg driver (not Neon serverless)
  - Connection string: `DATABASE_URL` environment variable
  - Drizzle ORM for schema management and migrations
  - Vector embeddings stored in knowledge_chunks table

### UI Component Library
- **Radix UI** - Unstyled, accessible component primitives
  - Dialog, Dropdown, Popover, Tabs, Toast, and 20+ other primitives
  - Provides ARIA-compliant interactions

- **Shadcn/ui** - Pre-styled components built on Radix
  - Component configuration in `components.json`
  - Customizable via Tailwind utility classes

### Development Tools
- **Replit Platform** - Hosting and development environment
  - Runtime error modal plugin
  - Cartographer plugin for code navigation
  - Dev banner for Replit environment awareness

### Build Tools
- **Vite** - Frontend build tool and dev server
- **esbuild** - Server bundling for production
- **Tailwind CSS** - Utility-first CSS framework with PostCSS

### Utility Libraries
- **date-fns** - Date manipulation and formatting
- **nanoid** - Unique ID generation
- **zod** - Schema validation
- **clsx** & **tailwind-merge** - Conditional className utilities

### Session Management
- **express-session** - HTTP session middleware
- **connect-pg-simple** - PostgreSQL session store (configured for future use)

### WebSocket Communication
- **ws** - WebSocket server library for real-time messaging