import { MenteeGoalInput, MentorCandidate } from "./types";
import { generateMenteePseudoDocument, generateMentorPseudoDocument } from "./pseudo-doc";
import { getDenseEmbedding, computeCosineSimilarity } from "./embedding";
import {
  canonicalSkillOverlap,
  calculateSkillCoverage,
  calculateJaccardSimilarity,
  normalizeSkills,
} from "./taxonomy";

export interface RetrievedCandidate {
  mentor: MentorCandidate;
  semanticSimilarity: number;
  skillCoverage: number;
  jaccardSimilarity: number;
  sharedSkills: string[];
  canTeachSkills: string[];
  retrievalScore: number;
}

/**
 * Stage 2: Hybrid Retrieval.
 *
 * Retrieves a candidate pool of eligible mentors (typically 50–100) using:
 * 1. Dense Semantic Similarity: Cosine similarity of 384-d normalized pseudo-document embeddings.
 * 2. Canonical Skill Overlap & Coverage: Exact canonical match of desired skills to mentor skills.
 * 3. Jaccard Similarity: Symmetric set similarity between student and mentor skill taxonomies.
 *
 * Preserves individual similarity metrics for subsequent multi-factor ranking without double-counting.
 */
export function retrieveCandidates(
  mentee: MenteeGoalInput,
  eligibleMentors: MentorCandidate[],
  poolSize: number = 75
): RetrievedCandidate[] {
  if (eligibleMentors.length === 0) return [];

  // 1. Generate Mentee Structured Pseudo-Document and Single Query Embedding
  const menteeDoc = generateMenteePseudoDocument(mentee);
  const menteeEmbedding = getDenseEmbedding(menteeDoc, true);

  const studentTargetSkills = normalizeSkills([
    ...(mentee.skillsToLearn || []),
    ...(mentee.knowledgeGaps || []),
  ]);
  const studentAllSkills = normalizeSkills([
    ...studentTargetSkills,
    ...(mentee.currentSkills || []),
  ]);

  const scoredCandidates: RetrievedCandidate[] = eligibleMentors.map((mentor) => {
    // 2. Generate / Retrieve Mentor Embedding (Reuses pre-computed capabilityEmbedding if present)
    let mentorEmbedding: Float32Array;
    if (mentor.capabilityEmbedding && mentor.capabilityEmbedding.length === 384) {
      mentorEmbedding = mentor.capabilityEmbedding instanceof Float32Array
        ? mentor.capabilityEmbedding
        : new Float32Array(mentor.capabilityEmbedding);
    } else {
      const mentorDoc = generateMentorPseudoDocument(mentor);
      mentorEmbedding = getDenseEmbedding(mentorDoc, false);
    }

    // 3. Dense Semantic Similarity
    const semanticSimilarity = computeCosineSimilarity(menteeEmbedding, mentorEmbedding);

    // 4. Canonical Skill Sets
    const mentorSkills = normalizeSkills([
      ...(mentor.skills || []),
      ...(mentor.expertiseTags || []),
    ]);
    const mentorCanTeach = normalizeSkills(
      mentor.skillsCanTeach && mentor.skillsCanTeach.length > 0
        ? mentor.skillsCanTeach
        : mentorSkills
    );

    // 5. Shared Skills & Skill Coverage
    const sharedSkills = canonicalSkillOverlap(studentAllSkills, mentorSkills);
    const canTeachSkills = canonicalSkillOverlap(studentTargetSkills, mentorCanTeach);
    
    const skillCoverage = studentTargetSkills.length > 0
      ? calculateSkillCoverage(studentTargetSkills, mentorCanTeach)
      : calculateSkillCoverage(studentAllSkills, mentorSkills);

    const jaccardSim = calculateJaccardSimilarity(studentAllSkills, mentorSkills);

    // 6. Hybrid Retrieval Composite Score for candidate filtering
    // Prioritize skill coverage when student explicitly identified required skills
    let retrievalScore = 0;
    if (studentTargetSkills.length > 0) {
      retrievalScore = 0.55 * semanticSimilarity + 0.45 * skillCoverage;
    } else {
      retrievalScore = 0.70 * semanticSimilarity + 0.30 * jaccardSim;
    }

    return {
      mentor,
      semanticSimilarity,
      skillCoverage,
      jaccardSimilarity: jaccardSim,
      sharedSkills,
      canTeachSkills,
      retrievalScore,
    };
  });

  // Sort descending by retrieval score and take the top poolSize
  scoredCandidates.sort((a, b) => b.retrievalScore - a.retrievalScore);
  return scoredCandidates.slice(0, poolSize);
}
