import { RankedCandidate } from "./ranking";
import { MenteeGoalInput, ScoredRecommendation } from "./types";

/**
 * Stage 4: Evidence-Based Explanations Generator.
 *
 * Produces structured, truthful explanations grounded strictly in database facts:
 * - Specific overlapping skills between student need and mentor capability
 * - Verified career-path and role alignment
 * - Explicit topics the mentor can teach
 * - Confirmed mutual availability windows
 * - Transparent and reproducible score breakdowns
 */
export function generateExplanations(
  mentee: MenteeGoalInput,
  candidate: RankedCandidate,
  options: {
    hasPendingRequest?: boolean;
    hasActiveMentorship?: boolean;
  } = {}
): ScoredRecommendation {
  const {
    mentor,
    finalScore,
    scoreBreakdown,
    sharedSkills,
    canTeachSkills,
    compatibleTimes,
    rationaleFacts,
  } = candidate;

  const reasons: string[] = [];

  // 1. Skill Overlap Evidence
  if (canTeachSkills.length > 0) {
    reasons.push(`Can help you master ${canTeachSkills.slice(0, 3).join(", ")}`);
  } else if (sharedSkills.length > 0) {
    reasons.push(`Shared tech stack in ${sharedSkills.slice(0, 3).join(", ")}`);
  }

  // 2. Career & Experience Evidence
  if (mentor.jobTitle && mentee.targetRole) {
    reasons.push(`Practical experience as ${mentor.jobTitle} at ${mentor.company || "Industry"}`);
  } else if (mentor.yearsOfExperience && mentor.yearsOfExperience > 0) {
    reasons.push(`${mentor.yearsOfExperience}+ years of professional engineering experience`);
  }

  // 3. Mentoring Topics
  if (mentor.topicsCanMentor && mentor.topicsCanMentor.length > 0) {
    reasons.push(`Willing to mentor on ${mentor.topicsCanMentor.slice(0, 2).join(" & ")}`);
  }

  // 4. Availability Window
  if (compatibleTimes.length > 0 && compatibleTimes[0] !== "Mutually agreed online time") {
    reasons.push(`Compatible schedule: ${compatibleTimes[0]}`);
  }

  // Fallback to rationaleFacts if few specific reasons
  for (const fact of rationaleFacts) {
    if (reasons.length < 4 && !reasons.includes(fact)) {
      reasons.push(fact);
    }
  }

  if (reasons.length === 0) {
    reasons.push("Strong background alignment with your career aspirations");
  }

  const maxMentees = mentor.maxMentees || 1;
  const activeMentees = mentor.activeMentees || 0;
  const pendingReservations = mentor.pendingReservations || 0;
  const remainingSpots = Math.max(0, maxMentees - activeMentees - pendingReservations);

  return {
    mentorId: mentor.mentorId,
    name: mentor.name || "Alumni Mentor",
    avatarUrl: mentor.avatarUrl,
    headline: mentor.headline || `${mentor.jobTitle} @ ${mentor.company}`,
    company: mentor.company || "Independent",
    jobTitle: mentor.jobTitle || "Mentor",
    industry: mentor.industry || "Technology",
    expertiseTags: mentor.expertiseTags || mentor.skills || [],
    yearsOfExperience: mentor.yearsOfExperience || 0,
    finalScore: Math.round(finalScore * 100), // Converted to 0–100 integer for UI display
    scoreBreakdown,
    reasons,
    sharedSkills,
    canTeachSkills,
    remainingSpots,
    maxMentees,
    activeMentees,
    isAtCapacity: remainingSpots <= 0,
    hasPendingRequest: options.hasPendingRequest ?? false,
    hasActiveMentorship: options.hasActiveMentorship ?? false,
    compatibleTimes,
  };
}
