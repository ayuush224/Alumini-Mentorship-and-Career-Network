import { RankedCandidate } from "./ranking";
import { calculateJaccardSimilarity } from "./taxonomy";

/**
 * Calculates inter-mentor similarity (0.0 to 1.0) based on:
 * - Company identity (40%)
 * - Industry identity (30%)
 * - Skill taxonomy overlap (30%)
 */
function computeMentorPairSimilarity(a: RankedCandidate, b: RankedCandidate): number {
  let sim = 0;

  // 1. Same Company
  const compA = (a.mentor.company || "").trim().toLowerCase();
  const compB = (b.mentor.company || "").trim().toLowerCase();
  if (compA && compB && compA === compB && compA !== "independent") {
    sim += 0.40;
  }

  // 2. Same Industry
  const indA = (a.mentor.industry || "").trim().toLowerCase();
  const indB = (b.mentor.industry || "").trim().toLowerCase();
  if (indA && indB && indA === indB) {
    sim += 0.30;
  }

  // 3. Skill overlap
  const skillSim = calculateJaccardSimilarity(
    a.mentor.skills || [],
    b.mentor.skills || []
  );
  sim += 0.30 * skillSim;

  return Math.min(1.0, sim);
}

/**
 * Stage 4: Maximal Marginal Relevance (MMR) Diversity Reranking.
 *
 * Prevents recommending 5 nearly identical mentors from the same employer or background
 * while strictly preserving high relevance.
 *
 * MMR Formula:
 * argmax_{d in Remaining} [ lambda * Score(d) - (1 - lambda) * max_{s in Selected} Sim(d, s) ]
 *
 * @param candidates Sorted ranked candidates from Stage 3
 * @param limit Number of final recommendations to return
 * @param lambda Trade-off factor: 0.75 = 75% relevance, 25% diversity
 */
export function applyMMRDiversity(
  candidates: RankedCandidate[],
  limit: number = 12,
  lambda: number = 0.75
): RankedCandidate[] {
  if (candidates.length <= 1) return candidates;

  const remaining = [...candidates];
  const selected: RankedCandidate[] = [];

  // Pick the absolute highest scoring candidate first
  const first = remaining.shift()!;
  selected.push(first);

  const targetCount = Math.min(limit, candidates.length);

  while (selected.length < targetCount && remaining.length > 0) {
    let bestIndex = 0;
    let bestMMR = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Find max similarity to any already selected mentor
      let maxSimToSelected = 0;
      for (const sel of selected) {
        const sim = computeMentorPairSimilarity(candidate, sel);
        if (sim > maxSimToSelected) {
          maxSimToSelected = sim;
        }
      }

      // MMR Score: Relevance vs Novelty
      const mmrScore = lambda * candidate.finalScore - (1.0 - lambda) * maxSimToSelected;

      if (mmrScore > bestMMR) {
        bestMMR = mmrScore;
        bestIndex = i;
      }
    }

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
}
