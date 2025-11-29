# Jeany AI - Design Guidelines

## Design Approach

**Hybrid Strategy**: Landing page draws inspiration from modern B2B SaaS leaders (Intercom, Zendesk, Drift), while dashboards follow a streamlined design system approach emphasizing clarity and efficiency.

## Core Design Principles

1. **Professional Yet Approachable**: Balance enterprise credibility with friendly, accessible interactions
2. **Efficiency First**: Dashboards prioritize information density and quick task completion
3. **White-label Ready**: Widget and merchant branding must be highly customizable

---

## Typography

**Font Stack**:
- Primary: Inter (headings, UI, body text)
- Monospace: JetBrains Mono (session IDs, API keys, technical data)

**Scale**:
- Hero Headlines: text-5xl to text-6xl, font-bold
- Section Headings: text-3xl to text-4xl, font-semibold
- Subheadings: text-xl to text-2xl, font-medium
- Body: text-base, font-normal
- Captions/Labels: text-sm, font-medium
- Technical Data: text-xs to text-sm, font-mono

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing: p-2, gap-2 (widget, compact UI)
- Standard: p-4, gap-4 (cards, forms)
- Section padding: py-12 md:py-20 lg:py-24 (landing page)
- Generous: p-8, gap-8 (dashboard containers)

**Grid Systems**:
- Landing: max-w-7xl centered container
- Dashboards: Full-width with max-w-screen-2xl
- Widget: Fixed 360px width × 520px height

---

## Component Library

### Landing Page Components

**Hero Section** (100vh):
- Split layout: 50% compelling copy + 50% animated chat widget demo
- Large hero image showing the widget in action on a mock e-commerce site
- Primary CTA: "Start Free Trial" + Secondary: "Watch Demo"
- Trust indicators: "Trusted by 500+ merchants" with logos

**Features Grid** (3 columns on desktop):
- Icon + Title + Description cards
- Icons: Heroicons (outline style)
- Features: AI-Powered Responses, Smart Escalation, Customizable Widget, Real-time Dashboard, Multi-language Support, Knowledge Base

**How It Works** (3-step process):
- Timeline layout with connecting lines
- Step cards with numbered badges
- Each step includes visual representation

**Pricing Section** (3-tier cards):
- Side-by-side comparison
- Highlighted "Popular" tier with subtle elevation
- Clear feature lists with checkmarks

**Social Proof Section**:
- 2-column testimonial cards with merchant logos
- Include merchant industry and company size

**CTA Section**:
- Full-width gradient background
- Centered content with compelling headline
- Email capture form + primary button
- No-credit-card-required badge

**Footer**:
- 4-column layout: Product, Company, Resources, Legal
- Newsletter signup
- Social media links
- Copyright notice

### Merchant Dashboard Components

**Sidebar Navigation** (240px fixed):
- Logo at top
- Main nav items with icons: Overview, Chat Sessions, Knowledge Base, Triggers, Settings, Billing
- Online status toggle at bottom
- Merchant company name display

**Top Bar**:
- Page title on left
- Search bar (centered, expandable)
- Notifications bell + Profile dropdown on right

**Dashboard Overview** (grid layout):
- 4 stat cards in a row: Active Sessions, Total Messages Today, AI Resolution Rate, Avg Response Time
- Line chart: Messages over time (7-day view)
- Table: Recent sessions with status badges (AI/HUMAN mode)

**Chat Sessions Page**:
- Left panel (30%): Session list with search/filter
- Right panel (70%): Selected conversation thread
- Each session shows: Session ID, Customer, Status badge, Last activity timestamp

**Knowledge Base Editor**:
- Rich text editor (toolbar at top)
- FAQ accordion builder
- URL crawler input with "Crawl Website" button
- Preview pane showing how AI will use the knowledge

**Triggers Configuration**:
- Table of trigger keywords
- Add/Remove inline editing
- Test trigger input field
- Supervisor assignment dropdown per trigger

**Widget Customization**:
- Live preview on right (50%)
- Controls on left (50%): Icon URL upload, Size slider, Online/Offline toggle, Theme colors
- Copy embed code button with code snippet display

### Superadmin Dashboard Components

**Merchant Management Table**:
- Columns: Merchant Name, Email, Plan, Sessions (30d), Status, Actions
- Bulk actions toolbar
- Advanced filters sidebar

**Supervisor Notification Center**:
- Priority queue of escalated sessions
- Real-time updates with sound/desktop notification toggle
- Take Over button for each session
- Chat takeover interface identical to merchant view

**System Status**:
- Service health indicators (API, Database, AI Engine)
- Performance metrics
- Error logs table

### Chat Widget Components

**Floating Button**:
- Circular: configurable size (default 70px)
- Custom icon image (merchant-uploaded)
- Online status dot (green/gray) at bottom-right
- Smooth bounce animation on page load
- Pulse effect when new message arrives

**Chat Window** (360×520px):
- Header: Merchant name + online status + minimize/close buttons
- Message area: Scrollable, auto-scroll to bottom
- Messages: User (right-aligned, different background), Jeany/Supervisor (left-aligned)
- Typing indicator: Three animated dots
- Input area: Text field + Send button (icon)
- Mode badge: "AI Powered" or "Speaking with Supervisor"

**Message Styling**:
- User messages: right-aligned, rounded corners (rounded-2xl rounded-br-sm)
- AI/Supervisor messages: left-aligned, rounded corners (rounded-2xl rounded-bl-sm)
- Timestamp: text-xs below each message
- Smooth fade-in animation for new messages

---

## Interactive States

**Buttons**:
- Primary: solid background, hover lift effect (shadow increase)
- Secondary: outline style, hover fills
- Disabled: reduced opacity, no pointer events

**Form Inputs**:
- Focus: border highlight with subtle glow
- Error: red border with shake animation
- Success: green checkmark icon

**Loading States**:
- Skeleton screens for dashboard tables
- Spinner for API calls in widget
- Progress bars for file uploads (knowledge base)

---

## Animations

Use sparingly and purposefully:

**Landing Page**:
- Hero: Subtle parallax on scroll
- Feature cards: Fade-in on scroll into view
- CTA buttons: Gentle hover lift

**Dashboards**:
- Page transitions: Fade in (duration-200)
- Dropdown menus: Slide down with fade
- Toast notifications: Slide in from top-right

**Widget**:
- Open/close: Scale with fade (transform origin bottom-right)
- Messages: Slide up with fade-in
- Typing indicator: Dot bounce animation

---

## Images

**Landing Page**:
- **Hero Section**: Large screenshot/mockup (right 50%) showing Jeany widget embedded on a modern e-commerce product page, with chat bubbles visible demonstrating AI conversation. High-quality, professional rendering.
- **How It Works Section**: Three supporting images - (1) Merchant configuring widget, (2) AI responding to customer, (3) Dashboard showing analytics
- **Social Proof**: Merchant company logos (grayscale, arranged in grid)

**Dashboards**:
- Empty states: Friendly illustrations for "No sessions yet", "Add your first trigger"
- Default merchant icon: Professional avatar placeholder

**Widget**:
- Default Jeany icon: Friendly chatbot avatar (if merchant hasn't uploaded custom icon)

---

## Accessibility

- Minimum touch target: 44×44px
- Keyboard navigation for all interactive elements
- ARIA labels on icon-only buttons
- Form labels always visible (no placeholder-only inputs)
- Focus indicators clearly visible
- Widget: ESC key to close, Enter to send message

---

This design creates a professional, trustworthy platform that appeals to merchants while maintaining delightful user experiences for end customers through the widget interface.