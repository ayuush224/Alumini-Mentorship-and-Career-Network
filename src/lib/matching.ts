export interface StudentMatchingInput {
  targetIndustries?: string[];
  skillsToDevelop?: string[];
  skills?: string[];
}

export interface AlumniMatchingInput {
  industry?: string;
  expertiseTags?: string[];
  jobTitle?: string;
  company?: string;
}

export interface MatchResult {
  score: number;
  rationale: string;
  matchedSkills?: string[];
}

function normalizeSkill(s?: string): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Broad tech ecosystem umbrella
const TECH_KEYWORDS = [
  "technology",
  "tech",
  "software",
  "fintech",
  "finance",
  "cloud",
  "devops",
  "infrastructure",
  "ai",
  "artificial intelligence",
  "machine learning",
  "data",
  "web",
  "design",
  "product",
  "systems",
  "cybersecurity",
  "mobile",
];

function isTechRelated(industry?: string, jobTitle?: string, company?: string): boolean {
  const combined = `${industry || ""} ${jobTitle || ""} ${company || ""}`.toLowerCase();
  if (
    /engineer|developer|architect|sde|quant|analyst|programmer|tech|cloud|data|product|system|software|ai|ml/i.test(
      combined
    )
  ) {
    return true;
  }
  return TECH_KEYWORDS.some((kw) => combined.includes(kw));
}

// Semantic Skill Clusters for Cross-Discipline Matching
const SKILL_CLUSTERS: Record<string, string[]> = {
  backend: [
    "backend",
    "backenddevelopment",
    "systemdesign",
    "systemarchitecture",
    "distributedsystems",
    "microservices",
    "database",
    "postgresql",
    "sql",
    "mysql",
    "mongodb",
    "redis",
    "kafka",
    "nodejs",
    "python",
    "golang",
    "go",
    "java",
    "rest",
    "api",
    "graphql",
    "docker",
    "kubernetes",
    "architecture",
  ],
  problemsolving: [
    "problemsolving",
    "dsa",
    "datastructures",
    "algorithms",
    "competitiveprogramming",
    "leetcode",
    "interviewprep",
    "logic",
    "cpp",
    "c",
    "java",
    "python",
    "algorithmictrading",
  ],
  frontend: [
    "frontend",
    "frontenddevelopment",
    "webdevelopment",
    "react",
    "reactjs",
    "nextjs",
    "typescript",
    "javascript",
    "tailwind",
    "css",
    "html",
    "webperformance",
    "designsystems",
    "figma",
    "ui",
    "ux",
  ],
  cloud: [
    "cloud",
    "cloudinfrastructure",
    "cloudcomputing",
    "devops",
    "aws",
    "gcp",
    "azure",
    "kubernetes",
    "docker",
    "terraform",
    "observability",
    "sre",
    "linux",
    "infrastructure",
  ],
  ai: [
    "ai",
    "artificialintelligence",
    "machinelearning",
    "deeplearning",
    "pytorch",
    "tensorflow",
    "llms",
    "nlp",
    "computervision",
    "datascience",
    "analytics",
    "python",
  ],
  leadership: [
    "engineeringleadership",
    "management",
    "hiring",
    "careerpivots",
    "careerstrategy",
    "mentorship",
    "productstrategy",
    "userresearch",
  ],
};

function getClusterMatches(studentSkills: string[], alumniTags: string[]): string[] {
  const matchedTags: string[] = [];
  const normalizedStudent = studentSkills.map(normalizeSkill);

  for (const tag of alumniTags) {
    const normTag = normalizeSkill(tag);
    for (const [, clusterWords] of Object.entries(SKILL_CLUSTERS)) {
      const tagInCluster = clusterWords.some((w) => normTag.includes(w) || w.includes(normTag));
      if (tagInCluster) {
        const studentInCluster = normalizedStudent.some((s) =>
          clusterWords.some((w) => s.includes(w) || w.includes(s))
        );
        if (studentInCluster && !matchedTags.includes(tag)) {
          matchedTags.push(tag);
        }
      }
    }
  }

  return matchedTags;
}

/**
 * Calculates an intelligent, explainable match affinity score (65–98%) between a student and an alumni mentor:
 * - Domain & Industry alignment with semantic tech ecosystem mapping (+45 to +60 pts).
 * - Direct skill matches & semantic cluster synergies (+12 to +35 pts).
 * - Dynamic, transparent rationale explaining why the mentor matches student career milestones.
 * - Eliminates broken "0% match" bugs for verified alumni mentors.
 */
export function calculateMatchScore(
  student: StudentMatchingInput,
  alumni: AlumniMatchingInput
): MatchResult {
  let score = 0;

  const rawAlumniIndustry = (alumni.industry || "").trim();
  const rawStudentIndustries = (student.targetIndustries || [])
    .map((i) => i.trim())
    .filter(Boolean);

  // If student has no targets specified, default to Technology
  const targetIndustries =
    rawStudentIndustries.length > 0 ? rawStudentIndustries : ["Technology"];

  const mentorIndustryLower = rawAlumniIndustry.toLowerCase();
  const isDirectIndustryMatch = targetIndustries.some((ind) => {
    const low = ind.toLowerCase();
    if (!mentorIndustryLower) return false;
    return (
      low === mentorIndustryLower ||
      low.includes(mentorIndustryLower) ||
      mentorIndustryLower.includes(low)
    );
  });

  const mentorIsTech = isTechRelated(
    rawAlumniIndustry,
    alumni.jobTitle,
    alumni.company
  );
  const studentIsTech = targetIndustries.some((ind) =>
    isTechRelated(ind, undefined, undefined)
  );

  let industryPoints = 0;
  let industryRationale = "";

  if (isDirectIndustryMatch) {
    industryPoints = 58;
    industryRationale = `Industry match in ${rawAlumniIndustry || "Technology"}`;
  } else if (mentorIsTech && studentIsTech) {
    industryPoints = 52;
    industryRationale = rawAlumniIndustry
      ? `Strong alignment across ${rawAlumniIndustry} & ${targetIndustries[0]}`
      : `High alignment with your ${targetIndustries[0]} career goals`;
  } else if (rawAlumniIndustry) {
    industryPoints = 46;
    industryRationale = `Cross-industry career guidance in ${rawAlumniIndustry}`;
  } else {
    industryPoints = 48;
    industryRationale = `Aligned with your ${targetIndustries[0] || "Technology"} goals`;
  }

  score += industryPoints;

  // 2. Skill Overlap & Semantic Cluster Synergy
  const combinedStudentSkills = [
    ...(student.skillsToDevelop || []),
    ...(student.skills || []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const studentSkillsList =
    combinedStudentSkills.length > 0
      ? combinedStudentSkills
      : ["Backend Development", "Problem Solving"];

  const alumniTags = (alumni.expertiseTags || [])
    .map((t) => t.trim())
    .filter(Boolean);

  // A. Direct & Substring Skill Matches
  const directMatches: string[] = [];
  for (const sSkill of studentSkillsList) {
    const normStudent = normalizeSkill(sSkill);
    const matchedTag = alumniTags.find((t) => {
      const normTag = normalizeSkill(t);
      return (
        normTag === normStudent ||
        (normTag.length > 3 &&
          normStudent.length > 3 &&
          (normTag.includes(normStudent) || normStudent.includes(normTag)))
      );
    });
    if (matchedTag && !directMatches.includes(matchedTag)) {
      directMatches.push(matchedTag);
    }
  }

  // B. Semantic Cluster Matches (e.g. Backend Development -> System Design / Distributed Systems)
  const clusterMatches = getClusterMatches(studentSkillsList, alumniTags).filter(
    (tag) => !directMatches.includes(tag)
  );

  const allMatchedSkills = [...directMatches, ...clusterMatches];
  let skillPoints = 0;

  if (directMatches.length > 0) {
    skillPoints += Math.min(30, directMatches.length * 15);
  }
  if (clusterMatches.length > 0) {
    skillPoints += Math.min(20, clusterMatches.length * 10);
  }

  // If no direct or cluster match found, award general software engineering alignment points
  if (allMatchedSkills.length === 0 && alumniTags.length > 0) {
    skillPoints += 14;
  }

  score += Math.min(38, skillPoints);

  // 3. Baseline Institutional & Mentor Foundation Points
  // Every verified alumni mentor from the university network has an earned foundation
  const baseFloor = isDirectIndustryMatch ? 75 : 68;
  const finalScore = Math.min(98, Math.max(baseFloor, Math.round(score)));

  // 4. Construct Transparent, Natural Rationale
  let rationale = "";
  const highlightSkills =
    allMatchedSkills.length > 0
      ? allMatchedSkills.slice(0, 3).join(", ")
      : alumniTags.slice(0, 2).join(", ");

  if (directMatches.length > 0) {
    rationale = `${industryRationale} & ${directMatches.length} shared skill${
      directMatches.length > 1 ? "s" : ""
    } (${highlightSkills})`;
  } else if (clusterMatches.length > 0) {
    rationale = `${industryRationale} with strong synergy for your goals (${highlightSkills})`;
  } else if (highlightSkills) {
    rationale = `${industryRationale} with mentorship in ${highlightSkills}`;
  } else {
    rationale = `${industryRationale} with verified alumni guidance`;
  }

  return {
    score: finalScore,
    rationale,
    matchedSkills: allMatchedSkills,
  };
}
