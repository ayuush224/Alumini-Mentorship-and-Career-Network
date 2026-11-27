import { MAX_MENTEES_PER_MENTOR } from "@/lib/config";
import {
  recommendMentors,
  MenteeGoalInput,
  MentorCandidate,
  ScoreBreakdown,
  normalizeSkills,
  canonicalSkillOverlap,
  calculateSkillCoverage,
} from "@/lib/recommendation";

export interface StudentProfileMatchInput {
  skills?: string[];
  skillsToDevelop?: string[];
  targetIndustries?: string[];
  major?: string;
  department?: string;
  bio?: string;
  targetRole?: string;
  careerGoals?: string;
  knowledgeGaps?: string[];
  preferredLanguage?: string;
  meetingPreference?: "remote" | "in_person" | "hybrid";
}

export interface MentorProfileMatchInput {
  mentorId: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  expertiseTags?: string[];
  skills?: Array<{ name: string; endorsements?: number } | string>;
  activeMentees: number;
  maxMentees?: number;
  availability?: "open" | "waitlist" | "stopped";
  yearsOfExperience?: number;
  skillsCanTeach?: string[];
  topicsCanMentor?: string[];
  preferredMentoringStyle?: string;
  languages?: string[];
  meetingPreference?: "remote" | "in_person" | "hybrid";
  availabilitySchedule?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  reliabilityStats?: {
    requestsReceived?: number;
    requestsAnswered?: number;
    requestsAccepted?: number;
    avgResponseTimeHours?: number;
    sessionsScheduled?: number;
    sessionsCompleted?: number;
    sessionsCancelled?: number;
  };
  averageRating?: number;
  reviewCount?: number;
}

export interface ScoredMentorMatch {
  mentorId: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  expertiseTags: string[];
  activeMentees: number;
  maxMentees: number;
  remainingSpots: number;
  score: number;
  rationale: string;
  sharedSkills: string[];
  hasIndustryFit: boolean;
  hasRoleFit: boolean;
  isAtCapacity: boolean;
  // Enhanced attributes from upgraded recommendation engine
  scoreBreakdown?: ScoreBreakdown;
  reasons?: string[];
  canTeachSkills?: string[];
  compatibleTimes?: string[];
  yearsOfExperience?: number;
}

/**
 * Normalizes a list of strings to lowercase trimmed values.
 */
function normalizeList(items?: string[]): string[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((i) => i.trim().toLowerCase()).filter(Boolean);
}

/**
 * Extracts a normalized list of skill names from mentor skill representations.
 */
function extractMentorSkills(skills?: Array<{ name: string; endorsements?: number } | string>): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  return skills
    .map((s) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean) as string[];
}

/**
 * Calculates a 100-point affinity score and rationale between a student and a mentor:
 * Backward-compatible single-pair match evaluator powered by canonical skill normalization.
 */
export function calculateMatchScore(
  student: StudentProfileMatchInput,
  mentor: MentorProfileMatchInput
): {
  score: number;
  rationale: string;
  sharedSkills: string[];
  hasIndustryFit: boolean;
  hasRoleFit: boolean;
  reasons?: string[];
} {
  let score = 0;

  // 1. Industry / Role Fit Evaluation (+60 points)
  const studentIndustries = normalizeList(student.targetIndustries);
  const studentMajor = (student.major || student.department || "").trim().toLowerCase();
  const mentorIndustry = (mentor.industry || "").trim().toLowerCase();
  const mentorJob = (mentor.jobTitle || "").trim().toLowerCase();

  const hasIndustryFit = Boolean(
    mentorIndustry &&
      (studentIndustries.includes(mentorIndustry) ||
        studentIndustries.some((ind) => mentorIndustry.includes(ind) || ind.includes(mentorIndustry)))
  );

  const hasRoleFit = Boolean(
    mentorJob &&
      (studentIndustries.some((ind) => mentorJob.includes(ind)) ||
        (studentMajor && (mentorJob.includes("software") || mentorJob.includes("engineer"))))
  );

  if (hasIndustryFit || hasRoleFit) {
    score += 60;
  }

  // 2. Shared Skills Evaluation (Up to +40 points, using Canonical Taxonomy)
  const studentSkills = [
    ...(student.skills || []),
    ...(student.skillsToDevelop || []),
    ...(student.knowledgeGaps || []),
  ];

  const mentorSkillList = [
    ...extractMentorSkills(mentor.skills),
    ...(mentor.expertiseTags || []),
    ...(mentor.skillsCanTeach || []),
  ];

  const matchedSkills = canonicalSkillOverlap(studentSkills, mentorSkillList);
  const skillPoints = Math.min(40, matchedSkills.length * 10);
  score += skillPoints;

  const finalScore = Math.min(100, Math.max(0, score));

  // 3. Truthful Rationale Formulation
  const reasons: string[] = [];
  let rationale = "";
  const sharedCount = matchedSkills.length;

  if (hasIndustryFit && sharedCount > 0) {
    rationale = `Industry match and ${sharedCount} shared skill${sharedCount > 1 ? "s" : ""}`;
    reasons.push(`Industry fit in ${mentor.industry}`);
    reasons.push(`Can help you develop ${matchedSkills.slice(0, 3).join(", ")}`);
  } else if (hasRoleFit && sharedCount > 0) {
    rationale = `Role alignment and ${sharedCount} shared skill${sharedCount > 1 ? "s" : ""}`;
    reasons.push(`Career pathway alignment as ${mentor.jobTitle}`);
    reasons.push(`Overlapping technical skills: ${matchedSkills.slice(0, 3).join(", ")}`);
  } else if (hasIndustryFit) {
    rationale = `Industry fit in ${mentor.industry || "Technology"}`;
    reasons.push(`Industry experience in ${mentor.industry}`);
  } else if (hasRoleFit) {
    rationale = `Career pathway fit in ${mentor.jobTitle || "Engineering"}`;
    reasons.push(`Practical experience in ${mentor.jobTitle}`);
  } else if (sharedCount > 0) {
    rationale = `${sharedCount} shared skill${sharedCount > 1 ? "s" : ""} in tech stack`;
    reasons.push(`Shared tech stack in ${matchedSkills.slice(0, 3).join(", ")}`);
  } else {
    rationale = "General academic alignment";
    reasons.push("Aligned with broader technology discipline");
  }

  return {
    score: finalScore,
    rationale,
    sharedSkills: matchedSkills,
    hasIndustryFit,
    hasRoleFit,
    reasons,
  };
}

/**
 * Algorithmic Matching Utility:
 * Powered by the 4-Stage Mentorship Recommendation Engine (Filtering -> Hybrid Retrieval -> Multi-Factor Ranking -> MMR Diversity).
 *
 * Fully backward compatible with existing frontend callers while adding:
 * - Deterministic, explainable scoring
 * - Multi-factor score breakdowns
 * - MMR company diversification
 * - Compatible meeting windows
 */
export function matchMentors(
  studentProfile: StudentProfileMatchInput,
  mentors: MentorProfileMatchInput[]
): ScoredMentorMatch[] {
  const effectiveMaxThreshold = MAX_MENTEES_PER_MENTOR;

  // 1. Strict Capacity and Stopped Filtering
  const availableMentors = mentors.filter((m) => {
    const declaredMax = m.maxMentees && m.maxMentees > 0 ? m.maxMentees : effectiveMaxThreshold;
    const capacityLimit = Math.min(declaredMax, effectiveMaxThreshold);
    return m.activeMentees < capacityLimit && m.availability !== "waitlist" && m.availability !== "stopped";
  });

  if (availableMentors.length === 0) return [];

  // 2. Map Student Profile to MenteeGoalInput
  const menteeGoal: MenteeGoalInput = {
    studentId: "student-current",
    department: studentProfile.department || studentProfile.major,
    targetRole: studentProfile.targetRole,
    targetIndustry: studentProfile.targetIndustries?.[0],
    careerGoal: studentProfile.careerGoals || studentProfile.bio,
    currentSkills: studentProfile.skills,
    skillsToLearn: studentProfile.skillsToDevelop,
    knowledgeGaps: studentProfile.knowledgeGaps,
    preferredLanguage: studentProfile.preferredLanguage,
    meetingPreference: studentProfile.meetingPreference,
  };

  // 3. Map Mentors to MentorCandidate[]
  const candidates: MentorCandidate[] = availableMentors.map((m) => {
    const declaredMax = m.maxMentees && m.maxMentees > 0 ? m.maxMentees : effectiveMaxThreshold;
    const capacityLimit = Math.min(declaredMax, effectiveMaxThreshold);
    const extractedSkills = extractMentorSkills(m.skills);
    const rawSkills = Array.from(new Set([...extractedSkills, ...(m.expertiseTags || [])]));

    return {
      mentorId: m.mentorId,
      name: m.name,
      avatarUrl: m.avatarUrl,
      headline: m.headline,
      company: m.company || "Independent",
      jobTitle: m.jobTitle || "Mentor",
      industry: m.industry || "Technology",
      yearsOfExperience: m.yearsOfExperience || 4,
      skills: rawSkills,
      skillsCanTeach: m.skillsCanTeach || rawSkills,
      topicsCanMentor: m.topicsCanMentor || m.expertiseTags || [],
      preferredMentoringStyle: m.preferredMentoringStyle,
      languages: m.languages,
      meetingPreference: m.meetingPreference,
      maxMentees: capacityLimit,
      activeMentees: m.activeMentees,
      acceptingRequests: true,
      availability: m.availability || "open",
      availabilitySchedule: m.availabilitySchedule,
      reliabilityStats: m.reliabilityStats,
      averageRating: m.averageRating,
      reviewCount: m.reviewCount,
      expertiseTags: m.expertiseTags,
    };
  });

  // 4. Run the 4-Stage Mentorship Recommendation Engine
  const { recommendations } = recommendMentors(menteeGoal, candidates, {
    limit: candidates.length,
    applyDiversity: true,
  });

  const recommendationMap = new Map(recommendations.map((r) => [r.mentorId, r]));

  // 5. Annotate & Return Scored Matches
  const scoredMatches: ScoredMentorMatch[] = availableMentors.map((m) => {
    const declaredMax = m.maxMentees && m.maxMentees > 0 ? m.maxMentees : effectiveMaxThreshold;
    const capacityLimit = Math.min(declaredMax, effectiveMaxThreshold);
    const remainingSpots = Math.max(0, capacityLimit - m.activeMentees);

    const rec = recommendationMap.get(m.mentorId);
    if (rec) {
      const studentIndustries = normalizeList(studentProfile.targetIndustries);
      const mentorInd = (m.industry || "").toLowerCase();
      const mentorRole = (m.jobTitle || "").toLowerCase();
      const hasIndustryFit = Boolean(
        mentorInd && studentIndustries.some((ind) => mentorInd.includes(ind) || ind.includes(mentorInd))
      );
      const hasRoleFit = Boolean(
        mentorRole && (mentorRole.includes("engineer") || mentorRole.includes("developer"))
      );

      return {
        mentorId: m.mentorId,
        name: m.name,
        avatarUrl: m.avatarUrl,
        headline: m.headline,
        company: m.company || "Independent",
        jobTitle: m.jobTitle || "Mentor",
        industry: m.industry || "Technology",
        expertiseTags: m.expertiseTags || [],
        activeMentees: m.activeMentees,
        maxMentees: capacityLimit,
        remainingSpots,
        score: rec.finalScore,
        rationale: rec.reasons[0] || "Strong technical and career alignment",
        sharedSkills: rec.sharedSkills,
        hasIndustryFit,
        hasRoleFit,
        isAtCapacity: remainingSpots <= 0,
        scoreBreakdown: rec.scoreBreakdown,
        reasons: rec.reasons,
        canTeachSkills: rec.canTeachSkills,
        compatibleTimes: rec.compatibleTimes,
        yearsOfExperience: rec.yearsOfExperience,
      };
    }

    // Fallback if candidate was filtered out of top recommendations
    const { score, rationale, sharedSkills, hasIndustryFit, hasRoleFit, reasons } =
      calculateMatchScore(studentProfile, m);

    return {
      mentorId: m.mentorId,
      name: m.name,
      avatarUrl: m.avatarUrl,
      headline: m.headline,
      company: m.company || "Independent",
      jobTitle: m.jobTitle || "Mentor",
      industry: m.industry || "Technology",
      expertiseTags: m.expertiseTags || [],
      activeMentees: m.activeMentees,
      maxMentees: capacityLimit,
      remainingSpots,
      score,
      rationale,
      sharedSkills,
      hasIndustryFit,
      hasRoleFit,
      isAtCapacity: remainingSpots <= 0,
      reasons,
    };
  });

  // Sort descending by recommendation score, tie-breaker by remainingSpots
  return scoredMatches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.remainingSpots - a.remainingSpots;
  });
}
