<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENT INSTRUCTIONS — Alumni Mentorship and Career Network (Alma / P11)

> **Audience:** AI Coding Agents (Antigravity, Claude Code, Cursor, Copilot, etc.)  
> **Repository:** `Alumni-Mentorship-and-Career-Network`  
> **Project Identity:** EduRev Project 11 (P11) — Track J (Path J1: Next.js Full-Stack)  
> **Brand Name:** *Alma* (Verified Alumni Mentorship Platform)

---

## 1. Executive Summary & Purpose

Alma is an institution-backed mentorship platform connecting university students with verified alumni mentors. It transitions informal, chaotic alumni outreach into a **structured, sustainable, privacy-respecting, and measurable program**.

### The Three Stakeholders:
1. **Students (Mentees):** Discover relevant mentors through transparent, explainable recommendations; schedule structured sessions; maintain shared action items and career goals.
2. **Alumni (Mentors):** Contribute time without burnout via hard capacity limits, request throttling, single-click declines, and shielded personal contact info.
3. **Institutional Staff (Admins):** Verify alumni credentials, monitor relationship momentum, identify stalled mentorships, and export accredited program analytics.

---

## 2. Immutable System Invariants (DO NOT VIOLATE)

When generating or modifying any code in this repository, you **MUST NEVER** violate these two core invariants:

### 1. Invariant: Mentor Capacity Must Never Be Exceeded
* Mentors declare an active mentee limit (e.g. `maxMentees: 2`).
* Acceptance of a mentorship request **must be atomic** in MongoDB (e.g., using a conditional update or transaction where `activeMentees < maxMentees`).
* If a mentor is at capacity, the system must disallow new requests or hide the "Request intro" option.
* Never allow concurrent acceptance requests to push a mentor past their declared limit.

### 2. Invariant: Alumni Contact Details Must Never Leak
* Alumni personal email addresses, phone numbers, and physical addresses **must NEVER be returned** in student-facing API responses or UI payloads.
* All discovery, messaging, and meeting setup must occur within the platform or via obfuscated, platform-managed channels.
* Sanitize user objects at the server response boundary (e.g., in Route Handlers or Server Actions), not just in the client UI.

---

## 3. Technology Stack & Framework Rules

| Layer | Selected Technology | Notes / Constraints |
|---|---|---|
| **Framework** | **Next.js 16.3+ (App Router)** | Path J1: Next.js Full-Stack. Use Route Handlers and Server Components. Heed Next.js 16 breaking changes (see docs in `node_modules/next/dist/docs/`). |
| **Language** | **TypeScript 5 (Strict)** | Strict types for all models, payloads, and handlers. No loose `any`. |
| **UI Library** | **React 19** + **Tailwind CSS v4** | Modern component architecture. Minimalist, intentional design system (cream/stone palette, clean typography). |
| **Database** | **MongoDB 7+** | Native `mongodb` driver (or Mongoose). Authoritative durable storage for all domain data. |
| **Authentication** | **Better Auth 1.7+** + **jose** | Better Auth with Mongo adapter, Resend OTP email verification, TOTP for administrators. |
| **Session Model** | **Short-lived JWT + Refresh Tokens** | 15-minute access token in `HttpOnly` cookie; 30-day rotating refresh token family in `authRefreshTokens` collection. |
| **Validation** | **Zod 4** | Validate all incoming JSON request bodies strictly using `.strict()`. |
| **Mailing** | **Resend** | Used for verification OTPs and admin sign-in codes. |

---

## 4. Architecture & Module Breakdown (M1 – M10)

The system is organized into 10 cohesive modules as defined in `docs/SRS.md` and `docs/Database_Design.md`:

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
* **M1 — Alumni Verification & Profile:** Degree verification status (`pending`, `verified`, `rejected`), graduation year, employer, job title, industry, and expertise tags.
* **M2 — Capacity & Availability:** `maxMentees`, `activeMentees`, status (`available`, `near_capacity`, `at_capacity`, `paused`), preferred session frequency.
* **M3 — Student Career Profile:** Major, expected graduation, career goals, target industries, target job roles, skills to develop, portfolio/resume links.
* **M4 — Mentor Discovery & Matching:** Multi-attribute matching algorithm calculating affinity scores (0–100%) and returning transparent rationale strings (e.g., *"Why this match: Strong fit for your portfolio goal"*).
* **M5 — Mentorship Requests & Acceptance:** Request states (`pending`, `accepted`, `declined`, `withdrawn`, `expired`). Throttles student to max active pending requests; auto-expires requests after 14 days.
* **M6 — Scheduling & Sessions:** Session coordination, agenda, date/time, Alma video room links, attendance confirmations, and private notes.
* **M7 — Goals, Actions & Feedback:** Bilateral goal tracking (milestones, due dates, status) and mutually editable action items (checkboxes), plus post-session ratings (1–5 stars + feedback).
* **M8 — Engagement Monitoring:** Health scoring for active mentorships. Flags inactive relationships (no activity for 14+ days) and schedules nudge emails.
* **M9 — In-Platform Messaging:** Bilateral communication scoped strictly to users with an active `mentorship` record.
* **M10 — Programme Analytics & Audit:** Aggregated reporting for institution staff: active pairings, student satisfaction, capacity utilization, response times, and immutable audit logs.

---

## 5. Security, Auth, and Multi-Tenancy Architecture

All backend security logic is centralized in `src/lib/`:

### 1. Multi-Tenant Scoping (`institutionId`)
* Every data record belongs to an `institutionId`.
* Queries and mutations MUST filter by the authenticated user's `institutionId` (unless the user has the system administrator role).
* Users cannot modify their own `role` or `institutionId` via public API payloads.

### 2. Request Authentication & Token Lifecycle (`src/lib/app-tokens.ts`)
* **Access Token:** Short-lived (15 min) JWT stored in `access_token` cookie. Contains `sub` (userId), `role`, and `institutionId`.
* **Refresh Token:** Long-lived (30 days) opaque token stored in `refresh_token` cookie scoped to `/api/v1/auth`.
* **Token Family Rotation:** Refresh tokens belong to a `family`. When rotated, the old token is revoked. If an already-revoked token is used (replay attack), the entire family is immediately revoked.

### 3. CSRF & Origin Validation (`src/lib/auth-security.ts`)
* All mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require:
  1. Valid `Origin` or `Referer` matching `AUTH_TRUSTED_ORIGINS`.
  2. Double-submit CSRF cookie check: `X-CSRF-Token` header matching the `csrf_token` cookie via timing-safe comparison (`timingSafeEqual`).

### 4. Rate Limiting (`src/lib/auth-security.ts`)
* Critical endpoints (login, register, OTP verification) enforce rate limiting backed by the `authRateLimits` MongoDB collection.

### 5. Authorization Helper (`src/lib/authorization.ts`)
* Use `authorize(request, { roles, institutionId, ownerId, relationshipUserIds })` to validate permissions in Route Handlers.

---

## 6. Directory Structure & Key Files

```text
├── docs/                                  # Specifications & authoritative baselines
│   ├── PRD.md                             # Product Requirements Document
│   ├── SRS.md                             # Software Requirements Specification
│   ├── System_Architecture.md             # High-Level Design (HLD)
│   ├── Database_Design.md                 # MongoDB Collections, Indexes & Constraints
│   ├── API_Specification.yaml             # Complete OpenAPI 3.1 REST API spec
│   └── P11_Project_Source.md              # Project source context
│
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Landing / Cover page
│   │   ├── layout.tsx & globals.css       # App root layout, font loading & styling
│   │   ├── dashboard/page.tsx             # Student dashboard (upcoming session, goals)
│   │   ├── mentors/page.tsx               # Mentor discovery & search page
│   │   ├── mentorship/page.tsx            # Active relationship workspace (timeline, tasks)
│   │   ├── analytics/page.tsx             # Institutional programme health & analytics
│   │   ├── _components/                   # Reusable UI components
│   │   │   ├── app-shell.tsx              # AppShell, Avatar, StatusBadge, SectionHeading
│   │   │   ├── icons.tsx                  # Clean SVG icon registry
│   │   │   ├── mentor-discovery.tsx       # Discovery search & filtering client component
│   │   │   └── mentorship-board.tsx       # Mentorship workspace client component
│   │   └── api/
│   │       ├── auth/[...all]/route.ts     # Better Auth API route handler
│   │       └── v1/                        # Core REST API endpoints (OpenAPI aligned)
│   │           ├── auth/                  # login, register, refresh, logout, verify-email, verify-totp
│   │           └── me/                    # Returns current user context & sets CSRF cookie
│   │
│   └── lib/
│       ├── auth.ts                        # Better Auth instance & MongoDB connection
│       ├── app-tokens.ts                  # JWT signing, refresh rotation & cookie headers
│       ├── auth-security.ts               # CSRF, Origin verification & rate limiting
│       └── authorization.ts               # RBAC and relationship authorization logic
```

---

## 7. Database Conventions & Collections (MongoDB)

All domain collections follow these conventions:
* Primary keys are mapped as `_id` (ObjectId or string).
* Timestamps: `createdAt: Date`, `updatedAt: Date`.
* Tenant isolation: Include `institutionId` as an indexed field on all tenant-specific documents.

### Key Collections:
1. `user` — Auth credentials, role (`student` | `alumni` | `administrator`), `institutionId`.
2. `authRefreshTokens` — Refresh token hashes, token families, expiration, revocation.
3. `authRateLimits` — IP/path rate-limiting buckets with TTL resets.
4. `alumniProfiles` — Graduation year, degree, current job, company, expertise tags, verification status.
5. `mentorCapacities` — `mentorId`, `maxMentees`, `activeMentees`, `status`, `acceptingRequests`.
6. `studentProfiles` — Degree, grad year, target roles, target industries, goals.
7. `mentorshipRequests` — `studentId`, `mentorId`, `status` (`pending`, `accepted`, `declined`, `expired`), message, expiry date.
8. `mentorships` — Active relationships linking `studentId`, `mentorId`, `startDate`, `status` (`active`, `completed`, `terminated`).
9. `sessions` — Mentorship meetings, agenda, date/time, status (`scheduled`, `completed`, `cancelled`).
10. `goals` & `actionItems` — Progress tracking inside an active mentorship.
11. `auditLogs` — Security and administrative compliance log.

---

## 8. Development & Verification Guide

### Setup & Local Run:
1. Ensure `.env.local` exists (copy from `.env.example`):
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/alumni_network
   MONGODB_DB=alumni_network
   BETTER_AUTH_SECRET=your_long_random_secret_here
   BETTER_AUTH_URL=http://localhost:3000
   AUTH_TRUSTED_ORIGINS=http://localhost:3000
   RESEND_API_KEY=re_your_test_key
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
2. Run development server:
   ```bash
   pnpm dev
   ```
3. Type-check & lint:
   ```bash
   pnpm lint
   ```

### When Implementing New Features:
1. **Always read the relevant document in `docs/`:**
   * For API schemas: consult `docs/API_Specification.yaml`.
   * For database fields & indexes: consult `docs/Database_Design.md`.
   * For business rules & state machines: consult `docs/SRS.md`.
2. **Preserve Next.js 16 conventions:**
   * Server Components by default for pages and layouts.
   * Add `"use client"` only when using React state, event listeners, or client-only hooks.
   * Keep Route Handlers strictly typed with Zod `.safeParse()` on request bodies.
3. **Follow UI Design Directives:**
   * Do not import generic heavy UI kits (MUI, Shadcn templates) if they clash with the existing refined, typography-first aesthetic in `globals.css` and `app-shell.tsx`.
   * Use the SVG icons registered in `src/app/_components/icons.tsx`.
