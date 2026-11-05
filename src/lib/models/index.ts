// ============================================================================
// CANONICAL ENTITY INVENTORY (Aligned with docs/Database_Design.md & System_Architecture.md)
// ============================================================================

// Core Identity & Multi-Tenancy
export * from "./Institution";
export * from "./User";
export * from "./Auth";

// M1: Verification & Profile
export * from "./Verification";

// M2 & M5: Capacity, Availability, Requests & Mentorships
export * from "./Mentorship";

// M6: High-Concurrency Dual-Layer Scheduling & Slot Overlap Guard
export * from "./MentorSession";

// M3 & M7: Goals, Career Goals, Action Items & Task Milestones
export * from "./Tasks";

// M7: Bidirectional Mentorship Feedback
export * from "./Feedback";

// M9: Scoped Bilateral Messaging & Guidance Notes
export * from "./Communication";

// M4, M8, M10 & Cross-Cutting Governance, Analytics, Audit & Outbox
export * from "./Analytics";
