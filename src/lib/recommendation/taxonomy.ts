/**
 * Canonical Skill Taxonomy with Comprehensive Synonym Normalization.
 * Normalizes acronyms, variations, tool names, and common aliases into canonical standard skill identifiers.
 */

const SYNONYM_MAP: Record<string, string> = {
  // Cloud & Infrastructure
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  kube: "Kubernetes",
  "k8s cluster": "Kubernetes",
  docker: "Docker",
  containers: "Docker",
  containerization: "Docker",
  aws: "AWS",
  "aws cloud": "AWS",
  "amazon web services": "AWS",
  gcp: "Google Cloud",
  "google cloud": "Google Cloud",
  "google cloud platform": "Google Cloud",
  azure: "Microsoft Azure",
  "microsoft azure": "Microsoft Azure",
  terraform: "Terraform",
  iac: "Infrastructure as Code",
  "infrastructure as code": "Infrastructure as Code",
  devops: "DevOps",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  "continuous integration": "CI/CD",

  // Programming Languages
  js: "JavaScript",
  javascript: "JavaScript",
  ecmascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  python3: "Python",
  golang: "Go",
  go: "Go",
  "go lang": "Go",
  java: "Java",
  cpp: "C++",
  "c++": "C++",
  c: "C",
  cs: "C#",
  csharp: "C#",
  "c#": "C#",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",

  // Web & Frameworks
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  react: "React",
  reactjs: "React",
  "react.js": "React",
  next: "Next.js",
  nextjs: "Next.js",
  "next.js": "Next.js",
  vue: "Vue.js",
  vuejs: "Vue.js",
  "vue.js": "Vue.js",
  angular: "Angular",
  angularjs: "Angular",
  express: "Express.js",
  expressjs: "Express.js",
  nestjs: "NestJS",
  fastapi: "FastAPI",
  django: "Django",
  flask: "Flask",
  spring: "Spring Boot",
  springboot: "Spring Boot",
  "spring boot": "Spring Boot",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  graphql: "GraphQL",
  gql: "GraphQL",
  rest: "REST APIs",
  restful: "REST APIs",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  api: "REST APIs",
  apis: "REST APIs",

  // Core CS, Architecture & Databases
  dsa: "Data Structures and Algorithms",
  "data structures": "Data Structures and Algorithms",
  "algorithms": "Data Structures and Algorithms",
  "data structures and algorithms": "Data Structures and Algorithms",
  "data structures & algorithms": "Data Structures and Algorithms",
  competitiveprogramming: "Competitive Programming",
  "competitive programming": "Competitive Programming",
  leetcode: "Data Structures and Algorithms",
  "system design": "System Design",
  "system architecture": "System Design",
  "sys design": "System Design",
  hlld: "System Design",
  lld: "Low-Level Design",
  "low level design": "Low-Level Design",
  "low-level design": "Low-Level Design",
  "distributed systems": "Distributed Systems",
  "distributed computing": "Distributed Systems",
  microservices: "Microservices",
  "microservice architecture": "Microservices",
  sql: "SQL",
  "relational database": "SQL",
  "relational databases": "SQL",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  pgsql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  mysql: "MySQL",
  redis: "Redis",
  caching: "Redis",
  kafka: "Apache Kafka",
  "apache kafka": "Apache Kafka",
  spark: "Apache Spark",
  "apache spark": "Apache Spark",
  pyspark: "Apache Spark",

  // AI, Data & Machine Learning
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  dl: "Deep Learning",
  "deep learning": "Deep Learning",
  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",
  genai: "Generative AI",
  "generative ai": "Generative AI",
  llm: "Large Language Models",
  llms: "Large Language Models",
  "large language models": "Large Language Models",
  nlp: "Natural Language Processing",
  "natural language processing": "Natural Language Processing",
  cv: "Computer Vision",
  "computer vision": "Computer Vision",
  pandas: "Pandas",
  numpy: "NumPy",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  scikit: "Scikit-Learn",
  "scikit-learn": "Scikit-Learn",

  // Career & Mentorship Soft Topics
  "interview prep": "Interview Preparation",
  "interview preparation": "Interview Preparation",
  "mock interview": "Interview Preparation",
  "mock interviews": "Interview Preparation",
  "sde interview": "Interview Preparation",
  "resume review": "Resume Review",
  "cv review": "Resume Review",
  "career strategy": "Career Mentorship",
  "career guidance": "Career Mentorship",
  "career transition": "Career Mentorship",
  "product strategy": "Product Strategy",
  "product management": "Product Management",
  pm: "Product Management",
};

/**
 * Normalizes any freeform skill string into its canonical taxonomy identifier.
 * Example: "k8s" -> "Kubernetes", "Node.js" -> "Node.js", "DSA" -> "Data Structures and Algorithms"
 */
export function normalizeSkill(skill?: string): string {
  if (!skill || typeof skill !== "string") return "";
  const cleaned = skill
    .trim()
    .toLowerCase()
    .replace(/[._\-/\s]+/g, " ")
    .trim();

  // 1. Direct synonym lookup
  if (SYNONYM_MAP[cleaned]) {
    return SYNONYM_MAP[cleaned];
  }

  // 2. Exact match without separator variation
  const compact = cleaned.replace(/\s+/g, "");
  if (SYNONYM_MAP[compact]) {
    return SYNONYM_MAP[compact];
  }

  // 3. Fallback: Title case normalized string
  return skill
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalizes an array of skills, deduping and discarding empty entries.
 */
export function normalizeSkills(skills?: string[]): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  const set = new Set<string>();
  for (const s of skills) {
    const normalized = normalizeSkill(s);
    if (normalized) {
      set.add(normalized);
    }
  }
  return Array.from(set);
}

/**
 * Computes exact canonical skill overlap between two skill sets.
 */
export function canonicalSkillOverlap(setA: string[], setB: string[]): string[] {
  const normA = new Set(normalizeSkills(setA));
  const normB = normalizeSkills(setB);
  return normB.filter((s) => normA.has(s));
}

/**
 * Calculates Skill Coverage:
 * Number of required skills the mentor can teach / Total number of required skills.
 * Range: [0.0, 1.0]
 */
export function calculateSkillCoverage(requiredSkills: string[], mentorCanTeach: string[]): number {
  const normalizedRequired = normalizeSkills(requiredSkills);
  if (normalizedRequired.length === 0) return 1.0; // If student didn't specify required skills, default to full coverage

  const normalizedAvailable = new Set(normalizeSkills(mentorCanTeach));
  let coveredCount = 0;
  for (const req of normalizedRequired) {
    if (normalizedAvailable.has(req)) {
      coveredCount++;
    }
  }

  return Math.min(1.0, coveredCount / normalizedRequired.length);
}

/**
 * Calculates Jaccard Similarity between two skill sets:
 * |A ∩ B| / |A ∪ B|
 * Range: [0.0, 1.0]
 */
export function calculateJaccardSimilarity(skillsA: string[], skillsB: string[]): number {
  const setA = new Set(normalizeSkills(skillsA));
  const setB = new Set(normalizeSkills(skillsB));

  if (setA.size === 0 && setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0.0;
}

/**
 * Standard industry and category taxonomy for mentor discovery and student matching.
 */
export interface IndustryCategory {
  label: string;
  value: string;
  aliases: string[];
}

export const STANDARD_INDUSTRIES: IndustryCategory[] = [
  { label: "All Industries", value: "all", aliases: [] },
  { label: "Technology & Software", value: "Technology", aliases: ["tech", "software", "it", "computer science"] },
  { label: "Financial Technology (FinTech)", value: "Financial Technology", aliases: ["fintech", "finance", "banking", "payments"] },
  { label: "Cloud & Infrastructure", value: "Cloud Infrastructure", aliases: ["cloud", "devops", "infrastructure", "aws", "sre"] },
  { label: "Artificial Intelligence & ML", value: "Artificial Intelligence", aliases: ["ai", "ml", "machine learning", "deep learning", "genai"] },
  { label: "Data Science & Analytics", value: "Data Science", aliases: ["data", "analytics", "big data", "bi", "data engineering"] },
  { label: "Product Management", value: "Product Management", aliases: ["pm", "product", "product strategy"] },
  { label: "Cybersecurity & InfoSec", value: "Cybersecurity", aliases: ["security", "infosec", "cyber"] },
  { label: "UI/UX & Product Design", value: "Design", aliases: ["ui", "ux", "product design", "design", "creative"] },
  { label: "Healthcare & BioTech", value: "Healthcare", aliases: ["health", "biotech", "medtech", "pharmaceutical"] },
  { label: "Management Consulting", value: "Consulting", aliases: ["consulting", "strategy", "advisory", "management"] },
  { label: "E-Commerce & Retail", value: "E-Commerce", aliases: ["ecommerce", "retail", "marketplace", "d2c"] },
  { label: "Hardware & Embedded", value: "Hardware", aliases: ["hardware", "embedded", "iot", "robotics", "semiconductor"] },
];

