# Alma Recommendation Engine — Core Module (`src/lib/recommendation`)

This module houses the 4-Stage Mentorship Recommendation Engine for Alma.

## Architecture & Directory Layout

```text
src/lib/recommendation/
├── index.ts        # Main orchestrator (recommendMentors, timing metrics)
├── types.ts        # Interfaces (MenteeGoalInput, MentorCandidate, ScoreBreakdown, EngineConfig)
├── taxonomy.ts     # Canonical skill taxonomy, synonym normalization, skill coverage, Jaccard
├── pseudo-doc.ts   # Structured pseudo-document generation bridging profile asymmetry
├── embedding.ts    # 384-dimensional normalized dense vectors, dot product cosine similarity, LRU cache
├── filters.ts      # Stage 1: Hard eligibility filters (verification, status, capacity)
├── retrieval.ts    # Stage 2: Dense semantic & hybrid candidate retrieval (pool size 50–100)
├── ranking.ts      # Stage 3: Multi-factor ranking (Gaussian seniority, Bayesian rating, Laplace reliability)
├── diversity.ts    # Stage 4: Maximal Marginal Relevance (MMR) company & background diversification
└── explanations.ts # Stage 4: Truthful, non-hallucinated evidence strings & score breakdowns
```

## Quick Start

```typescript
import { recommendMentors, MenteeGoalInput, MentorCandidate } from "@/lib/recommendation";

const menteeGoal: MenteeGoalInput = {
  studentId: "student_abc",
  targetRole: "Backend Engineer",
  skillsToLearn: ["Go", "Kubernetes", "System Design"],
  careerGoal: "Secure an SDE internship at a product company",
};

const { recommendations, metrics } = recommendMentors(menteeGoal, mentorsList, {
  limit: 10,
  applyDiversity: true,
});

console.log(`Computed in ${metrics.timing.totalMs} ms`);
console.log(recommendations[0]);
```

## Running the Automated Test Suite

```bash
npx tsx tests/recommendation_engine.test.ts
```

For comprehensive technical specifications, mathematical formulas, and benchmarks, see [`docs/RECOMMENDATION_ENGINE.md`](file:///docs/RECOMMENDATION_ENGINE.md).
