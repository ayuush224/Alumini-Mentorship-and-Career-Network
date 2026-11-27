import {
  MenteeGoalInput,
  MentorCandidate,
  ScoredRecommendation,
  EngineConfig,
  DEFAULT_ENGINE_CONFIG,
} from "./types";
import { applyHardEligibilityFilters } from "./filters";
import { retrieveCandidates } from "./retrieval";
import { rankCandidates } from "./ranking";
import { applyMMRDiversity } from "./diversity";
import { generateExplanations } from "./explanations";

export * from "./types";
export * from "./taxonomy";
export * from "./pseudo-doc";
export * from "./embedding";
export * from "./filters";
export * from "./retrieval";
export * from "./ranking";
export * from "./diversity";
export * from "./explanations";

export interface RecommendationFunnelMetrics {
  totalCandidates: number;
  eligibleCandidates: number;
  retrievedCandidates: number;
  finalRecommendations: number;
  timing: {
    filteringMs: number;
    retrievalMs: number;
    rankingMs: number;
    diversityMs: number;
    totalMs: number;
  };
}

export interface RecommendationResult {
  recommendations: ScoredRecommendation[];
  metrics: RecommendationFunnelMetrics;
}

/**
 * Executes the complete 4-Stage Mentorship Recommendation Engine:
 * 
 * Stage 1: Hard Eligibility Filters & Available Capacity Calculation
 * Stage 2: Dense Semantic & Hybrid Retrieval
 * Stage 3: Multi-Factor Mentorship-Fit Ranking
 * Stage 4: MMR Diversity Reranking & Fact-Grounded Explanation Generation
 */
export function recommendMentors(
  mentee: MenteeGoalInput,
  mentors: MentorCandidate[],
  options: {
    config?: Partial<EngineConfig>;
    activeMentorIds?: Set<string>;
    pendingMentorIds?: Set<string>;
    limit?: number;
    applyDiversity?: boolean;
  } = {}
): RecommendationResult {
  const tStart = performance.now();
  const config: EngineConfig = {
    ...DEFAULT_ENGINE_CONFIG,
    ...(options.config || {}),
    weights: {
      ...DEFAULT_ENGINE_CONFIG.weights,
      ...(options.config?.weights || {}),
    },
  };

  const limit = options.limit || 12;
  const activeIds = options.activeMentorIds || new Set<string>();
  const pendingIds = options.pendingMentorIds || new Set<string>();

  // --------------------------------------------------------------------------
  // STAGE 1: HARD ELIGIBILITY FILTERS
  // --------------------------------------------------------------------------
  const tFilterStart = performance.now();
  const { eligibleMentors } = applyHardEligibilityFilters(mentee, mentors, {
    activeMentorIds: activeIds,
    pendingMentorIds: pendingIds,
    enforceInstitution: true,
    requiredInstitutionId: mentee.institutionId,
  });
  const filteringMs = performance.now() - tFilterStart;

  // --------------------------------------------------------------------------
  // STAGE 2: EMBEDDING & HYBRID RETRIEVAL
  // --------------------------------------------------------------------------
  const tRetrievalStart = performance.now();
  const retrieved = retrieveCandidates(
    mentee,
    eligibleMentors,
    config.retrievalCandidatePoolSize
  );
  const retrievalMs = performance.now() - tRetrievalStart;

  // --------------------------------------------------------------------------
  // STAGE 3: MULTI-FACTOR MENTORSHIP-FIT RANKING
  // --------------------------------------------------------------------------
  const tRankingStart = performance.now();
  const ranked = rankCandidates(mentee, retrieved, config);
  // Sort descending by finalScore
  ranked.sort((a, b) => b.finalScore - a.finalScore);
  const rankingMs = performance.now() - tRankingStart;

  // --------------------------------------------------------------------------
  // STAGE 4: DIVERSITY RERANKING & FACT-GROUNDED EXPLANATIONS
  // --------------------------------------------------------------------------
  const tDiversityStart = performance.now();
  const diversified = (options.applyDiversity ?? true)
    ? applyMMRDiversity(ranked, limit, config.diversityLambda)
    : ranked.slice(0, limit);

  const recommendations: ScoredRecommendation[] = diversified.map((candidate) =>
    generateExplanations(mentee, candidate, {
      hasPendingRequest: pendingIds.has(candidate.mentor.mentorId),
      hasActiveMentorship: activeIds.has(candidate.mentor.mentorId),
    })
  );
  const diversityMs = performance.now() - tDiversityStart;

  const totalMs = performance.now() - tStart;

  return {
    recommendations,
    metrics: {
      totalCandidates: mentors.length,
      eligibleCandidates: eligibleMentors.length,
      retrievedCandidates: retrieved.length,
      finalRecommendations: recommendations.length,
      timing: {
        filteringMs: Number(filteringMs.toFixed(2)),
        retrievalMs: Number(retrievalMs.toFixed(2)),
        rankingMs: Number(rankingMs.toFixed(2)),
        diversityMs: Number(diversityMs.toFixed(2)),
        totalMs: Number(totalMs.toFixed(2)),
      },
    },
  };
}
