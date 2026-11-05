import fs from "fs";
import path from "path";

// Load .env or .env.local
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

import { connectDB } from "../src/lib/db";
import {
  User,
  AlumniProfile,
  MentorCapacity,
  Institution,
  ExpertiseTag,
  ProgrammeConfiguration,
} from "../src/lib/models";

export async function seedInitialMentorsIfEmpty() {
  await connectDB();

  // 1. Seed Default Tenant Institution (INST-001)
  const defaultInstitution = await Institution.findOne({ code: "INST-001" });
  if (!defaultInstitution) {
    await Institution.create({
      code: "INST-001",
      name: "Apex Institute of Technology",
      domain: "apex.edu",
      status: "active",
      settings: {
        allowStudentScheduling: true,
        requireAdminVerification: true,
        maxPendingRequestsPerStudent: 3,
        defaultMaxMentees: 2,
      },
    });
    console.log("Seeded default institution: INST-001 (Apex Institute of Technology)");
  }

  // 2. Seed Default Programme Configuration
  const defaultProgConfig = await ProgrammeConfiguration.findOne({ institutionId: "INST-001" });
  if (!defaultProgConfig) {
    await ProgrammeConfiguration.create({
      institutionId: "INST-001",
      maxPendingRequestsPerStudent: 3,
      requestExpiryDays: 14,
      defaultMaxMentees: 2,
      inactivityNudgeDays: 14,
      nudgeCooldownDays: 7,
      allowStudentScheduling: true,
      requireAdminVerification: true,
    });
    console.log("Seeded default programme configuration for INST-001");
  }

  // 3. Seed Controlled Taxonomy Expertise Tags
  const defaultTags = [
    { name: "TypeScript", category: "Software Engineering" },
    { name: "Next.js", category: "Frontend" },
    { name: "React", category: "Frontend" },
    { name: "System Design", category: "Architecture" },
    { name: "Cloud & DevOps", category: "Infrastructure" },
    { name: "Artificial Intelligence", category: "Data & ML" },
    { name: "Product Strategy", category: "Product" },
    { name: "UI/UX Design", category: "Design" },
    { name: "Career Pivots", category: "Mentorship" },
  ];

  for (const tag of defaultTags) {
    const existing = await ExpertiseTag.findOne({ institutionId: "INST-001", name: tag.name });
    if (!existing) {
      await ExpertiseTag.create({
        institutionId: "INST-001",
        name: tag.name,
        category: tag.category,
        status: "active",
      });
    }
  }

  // 4. Seed Sample Verified Mentors
  const sampleAlumni = [
    {
      name: "Priya Nair",
      email: "priya.nair@example.com",
      company: "Stripe",
      jobTitle: "Senior Software Engineer",
      industry: "FinTech",
      expertiseTags: ["TypeScript", "Next.js", "System Design", "AWS", "API Design"],
      maxMentees: 2,
      activeMentees: 0,
    },
    {
      name: "Rohan Kapoor",
      email: "rohan.kapoor@example.com",
      company: "Microsoft",
      jobTitle: "Principal Product Manager",
      industry: "Technology",
      expertiseTags: ["Product Strategy", "User Research", "Agile", "Roadmapping"],
      maxMentees: 3,
      activeMentees: 1,
    },
    {
      name: "Ananya Deshmukh",
      email: "ananya.deshmukh@example.com",
      company: "Figma",
      jobTitle: "Design Systems Lead",
      industry: "Design",
      expertiseTags: ["Figma", "UI/UX Design", "Design Systems", "Prototyping", "Design Tokens"],
      maxMentees: 2,
      activeMentees: 0,
    },
    {
      name: "Vikram Iyer",
      email: "vikram.iyer@example.com",
      company: "Google Cloud",
      jobTitle: "Cloud Solutions Architect",
      industry: "Cloud & DevOps",
      expertiseTags: ["Docker", "Kubernetes", "GCP", "Microservices", "Terraform"],
      maxMentees: 2,
      activeMentees: 0,
    },
    {
      name: "Sneha Mukherjee",
      email: "sneha.mukherjee@example.com",
      company: "Anthropic",
      jobTitle: "AI Research Engineer",
      industry: "Artificial Intelligence",
      expertiseTags: ["Python", "PyTorch", "LLMs", "Machine Learning", "Data Engineering"],
      maxMentees: 2,
      activeMentees: 1,
    },
    {
      name: "Karan Verma",
      email: "karan.verma@example.com",
      company: "Amazon",
      jobTitle: "Engineering Manager",
      industry: "E-Commerce",
      expertiseTags: ["Leadership", "Career Pivots", "System Architecture", "Interview Prep"],
      maxMentees: 3,
      activeMentees: 1,
    },
  ];

  for (const item of sampleAlumni) {
    let user = await User.findOne({ email: item.email });
    if (!user) {
      user = await User.create({
        email: item.email,
        password: "hashed_dummy_password_for_seed",
        name: item.name,
        role: "alumni",
      });
    }

    const existingProfile = await AlumniProfile.findOne({ userId: user._id });
    if (!existingProfile) {
      await AlumniProfile.create({
        userId: user._id,
        company: item.company,
        jobTitle: item.jobTitle,
        industry: item.industry,
        expertiseTags: item.expertiseTags,
      });
    }

    const existingCapacity = await MentorCapacity.findOne({ mentorId: user._id });
    if (!existingCapacity) {
      await MentorCapacity.create({
        mentorId: user._id,
        maxMentees: item.maxMentees,
        activeMentees: item.activeMentees,
      });
    }
  }

  console.log("Seeded initial verified alumni mentors into database.");
}

if (process.argv[1] && process.argv[1].includes("seed-mentors.ts")) {
  seedInitialMentorsIfEmpty()
    .then(() => {
      console.log("Seed completed successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
