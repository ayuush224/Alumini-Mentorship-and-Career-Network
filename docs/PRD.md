# Product Requirements Document (PRD)

## Project 11 — Alumni Mentorship and Career Network

**Product:** Verified Alumni Mentorship Matching and Engagement Platform  
**Project ID:** P11  
**Version:** 1.0  
**Status:** Foundation Draft

---

## Table of Contents

| No. | Section                                                             | Short Description                                                               |
| --: | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
|   1 | [Purpose](#1-purpose)                                               | Defines the product requirements and document intent.                           |
|   2 | [Product Vision](#2-product-vision)                                 | Describes the trusted mentoring platform the product aims to create.            |
|   3 | [Problem Statement](#3-problem-statement)                           | Explains the current challenges faced by students, alumni, and the institution. |
|   4 | [Core Product Principle](#4-core-product-principle)                 | Establishes protection of mentor time as the central principle.                 |
|   5 | [Product Objectives](#5-product-objectives)                         | Lists the outcomes and objectives the product must achieve.                     |
|   6 | [Target Users and Product Roles](#6-target-users-and-product-roles) | Identifies the primary user groups, roles, and their needs.                     |
|   7 | [Product Scope](#7-product-scope)                                   | Defines the product capabilities included in the mentoring platform.            |
|   8 | [Product Lifecycle](#8-product-lifecycle)                           | Shows the end-to-end lifecycle of a mentoring relationship.                     |
|   9 | [Key User Journeys](#9-key-user-journeys)                           | Describes the major journeys for mentors, students, and programme staff.        |
|  10 | [Product Rules](#10-product-rules)                                  | Defines the key product and business rules.                                     |
|  11 | [Privacy Product Requirement](#11-privacy-product-requirement)      | Describes privacy expectations for alumni and students.                         |
|  12 | [Product Integrations](#12-product-integrations)                    | Lists the external services and institutional integrations needed.              |
|  13 | [Programme Analytics](#13-programme-analytics)                      | Defines the programme questions that analytics should answer.                   |
|  14 | [Product Success Metrics](#14-product-success-metrics)              | Lists the metrics used to evaluate product and programme performance.           |
|  15 | [Proposed Scope Priorities](#15-proposed-scope-priorities)          | Groups capabilities into core, supporting, and future priorities.               |
|  16 | [Product Dependencies](#16-product-dependencies)                    | Identifies institutional inputs and programme decisions required.               |
|  17 | [Product Risks](#17-product-risks)                                  | Summarises product risks, consequences, and responses.                          |
|  18 | [Open Product Decisions](#18-open-product-decisions)                | Lists product decisions that must be resolved during discovery.                 |
|  19 | [Product Release Criteria](#19-product-release-criteria)            | Defines the product journeys and trust conditions required for release.         |
|  20 | [Source Basis](#20-source-basis)                                    | Records the source material and assumptions behind this PRD.                    |

---

## 1. Purpose

This PRD defines the **product** requirements for P11: why the product exists, who it serves, what problem it solves, what outcomes it should create, what capabilities are required, and how the major user journeys should work.

---

## 2. Product Vision

Create a trusted university platform that turns alumni goodwill into a **structured, sustainable, and measurable mentoring programme**.

The platform connects students with verified alumni mentors according to career goals and professional expertise while protecting mentor capacity and keeping alumni contact details private.

### Expected Product Outcome

A sustained mentoring programme with measurable engagement, protected alumni capacity, and outcomes that the institution can report.

---

## 3. Problem Statement

Alumni are willing to help students, but mentoring is currently unstructured:

- connections are ad hoc;
- access to alumni support is uneven;
- mentoring activity is difficult for the institution to see and measure;
- relationships can lose momentum without follow-up;
- alumni can be over-contacted by students who discover them through external platforms;
- students lack a consistent way to discover appropriate mentors;
- mentors lack a structured way to control their mentoring workload.

P11 therefore needs to create a mentoring programme that works for three groups simultaneously:

- **Students:** useful access to relevant mentors.
- **Alumni:** control over time, capacity, and participation.
- **Institution:** visibility into participation, engagement, and outcomes.

---

## 4. Core Product Principle

### Protect the Mentor's Time

This is the central product principle of P11.

Capacity limits, request throttling, and easy declining are first-class product features. The product should make it possible for alumni to help students without feeling overwhelmed or pressured.

Every significant product decision should be evaluated against this principle.

---

## 5. Product Objectives

1. **Establish trust** — verify alumni before they participate as mentors.
2. **Capture professional context** — record expertise, mentoring interests, capacity, and availability.
3. **Understand student needs** — record career goals, interests, target roles, and industries.
4. **Improve discovery** — help students find relevant mentors.
5. **Make matching understandable** — provide a reason for mentor recommendations.
6. **Protect capacity** — prevent mentors from being overloaded.
7. **Support the relationship** — manage the mentoring journey from request through sessions, goals, actions, and feedback.
8. **Sustain engagement** — identify declining activity and encourage follow-up.
9. **Protect privacy** — keep alumni personal contact information private.
10. **Measure outcomes** — provide institutional visibility into programme performance.

---

## 6. Target Users and Product Roles

### 6.1 Student

A current student seeking career guidance, professional knowledge, industry exposure, or ongoing mentorship.

**Needs:** discover mentors, understand relevance, request mentorship, schedule sessions, track goals/actions, communicate, and provide feedback.

### 6.2 Alumni Mentor

An alumnus willing to mentor students.

**Needs:** maintain a professional profile, describe expertise and mentoring interests, control capacity and availability, review requests, accept/decline easily, conduct sessions, track progress, communicate, and provide feedback.

### 6.3 Alumni Relations Officer

An institutional user responsible for alumni engagement and the mentoring programme.

**Needs:** verify alumni, monitor engagement, review mentor effectiveness, identify programme issues, and produce programme reports.

### 6.4 Placement Officer

An institutional user interested in mentoring participation and placement outcomes.

**Needs:** view relevant mentoring participation information and relate it to placement outcomes.

### 6.5 Administrator

A platform/programme administrator.

**Needs:** configure matching behaviour, request limits/expiry, and engagement settings.

---

## 7. Product Scope

### 7.1 Alumni Verification

The product shall provide a workflow to verify alumni identity against institutional records before mentor status is granted.

The product shall represent verification status and the outcome/history of verification.

### 7.2 Alumni Professional Profile

Verified alumni shall be able to maintain a mentoring-oriented professional profile containing relevant professional expertise areas, mentoring interests, capacity, and availability.

### 7.3 Capacity and Availability

Mentors shall be able to:

- define a concurrent mentee limit;
- define availability periods;
- pause mentoring;
- resume mentoring.

The product shall communicate appropriate capacity information during mentor discovery.

### 7.4 Student Career Profile

Students shall be able to define:

- career goals;
- interests;
- target roles;
- target industries.

### 7.5 Mentor Discovery

Students shall be able to discover mentors using relevant professional and mentoring information.

The discovery experience shall include useful filtering/facets and a clear indication of mentor capacity where appropriate.

### 7.6 Mentor Matching

The product shall recommend and rank mentors using the student's career needs and the mentor's relevant professional/mentoring information.

Each recommendation shall provide an understandable explanation of relevance.

### 7.7 Mentorship Requests

Students shall be able to request mentorship from suitable mentors.

The product shall support:

- request creation;
- request status;
- request throttling;
- acceptance;
- decline;
- optional decline reason;
- expiry of unanswered requests.

### 7.8 Mentorship Relationship

An accepted request shall establish a mentoring relationship through which users can manage sessions, goals, action items, feedback, and communication.

An active mentoring relationship may be ended according to the programme
policy, while preserving its historical record and outcomes.

### 7.9 Scheduling and Sessions

The product shall support proposing slots, booking sessions, calendar integration, reminders, and session records.

### 7.10 Goals and Action Items

Mentors and students shall be able to define mentoring goals, create action items, and track progress/completion.

### 7.11 Feedback

The product shall support feedback from both students and mentors and use it to understand satisfaction and mentoring effectiveness.

### 7.12 Engagement Monitoring

The product shall identify declining engagement in mentoring relationships and provide appropriate follow-up nudges.

### 7.13 Messaging

Students and mentors shall be able to communicate inside the platform without requiring exposure of alumni private contact details.

### 7.14 Programme Analytics

The product shall provide programme-level visibility into:

- active mentorships and participation;
- request acceptance;
- session frequency and completion;
- goal completion;
- mentor utilisation against capacity;
- engagement decay and recovery;
- mentor effectiveness;
- student and mentor satisfaction;
- mentoring participation in relation to placement outcomes.

### 7.15 Notifications

The product shall notify relevant users about important events including verification status, new requests, request outcomes, scheduled sessions/reminders, action-item due dates, inactivity, and feedback requests.

---

## 8. Product Lifecycle

The product lifecycle reflects the independent student profile and alumni mentor-pool journeys that come together during discovery and matching:

```text
ALUMNI                              STUDENT
  │                                    │
Verification & Profile            Career Profile
  │                                    │
Capacity & Availability            Goals / Interests
  │                                    │
  └──────────────► Mentor Pool ◄───────┘
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
                 Programme Outcomes
```

Messaging and notifications support this lifecycle.

---

## 9. Key User Journeys

### 9.1 Alumni Becomes a Mentor

```text
Alumni
 → Verification
 → Verified status
 → Professional profile
 → Expertise & mentoring interests
 → Capacity & availability
 → Available for mentoring
```

**Outcome:** a verified alumnus can participate while controlling their mentoring workload.

### 9.2 Student Finds a Mentor

```text
Student
 → Career profile
 → Goals/interests/target role/industry
 → Mentor discovery
 → Filters
 → Capacity review
 → Ranked recommendations
 → Relevance explanation
```

**Outcome:** the student can identify an appropriate available mentor without needing private contact information.

### 9.3 Student Requests Mentorship

```text
Student selects mentor
 → Request limit checked
 → Request sent
 → Mentor reviews
 → Accept / Decline / Expire
```

**Outcome:** students can seek help while mentors retain control over demand.

### 9.4 Accepted Mentorship

```text
Request accepted
 → Mentorship relationship
 → Session scheduling
 → Session
 → Goals/actions
 → Feedback
```

**Outcome:** the connection becomes a structured mentoring relationship.

### 9.5 Declining Engagement

```text
Active relationship
 → Activity declines
 → Relationship identified as at risk
 → Follow-up nudge
 → Activity resumes OR remains inactive
```

**Outcome:** useful relationships are less likely to silently disappear.

### 9.6 Programme Review

```text
Programme activity
 → Participation
 → Requests
 → Sessions
 → Goals
 → Engagement
 → Feedback
 → Outcomes
```

**Outcome:** the institution can evaluate the mentoring programme.

---

## 10. Product Rules

**PR-01 — Verification:** Alumni must be verified against institutional records before mentor status is granted.

**PR-02 — Capacity:** A mentor cannot have more active mentees than their declared capacity.

**PR-03 — Participation control:** A mentor can pause and resume mentoring participation.

**PR-04 — Request throttling:** Students cannot send unlimited mentorship requests.

**PR-05 — Configurable limits:** The programme can configure applicable request limits.

**PR-06 — Request expiry:** Unanswered requests expire according to the programme's configured policy.
**PR-07 — Easy decline:** Declining a request is a valid, low-friction outcome. A decline reason may be optional.

**PR-08 — Capacity-aware discovery:** Mentors who cannot accept additional mentees should not be presented as available request targets.

**PR-09 — Explainable matching:** Mentor recommendations must communicate why the mentor is relevant.

**PR-10 — Contact privacy:** Alumni email addresses and phone numbers must not be exposed to students through the platform.

**PR-11 — Relationship focus:** Sessions, goals, actions, feedback, and engagement are part of the mentoring relationship.

**PR-12 — Follow-up:** Declining engagement should result in an appropriate follow-up experience.

**PR-13 — Institutional visibility:** Programme reporting should provide useful institutional insight without exposing alumni private contact information.

---

## 11. Privacy Product Requirement

P11 must balance institutional visibility with alumni privacy.

Students should receive enough professional and mentoring information to make an informed mentoring decision, including relevant expertise and appropriate capacity/availability information.

Students must not receive alumni personal:

- email addresses;
- phone numbers.

---

## 12. Product Integrations

The product specification identifies the following integration needs:

| Area                 | Product Need          |
| -------------------- | --------------------- |
| ERP / alumni records | Alumni verification   |
| University SSO       | Institutional sign-in |
| Google Calendar      | Calendar scheduling   |
| Microsoft Outlook    | Calendar scheduling   |
| Video conferencing   | Meeting/link support  |
| Email                | Notifications         |
| SMS                  | Notifications         |
| LinkedIn (optional)  | Profile prefill       |

---

## 13. Programme Analytics

The product should enable programme owners to answer:

### Participation

- How many students participate?
- How many alumni are active mentors?
- How many mentorships are active?

### Requests

- How many requests are sent?
- What proportion are accepted, declined, or expired?

### Sessions and progress

- How frequently are sessions occurring?
- Are sessions completed?
- How many goals and actions are completed?

### Mentor capacity

- How much mentor capacity is being used?

### Engagement

- Which relationships show declining engagement?
- Which relationships recover after follow-up?

### Effectiveness and outcomes

- How satisfied are students and mentors?
- What patterns indicate mentor effectiveness?
- How does mentoring participation relate to placement outcomes?

---

## 14. Product Success Metrics

The following metrics should be tracked during pilot and operation:

| Area         | Metric                                                    |
| ------------ | --------------------------------------------------------- |
| Verification | Successful alumni verification rate                       |
| Discovery    | Students finding suitable available mentors               |
| Matching     | Requests generated from recommendations                   |
| Requests     | Acceptance rate                                           |
| Requests     | Decline rate                                              |
| Requests     | Expiry rate                                               |
| Capacity     | Mentor utilisation against declared capacity              |
| Sessions     | Sessions per active mentorship                            |
| Sessions     | Session completion rate                                   |
| Goals        | Goal completion rate                                      |
| Engagement   | At-risk mentorship recovery rate                          |
| Satisfaction | Student satisfaction                                      |
| Satisfaction | Mentor satisfaction                                       |
| Outcomes     | Mentoring participation in relation to placement outcomes |

The supplied P11 specification does not define numerical business targets for these metrics. Those targets should therefore be agreed during discovery rather than invented in this document.

---

## 15. Proposed Scope Priorities

### Core (Implemented)

- Alumni verification & degree status workflow
- Alumni profile, expertise taxonomy, and work history
- Dynamic capacity declaration & atomic concurrency guards
- Rich student career profiles (projects with live/repo links, work experience, CGPA, Cloudinary avatar & banner)
- Explainable mentor discovery & multi-attribute affinity matching
- Mentorship requests with rate throttling and 14-day auto-expiry
- Mentorship workspace lifecycle
- Dynamic scheduling (custom minutes, 1-on-1 and cohort check-ins)
- Concurrency-safe overlap guard (discrete 5-minute slot buckets)
- 15-minute privacy meeting link gating
- Bilateral real-time messaging via Pusher WebSockets with Cloudinary file attachments
- Bilateral sub-task engine, mentor-scoped task isolation, and gamified reputation points (+20 pts)
- Shared mentor notes and post-session feedback
- Programme health analytics, capacity utilization, and immutable audit logs
- Multi-tenant tenant scoping (`institutionId`) & CSRF double-submit protection

### Future Opportunities

- LinkedIn OAuth profile prefill
- AI-driven semantic matching embeddings
- Automated engagement nudges and at-risk lapse prediction via background cron workers

---

## 16. Product Dependencies

### Institutional

- Authoritative alumni records
- Alumni verification process
- Placement outcome information where permitted
- University identity/SSO arrangement
- Approved communication channels

### Programme decisions

- Mentor capacity policy
- Request limit policy
- Request expiry policy
- Engagement definition
- Matching criteria
- Privacy/visibility policy
- Reporting requirements

---

## 17. Product Risks

| Risk                              | Product Consequence                         | Product Response                                                      |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| Mentors receive too many requests | Mentor disengagement                        | Capacity limits, throttling, easy decline                             |
| Poor recommendations              | Low student trust                           | Relevant ranking and explanations                                     |
| Incomplete alumni records         | Verification problems                       | Establish authoritative verification source                           |
| Relationships become inactive     | Lower programme value                       | Engagement monitoring and follow-up                                   |
| Alumni privacy is compromised     | Loss of trust                               | Keep personal contact information outside student-visible information |
| Scope becomes too large           | Delivery delay                              | Prioritise core lifecycle and defer lower-priority features           |
| Low institutional visibility      | Programme value is difficult to demonstrate | Programme analytics and outcome reporting                             |

---

## 18. Open Product Decisions

The source specification establishes the product direction but does not provide values for the following. These must be decided during discovery:

1. What institutional record is authoritative for verification?
2. What exactly constitutes successful alumni verification?
3. What mentor profile information should students see?
4. What default mentor capacity should be used?
5. What availability information should students see?
6. What is the maximum number of active requests per student?
7. How long should an unanswered request remain active?
8. What exactly constitutes declining engagement?
9. When should an engagement nudge occur?
10. Which factors should determine mentor relevance?
11. Which calendar providers are enabled for the initial release?
12. Which video-conferencing provider is used?
13. Which notification channels are enabled?
14. Which placement outcomes can be used for programme analysis?
15. What reporting views are required by each institutional role?
16. What is the initial pilot population?
17. Who may end a mentorship relationship, and under what conditions?

---

## 19. Product Release Criteria

The MVP should allow the following product journeys to work end-to-end:

### Student

- maintain a career profile;
- discover relevant mentors;
- understand recommendation relevance;
- see appropriate capacity information;
- submit a permitted mentorship request;
- track its outcome;
- participate in an accepted mentorship;
- schedule sessions;
- manage goals/actions;
- provide feedback.

### Mentor

- complete a mentoring profile;
- define expertise and mentoring interests;
- define capacity and availability;
- receive requests;
- accept or decline easily;
- conduct sessions;
- manage goals/actions;
- communicate with the student when in-platform messaging is included in
  the release;
- provide feedback.

### Institution

- verify alumni;
- monitor programme participation and engagement;
- review mentor effectiveness;
- review programme outcomes.

### Product trust

- mentor capacity is respected;
- alumni private contact information is not exposed to students.

---

## 20. Source Basis

This PRD is based on the authoritative P11 source extract in
`docs/P11_Project_Source.md`, which preserves the EduRev Project List
requirements for P11, and on the applicable **Common Engineering Standard
(CES)**.

P11-specific requirements have been preserved as product requirements, while values not defined by the source are recorded as open product decisions rather than assumed.

---
