# EduRev Project Source — P11

## Alumni Mentorship and Career Network

This file is the P11-only source extract from the EduRev Project List.
It contains the P11 project specification and the applicable Common
Engineering Standard (CES) and Track J requirements. Details for all
other projects and alternative technology paths have intentionally been
removed. Where the retained original P11 wording mentions alternatives
(for example Track P in Section 14), those references are provenance-only
and are not selected architecture decisions for this project. The selected
baseline is Track J — Path J1 (Next.js Full-Stack).

---

## 1. Project Identity and Locked Delivery Context

| Field | Value |
| --- | --- |
| Project | P11 — Alumni Mentorship and Career Network |
| Product | Verified Alumni Mentorship Matching and Engagement Platform |
| Selected track | Track J |
| Selected path | Path J1 — Next.js Full-Stack |
| Technology family | Next.js + Node.js + MongoDB |
| API style | REST with OpenAPI 3.1, versioned at `/api/v1` |

### 1.1 Track and path terminology

For P11, the following relationship is locked:

```text
Track J
  ↓
Path J1 — Next.js Full-Stack
  ↓
Next.js App Router
  ├── Server Components
  ├── Client Components
  ├── Route Handlers
  └── Server Actions
  ↓
Node.js runtime
  ↓
MongoDB + Mongoose
```

Path J1 uses Next.js as the full-stack application framework. The App
Router, Route Handlers, and Server Actions own the web and server-side
application boundary. P11 specifies Next.js + Node.js + MongoDB for
Track J.

The delivery path is selected in week 1 and recorded in the design
documents. P11 uses Path J1; no alternative delivery path is part of
this project baseline.

### 1.2 Relevant course alignment

- CSE326 Internet Programming supports the HTML, accessibility,
  responsive UI, JavaScript, browser, and Git foundations used by P11.
- INT252 Web App Development with ReactJS supports React components,
  hooks, forms, Zod, React Query, routing, and client-side interaction.
- INT257 Modern Web App Development supports the Next.js App Router,
  Server Components, Client Components, Route Handlers, Server Actions,
  authentication, RBAC, and deployment.

Path J1 is covered by INT252, INT257, and CSE326 and is the Track J path
fully taught by the relevant courses.

---

## 2. Applicable Common Engineering Standard

The following CES requirements apply to P11's selected Track J / Path J1
delivery.

The standard is not softened for student teams; scope may be reduced,
but the selected scope must still meet the recorded engineering
standard.

### 2.1 Architecture and implementation rules

- Use a modular monolith rather than microservices unless the project
  specification explicitly requires otherwise. Modules must remain
  separately structured so they can later be extracted if necessary.
- Every module exposes a documented internal service interface. Modules
  must not access another module's database models directly.
- Business logic must be unit-testable without HTTP.
- Configuration is supplied through environment/runtime configuration.
- Secrets must not be committed to the repository and must be checked by
  secret-scanning CI.
- Database changes and seed scripts must be committed, repeatable, and
  proven against an empty database before demonstrations.
- Every domain record carries an institution identifier for
  multi-tenant readiness.
- Track J modules are organized with internal service boundaries, and
  MongoDB models belong to exactly one module.

### 2.2 Track J baseline

| Area | P11 requirement |
| --- | --- |
| Language | TypeScript on client and server |
| Framework | React 18+ with Next.js App Router on Node.js through Path J1 |
| UI | Tailwind CSS with shadcn/ui or Material UI, used consistently |
| State and data | TanStack Query for server state; Zustand or React Context for client state |
| Database | MongoDB 7+ with Mongoose; replica set in production |
| Cache and queues | Redis for cache, sessions, and rate limiting; BullMQ for background jobs |
| Scheduled work | BullMQ repeatable jobs; never in-process cron |
| API | REST, OpenAPI 3.1, versioned at `/api/v1` |
| Validation | Zod on every endpoint |
| Authentication | JWT access and refresh tokens in httpOnly cookies; OAuth2/OIDC for university SSO; TOTP MFA for administrators |
| Authorization | Server-side RBAC with attribute checks; UI hiding is not authorization |
| Files | S3-compatible object storage with pre-signed URLs; never store uploads in the app web root |
| Search | MongoDB Atlas Search or Meilisearch where the P11 discovery requirements require text search |
| Realtime | Socket.IO or SSE where the specification requires live updates; P11 uses Socket.IO for messaging |
| Documents | Server-side PDF rendering and ExcelJS where programme reports require document exports |
| Containers | Docker with multi-stage builds; Docker Compose brings the local stack up with one command |
| CI/CD | GitHub Actions for lint, typecheck, test, build, and deployment on merge |
| Hosting | Node-compatible Next.js runtime and MongoDB Atlas |
| Observability | Structured JSON logging with Pino, Sentry, uptime monitoring, `/health`, and `/ready` |

### 2.3 Non-functional baseline

| Requirement | Target |
| --- | --- |
| Concurrent users | 2,000 sustained; 5,000 peak |
| API latency | p95 under 400 ms for reads; p95 under 800 ms for writes |
| Dashboard/report generation | Under 3 seconds interactively; longer work runs in the background with notification |
| Page load | LCP under 2.5 seconds on a 4G connection |
| Availability | 99.5% during academic working hours |
| Retention | Seven years for academic records where applicable; configurable per entity |
| Backup | Automated daily backups with a tested, documented restore |
| Accessibility | WCAG 2.2 AA for student-facing screens |
| Browser support | Latest two versions of Chrome, Edge, Firefox, and Safari; responsive to 360 px |
| Localisation | English at launch; Hindi and Punjabi strings externalised for future localisation |

### 2.4 Security baseline

- Address and evidence the OWASP Top 10.
- Validate every endpoint input server-side with Zod.
- Apply rate limiting per IP and per authenticated user where available.
- Protect authentication endpoints against brute force.
- Use TLS 1.2 or higher in transit and approved encryption/protection at
  rest, including field-level protection for sensitive identity data
  where applicable.
- Maintain an immutable audit log for privileged actions containing the
  actor, action, target, before/after state, timestamp, and IP where
  applicable.
- Align with the DPDP Act 2023 through purpose limitation, consent records
  where required, and data-subject access and deletion endpoints/processes.
- Do not place personal data in logs, error messages, or analytics events
  unless explicitly required and approved.
- Scan dependencies in CI and have no unresolved High or Critical
  dependency findings at handover.
- Validate uploaded files by MIME, magic bytes, and size; scan for
  malware; store files outside the web root; serve them only through
  pre-signed URLs.

### 2.5 Testing baseline

| Test type | Track J expectation |
| --- | --- |
| Unit | Jest or Vitest; at least 70% statement coverage in domain/service layers |
| Component | React Testing Library for shared components and every form |
| Integration | Supertest against a test database for every endpoint, including authorization-failure paths |
| End-to-end | Playwright or Cypress for every critical acceptance journey |
| Load | k6 or Artillery against the concurrency targets; submit the load-test report at M4 |
| Security | OWASP ZAP baseline plus npm audit; clean at handover |
| Accessibility | axe-core in CI; zero critical violations on student-facing pages |
| Concurrency | Explicit multi-client tests wherever P11 defines a correctness guarantee |
| UAT | 10 working days with a defect log and severity classification |

### 2.6 Documentation and definition of done

Required repository documentation includes the README, architecture
decision records, API specification, database design with ERD,
environment-variable reference, deployment and rollback runbook, backup
and restore procedure, role and permission matrix, admin guide,
end-user quick-start guide, a 60–90 minute handover walkthrough,
written privacy statement listing every field visible to a student, and
known-issues register.

Every milestone is complete only when the code is merged through a
reviewed pull request, CI is green, tests pass, applicable migrations or
database changes are committed and reversible, documentation is updated,
the system is deployed to staging and demonstrated, no High or Critical
vulnerabilities remain, and accessibility checks pass for new screens.

---

## 3. P11 Project Overview

P11 verifies alumni identity, captures professional expertise, mentoring
interests, capacity, and availability, matches students to mentors
against declared career goals, and supports the mentoring relationship
through requests, scheduling, goals, action items, and feedback. It keeps
alumni contact details private and gives the institution engagement
visibility.

### 3.1 Problem

Alumni goodwill exists but is unstructured. Connections are ad hoc,
unevenly distributed, invisible to the institution, and decay without
follow-up. Alumni are also over-contacted by students who found them on
LinkedIn.

### 3.2 Target users

- Students
- Alumni mentors
- Alumni Relations Officers
- Placement Officers
- Administrators for programme configuration and control

### 3.3 Expected outcome

A sustained mentoring programme with measurable engagement, protected
alumni capacity, and outcomes the institution can report.

### 3.4 Design constraint

Protect the mentor's time. Capacity limits, request throttling, and easy
declining must be first-class features. Alumni mentoring programmes fail
when mentors become overwhelmed and disengage, not because students are
uninterested.

---

## 4. Project Objectives

- Verify alumni identity against institutional records before granting
  mentor status.
- Capture structured expertise, mentoring areas, capacity, and
  availability.
- Capture student career goals and interests.
- Match and rank mentors with explained relevance.
- Manage requests, acceptance, scheduling, and session records.
- Track goals, action items, and feedback across the relationship.
- Detect declining engagement and prompt follow-up.
- Report programme outcomes without exposing personal contact data.

---

## 5. Functional Modules

| Module | Name | Function | Dependency |
| --- | --- | --- | --- |
| M1 | Alumni Verification & Profile | Identity verification against records, professional profile, and expertise | Build first |
| M2 | Capacity & Availability | Concurrent mentee limits, available periods, pause, and resume | M1 |
| M3 | Student Career Profile | Goals, interests, target roles, and industries | Independent |
| M4 | Matching Engine | Ranked mentor suggestions with explained relevance and capacity filtering | M1, M2, M3 |
| M5 | Request & Acceptance | Requests, throttling, expiry, and decline with optional reason | M4 |
| M6 | Scheduling & Sessions | Slot proposal, booking, reminders, and session records | M5 |
| M7 | Goals, Actions & Feedback | Goal setting, action items, completion, and bidirectional feedback | M6 |
| M8 | Engagement Monitoring | Inactivity detection, nudges, and relationship health | M6, M7 |
| M9 | Messaging | In-platform messaging with contact-detail masking | M5 |
| M10 | Programme Analytics | Participation, outcomes, and mentor effectiveness | M7, M8 |

---

## 6. Roles and Permissions

| Role | Product access |
| --- | --- |
| Student | Own profile, browse matches, send throttled requests, and manage own mentoring relationships |
| Alumni Mentor | Own profile, capacity, availability, request responses, sessions, and feedback |
| Alumni Relations Officer | Verification, engagement monitoring, mentor effectiveness, and programme reports |
| Placement Officer | Read-only mentoring participation in relation to placement outcomes |
| Administrator | Matching weights, request-throttle limits, expiry settings, and engagement settings |

---

## 7. P11 Technical Requirements

### 7.1 Frontend and interaction requirements

- Mentor discovery must provide facets and a clear capacity indication.
- The mentor dashboard must make declining easy and guilt-free.
- Session management must be mobile-friendly for busy professionals.

### 7.2 Backend requirements

- Matching is computed on demand with capacity filtering.
- Request throttling is enforced per student per period.
- Requests expire automatically according to the configured policy.
- An engagement-decay job runs weekly.

### 7.3 Data model areas

The source identifies these core data areas:

`Alumnus`, `VerificationRequest`, `ExpertiseTag`, `MentorCapacity`,
`AvailabilityWindow`, `StudentProfile`, `CareerGoal`, `MatchScore`,
`MentorshipRequest`, `Mentorship`, `Session`, `Goal`, `ActionItem`,
`Feedback`, `Message`, and `EngagementSnapshot`.

### 7.4 API areas

The source identifies these core API areas:

`/alumni/verify`, `/mentors/search`, `/requests`,
`/mentorships/{id}/sessions`, `/mentorships/{id}/goals`, `/messages`,
and `/analytics/programme`.

### 7.5 Privacy requirement

Alumni email and phone details must never be exposed to students at any
point or in any response, including matching results. This requirement
must be tested explicitly.

### 7.6 Track J capacity requirement

Capacity enforcement under concurrent acceptance must use a conditional
update that fails when the capacity limit has already been reached.

---

## 8. Product Capabilities and Operations

### 8.1 Admin dashboard

- Verification queue with document review.
- Mentor-capacity overview and overload warnings.
- Matching-weight configuration.
- Throttle and expiry settings.
- Engagement-health board.
- Mentor-effectiveness ranking.
- Programme reporting.

### 8.2 Reporting and analytics

- Active mentorships and participation rate.
- Request acceptance rate.
- Session frequency and completion.
- Goal completion rate.
- Mentor utilisation against capacity.
- Engagement decay and recovery.
- Mentoring participation correlated with placement outcomes.
- Mentor and student satisfaction scores.

### 8.3 Notifications and communication

- Verification status.
- New request with easy decline.
- Request accepted, declined, or expired.
- Session scheduled and reminder.
- Action item due.
- Inactivity nudge.
- Feedback request.

### 8.4 Third-party integrations

- ERP or alumni records for verification.
- LinkedIn, optional and limited to profile prefill.
- Google Calendar and Microsoft Outlook through OAuth.
- Video conferencing and video-call link generation.
- Email and SMS.
- University SSO.

Track J uses Socket.IO for in-platform messaging. Contact-detail
masking is a serialization-layer concern and must be implemented at the
server-side output boundary.

---

## 9. Milestones and Deliverables

### 9.1 Expected deliverables

Deliverables follow the CES, plus a verified seed set of at least 50
alumni profiles.

### 9.2 Development milestones

| Milestone | Scope | Estimate |
| --- | --- | ---: |
| M0 | Discovery | 1 week |
| M1 | Verification and profiles | 3 weeks |
| M2 | Matching and requests | 3 weeks |
| M3 | Scheduling and messaging | 3 weeks |
| M4 | Goals, feedback, and engagement | 2 weeks |
| M5 | Analytics, UAT, and production | 2 weeks |

### 9.3 Project fit and team

P11 is Medium complexity, estimated at 600–800 hours. It fits two
semesters for a team of four, or one semester for a team of five when
in-platform messaging (M9) is deferred to semester 2.

Suggested team: five students consisting of a tech lead, two backend
contributors with one owning matching and privacy, one frontend
contributor, and one contributor owning QA and documentation.

---

## 10. P11-Specific Testing Requirements

In addition to the CES baseline, P11 requires explicit proof that:

- Alumni contact data never appears in any student-accessible response.
- Capacity limits cannot be exceeded under concurrent acceptance.
- Student request throttling is enforced.
- The automatic expiry job is correct.

---

## 11. Deployment Direction

Track J uses the Node.js + MongoDB family under the CES deployment
baseline. When Socket.IO is used at scale, the messaging server may be
separated as an independently scalable runtime while remaining within
the same logical product architecture.

---

## 12. Skills and Readiness

The team should be comfortable with Data Structures and DBMS, have at
least one prior project, and use Git branching and pull requests.

The project specifically needs capability in:

- TypeScript, Next.js, Node.js, and MongoDB.
- Matching and ranking algorithms.
- OAuth and calendar APIs.
- Real-time messaging.
- Background jobs and Redis.
- Privacy-conscious server-side output design.

One team member should be comfortable with OAuth and third-party
calendar APIs. The privacy requirement needs explicit ownership and
testing responsibility.

---

## 13. Acceptance Criteria

- Alumni verification completes against institutional records with an
  audit trail.
- Mentor capacity limits cannot be exceeded, including under concurrent
  acceptance.
- Student request throttling is enforced and configurable.
- Alumni contact details are never exposed, proven by exhaustive endpoint
  testing.
- Matching returns ranked mentors with a stated reason for each match.
- Sessions are schedulable with calendar integration and reminders.
- Engagement decay is detected and nudges are issued.
- A programme report is generated covering participation, sessions,
  goals, and outcomes.

### 13.1 Future potential

- Semantic matching between student goals and mentor experience using
  embeddings.
- Predicting which mentorships will lapse so intervention can be
  targeted.

### 13.2 Commercialisation

Moderate to strong. Alumni engagement platforms are a real market, and
the capacity-protection design is a differentiator against tools that
simply expose a directory.

---

## 14. Original P11 Project Specification — Source-Preserved

The following section preserves the original P11 project specification
wording and order. The Track P alternatives appear here only because they
are part of the original P11 source; the selected project baseline remains
Track J — Path J1 (Next.js Full-Stack).

### P11 — Alumni Mentorship and Career Network

**1. Project Title**

Verified Alumni Mentorship Matching and Engagement Platform. Track J:
Next.js + Node.js + MongoDB. Track P: Django + PostgreSQL.

**2. Project Overview**

Description. Verifies alumni identity, captures professional expertise,
mentoring interests, capacity and availability, matches students to
mentors against declared career goals, and supports the mentoring
relationship through requests, scheduling, goals, action items and
feedback – while keeping alumni contact details private and giving the
institution engagement visibility.

Problem. Alumni goodwill exists but is unstructured. Connections are ad
hoc, unevenly distributed, invisible to the institution, and decay
without follow-up. Alumni are also over-contacted by students who found
them on LinkedIn.

Target users. Students, alumni mentors, alumni relations officers,
placement officers.

Expected outcome. A sustained mentoring programme with measurable
engagement, protected alumni capacity, and outcomes the institution can
report.

Design constraint that determines success: protect the mentor's time.
Capacity limits, request throttling and easy declining must be first-class
features. Alumni mentoring programmes fail because mentors get overwhelmed
and disengage, not because students are uninterested.

### 3. Project Objectives

- Verify alumni identity against institutional records before granting
  mentor status.
- Capture structured expertise, mentoring areas, capacity and availability.
- Capture student career goals and interests.
- Match and rank mentors with explained relevance.
- Manage requests, acceptance, scheduling and session records.
- Track goals, action items and feedback across the relationship.
- Detect declining engagement and prompt follow-up.
- Report programme outcomes without exposing personal contact data.

### 4. Key Features

Alumni verification workflow · professional profile with expertise tagging
· capacity and availability management with hard limits · student career
profile · ranked matching with explanations · request and accept workflow
with expiry · in-platform scheduling with calendar integration · session
logging · goal and action-item tracking · bidirectional feedback ·
engagement decay detection · programme analytics · in-platform messaging
with contact details hidden.

### 5. Functional Modules

| # | Module | Function | Independent? |
| --- | --- | --- | --- |
| M1 | Alumni Verification & Profile | Identity verification against records, professional profile, expertise | Yes — build first |
| M2 | Capacity & Availability | Concurrent mentee limits, available periods, pause and resume | Depends on M1 |
| M3 | Student Career Profile | Goals, interests, target roles and industries | Yes |
| M4 | Matching Engine | Ranked mentor suggestions with explained relevance and capacity filtering | Depends on M1, M2, M3 |
| M5 | Request & Acceptance | Requests, throttling, expiry, decline with optional reason | Depends on M4 |
| M6 | Scheduling & Sessions | Slot proposal, booking, reminders, session records | Depends on M5 |
| M7 | Goals, Actions & Feedback | Goal setting, action items, completion, bidirectional feedback | Depends on M6 |
| M8 | Engagement Monitoring | Inactivity detection, nudges, relationship health | Depends on M6, M7 |
| M9 | Messaging | In-platform messaging with contact-detail masking | Depends on M5 |
| M10 | Programme Analytics | Participation, outcomes, mentor effectiveness | Depends on M7, M8 |

### 6. User Roles & Permissions

Student — own profile, browse matches, send requests (throttled), manage
own mentoring relationships.

Alumnus or Mentor — own profile, capacity, availability, respond to
requests, run sessions, provide feedback.

Alumni Relations Officer — verification, engagement monitoring, mentor
effectiveness, programme reports.

Placement Officer — mentoring participation in relation to placement
outcomes, read-only.

Administrator — matching weights, throttle limits, engagement settings.

### 7. Technology Stack

TRACK J · Node.js + MongoDB. Calendar integration with Google Calendar
and Outlook via OAuth, video-call link generation, and Socket.IO for
messaging. Contact-detail masking is a serialisation-layer concern and
must be implemented there.

TRACK P · Python + Django + PostgreSQL. Calendar integration with
google-api-python-client and the Microsoft Graph API via OAuth. Messaging
with Channels, or plain polling if you want to hold the scope down —
polling is an acceptable v1 here and removes an entire deployment
concern. Masking belongs in one serializer or one template filter used
everywhere, never repeated per view.

### 8. Technical Requirements (deltas)

Frontend (both): mentor discovery with facets and clear capacity
indication; a mentor dashboard that makes declining easy and guilt-free;
mobile-friendly session management for busy professionals.

Backend (both): matching computed on demand with capacity filtering;
request throttling per student per period; automatic request expiry; an
engagement-decay job running weekly.

Data model (both): Alumnus, VerificationRequest, ExpertiseTag,
MentorCapacity, AvailabilityWindow, StudentProfile, CareerGoal,
MatchScore, MentorshipRequest, Mentorship, Session, Goal, ActionItem,
Feedback, Message, EngagementSnapshot.

API (both): `/alumni/verify`, `/mentors/search`, `/requests`,
`/mentorships/id/sessions`, `/mentorships/id/goals`, `/messages`,
`/analytics/programme`.

Privacy (both): alumni email and phone are never exposed to students at
any point, in any response, including matching results — test this
explicitly.

TRACK J · Node.js + MongoDB. Capacity enforcement under concurrent
acceptance handled with a conditional update that fails when the limit is
already reached.

TRACK P · Python + Django + PostgreSQL. Capacity must hold when two
students accept in the same instant: wrap acceptance in
`transaction.atomic()` with `select_for_update()` on the mentor row, or
add a `CheckConstraint` on the count. Expiry is a Celery Beat sweep over
an `expires_at` column.

### 9. Admin Dashboard

Verification queue with document review · mentor capacity overview and
overload warnings · matching weight configuration · throttle and expiry
settings · engagement health board · mentor effectiveness ranking ·
programme reporting.

### 10. Reporting & Analytics

Active mentorships and participation rate · request acceptance rate ·
session frequency and completion · goal completion rate · mentor
utilisation against capacity · engagement decay and recovery · mentoring
participation correlated with placement outcomes · mentor and student
satisfaction scores.

### 11. Notifications & Communication

Verification status · new request, with easy decline · request accepted,
declined or expired · session scheduled and reminder · action item due ·
inactivity nudge · feedback request.

### 12. Third-Party Integrations

ERP or alumni records for verification, LinkedIn (optional, profile
prefill only), Google and Outlook calendar, video-conferencing, email and
SMS, SSO.

### 13. Expected Deliverables

Per CES, plus a verified seed set of at least 50 alumni profiles.

### 14. Development Milestones

M0 discovery (1w) · M1 verification and profiles (3w) · M2 matching and
requests (3w) · M3 scheduling and messaging (3w) · M4 goals, feedback,
engagement (2w) · M5 analytics, UAT, production (2w).

### 15. Testing

Per CES. Specific: alumni contact data never appears in any
student-accessible response; capacity limits cannot be exceeded under
concurrent requests; request throttling enforced; the expiry job is
correct.

### 16. Deployment

TRACK J · Node.js + MongoDB. Per CES. Messaging server separate if
Socket.IO is used at scale.

TRACK P · Python + Django + PostgreSQL. Per CES. Polling-based messaging
keeps this a plain WSGI deployment; choosing Channels adds ASGI, so make
that choice deliberately.

### 17. Documentation

Per CES, plus a written privacy statement listing every field visible to a
student, which the alumni office can check without reading code.

### 18. Skills Students Need

TRACK J · Node.js + MongoDB. TypeScript · Next.js · Node.js · MongoDB ·
matching and ranking algorithms · OAuth and calendar APIs · real-time
messaging · privacy-conscious API design.

TRACK P · Python + Django + PostgreSQL. Python · Django · OAuth against
third-party calendars · row locking for capacity · Celery · ranking
algorithms · privacy-conscious serializer design.

### 19. Prerequisites and Readiness

Completed Data Structures and DBMS; at least one prior project;
comfortable with Git branching and pull requests. One member comfortable
with OAuth and third-party calendar APIs; the privacy requirement needs
someone who will actually test that alumni contact details never leak.
Track P gaps: OAuth flows and, if chosen, Channels.

### 20. Estimated Complexity and Semester Fit

Medium. 600–800 hours. Two semesters for a team of 4, or one semester for
a team of 5 with in-platform messaging (M9) deferred to semester 2.

### 21. Suggested Student Team

5 students — tech lead · 2 backend, one owning matching and privacy ·
frontend · QA and documentation.

### 22. Acceptance Criteria

- Alumni verification workflow completes against institutional records
  with an audit trail.
- Mentor capacity limits cannot be exceeded, including under concurrent
  acceptance.
- Student request throttling enforced and configurable.
- Alumni contact details never exposed — proven by exhaustive endpoint
  testing.
- Matching returns ranked mentors with a stated reason for each match.
- Sessions schedulable with calendar integration and reminders.
- Engagement decay detected and nudges issued.
- Programme report generated covering participation, sessions, goals and
  outcomes.

AI/ML potential: Semantic matching between student goals and mentor
experience using embeddings; predicting which mentorships will lapse, so
intervention can be targeted.

Commercialisation: Moderate to strong; alumni engagement platforms are a
real market, and the capacity-protection design is a genuine
differentiator against tools that simply expose a directory.

---

## Source Boundary

This P11-only source extract is the authoritative project reference for
the repository's PRD, SRS, HLD, database design, and API specification.
Where the project documents record an open decision, this source extract
does not invent a value; the decision remains open until confirmed by the
project team.
