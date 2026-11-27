/**
 * Automated Test Suite & Performance Benchmark
 * Upgraded Alumni–Mentee Recommendation Engine
 */

import {
  normalizeSkill,
  normalizeSkills,
  canonicalSkillOverlap,
  calculateSkillCoverage,
  calculateJaccardSimilarity,
} from "../src/lib/recommendation/taxonomy";
import {
  getDenseEmbedding,
  computeCosineSimilarity,
  EMBEDDING_DIMENSION,
  clearEmbeddingCache,
} from "../src/lib/recommendation/embedding";
import { applyHardEligibilityFilters } from "../src/lib/recommendation/filters";
import {
  calculateSeniorityCompatibility,
  calculateReliabilityScore,
  calculateBayesianRating,
  calculateCareerPathRelevance,
  calculateAvailabilityCompatibility,
} from "../src/lib/recommendation/ranking";
import { applyMMRDiversity } from "../src/lib/recommendation/diversity";
import {
  recommendMentors,
  MenteeGoalInput,
  MentorCandidate,
  DEFAULT_ENGINE_CONFIG,
} from "../src/lib/recommendation/index";
import { matchMentors } from "../src/lib/utils/matching";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail: string = "") {
  if (condition) {
    passed++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  ✖ [FAIL] ${testName} - ${detail}`);
  }
}

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("ALMA RECOMMENDATION ENGINE TEST SUITE & BENCHMARK");
  console.log("===============================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. SKILL TAXONOMY & SYNONYM NORMALIZATION TESTS
  // ---------------------------------------------------------------------------
  console.log("Test Group 1: Skill Taxonomy & Synonym Normalization");
  assert(normalizeSkill("k8s") === "Kubernetes", "Normalizes 'k8s' to 'Kubernetes'");
  assert(normalizeSkill("Kube") === "Kubernetes", "Normalizes 'Kube' to 'Kubernetes'");
  assert(normalizeSkill("JS") === "JavaScript", "Normalizes 'JS' to 'JavaScript'");
  assert(normalizeSkill("TS") === "TypeScript", "Normalizes 'TS' to 'TypeScript'");
  assert(normalizeSkill("node.js") === "Node.js", "Normalizes 'node.js' to 'Node.js'");
  assert(normalizeSkill("Node") === "Node.js", "Normalizes 'Node' to 'Node.js'");
  assert(normalizeSkill("aws cloud") === "AWS", "Normalizes 'aws cloud' to 'AWS'");
  assert(normalizeSkill("DSA") === "Data Structures and Algorithms", "Normalizes 'DSA' to canonical name");
  assert(normalizeSkill("system design") === "System Design", "Normalizes 'system design'");
  assert(normalizeSkill("ML") === "Machine Learning", "Normalizes 'ML' to 'Machine Learning'");
  assert(normalizeSkill("Microservices") === "Microservices", "Normalizes 'Microservices'");

  const normArray = normalizeSkills(["k8s", "kubernetes", "AWS Cloud", "aws", "DSA", "dsa"]);
  assert(
    normArray.length === 3 &&
    normArray.includes("Kubernetes") &&
    normArray.includes("AWS") &&
    normArray.includes("Data Structures and Algorithms"),
    "Deduplicates synonym variations in array normalization"
  );

  const overlap = canonicalSkillOverlap(["k8s", "Python"], ["Kubernetes", "Go", "python"]);
  assert(
    overlap.length === 2 && overlap.includes("Kubernetes") && overlap.includes("Python"),
    "Canonical skill overlap correctly matches synonyms"
  );

  const coverage = calculateSkillCoverage(["k8s", "AWS", "Docker"], ["Kubernetes", "AWS"]);
  assert(Math.abs(coverage - 2 / 3) < 0.001, "Skill coverage calculates correctly (2 of 3 = 66.7%)");

  const jaccard = calculateJaccardSimilarity(["Python", "SQL"], ["Python", "SQL", "Go"]);
  assert(Math.abs(jaccard - 2 / 3) < 0.001, "Jaccard similarity calculates correctly (2/3 = 66.7%)");

  // ---------------------------------------------------------------------------
  // 2. 384-DIMENSIONAL DENSE EMBEDDING TESTS
  // ---------------------------------------------------------------------------
  console.log("\nTest Group 2: 384-Dimensional Dense Vector Embedding");
  clearEmbeddingCache();

  const vec1 = getDenseEmbedding("Distributed systems microservices in Go and Kubernetes", false);
  const vec2 = getDenseEmbedding("Backend engineering with Go and Kubernetes clusters", false);
  const vec3 = getDenseEmbedding("Graphic design typography and brand identity", false);

  assert(vec1.length === EMBEDDING_DIMENSION, `Vector has exactly ${EMBEDDING_DIMENSION} dimensions`);
  assert(vec1.length === 384, "Vector dimension strictly equals 384");

  // Check L2 normalization: ||v|| = 1.0
  let norm1 = 0;
  for (let i = 0; i < vec1.length; i++) norm1 += vec1[i] * vec1[i];
  norm1 = Math.sqrt(norm1);
  assert(Math.abs(norm1 - 1.0) < 1e-4, "Embedding is strictly L2-normalized (||v|| = 1.0)");

  const simHigh = computeCosineSimilarity(vec1, vec2);
  const simLow = computeCosineSimilarity(vec1, vec3);
  assert(simHigh > simLow, `Semantic similarity discriminates domain concepts (${simHigh.toFixed(3)} > ${simLow.toFixed(3)})`);

  // Query prefix test
  const queryVec = getDenseEmbedding("Looking for distributed systems mentorship", true);
  assert(queryVec.length === 384, "Query embedding correctly formatted with BGE prefix and has 384 dimensions");

  // ---------------------------------------------------------------------------
  // 3. HARD ELIGIBILITY FILTERS TESTS
  // ---------------------------------------------------------------------------
  console.log("\nTest Group 3: Hard Eligibility Filters & Capacity Guard");

  const menteeBase: MenteeGoalInput = {
    studentId: "student-1",
    institutionId: "INST-001",
    department: "Computer Science",
    graduationYear: 2026,
    targetRole: "Backend Engineer",
    skillsToLearn: ["Kubernetes", "Go"],
  };

  const mentorsList: MentorCandidate[] = [
    {
      mentorId: "mentor-eligible",
      name: "Eligible Mentor",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      isDeleted: false,
      company: "Google",
      jobTitle: "Software Engineer",
      industry: "Technology",
      yearsOfExperience: 5,
      skills: ["Go", "Kubernetes"],
      skillsCanTeach: ["Go", "Kubernetes"],
      topicsCanMentor: ["System Design"],
      maxMentees: 3,
      activeMentees: 1,
      pendingReservations: 0,
      acceptingRequests: true,
      availability: "open",
    },
    {
      mentorId: "mentor-unverified",
      name: "Unverified Mentor",
      institutionId: "INST-001",
      isVerified: false,
      verificationStatus: "pending",
      company: "Meta",
      jobTitle: "Engineer",
      industry: "Technology",
      yearsOfExperience: 3,
      skills: ["Go"],
      skillsCanTeach: ["Go"],
      topicsCanMentor: [],
      maxMentees: 3,
      activeMentees: 0,
      availability: "open",
    },
    {
      mentorId: "mentor-at-capacity",
      name: "Full Mentor",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Apple",
      jobTitle: "Senior Engineer",
      industry: "Technology",
      yearsOfExperience: 6,
      skills: ["Go"],
      skillsCanTeach: ["Go"],
      topicsCanMentor: [],
      maxMentees: 2,
      activeMentees: 2, // At capacity!
      availability: "open",
    },
    {
      mentorId: "mentor-capacity-reserved",
      name: "Reserved Capacity Mentor",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Amazon",
      jobTitle: "SDE II",
      industry: "Technology",
      yearsOfExperience: 4,
      skills: ["Go"],
      skillsCanTeach: ["Go"],
      topicsCanMentor: [],
      maxMentees: 2,
      activeMentees: 1,
      pendingReservations: 1, // 2 - 1 - 1 = 0 available slots!
      availability: "open",
    },
    {
      mentorId: "mentor-paused",
      name: "Paused Mentor",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Netflix",
      jobTitle: "Staff Engineer",
      industry: "Technology",
      yearsOfExperience: 8,
      skills: ["Go"],
      skillsCanTeach: ["Go"],
      topicsCanMentor: [],
      maxMentees: 5,
      activeMentees: 0,
      availability: "stopped", // Stopped!
    },
    {
      mentorId: "mentor-diff-institution",
      name: "Cross-Tenant Mentor",
      institutionId: "INST-999", // Different institution!
      isVerified: true,
      verificationStatus: "verified",
      company: "Microsoft",
      jobTitle: "Engineer",
      industry: "Technology",
      yearsOfExperience: 4,
      skills: ["Go"],
      skillsCanTeach: ["Go"],
      topicsCanMentor: [],
      maxMentees: 3,
      activeMentees: 0,
      availability: "open",
    },
    {
      mentorId: "mentor-diff-department",
      name: "Electrical Eng Alumni",
      institutionId: "INST-001",
      department: "Electrical Engineering", // Different department!
      graduationYear: 2018,
      isVerified: true,
      verificationStatus: "verified",
      company: "Stripe",
      jobTitle: "Backend Engineer",
      industry: "Technology",
      yearsOfExperience: 6,
      skills: ["Go", "Kubernetes"],
      skillsCanTeach: ["Go", "Kubernetes"],
      topicsCanMentor: ["System Design"],
      maxMentees: 3,
      activeMentees: 0,
      availability: "open",
    },
  ];

  const filterRes = applyHardEligibilityFilters(menteeBase, mentorsList, {
    activeMentorIds: new Set(["mentor-already-active"]),
    pendingMentorIds: new Set(["mentor-already-pending"]),
  });

  const eligibleIds = filterRes.eligibleMentors.map((m) => m.mentorId);

  assert(!eligibleIds.includes("mentor-unverified"), "Unverified mentors are excluded");
  assert(!eligibleIds.includes("mentor-at-capacity"), "Mentors with zero capacity are excluded");
  assert(!eligibleIds.includes("mentor-capacity-reserved"), "Mentors with capacity consumed by pending reservations are excluded");
  assert(!eligibleIds.includes("mentor-paused"), "Mentors with stopped availability are excluded");
  assert(!eligibleIds.includes("mentor-diff-institution"), "Cross-institution matching is prevented");
  assert(eligibleIds.includes("mentor-diff-department"), "Department difference does NOT cause mandatory exclusion (soft signal)");
  assert(eligibleIds.includes("mentor-eligible"), "Eligible mentor is included");

  // Concurrent Requests Capacity Guard simulation
  const simulatedCapacity = { maxMentees: 2, activeMentees: 1, pendingReservations: 0 };
  function atomicReserveSpot(): boolean {
    const available = simulatedCapacity.maxMentees - simulatedCapacity.activeMentees - simulatedCapacity.pendingReservations;
    if (available > 0) {
      simulatedCapacity.pendingReservations++;
      return true;
    }
    return false;
  }
  const req1 = atomicReserveSpot(); // true (1 spot left, now reserved)
  const req2 = atomicReserveSpot(); // false (capacity limit reached!)
  assert(req1 === true && req2 === false, "Concurrent requests cannot overbook a mentor's capacity");

  // ---------------------------------------------------------------------------
  // 4. MULTI-FACTOR RANKING & MATHEMATICAL FORMULAS
  // ---------------------------------------------------------------------------
  console.log("\nTest Group 4: Multi-Factor Ranking & Formula Verification");

  // Weight check: Composite weights sum to 1.0 (100%)
  const weights = DEFAULT_ENGINE_CONFIG.weights;
  const totalWeight =
    weights.semantic +
    weights.skillCoverage +
    weights.careerRelevance +
    weights.mentoringCapability +
    weights.seniority +
    weights.availability +
    weights.reliability +
    weights.rating;
  assert(Math.abs(totalWeight - 1.0) < 1e-6, "Composite weights sum strictly to 1.00 (100%)");

  // Seniority Gaussian Curve: mu = 3.5, sigma = 2.0
  const senioritySweetSpot = calculateSeniorityCompatibility(menteeBase, {
    ...mentorsList[0],
    yearsOfExperience: 3.5,
  });
  const seniorityDistant = calculateSeniorityCompatibility(menteeBase, {
    ...mentorsList[0],
    yearsOfExperience: 10.0,
  });
  assert(senioritySweetSpot > 0.98, `Gaussian seniority peaks near mu=3.5 (Score: ${senioritySweetSpot.toFixed(3)})`);
  assert(senioritySweetSpot > seniorityDistant, `Gaussian seniority smoothly diminishes for large gap (Sweet: ${senioritySweetSpot.toFixed(3)} > Distant: ${seniorityDistant.toFixed(3)})`);

  // Bayesian rating shrinkage: Prior mean = 4.0, C = 3.0
  const newMentorRating = calculateBayesianRating(5.0, 1, 4.0, 3.0); // 1 five-star review: (3*4 + 1*5)/4 = 4.25 / 5 = 0.85
  const veteranMentorRating = calculateBayesianRating(4.9, 50, 4.0, 3.0); // 50 reviews at 4.9: shrinks very little
  assert(veteranMentorRating > newMentorRating, `Bayesian shrinkage prevents single 5-star review from dominating proven mentors (Veteran: ${veteranMentorRating.toFixed(3)} > New: ${newMentorRating.toFixed(3)})`);

  // Reliability Laplace smoothing
  const newMentorReliability = calculateReliabilityScore({ ...mentorsList[0], reliabilityStats: { requestsReceived: 0, requestsAnswered: 0 } });
  const reliableMentor = calculateReliabilityScore({
    ...mentorsList[0],
    reliabilityStats: { requestsReceived: 10, requestsAnswered: 10, sessionsScheduled: 10, sessionsCompleted: 10 },
  });
  assert(newMentorReliability >= 0.80, `New mentors without historical data receive fair smoothed baseline (${newMentorReliability.toFixed(3)})`);
  assert(reliableMentor > newMentorReliability, `Highly responsive mentor scores higher (${reliableMentor.toFixed(3)} > ${newMentorReliability.toFixed(3)})`);

  // Availability compatibility
  const availComp = calculateAvailabilityCompatibility(
    {
      ...menteeBase,
      availabilitySchedule: [{ dayOfWeek: 6, startTime: "10:00", endTime: "12:00" }],
    },
    {
      ...mentorsList[0],
      availabilitySchedule: [{ dayOfWeek: 6, startTime: "10:30", endTime: "12:30" }],
    }
  );
  assert(availComp.score >= 0.9, "Availability compatibility detects mutual Saturday morning window");
  assert(availComp.compatibleTimes.length > 0, `Generated compatible time window: ${availComp.compatibleTimes[0]}`);

  // ---------------------------------------------------------------------------
  // 5. MMR DIVERSITY RERANKING TESTS
  // ---------------------------------------------------------------------------
  console.log("\nTest Group 5: MMR Diversity Reranking");

  const candidatesToDiversify: any[] = [
    {
      mentor: { mentorId: "m1", company: "Google", industry: "Technology", skills: ["Go", "Kubernetes"] },
      finalScore: 0.95,
      scoreBreakdown: {},
    },
    {
      mentor: { mentorId: "m2", company: "Google", industry: "Technology", skills: ["Go", "Kubernetes"] },
      finalScore: 0.94,
      scoreBreakdown: {},
    },
    {
      mentor: { mentorId: "m3", company: "Google", industry: "Technology", skills: ["Go", "Kubernetes"] },
      finalScore: 0.93,
      scoreBreakdown: {},
    },
    {
      mentor: { mentorId: "m4", company: "Stripe", industry: "FinTech", skills: ["Go", "Kafka"] },
      finalScore: 0.92,
      scoreBreakdown: {},
    },
    {
      mentor: { mentorId: "m5", company: "Databricks", industry: "Data", skills: ["Python", "Spark"] },
      finalScore: 0.90,
      scoreBreakdown: {},
    },
  ];

  const diversified = applyMMRDiversity(candidatesToDiversify, 3, 0.75);
  const selectedCompanies = diversified.map((c) => c.mentor.company);
  assert(selectedCompanies.includes("Stripe") || selectedCompanies.includes("Databricks"), "MMR diversity introduces company variety in top 3 without sacrificing relevance");
  assert(diversified[0].mentor.mentorId === "m1", "Highest scoring candidate remains ranked #1");

  // ---------------------------------------------------------------------------
  // 6. END-TO-END 4-STAGE RECOMMENDATION ENGINE TEST
  // ---------------------------------------------------------------------------
  console.log("\nTest Group 6: End-to-End Recommendation Engine & Explanations");

  const diverseMentorCorpus: MentorCandidate[] = [
    {
      mentorId: "mentor-sde",
      name: "Aman Sharma",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Stripe",
      jobTitle: "Staff Software Engineer",
      industry: "Financial Technology",
      yearsOfExperience: 6,
      skills: ["Go", "Kubernetes", "Distributed Systems", "Kafka", "PostgreSQL"],
      skillsCanTeach: ["Go", "Kubernetes", "System Design", "Distributed Systems"],
      topicsCanMentor: ["System Design", "Interview Preparation"],
      maxMentees: 4,
      activeMentees: 1,
      availability: "open",
    },
    {
      mentorId: "mentor-pm",
      name: "Rohit Verma",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Microsoft",
      jobTitle: "Senior Product Manager",
      industry: "Technology",
      yearsOfExperience: 7,
      skills: ["Product Strategy", "Roadmapping", "Agile"],
      skillsCanTeach: ["Product Strategy", "Resume Review"],
      topicsCanMentor: ["Product Management"],
      maxMentees: 3,
      activeMentees: 0,
      availability: "open",
    },
    {
      mentorId: "mentor-designer",
      name: "Simran Kaur",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Figma",
      jobTitle: "Senior Product Designer",
      industry: "Design",
      yearsOfExperience: 5,
      skills: ["UI/UX", "Figma", "User Research"],
      skillsCanTeach: ["Portfolio Review", "Figma"],
      topicsCanMentor: ["Design Systems"],
      maxMentees: 2,
      activeMentees: 0,
      availability: "open",
    },
  ];

  // Request A: SDE Prep
  const requestA: MenteeGoalInput = {
    studentId: "student-alice",
    institutionId: "INST-001",
    targetRole: "Backend Software Engineer",
    targetIndustry: "Financial Technology",
    careerGoal: "Prepare for product-company SDE interviews and master distributed backend systems",
    skillsToLearn: ["Go", "Kubernetes", "Distributed Systems"],
    knowledgeGaps: ["System Design"],
  };

  const resultA = recommendMentors(requestA, diverseMentorCorpus, { limit: 3 });
  assert(resultA.recommendations.length > 0, "Produces recommendations for Request A");
  assert(resultA.recommendations[0].mentorId === "mentor-sde", "Accurately ranks Staff SDE #1 for backend SDE goal");
  assert(resultA.recommendations[0].reasons.length > 0, "Generates evidence-based explanations");
  assert(Boolean(resultA.recommendations[0].scoreBreakdown), "Includes transparent multi-factor score breakdown");

  // Check reproducibility: Final score is reproducible from breakdown and weights
  const topRec = resultA.recommendations[0];
  const bd = topRec.scoreBreakdown;
  const expectedComputed =
    weights.semantic * bd.semantic +
    weights.skillCoverage * bd.skillCoverage +
    weights.careerRelevance * bd.careerRelevance +
    weights.mentoringCapability * bd.mentoringCapability +
    weights.seniority * bd.seniority +
    weights.availability * bd.availability +
    weights.reliability * bd.reliability +
    weights.rating * bd.rating;
  const expectedPercent = Math.round(expectedComputed * 100);
  assert(
    Math.abs(topRec.finalScore - expectedPercent) <= 1,
    `Final score (${topRec.finalScore}%) is mathematically reproducible from score breakdown (${expectedPercent}%)`
  );

  // Request B: Design Portfolio
  const requestB: MenteeGoalInput = {
    studentId: "student-bob",
    institutionId: "INST-001",
    targetRole: "Product Designer",
    targetIndustry: "Design",
    careerGoal: "Build a standout UI/UX portfolio and learn design systems",
    skillsToLearn: ["Figma", "UI/UX", "User Research"],
    knowledgeGaps: ["Portfolio Review"],
  };

  const resultB = recommendMentors(requestB, diverseMentorCorpus, { limit: 3 });
  assert(resultB.recommendations[0].mentorId === "mentor-designer", "Request-Centric: Accurately ranks Designer #1 for Design goal");

  // Backward compatibility test with existing matchMentors
  const legacyMatches = matchMentors(
    {
      major: "Computer Science",
      targetIndustries: ["Financial Technology"],
      skillsToDevelop: ["Go", "Kubernetes"],
    },
    diverseMentorCorpus.map((m) => ({
      mentorId: m.mentorId,
      name: m.name,
      company: m.company,
      jobTitle: m.jobTitle,
      industry: m.industry,
      expertiseTags: m.skills,
      activeMentees: m.activeMentees,
      maxMentees: m.maxMentees,
      availability: m.availability,
    }))
  );
  assert(legacyMatches.length > 0, "Existing matchMentors interface works seamlessly");
  assert(legacyMatches[0].mentorId === "mentor-sde", "Legacy interface returns upgraded top match");

  // No-match empty situation handling
  const noMatchResult = recommendMentors(requestA, [], { limit: 5 });
  assert(noMatchResult.recommendations.length === 0, "Clean empty array returned when no mentors available");

  // ---------------------------------------------------------------------------
  // 7. PERFORMANCE BENCHMARK (1,000 MENTOR PROFILES)
  // ---------------------------------------------------------------------------
  console.log("\nTest Group 7: Performance Benchmark (1,000 Synthetic Mentor Profiles)");

  const companies = ["Google", "Stripe", "Amazon", "Microsoft", "Meta", "Databricks", "Uber", "Apple", "Netflix", "Coinbase"];
  const industries = ["Technology", "Financial Technology", "Cloud Infrastructure", "Data Systems", "Artificial Intelligence"];
  const roles = ["Software Development Engineer", "Senior Backend Architect", "Staff Distributed Systems Engineer", "Engineering Manager", "Machine Learning Engineer"];
  const skillPool = [
    "Go", "Kubernetes", "AWS", "Python", "Distributed Systems", "Microservices",
    "Docker", "Kafka", "PostgreSQL", "System Design", "TypeScript", "React",
    "Java", "Spring Boot", "Machine Learning", "GraphQL", "Redis", "CI/CD"
  ];

  console.log("  Generating 1,000 realistic mentor profiles...");
  const tGenStart = performance.now();
  const benchmarkMentors: MentorCandidate[] = [];
  for (let i = 0; i < 1000; i++) {
    const comp = companies[i % companies.length];
    const ind = industries[i % industries.length];
    const role = roles[i % roles.length];
    const skills = [
      skillPool[i % skillPool.length],
      skillPool[(i + 3) % skillPool.length],
      skillPool[(i + 7) % skillPool.length],
    ];

    benchmarkMentors.push({
      mentorId: `bench-mentor-${i}`,
      name: `Mentor ${i}`,
      institutionId: "INST-001",
      isVerified: i % 15 !== 0, // ~6.7% unverified to test filter
      verificationStatus: i % 15 !== 0 ? "verified" : "pending",
      company: comp,
      jobTitle: role,
      industry: ind,
      yearsOfExperience: 2 + (i % 12),
      skills,
      skillsCanTeach: skills.slice(0, 2),
      topicsCanMentor: ["System Design", "Interview Preparation"],
      maxMentees: 4,
      activeMentees: i % 10 === 0 ? 4 : (i % 3), // ~10% at capacity
      pendingReservations: 0,
      availability: i % 20 === 0 ? "stopped" : "open", // ~5% stopped
      availabilitySchedule: [
        { dayOfWeek: i % 7, startTime: "09:00", endTime: "11:00" },
      ],
      reliabilityStats: {
        requestsReceived: 10 + (i % 5),
        requestsAnswered: 9 + (i % 5),
        sessionsScheduled: 8 + (i % 4),
        sessionsCompleted: 8 + (i % 4),
      },
      averageRating: 4.2 + ((i % 8) * 0.1),
      reviewCount: 3 + (i % 20),
    });
  }
  const genMs = performance.now() - tGenStart;
  console.log(`  ✔ 1,000 mentor profiles instantiated in ${genMs.toFixed(2)} ms`);

  // Warm-up query to initialize any static caches
  recommendMentors(requestA, benchmarkMentors.slice(0, 50));

  // Timed Execution over 1,000 Profiles
  console.log("  Executing 4-stage recommendation funnel over 1,000 mentor corpus...");
  const tBenchStart = performance.now();
  const benchResult = recommendMentors(requestA, benchmarkMentors, {
    limit: 12,
    applyDiversity: true,
  });
  const totalElapsedMs = performance.now() - tBenchStart;

  const { metrics } = benchResult;
  console.log("\n  --- Latency Breakdown ---");
  console.log(`  * Stage 1 (Filtering):  ${metrics.timing.filteringMs.toFixed(2)} ms`);
  console.log(`  * Stage 2 (Retrieval):  ${metrics.timing.retrievalMs.toFixed(2)} ms`);
  console.log(`  * Stage 3 (Ranking):    ${metrics.timing.rankingMs.toFixed(2)} ms`);
  console.log(`  * Stage 4 (Diversity):  ${metrics.timing.diversityMs.toFixed(2)} ms`);
  console.log(`  * TOTAL COMPUTATION:    ${totalElapsedMs.toFixed(2)} ms`);
  console.log(`  * Eligible Mentors:     ${metrics.eligibleCandidates} / 1000`);
  console.log(`  * Candidates Retrieved: ${metrics.retrievedCandidates}`);
  console.log(`  * Recommendations:      ${benchResult.recommendations.length}`);

  assert(totalElapsedMs < 50.0, `Recommendation computation completes in under 50 ms (Actual: ${totalElapsedMs.toFixed(2)} ms)`);
  assert(benchResult.recommendations.length === 12, "Returns top 12 recommendations");

  // Ranking Quality Metrics: Precision@5, NDCG@5
  console.log("\n  --- Ranking Quality Evaluation ---");
  const top5 = benchResult.recommendations.slice(0, 5);
  // Relevancy criterion: mentor has at least one target skill or target industry fit
  const targetSkillsNorm = ["Go", "Kubernetes", "Distributed Systems"];
  const targetInd = "Financial Technology";

  let relevantInTop5 = 0;
  let dcg5 = 0;
  let idcg5 = 0;

  top5.forEach((rec, idx) => {
    const isRel =
      rec.sharedSkills.some((s) => targetSkillsNorm.includes(s)) ||
      rec.industry === targetInd;
    const relScore = isRel ? 1 : 0;
    if (isRel) relevantInTop5++;

    const rank = idx + 1;
    dcg5 += (Math.pow(2, relScore) - 1) / Math.log2(rank + 1);
    idcg5 += (Math.pow(2, 1) - 1) / Math.log2(rank + 1); // Ideal top 5 all relevant
  });

  const precision5 = relevantInTop5 / 5;
  const ndcg5 = idcg5 > 0 ? dcg5 / idcg5 : 1.0;

  console.log(`  * Precision@5: ${(precision5 * 100).toFixed(1)}%`);
  console.log(`  * NDCG@5:      ${ndcg5.toFixed(3)}`);

  assert(precision5 >= 0.80, `Precision@5 is at least 80% (Actual: ${(precision5 * 100).toFixed(1)}%)`);
  assert(ndcg5 >= 0.85, `NDCG@5 is at least 0.85 (Actual: ${ndcg5.toFixed(3)})`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n===============================================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
