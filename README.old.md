# Alma — Verified Alumni Mentorship & Career Network

> Turn alumni goodwill into momentum with structured, privacy-shielded, and capacity-guaranteed mentorship.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3%2B-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2B-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Alma is an institution-backed mentorship platform that connects university students with verified alumni mentors. It transitions informal, chaotic alumni outreach into a structured, sustainable, privacy-respecting, and measurable program. Built on Next.js 16 (App Router), React 19, MongoDB, Pusher WebSockets, and Cloudinary, Alma protects mentors from burnout via hard capacity limits while providing mentees with transparent recommendations, dynamic session scheduling, real-time messaging, and actionable career milestone tracking.

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
- [Database Schema](#database-schema)
  - [Collections Overview](#collections-overview)
  - [Core Identity & Profiles](#core-identity--profiles)
  - [Mentorship & Capacity Management](#mentorship--capacity-management)
  - [Scheduling & Concurrency Guard](#scheduling--concurrency-guard)
  - [Tasks & Career Milestones](#tasks--career-milestones)
  - [Communication & Shared Resources](#communication--shared-resources)
  - [Authentication & Security](#authentication--security)
  - [Verification & Institutional Governance](#verification--institutional-governance)
  - [Analytics & Auditing](#analytics--auditing)
  - [Relationships Summary](#relationships-summary)
  - [Enforced Data Rules](#enforced-data-rules)
- [Workflows](#workflows)
  - [1. Authentication & Security Workflow](#1-authentication--security-workflow)
  - [2. Mentorship Discovery & Connection Workflow](#2-mentorship-discovery--connection-workflow)
  - [3. Dynamic Session Scheduling & Overlap Prevention](#3-dynamic-session-scheduling--overlap-prevention)
  - [4. Real-Time Chat & Cloudinary Attachments](#4-real-time-chat--cloudinary-attachments)
  - [5. Mentor-Scoped Sub-Tasks & Gamified Reputation](#5-mentor-scoped-sub-tasks--gamified-reputation)
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
  - [Credential Acquisition Guide](#credential-acquisition-guide)
- [Third-Party Setup Guide](#third-party-setup-guide)
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
- **Comprehensive Career Dossier:** Maintain academic profiles with major, expected graduation year, CGPA, target industries, job roles, validated skills, and embedded project portfolios featuring live demo and GitHub repository links.
- **Explainable Mentor Discovery:** Search verified alumni using an affinity matching engine that returns relevance percentages and clear rationale strings (e.g. *"Strong fit for your portfolio goal"*).
- **Public Mentor Profile Inspection:** View rich alumni dossiers detailing career milestones, mentorship focus areas, past roles, publications, and verified alma mater details prior to outreach.
- **Throttled Mentorship Requests:** Submit structured introduction requests with custom notes, restricted to a maximum of 5 concurrent pending requests with a 14-day auto-expiry window.
- **Dynamic Session Attendance:** Participate in 1-on-1 consultations or group cohort workshops with visible custom duration (e.g. 45 mins, 90 mins) and automated calendar dates.
- **Meeting Link Privacy Gating:** Video room URLs are redacted until 15 minutes before session start time to prevent out-of-band intrusion.
- **Sub-Tasks & Gamified Reputation (+20 Pts):** Add personal action items and complete mentor-assigned tasks to earn verified reputation points tracked on the student profile.
- **Direct Real-Time Chat:** Message active mentors with instant delivery via Pusher WebSockets and share rich file attachments (PDFs, resumes, images, code files up to 10MB).

### Alumni Features (Mentors)
- **Credential Verification:** Display degree and graduation verification status (`pending`, `verified`, `rejected`) backed by institutional administrator review.
- **Capacity Guard (Invariant 1):** Declare strict active mentee limits (`maxMentees`). Acceptance of incoming requests uses atomic conditional database operations to guarantee the declared limit is never exceeded.
- **Contact Shielding (Invariant 2):** Personal email addresses, phone numbers, and physical coordinates are never exposed to students in API responses or user interfaces.
- **Dynamic 1-on-1 & Cohort Scheduling:** Schedule sessions with arbitrary minute durations (15 to 240 mins) for individual mentees or broadcast group sessions to all active mentees simultaneously (`isAllMentees: true`).
- **Race-Condition-Free Overlap Guard:** Booking intervals are sliced into 5-minute atomic slots backed by a unique compound database index, preventing double-booking without requiring distributed transactions.
- **Task Assignment & Career Dossier Review:** Inspect mentee career profiles before or during mentorship and assign targeted action items directly to their dashboard.
- **Shared Technical Notes:** Publish technical guidance, code review guidelines, and curated resources directly into the mentee workspace.

### Institutional Admin & Officer Features
- **Alumni Verification Queue:** Review and approve pending alumni credentials with graduation year and official degree documentation.
- **Capacity Watchdog:** Monitor live mentor capacity utilization across departments, preventing over-allocation and identifying mentors ready for more mentees.
- **Relationship Momentum Watchdog:** Flag inactive mentorship relationships (no meaningful contact for 14+ days) and trigger engagement nudges.
- **Program Health Analytics:** Track platform-wide match conversion rates, average response intervals, and session completion metrics.
- **Immutable Audit Trail:** Append-only activity logging for administrative actions, verification decisions, and tenant configuration updates.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.3+ (App Router) | Full-stack architecture with React Server Components, Server Actions, and Route Handlers |
| **Language** | TypeScript 5 (Strict) | Static typing across all models, payloads, and application services |
| **UI Library** | React 19 + Lucide Icons | Declarative user interfaces with modern hooks and icon primitives |
| **Styling** | Tailwind CSS v4 | Typography-first design system using modern CSS theme tokens |
| **Database** | MongoDB 7+ (Mongoose 9+) | Primary authoritative document storage, TTL indexing, and compound uniqueness |
| **Auth & Sessions** | Better Auth 1.7+ & jose | Password hashing (bcryptjs), email OTPs, short-lived JWTs (15 min), and rotating refresh tokens (30 days) |
| **Real-Time WebSockets** | Pusher Channels (`pusher` & `pusher-js`) | Sub-millisecond bilateral chat dispatch on private channels with HTTP polling fallback |
| **Media & File Storage** | Cloudinary CDN (`next-cloudinary`) | Cloud storage for profile avatars, banners, and chat file attachments up to 10MB |
| **Email Delivery** | Resend | Transactional delivery of email verification codes and password reset OTPs |
| **Data Visualization** | Recharts 3.x | Responsive charts for institutional program analytics and capacity gauges |
| **Validation** | Zod 4.x | Strict schema parsing (`.strict()`) for incoming API request payloads |

---

## Architecture

Alma is built as a **modular monolith** on the Next.js App Router. Presentation logic is separated into React Server Components and interactive Client Components, while mutating business logic is handled via type-safe Server Actions and versioned Route Handlers (`/api/v1/*`).

All domain queries and mutations are isolated by `institutionId` for multi-tenancy. Security controls (double-submit CSRF cookie verification, origin checks, and MongoDB TTL rate limits) run before application services execute.

### High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients["Browser Clients"]
        SC["Student Portal (React 19)"]
        MC["Mentor Portal (React 19)"]
        AC["Officer / Admin Portal (React 19)"]
    end

    subgraph AppServer["Next.js 16 Application Runtime"]
        AR["App Router & Server Components"]
        SA["Server Actions (Chat, Tasks, Mentorship, Officer)"]
        RH["Route Handlers (/api/v1/*, /api/*)"]
        SEC["Auth & CSRF Security Boundary"]
        SS["Session Overlap Engine (5-Min Slots)"]
    end

    subgraph Database["MongoDB 7+ Database"]
        U["users & studentprofiles"]
        AP["alumniprofiles & mentorcapacities"]
        MS["mentorsessions & mentorsessionslots"]
        ACT["actions (Sub-Tasks) & goals"]
        MSG["messages & sharednotes"]
        VR["verification_requests & institutions"]
        TTL["authrefreshtokens & authratelimits"]
    end

    subgraph ThirdParty["External Services"]
        CLD["Cloudinary CDN (Files & Avatars)"]
        PSH["Pusher Channels (WebSockets)"]
        RSN["Resend (Email OTPs)"]
    end

    SC --> AR
    MC --> AR
    AC --> AR
    AR --> SA
    AR --> RH
    SA --> SEC
    RH --> SEC
    SEC --> SS
    SEC --> Database
    SA --> PSH
    SA --> CLD
    RH --> RSN
    PSH -.-> Clients
```

### Data Model & Entity Relationships

```mermaid
erDiagram
    User ||--o| StudentProfile : "has profile"
    User ||--o| MentorProfile : "has profile"
    User ||--o| MentorCapacity : "manages capacity"
    User ||--o{ MentorshipRequest : "sends or receives"
    User ||--o{ Mentorship : "participates in"
    Mentorship ||--o{ Session : "schedules"
    Mentorship ||--o{ Message : "contains"
    Mentorship ||--o{ Action : "tracks tasks"
    User ||--o{ MentorSessionSlot : "reserves slots"
    User ||--o{ VerificationRequest : "submits"

    User {
        ObjectId _id PK
        string email
        string role
        string institutionId
        Date createdAt
    }

    StudentProfile {
        ObjectId _id PK
        ObjectId userId FK
        string major
        number cgpa
        number totalPoints
        Array projects
        Array experience
    }

    MentorCapacity {
        ObjectId _id PK
        ObjectId mentorId FK
        number maxMentees
        number activeMentees
    }

    MentorshipRequest {
        ObjectId _id PK
        ObjectId studentId FK
        ObjectId mentorId FK
        string status
        Date expiresAt
    }

    Mentorship {
        ObjectId _id PK
        ObjectId studentId FK
        ObjectId mentorId FK
        string status
        Date startDate
    }

    MentorSessionSlot {
        ObjectId _id PK
        ObjectId mentorId FK
        Date slot
        ObjectId sessionId FK
    }

    Message {
        ObjectId _id PK
        ObjectId mentorshipId FK
        ObjectId senderId FK
        string content
        string fileUrl
        Date createdAt
    }

    Action {
        ObjectId _id PK
        ObjectId studentId FK
        ObjectId mentorId FK
        string title
        boolean completed
        boolean pointsAwarded
        Date dueDate
    }
```

---

## Database Schema

Alma runs on **MongoDB 7+** modeled through **Mongoose 9+**. The schema encompasses 29 collections that support identity, credential verification, capacity controls, dynamic scheduling, action items, scoped messaging, and governance analytics.

### Collections Overview

| Collection | Model | Source File | Purpose | Related Collections |
|---|---|---|---|---|
| `users` | `User` | `src/lib/models/User.ts` | Primary credentials, tenant mapping, and roles | `StudentProfile`, `MentorProfile`, `MentorCapacity` |
| `studentprofiles` | `StudentProfile` | `src/lib/models/User.ts` | Student academic dossiers, portfolios, and reputation points | `User` |
| `alumniprofiles` | `MentorProfile` / `AlumniProfile` | `src/lib/models/User.ts` | Alumni professional profiles, expertise tags, and career histories | `User`, `MentorCapacity` |
| `mentorshiprequests` | `MentorshipRequest` | `src/lib/models/Mentorship.ts` | Intro requests with status and custom messages | `User`, `Mentorship` |
| `mentorships` | `Mentorship` | `src/lib/models/Mentorship.ts` | Authoritative active student-mentor relationship pairings | `User`, `Session`, `Message`, `Action` |
| `sessions` | `Session` | `src/lib/models/Mentorship.ts` | Mentorship meetings, agendas, and durations | `User`, `SharedNote` |
| `mentorcapacities` | `MentorCapacity` | `src/lib/models/Mentorship.ts` | Enforces declared mentee limits (Invariant 1) | `User` |
| `availability_windows` | `AvailabilityWindow` | `src/lib/models/Mentorship.ts` | Calendar availability recurring windows | `User` |
| `mentorsessions` | `MentorSession` | `src/lib/models/MentorSession.ts` | High-concurrency session records with meeting URLs | `User`, `MentorSessionSlot` |
| `mentorsessionslots` | `MentorSessionSlot` | `src/lib/models/MentorSession.ts` | 5-minute discrete time buckets for overlap prevention | `User`, `MentorSession` |
| `goals` | `Goal` | `src/lib/models/Tasks.ts` | Student broad career objectives and deadlines | `User`, `Action` |
| `actions` | `Action` | `src/lib/models/Tasks.ts` | Sub-tasks and action items with +20 reputation tracking | `User`, `Mentorship`, `Goal` |
| `career_goals` | `CareerGoal` | `src/lib/models/Tasks.ts` | Institutional career goal tracking milestones | `User`, `StudentProfile` |
| `messages` | `Message` | `src/lib/models/Communication.ts` | Bilateral chat messages with Cloudinary file attachments | `Mentorship`, `User` |
| `sharednotes` | `SharedNote` | `src/lib/models/Communication.ts` | Technical guidance and resource notes published by mentors | `User`, `Session` |
| `authrefreshtokens` | `AuthRefreshToken` | `src/lib/models/Auth.ts` | Rotating refresh tokens with token family replay protection | `User` |
| `authratelimits` | `AuthRateLimit` | `src/lib/models/Auth.ts` | MongoDB TTL rate limiting buckets for API routes | None |
| `authemailotps` | `AuthEmailOtp` | `src/lib/models/Auth.ts` | 6-digit email verification and reset OTP codes with TTL | None |
| `verification_requests` | `VerificationRequest` | `src/lib/models/Verification.ts` | Alumni degree verification queue for institutional staff | `User`, `VerificationDocument` |
| `verification_documents` | `VerificationDocument` | `src/lib/models/Verification.ts` | Quarantined degree and diploma evidence documents | `User`, `VerificationRequest` |
| `expertise_tags` | `ExpertiseTag` | `src/lib/models/Verification.ts` | Controlled institutional taxonomy for skills and topics | None |
| `institutions` | `Institution` | `src/lib/models/Institution.ts` | Multi-tenant university partitions and governance settings | `User` |
| `feedback` | `Feedback` | `src/lib/models/Feedback.ts` | Bidirectional post-session ratings and qualitative reviews | `Mentorship`, `Session`, `User` |
| `match_scores` | `MatchScore` | `src/lib/models/Analytics.ts` | Precalculated recommendation snapshots and affinity scores | `User`, `StudentProfile` |
| `engagement_snapshots` | `EngagementSnapshot` | `src/lib/models/Analytics.ts` | Relationship health metrics, momentum, and inactivity flags | `Mentorship` |
| `placement_outcomes` | `PlacementOutcome` | `src/lib/models/Analytics.ts` | Accredited post-graduation employment records | `User`, `StudentProfile` |
| `programme_configurations`| `ProgrammeConfiguration`| `src/lib/models/Analytics.ts` | Tenant-wide governance parameters and throttling rules | `Institution` |
| `audit_entries` | `AuditEntry` | `src/lib/models/Analytics.ts` | Immutable append-only audit log for administrative compliance| `User` |
| `outbox_events` | `OutboxEvent` | `src/lib/models/Analytics.ts` | Guaranteed asynchronous event delivery buffer | None |

---

### Core Identity & Profiles

#### `User` (Collection: `users`)
Stores core credentials, assigned role, multi-tenant scoping, and embedded profile caches. Managed in `src/lib/models/User.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `email` | `String` | Yes | Unique, lowercase, trim | User email for authentication and notification delivery |
| `password` | `String` | Yes | Bcrypt hash | Hashed password compared at login in the auth handlers |
| `name` | `String` | No | None | User's full name displayed across student and mentor dashboards |
| `designation` | `String` | No | `"Director of Alumni Relations..."` | Professional or administrative title |
| `avatarUrl` | `String` | No | None | Cloudinary URL for user profile picture |
| `bannerUrl` | `String` | No | None | Cloudinary URL for user profile header banner |
| `role` | `String` | Yes | Enum: `student`, `alumni`, `administrator`, `alumni_relations_officer`, `placement_officer`, `alumni_mentor` (Default: `student`) | Access control role determining portal routing and permissions |
| `institutionId` | `String` | No | None | Multi-tenant tenant identifier scoping all records |
| `twoFactorEnabled` | `Boolean` | No | `false` | Indicates whether TOTP multi-factor authentication is active |
| `twoFactorSecret` | `String` | No | None | Encrypted or plain secret used to generate TOTP challenges |
| `studentProfile` | `Object` | No | Embedded `StudentProfileSchema` | Embedded cache of academic and portfolio details for students |
| `mentorProfile` | `Object` | No | Embedded `MentorProfileSchema` | Embedded cache of professional and mentorship details for alumni |
| `isDeleted` | `Boolean` | No | `false`, Indexed | Soft-deletion flag automatically excluded via query middleware |
| `createdAt` | `Date` | Yes | Auto-generated | Timestamp of account registration |
| `updatedAt` | `Date` | Yes | Auto-generated | Timestamp of last profile update |

- **Indexes:** `{ email: 1 }` (unique), `{ isDeleted: 1 }`.
- **Pre-hooks:** `find`, `findOne`, `countDocuments` exclude `{ isDeleted: true }`.
- **Relationships:** One-to-One with `StudentProfile` (`studentprofiles`), One-to-One with `MentorProfile` (`alumniprofiles`), One-to-One with `MentorCapacity` (`mentorcapacities`).
</details>

#### `StudentProfile` (Collection: `studentprofiles`)
Captures student academic information, portfolio projects, career targets, and reputation points. Managed in `src/lib/models/User.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `userId` | `ObjectId (ref: User)` | Yes | Unique, Indexed | Reference to the parent student user account |
| `major` | `String` | No | None | Field of study (e.g. Computer Science) |
| `graduationYear` | `Number` | No | None | Expected academic completion year |
| `cgpa` | `Number` | No | Min: 0, Max: 10 | Academic grade point average |
| `totalPoints` | `Number` | No | `0` | Gamified reputation points earned via completed mentor tasks (+20 pts each) |
| `skills` | `Array of String` | No | `[]` | Validated technical and domain competencies |
| `skillsToDevelop` | `Array of String` | No | `[]` | Target skills student seeks mentorship on |
| `targetIndustries` | `Array of String` | No | `[]` | Industries of interest used by matching engine |
| `projects` | `Array of Subdocument` | No | `[]` | Portfolio projects featuring title, description, liveLink, githubLink, and techStack |
| `experience` | `Array of Subdocument` | No | `[]` | Internship and work experience history |
| `socialLinks` | `Array of Subdocument` | No | `[]` | Platform links (LinkedIn, GitHub, Twitter) |
| `codingProfiles` | `Array of Subdocument` | No | `[]` | Syncable competitive programming profiles (LeetCode, Codeforces) |
| `createdAt` | `Date` | Yes | Auto-generated | Record creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Record update timestamp |

- **Indexes:** `{ userId: 1 }` (unique).
- **Relationships:** Belongs to `User` via `userId`.
</details>

#### `MentorProfile` / `AlumniProfile` (Collection: `alumniprofiles`)
Captures alumni professional credentials, industry, company, expertise tags, and verified mentorship areas. Managed in `src/lib/models/User.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `userId` | `ObjectId (ref: User)` | Yes | Unique, Indexed | Reference to the parent alumnus user account |
| `company` | `String` | No | `"Independent"` | Current employer or organization |
| `jobTitle` | `String` | No | `"Mentor"` | Current professional role or designation |
| `industry` | `String` | No | `"Technology"` | Professional sector used by recommendation engine |
| `headline` | `String` | No | None | One-line professional summary |
| `bio` | `String` | No | None | Detailed biography and mentorship philosophy |
| `availability` | `String` | Yes | Enum: `open`, `waitlist` (Default: `open`) | General availability status indicator |
| `expertiseTags` | `Array of String` | No | `[]` | Controlled tags used to calculate student affinity scores |
| `skills` | `Array of Subdocument` | No | `[]` | Endorsed skills with `name` and `endorsements` count |
| `mentorshipAreas` | `Array of Subdocument` | No | `[]` | Topic areas offered (e.g. System Design, Career Pivots) |
| `experience` | `Array of Subdocument` | No | `[]` | Career journey history with role, company, dates, and bullets |
| `featuredWork` | `Array of Subdocument` | No | `[]` | Key open source projects, publications, or articles |
| `totalMentees` | `Number` | No | `0` | Lifetime count of mentees guided |
| `sessionsCompleted` | `Number` | No | `0` | Total verified mentorship sessions conducted |
| `createdAt` | `Date` | Yes | Auto-generated | Record creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Record update timestamp |

- **Indexes:** `{ userId: 1 }` (unique).
- **Relationships:** Belongs to `User` via `userId`.
</details>

---

### Mentorship & Capacity Management

#### `MentorCapacity` (Collection: `mentorcapacities`)
Enforces **Invariant 1** ensuring declared mentee limits are never exceeded. Managed in `src/lib/models/Mentorship.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `mentorId` | `ObjectId (ref: User)` | Yes | Unique, Indexed | Reference to the alumnus mentor |
| `maxMentees` | `Number` | Yes | Min: 0 | Declared hard limit of active mentees allowed simultaneously |
| `activeMentees` | `Number` | No | `0`, Min: 0 | Current number of active mentees assigned to this mentor |
| `acceptingRequests` | `Boolean` | No | `true` | Toggle indicating if mentor accepts new introduction requests |
| `status` | `String` | No | Enum: `available`, `near_capacity`, `at_capacity`, `paused` | Computed operational capacity state |
| `createdAt` | `Date` | Yes | Auto-generated | Record creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Record update timestamp |

- **Indexes:** `{ mentorId: 1 }` (unique).
- **Relationships:** Belongs to `User` via `mentorId`.
</details>

#### `MentorshipRequest` (Collection: `mentorshiprequests`)
Manages introduction requests sent by students to alumni. Managed in `src/lib/models/Mentorship.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `studentId` | `ObjectId (ref: User)` | Yes | Indexed | Student submitting the introduction request |
| `mentorId` | `ObjectId (ref: User)` | Yes | Indexed | Alumnus mentor targeted for guidance |
| `status` | `String` | Yes | Enum: `pending`, `accepted`, `declined` (Default: `pending`) | Current request state |
| `message` | `String` | No | Trim | Student's introductory note outlining goals and questions |
| `createdAt` | `Date` | Yes | Auto-generated | Submission timestamp (expires after 14 days) |
| `updatedAt` | `Date` | Yes | Auto-generated | Last update timestamp |

- **Indexes:** `{ studentId: 1, mentorId: 1, status: 1 }`.
- **Relationships:** References `User` as `studentId` and `mentorId`.
</details>

#### `Mentorship` (Collection: `mentorships`)
Represents an active, verified mentorship relationship pairing. Managed in `src/lib/models/Mentorship.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `studentId` | `ObjectId (ref: User)` | Yes | Indexed | Mentee user in the active pairing |
| `mentorId` | `ObjectId (ref: User)` | Yes | Indexed | Mentor user in the active pairing |
| `startDate` | `Date` | Yes | Default: `Date.now` | Inception timestamp of the active relationship |
| `status` | `String` | Yes | Enum: `active`, `completed`, `terminated` (Default: `active`) | Relationship lifecycle status |
| `isDeleted` | `Boolean` | No | `false`, Indexed | Soft-deletion flag excluded by query middleware |
| `createdAt` | `Date` | Yes | Auto-generated | Record creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Record update timestamp |

- **Indexes:** `{ studentId: 1, mentorId: 1, status: 1 }` (unique pairing guard).
- **Pre-hooks:** Excludes soft-deleted documents automatically.
- **Relationships:** References `User` (`studentId`, `mentorId`). Has many `Session`, `Message`, and `Action`.
</details>

---

### Scheduling & Concurrency Guard

#### `MentorSession` (Collection: `mentorsessions`)
Primary meeting record supporting arbitrary durations and group cohort sessions. Managed in `src/lib/models/MentorSession.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `mentorId` | `ObjectId (ref: User)` | Yes | Indexed | Alumnus mentor hosting the meeting |
| `menteeIds` | `Array of ObjectId (ref: User)`| Yes | Non-empty | Mentees included in the session (one or many) |
| `topic` | `String` | No | Max: 120 chars | Session agenda or discussion topic |
| `startTime` | `Date` | Yes | None | Exact meeting start timestamp |
| `endTime` | `Date` | Yes | None | Exact meeting conclusion timestamp |
| `durationMinutes`| `Number` | Yes | Min: 15, Max: 240 | Duration in minutes (e.g. 45, 90) |
| `meetingLink` | `String` | Yes | Trim | Video meeting room URL (privacy-gated for mentees) |
| `status` | `String` | Yes | Enum: `scheduled`, `cancelled`, `completed` (Default: `scheduled`) | Lifecycle status |
| `requestId` | `String` | No | Sparse, Unique per mentor | Idempotency token preventing duplicate scheduling |
| `createdAt` | `Date` | Yes | Auto-generated | Booking creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Booking update timestamp |

- **Indexes:** `{ mentorId: 1, status: 1, startTime: 1, endTime: 1 }`, `{ menteeIds: 1, startTime: 1 }`, `{ mentorId: 1, requestId: 1 }` (unique, sparse).
- **Relationships:** References `User` as `mentorId` and `menteeIds`.
</details>

#### `MentorSessionSlot` (Collection: `mentorsessionslots`)
Discrete 5-minute atomic time buckets enforcing zero session overlap without distributed transactions. Managed in `src/lib/models/MentorSession.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `mentorId` | `ObjectId (ref: User)` | Yes | Indexed | Mentor whose calendar slot is reserved |
| `slot` | `Date` | Yes | 5-minute boundary | Exact timestamp marking the 5-minute slice |
| `sessionId` | `ObjectId (ref: MentorSession)`| Yes | Indexed | Associated session holding the reservation |
| `createdAt` | `Date` | Yes | Auto-generated | Timestamp when slot was reserved |

- **Indexes:** `{ mentorId: 1, slot: 1 }` (**Unique compound index: guarantees zero double-booking**).
- **Relationships:** References `User` (`mentorId`) and `MentorSession` (`sessionId`).
</details>

---

### Tasks & Career Milestones

#### `Action` (Collection: `actions`)
Sub-tasks and action items assigned by mentors or created by students. Completing mentor-assigned tasks awards +20 reputation points. Managed in `src/lib/models/Tasks.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `title` | `String` | Yes | Trim | Action item description |
| `description` | `String` | No | Trim | Detailed instructions or links |
| `dueDate` | `Date` | Yes | None | Target deadline for task completion |
| `completed` | `Boolean` | No | `false` | Completion status flag |
| `completedAt` | `Date` | No | None | Timestamp when item was marked complete |
| `studentId` | `ObjectId (ref: User)` | No | Indexed | Mentee responsible for the action item |
| `mentorId` | `ObjectId (ref: User)` | No | Indexed | Mentor who assigned or oversees the task |
| `goalId` | `ObjectId (ref: Goal)` | No | Indexed | Optional link to parent broad goal |
| `mentorshipId`| `ObjectId (ref: Mentorship)`| No | Indexed | Active relationship scope isolating the task |
| `addedBy` | `String` | Yes | Enum: `student`, `mentor` | Author identity determining permissions |
| `status` | `String` | No | Enum: `active`, `archived` (Default: `active`) | Task operational state |
| `pointsAwarded`| `Boolean` | No | `false` | Idempotency guard ensuring +20 reputation is granted once |
| `isDeleted` | `Boolean` | No | `false`, Indexed | Soft-deletion flag |
| `createdAt` | `Date` | Yes | Auto-generated | Task creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Task update timestamp |

- **Indexes:** `{ studentId: 1, completedAt: -1 }`, `{ mentorId: 1, dueDate: 1 }`.
- **Pre-hooks:** Automatically sets `completedAt` when `completed` transitions to `true`.
- **Relationships:** References `User` (`studentId`, `mentorId`), `Mentorship` (`mentorshipId`), and `Goal` (`goalId`).
</details>

---

### Communication & Shared Resources

#### `Message` (Collection: `messages`)
Real-time bilateral chat messages scoped strictly to active mentorship participants. Managed in `src/lib/models/Communication.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `mentorshipId`| `ObjectId (ref: Mentorship)`| Yes | Indexed | Scoped mentorship room identifier |
| `senderId` | `ObjectId (ref: User)` | Yes | Indexed | User who dispatched the message |
| `senderRole` | `String` | Yes | Enum: `student`, `mentor` | Role of sender at time of dispatch |
| `content` | `String` | No | Max: 4000 chars | Text content of the chat message |
| `fileUrl` | `String` | No | None | Permanent Cloudinary CDN URL for attachment |
| `fileName` | `String` | No | None | Original uploaded file name |
| `fileType` | `String` | No | None | Validated MIME type (e.g. `application/pdf`) |
| `fileSize` | `Number` | No | None | Size in bytes (max 10MB) |
| `createdAt` | `Date` | Yes | Auto-generated | Dispatch timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Update timestamp |

- **Indexes:** `{ mentorshipId: 1, createdAt: -1 }` (compound index for fast reverse-chronological chat rendering).
- **Relationships:** References `Mentorship` (`mentorshipId`) and `User` (`senderId`).
</details>

#### `SharedNote` (Collection: `sharednotes`)
Technical guidance, architectural notes, and curated links published by mentors. Managed in `src/lib/models/Communication.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `mentorId` | `ObjectId (ref: User)` | Yes | Indexed | Alumnus author of the note |
| `menteeId` | `ObjectId (ref: User)` | No | Default: `null` | Mentee targeted (or null if cohort-wide) |
| `isAllMentees`| `Boolean` | No | `false` | Toggle to publish note to all active mentees |
| `sessionId` | `ObjectId (ref: Session)` | No | Default: `null` | Optional meeting session linkage |
| `title` | `String` | Yes | Max: 200 chars | Title of the guidance note |
| `content` | `String` | No | Max: 10000 chars | Markdown content of the resource note |
| `fileUrl` | `String` | No | None | Attached Cloudinary resource URL |
| `createdAt` | `Date` | Yes | Auto-generated | Publication timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Revision timestamp |

- **Indexes:** `{ mentorId: 1, createdAt: -1 }`, `{ mentorId: 1, menteeId: 1, createdAt: -1 }`.
- **Relationships:** References `User` (`mentorId`, `menteeId`) and `Session` (`sessionId`).
</details>

---

### Authentication & Security

#### `AuthRefreshToken` (Collection: `authrefreshtokens`)
Token family tracking supporting 30-day rotating refresh tokens with replay attack revocation. Managed in `src/lib/models/Auth.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `tokenHash` | `String` | Yes | Indexed | Cryptographic SHA-256 hash of the refresh token |
| `family` | `String` | Yes | Indexed | Token family UUID; replaying a revoked token invalidates the family |
| `userId` | `ObjectId (ref: User)` | Yes | None | User associated with the refresh family |
| `expiresAt` | `Date` | Yes | TTL: `expires: 0` | Expiration date automatically purged by MongoDB |
| `revokedAt` | `Date` | No | `null` | Revocation timestamp if superseded or compromised |
| `createdAt` | `Date` | Yes | Default: `Date.now` | Issuance timestamp |

- **Indexes:** `{ tokenHash: 1 }`, `{ family: 1 }`, `{ expiresAt: 1 }` (TTL).
- **Relationships:** References `User` via `userId`.
</details>

#### `AuthRateLimit` (Collection: `authratelimits`)
Stateful rate limiting buckets for authentication endpoints backed by MongoDB TTL auto-expiry. Managed in `src/lib/models/Auth.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `key` | `String` | Yes | Unique, Indexed | Composite key (e.g. `ip:endpoint:email`) |
| `attempts` | `Number` | No | `0` | Number of attempts within current time window |
| `resetAt` | `Date` | Yes | TTL: `expires: 0` | Timestamp when rate limit bucket resets |

- **Indexes:** `{ key: 1 }` (unique), `{ resetAt: 1 }` (TTL).
</details>

#### `AuthEmailOtp` (Collection: `authemailotps`)
Stores single-use 6-digit OTP codes for email verification and password resets with automatic TTL cleanup. Managed in `src/lib/models/Auth.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `email` | `String` | Yes | Lowercase, Indexed | Recipient email address |
| `otp` | `String` | Yes | None | 6-digit verification code |
| `expiresAt` | `Date` | Yes | TTL: `expires: 0` | Timestamp when code expires (typically 10 minutes) |
| `attempts` | `Number` | No | `0` | Number of validation attempts against this OTP |
| `createdAt` | `Date` | Yes | Default: `Date.now` | Issuance timestamp |

- **Indexes:** `{ email: 1 }`, `{ expiresAt: 1 }` (TTL).
</details>

---

### Verification & Institutional Governance

#### `VerificationRequest` (Collection: `verification_requests`)
Queue for verifying alumni degree credentials and graduation year before granting mentor status. Managed in `src/lib/models/Verification.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `institutionId` | `String` | No | Indexed (Default: `"INST-001"`) | Multi-tenant tenant identifier |
| `alumnusId` | `ObjectId (ref: User)` | Yes | None | Alumnus user awaiting verification |
| `userId` | `ObjectId (ref: User)` | Yes | Indexed | User account reference |
| `institutionalIdentifier` | `String` | Yes | Trim | University student/alumni registration ID |
| `graduationYear`| `Number` | No | None | Claimed graduation year |
| `degree` | `String` | No | Trim | Claimed degree or diploma |
| `status` | `String` | No | Enum: `pending`, `verified`, `rejected` (Default: `pending`) | Decision state |
| `submittedAt` | `Date` | No | Default: `Date.now` | Submission timestamp |
| `decidedAt` | `Date` | No | None | Timestamp of administrator review |
| `decidedBy` | `ObjectId (ref: User)` | No | None | Officer who approved or rejected the request |
| `rejectionReason`| `String` | No | Trim | Explanation if verification is rejected |
| `documents` | `Array of ObjectId (ref: VerificationDocument)` | No | `[]` | Evidence documents attached to the request |
| `createdAt` | `Date` | Yes | Auto-generated | Record creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Record update timestamp |

- **Indexes:** `{ institutionId: 1, status: 1 }`, `{ userId: 1, createdAt: -1 }`.
- **Relationships:** References `User` (`userId`, `alumnusId`, `decidedBy`) and `VerificationDocument` (`documents`).
</details>

#### `Institution` (Collection: `institutions`)
Defines the institutional tenant boundary, administrative contact details, and policy settings. Managed in `src/lib/models/Institution.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `name` | `String` | Yes | Trim | Official university or college name |
| `code` | `String` | Yes | Unique, uppercase, Indexed | Canonical institutional code (e.g. `INST-001`) |
| `domain` | `String` | No | Lowercase | Primary academic email domain (e.g. `university.edu`) |
| `status` | `String` | No | Enum: `active`, `inactive` (Default: `active`) | Operational status |
| `officeLocation`| `String` | No | Default: `"Administration Hall..."` | Physical office location |
| `officeHours` | `String` | No | Default: `"Mon–Fri, 9:00 AM – 5:00 PM"` | Support office operating hours |
| `settings.allowStudentScheduling` | `Boolean` | No | Default: `true` | Allows students to request custom session slots |
| `settings.requireAdminVerification` | `Boolean` | No | Default: `true` | Mandates officer approval before alumni mentor onboarding |
| `settings.maxPendingRequestsPerStudent` | `Number` | No | Default: `3` | Tenant-wide intro request throttling threshold |
| `settings.defaultMaxMentees` | `Number` | No | Default: `2` | Default active mentee capacity assigned to new mentors |
| `createdAt` | `Date` | Yes | Auto-generated | Record creation timestamp |
| `updatedAt` | `Date` | Yes | Auto-generated | Record update timestamp |

- **Indexes:** `{ code: 1 }` (unique), `{ status: 1 }`.
</details>

---

### Analytics & Auditing

#### `AuditEntry` (Collection: `audit_entries`)
Immutable append-only record tracking security-sensitive and administrative governance events. Managed in `src/lib/models/Analytics.ts`.

<details>
<summary>View Field Table & Details</summary>

| Field | Type | Required | Default / Constraints | Description and Use |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes | Auto-generated | Primary document identifier |
| `institutionId` | `String` | No | Indexed (Default: `"INST-001"`) | Tenant identifier |
| `actorId` | `ObjectId (ref: User)` | No | Indexed | User who executed the action |
| `actorRole` | `String` | No | None | Role of the actor at event execution |
| `action` | `String` | Yes | Indexed | Event name (e.g. `ALUMNI_VERIFIED`, `TENANT_UPDATED`) |
| `resource` | `String` | Yes | None | Target entity type (e.g. `VerificationRequest`) |
| `resourceId` | `String` | No | None | Primary key of the affected entity |
| `details` | `Mixed` | No | None | Serialized JSON payload containing state diffs |
| `ipAddress` | `String` | No | None | Client IP address of the caller |
| `userAgent` | `String` | No | None | Client User-Agent string |
| `timestamp` | `Date` | No | Default: `Date.now`, Indexed | Event occurrence timestamp |
| `createdAt` | `Date` | Yes | Auto-generated | Record write timestamp |

- **Indexes:** `{ institutionId: 1 }`, `{ actorId: 1 }`, `{ action: 1 }`, `{ timestamp: 1 }`.
- **Relationships:** References `User` via `actorId`.
</details>

---

### Relationships Summary

| From Model | To Model | Type | Implemented By |
|---|---|---|---|
| `User` | `StudentProfile` | One-to-One | `StudentProfile.userId` |
| `User` | `MentorProfile` | One-to-One | `MentorProfile.userId` |
| `User` | `MentorCapacity` | One-to-One | `MentorCapacity.mentorId` |
| `MentorshipRequest` | `User` | Many-to-One | `MentorshipRequest.studentId` & `mentorId` |
| `Mentorship` | `User` | Many-to-One | `Mentorship.studentId` & `mentorId` |
| `Session` | `User` | Many-to-One | `Session.mentorId` & `menteeId` |
| `MentorSession` | `User` | Many-to-Many | `MentorSession.mentorId` & `menteeIds[]` |
| `MentorSessionSlot` | `MentorSession` | Many-to-One | `MentorSessionSlot.sessionId` |
| `Action` | `User` | Many-to-One | `Action.studentId` & `mentorId` |
| `Action` | `Mentorship` | Many-to-One | `Action.mentorshipId` |
| `Message` | `Mentorship` | Many-to-One | `Message.mentorshipId` |
| `Message` | `User` | Many-to-One | `Message.senderId` |
| `VerificationRequest` | `User` | Many-to-One | `VerificationRequest.userId` & `decidedBy` |
| `Feedback` | `Mentorship` | Many-to-One | `Feedback.mentorshipId` |
| `AuditEntry` | `User` | Many-to-One | `AuditEntry.actorId` |

---

### Enforced Data Rules

1. **Mentor Declared Capacity Limit (Invariant 1):**
   - Mentors declare an active mentee limit (`maxMentees`).
   - Acceptance of introduction requests executes via an atomic conditional update (`$expr: { $lt: ["$activeMentees", "$maxMentees"] }`), ensuring race conditions never over-subscribe a mentor.
   - Enforced in `src/app/actions/mentorship.ts` and `src/app/api/v1/mentorships/accept/route.ts`.

2. **Alumni Contact Details Shielding (Invariant 2):**
   - Alumni personal emails, phone numbers, and physical coordinates are never included in API payloads or client views.
   - Server-side projection strictly strips these fields before returning data to students.
   - Enforced in `src/app/actions/profile.ts` (`getMentorPublicProfile`) and Route Handlers.

3. **Session Double-Booking Prevention:**
   - Mentors cannot schedule overlapping meetings. Meeting durations are sliced into 5-minute atomic buckets stored in `mentorSessionSlots`.
   - The unique compound index `{ mentorId: 1, slot: 1 }` guarantees zero overlapping sessions on standalone MongoDB without distributed transactions.
   - Enforced in `src/lib/session-service.ts` and `src/app/api/sessions/route.ts`.

4. **15-Minute Meeting Link Privacy Gating:**
   - Video room URLs are redacted for mentees until 15 minutes before session start time.
   - Enforced in `src/app/api/sessions/route.ts` and `src/app/(app)/student/dashboard/page.tsx`.

5. **Student Introduction Throttling:**
   - A student may not maintain more than 5 active pending introduction requests concurrently.
   - Enforced in `src/app/actions/mentorship.ts` and `src/app/api/v1/mentorships/request/route.ts`.

---

## Workflows

### 1. Authentication & Security Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Auth API (/api/v1/auth)
    participant DB as MongoDB
    participant Resend as Resend API

    User->>API: POST /register (name, email, password, role)
    API->>DB: Hash password with bcrypt & store User (status: pending)
    API->>Resend: Send 6-digit OTP email
    Resend-->>User: Delivers verification email
    User->>API: POST /verify-email (email, otp)
    API->>DB: Verify OTP against authemailotps (TTL)
    API-->>User: Success (Account verified)
    User->>API: POST /login (email, password)
    API->>DB: Validate credentials & generate session
    API->>DB: Store refresh token hash in authrefreshtokens
    API-->>User: Set HttpOnly access_token (15m) & refresh_token (30d)
    User->>API: GET /api/v1/me
    API-->>User: Return user payload + set csrf_token cookie
```

---

### 2. Mentorship Discovery & Connection Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Mentee as Student
    actor Mentor as Alumnus
    participant API as Mentorship API
    participant DB as MongoDB

    Mentee->>API: GET /student/mentors
    API->>DB: Query verified mentors with activeMentees < maxMentees
    API-->>Mentee: Return candidate mentors with affinity scores & rationale strings
    Mentee->>API: POST /api/v1/mentorships/request (mentorId, message)
    API->>DB: Validate student pending count (< 5) & check duplicate
    API->>DB: Insert MentorshipRequest (status: pending, expires in 14 days)
    API-->>Mentee: Request submitted
    Mentor->>API: POST /api/v1/mentorships/accept (requestId)
    Note over API,DB: Atomic Capacity Check (Invariant 1)
    API->>DB: MentorCapacity.findOneAndUpdate(activeMentees < maxMentees, +1)
    alt Capacity Exceeded
        DB-->>API: No document matched
        API-->>Mentor: 409 Conflict (Capacity reached)
    else Capacity Available
        DB-->>API: Increment succeeded
        API->>DB: MentorshipRequest -> accepted
        API->>DB: Create active Mentorship record
        API-->>Mentor: 200 OK (Mentorship active)
    end
```

---

### 3. Dynamic Session Scheduling & Overlap Prevention

```mermaid
sequenceDiagram
    autonumber
    actor Mentor as Alumnus Mentor
    participant API as Session Service
    participant DB as MongoDB
    actor Mentee as Student Mentee

    Mentor->>API: scheduleMentorshipSession(menteeId, topic, date, time, durationMinutes)
    API->>API: Compute 5-minute bucket slots between startTime and endTime
    API->>DB: Atomic insertMany into mentorsessionslots ({ mentorId, slot })
    alt Overlap Detected
        DB-->>API: MongoError E11000 (Duplicate Key)
        API-->>Mentor: Error: Time slot already reserved
    else Slots Claimed Successfully
        DB-->>API: Slots persisted
        API->>DB: Create MentorSession (status: scheduled)
        API-->>Mentor: Session confirmed with meeting link
    end
    Mentee->>API: GET /api/sessions (Query scheduled meetings)
    Note over API: 15-Minute Link Gating Rule (Invariant 2)
    alt Current Time < Start Time - 15 minutes
        API-->>Mentee: meetingLink = null, linkNotice = "Available 15m before session"
    else Current Time >= Start Time - 15 minutes
        API-->>Mentee: meetingLink = "https://meet.alma.edu/session/..."
    end
```

---

### 4. Real-Time Chat & Cloudinary Attachments

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Student / Mentor
    participant Actions as Server Actions (chat.ts)
    participant Cloudinary as Cloudinary API
    participant DB as MongoDB
    participant Pusher as Pusher Gateway
    actor Recipient as Peer Browser

    Sender->>Actions: sendMessageAction / uploadChatAttachmentAction (file, content)
    Actions->>DB: Verify active Mentorship relationship between participants
    opt File Attachment Present
        Actions->>Actions: Validate MIME type (PDF, image, text) & size (< 10MB)
        Actions->>Cloudinary: Upload binary via signed upload stream
        Cloudinary-->>Actions: Return permanent secure fileUrl
    end
    Actions->>DB: Save Message (content, fileUrl, fileName, fileSize)
    Actions->>Pusher: Trigger event 'new-message' on 'private-mentorship-{id}'
    Pusher-->>Recipient: Instant WebSocket delivery
    Recipient->>Actions: Click attachment (Downloads via fileUrl or /api/v1/chat/download)
```

---

### 5. Mentor-Scoped Sub-Tasks & Gamified Reputation

```mermaid
flowchart TD
    A["Mentor assigns action item in /mentor/mentees"] --> B["API writes Action document with mentorId and mentorshipId"]
    B --> C["Student opens /student/mentorship"]
    C --> D{"Selected Mentor Matches Action mentorId?"}
    D -- "No" --> E["Task is filtered out (Isolation Guard)"]
    D -- "Yes" --> F["Task displayed in Action Checklist"]
    F --> G["Student checks task as completed"]
    G --> H{"pointsAwarded is false?"}
    H -- "Yes" --> I["Increment studentProfile.totalPoints by +20 pts"]
    I --> J["Set pointsAwarded: true (Idempotent Guard)"]
    H -- "No" --> K["No duplicate points awarded"]
```

---

### 6. Alumni Degree Verification & Governance

```mermaid
flowchart TD
    A["Alumnus registers account with degree credentials"] --> B["System inserts VerificationRequest (status: pending)"]
    B --> C["Alumni Relations Officer opens /officer/verifications"]
    C --> D["Officer reviews claimed graduation year and uploaded document"]
    D --> E{"Officer Decision"}
    E -- "Approve" --> F["Set status: verified, update User role, append AuditEntry"]
    F --> G["Mentor profile activates for discovery with Verified badge"]
    E -- "Reject" --> H["Record rejectionReason, notify applicant, append AuditEntry"]
```

---

## Project Structure

```text
├── .agents/                               # Custom AI agent guidelines and skills
├── docs/                                  # Specifications and system baselines
│   ├── API_Specification.yaml             # Complete OpenAPI 3.1 REST API specification
│   ├── Database_Design.md                 # MongoDB collections, schemas, indexes, and constraints
│   ├── P11_Project_Source.md              # Project source context and problem statement
│   ├── PRD.md                             # Product Requirements Document
│   ├── SRS.md                             # Software Requirements Specification
│   └── System_Architecture.md             # High-Level Design (HLD) & Concurrency Architecture
├── src/
│   ├── app/                               # Next.js 16 App Router
│   │   ├── (app)/                         # Authenticated application route group
│   │   │   ├── dashboard/                 # Role-based landing and redirect handler
│   │   │   ├── mentor/                    # Mentor portal (dashboard, mentees, requests, sessions, chat)
│   │   │   ├── officer/                   # Alumni Relations Officer portal (verifications, momentum, capacity)
│   │   │   ├── profile/                   # Public mentor profile views
│   │   │   ├── student/                   # Student portal (dashboard, mentors, mentorship, chat, profile)
│   │   │   └── layout.tsx                 # Authenticated application shell layout
│   │   ├── (auth)/                        # Public authentication route group
│   │   │   ├── login/                     # Email & password login page
│   │   │   ├── register/                  # Multi-role registration page
│   │   │   └── layout.tsx                 # Clean auth layout
│   │   ├── _components/                   # Reusable UI component registry
│   │   │   ├── app-shell.tsx              # AppShell, Navigation, Avatar, StatusBadge
│   │   │   ├── icons.tsx                  # Lightweight SVG icon registry
│   │   │   ├── mentor-card.tsx            # Mentor discovery presentation card
│   │   │   ├── mentor-discovery.tsx       # Affinity search & discovery client component
│   │   │   └── mentorship-board.tsx       # Workspace client component (notes, tasks, chat)
│   │   ├── actions/                       # Next.js Server Actions
│   │   │   ├── chat.ts                    # Real-time messaging, attachments, shared notes
│   │   │   ├── mentorship.ts              # Requests, acceptance, and session scheduling
│   │   │   ├── officer.ts                 # Verification approvals, momentum nudges, tenant configs
│   │   │   ├── profile.ts                 # Profile, portfolio project, and skill mutations
│   │   │   └── tasks.ts                   # Action item creation, toggling, +20 pts reputation
│   │   ├── analytics/                     # Institutional program health page
│   │   ├── api/                           # REST API Route Handlers
│   │   │   ├── auth/                      # Better Auth core endpoints
│   │   │   ├── mentor/                    # Mentor-specific API endpoints
│   │   │   ├── pusher/                    # Pusher private channel auth endpoint
│   │   │   ├── sessions/                  # Session creation, cancellation, overlap guard
│   │   │   └── v1/                        # Core REST API endpoints (OpenAPI aligned)
│   │   ├── favicon.ico                    # Platform favicon
│   │   ├── globals.css                    # Typography tokens and Tailwind CSS rules
│   │   ├── layout.tsx                     # Root HTML layout with Geist font definition
│   │   └── page.tsx                       # Public landing and cover page
│   ├── components/                        # Shared UI components
│   │   └── shared/
│   │       └── ImageUpload.tsx            # Cloudinary avatar and banner image uploader
│   └── lib/                               # Core backend services and utilities
│       ├── models/                        # Authoritative Mongoose Domain Models (29 entities)
│       │   ├── Analytics.ts               # MatchScore, EngagementSnapshot, PlacementOutcome, AuditEntry, OutboxEvent
│       │   ├── Auth.ts                    # AuthRefreshToken, AuthRateLimit, AuthEmailOtp
│       │   ├── Communication.ts           # Message, SharedNote
│       │   ├── Feedback.ts                # Feedback
│       │   ├── Institution.ts             # Institution
│       │   ├── MentorSession.ts           # MentorSession, MentorSessionSlot (Overlap Guard)
│       │   ├── Mentorship.ts              # MentorshipRequest, Mentorship, Session, MentorCapacity, AvailabilityWindow
│       │   ├── Tasks.ts                   # Action (Sub-Tasks), Goal, CareerGoal
│       │   ├── User.ts                    # User, StudentProfile, MentorProfile / AlumniProfile
│       │   ├── Verification.ts            # VerificationRequest, VerificationDocument, ExpertiseTag
│       │   └── index.ts                   # Centralized model exports
│       ├── utils/                         # Pure utility functions
│       │   ├── analytics.ts               # Program metric aggregations
│       │   ├── matching.ts                # Score calculation helpers
│       │   └── scheduling.ts              # Slot and interval math
│       ├── app-tokens.ts                  # JWT signing, refresh rotation & cookie headers
│       ├── auth-security.ts               # CSRF, Origin verification & Mongo TTL rate limiting
│       ├── auth.ts                        # Better Auth instance & MongoDB connection
│       ├── authorization.ts               # RBAC and relationship authorization logic
│       ├── chat-attachments.ts           # MIME validation and upload helpers
│       ├── cloudinary.ts                  # Server-side Cloudinary SDK configuration
│       ├── config.ts                      # Centralized environment variable validation
│       ├── db.ts                          # Mongoose connection pooling and caching
│       ├── matching.ts                    # Multi-attribute affinity recommendation engine
│       ├── pusher-client.ts               # Browser Pusher WebSocket client
│       ├── pusher-server.ts               # Server Pusher SDK integration
│       └── session-service.ts             # 5-minute bucket slot overlap guard engine
├── .env.example                           # Safe template for required environment variables
├── .gitignore                             # Git ignore rules
├── .prettierrc.json                       # Code formatting rules
├── eslint.config.mjs                      # ESLint configuration
├── LICENSE                                # MIT License file
├── next.config.ts                         # Next.js configuration
├── package.json                           # Project dependencies and run scripts
├── pnpm-lock.yaml                         # Deterministic package lockfile
├── postcss.config.mjs                     # PostCSS configuration for Tailwind CSS v4
├── README.md                              # Authoritative project documentation
└── tsconfig.json                          # Strict TypeScript compiler options
```

---

## Module Documentation

### Module Breakdown (M1 – M10)

| Module | Purpose | Key Files | Primary Models | Key UI Components |
|---|---|---|---|---|
| **M1: Verification & Profile** | Manages alumni credentials, verification states, and professional profiles | `src/lib/models/User.ts`, `src/app/actions/profile.ts`, `src/app/actions/officer.ts` | `User`, `AlumniProfile`, `VerificationRequest` | `src/app/(app)/officer/verifications/page.tsx` |
| **M2: Capacity & Availability** | Enforces hard mentor limits and prevents mentee over-subscription | `src/lib/models/Mentorship.ts`, `src/lib/config.ts` | `MentorCapacity`, `AvailabilityWindow` | `src/app/(app)/mentor/dashboard/page.tsx` |
| **M3: Student Career Profile** | Captures student academic info, projects (live/repo links), and career goals | `src/lib/models/User.ts`, `src/app/actions/profile.ts` | `User`, `StudentProfile`, `CareerGoal` | `src/app/(app)/student/profile/page.tsx` |
| **M4: Discovery & Matching** | Calculates multi-attribute affinity scores and transparent rationale strings | `src/lib/matching.ts`, `src/app/api/v1/mentors/discovery` | `AlumniProfile`, `StudentProfile`, `MatchScore` | `src/app/(app)/student/mentors/page.tsx` |
| **M5: Requests & Acceptance** | Manages request lifecycle, 14-day expiry, throttling, and atomic acceptance | `src/lib/models/Mentorship.ts`, `src/app/actions/mentorship.ts` | `MentorshipRequest`, `Mentorship` | `src/app/(app)/mentor/requests/page.tsx` |
| **M6: Scheduling & Sessions** | Coordinates 1-on-1 and cohort sessions, 5-minute slot overlap guard, 15-minute link gating | `src/lib/models/MentorSession.ts`, `src/lib/session-service.ts` | `Session`, `MentorSession`, `MentorSessionSlot` | `src/app/(app)/mentor/sessions/page.tsx` |
| **M7: Goals, Actions & Feedback** | Bilateral goals, mentor-scoped sub-tasks, +20 pts reputation, and satisfaction ratings | `src/lib/models/Tasks.ts`, `src/app/actions/tasks.ts`, `src/lib/models/Feedback.ts` | `Goal`, `Action`, `Feedback` | `src/app/(app)/student/mentorship/page.tsx` |
| **M8: Engagement Monitoring** | Evaluates relationship momentum, last activity timestamps, and inactivity flags | `src/lib/utils/analytics.ts`, `src/app/actions/officer.ts` | `Mentorship`, `Session`, `EngagementSnapshot` | `src/app/(app)/officer/momentum/page.tsx` |
| **M9: Scoped Messaging** | Real-time bilateral chat via Pusher WebSockets and Cloudinary attachments | `src/lib/models/Communication.ts`, `src/app/actions/chat.ts` | `Message`, `SharedNote` | `src/app/(app)/student/mentorship/[mentorId]/chat/page.tsx` |
| **M10: Program Analytics & Audit** | Institutional reporting on capacity utilization, satisfaction, and compliance logs | `src/app/analytics/page.tsx`, `src/lib/utils/analytics.ts` | `AuditEntry`, `ProgrammeConfiguration` | `src/app/(app)/officer/reports/page.tsx` |

<details>
<summary><strong>Click to view the complete API Reference table</strong></summary>

### API Reference

| Method | Endpoint | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/me` | Public / Authenticated | Returns current user profile and sets cryptographic `csrf_token` cookie |
| `POST` | `/api/v1/auth/register` | Public | Registers a new user account with role selection (`student`, `alumni`, `mentor`) |
| `POST` | `/api/v1/auth/login` | Public | Authenticates user credentials, sets access & refresh cookies (or challenges TOTP for admin) |
| `POST` | `/api/v1/auth/send-otp` | Public | Generates and emails a 6-digit verification code via Resend |
| `POST` | `/api/v1/auth/verify-email` | Public | Validates email verification OTP and marks user email verified |
| `POST` | `/api/v1/auth/verify-otp` | Public | Validates OTP for login or account recovery |
| `POST` | `/api/v1/auth/verify-totp` | Authenticated (Admin) | Validates Time-Based One-Time Password for administrative multi-factor auth |
| `POST` | `/api/v1/auth/refresh` | Authenticated | Rotates refresh token family and issues a fresh 15-minute access JWT |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes current refresh token family and clears authentication cookies |
| `POST` | `/api/v1/auth/reset-password` | Public | Resets user password using a verified OTP code |
| `GET` | `/api/v1/mentors/discovery` | Authenticated (Student) | Returns ranked mentor recommendations with affinity scores and rationale strings |
| `POST` | `/api/v1/mentorships/request` | Authenticated (Student) | Submits an introduction request to an available mentor (throttled to 5 active) |
| `POST` | `/api/v1/mentorships/accept` | Authenticated (Mentor) | Atomically accepts a pending request if mentor capacity has not been reached |
| `GET` | `/api/mentor/mentees` | Authenticated (Mentor) | Retrieves active mentees with their full career profiles and assigned tasks |
| `GET` | `/api/sessions` | Authenticated | Lists upcoming and past sessions (meeting links are privacy-gated for students) |
| `POST` | `/api/sessions` | Authenticated (Mentor) | Schedules a 1-on-1 or cohort session with 5-minute atomic slot overlap prevention |
| `PATCH` | `/api/sessions/[id]/cancel` | Authenticated | Cancels a scheduled session and releases booked 5-minute slot buckets |
| `POST` | `/api/pusher/auth` | Authenticated | Authorizes private WebSocket channel subscription (`private-mentorship-${id}`) |
| `GET` | `/api/v1/chat/download` | Authenticated | Secure proxy endpoint for downloading Cloudinary chat file attachments |

</details>

---

## Getting Started

### Prerequisites
- **Node.js:** 20.x or higher
- **pnpm:** 9.x or 10.x (`npm install -g pnpm`)
- **MongoDB:** 7.0+ (Local standalone instance or MongoDB Atlas)
- **Third-Party Accounts (Free Tier):**
  - [Cloudinary](https://cloudinary.com/) (file attachments and profile images)
  - [Pusher Channels](https://pusher.com/) (real-time chat WebSockets)
  - [Resend](https://resend.com/) (transactional email verification OTPs)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adarsh3699/Alumni-Mentorship-and-Career-Network.git
   cd Alumni-Mentorship-and-Career-Network
   ```

2. **Install project dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and populate your credentials (see [Environment Variables](#environment-variables)).

4. **Start your local MongoDB instance (if running locally):**
   ```bash
   # Linux / macOS
   sudo systemctl start mongod

   # Windows PowerShell
   Start-Service MongoDB
   ```

5. **Start the Next.js development server:**
   ```bash
   pnpm dev
   ```

### Local Database Note
> **Standalone MongoDB Compatibility:** Unlike architectures that require MongoDB multi-document transactions (which demand a multi-node replica set), Alma’s concurrency controls—such as mentor capacity limits and session overlap prevention—rely on **atomic conditional updates** and **discrete 5-minute bucket slots with unique compound indexes**. Alma runs seamlessly on a standard standalone local MongoDB installation.

### Verify It Works
1. Open your browser to [http://localhost:3000](http://localhost:3000).
2. You should see the **Alma** cover page with the hero text *"Turn alumni goodwill into momentum."*
3. Click **Login / Sign up** to create a student account or log in with seeded credentials.

---

## Environment Variables

| Variable | Required | Exposed to Browser | Description | Example Placeholder |
|---|---|---|---|---|
| `MONGODB_URI` | **Yes** | No | MongoDB connection string | `mongodb://localhost:27017/alumni_network` |
| `MONGODB_DB` | **Yes** | No | MongoDB database name | `alumni_network` |
| `BETTER_AUTH_SECRET` | **Yes** | No | 32+ character random secret for signing tokens | `your_long_random_better_auth_secret` |
| `BETTER_AUTH_URL` | **Yes** | No | Canonical URL of the application | `http://localhost:3000` |
| `AUTH_TRUSTED_ORIGINS` | **Yes** | No | Allowed origins for CSRF checks | `http://localhost:3000` |
| `DEFAULT_USER_ROLE` | No | No | Default role on sign up (`student`) | `student` |
| `NODE_ENV` | No | No | Node environment mode | `development` |
| `RESEND_API_KEY` | **Yes** | No | Resend API key for verification emails | `re_123456789_abcdef` |
| `RESEND_FROM_EMAIL` | **Yes** | No | Verified sender email address | `Alma Network <auth@domain.edu>` |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | No | Cloudinary cloud identifier | `your_cloudinary_cloud_name` |
| `CLOUDINARY_API_KEY` | **Yes** | No | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | **Yes** | No | Cloudinary API secret | `your_cloudinary_api_secret` |
| `CLOUDINARY_URL` | No | No | Combined Cloudinary URL string | `cloudinary://api_key:secret@cloud_name` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | **Yes** | **Yes** | Client-side Cloudinary cloud name | `your_cloudinary_cloud_name` |
| `NEXT_PUBLIC_CLOUDINARY_PRESET` | No | **Yes** | Cloudinary unsigned avatar preset | `alma_avatars` |
| `NEXT_PUBLIC_CLOUDINARY_BANNER_PRESET`| No | **Yes** | Cloudinary unsigned banner preset | `alma_banners` |
| `PUSHER_APP_ID` | **Yes** | No | Pusher application ID | `1234567` |
| `PUSHER_KEY` | **Yes** | No | Pusher server API key | `your_pusher_key` |
| `PUSHER_SECRET` | **Yes** | No | Pusher server secret | `your_pusher_secret` |
| `PUSHER_CLUSTER` | **Yes** | No | Pusher cluster region | `ap2` |
| `NEXT_PUBLIC_PUSHER_KEY` | **Yes** | **Yes** | Client-side Pusher key | `your_pusher_key` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | **Yes** | **Yes** | Client-side Pusher cluster region | `ap2` |
| `MAX_MENTEES_PER_MENTOR` | No | No | Max active mentees per mentor (default: 5) | `5` |
| `MAX_MENTORS_PER_STUDENT` | No | No | Max active mentors per student (default: 5) | `5` |
| `MAX_PENDING_REQUESTS_PER_STUDENT` | No | No | Max pending requests per student (default: 5)| `5` |

### Credential Acquisition Guide
- **Resend:** Sign up at [resend.com](https://resend.com), navigate to **API Keys**, create an API key, and configure your sending domain or use `onboarding@resend.dev` for test environments.
- **Cloudinary:** Sign up at [cloudinary.com](https://cloudinary.com), open the **Dashboard** to copy your Cloud Name, API Key, and API Secret. Under **Settings -> Upload**, create unsigned presets matching `alma_avatars` and `alma_banners`. Under **Settings -> Security**, ensure delivery of PDF and ZIP files is enabled.
- **Pusher Channels:** Sign up at [pusher.com](https://pusher.com), create a **Channels** app, select your preferred cluster (e.g. `ap2`), and copy the App ID, Key, Secret, and Cluster from **App Keys**.

---

## Third-Party Setup Guide

### 1. Cloudinary Configuration
1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the console dashboard into `.env.local`.
3. Go to **Settings -> Upload -> Upload Presets**:
   - Create an unsigned preset named `alma_avatars` (Folder: `alma/avatars`).
   - Create an unsigned preset named `alma_banners` (Folder: `alma/banners`).
4. Go to **Settings -> Security -> Restricted media types**:
   - **Crucial:** Ensure **PDF and ZIP files** are unchecked / allowed for delivery so students and mentors can preview and download resume and code attachments.

### 2. Pusher Channels Configuration
1. Create a free account at [pusher.com](https://pusher.com).
2. Create a new application in **Channels**:
   - Cluster: Choose the closest region (e.g. `ap2` for Asia Pacific, `us2` for US).
   - Frontend tech: React.
   - Backend tech: Node.js.
3. Copy the credentials into `.env.local` (`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, and the corresponding `NEXT_PUBLIC_*` variables).
4. The application handles authentication via `/api/pusher/auth` for private channels.

### 3. Resend Email Configuration
1. Create an account at [resend.com](https://resend.com).
2. Generate an API Key and set `RESEND_API_KEY` in `.env.local`.
3. If testing without a custom domain, set `RESEND_FROM_EMAIL=onboarding@resend.dev`. For production, add your domain in Resend and verify DNS records.

---

## Commands

| Command | Category | What it does |
|---|---|---|
| `pnpm dev` | Development | Starts local Next.js development server on `http://localhost:3000` |
| `pnpm build` | Production Build | Compiles TypeScript and creates optimized Next.js production build in `.next` |
| `pnpm start` | Production Start | Launches compiled Next.js production server on configured port |
| `pnpm lint` | Code Quality | Runs ESLint across all TypeScript and React files |

### Production Run Sequence
To build and run Alma in a production environment, execute commands in this exact order:
```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Build production assets
pnpm build

# 3. Start production server
pnpm start
```

---

## Testing

> **No automated tests yet.**

The initial project development focused on strict type coverage, end-to-end architecture validation, and transactional integrity. Code quality and type safety are verified via:

```bash
# Strict TypeScript compilation check (zero errors)
pnpm exec tsc --noEmit

# Project-wide linting
pnpm lint
```

---

## Deployment

### Deploying to Vercel + MongoDB Atlas

1. **Database (MongoDB Atlas):**
   - Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Create a database user and whitelist network access (`0.0.0.0/0` for Vercel serverless functions).
   - Obtain the connection URI (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/alumni_network?retryWrites=true&w=majority`).

2. **Web Application (Vercel):**
   - Push your repository to GitHub.
   - Import the repository in [Vercel](https://vercel.com).
   - Set the Framework Preset to **Next.js**.
   - Add all environment variables from `.env.example` in the Vercel project settings.
   - Deploy. Vercel automatically runs `pnpm build` and serves the App Router.

---

## Troubleshooting

| Problem | Potential Cause | Solution |
|---|---|---|
| `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB service is stopped | Start local MongoDB daemon (`sudo systemctl start mongod` or `Start-Service MongoDB`) or verify Atlas connection string in `MONGODB_URI`. |
| `Invalid CSRF token` or `Origin validation failed` | Origin header mismatch on state-mutating requests | Ensure `AUTH_TRUSTED_ORIGINS` in `.env.local` includes your exact browser origin (e.g. `http://localhost:3000`). |
| Cloudinary attachment returns 404 or fails to download | Delivery of PDF or ZIP files blocked in Cloudinary | Log in to Cloudinary -> **Settings** -> **Security** -> **Restricted media types** -> Uncheck PDF and ZIP delivery restriction. |
| Time slot overlap collision error (`E11000 duplicate key error`) | Attempting to book an overlapping session | The mentor already has a booked session within the requested interval. Choose a non-overlapping time slot. |
| Pusher WebSocket fails to connect or chat does not update | Incorrect Pusher cluster or key mismatch | Confirm `PUSHER_CLUSTER` and `NEXT_PUBLIC_PUSHER_CLUSTER` match your Pusher dashboard. Chat gracefully falls back to HTTP polling. |
| `Port 3000 is already in use` | Another process is occupying port 3000 | Terminate the existing node process or run on another port (`pnpm dev -- -p 3001`). |

---

## Roadmap

Based on project architectural specifications and planned milestones:
- **LinkedIn OAuth Integration:** One-click career profile prefill for alumni and student accounts.
- **AI-Driven Semantic Matchmaking:** Vector embeddings for unstructured student aspirations and mentor expertise.
- **Automated Inactivity Nudges:** Background cron workers for flagging inactive mentorships and issuing re-engagement notifications.

---

## Contributing

1. Fork the repository.
2. Create a descriptive feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes using clear, professional commit messages:
   ```bash
   git commit -m "add feature description"
   ```
4. Verify code quality before submitting:
   ```bash
   pnpm exec tsc --noEmit
   pnpm lint
   ```
5. Push to your branch and open a Pull Request.

---

## License and Copyright

Distributed under the **MIT License**. See the [LICENSE](LICENSE) file for more information.

```text
Copyright (c) 2026 Ayush Kumar and Ashutosh Kumar. All rights reserved.
```

### Acknowledgements
- [Next.js](https://nextjs.org/) by Vercel
- [React](https://react.dev/) by Meta
- [Tailwind CSS](https://tailwindcss.com/)
- [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/)
- [Pusher](https://pusher.com/)
- [Cloudinary](https://cloudinary.com/)
- [Resend](https://resend.com/)
- [Better Auth](https://www.better-auth.com/)

---

## Contact / Support

- **Repository:** [https://github.com/adarsh3699/Alumni-Mentorship-and-Career-Network](https://github.com/adarsh3699/Alumni-Mentorship-and-Career-Network)
- **Project Issues:** [Submit an Issue](https://github.com/adarsh3699/Alumni-Mentorship-and-Career-Network/issues)
