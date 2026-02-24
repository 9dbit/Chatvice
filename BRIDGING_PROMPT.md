# CHATVICE CUSTOMER PLATFORM V2.0 — BRIDGING PROMPT
# Target: web.chatvice.app (New Replit Project)
# Backend: chatvice.app (Existing — DO NOT REBUILD)

---

## CONTEXT & ARCHITECTURE

This is a **frontend-only** project that connects to the existing Chatvice backend at `https://chatvice.app`. The backend is already fully built and deployed — you must NOT create a new backend, database, or API server. This project is a standalone React web app that calls the existing API.

### Architecture Overview
```
┌─────────────────────────────────────────┐
│  web.chatvice.app (THIS PROJECT)        │
│  React + Vite + TypeScript              │
│  Customer Chat Platform V2.0            │
│  Frosted Glass Purple UI                │
│  Mobile-first Responsive                │
└──────────────┬──────────────────────────┘
               │ API calls (fetch/axios)
               │ WebSocket connection
               ▼
┌─────────────────────────────────────────┐
│  chatvice.app (EXISTING BACKEND)        │
│  Express + PostgreSQL + Drizzle         │
│  All /api/customer/* endpoints          │
│  WebSocket server for real-time chat    │
│  Twilio OTP, Media upload, etc.         │
│  DO NOT REBUILD — CONNECT TO IT         │
└─────────────────────────────────────────┘
```

### Critical Rule
- **BACKEND = chatvice.app** (already deployed, already working)
- **THIS PROJECT = frontend only** (React SPA at web.chatvice.app)
- All API calls go to `https://chatvice.app/api/customer/*`
- WebSocket connects to `wss://chatvice.app/ws?session={sessionId}&type=customer`
- Authentication uses **session cookies** (not JWT) — set `credentials: 'include'` on all fetch requests
- **CORS UPDATE REQUIRED**: Before this project works, CORS must be updated on the Chatvice backend to allow `https://web.chatvice.app` for `/api/customer/*` endpoints (see "Backend CORS Update Needed" section below)

---

## TECH STACK FOR THIS PROJECT

```
Frontend:
- React 18+ with TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Wouter (routing)
- CSS Variables theme system (dark/light mode)
- Frosted glass morphism purple UI
- Mobile-first responsive design
- lucide-react (icons)
```

Port: **5000** (bind to 0.0.0.0:5000)

---

## ENV CONFIGURATION

```env
# API Base URL - the existing Chatvice backend
VITE_API_BASE_URL=https://chatvice.app

# WebSocket URL
VITE_WS_URL=wss://chatvice.app
```

---

## EXISTING BACKEND API CONTRACT

### Authentication Flow

The customer auth uses **session-based authentication** (express-session with cookies). NOT JWT.

**Flow 1: New User (First Time)**
1. `POST /api/customer/request-otp` → Send OTP via SMS or WhatsApp
2. `POST /api/customer/verify-otp` → Verify OTP, creates account, sets session
3. User completes profile (name, email, 6-digit PIN)
4. `PATCH /api/customer/profile` → Save profile with PIN

**Flow 2: Returning User (Has PIN)**
1. `POST /api/customer/check-phone` → Check if phone exists and has PIN
2. If `hasPIN: true` → Show PIN login screen
3. `POST /api/customer/login-pin` → Login with phone + PIN, sets session

**Flow 3: Returning User (No PIN / Forgot PIN)**
1. `POST /api/customer/request-otp` → Send OTP
2. `POST /api/customer/verify-otp` → Verify, re-establishes session

### Complete API Endpoints (32 endpoints)

All endpoints are prefixed with `/api/customer/`. Auth-required endpoints check `req.session.userType === "customer"`.

#### Auth & Profile
```
POST   /api/customer/request-otp
  Body: { phoneNumber: string, countryCode: string, method: "sms" | "whatsapp" }
  Response: { success: true, phoneNumber: string (E.164), method: string }

POST   /api/customer/check-phone
  Body: { phoneNumber: string, countryCode: string }
  Response: { exists: boolean, hasPIN: boolean, phoneNumber: string, displayName?: string }

POST   /api/customer/login-pin
  Body: { phoneNumber: string (E.164), pinCode: string (6 digits) }
  Response: { success: true, customer: CustomerObject }

POST   /api/customer/verify-otp
  Body: { phoneNumber: string (E.164), code: string, displayName?: string }
  Response: { success: true, customer: CustomerObject }

GET    /api/customer/me                    [AUTH]
  Response: { id, phoneNumber, displayName, avatarUrl, email, personalId,
              isPhoneVerified, isProfileCompleted, storageUsed, storageLimit }

GET    /api/customer/qr-code              [AUTH]
  Response: { qrCode: string (base64 PNG), personalId: string }

PATCH  /api/customer/profile              [AUTH]
  Body: { displayName?: string, email?: string, pinCode?: string,
          isProfileCompleted?: boolean }
  Response: { success: true, customer: CustomerObject }

POST   /api/customer/profile/photo        [AUTH]
  Body: FormData with 'photo' file field
  Response: { success: true, avatarUrl: string }

POST   /api/customer/logout               [AUTH]
  Response: { success: true }
```

#### Store Chats (Customer ↔ Merchant AI/Supervisor)
```
GET    /api/customer/store-chats          [AUTH]
  Response: Array of store chat objects with merchant info, last message, unread count

GET    /api/customer/stores               [AUTH]
  Response: Array of merchant stores (id, businessName, domain, logoUrl, agents)

GET    /api/customer/stores/:merchantId   [AUTH]
  Response: Merchant detail with agents, widget config, social links

GET    /api/customer/stores/:merchantId/notification-settings [AUTH]
  Response: Notification settings for this store

POST   /api/customer/stores/:merchantId/chat [AUTH]
  Body: { agentId?: string, message?: string }
  Response: { sessionId, chatId, isNew, agent }
  Note: Creates or resumes chat session with merchant's AI agent

GET    /api/customer/store-chats/:merchantId [AUTH]
  Response: Chat details with messages, session info, agent info

GET    /api/customer/store-chats/:merchantId/messages [AUTH]
  Query: ?before=timestamp&limit=number
  Response: Array of messages (paginated, newest first)

POST   /api/customer/store-chats/:merchantId/messages [AUTH]
  Body: { content: string, messageType?: "text"|"image"|"document",
          mediaId?: string, clientId?: string }
  Response: { success: true, message: MessageObject }
  Note: Uses clientId for optimistic UI reconciliation
```

#### Contacts & Personal Chats (Customer ↔ Customer)
```
GET    /api/customer/contacts             [AUTH]
  Response: Array of saved contacts

POST   /api/customer/contacts             [AUTH]
  Body: { displayName: string, phoneNumber?: string }
  Response: Created contact object

POST   /api/customer/lookup-by-personal-id [AUTH]
  Body: { personalId: string }
  Response: { found: boolean, customer?: { id, displayName, avatarUrl, personalId } }

POST   /api/customer/lookup-by-phone      [AUTH]
  Body: { phoneNumber: string }
  Response: { found: boolean, customer?: { id, displayName, avatarUrl } }

POST   /api/customer/contacts/by-personal-id [AUTH]
  Body: { personalId: string, displayName: string }
  Response: Created contact linked to found customer

DELETE /api/customer/contacts/:contactId  [AUTH]
  Response: { success: true }

GET    /api/customer/personal-chats       [AUTH]
  Response: Array of personal chat objects with participant info

POST   /api/customer/personal-chats       [AUTH]
  Body: { contactId: string }
  Response: { chatId: string, isNew: boolean }

GET    /api/customer/personal-chats/:chatId/messages [AUTH]
  Response: Array of messages

POST   /api/customer/personal-chats/:chatId/messages [AUTH]
  Body: { content: string, messageType?: string, fileUrl?: string, fileName?: string }
  Response: Created message

GET    /api/customer/personal-chats/:chatId/info [AUTH]
  Response: Chat participant details
```

#### Media & Stories
```
GET    /api/customer/stories              [AUTH]
  Response: Array of customer stories (profile updates, ads)

GET    /api/customer/media/list           [AUTH]
  Response: Array of uploaded media with URLs

POST   /api/customer/media/upload         [AUTH]
  Body: FormData with 'file' field
  Response: { id, url: "/api/customer/media/:mediaId", filename, mimeType, fileSize }

GET    /api/customer/media/:mediaId       [PUBLIC]
  Response: Binary file data with correct Content-Type
```

### CustomerObject Shape (as returned by API — NOT the full DB schema)

**From GET /api/customer/me:**
```typescript
interface CustomerMe {
  id: string;
  personalId: string;          // Format: "P-A01-00001"
  phoneNumber: string;         // E.164 format "+6281234567890"
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  isPhoneVerified: boolean;
  isProfileCompleted: boolean;
  notificationsEnabled: boolean;
}
```

**From POST /api/customer/login-pin and verify-otp:**
```typescript
interface CustomerAuth {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  isPhoneVerified: boolean;
  isProfileCompleted: boolean;
}
```

Note: `pinCode` is NEVER returned to the client. It only exists server-side as a bcrypt hash.

### Message Object Shape
```typescript
interface Message {
  id: string;
  sessionId: string;
  content: string;
  from: "user" | "customer" | "ai" | "supervisor" | "system";
  messageType: "text" | "image" | "document" | "product_card" | "system";
  mediaUrl?: string;
  clientId?: string;    // For optimistic UI reconciliation
  createdAt: Date;
}
```

### WebSocket Connection & Events

The backend uses `ws` library with session-based rooms.

**Connection URL:**
```
wss://chatvice.app/ws?session={sessionId}&type=customer
```
- `session` = the chat session ID (obtained from POST /api/customer/stores/:merchantId/chat)
- `type` = "customer" (identifies this client as a customer)

The WebSocket connection is per-session (per-chat). When you open a store chat, connect to WS with that session's ID. The server automatically tracks connected clients per session.

**Client → Server (send via ws.send):**
```json
{ "type": "typing", "from": "customer", "isTyping": true }
{ "type": "typing", "from": "customer", "isTyping": false }
```

**Server → Client (received via ws.onmessage):**
```json
{ "type": "message", "message": { "id": "...", "content": "...", "from": "ai"|"supervisor", ... } }
{ "type": "typing", "from": "ai"|"supervisor", "isTyping": true|false }
```

**Important WebSocket Notes:**
- Messages are NOT sent via WebSocket — they are sent via the REST API (POST /api/customer/store-chats/:merchantId/messages)
- WebSocket is used to RECEIVE real-time updates: new messages from AI/supervisor, typing indicators
- When a `type: "message"` event arrives, invalidate the messages query to refetch from API
- Auto-reconnect on close with 3-second delay
- Auto-hide typing indicator after 5 seconds as failsafe

---

## EXISTING FEATURES TO PRESERVE

The current chat.chatvice.app has these working features that MUST be replicated:

### 1. Authentication
- Phone number input with country code selector (20+ countries, default +62 Indonesia)
- OTP delivery via SMS or WhatsApp (toggle selector)
- OTP verification (6-digit code)
- PIN creation (6-digit) for returning users
- PIN login (phone + PIN, no OTP needed for returning users)
- Profile completion wizard (name, email, PIN setup)

### 2. Customer Layout
- Bottom navigation bar (mobile) with 4 tabs: Profile, Stores, Contacts, Chats
- Left sidebar (desktop) with same navigation
- Active tab indicator with sliding animation
- User avatar in header
- Theme toggle (dark/light)
- Chatvice logo in header

### 3. Inbox (Chats Tab)
- WhatsApp-style chat list
- Store chats section (chats with merchant AI/supervisors)
- Personal chats section (customer-to-customer)
- Unread count badges
- Last message preview
- Pinned chats
- Timestamp display

### 4. Store Chat
- Real-time messaging with merchant AI agents
- Human supervisor escalation
- Message types: text, image, document, product cards
- Media upload (images up to 5MB, documents)
- Message reactions (WhatsApp-style animated reactions)
- Typing indicators
- Read receipts
- Optimistic UI with clientId reconciliation
- Notification sounds (incoming message, reply, angry alert)

### 5. Stores Directory
- List of available merchant stores
- Store detail page with:
  - Business name, logo, description
  - Available AI agents
  - Widget configuration preview
  - Social media links
  - "Start Chat" button

### 6. Contacts
- Add contacts by phone number or Personal ID
- Contact list with avatars
- Lookup by Personal ID (format: P-A01-00001)
- Start personal chat from contact
- Delete contacts

### 7. Personal Chat
- Direct messaging between customers
- Text messages
- File sharing
- Read status

### 8. Settings/Profile
- Display name editing
- Email editing
- Avatar/profile photo upload
- QR code with Personal ID
- Sound settings (notification sounds toggle)
- Storage usage display
- Logout

---

## V2.0 ENHANCEMENTS & NEW FEATURES

### UI/UX Overhaul: Frosted Glass Purple Theme
```css
/* Core theme variables */
:root {
  /* Purple palette */
  --primary: #7C3AED;
  --primary-light: #A78BFA;
  --primary-dark: #5B21B6;
  --accent: #8B5CF6;

  /* Glass morphism */
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: 20px;

  /* Surfaces */
  --surface-1: rgba(124, 58, 237, 0.05);
  --surface-2: rgba(124, 58, 237, 0.10);
  --surface-3: rgba(124, 58, 237, 0.15);
}

.dark {
  --glass-bg: rgba(0, 0, 0, 0.3);
  --glass-border: rgba(255, 255, 255, 0.08);
}

/* Glass card component */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 16px;
}
```

### New Features for V2.0
1. **Enhanced Store Directory** — Categories, search filters, featured stores, ratings
2. **Notification Center** — In-app notification bell with unread badge, notification list page
3. **Improved Profile** — Edit profile with avatar crop, display storage usage bar
4. **Smooth Page Transitions** — Slide animations between pages (mobile-app feel)
5. **Pull-to-Refresh** — On inbox and store list pages
6. **Haptic Feedback** — Vibration on key interactions (if supported)
7. **Message Search** — Search within chat history
8. **Chat Bubble Animations** — Smooth message appear animations
9. **Online/Offline Status** — Show connection status indicator
10. **Splash Screen** — Branded loading screen on app launch

---

## PROJECT STRUCTURE

```
/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                    # Theme variables, glass morphism, dark mode
│   ├── api/
│   │   ├── client.ts                # API client (fetch wrapper with credentials)
│   │   └── websocket.ts             # WebSocket client
│   ├── hooks/
│   │   ├── use-auth.ts              # Auth state management
│   │   ├── use-websocket.ts         # WebSocket connection hook
│   │   ├── use-notifications.ts     # Notification management
│   │   └── use-theme.ts             # Dark/light mode
│   ├── lib/
│   │   ├── query-client.ts          # TanStack Query setup
│   │   └── utils.ts                 # Utility functions
│   ├── components/
│   │   ├── ui/                      # Reusable UI components (glass-card, button, input, etc.)
│   │   ├── layout/
│   │   │   ├── customer-layout.tsx   # Main layout with nav bar
│   │   │   ├── bottom-nav.tsx        # Mobile bottom navigation
│   │   │   └── header.tsx            # Top header bar
│   │   ├── chat/
│   │   │   ├── message-bubble.tsx    # Chat message component
│   │   │   ├── chat-input.tsx        # Message input with media upload
│   │   │   ├── typing-indicator.tsx
│   │   │   └── reaction-picker.tsx
│   │   └── common/
│   │       ├── splash-screen.tsx
│   │       ├── theme-toggle.tsx
│   │       └── connection-status.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── login.tsx             # Phone + country code input
│   │   │   ├── verify-otp.tsx        # OTP verification
│   │   │   ├── pin-login.tsx         # PIN login for returning users
│   │   │   └── setup-profile.tsx     # Profile completion wizard
│   │   ├── inbox/
│   │   │   └── index.tsx             # WhatsApp-style chat list
│   │   ├── chat/
│   │   │   ├── store-chat.tsx        # Chat with merchant AI/supervisor
│   │   │   └── personal-chat.tsx     # Customer-to-customer DM
│   │   ├── stores/
│   │   │   ├── index.tsx             # Store directory
│   │   │   └── store-detail.tsx      # Individual store page
│   │   ├── contacts/
│   │   │   └── index.tsx             # Contact list + add contact
│   │   ├── settings/
│   │   │   ├── index.tsx             # Profile & settings
│   │   │   └── sounds.tsx            # Sound notification settings
│   │   └── notifications/
│   │       └── index.tsx             # Notification center
│   └── types/
│       └── index.ts                  # TypeScript interfaces
```

---

## API CLIENT SETUP

```typescript
// src/api/client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://chatvice.app';

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_BASE}${path}`;

  const config: RequestInit = {
    method,
    credentials: 'include',  // CRITICAL: Send session cookies cross-origin
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...options,
  };

  const res = await fetch(url, config);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiRequest('GET', path);
  return res.json();
}
```

```typescript
// src/api/websocket.ts
const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://chatvice.app';

export function createChatWebSocket(sessionId: string): WebSocket {
  const wsUrl = `${WS_BASE}/ws?session=${sessionId}&type=customer`;
  const ws = new WebSocket(wsUrl);

  ws.onclose = () => {
    // Auto-reconnect after 3 seconds
    setTimeout(() => createChatWebSocket(sessionId), 3000);
  };

  return ws;
}

// Usage in store-chat component:
// const ws = createChatWebSocket(storeChat.sessionId);
// ws.onmessage = (event) => {
//   const data = JSON.parse(event.data);
//   if (data.type === "message") { /* refetch messages */ }
//   if (data.type === "typing") { /* show/hide typing indicator */ }
// };
//
// Send typing indicator:
// ws.send(JSON.stringify({ type: "typing", from: "customer", isTyping: true }));
```

---

## ROUTING

```typescript
// src/App.tsx routes
/                    → Redirect to /inbox (if logged in) or /login
/login               → Phone number input
/verify              → OTP verification
/pin-login           → PIN login
/setup-profile       → Profile completion
/inbox               → Chat list (WhatsApp-style)
/chat/store/:merchantId  → Store chat
/chat/personal/:chatId   → Personal chat
/stores              → Store directory
/stores/:merchantId  → Store detail
/contacts            → Contact list
/settings            → Profile & settings
/settings/sounds     → Sound settings
/notifications       → Notification center
```

---

## CRITICAL IMPLEMENTATION NOTES

### 1. Cross-Origin Session Cookies
The backend uses express-session with cookies. For cross-origin requests from web.chatvice.app to chatvice.app:
- ALL fetch requests MUST include `credentials: 'include'`
- **CORS must be updated on the backend** (chatvice.app project) to allow `https://web.chatvice.app` for `/api/customer/*` endpoints with `Access-Control-Allow-Credentials: true`
- Cookies must be set with `SameSite=None; Secure` in production for cross-origin to work
- The session cookie name is `connect.sid` (default express-session)

### 2. Media URLs
Media uploaded through the backend is served at:
- Store chat media: `https://chatvice.app/api/customer/media/:mediaId`
- Profile photos: `https://chatvice.app/api/customer/media/:mediaId`
- Always prepend the API base URL when displaying media

### 3. Message Reconciliation
Store chat uses optimistic UI:
- Generate a `clientId` (UUID) for each message sent
- Display message immediately in UI
- When server confirms via WebSocket `new_message`, match by `clientId` and update

### 4. Country Codes
Default country code is `+62` (Indonesia). Support these codes:
```
+62 ID, +1 US, +44 UK, +65 SG, +60 MY, +81 JP, +82 KR, +86 CN,
+91 IN, +61 AU, +49 DE, +33 FR, +39 IT, +34 ES, +31 NL, +46 SE,
+47 NO, +45 DK, +358 FI, +48 PL, +55 BR, +52 MX, +54 AR
```

### 5. Theme System
Support dark and light mode:
- Store preference in localStorage
- Apply `.dark` class to `<html>` element
- Use CSS variables for all colors
- Purple-themed frosted glass morphism as the signature style

### 6. Mobile-First Design
- Design for 375px width first, then scale up
- Bottom navigation bar on mobile (4 tabs)
- Side navigation on desktop (>768px)
- Touch-friendly tap targets (min 44px)
- Smooth transitions between pages

---

## BACKEND CORS UPDATE NEEDED (on chatvice.app project)

Before this project works, CORS must be configured on the Chatvice backend (chatvice.app Replit project) to allow requests from `https://web.chatvice.app`. This requires changes in the **other** project, NOT in this one.

The backend currently has CORS for widget endpoints (`/api/widget/*`). You need to add similar CORS handling for `/api/customer/*` endpoints:

```javascript
// Add this to server/routes.ts in the chatvice.app project
app.use((req, res, next) => {
  if (req.path.startsWith("/api/customer/")) {
    const origin = req.headers.origin;
    if (origin && (origin === "https://web.chatvice.app" || origin.includes("chatvice"))) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
    }
  }
  next();
});
```

Also ensure the session cookie settings allow cross-origin:
```javascript
// Session config must include:
cookie: {
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
}
```

**This CORS update must be done in the chatvice.app Replit project BEFORE the web.chatvice.app frontend can communicate with the backend.**

---

## WHAT NOT TO BUILD

- DO NOT create a backend server
- DO NOT create a database
- DO NOT create API endpoints
- DO NOT create authentication logic (use the existing API)
- DO NOT create WebSocket server (connect to existing one)
- DO NOT create OTP/SMS sending logic (the backend handles Twilio)
- DO NOT create media storage (the backend handles file storage)

You are building a **React frontend only** that connects to the existing backend at chatvice.app.

---

## DELIVERY CHECKLIST

- [ ] Vite + React + TypeScript project setup
- [ ] Frosted glass purple theme with dark/light mode
- [ ] API client with cross-origin cookie support
- [ ] WebSocket client for real-time chat
- [ ] Auth flow: OTP login, PIN login, profile setup
- [ ] Inbox page (WhatsApp-style chat list)
- [ ] Store chat with real-time messaging
- [ ] Personal chat (customer-to-customer)
- [ ] Store directory with search
- [ ] Contact management
- [ ] Profile/settings page
- [ ] Media upload and display
- [ ] Notification sounds
- [ ] Mobile-responsive layout with bottom nav
- [ ] Smooth page transitions
- [ ] Connection status indicator
- [ ] Splash screen
- [ ] All pages accessible and working end-to-end
