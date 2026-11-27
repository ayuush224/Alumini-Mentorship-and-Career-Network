import {
  MenteeGoalInput,
  MentorCandidate,
  ScoreBreakdown,
  EngineConfig,
  DEFAULT_ENGINE_CONFIG,
  IAvailabilitySlot,
} from "./types";
import { RetrievedCandidate } from "./retrieval";
import { canonicalSkillOverlap, normalizeSkills } from "./taxonomy";

export interface RankedCandidate {
  mentor: MentorCandidate;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  sharedSkills: string[];
  canTeachSkills: string[];
  compatibleTimes: string[];
  rationaleFacts: string[];
}

/**
 * Parses time string (e.g. "09:30" or "9:30") to minutes from midnight.
 */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Checks if two availability slots overlap on the same day with at least 30 minutes of overlap.
 */
function slotsOverlap(slotA: IAvailabilitySlot, slotB: IAvailabilitySlot): boolean {
  if (slotA.dayOfWeek !== slotB.dayOfWeek) return false;
  const startA = parseTimeToMinutes(slotA.startTime);
  const endA = parseTimeToMinutes(slotA.endTime);
  const startB = parseTimeToMinutes(slotB.startTime);
  const endB = parseTimeToMinutes(slotB.endTime);

  const overlapStart = Math.max(startA, startB);
  const overlapEnd = Math.min(endA, endB);
  return overlapEnd - overlapStart >= 30; // at least 30 min window
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Computes Availability Compatibility (0.0 to 1.0) and generates list of mutually compatible windows.
 */
export function calculateAvailabilityCompatibility(
  mentee: MenteeGoalInput,
  mentor: MentorCandidate
): { score: number; compatibleTimes: string[] } {
  const studentSchedule = mentee.availabilitySchedule || [];
  const mentorSchedule = mentor.availabilitySchedule || [];

  // Check meeting mode (remote vs in-person)
  const studentMode = mentee.meetingPreference || "remote";
  const mentorMode = mentor.meetingPreference || "remote";
  let modeCompatibility = 1.0;
  if (studentMode !== "hybrid" && mentorMode !== "hybrid" && studentMode !== mentorMode) {
    modeCompatibility = 0.5; // Mismatched preference penalty
  }

  // If neither has entered detailed slot times, fallback to a healthy baseline
  if (studentSchedule.length === 0 || mentorSchedule.length === 0) {
    return {
      score: 0.85 * modeCompatibility,
      compatibleTimes: ["Flexible online schedule"],
    };
  }

  const compatibleWindows: string[] = [];
  let matchedStudentSlots = 0;

  for (const sSlot of studentSchedule) {
    const matchingMentorSlot = mentorSchedule.find((mSlot) => slotsOverlap(sSlot, mSlot));
    if (matchingMentorSlot) {
      matchedStudentSlots++;
      const day = DAY_NAMES[sSlot.dayOfWeek] || "Day";
      const overlapStart = Math.max(
        parseTimeToMinutes(sSlot.startTime),
        parseTimeToMinutes(matchingMentorSlot.startTime)
      );
      const overlapEnd = Math.min(
        parseTimeToMinutes(sSlot.endTime),
        parseTimeToMinutes(matchingMentorSlot.endTime)
      );
      const hStart = `${Math.floor(overlapStart / 60).toString().padStart(2, "0")}:${(overlapStart % 60).toString().padStart(2, "0")}`;
      const hEnd = `${Math.floor(overlapEnd / 60).toString().padStart(2, "0")}:${(overlapEnd % 60).toString().padStart(2, "0")}`;
      compatibleWindows.push(`${day} ${hStart}–${hEnd}`);
    }
  }

  const overlapRatio = matchedStudentSlots / Math.max(1, studentSchedule.length);
  const finalAvailScore = Math.min(1.0, Math.max(0.2, overlapRatio * modeCompatibility));

  return {
    score: finalAvailScore,
    compatibleTimes: compatibleWindows.length > 0 ? compatibleWindows.slice(0, 3) : ["Mutually agreed online time"],
  };
}

/**
 * Calculates Seniority Compatibility using Gaussian bell curve:
 * S = exp(-((delta - mu)^2) / (2 * sigma^2))
 * Initial mu = 3.5 years, sigma = 2.0 years.
 */
export function calculateSeniorityCompatibility(
  mentee: MenteeGoalInput,
  mentor: MentorCandidate,
  mu: number = 3.5,
  sigma: number = 2.0
): number {
  let delta = 0;

  if (mentor.yearsOfExperience !== undefined && mentor.yearsOfExperience > 0) {
    delta = mentor.yearsOfExperience;
  } else if (mentor.graduationYear && mentee.graduationYear) {
    delta = Math.max(0, mentee.graduationYear - mentor.graduationYear);
  } else {
    delta = 4.0; // Default reasonable gap
  }

  const diff = delta - mu;
  const score = Math.exp(-(diff * diff) / (2.0 * sigma * sigma));
  return Math.max(0.1, Math.min(1.0, score));
}

/**
 * Calculates Career-Path Relevance (0.0 to 1.0).
 * Compares target role vs mentor's current role and target industry vs mentor's industry.
 * Emphasizes practical experience over employer prestige.
 */
export function calculateCareerPathRelevance(
  mentee: MenteeGoalInput,
  mentor: MentorCandidate
): { score: number; facts: string[] } {
  let score = 0;
  const facts: string[] = [];

  const targetRole = (mentee.targetRole || "").toLowerCase();
  const mentorRole = (mentor.jobTitle || "").toLowerCase();
  const targetInd = (mentee.targetIndustry || "").toLowerCase();
  const mentorInd = (mentor.industry || "").toLowerCase();

  // 1. Role Alignment (Up to 0.60)
  if (targetRole && mentorRole) {
    if (mentorRole.includes(targetRole) || targetRole.includes(mentorRole)) {
      score += 0.60;
      facts.push(`Direct role alignment in ${mentor.jobTitle}`);
    } else {
      // Token overlap
      const roleTokens = targetRole.split(/\s+/).filter((t) => t.length > 2);
      const matches = roleTokens.filter((t) => mentorRole.includes(t));
      if (matches.length > 0) {
        score += Math.min(0.50, matches.length * 0.25);
        facts.push(`Relevant engineering experience in ${mentor.jobTitle}`);
      }
    }
  } else if (mentorRole) {
    score += 0.35; // Baseline relevant industry role
  }

  // 2. Industry Alignment (Up to 0.40)
  if (targetInd && mentorInd) {
    if (targetInd === mentorInd || mentorInd.includes(targetInd) || targetInd.includes(mentorInd)) {
      score += 0.40;
      facts.push(`Target industry match in ${mentor.industry}`);
    } else if (
      /tech|software|cloud|data|finance|fintech/i.test(targetInd) &&
      /tech|software|cloud|data|finance|fintech/i.test(mentorInd)
    ) {
      score += 0.30;
      facts.push(`Broader sector fit in ${mentor.industry}`);
    }
  } else {
    score += 0.20;
  }

  return {
    score: Math.min(1.0, Math.max(0.1, score)),
    facts,
  };
}

/**
 * Calculates Mentoring Capability (0.0 to 1.0).
 * Distinguishes skills known vs skills mentor can actually teach, topics willing to mentor,
 * and previous mentoring experience.
 */
export function calculateMentoringCapability(
  mentee: MenteeGoalInput,
  mentor: MentorCandidate
): { score: number; facts: string[] } {
  let score = 0.30; // Baseline willingness
  const facts: string[] = [];

  const targetSkills = normalizeSkills([
    ...(mentee.skillsToLearn || []),
    ...(mentee.knowledgeGaps || []),
  ]);

  const canTeach = normalizeSkills(mentor.skillsCanTeach || []);
  const topics = normalizeSkills(mentor.topicsCanMentor || []);

  // Explicit skills mentor can teach overlap
  const canTeachOverlap = canonicalSkillOverlap(targetSkills, canTeach);
  if (canTeachOverlap.length > 0) {
    score += Math.min(0.40, canTeachOverlap.length * 0.20);
    facts.push(`Can explicitly teach ${canTeachOverlap.slice(0, 2).join(", ")}`);
  }

  // Topics willing to mentor
  if (topics.length > 0) {
    score += 0.15;
    facts.push(`Mentors topics in ${topics.slice(0, 2).join(", ")}`);
  }

  // Mentoring experience track record
  if (mentor.activeMentees > 0 || (mentor.reliabilityStats?.sessionsCompleted && mentor.reliabilityStats.sessionsCompleted > 0)) {
    score += 0.15;
    facts.push("Demonstrated active mentorship track record");
  }

  return {
    score: Math.min(1.0, score),
    facts,
  };
}

/**
 * Calculates Reliability score (0.0 to 1.0).
 * Protects new mentors against penalties via Bayesian / Laplace sample smoothing.
 */
export function calculateReliabilityScore(mentor: MentorCandidate): number {
  const stats = mentor.reliabilityStats;
  if (!stats || (!stats.requestsReceived && !stats.sessionsScheduled)) {
    return 0.85; // Default fair baseline for new mentors
  }

  const received = stats.requestsReceived || 0;
  const answered = stats.requestsAnswered || 0;
  const scheduled = stats.sessionsScheduled || 0;
  const completed = stats.sessionsCompleted || 0;

  // Bayesian smoothing with prior expectation (3 pseudo-trials at 85% benchmark)
  const priorTrials = 3;
  const priorSuccess = 2.55; // 3 * 0.85

  const responseRate = received > 0 ? (answered + priorSuccess) / (received + priorTrials) : 0.85;
  const completionRate = scheduled > 0 ? (completed + priorSuccess) / (scheduled + priorTrials) : 0.85;

  const composite = 0.5 * responseRate + 0.5 * completionRate;
  return Math.min(1.0, Math.max(0.1, composite));
}

/**
 * Calculates Bayesian-Smoothed Review Rating (0.0 to 1.0):
 * Adjusted Rating = (C * PriorMean + N * AvgRating) / (C + N)
 */
export function calculateBayesianRating(
  avgRating?: number,
  reviewCount?: number,
  priorMean: number = 4.0,
  confidenceC: number = 3.0
): number {
  const N = reviewCount || 0;
  const R = avgRating || priorMean;

  const adjustedStars = (confidenceC * priorMean + N * R) / (confidenceC + N);
  // Normalize 1–5 stars to 0.0–1.0
  return Math.min(1.0, Math.max(0.0, adjustedStars / 5.0));
}

/**
 * Stage 3: Multi-Factor Mentorship-Fit Ranking.
 * Ranks retrieved candidates by calculating independent, normalized score components
 * and combining them via configurable weights.
 */
export function rankCandidates(
  mentee: MenteeGoalInput,
  retrieved: RetrievedCandidate[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): RankedCandidate[] {
  const { weights, seniorityMu, senioritySigma, bayesianPriorMean, bayesianConfidenceC } = config;

  return retrieved.map((item) => {
    const { mentor, semanticSimilarity, skillCoverage, sharedSkills, canTeachSkills } = item;

    // A. Career-Path Relevance
    const career = calculateCareerPathRelevance(mentee, mentor);

    // B. Seniority Compatibility
    const seniority = calculateSeniorityCompatibility(mentee, mentor, seniorityMu, senioritySigma);

    // C. Mentoring Capability
    const mentoring = calculateMentoringCapability(mentee, mentor);

    // D. Availability Compatibility
    const availability = calculateAvailabilityCompatibility(mentee, mentor);

    // E. Reliability
    const reliability = calculateReliabilityScore(mentor);

    // F. Bayesian Rating
    const rating = calculateBayesianRating(
      mentor.averageRating,
      mentor.reviewCount,
      bayesianPriorMean,
      bayesianConfidenceC
    );

    const scoreBreakdown: ScoreBreakdown = {
      semantic: Number(semanticSimilarity.toFixed(4)),
      skillCoverage: Number(skillCoverage.toFixed(4)),
      careerRelevance: Number(career.score.toFixed(4)),
      mentoringCapability: Number(mentoring.score.toFixed(4)),
      seniority: Number(seniority.toFixed(4)),
      availability: Number(availability.score.toFixed(4)),
      reliability: Number(reliability.toFixed(4)),
      rating: Number(rating.toFixed(4)),
    };

    // Final Weighted Composite Score (Deterministic & Reproducible)
    const finalScore =
      weights.semantic * scoreBreakdown.semantic +
      weights.skillCoverage * scoreBreakdown.skillCoverage +
      weights.careerRelevance * scoreBreakdown.careerRelevance +
      weights.mentoringCapability * scoreBreakdown.mentoringCapability +
      weights.seniority * scoreBreakdown.seniority +
      weights.availability * scoreBreakdown.availability +
      weights.reliability * scoreBreakdown.reliability +
      weights.rating * scoreBreakdown.rating;

    const rationaleFacts = [
      ...career.facts,
      ...mentoring.facts,
    ];

    if (canTeachSkills.length > 0) {
      rationaleFacts.push(`Strong overlap in ${canTeachSkills.slice(0, 3).join(", ")}`);
    } else if (sharedSkills.length > 0) {
      rationaleFacts.push(`Shared tech stack in ${sharedSkills.slice(0, 3).join(", ")}`);
    }

    if (availability.compatibleTimes.length > 0 && availability.score >= 0.7) {
      rationaleFacts.push(`Compatible times: ${availability.compatibleTimes[0]}`);
    }

    return {
      mentor,
      finalScore: Number(finalScore.toFixed(4)),
      scoreBreakdown,
      sharedSkills,
      canTeachSkills,
      compatibleTimes: availability.compatibleTimes,
      rationaleFacts,
    };
  });
}
