# Alma — Verified Alumni Mentorship & Career Network

> Turn alumni goodwill into momentum with structured, privacy-shielded, and capacity-guaranteed mentorship.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3%2B-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2B-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Alma is an institution-backed mentorship platform that connects university students with verified alumni mentors. It transitions informal, chaotic alumni outreach into a structured, sustainable, privacy-respecting, and measurable program. Built on Next.js 16 (App Router), React 19, MongoDB, Upstash Redis, Pusher WebSockets, and Cloudinary, Alma protects mentors from burnout via hard capacity limits while providing mentees with transparent recommendations, dynamic session scheduling, real-time messaging, and actionable career milestone tracking.

---

## Table of Contents

- [Features](#features)
  - [Student Features (Mentees)](#student-features-mentees)
  - [Alumni Features (Mentors)](#alumni-features-mentors)
  - [Institutional Admin & Officer Features](#institutional-admin--officer-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [High-Level System Architecture](#high-level-system-architecture)
  - [Data Model & Entity Relationships](#data-model--entity-relationships)
- [Workflows](#workflows)
  - [1. Authentication & Token Lifecycle](#1-authentication--token-lifecycle)
  - [2. Mentorship Discovery & Connection (Invariant 1: Capacity Guard)](#2-mentorship-discovery--connection-invariant-1-capacity-guard)
  - [3. Dynamic Session Scheduling & Overlap Prevention](#3-dynamic-session-scheduling--overlap-prevention)
  - [4. Real-Time Chat & Cloudinary File Attachments](#4-real-time-chat--cloudinary-file-attachments)
  - [5. Action Items, Milestone Tracking & Gamification (+20 Pts)](#5-action-items-milestone-tracking--gamification-20-pts)
  - [6. Alumni Degree Verification & Governance](#6-alumni-degree-verification--governance)
- [Project Structure](#project-structure)
- [Module Documentation](#module-documentation)
  - [Module Breakdown (M1 – M10)](#module-breakdown-m1--m10)
  - [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Local Database Note](#local-database-note)
  - [Verify It Works](#verify-it-works)
- [Environment Variables](#environment-variables)
  - [Environment Variables Table](#environment-variables-table)
  - [Credential Acquisition Guide](#credential-acquisition-guide)
- [Third-Party Setup Guide](#third-party-setup-guide)
  - [Cloudinary Setup](#cloudinary-setup)
  - [Upstash Redis Setup](#upstash-redis-setup)
  - [Pusher WebSockets Setup](#pusher-websockets-setup)
  - [Resend Email Setup](#resend-email-setup)
- [Commands](#commands)
  - [Production Run Sequence](#production-run-sequence)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License and Copyright](#license-and-copyright)
- [Contact / Support](#contact--support)

---

## Features

### Student Features (Mentees)
- **Academic & Career Dossier:** Maintain rich student profiles with major, expected graduation year, CGPA, target industries, target job roles, skills to develop, and verified portfolio/GitHub links.
- **Explainable Multi-Attribute Matching:** Discover alumni mentors scored via an explainable affinity engine calculating percentage fit and returning clear rationale strings (e.g., *"Strong fit for your portfolio goal"*).
- **Public Mentor Dossier Inspection:** Inspect detailed alumni profiles, graduation year, verified degree status, current employer, job title, and expertise tags before requesting an introduction.
- **Throttled Mentorship Requests:** Submit tailored introduction notes, throttled to a maximum of 5 pending requests with an automatic 14-day expiry window to prevent spam and ghosting.
- **Dynamic 1-on-1 & Cohort Session Attendance:** Attend 1-on-1 consultations or group cohort workshops with custom durations (15 to 240 mins) and automated calendar dates.
- **Meeting Link Privacy Gating:** Virtual meeting URLs remain protected and are only unmasked 15 minutes before the scheduled session start time.
- **Action Items & Milestone Tracking (+20 Pts):** Track personal and mentor-assigned tasks. Completing tasks automatically awards +20 reputation points displayed on the student dashboard.
- **Real-Time WebSocket Chat:** Message active mentors with instant delivery via Pusher WebSockets and share rich file attachments (PDFs, resumes, images, code files up to 10MB) hosted securely on Cloudinary.

### Alumni Features (Mentors)
- **Verified Alma Mater Credentials:** Gain institutional verification badges (`pending`, `verified`, `rejected`) backed by university administrator review.
- **Capacity Guard (System Invariant 1):** Declare a strict maximum active mentee capacity (`maxMentees`). Acceptance of incoming requests enforces an Upstash Redis distributed lock and an atomic MongoDB conditional update to guarantee the declared limit is never exceeded.
- **Contact Details Shielding (System Invariant 2):** Personal email addresses, phone numbers, and physical coordinates are scrubbed at the server boundary and never exposed to students in API responses or user interfaces.
- **Dynamic Session Scheduling:** Schedule 1-on-1 meetings or broadcast cohort sessions to all active mentees simultaneously (`isAllMentees: true`).
- **Race-Condition-Free Overlap Guard:** Booking intervals are partitioned into 5-minute atomic indices with a unique compound database index, preventing double-booking without requiring multi-document replica-set transactions.
- **Mentee Task Delegation & Note Publishing:** Review mentee career profiles and assign actionable checklists with due dates or share persistent technical session notes.

### Institutional Admin & Officer Features
- **Alumni Verification Command Center:** Inspect pending alumni degree documents, review official graduation years, and approve or reject verification requests.
- **Capacity Watchdog:** Monitor live mentor capacity utilization across departments, preventing over-allocation and identifying mentors ready for additional mentees.
- **Relationship Momentum Watchdog:** Automatically flag inactive mentorship relationships (no contact or milestone progress for 14+ days) and dispatch engagement nudges.
- **Accredited Program Analytics:** Track platform-wide match conversion rates, average response intervals, and session completion metrics.
- **Immutable Audit Trail:** Append-only activity logging for administrative actions, verification decisions, and tenant configuration updates.

---

## Tech Stack

| Layer | Technology | Version | Purpose in Alma |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.4` | React Server Components, Route Handlers, Turbopack, canonical redirects |
| **Frontend Library** | React / React DOM | `19.2.8` | Component architecture, Transitions, Server Actions |
| **Styling Engine** | Tailwind CSS | `v4.0` | Design tokens, cream/stone palette, global hidden scrollbars |
| **UI Components** | Lucide React | `^1.66.0` | Featherweight SVG icon registry |
| **Data Visualization** | Recharts | `^3.10.1` | 12-month student trajectory & officer capacity visualizers |
| **Database** | MongoDB & Mongoose | `7.0+` / `^9.11.4` | Authoritative durable store, compound indices, atomic conditional updates |
| **In-Memory Cache & Lock** | Upstash Redis | `^1.41.0` | Ephemeral OTP storage, IP rate-limiting, distributed mentor capacity lock |
| **Authentication** | Better Auth & jose | `^1.7.14` / `^6.2.13` | Short-lived JWTs (15 min), 30-day rotating refresh families, TOTP, CSRF |
| **Data Validation** | Zod | `^4.6.7` | Strict runtime environment and API request body parsing |
| **Realtime Messaging** | Pusher (Channels) | `^5.3.4` / `^8.6.0` | Bidirectional real-time WebSockets for active mentorship chat |
| **Media Storage** | Cloudinary | `^2.11.0` | Profile photos, resumes, shared notes, and PDF attachments |
| **Transactional Email** | Resend | `^6.35.0` | One-time passwords (OTP) and login verification codes |
| **Package Manager** | pnpm | `10.15.1` | Fast, deterministic workspace dependency management |
| **Language & Tooling** | TypeScript & ESLint | `^5.0` / `^10.0` | Strict type safety, zero `any` policy, Next.js linting |

---

## Architecture

### High-Level System Architecture

Alma follows a modular full-stack Next.js App Router architecture. Client interactions flow through Server Actions or REST Route Handlers, guarded by a centralized authentication layer, Upstash Redis distributed locks, and atomic MongoDB operations.

```mermaid
flowchart TD
    subgraph Clients["Clients"]
        StudentBrowser["Student Portal (Mentee)"]
        MentorBrowser["Mentor Portal (Alumnus)"]
        OfficerBrowser["Officer Portal (Admin)"]
    end

    subgraph AppLayer["Next.js 16 App Router (Node.js 20+)"]
        AuthGuard["Auth & Multi-Tenant Guard (JWT + CSRF)"]
        ServerActions["Server Actions (src/actions)"]
        RouteHandlers["API Handlers (src/app/api/v1)"]
    end

    subgraph CacheAndServices["Cache & Real-Time Services"]
        RedisLock["Upstash Redis (Lock & Rate Limit)"]
        PusherSockets["Pusher WebSockets (Live Chat)"]
        CloudinaryCDN["Cloudinary (Images & PDFs)"]
        ResendMail["Resend (Transactional OTP)"]
    end

    subgraph Persistence["Authoritative Persistence"]
        MongoDBDatabase[("MongoDB 7+ (Mongoose)")]
    end

    StudentBrowser --> AuthGuard
    MentorBrowser --> AuthGuard
    OfficerBrowser --> AuthGuard

    AuthGuard --> ServerActions
    AuthGuard --> RouteHandlers

    ServerActions --> RedisLock
    ServerActions --> MongoDBDatabase
    ServerActions --> PusherSockets
    ServerActions --> CloudinaryCDN

    RouteHandlers --> ResendMail
    RouteHandlers --> MongoDBDatabase
```

### Data Model & Entity Relationships

The data model enforces strict tenant isolation (`institutionId`) and relationship scoping. Active mentorships bind students and alumni to sessions, tasks, and shared chat resources.

```mermaid
erDiagram
    USER ||--o{ MENTORSHIP : participates
    USER ||--o{ MENTOR_CAPACITY : maintains
    USER ||--o{ VERIFICATION_REQUEST : submits
    USER ||--o{ ACTION_ITEM : owns
    MENTORSHIP ||--o{ MENTOR_SESSION : schedules
    MENTORSHIP ||--o{ CHAT_MESSAGE : exchanges
    MENTORSHIP ||--o{ SHARED_NOTE : shares

    USER {
        string _id PK
        string email UK
        string role "student | alumni | alumni_relations_officer"
        string institutionId FK
        string name
        boolean emailVerified
    }

    MENTOR_CAPACITY {
        string _id PK
        string mentorId FK
        int maxMentees
        int activeMentees
        string status "available | near_capacity | at_capacity | paused"
    }

    MENTORSHIP {
        string _id PK
        string studentId FK
        string mentorId FK
        string institutionId FK
        string status "active | completed | terminated"
        date startDate
    }

    MENTOR_SESSION {
        string _id PK
        string mentorshipId FK
        string mentorId FK
        string studentId FK
        date date
        string time
        int durationMinutes
        string location "Meeting URL"
        int_array slotIndices "Atomic 5-min intervals"
        string status "scheduled | completed | cancelled"
    }

    ACTION_ITEM {
        string _id PK
        string studentId FK
        string mentorId FK
        string title
        date dueDate
        boolean completed
        boolean pointsAwarded
    }

    CHAT_MESSAGE {
        string _id PK
        string mentorshipId FK
        string senderId FK
        string text
        string attachmentUrl
        date createdAt
    }

    VERIFICATION_REQUEST {
        string _id PK
        string userId FK
        string degreeDocumentUrl
        string status "pending | verified | rejected"
        int graduationYear
    }
```

---

## Workflows

### 1. Authentication & Token Lifecycle
Alma utilizes a short-lived Access Token / rotating Refresh Token family architecture backed by Better Auth and `jose`.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as /api/v1/auth/login
    participant DB as MongoDB (authRefreshTokens)
    participant Client as Client Storage

    User->>API: POST /api/v1/auth/login (email, password)
    API->>API: Verify credentials & CSRF origin
    API->>DB: Create Refresh Token Family (rotating UUID)
    API-->>User: Set-Cookie: access_token (JWT 15m, HttpOnly)
    API-->>User: Set-Cookie: refresh_token (Opaque 30d, HttpOnly)
    API-->>User: Set-Cookie: csrf_token (Double-submit token)
    Note over User,API: Subsequent mutations send X-CSRF-Token header matching csrf_token cookie
```

### 2. Mentorship Discovery & Connection (Invariant 1: Capacity Guard)
Acceptance of a mentorship request guarantees that an alumni mentor never exceeds their declared mentee limit (`maxMentees`), enforced via Upstash Redis distributed locking followed by an atomic MongoDB conditional update.

```mermaid
sequenceDiagram
    autonumber
    actor Mentee as Student (Mentee)
    actor Mentor as Alumni (Mentor)
    participant Actions as src/actions/mentorship.ts
    participant Redis as Upstash Redis (Distributed Lock)
    participant DB as MongoDB (mentorCapacities)

    Mentee->>Actions: requestMentorship(mentorId, message)
    Note over Actions: Checks active request count <= 5
    Actions->>DB: Insert MentorshipRequest (status: pending, 14d expiry)
    Mentor->>Actions: acceptMentorshipRequest(requestId)
    Actions->>Redis: acquireMentorLock(mentorId) (TTL: 2s)
    Actions->>DB: findOneAndUpdate({ mentorId, $expr: { $lt: ["$activeMentees", "$maxMentees"] } }, { $inc: { activeMentees: 1 } })
    alt Capacity Available
        DB-->>Actions: Update Succeeded
        Actions->>DB: Create active Mentorship record
        Actions->>Redis: releaseMentorLock(mentorId)
        Actions-->>Mentor: Pair successfully activated
    else Mentor At Capacity (Concurrent Race Blocked)
        DB-->>Actions: Null Document
        Actions->>Redis: releaseMentorLock(mentorId)
        Actions-->>Mentor: Error: Mentor at declared capacity limit
    end
```

### 3. Dynamic Session Scheduling & Overlap Prevention
Sessions support arbitrary durations (15 to 240 mins) for 1-on-1 consultations or entire mentee cohorts. Overlaps are blocked without distributed transactions by partitioning booking times into 5-minute atomic indices.

```mermaid
sequenceDiagram
    autonumber
    actor Mentor as Alumni Mentor
    participant Actions as src/actions/mentorship.ts
    participant Service as src/lib/session-service.ts
    participant DB as MongoDB (MentorSessions)

    Mentor->>Actions: scheduleMentorshipSession(date, time, durationMinutes, menteeId)
    Actions->>Service: calculateSlotIndices(startTime, durationMinutes)
    Note over Service: Converts time window into 5-min discrete slots (e.g. [144, 145, 146])
    Actions->>DB: insertOne({ mentorId, date, slotIndices, ... })
    alt No Conflict
        DB-->>Actions: Insert Succeeded (Compound Index Checked)
        Actions-->>Mentor: Session created & visible on student calendars
    else Overlapping Time Slot
        DB-->>Actions: MongoServerError E11000 (Duplicate Key on slotIndices)
        Actions-->>Mentor: Error: Time slot conflicts with an existing session
    end
```

### 4. Real-Time Chat & Cloudinary File Attachments
Messages and file attachments are strictly scoped to users with an active `mentorship` record.

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Student / Mentor
    participant Actions as src/actions/chat.ts
    participant Cloudinary as Cloudinary API
    participant DB as MongoDB (Communication)
    participant Pusher as Pusher Channels
    actor Recipient as Active Mentorship Partner

    Sender->>Actions: uploadChatAttachmentAction(formData)
    Actions->>Cloudinary: Upload File (PDF/Image/Zip, max 10MB)
    Cloudinary-->>Actions: Secure Cloudinary URL & Metadata
    Sender->>Actions: sendMessageAction(mentorshipId, text, attachment)
    Actions->>DB: Save ChatMessage document
    Actions->>Pusher: trigger("private-mentorship-{id}", "new-message", payload)
    Pusher-->>Recipient: Instant WebSocket Message Push
```

### 5. Action Items, Milestone Tracking & Gamification (+20 Pts)
1. Mentor creates a sub-task on the mentee's workspace via `createTaskAction`.
2. Student views the task on their dashboard with expiration countdowns.
3. Upon task completion via `toggleTaskCompletionAction`, the system executes an atomic increment: `studentProfile.totalPoints += 20` and records `pointsAwarded: true`.

### 6. Alumni Degree Verification & Governance
1. Alumnus uploads degree documentation during onboarding via Cloudinary.
2. A `VerificationRequest` is created in state `pending`.
3. Alumni Relations Officers inspect the document in the verification queue.
4. Officer approves or rejects the record via `decideVerification`. Approved mentors receive the verified alma mater badge.

---

## Project Structure

```text
├── docs/                                # Technical specifications & architectural design
│   ├── API_Specification.yaml           # OpenAPI 3.1 REST API specification
│   ├── Database_Design.md               # MongoDB collections, schema validation & indices
│   ├── PRD.md                           # Product Requirements Document
│   ├── SRS.md                           # Software Requirements Specification
│   └── System_Architecture.md           # High-Level Architecture Design
│
├── src/
│   ├── actions/                         # Server Actions (Mutations Layer)
│   │   ├── chat.ts                      # WebSocket messaging & Cloudinary uploads
│   │   ├── mentorship.ts                # Request dispatch, acceptance & scheduling
│   │   ├── officer.ts                   # Verification reviews & capacity watchdogs
│   │   ├── profile.ts                   # Student & mentor dossiers management
│   │   └── tasks.ts                     # Action items, sub-tasks & reputation points
│   │
│   ├── app/                             # Next.js App Router
│   │   ├── (app)/                       # Authenticated Role Portals
│   │   │   ├── dashboard/page.tsx       # Role-based gateway redirect
│   │   │   ├── mentor/                  # Alumni Portal (dashboard, mentees, sessions, profile)
│   │   │   ├── officer/                 # Officer Portal (verifications, momentum, reports)
│   │   │   ├── profile/[id]/            # Public mentor dossier inspection view
│   │   │   └── student/                 # Student Portal (dashboard, mentors, mentorship, analytics)
│   │   │
│   │   ├── (auth)/                      # Authentication Routes
│   │   │   ├── login/page.tsx           # Password & Resend OTP sign-in
│   │   │   └── register/page.tsx        # Multi-role account onboarding
│   │   │
│   │   ├── (marketing)/                 # Public Marketing Route Group
│   │   │   ├── layout.tsx               # Shared marketing layout (Navbar + Footer)
│   │   │   ├── page.tsx                 # Root marketing landing page (/)
│   │   │   ├── community/page.tsx       # Alumni stories & community impact
│   │   │   ├── features/page.tsx        # Complete 10-module capability breakdown
│   │   │   ├── how-it-works/page.tsx    # Step-by-step program walkthrough
│   │   │   └── resources/page.tsx       # Mentorship playbooks & first-session guides
│   │   │
│   │   ├── api/                         # Backend REST API Endpoints
│   │   │   ├── auth/[...all]/route.ts   # Better Auth handler
│   │   │   ├── pusher/auth/route.ts     # Pusher private channel authentication
│   │   │   ├── sessions/                # Session creation & cancellation routes
│   │   │   └── v1/                      # OpenAPI 3.1 versioned REST handlers
│   │   │
│   │   ├── globals.css                  # Tailwind v4 theme, tokens & hidden scrollbar engine
│   │   ├── layout.tsx                   # Root HTML & Plus Jakarta Sans typography
│   │   └── not-found.tsx                # Brand-consistent 404 handler
│   │
│   ├── components/                      # Shared Reusable UI Components
│   │   ├── marketing/                   # Navbar, Footer & CurvedBackground
│   │   └── shared/                      # NavigationProgressBar & ImageUpload
│   │
│   └── lib/                             # Core Data Layer, Utilities & Integrations
│       ├── app-tokens.ts                # Short-lived JWT & rotating refresh tokens
│       ├── auth-security.ts             # CSRF validation, origin checks & rate limits
│       ├── auth.ts                      # Better Auth MongoDB adapter instance
│       ├── authorization.ts             # RBAC role & relationship permission verifier
│       ├── chat-attachments.ts          # Cloudinary byte formatters & download builders
│       ├── cloudinary.ts                # Server-side Cloudinary SDK configuration
│       ├── config.ts                    # Strict Zod environment & threshold validator
│       ├── dal.ts                       # Request-scoped data access layer
│       ├── db.ts                        # Mongoose persistent connection
│       ├── matching.ts                  # Multi-attribute affinity matching algorithm
│       ├── models/                      # Modular Mongoose Schemas & Compounded Indices
│       │   ├── Analytics.ts             # Performance logs & audit trail
│       │   ├── Auth.ts                  # Refresh token family hashes & rate limits
│       │   ├── Communication.ts         # Bilateral chat messages & shared notes
│       │   ├── Feedback.ts              # Post-session ratings & reviews
│       │   ├── Institution.ts           # University tenant isolation
│       │   ├── MentorSession.ts         # Atomic 5-min slot reservation schemas
│       │   ├── Mentorship.ts            # Active pairings & throttled requests
│       │   ├── Tasks.ts                 # Action items & sub-tasks
│       │   ├── User.ts                  # Accounts, student dossiers & mentor profiles
│       │   └── Verification.ts          # Alumni credential audit queue
│       ├── pusher-client.ts             # Client-side Pusher WebSocket subscriber
│       ├── pusher-server.ts             # Server-side Pusher trigger client
│       ├── redis.ts                     # Upstash Redis client & distributed lock
│       ├── session-service.ts           # 5-minute atomic interval slot calculator
│       └── utils/                       # Analytics, matching, scheduling & task helpers
│
├── .env.example                         # Sanitized environment variable template
├── next.config.ts                       # Next.js 16 configuration & canonical 308 redirects
├── package.json                         # Project dependencies, scripts & metadata
├── pnpm-lock.yaml                       # Deterministic dependency lockfile
└── tsconfig.json                        # Strict TypeScript compiler options
```

---

## Module Documentation

### Module Breakdown (M1 – M10)
- **M1 — Alumni Verification & Profile:** Quarantined document review, graduation year validation, and professional credential display.
- **M2 — Capacity & Availability (Invariant 1):** Mentors declare active mentee limits; Upstash distributed lock and atomic updates prevent over-subscription.
- **M3 — Student Career Profile:** Academic dossiers with CGPA, target industries, target roles, skill gaps, and project portfolios.
- **M4 — Discovery & Explainable Matching:** Affinity scoring algorithm returning transparent recommendation rationales.
- **M5 — Requests & Throttled Acceptance:** Caps students at 5 active requests with a 14-day auto-expiry window.
- **M6 — Scheduling & Structured Sessions:** 5-minute atomic interval slot overlap prevention, dynamic minute durations (15–240 mins), and gated video URLs.
- **M7 — Goals, Action Items & Feedback:** Mutual milestone checklists awarding +20 reputation points upon verified completion.
- **M8 — Engagement Monitoring (Momentum):** Flags inactive pairings (no progress for 14+ days) and dispatches engagement nudges.
- **M9 — In-Platform Messaging:** Bilateral communication scoped to active mentorships via Pusher WebSockets and Cloudinary attachments.
- **M10 — Program Analytics & Audit:** Administrative reporting on match ratios, satisfaction metrics, and immutable audit logs.

### API Reference

<details>
<summary><strong>Click to expand the full REST API Reference Table</strong></summary>

| Method | Endpoint | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Create new student or alumni account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate via email & password |
| `POST` | `/api/v1/auth/send-otp` | Public | Dispatch email verification code via Resend |
| `POST` | `/api/v1/auth/login-otp` | Public | Authenticate using one-time password |
| `POST` | `/api/v1/auth/verify-otp` | Public | Verify passwordless sign-in token |
| `POST` | `/api/v1/auth/verify-totp` | Authenticated | Validate two-factor authenticator token |
| `POST` | `/api/v1/auth/refresh` | Refresh Token | Rotate refresh token family & issue access JWT |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke refresh token family & clear auth cookies |
| `GET` | `/api/v1/me` | Authenticated | Return user profile & issue double-submit CSRF cookie |
| `GET` | `/api/v1/mentors/discovery` | Student | Fetch scored alumni mentors matching student dossier |
| `POST` | `/api/v1/mentorships/request` | Student | Submit introduction request (throttled to 5 active) |
| `POST` | `/api/v1/mentorships/accept` | Mentor | Atomically accept mentee request under capacity lock |
| `GET` | `/api/v1/chat/download` | Active Pair | Stream sanitized attachment from Cloudinary |
| `POST` | `/api/pusher/auth` | Active Pair | Authorize private Pusher WebSocket chat channel |
| `POST` | `/api/sessions` | Mentor | Create 1-on-1 or cohort session with 5-min slot index |
| `POST` | `/api/sessions/[id]/cancel`| Mentor / Mentee | Cancel session & release atomic 5-min slots |

</details>

---

## Getting Started

### Prerequisites
Ensure the following tools and services are available before local setup:
- **Node.js:** `20.x` or higher (`node -v`)
- **Package Manager:** `pnpm` version `10.x` (`npm install -g pnpm`)
- **MongoDB:** Local instance running on port `27017` or a MongoDB Atlas cluster URI
- **Upstash Redis:** Free serverless Redis instance (for distributed locks and rate limits)
- **Cloudinary Account:** For avatar and chat attachment storage
- **Resend Account:** For sending verification OTP emails

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ayuush224/Alumini-Mentorship-and-Career-Network.git
   cd Alumini-Mentorship-and-Career-Network
   ```

2. **Install project dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and populate your credentials. Refer to the [Environment Variables](#environment-variables) section below for required keys.

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

5. **Open the platform:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Local Database Note
> **Standalone MongoDB Support:** Alma uses discrete 5-minute atomic indices (`slotIndices`) backed by unique compound indices for session overlap prevention, and single-document atomic updates (`$expr: { $lt: ["$activeMentees", "$maxMentees"] }`) for capacity enforcement. As a result, **no replica set is required** for local development. A standalone MongoDB instance (`mongodb://127.0.0.1:27017/alumni_network`) works immediately out of the box.

### Verify It Works
1. Navigate to `http://localhost:3000`. You should see the Alma marketing homepage with verified program statistics.
2. Visit `http://localhost:3000/register` and create a student account.
3. Upon registration, you are redirected to `/student/dashboard`. Verify that the dashboard metrics, quick actions, and navigation header render cleanly.

---

## Environment Variables

### Environment Variables Table

| Variable | Required | Exposed to Browser | Description | Example Placeholder |
|---|---|---|---|---|
| `MONGODB_URI` | **Yes** | No | MongoDB connection string | `mongodb://127.0.0.1:27017/alumni_network` |
| `MONGODB_DB` | No | No | Target MongoDB database name | `alumni_network` |
| `BETTER_AUTH_SECRET` | **Yes** | No | 32+ character key for JWT signing | `your_long_random_secret_here_min_32_chars` |
| `BETTER_AUTH_URL` | No | No | Base application URL | `http://localhost:3000` |
| `AUTH_TRUSTED_ORIGINS` | No | No | Comma-separated trusted CORS origins | `http://localhost:3000` |
| `DEFAULT_USER_ROLE` | No | No | Default role on registration | `student` |
| `MAX_MENTEES_PER_MENTOR` | **Yes** | No | Fatal threshold: max mentees per mentor | `5` |
| `MAX_MENTORS_PER_STUDENT` | **Yes** | No | Fatal threshold: max mentors per student | `5` |
| `MAX_PENDING_REQUESTS_PER_STUDENT` | **Yes** | No | Fatal threshold: max outgoing requests | `5` |
| `RESEND_API_KEY` | **Yes** | No | Resend email API key for OTPs | `re_your_resend_api_key` |
| `RESEND_FROM_EMAIL` | No | No | Verified sender email address | `onboarding@resend.dev` |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | No | Cloudinary cloud identifier | `your_cloudinary_cloud_name` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | **Yes** | **Yes** | Cloudinary cloud identifier for client | `your_cloudinary_cloud_name` |
| `CLOUDINARY_API_KEY` | **Yes** | No | Cloudinary server API key | `your_cloudinary_api_key` |
| `CLOUDINARY_API_SECRET` | **Yes** | No | Cloudinary server API secret | `your_cloudinary_api_secret` |
| `CLOUDINARY_URL` | No | No | Full Cloudinary connection URI | `cloudinary://key:secret@cloud_name` |
| `NEXT_PUBLIC_CLOUDINARY_PRESET` | No | **Yes** | Unsigned upload preset for avatars | `alma_avatars` |
| `NEXT_PUBLIC_CLOUDINARY_BANNER_PRESET`| No | **Yes** | Upload preset for profile banners | `alma_banners` |
| `UPSTASH_REDIS_REST_URL` | **Yes** | No | Upstash serverless REST endpoint | `https://your-instance.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | **Yes** | No | Upstash serverless REST token | `your_upstash_rest_token` |
| `REDIS_OTP_TTL_SECONDS` | No | No | Expiration for login OTPs (seconds) | `600` |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No | No | Rate limit observation window | `120` |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | No | No | Max attempts before rate limit block | `5` |
| `REDIS_MENTORS_CACHE_TTL_SECONDS` | No | No | Mentor directory cache TTL | `600` |
| `REDIS_OFFICER_DASHBOARD_CACHE_TTL_SECONDS` | No | No | Officer dashboard cache TTL | `180` |
| `REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS` | No | No | Student analytics cache TTL | `900` |
| `REDIS_MENTOR_LOCK_TTL_SECONDS` | No | No | Mentor distributed lock timeout | `2` |
| `REDIS_MENTOR_LOCK_RETRY_COUNT` | No | No | Mentor lock acquisition retries | `3` |
| `REDIS_MENTOR_LOCK_RETRY_DELAY_MS` | No | No | Delay between lock retry attempts (ms) | `150` |
| `PUSHER_APP_ID` | **Yes** | No | Pusher application ID | `your_pusher_app_id` |
| `PUSHER_KEY` | **Yes** | No | Pusher server API key | `your_pusher_key` |
| `NEXT_PUBLIC_PUSHER_KEY` | **Yes** | **Yes** | Pusher client API key | `your_pusher_key` |
| `PUSHER_SECRET` | **Yes** | No | Pusher application secret | `your_pusher_secret` |
| `PUSHER_CLUSTER` | No | No | Pusher server cluster identifier | `mt1` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | No | **Yes** | Pusher client cluster identifier | `mt1` |

### Credential Acquisition Guide
- **Resend:** Create an account at [resend.com](https://resend.com), generate an API key in **API Keys**, and copy it to `RESEND_API_KEY`.
- **Cloudinary:** Sign up at [cloudinary.com](https://cloudinary.com). From your Dashboard, copy the Cloud Name, API Key, and API Secret. In **Settings $\rightarrow$ Upload**, create an unsigned upload preset named `alma_avatars`.
- **Upstash Redis:** Sign up at [upstash.com](https://upstash.com), create a regional serverless Redis database, and copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the **REST API** section.
- **Pusher:** Create an app at [pusher.com](https://pusher.com) with **Channels**. Copy the App ID, Key, Secret, and Cluster from **App Keys**.

---

## Third-Party Setup Guide

### Cloudinary Setup
1. In the Cloudinary Console, navigate to **Settings $\rightarrow$ Security**.
2. Ensure **Allow delivery of PDF and ZIP files** is checked to allow students and mentors to download resume attachments directly from chat.
3. In **Settings $\rightarrow$ Upload**, verify that unsigned uploads are enabled for the preset specified in `NEXT_PUBLIC_CLOUDINARY_PRESET` (`alma_avatars`).

### Upstash Redis Setup
1. Create a serverless database on Upstash.
2. Upstash powers the distributed lock (`acquireMentorLock`) that guards against concurrent mentor over-subscription. No local Redis daemon is required.

### Pusher WebSockets Setup
1. Under **App Settings**, enable **Client Events** if required.
2. In the Next.js app, client subscriptions connect via `/api/pusher/auth`, which ensures only authorized mentorship partners can join private relationship channels.

### Resend Email Setup
1. In development, use `onboarding@resend.dev` as `RESEND_FROM_EMAIL`. It delivers OTPs to the account holder's registered email address without domain verification.
2. For production, add and verify your university or organization domain in Resend DNS settings.

---

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts the Next.js development server with Turbopack at `http://localhost:3000` |
| `pnpm build` | Compiles the production build, runs typechecks, and statically optimizes pages |
| `pnpm start` | Runs the compiled Next.js production server |
| `pnpm lint` | Executes ESLint across all TypeScript source files and pages |

### Production Run Sequence
For production environments (e.g. self-hosted Node.js servers, Docker, or Vercel), execute the lifecycle commands in this exact order:

```bash
# 1. Install production dependencies deterministically
pnpm install --frozen-lockfile

# 2. Compile optimized production bundle
pnpm build

# 3. Start high-performance production server
pnpm start
```

---

## Testing

> **Automated Tests Status:** *No automated tests yet.*

Code quality and interface contracts are enforced through strict continuous verification:
- **Type Checking:** Run `npx tsc --noEmit --incremental false` to validate TypeScript strict mode across all modules.
- **Linting:** Run `pnpm lint` to check for Next.js and React rule adherence.

---

## Deployment

### Vercel Deployment (Recommended)
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Framework Preset to **Next.js**.
4. In **Environment Variables**, paste all production keys from your `.env.local` file.
5. Deploy. Vercel automatically runs `pnpm build` and provisions edge network caching.

### Self-Hosted Node.js / Docker
1. Ensure Node.js `20+` and `pnpm` are installed on the host.
2. Supply production environment variables.
3. Execute the [Production Run Sequence](#production-run-sequence).

---

## Troubleshooting

| Problem | Cause | Verified Fix |
|---|---|---|
| `[CONFIG FATAL ERROR] Invalid or missing system thresholds` | `MAX_MENTEES_PER_MENTOR`, `MAX_MENTORS_PER_STUDENT`, or `MAX_PENDING_REQUESTS_PER_STUDENT` is missing in `.env.local` | Ensure all three threshold variables are set to positive integers (e.g. `5`) in `.env.local`. |
| `MongooseServerSelectionError: connect ECONNREFUSED` | Local MongoDB daemon is not running on port `27017` | Start MongoDB locally via `mongod` or update `MONGODB_URI` to a MongoDB Atlas cluster URI. |
| `Error: UPSTASH_REDIS_REST_URL is missing` | Upstash Redis credentials not configured | Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from your Upstash console. |
| Cloudinary attachment preview fails / returns 400 | Cloudinary PDF delivery security restriction | In Cloudinary **Settings $\rightarrow$ Security**, check **Allow delivery of PDF and ZIP files**. |
| `Forbidden: CSRF token mismatch` | Mutating request sent without valid `X-CSRF-Token` header | Ensure requests originate from trusted origins defined in `AUTH_TRUSTED_ORIGINS` and include the CSRF token. |

---

## Roadmap

- [ ] **In-Platform WebRTC Video:** Embedded peer-to-peer video rooms with shared agenda sidebars.
- [ ] **Automated Calendar Exports:** One-click `.ics` and Google Calendar sync for scheduled mentorship sessions.
- [ ] **AI-Assisted Milestone Scaffolding:** Automated suggested action checklists based on target job roles and skill gaps.

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/structured-session-agenda`).
3. Commit your changes following clean, conventional commit messages without `fix:` or `feat:` prefixes.
4. Verify type safety (`npx tsc --noEmit --incremental false`) and code style (`pnpm lint`).
5. Push to the branch (`git push origin feature/structured-session-agenda`).
6. Open a Pull Request.

---

## License and Copyright

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.

```text
Copyright (c) 2026 Ayush22. All rights reserved.
```

### Acknowledgements
- [Next.js](https://nextjs.org/) — The React Framework for the Web
- [Better Auth](https://better-auth.com/) — Multi-tenant authentication engine
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Lucide Icons](https://lucide.dev/) — Open-source icon library
- [Cloudinary](https://cloudinary.com/) — Media delivery and transformation infrastructure
- [Pusher](https://pusher.com/) — Hosted WebSocket infrastructure
- [Upstash](https://upstash.com/) — Serverless Redis for distributed coordination
- [Resend](https://resend.com/) — Developer-first transactional email

---

## Contact / Support

- **Author / Lead Maintainer:** [Ayush22](https://github.com/ayuush224)
- **Email:** [ayushkumar05827@gmail.com](mailto:ayushkumar05827@gmail.com)
- **Repository:** [https://github.com/ayuush224/Alumini-Mentorship-and-Career-Network](https://github.com/ayuush224/Alumini-Mentorship-and-Career-Network)
