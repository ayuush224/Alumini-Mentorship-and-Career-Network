import { MAX_MENTEES_PER_MENTOR } from "@/lib/config";

export interface StudentProfileMatchInput {
  skills?: string[];
  skillsToDevelop?: string[];
  targetIndustries?: string[];
  major?: string;
  bio?: string;
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
  availability?: "open" | "waitlist";
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
    .filter(Boolean)
    .map((s) => s.trim().toLowerCase());
}

/**
 * Calculates a 100-point affinity score and rationale between a student and a mentor:
 * - Up to +60 points for Industry / Role fit:
 *   - +60 if mentor's industry or job title matches student's target industries or academic focus.
 * - Up to +40 points for Shared Skills:
 *   - +10 points per overlapping skill in tech stacks, capped at 40 (Math.min(40, overlap * 10)).
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
} {
  let score = 0;

  // 1. Industry / Role Fit Evaluation (+60 points)
  const studentIndustries = normalizeList(student.targetIndustries);
  const studentMajor = (student.major || "").trim().toLowerCase();
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

  const hasIndustryOrRoleFit = hasIndustryFit || hasRoleFit;
  if (hasIndustryOrRoleFit) {
    score += 60;
  }

  // 2. Shared Skills Evaluation (Up to +40 points, +10 points per shared skill)
  const studentSkills = new Set([
    ...normalizeList(student.skills),
    ...normalizeList(student.skillsToDevelop),
  ]);

  const mentorSkillList = [
    ...extractMentorSkills(mentor.skills),
    ...normalizeList(mentor.expertiseTags),
  ];

  const matchedSkills: string[] = [];
  for (const mSkill of mentorSkillList) {
    if (studentSkills.has(mSkill) && !matchedSkills.includes(mSkill)) {
      matchedSkills.push(mSkill);
    }
  }

  // +10 points per overlapping skill in their tech stacks, capped at 40
  const skillPoints = Math.min(40, matchedSkills.length * 10);
  score += skillPoints;

  // Final score clamped to 0–100
  const finalScore = Math.min(100, Math.max(0, score));

  // 3. Rationale Formulation
  let rationale = "";
  const sharedCount = matchedSkills.length;

  if (hasIndustryFit && sharedCount > 0) {
    rationale = `Industry match and ${sharedCount} shared skill${sharedCount > 1 ? "s" : ""}`;
  } else if (hasRoleFit && sharedCount > 0) {
    rationale = `Role alignment and ${sharedCount} shared skill${sharedCount > 1 ? "s" : ""}`;
  } else if (hasIndustryFit) {
    rationale = `Industry fit in ${mentor.industry || "Technology"}`;
  } else if (hasRoleFit) {
    rationale = `Career pathway fit in ${mentor.jobTitle || "Engineering"}`;
  } else if (sharedCount > 0) {
    rationale = `${sharedCount} shared skill${sharedCount > 1 ? "s" : ""} in tech stack`;
  } else {
    rationale = "General academic alignment";
  }

  return {
    score: finalScore,
    rationale,
    sharedSkills: matchedSkills,
    hasIndustryFit,
    hasRoleFit,
  };
}

/**
 * Step 1 Algorithmic Matching Utility:
 * Accepts a StudentProfile and a list of MentorProfiles (with capacities).
 *
 * 1. Filtering: Strictly filters out any mentor where active mentees >= MAX_MENTEES_PER_MENTOR
 *    (or >= mentor's declared limit).
 * 2. Scoring: Computes the 100-point match score and rationale.
 * 3. Sorting: Returns mentors in descending order by Match Score (highest % first).
 */
export function matchMentors(
  studentProfile: StudentProfileMatchInput,
  mentors: MentorProfileMatchInput[]
): ScoredMentorMatch[] {
  const effectiveMaxThreshold = MAX_MENTEES_PER_MENTOR;

  // 1. Strict Capacity Filtering
  const availableMentors = mentors.filter((m) => {
    const declaredMax = m.maxMentees && m.maxMentees > 0 ? m.maxMentees : effectiveMaxThreshold;
    const capacityLimit = Math.min(declaredMax, effectiveMaxThreshold);
    return m.activeMentees < capacityLimit && m.availability !== "waitlist";
  });

  // 2. Scoring & Annotation
  const scored = availableMentors.map((m) => {
    const declaredMax = m.maxMentees && m.maxMentees > 0 ? m.maxMentees : effectiveMaxThreshold;
    const capacityLimit = Math.min(declaredMax, effectiveMaxThreshold);
    const remainingSpots = Math.max(0, capacityLimit - m.activeMentees);

    const { score, rationale, sharedSkills, hasIndustryFit, hasRoleFit } = calculateMatchScore(
      studentProfile,
      m
    );

    return {
      mentorId: m.mentorId,
      name: m.name,
      avatarUrl: m.avatarUrl,
      headline: m.headline,
      company: m.company,
      jobTitle: m.jobTitle,
      industry: m.industry,
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
    };
  });

  // 3. Descending Sort by Match Score (highest % first), tie-breaker by remainingSpots
  return scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.remainingSpots - a.remainingSpots;
  });
}
