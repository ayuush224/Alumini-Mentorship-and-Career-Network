# Software Requirements Specification (SRS)

## Project 11 --- Alumni Mentorship and Career Network

| Field | Value |
| --- | --- |
| Product | Verified Alumni Mentorship Matching and Engagement Platform |
| Project ID | P11 |
| Document | Software Requirements Specification (SRS) |
| Version | 1.0 |
| Status | Foundation Draft |
| Primary Source | P11 Product Requirements Document (PRD) v1.0 |
| Reference Standard | EduRev Common Engineering Standard (CES) |

---

## Table of Contents

| No. | Section | Purpose |
| ---: | --- | --- |
| 1 | [Introduction](#1-introduction) | Establishes the purpose, scope, terminology, and requirement conventions. |
| 2 | [System Overview](#2-system-overview) | Describes the system-level view derived from the P11 product requirements baseline. |
| 3 | [Actors and Access Context](#3-actors-and-access-context) | Defines system actors and their software access context. |
| 4 | [Functional Requirement Structure](#4-functional-requirement-structure) | Defines how functional requirements are organised and identified. |
| 5 | [M1 — Alumni Verification and Profile](#5-m1--alumni-verification-and-profile) | Specifies verification and mentor-profile behaviour. |
| 6 | [M2 — Capacity and Availability](#6-m2--capacity-and-availability) | Specifies mentor capacity and availability behaviour. |
| 7 | [M3 — Student Career Profile](#7-m3--student-career-profile) | Specifies student career-profile behaviour. |
| 8 | [M4 — Mentor Discovery and Matching](#8-m4--mentor-discovery-and-matching) | Specifies discovery, filtering, ranking, and explanation behaviour. |
| 9 | [M5 — Mentorship Requests and Acceptance](#9-m5--mentorship-requests-and-acceptance) | Specifies request, throttling, expiry, decline, and acceptance behaviour. |
| 10 | [M6 — Scheduling and Sessions](#10-m6--scheduling-and-sessions) | Specifies scheduling and session-record behaviour. |
| 11 | [M7 — Goals, Actions, and Feedback](#11-m7--goals-actions-and-feedback) | Specifies progress and feedback behaviour. |
| 12 | [M8 — Engagement Monitoring](#12-m8--engagement-monitoring) | Specifies engagement assessment and nudging behaviour. |
| 13 | [M9 — Messaging](#13-m9--messaging) | Specifies supporting/deferrable relationship-scoped communication. |
| 14 | [M10 — Programme Analytics](#14-m10--programme-analytics) | Specifies programme reporting and analytics behaviour. |
| 15 | [Cross-Cutting System Requirements](#15-cross-cutting-system-requirements) | Specifies requirements shared across multiple modules. |
| 16 | [Security and Privacy Requirements](#16-security-and-privacy-requirements) | Specifies security, authorization, privacy, and audit requirements. |
| 17 | [Non-Functional Requirements](#17-non-functional-requirements) | Specifies measurable quality attributes required by CES and P11. |
| 18 | [External System Requirements](#18-external-system-requirements) | Specifies behaviour at institutional and third-party integration boundaries. |
| 19 | [System States and Transition Rules](#19-system-states-and-transition-rules) | Defines mandatory lifecycle states and valid transitions. |
| 20 | [System-Level Acceptance Requirements](#20-system-level-acceptance-requirements) | Converts acceptance outcomes into testable system conditions. |
| 21 | [Open Requirements](#21-open-requirements) | Records requirements whose business values are not yet defined. |
| 22 | [Requirement Traceability](#22-requirement-traceability) | Maps requirements to PRD and P11 source areas. |

---

# 1. Introduction

## 1.1 Purpose

This SRS defines the **software requirements** for P11.

It translates the P11 product requirements baseline into precise,
observable, and testable system behaviour.

The SRS specifies:

- system functions;
- actor interactions;
- business-rule enforcement;
- state transitions;
- authorization behaviour;
- validation behaviour;
- privacy behaviour;
- error behaviour;
- notifications;
- auditability;
- external-system interaction requirements;
- measurable non-functional requirements;
- system-level acceptance conditions.

---

## 1.2 Scope of the System

The system shall support the complete mentoring lifecycle. Alumni
onboarding and the student career profile are independent flows that
come together during mentor discovery and matching:

```text
ALUMNI                              STUDENT
  │                                    │
Verification & Profile            Career Profile
  │                                    │
Capacity & Availability            Goals / Interests
  │                                    │
  └──────────────► Mentor Pool ◄──────┘
                         │
                         ▼
                 Mentor Discovery
                         ↓
                 Matching & Ranking
                         ↓
                Mentorship Request
                         ↓
                Accept / Decline / Expire
                         ↓
                    Mentorship
                         ↓
                Scheduling & Sessions
                         ↓
                 Goals & Action Items
                         ↓
                      Feedback
                         ↓
                Engagement Monitoring
                         ↓
                 Programme Reporting
```

Messaging and notifications shall support the lifecycle wherever
applicable.

---

## 1.3 Source of Requirements

The requirements in this document are derived from:

1.  the P11 PRD v1.0 baseline;
2.  the authoritative P11 source extract in `docs/P11_Project_Source.md`;
3.  the applicable Common Engineering Standard.

The P11 specification defines the core capabilities, actors,
project-specific correctness guarantees, privacy requirements, testing
expectations, integrations, and acceptance criteria.

---

## 1.4 Requirement Language

The following terms are used consistently:

---

| Term | Meaning |
| --- | --- |
| **Shall** | Mandatory system requirement. |
| **Shall not** | Prohibited system behaviour. |
| **Should** | Recommended behaviour where the requirement is not mandatory. |
| **May** | Optional capability. |

---

A requirement marked **Shall** is mandatory unless explicitly deferred
from the approved release scope.

---

## 1.5 Requirement Quality Rules

Each normative requirement in this SRS should be:

- uniquely identified;
- implementation-independent where possible;
- observable through system behaviour;
- testable;
- traceable to the PRD or project source.

---

# 2. System Overview

## 2.1 System Responsibilities

The system shall provide software support for:

- alumni verification;
- mentor profile management;
- capacity and availability;
- student career profiles;
- mentor discovery;
- matching and ranking;
- mentorship request management;
- mentoring relationships;
- scheduling and sessions;
- goals and action items;
- feedback;
- engagement monitoring;
- messaging;
- notifications;
- programme analytics;
- authorization;
- auditability;
- privacy protection.

---

## 2.2 Core System Invariants

The following conditions shall always hold:

**INV-01 --- Verified Mentor:**\
Only a verified alumni participant may act as an Alumni Mentor.

**INV-02 --- Capacity:**\
A mentor's active mentee count shall never exceed the mentor's
configured capacity.

**INV-03 --- Request Throttling:**\
A student shall never bypass the configured mentorship-request limit.

**INV-04 --- Request Expiry:**\
An expired request shall not later produce an active mentorship.

**INV-05 --- Relationship Validity:**\
A mentorship relationship shall exist only as the result of an accepted
eligible request.

**INV-06 --- Privacy:**\
Student-accessible system output shall never contain a mentor's private
email address or phone number.

**INV-07 --- Authorization:**\
A user shall only access information and actions permitted by their role
and relationship to the resource.

---

# 3. Actors and Access Context

## 3.1 Student

The system shall provide students with access to:

- their own career profile;
- eligible mentor discovery;
- matching results;
- permitted mentor information;
- their mentorship requests;
- their mentoring relationships;
- sessions associated with their relationships;
- goals and action items associated with their relationships;
- permitted messages;
- feedback relevant to their relationships.

Students shall not access other users' private information unless
explicitly permitted by a separate authorized role.

---

## 3.2 Alumni Mentor

The system shall provide verified mentors with access to:

- their own professional profile;
- expertise and mentoring interests;
- capacity and availability;
- incoming requests;
- accepted mentoring relationships;
- sessions;
- goals and action items;
- permitted messages;
- feedback.

An unverified alumni participant shall not receive mentor-only
capabilities.

---

## 3.3 Alumni Relations Officer

The system shall provide the Alumni Relations Officer with access to:

- verification workflows;
- verification outcomes/history;
- engagement monitoring;
- mentor-effectiveness information;
- programme reporting.

---

## 3.4 Placement Officer

The system shall provide read-only access to information required to
relate:

- mentoring participation; and
- available placement outcomes.

---

## 3.5 Administrator

The system shall provide authorized administrators with access to
programme configuration for:

- matching behaviour/weights;
- request throttling;
- request expiry;
- engagement settings.

---

# 4. Functional Requirement Structure

Functional requirements are grouped by the ten P11 modules defined in
the source specification. The module dependency ordering is preserved
from P11: M1 is the initial verification/profile module; M2 depends on
M1; M3 is independent; M4 depends on M1--M3; M5 depends on M4; M6
depends on M5; M7 depends on M6; M8 depends on M6 and M7; M9 depends on
M5; and M10 depends on M7 and M8.

Requirement identifiers use this form:

```text
FR-M1-01
FR-M2-01
...
FR-M10-01
```

Cross-cutting requirements use:

```text
CFR-xx
```

Security requirements:

```text
SEC-xx
```

Privacy requirements:

```text
PRV-xx
```

Non-functional requirements:

```text
NFR-<category>-xx
```

---

# 5. M1 — Alumni Verification and Profile

## 5.1 Verification

### FR-M1-01 --- Verification Request

The system shall allow an eligible alumni participant to submit a verification
request.

### FR-M1-02 --- Verification Against Institutional Records

The system shall evaluate the submitted verification information against
the institution's approved alumni verification source or process.

### FR-M1-03 --- Verification Status

The system shall maintain the current verification status of each
verification request.

The status shall distinguish at least:

- pending verification;
- verified;
- rejected.

### FR-M1-04 --- Verification Outcome

The system shall record the outcome of a verification request.

### FR-M1-05 --- Verification History

The system shall preserve sufficient verification history to establish
that a mentor's verified status resulted from an approved verification
process.

### FR-M1-06 --- Mentor Eligibility

The system shall prevent an unverified alumni participant from performing
mentor-only actions.

### FR-M1-07 --- Verification Notification

The system shall notify the alumni participant when the verification status
changes.

---

## 5.2 Professional Profile

### FR-M1-08 --- Profile Creation

A verified mentor shall be able to create a professional mentoring
profile.

### FR-M1-09 --- Profile Update

A mentor shall be able to update their own permitted profile
information.

### FR-M1-10 --- Expertise

The system shall allow a mentor to associate expertise areas with their
profile.

### FR-M1-11 --- Mentoring Interests

The system shall allow a mentor to specify mentoring areas/interests.

### FR-M1-12 --- Profile Completeness

The system shall identify whether the required mentor-profile
information is complete.

### FR-M1-13 --- Student-Visible Profile

The system shall expose only information approved for student visibility
when a mentor is displayed to a student.

---

# 6. M2 — Capacity and Availability

## 6.1 Capacity

### FR-M2-01 --- Capacity Definition

A mentor shall be able to define a maximum number of concurrent active
mentees.

### FR-M2-02 --- Capacity Enforcement

The system shall prevent the creation of an active mentorship when the
mentor has already reached their configured capacity.

### FR-M2-03 --- Capacity Revalidation

The system shall re-evaluate current capacity at the moment an
acceptance operation attempts to create an active mentorship.

### FR-M2-04 --- Concurrent Capacity Guarantee

The system shall preserve the configured capacity limit when multiple
acceptance operations target the same mentor concurrently.

### FR-M2-05 --- Capacity Availability

The system shall determine whether a mentor currently has capacity to
accept another mentee.

---

## 6.2 Availability

### FR-M2-06 --- Availability Periods

A mentor shall be able to define periods during which mentoring
participation is available.

### FR-M2-07 --- Pause

A mentor shall be able to pause acceptance of new mentoring
relationships.

### FR-M2-08 --- Resume

A mentor shall be able to resume acceptance of new mentoring
relationships.

### FR-M2-09 --- Availability Effect

A paused or otherwise unavailable mentor shall not become an available
request target.

---

# 7. M3 — Student Career Profile

### FR-M3-01 --- Career Profile

The system shall allow a student to create and update their career
profile.

### FR-M3-02 --- Career Goals

The system shall allow a student to record career goals.

### FR-M3-03 --- Interests

The system shall allow a student to record career interests.

### FR-M3-04 --- Target Roles

The system shall allow a student to record target roles.

### FR-M3-05 --- Target Industries

The system shall allow a student to record target industries.

### FR-M3-06 --- Profile Ownership

A student shall only modify their own career profile.

### FR-M3-07 --- Matching Availability

Relevant career-profile information shall be available to the matching
process when the student is eligible for mentor discovery.

---

# 8. M4 — Mentor Discovery and Matching

## 8.1 Discovery

### FR-M4-01 --- Mentor Discovery

The system shall allow eligible students to discover available mentors.

### FR-M4-02 --- Filters and Facets

The system shall provide relevant mentor-discovery filters/facets based
on supported professional and mentoring information.

### FR-M4-03 --- Capacity Indication

The system shall provide a clear indication of relevant mentor capacity
during discovery.

### FR-M4-04 --- Availability Filtering

The system shall exclude mentors who are not currently eligible to
accept a new mentee from the available request-target set.

---

## 8.2 Matching

### FR-M4-05 --- Matching Inputs

The matching process shall consider relevant information from:

- student career goals;
- student interests;
- target roles;
- target industries;
- mentor expertise;
- mentor mentoring interests;
- mentor capacity/availability.

### FR-M4-06 --- Ranked Results

The system shall return matching mentors in ranked order.

### FR-M4-07 --- Explainable Recommendation

Each mentor recommendation presented to a student shall include an
understandable explanation of relevance.

### FR-M4-08 --- Capacity-Aware Ranking

A mentor who cannot accept another mentee shall not be presented as an
available recommendation.

### FR-M4-09 --- Configurable Matching Behaviour

The system shall support administrator-controlled matching behaviour and
matching weights.

### FR-M4-10 --- Explanation Consistency

The explanation presented for a recommendation shall accurately reflect
the matching factors that contributed to that recommendation.

The system shall not fabricate matching reasons.

---

# 9. M5 — Mentorship Requests and Acceptance

## 9.1 Request Creation

### FR-M5-01 --- Create Request

An eligible student shall be able to submit a mentorship request to an
eligible available mentor.

### FR-M5-02 --- Request Eligibility

Before creating a request, the system shall verify:

1.  the student is authorized to request mentorship;
2.  the target mentor is eligible;
3.  the mentor is accepting new mentees;
4.  the student has not exceeded the configured request limit.

### FR-M5-03 --- Request Record

The system shall retain the current status and relevant history of each
mentorship request.

---

## 9.2 Throttling

### FR-M5-04 --- Request Throttling

The system shall enforce the configured maximum number of mentorship
requests for a student during the applicable period.

### FR-M5-05 --- Non-Bypassable Throttling

A student shall not bypass request throttling by repeating, replaying,
or submitting equivalent request operations through another client
interaction.

### FR-M5-06 --- Configurable Throttling

Authorized administrators shall be able to configure the applicable
throttling policy.

---

## 9.3 Mentor Response

### FR-M5-07 --- Request Review

The system shall allow a mentor to review incoming mentorship requests
addressed to them.

### FR-M5-08 --- Accept

A mentor shall be able to accept an eligible request.

### FR-M5-09 --- Decline

A mentor shall be able to decline a request without being required to
provide a reason.

### FR-M5-10 --- Optional Decline Reason

The system may capture an optional decline reason.

### FR-M5-11 --- Easy Decline

The system shall make the decline operation directly accessible from the
mentor's request-review workflow without requiring unnecessary actions.

---

## 9.4 Expiry

### FR-M5-12 --- Automatic Expiry

The system shall automatically expire unanswered requests according to
the configured expiry policy.

### FR-M5-13 --- Expiry Eligibility

Only unanswered, still-active requests shall be eligible for automatic
expiry.

### FR-M5-14 --- Expired Request

An expired request shall no longer be eligible for acceptance.

### FR-M5-15 --- Expiry Processing

Expiry processing shall operate independently of a user's manual page
visit.

---

## 9.5 Acceptance and Mentorship Creation

### FR-M5-16 --- Capacity Recheck at Acceptance

At acceptance time, the system shall revalidate mentor eligibility,
participation status, and available capacity.

### FR-M5-17 --- Concurrent Acceptance

When concurrent acceptances target the same mentor, no more active
mentorships shall be created than the mentor's configured capacity.

### FR-M5-18 --- Failed Acceptance

If an acceptance condition is no longer satisfied, the system shall
reject the acceptance and shall not create the active mentorship.

### FR-M5-19 --- Relationship Creation

A successful acceptance shall create the corresponding mentorship
relationship exactly once.

### FR-M5-20 --- Request Outcome Notification

The system shall notify the relevant student when a request is accepted,
declined, or expired.

### FR-M5-21 --- End Mentorship

An authorized participant shall be able to end an active mentorship
relationship according to the programme policy.

---

# 10. M6 — Scheduling and Sessions

## 10.1 Scheduling

### FR-M6-01 --- Slot Proposal

Participants in an active mentorship shall be able to propose a session
time.

### FR-M6-02 --- Booking

Participants shall be able to confirm a proposed session.

### FR-M6-03 --- Valid Mentorship

A session shall only be created for an authorized active mentorship
relationship.

### FR-M6-04 --- Calendar Integration

Where calendar integration is enabled, the system shall create or
synchronize the mentoring session with the selected supported calendar
service according to the integration's supported behaviour.

### FR-M6-05 --- Scheduling Failure

If required calendar synchronization fails, the system shall not
represent the session as successfully synchronized.

---

## 10.2 Session Management

The session lifecycle shall support proposal, booking, completion, and
cancellation.

### FR-M6-06 --- Session Record

The system shall maintain a record for each proposed, scheduled,
completed, or cancelled mentoring session.

### FR-M6-07 --- Session Status

The system shall maintain a distinguishable lifecycle status for each
mentoring session.

### FR-M6-08 --- Dynamic Session Duration

Mentors shall be able to configure dynamic session durations (from 15 to 240+ minutes, or custom minutes), and the exact duration along with starting time shall be rendered visibly in student and mentor dashboards.

### FR-M6-09 --- Group / Cohort Scheduling

Mentors shall be able to schedule cohort mentoring sessions broadcast to all active mentees simultaneously (`isAllMentees: true`), enabling shared topical workshops and office hours.

### FR-M6-10 --- Overlap Guard & Concurrency Protection

The system shall prevent double-booking collisions by slicing session intervals into discrete 5-minute atomic slots (`MentorSessionSlot`) backed by a unique compound index (`{ mentorId: 1, slot: 1 }`), ensuring concurrent booking attempts fail safely without data corruption.

### FR-M6-11 --- 15-Minute Privacy Meeting Link Gating

In adherence to Invariant 2, video conference URLs (`location` / `meetingLink`) shall remain redacted for students until 15 minutes prior to the scheduled session start time, displaying a clear privacy notice in the interface.

### FR-M6-12 --- Reminder

The system shall generate a reminder for scheduled mentoring sessions
according to the configured reminder policy.

### FR-M6-13 --- Session Access

Only authorized participants and authorized institutional roles shall
access session information.

---

# 11. M7 — Goals, Actions, and Feedback

## 11.1 Goals

### FR-M7-01 --- Goal Creation

Authorized participants shall be able to create a goal within an active
mentorship.

### FR-M7-02 --- Goal Status

The system shall maintain the current status/progress of each mentoring
goal.

### FR-M7-03 --- Goal Update

Authorized participants shall be able to update the permitted fields of
a goal.

---

## 11.2 Action Items & Sub-Tasks

### FR-M7-04 --- Action Item Creation

Authorized participants shall be able to create action items associated
with a mentoring relationship. Mentees can add personal sub-tasks from their dashboard, and mentors can assign targeted action items to specific mentees from their active roster.

### FR-M7-05 --- Mentor-Scoped Task Isolation

Action items and sub-tasks assigned by a mentor shall be scoped strictly to that mentor-mentee pairing (`mentorId` / `mentorshipId`). In the mentee workspace, tasks shall only be visible when the corresponding mentor is selected, preventing cross-mentor noise.

### FR-M7-06 --- Action Item Status & Sorting

The system shall maintain the completion state of each action item and render tasks sorted by nearest upcoming due date first.

### FR-M7-07 --- Action Completion & Gamified Reputation Points

An authorized participant shall be able to mark an action item as completed. Completing a mentor-assigned action item shall atomically award +20 reputation points to the student's verified profile, guarded by an idempotency flag (`pointsAwarded: true`).

### FR-M7-08 --- Action Due Notification

The system shall notify the relevant participant when an action item
becomes due, according to the notification policy.

---

## 11.3 Feedback

### FR-M7-09 --- Student Feedback

The student shall be able to submit permitted feedback for their
mentorship experience.

### FR-M7-10 --- Mentor Feedback

The mentor shall be able to submit permitted feedback for their
mentorship experience.

### FR-M7-11 --- Satisfaction Data

The system shall retain information required to calculate student and
mentor satisfaction metrics.

### FR-M7-11 --- Effectiveness Data

The system shall retain information required to support
mentor-effectiveness reporting.

---

# 12. M8 — Engagement Monitoring

## 12.1 Engagement Assessment

### FR-M8-01 --- Activity Tracking

The system shall record activity relevant to evaluating mentoring
engagement.

### FR-M8-02 --- Engagement Criteria

The system shall evaluate a mentorship against the configured criteria
for declining engagement.

### FR-M8-03 --- Relationship Health

The system shall maintain an engagement/relationship-health outcome for
authorized programme users.

---

## 12.2 Follow-Up

### FR-M8-04 --- Engagement Nudge

When a mentorship meets the configured declining-engagement condition,
the system shall issue the corresponding follow-up nudge.

### FR-M8-05 --- Weekly Engagement Assessment

The system shall run the engagement-decay assessment on a weekly
schedule rather than depending on a user visiting the application.

### FR-M8-06 --- Reassessment

The system shall reassess relationship engagement after subsequent
relevant activity.

### FR-M8-07 --- Recovery

The system shall be able to identify when a previously declining
relationship returns to an acceptable engagement condition.

### FR-M8-08 --- Configurable Engagement Settings

Authorized administrators shall be able to configure engagement
settings.

The P11 source specifies a weekly engagement-decay job; the exact decay
thresholds are a product decision recorded in the open requirements
section.

---

# 13. M9 — Messaging

Messaging is a supporting and deferrable capability in the approved PRD.
The following requirements apply when messaging is enabled for a release;
deferring messaging does not invalidate the core mentoring lifecycle.

### FR-M9-01 --- Relationship Messaging

The system shall allow authorized participants in an eligible mentorship
relationship to exchange messages within the platform.

### FR-M9-02 --- Relationship Authorization

A user shall not read or send messages for a mentorship relationship in
which they are not authorized to participate.

### FR-M9-03 --- Message History

The system shall make messages available to authorized participants in
the current conversation according to the configured message-history
policy.

### FR-M9-04 --- Contact Privacy

Messaging shall not expose the mentor's private email address or phone
number to the student.

### FR-M9-05 --- Message Notification

The system shall notify a recipient of a new message through an enabled
notification mechanism.

---

# 14. M10 — Programme Analytics

## 14.1 Participation

### FR-M10-01

The system shall provide the number of active mentorships.

### FR-M10-02

The system shall provide programme participation information.

### FR-M10-03

The system shall provide the number of active mentors and relevant
participation measures.

---

## 14.2 Requests

### FR-M10-04

The system shall report mentorship request outcomes, including
acceptance, decline, and expiry.

---

## 14.3 Sessions and Goals

### FR-M10-05

The system shall report session frequency and completion.

### FR-M10-06

The system shall report goal completion.

### FR-M10-07

The system shall report action-item completion where the metric is
enabled.

---

## 14.4 Mentor Capacity

### FR-M10-08

The system shall report mentor utilisation against configured capacity.

---

## 14.5 Engagement

### FR-M10-09

The system shall report engagement decay.

### FR-M10-10

The system shall report engagement recovery where recovery is measured.

---

## 14.6 Satisfaction and Effectiveness

### FR-M10-11

The system shall provide student satisfaction measures.

### FR-M10-12

The system shall provide mentor satisfaction measures.

### FR-M10-13

The system shall provide authorized mentor-effectiveness information.

---

## 14.7 Placement Outcomes

### FR-M10-14

The system shall support reporting that relates mentoring participation
to available placement outcomes for authorized institutional users.

### FR-M10-15

The system shall apply role-appropriate access restrictions to
placement-related analytics.

---

# 15. Cross-Cutting System Requirements

## 15.1 Consistency and Idempotency

### CFR-01 --- Valid State

Each successful business operation shall leave affected records in a
valid state consistent with the operation's outcome.

### CFR-02 --- Idempotent Automatic Processing

Automatic processing that may be retried shall not create duplicate
business outcomes.

### CFR-03 --- Duplicate Acceptance Prevention

Repeated processing of the same acceptance request shall not create more
than one active mentorship relationship.

### CFR-04 --- Duplicate Expiry Prevention

Repeated processing of the same expiry candidate shall not create
multiple expiry outcomes.

---

## 15.2 Time and Scheduling

### CFR-05

The system shall use timezone-aware date/time values for:

- availability;
- request expiry;
- sessions;
- reminders;
- scheduled engagement assessment.

### CFR-06

User-visible date/time information shall clearly represent the
applicable timezone or local interpretation.

---

## 15.3 Configuration

### CFR-07

The system shall use centrally managed configuration for:

- request throttling;
- request expiry;
- matching weights;
- engagement settings.

### CFR-08

Configuration changes shall take effect according to their defined
effective behaviour and shall not require users to alter their own data
to observe the new policy.

---

## 15.4 Pagination and Large Result Sets

### CFR-09

Result sets that can grow beyond a practical screen size shall support
bounded retrieval rather than returning an unbounded result set.

---

# 16. Security and Privacy Requirements

## 16.1 Authorization

### SEC-01 --- Server-Side Authorization

Authorization shall be enforced server-side for every protected
operation.

### SEC-02 --- Role-Based Access

Access decisions shall account for the actor's assigned role.

### SEC-03 --- Resource Relationship Checks

Where access depends on ownership or participation in a mentoring
relationship, the system shall verify the actor's relationship to the
resource.

### SEC-04 --- No Client-Side Trust

The system shall not rely on client-side UI hiding as an authorization
mechanism.

### SEC-05 --- Direct-Object Access Protection

Changing a resource identifier in a client request shall not allow an
unauthorized actor to access that resource.

---

## 16.2 Authentication

### SEC-06

The system shall use the approved authentication mechanism defined by
the selected project delivery track and university identity
arrangements.

### SEC-07 --- Administrative MFA

Administrative roles shall be protected by multi-factor authentication
as required by the CES.

---

## 16.3 Rate Limiting and Brute-Force Protection

### SEC-08

Authentication and other security-sensitive operations shall be
protected against abusive request rates.

### SEC-09

The system shall apply rate limiting independently to source IP address
and authenticated user identity when those values are available.

### SEC-10

Authentication endpoints shall have brute-force protection.

---

## 16.4 Input Validation

### SEC-11

Every externally supplied input shall undergo server-side validation.

### SEC-12

Invalid input shall not result in a successful protected operation.

---

## 16.5 Alumni Contact Privacy

### PRV-01

The system shall never expose an alumni mentor's email address to a
student.

### PRV-02

The system shall never expose an alumni mentor's phone number to a
student.

### PRV-03

The restrictions in PRV-01 and PRV-02 shall apply to every
student-accessible system response or view, including:

- mentor discovery;
- matching results;
- mentor profile views;
- mentorship views;
- messaging;
- notifications;
- search/filter responses.

### PRV-04

An active mentorship relationship shall not, by itself, grant a student
access to the mentor's private email address or phone number.

### PRV-05 --- Prohibited Contact Fields

Student-accessible system interfaces shall not return prohibited alumni
contact fields.

---

## 16.6 Personal Data in Telemetry

### PRV-06

The system shall not place unnecessary personal data in:

- application logs;
- error responses;
- analytics events.

---

## 16.7 Encryption and Transport Security

### SEC-13

Data transmission shall use TLS 1.2 or higher.

### SEC-14

The system shall protect stored sensitive personal information in
accordance with applicable institutional security requirements, including
field-level protection for sensitive identity data where applicable.

---

## 16.8 Audit Logging

### SEC-15

Privileged actions shall generate immutable audit records.

Audit records shall contain, where applicable:

- actor;
- action;
- target;
- before state;
- after state;
- timestamp;
- originating IP information.

### SEC-16

Ordinary users shall not be able to modify privileged audit records.

### SEC-17

Audit records shall not contain unnecessary personal information.

The CES explicitly requires immutable audit logs for privileged actions.

---

## 16.9 Dependency Security

### SEC-18

Dependency vulnerability scanning shall be performed as part of CI.

### SEC-19

The delivered system shall have no unresolved High or Critical
dependency vulnerabilities at handover.

---

## 16.10 Security Risk Coverage

### SEC-20

The system's security controls and verification activities shall address
the applicable OWASP Top 10 risks.

---

## 16.11 File Upload and Data-Protection Requirements

### SEC-21

Uploaded verification documents shall be validated server-side using the
declared MIME type, detected file signature (magic bytes), and configured
size limits.

### SEC-22

Uploaded verification documents shall be scanned for malware before they
are made available for administrative review or other permitted access.

### SEC-23

Verification document binaries shall be stored outside the application
web root and accessed only through authorized, short-lived signed URLs.

### PRV-07

The system shall apply purpose limitation and retain consent records
where required by applicable data-protection obligations.

### PRV-08

The system shall support approved data-subject access and deletion
requests or the institutional process used to fulfil them, subject to
mandatory retention and audit obligations.

---

# 17. Non-Functional Requirements

These requirements are inherited from the Common Engineering Standard
unless P11 specifies a stricter project-specific requirement.

## 17.1 Performance

### NFR-PERF-01

The system shall support:

- 2,000 sustained concurrent users;
- 5,000 peak concurrent users.

These targets shall be evaluated using a documented load-test profile
that represents normal and peak academic usage over a defined test
window.

### NFR-PERF-02

Read API operations shall achieve p95 latency below 400 ms under the
load profile defined for NFR-PERF-01.

### NFR-PERF-03

Write API operations shall achieve p95 latency below 800 ms under the
load profile defined for NFR-PERF-01.

### NFR-PERF-04

Interactive dashboard/report generation shall complete in under 3
seconds.

### NFR-PERF-05

Long-running report generation shall execute as background work and
provide completion notification.

### NFR-PERF-06

Student-facing page load shall target LCP below 2.5 seconds on a 4G
connection.

---

## 17.2 Availability

### NFR-AVAIL-01

The system shall achieve at least 99.5% availability measured monthly
during published academic service hours, excluding approved planned
maintenance announced in advance.

---

## 17.3 Accessibility

### NFR-ACC-01

All student-facing screens shall meet WCAG 2.2 AA.

### NFR-ACC-02

The delivered student-facing pages shall have zero critical
accessibility violations under the required accessibility testing
process.

### NFR-ACC-03

Student-facing interfaces shall remain usable at 360 px responsive
width.

---

## 17.4 Browser Support

### NFR-BR-01

The system shall support the last two versions of:

- Chrome;
- Edge;
- Firefox;
- Safari.

---

## 17.5 Internationalisation

### NFR-I18N-01

User-facing strings shall be externalised so additional locales can be
added without changing business logic.

### NFR-I18N-02

English shall be supported at launch.

### NFR-I18N-03

Hindi and Punjabi strings shall be externalised for future localisation.

---

## 17.6 Backup and Recovery

### NFR-BKP-01

Automated daily backups shall be performed.

### NFR-BKP-02

Backup restoration shall be tested and documented.

---

## 17.7 Retention

### NFR-RET-01

Retention shall be configurable by entity.

### NFR-RET-02

Academic records, where present, shall follow the CES seven-year
baseline.

---

## 17.8 Maintainability and Testability

### NFR-MAIN-01

Business rules shall be testable independently of the user-interface
layer.

### NFR-MAIN-02

The system shall maintain a clear separation between user interaction
and business-rule enforcement.

### NFR-MAIN-03

A change to a business rule shall not require duplication of the same
rule across unrelated interface paths.

---

# 18. External System Requirements

The following requirements define **software behaviour at the
integration boundary**. They do not define API contracts or
implementation architecture.

## 18.1 Institutional Alumni Records

### EXT-01

The system shall be able to obtain the information necessary to perform
approved alumni verification.

### EXT-02

The system shall distinguish a successful verification result from an
unsuccessful or unavailable verification result.

### EXT-03

A temporary external verification failure shall not be treated as
successful verification.

---

## 18.2 University SSO

### EXT-04

The system shall support the university's approved sign-in mechanism.

### EXT-05

A successful sign-in shall establish the user's system identity and
assigned role.

### EXT-06

An unsuccessful authentication attempt shall not create an authenticated
application session.

---

## 18.3 Calendar Services

### EXT-07

Where enabled, the system shall support Google Calendar and Microsoft
Outlook calendar integration through OAuth authorization.

### EXT-08

A calendar authorization failure shall not grant calendar access.

### EXT-09

A calendar integration failure shall not silently represent an
unsynchronized calendar operation as successful.

---

## 18.4 Video Conferencing

### EXT-10

Where video-conferencing integration is enabled, the system shall be
able to associate a supported meeting link with the mentoring session.

---

## 18.5 Email and SMS

### EXT-11

The system shall be able to send enabled notifications through approved
email/SMS channels.

### EXT-12

Notification delivery failure shall not change the underlying business
state unless explicitly defined by the notification policy.

---

## 18.6 LinkedIn

### EXT-13

If LinkedIn integration is enabled, it shall be restricted to the
approved profile-prefill use case.

### EXT-14

LinkedIn shall not be required for core mentor verification, discovery,
matching, or mentorship operation.

---

## 18.7 Placement Records

### EXT-15

Where placement-outcome reporting is enabled, the system shall obtain
placement outcomes only from an institution-approved source or adapter.

### EXT-16

The system shall distinguish unavailable placement-source data from a
valid result containing no placement outcomes.

### EXT-17

Placement outcomes shall remain institution-scoped and shall be available
only to authorized institutional analytics roles. They shall not be
exposed directly to students or mentors.

---

# 19. System States and Transition Rules

The following states define required observable lifecycle behaviour.

## 19.1 Verification

```text
Pending
  ├──→ Verified
  └──→ Rejected
```

### ST-01

Only a pending verification request may transition to a verification
outcome.

### ST-02

A rejected or verified verification request shall not be treated as
pending.

---

## 19.2 Mentorship Request

```text
Pending
  ├──→ Accepted
  ├──→ Declined
  └──→ Expired
```

### ST-03

Only a pending request may be accepted or declined.

### ST-04

Only a pending unanswered request may expire.

### ST-05

An accepted, declined, or expired request shall not transition back to
pending through ordinary user action.

### ST-06

An expired request shall never create an active mentorship.

---

## 19.3 Mentorship

The system shall distinguish an active mentorship relationship from a
non-active or ended relationship condition.

The mentorship lifecycle shall support:

```text
Active
   ↓
Ended
```

### ST-07

Only a valid accepted request may create an active mentorship.

### ST-08

An active mentorship shall be the parent context for its valid sessions,
goals, actions, feedback, messages, and engagement records.

### ST-08A

Only an active mentorship may transition to ended. Ending the relationship
shall release its active capacity allocation while preserving historical
records according to the retention policy.

---

## 19.4 Session

The system shall distinguish at least:

```text
Proposed
   ├──→ Scheduled
   └──→ Cancelled

Scheduled
   ├──→ Completed
   └──→ Cancelled
```

### ST-09

A session cannot be marked scheduled unless it is in the proposed state.
A proposed session may be cancelled, while a scheduled session may be
marked completed or cancelled. Completed and cancelled sessions cannot be
reopened.

---

## 19.5 Engagement

The system shall represent an engagement condition sufficient to
distinguish healthy or active engagement from declining engagement and
inactivity. The exact state taxonomy remains configurable through the
open engagement requirements.

### ST-10

A relationship shall be identified as showing declining engagement when
the configured criteria are met.

### ST-11

A relationship shall be identified as recovered after qualifying activity
demonstrates recovery.

### ST-12

A relationship shall be identified as inactive when the configured
inactivity condition is met.

---

# 20. System-Level Acceptance Requirements

The following requirements directly operationalize the P11 acceptance
outcomes. The P11 source explicitly requires verification with an audit
trail, protected capacity including concurrency, configurable
throttling, absolute contact privacy, ranked/explained matching,
scheduling with calendar integration and reminders, engagement
detection/nudges, and programme reporting.

---

| ID | System Acceptance Requirement | Verification |
| --- | --- | --- |
| AC-01 | Alumni verification completes against institutional records and produces an audit trail. | Successful end-to-end verification and audit evidence |
| AC-02 | Mentor capacity cannot be exceeded under normal or concurrent acceptance. | Concurrent acceptance test |
| AC-03 | Student mentorship-request throttling is enforced and configurable. | Configuration and positive/negative test evidence |
| AC-04 | Alumni email and phone details are absent from every student-accessible endpoint response and view. | Exhaustive authorization and privacy testing |
| AC-05 | Matching returns ranked mentors with an understandable reason for every displayed recommendation. | Matching test dataset and result evidence |
| AC-06 | Sessions can be scheduled with enabled calendar integration and reminders. | End-to-end scheduling test |
| AC-07 | Declining engagement is detected and the appropriate nudge is issued. | Engagement test and notification evidence |
| AC-08 | Programme reporting covers participation, sessions, goals, and outcomes. | Generated programme report |
| AC-09 | Student-facing screens satisfy WCAG 2.2 AA requirements. | Accessibility test evidence |
| AC-10 | Security controls required by CES are evidenced and no High/Critical dependency findings remain at handover. | Security and dependency reports |

---

## 20.1 CES Testing Requirements

The system shall satisfy the applicable CES testing baseline:

- unit testing with at least 70% statement coverage for domain/service
  layers;
- component/form testing for shared components and forms;
- integration testing for every endpoint, including
  authorization-failure paths;
- end-to-end testing for every critical journey named by the project's
  acceptance criteria;
- load testing against the concurrency targets;
- security testing;
- accessibility testing;
- explicit concurrency testing where P11 defines correctness
  guarantees;
- 10 working days of UAT with defect severity classification.

These requirements come from the shared CES testing baseline.

---

# 21. Open Requirements

The following requirements cannot yet be frozen because the approved PRD
records them as unresolved product decisions.

## 21.1 Verification

- Authoritative alumni record source.
- Exact verification input set.
- Allowed verification-document file types, size limits, and malware
  scanning policy.
- Exact rejected-verification retry behaviour.

## 21.2 Capacity

- Default mentor capacity.
- Permitted capacity range.
- Exact definition of "active mentee."
- Behaviour when a mentor attempts to reduce capacity below their current
  number of active mentees.

## 21.3 Requests

- Maximum student requests per period.
- Request expiry duration.
- Rules regarding duplicate/equivalent requests.
- What event counts toward the student's request-throttling limit?

## 21.4 Matching

- Exact matching factors.
- Exact weighting.
- Tie-breaking behaviour.
- Minimum relevance threshold, if any.

## 21.5 Visibility and Privacy

- Exact student-visible mentor fields.
- Additional post-acceptance visibility rules.

## 21.6 Engagement

- Exact declining-engagement definition.
- Nudge timing/frequency.
- Recovery criteria.
- Treatment of long-term paused relationships.
- Final engagement state taxonomy and transition names.

## 21.7 Integrations

- Calendar providers enabled in the initial release.
- Video-conferencing provider.
- Enabled notification channels.
- Institutional SSO configuration.

## 21.8 Analytics

- Exact placement-outcome fields allowed for correlation.
- Exact report views required by each institutional role.
- Initial pilot population.

## 21.9 Messaging and Retention

- Message-history retention and access policy after a mentorship ends.
- Retention period for mentoring data and other non-academic records.

These values are recorded rather than invented because the supplied P11
brief does not define them.

---

# 22. Requirement Traceability

---

| Requirement Group | PRD Source | P11 / CES Source |
| --- | --- | --- |
| Verification | PRD §7.1, PR-01 | P11 §§2--5 |
| Mentor profile | PRD §7.2 | P11 §§2, 4--5 |
| Capacity/availability | PRD §7.3, PR-02/03/08 | P11 §§2, 4--5, 8 |
| Student profile | PRD §7.4 | P11 §§3--5 |
| Discovery/matching | PRD §§7.5--7.6, PR-08/09 | P11 §§3--5, 8 |
| Requests | PRD §7.7, PR-04--07 | P11 §§4--5, 8 |
| Mentorship relationship | PRD §7.8, PR-11 | P11 §§2--5 |
| Scheduling/sessions | PRD §7.9 | P11 §§4--5 |
| Goals/actions | PRD §7.10 | P11 §§3--5 |
| Feedback | PRD §7.11 | P11 §§3--5 |
| Engagement | PRD §7.12, PR-12 | P11 §§3--5 |
| Messaging | PRD §7.13 | P11 §§4--5, 8 |
| Analytics | PRD §7.14 | P11 §§9--10 |
| Notifications | PRD §7.15 | P11 §11 |
| Roles | PRD §6 | P11 §6 |
| Integrations | PRD §12 | P11 §§7, 12 |
| Privacy and data protection | PRD §11, PR-10 | P11 §§2, 8, 15, 17, 22; CES §2.4 |
| File upload security | SEC-21--23 | CES §2.4 |
| Product release outcomes | PRD §19 | P11 §22 |
| CES quality/security/testing | PRD foundation | CES §§1.3--1.5 |

---

# Document Control

| Field | Value |
| --- | --- |
| Document | Software Requirements Specification |
| Project | P11 --- Alumni Mentorship and Career Network |
| Version | 1.0 |
| Status | Foundation Draft |
| Product baseline | P11 PRD v1.0 |
| Source specification | `docs/P11_Project_Source.md` — P11 source extract |
| Engineering standard | Common Engineering Standard (CES) |
