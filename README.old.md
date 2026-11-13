# Alma — Verified Alumni Mentorship & Career Network

> **EduRev Project 11 (P11) — Track J (Path J1: Next.js Full-Stack)**  
> *A high-trust, privacy-shielded, institution-backed mentorship platform connecting university students with verified alumni mentors.*

---

## 1. Executive Summary & Product Vision

**Alma** bridges the gap between ambitious university students and accomplished alumni. By transforming informal, scattered alumni outreach into a **structured, sustainable, privacy-respecting, and measurable program**, Alma empowers students to accelerate their careers while protecting alumni from outreach fatigue and burnout.

### The Three Stakeholders

1. **Students (Mentees):**
   - Curate comprehensive career profiles with portfolio projects, GitHub/live links, work experience, and target career domains.
   - Discover mentors through an explainable multi-attribute matching algorithm with clear rationale strings.
   - Schedule structured 1-on-1 consultations and attend group cohort sessions with dynamic duration settings.
   - Track mentor-assigned sub-tasks, earn reputation points (+20 pts per completed milestone), and maintain shared notes.

2. **Alumni (Mentors):**
   - Maintain degree-verified alumni status (`pending`, `verified`, `rejected`).
   - Declare strict active mentee capacity limits (`maxMentees`), preventing inbound request flooding.
   - Schedule individual consultations or group cohort check-ins for all active mentees simultaneously.
   - Assign targeted action items and share technical notes directly to the mentee workspace.
   - Personal contact coordinates (email, phone, address) remain strictly shielded.

3. **Institutional Staff (Admins):**
   - Review alumni verification requests with degree and graduation credentials.
   - Monitor real-time program health, relationship momentum, capacity utilization, and satisfaction ratings.
   - Access tamper-evident audit logs and accredited program outcome analytics.

---

## 2. Immutable System Invariants

When developing or extending Alma, two foundational system invariants are strictly enforced at the database and API boundary:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. INVARIANT: Mentor Capacity Must Never Be Exceeded                        │
│    - Mentors declare an active mentee limit (e.g., maxMentees: 2).          │
│    - Acceptance of a request is atomic in MongoDB via conditional updates   │
│      ({ activeMentees: { $lt: maxMentees } }).                              │
│    - At capacity, the mentor is marked at_capacity and new intro requests   │
│      are throttled or hidden. Concurrency cannot exceed declared limits.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. INVARIANT: Alumni Contact Details Must Never Leak                        │
│    - Alumni personal emails, phone numbers, and physical coordinates NEVER  │
│      appear in student-facing API responses or client-side UI states.       │
│    - All communication happens through scoped in-platform messaging or      │
│      obfuscated video rooms (meet.alma.edu/session/...).                   │
│    - Meeting URLs are privacy-gated until 15 minutes before session start.  │
│    - User sanitization is enforced at the server response boundary.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Framework Rules

| Layer | Technology | Role & Architectural Notes |
|---|---|---|
| **Framework** | **Next.js 16.3+ (App Router)** | Full-stack application runtime. Server Components by default, Route Handlers, and Server Actions. |
| **Language** | **TypeScript 5 (Strict)** | Strict type safety across all schemas, payloads, and handlers. Zero loose `any`. |
| **UI Library** | **React 19** + **Tailwind CSS v4** | Typography-first editorial design system (stone/cream palette) with clean SVG icon registry. |
| **Database** | **MongoDB 7+ (Mongoose ODM)** | Authoritative persistence for domain entities, unique constraints, and TTL indexes. |
| **Authentication** | **Better Auth 1.7+** + **jose** | Password hashing, email OTP verification via Resend, and TOTP MFA for administrators. |
| **Session Model** | **Short-Lived JWT + Refresh Token Families** | 15-minute `access_token` cookie + 30-day rotating revocable refresh token family with replay detection. |
| **Real-Time Chat** | **Pusher WebSockets** (`pusher-js` / `pusher`) | Sub-millisecond bilateral message dispatch on private channels with HTTP polling fallback. |
| **File Storage** | **Cloudinary CDN** | Secure, signed uploads for profile avatars, banners, and chat attachments (PDFs, images, code). |
| **Email Service** | **Resend** | Transactional delivery of email verification codes and password reset OTPs. |
| **Validation** | **Zod 4** | Strict incoming request body validation (`.strict()`) across all API endpoints. |

---

## 4. System Architecture & Container Diagram

```text
                                Internet
                                   │
                                   ▼
                ┌─────────────────────────────────────┐
                │        Next.js Full-Stack App       │
                │        (Node.js 20+ Runtime)        │
                │                                     │
                │  App Router (React 19 Server/Client)│
                │  Route Handlers (/api/v1/*)         │
                │  Double-Submit CSRF & Origin Guard  │
                │  RBAC & Multi-Tenant Authorization  │
                └──────────────┬──────────────┬───────┘
                               │              │
             ┌─────────────────┘              └──────────────────┐
             ▼                                                   ▼
   ┌───────────────────┐                               ┌───────────────────┐
   │    MongoDB 7+     │                               │  Pusher Channels  │
   │  Authoritative DB │                               │ WebSocket Gateway │
   │                   │                               │                   │
   │ • Users & Profiles│                               │ • private-        │
   │ • Mentor Capacities                               │   mentorship-{id} │
   │ • Sessions & Slots│                               │ • Instant Message │
   │ • Tasks & Actions │                               │   Broadcasting    │
   │ • TTL Collections │                               └───────────────────┘
   └─────────┬─────────┘                                         │
             │                                                   ▼
             │                                         ┌───────────────────┐
             │                                         │  Cloudinary CDN   │
             │                                         │                   │
             │                                         │ • Chat Documents  │
             │                                         │ • Profile Avatars │
             │                                         │ • Profile Banners │
             │                                         └───────────────────┘
             ▼
   ┌───────────────────┐
   │    Resend API     │
   │ Transactional OTP │
   └───────────────────┘
```

---

## 5. Functional Module Breakdown (M1 – M10)

```
   [ Alumni Journey ]                         [ Student Journey ]
   M1: Verification & Profile                 M3: Student Career Profile
   M2: Capacity & Availability                        │
           └──────────────────┬───────────────────────┘
                              ▼
                  M4: Discovery & Matching
                              │
              M5: Requests & Acceptance
                              │
                 [ Active Relationship ]
          ├── M6: Scheduling & Sessions
          ├── M7: Goals, Actions & Feedback
          ├── M8: Engagement Monitoring (Nudges)
          └── M9: Scoped Messaging
                              │
                              ▼
                 M10: Program Analytics & Audit
```

### Module Responsibilities:
* **M1 — Alumni Verification & Profile:** Degree verification lifecycle (`pending`, `verified`, `rejected`), graduation year, employer, job title, industry, and expertise tags.
* **M2 — Capacity & Availability:** `maxMentees`, `activeMentees`, status (`available`, `near_capacity`, `at_capacity`, `paused`), preferred session frequency, and concurrency guards.
* **M3 — Student Career Profile:** Major, expected graduation, CGPA, target job roles, target industries, validated skills, and embedded project portfolios (with live demo and GitHub repository links).
* **M4 — Mentor Discovery & Matching:** Multi-attribute affinity scoring algorithm (0–100%) returning transparent, explainable rationale strings (e.g. *"Why this match: Strong fit for your portfolio goal"*).
* **M5 — Mentorship Requests & Acceptance:** Request state machine (`pending`, `accepted`, `declined`, `expired`). Throttles student to max active pending requests; auto-expires unanswered requests after 14 days.
* **M6 — Scheduling & Sessions:** Dynamic session durations (custom minutes), group cohort check-ins (`isAllMentees: true`), race-condition-free 5-minute bucket slot overlap guard (`MentorSessionSlot`), and 15-minute meeting link privacy gating.
* **M7 — Goals, Actions & Feedback:** Bilateral goal tracking, mentor-scoped task isolation, nearest-deadline task sorting, post-session ratings (1–5 stars), and gamified reputation engine (+20 pts per completed mentor task).
* **M8 — Engagement Monitoring:** Health scoring for active mentorships (`healthy`, `at_risk`, `inactive`). Tracks relationship momentum and activity timestamps.
* **M9 — In-Platform Real-Time Messaging:** Bilateral communication scoped strictly to mutual participants of an active `Mentorship`. Real-time WebSocket delivery via Pusher with Cloudinary file attachments (PDFs, images, code, up to 10MB).
* **M10 — Program Analytics & Audit:** Aggregated institutional reporting: active pairings, student satisfaction, mentor capacity utilization, and immutable audit logs.

---

## 6. Directory Structure

```text
├── docs/                                  # Authoritative Specifications & Architecture
│   ├── PRD.md                             # Product Requirements Document
│   ├── SRS.md                             # Software Requirements Specification
│   ├── System_Architecture.md             # High-Level Design (HLD) & Concurrency Architecture
│   ├── Database_Design.md                 # MongoDB Collections, Schemas, Indexes & Rules
│   ├── API_Specification.yaml             # Complete OpenAPI 3.1 REST API Specification
│   └── P11_Project_Source.md              # Upstream Project Source Extract
│
├── src/
│   ├── app/                               # Next.js 16 App Router
│   │   ├── page.tsx                       # Landing / Cover page
│   │   ├── layout.tsx & globals.css       # Root layout, Geist typography & theme tokens
│   │   ├── (auth)/                        # Authentication Route Group
│   │   │   ├── login/                     # Secure login interface
│   │   │   ├── register/                  # Registration with role selection
│   │   │   ├── verify-email/              # 6-digit OTP verification interface
│   │   │   └── forgot-password/           # Password recovery workflow
│   │   ├── student/                       # Student Portal
│   │   │   ├── dashboard/                 # Student overview, calendar, goals, sub-tasks
│   │   │   ├── mentors/                   # Mentor discovery, search, and filtering
│   │   │   ├── mentorship/                # Active mentorship workspace (notes, tasks, chat)
│   │   │   └── profile/                   # Student career dossier editor (projects, skills)
│   │   ├── mentor/                        # Mentor Portal
│   │   │   ├── dashboard/                 # Mentor overview, active mentees, capacity gauge
│   │   │   ├── mentees/                   # Mentee roster, career dossier preview, task assigner
│   │   │   ├── requests/                  # Inbound mentorship requests (accept/decline)
│   │   │   ├── sessions/                  # Dynamic session scheduler & cohort check-ins
│   │   │   └── profile/                   # Alumni verification & expertise editor
│   │   ├── admin/                         # Institutional Portal
│   │   │   ├── analytics/                 # Program health, capacity, and satisfaction metrics
│   │   │   └── verification/              # Alumni credential verification queue
│   │   ├── _components/                   # Shared UI Components
│   │   │   ├── app-shell.tsx              # AppShell, Navigation, Avatar, Badges
│   │   │   ├── icons.tsx                  # Featherweight SVG Icon Registry
│   │   │   ├── mentor-discovery.tsx       # Affinity search & discovery client component
│   │   │   ├── mentorship-board.tsx       # Mentorship workspace client component
│   │   │   └── ...                        # Modals, drawers, and form components
│   │   └── api/                           # REST API Route Handlers
│   │       ├── auth/                      # Better Auth routes & custom OTP handlers
│   │       └── v1/                        # Core REST Endpoints (OpenAPI Aligned)
│   │           ├── me/                    # Current user context & CSRF token issuance
│   │           ├── mentors/               # Discovery search & profile queries
│   │           ├── mentorships/           # Active relationship management
│   │           ├── requests/              # Request creation, accept, decline, expiry
│   │           ├── sessions/              # Session creation, overlap guard, link gating
│   │           ├── tasks/                 # Sub-tasks, mentor isolation, +20 pts reputation
│   │           ├── chat/                  # Pusher real-time chat & attachment upload
│   │           └── analytics/             # Institutional program metrics & audit logs
│   │
│   └── lib/                               # Core Application & Business Services
│       ├── auth.ts                        # Better Auth instance & database adapter
│       ├── app-tokens.ts                  # JWT signing, refresh token rotation & cookie headers
│       ├── auth-security.ts               # CSRF, Origin verification & Mongo TTL rate limiting
│       ├── authorization.ts               # Multi-tenant RBAC and relationship authorizer
│       ├── db.ts                          # Mongoose connection pooling & caching
│       ├── matching.ts                    # Multi-attribute affinity recommendation engine
│       ├── pusher-server.ts               # Pusher server SDK for WebSocket events
│       ├── pusher-client.ts               # Pusher browser client with reconnection
│       ├── cloudinary.ts                  # Signed Cloudinary media upload service
│       ├── session-service.ts             # 5-minute slot overlap guard engine
│       └── models/                        # Authoritative Mongoose Domain Models
│           ├── Auth.ts                    # AuthRefreshToken, AuthRateLimit, AuthEmailOtp
│           ├── User.ts                    # User, StudentProfile, AlumniProfile
│           ├── Mentorship.ts              # MentorshipRequest, Mentorship, Session, MentorCapacity
│           ├── MentorSession.ts           # MentorSession, MentorSessionSlot (Overlap Guard)
│           ├── Communication.ts           # Message, SharedNote
│           └── Tasks.ts                   # Action (Sub-Tasks), Goal
```

---

## 7. Security Architecture & Threat Mitigation

### 1. Multi-Tenant Scoping (`institutionId`)
- Every domain record is indexed and scoped to an `institutionId`.
- Queries and mutations automatically enforce institutional tenancy. Cross-tenant leakage is blocked at the authorization layer.

### 2. Token Lifecycle & Replay-Protected Refresh Families
- **Access Token:** Short-lived (15 minutes) signed JWT stored in a hardened `HttpOnly`, `SameSite=Lax` cookie.
- **Refresh Token Family:** 30-day rotating refresh token. Stored as SHA-256 hash in MongoDB `authRefreshTokens` collection with TTL indexing.
- **Replay Attack Defense:** When a refresh token is used, it is rotated. If an already-revoked refresh token is re-submitted, the entire token family is immediately revoked, forcing re-authentication.

### 3. Double-Submit CSRF Cookie Protection
- All state-mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require:
  1. Valid `Origin` or `Referer` header matching `AUTH_TRUSTED_ORIGINS`.
  2. Double-submit cookie verification: `X-CSRF-Token` request header must match the cryptographic `csrf_token` cookie via timing-safe comparison (`timingSafeEqual`).

### 4. Distributed MongoDB-Backed Rate Limiting
- Public endpoints (login, register, OTP verification) enforce brute-force protection backed by `authRateLimits` in MongoDB with automatic TTL expiry.

### 5. Race-Condition Overlap Prevention (5-Minute Bucket Slicing)
- To prevent double-booking collisions, scheduled sessions are decomposed into discrete 5-minute atomic slots stored in `mentorSessionSlots`.
- Backed by a unique compound MongoDB index `{ mentorId: 1, slot: 1 }`. Any overlapping booking request triggers a duplicate key error (`E11000`) and fails safely with zero race condition.

---

## 8. Getting Started & Local Development

### Prerequisites
- **Node.js:** 20.x or higher
- **pnpm:** 9.x or higher
- **MongoDB:** 7.0+ (local instance or MongoDB Atlas)

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/ayush/Alumni-Mentorship-and-Career-Network.git
cd Alumni-Mentorship-and-Career-Network
pnpm install
```

### Step 2: Environment Configuration
Create `.env.local` in the project root (copied from `.env.example`):
```env
# Application URL & Port
BETTER_AUTH_URL=http://localhost:3000
AUTH_TRUSTED_ORIGINS=http://localhost:3000

# Better Auth Cryptographic Secret (min 32 random chars)
BETTER_AUTH_SECRET=your_super_secret_better_auth_key_replace_this_in_production

# MongoDB Connection URI
MONGODB_URI=mongodb://127.0.0.1:27017/alumni_network
MONGODB_DB=alumni_network

# Resend API (Transactional Verification OTPs)
RESEND_API_KEY=re_your_test_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev

# Pusher WebSockets (Real-Time Chat)
PUSHER_APP_ID=your_pusher_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# Cloudinary (Media & Chat File Attachments)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Step 3: Seed Verified Demo Alumni
Seed the database with verified alumni mentors, expertise taxonomies, and initial capacities:
```bash
pnpm seed
```

### Step 4: Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 9. Code Quality & Verification

Run strict TypeScript type-checking and ESLint checks:
```bash
# Verify strict TypeScript types (zero errors)
pnpm exec tsc --noEmit

# Run project linting
pnpm lint
```

---

## 10. License & Intellectual Property

Developed under **EduRev Project 11 (P11) — Track J** specifications. All rights reserved.
