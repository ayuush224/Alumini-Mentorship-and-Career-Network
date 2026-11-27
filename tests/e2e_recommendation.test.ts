/**
 * End-to-End Recommendation Engine Lifecycle Verification
 */

import {
  recommendMentors,
  MenteeGoalInput,
  MentorCandidate,
} from "../src/lib/recommendation/index";
import { matchMentors, calculateMatchScore } from "../src/lib/utils/matching";

async function runE2EVerification() {
  console.log("===============================================================================");
  console.log("STARTING END-TO-END RECOMMENDATION ENGINE VERIFICATION");
  console.log("===============================================================================\n");

  // Step 1: Mentee Goal Setup
  console.log("Step 1: Setting up Mentee Goal Request...");
  const studentGoal: MenteeGoalInput = {
    studentId: "student_e2e_001",
    institutionId: "INST-001",
    department: "Computer Science",
    graduationYear: 2026,
    targetRole: "Distributed Systems Engineer",
    targetIndustry: "Technology",
    careerGoal: "Pass technical interviews for cloud infrastructure and distributed storage",
    currentSkills: ["C++", "SQL", "Linux"],
    skillsToLearn: ["Go", "Kubernetes", "Distributed Systems", "Raft"],
    knowledgeGaps: ["System Design", "Consensus Algorithms"],
    problemDescription: "Need advice on preparing for backend architecture interviews and designing fault-tolerant systems",
    preferredMentoringStyle: "hands_on",
    preferredLanguage: "English",
    meetingPreference: "remote",
    availabilitySchedule: [
      { dayOfWeek: 6, startTime: "10:00", endTime: "12:00" }, // Saturday morning
    ],
  };
  console.log("✔ Mentee goal initialized: 'Distributed Systems Engineer' targeting Go, K8s, System Design\n");

  // Step 2: Realistic Candidate Pool
  console.log("Step 2: Preparing Candidate Corpus with varying qualifications & capacities...");
  const candidates: MentorCandidate[] = [
    {
      mentorId: "mentor_prime_fit",
      name: "Dr. Arvind Raghavan",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Google Cloud",
      jobTitle: "Staff Distributed Systems Architect",
      industry: "Technology",
      yearsOfExperience: 7,
      skills: ["Go", "Kubernetes", "Distributed Systems", "C++", "gRPC"],
      skillsCanTeach: ["Go", "Kubernetes", "Distributed Systems", "System Design"],
      topicsCanMentor: ["System Design", "Architecture Reviews", "Interview Preparation"],
      preferredMentoringStyle: "hands_on",
      meetingPreference: "remote",
      maxMentees: 4,
      activeMentees: 1,
      pendingReservations: 0,
      availability: "open",
      availabilitySchedule: [
        { dayOfWeek: 6, startTime: "10:30", endTime: "12:30" }, // Overlapping Saturday
      ],
      reliabilityStats: {
        requestsReceived: 12,
        requestsAnswered: 12,
        sessionsScheduled: 10,
        sessionsCompleted: 10,
      },
      averageRating: 4.95,
      reviewCount: 18,
    },
    {
      mentorId: "mentor_stripe_sde",
      name: "Meera Patel",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Stripe",
      jobTitle: "Senior Infrastructure Engineer",
      industry: "Financial Technology",
      yearsOfExperience: 5,
      skills: ["Go", "Kubernetes", "Kafka", "Docker", "AWS"],
      skillsCanTeach: ["Go", "Kubernetes", "Kafka"],
      topicsCanMentor: ["Backend Engineering", "Interview Preparation"],
      preferredMentoringStyle: "hands_on",
      meetingPreference: "remote",
      maxMentees: 3,
      activeMentees: 1,
      pendingReservations: 0,
      availability: "open",
      availabilitySchedule: [
        { dayOfWeek: 6, startTime: "09:00", endTime: "11:00" }, // Overlapping Saturday
      ],
      reliabilityStats: {
        requestsReceived: 8,
        requestsAnswered: 8,
        sessionsScheduled: 6,
        sessionsCompleted: 6,
      },
      averageRating: 4.8,
      reviewCount: 9,
    },
    {
      mentorId: "mentor_designer",
      name: "Kabir Mehta",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Figma",
      jobTitle: "Senior Product Designer",
      industry: "Design",
      yearsOfExperience: 6,
      skills: ["UI/UX", "Figma", "Design Systems"],
      skillsCanTeach: ["UI/UX", "Portfolio Review"],
      topicsCanMentor: ["Design Career"],
      maxMentees: 3,
      activeMentees: 0,
      availability: "open",
    },
    {
      mentorId: "mentor_full_capacity",
      name: "Siddharth Rao",
      institutionId: "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      company: "Netflix",
      jobTitle: "Principal Distributed Engineer",
      industry: "Technology",
      yearsOfExperience: 10,
      skills: ["Go", "Kubernetes", "Distributed Systems"],
      skillsCanTeach: ["Go", "Distributed Systems"],
      topicsCanMentor: ["System Design"],
      maxMentees: 2,
      activeMentees: 2, // FULL CAPACITY
      availability: "open",
    },
    {
      mentorId: "mentor_unverified",
      name: "Unverified Candidate",
      institutionId: "INST-001",
      isVerified: false, // UNVERIFIED
      verificationStatus: "pending",
      company: "Startup X",
      jobTitle: "Backend Lead",
      industry: "Technology",
      yearsOfExperience: 4,
      skills: ["Go", "Kubernetes"],
      skillsCanTeach: ["Go", "Kubernetes"],
      topicsCanMentor: [],
      maxMentees: 3,
      activeMentees: 0,
      availability: "open",
    },
  ];
  console.log(`✔ Candidate pool of ${candidates.length} mentors loaded.\n`);

  // Step 3: Run the 4-Stage Funnel
  console.log("Step 3: Running 4-Stage Funnel (Filtering -> Retrieval -> Ranking -> Diversity)...");
  const t0 = performance.now();
  const funnelResult = recommendMentors(studentGoal, candidates, {
    limit: 5,
    applyDiversity: true,
  });
  const elapsed = performance.now() - t0;

  console.log(`✔ Funnel executed in ${elapsed.toFixed(2)} ms`);
  console.log(`  - Total Candidates:      ${funnelResult.metrics.totalCandidates}`);
  console.log(`  - Eligible Candidates:   ${funnelResult.metrics.eligibleCandidates}`);
  console.log(`  - Retrieved Candidates:  ${funnelResult.metrics.retrievedCandidates}`);
  console.log(`  - Final Recommendations: ${funnelResult.recommendations.length}\n`);

  // Step 4: Validate Invariants
  console.log("Step 4: Validating Hard Invariants...");
  const recIds = funnelResult.recommendations.map((r) => r.mentorId);

  if (recIds.includes("mentor_full_capacity")) {
    throw new Error("INVARIANT VIOLATION: Full capacity mentor was not filtered!");
  }
  console.log("✔ Invariant 1: Mentors with zero available capacity strictly excluded.");

  if (recIds.includes("mentor_unverified")) {
    throw new Error("INVARIANT VIOLATION: Unverified mentor was not filtered!");
  }
  console.log("✔ Invariant 2: Unverified mentors strictly excluded.");

  // Step 5: Validate Top Recommendation Match & Explanations
  console.log("\nStep 5: Validating Top Match Quality & Fact-Grounded Evidence...");
  const topMatch = funnelResult.recommendations[0];
  console.log(`✔ Top Match: ${topMatch.name} (${topMatch.jobTitle} @ ${topMatch.company})`);
  console.log(`  Score: ${topMatch.finalScore}%`);
  console.log(`  Score Breakdown:`, JSON.stringify(topMatch.scoreBreakdown, null, 2));
  console.log(`  Evidence & Explanations:`);
  for (const reason of topMatch.reasons) {
    console.log(`   * "${reason}"`);
  }
  console.log(`  Compatible Windows:`, topMatch.compatibleTimes);

  if (topMatch.mentorId !== "mentor_prime_fit") {
    throw new Error(`Expected 'mentor_prime_fit' to be ranked #1, got '${topMatch.mentorId}'`);
  }
  if (!topMatch.reasons || topMatch.reasons.length === 0) {
    throw new Error("No explanation reasons generated!");
  }
  console.log("✔ Top match accuracy and explanation verification passed.\n");

  // Step 6: Validate Backward Compatibility with Legacy Callers
  console.log("Step 6: Verifying Legacy Caller Interfaces...");
  const legacySingle = calculateMatchScore(
    {
      targetIndustries: ["Technology"],
      skillsToDevelop: ["Go", "Kubernetes"],
    },
    {
      mentorId: candidates[0].mentorId,
      name: candidates[0].name,
      company: candidates[0].company,
      jobTitle: candidates[0].jobTitle,
      industry: candidates[0].industry,
      expertiseTags: candidates[0].skills,
      activeMentees: candidates[0].activeMentees,
      maxMentees: candidates[0].maxMentees,
    }
  );
  console.log(`✔ calculateMatchScore() legacy result: ${legacySingle.score}% match - "${legacySingle.rationale}"`);

  const legacyList = matchMentors(
    {
      targetIndustries: ["Technology"],
      skillsToDevelop: ["Go", "Kubernetes"],
    },
    candidates.map((c) => ({
      mentorId: c.mentorId,
      name: c.name,
      company: c.company,
      jobTitle: c.jobTitle,
      industry: c.industry,
      expertiseTags: c.skills,
      activeMentees: c.activeMentees,
      maxMentees: c.maxMentees,
      availability: c.availability,
    }))
  );
  console.log(`✔ matchMentors() legacy returned ${legacyList.length} scored candidates (Top: ${legacyList[0].name})\n`);

  console.log("===============================================================================");
  console.log("ALL END-TO-END VERIFICATION CHECKS COMPLETED SUCCESSFULLY!");
  console.log("===============================================================================\n");
}

runE2EVerification().catch((err) => {
  console.error("End-to-End verification failed:", err);
  process.exit(1);
});
