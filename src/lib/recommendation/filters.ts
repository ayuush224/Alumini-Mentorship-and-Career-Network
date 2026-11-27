import { MenteeGoalInput, MentorCandidate } from "./types";

export interface FilterResult {
  eligibleMentors: MentorCandidate[];
  excludedCount: number;
  reasonsCount: Record<string, number>;
}

/**
 * Stage 1: Hard Eligibility Filters.
 * Strictly eliminates non-eligible mentors before semantic similarity scoring or ranking.
 *
 * Rules:
 * 1. Institution ID match (multi-tenant boundary)
 * 2. Verification status (must be verified by an alumni relations officer)
 * 3. Account status (must not be soft-deleted or inactive)
 * 4. Accepting requests (availability != 'stopped', status != 'paused', acceptingRequests != false)
 * 5. Invariant: Available capacity > 0 (available_slots = total_capacity - active_mentees - pending_reservations)
 * 6. Cannot already be mentoring the requesting student
 * 7. Cannot have an existing pending request from the requesting student
 * 8. Cannot match self (student cannot mentor self)
 *
 * Note: Department, graduation year, and company are SOFT ranking signals, NOT hard filters.
 */
export function applyHardEligibilityFilters(
  mentee: MenteeGoalInput,
  mentors: MentorCandidate[],
  options: {
    activeMentorIds?: Set<string>;
    pendingMentorIds?: Set<string>;
    enforceInstitution?: boolean;
    requiredInstitutionId?: string;
  } = {}
): FilterResult {
  const activeIds = options.activeMentorIds || new Set<string>();
  const pendingIds = options.pendingMentorIds || new Set<string>();
  const enforceInst = options.enforceInstitution ?? true;
  const targetInst = options.requiredInstitutionId || mentee.institutionId || "INST-001";

  const reasonsCount: Record<string, number> = {
    self_match: 0,
    institution_mismatch: 0,
    unverified: 0,
    inactive_account: 0,
    availability_stopped: 0,
    capacity_exhausted: 0,
    already_active_mentorship: 0,
    existing_pending_request: 0,
  };

  const eligibleMentors: MentorCandidate[] = [];

  for (const mentor of mentors) {
    // 1. Self Match Guard
    if (mentor.mentorId === mentee.studentId) {
      reasonsCount.self_match++;
      continue;
    }

    // 2. Multi-Tenant Scoping
    if (enforceInst && mentor.institutionId && mentor.institutionId !== targetInst) {
      reasonsCount.institution_mismatch++;
      continue;
    }

    // 3. Verification Guard (Alumni must be verified)
    if (mentor.isVerified === false || (mentor.verificationStatus && mentor.verificationStatus !== "verified")) {
      reasonsCount.unverified++;
      continue;
    }

    // 4. Inactive Account Guard
    if (mentor.isDeleted === true) {
      reasonsCount.inactive_account++;
      continue;
    }

    // 5. Explicitly Stopped / Paused Availability
    const isPaused =
      mentor.acceptingRequests === false ||
      mentor.status === "paused" ||
      mentor.availability === "stopped" ||
      mentor.availability === "waitlist";

    if (isPaused) {
      reasonsCount.availability_stopped++;
      continue;
    }

    // 6. Invariant 1: Mentor Declared Capacity Must Never Be Exceeded
    // Formula: available_slots = total_capacity - active_mentees - pending_reservations
    const totalCapacity = mentor.maxMentees ?? 1;
    const active = mentor.activeMentees ?? 0;
    const pendingReservations = mentor.pendingReservations ?? 0;
    const availableSlots = totalCapacity - active - pendingReservations;

    if (availableSlots <= 0) {
      reasonsCount.capacity_exhausted++;
      continue;
    }

    // 7. Prevent Duplicate Active Mentorship
    if (activeIds.has(mentor.mentorId)) {
      reasonsCount.already_active_mentorship++;
      continue;
    }

    // 8. Prevent Duplicate Pending Request
    if (pendingIds.has(mentor.mentorId)) {
      reasonsCount.existing_pending_request++;
      continue;
    }

    eligibleMentors.push(mentor);
  }

  const excludedCount = mentors.length - eligibleMentors.length;
  return {
    eligibleMentors,
    excludedCount,
    reasonsCount,
  };
}
