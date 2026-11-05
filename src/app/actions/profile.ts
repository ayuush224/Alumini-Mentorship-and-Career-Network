"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { User, StudentProfile, MentorProfile } from "@/lib/models/User";
import { MentorCapacity } from "@/lib/models/Mentorship";
import { verifyAccess } from "@/lib/app-tokens";
import { purgeCloudinaryAsset, extractCloudinaryPublicId, cloudinary } from "@/lib/cloudinary";

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccess(token);
    return (payload?.sub as string) || null;
  } catch {
    return null;
  }
}

// ============================================================================
// AVATAR & BANNER MUTATIONS (With Cloudinary Purge Optimization)
// ============================================================================

export async function updateAvatarUrl(url: string, newPublicId?: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  // Step 2: Asset Cleanup - Retrieve existing publicId to purge obsolete asset
  const existingUser = await User.findById(userId).lean();
  const oldPublicId =
    existingUser?.studentProfile?.avatarPublicId ||
    existingUser?.mentorProfile?.avatarPublicId;

  const derivedPublicId = newPublicId || extractCloudinaryPublicId(url);

  if (oldPublicId && oldPublicId !== derivedPublicId) {
    try {
      await purgeCloudinaryAsset(oldPublicId);
    } catch (purgeErr) {
      console.warn("[Cloudinary] Could not purge old avatar:", purgeErr);
    }
  }

  const setPayload: Record<string, unknown> = {
    "studentProfile.avatarUrl": url,
    "mentorProfile.avatarUrl": url,
  };
  if (derivedPublicId) {
    setPayload["studentProfile.avatarPublicId"] = derivedPublicId;
    setPayload["mentorProfile.avatarPublicId"] = derivedPublicId;
  }

  await User.findByIdAndUpdate(userId, { $set: setPayload });

  const standalonePayload: Record<string, unknown> = { avatarUrl: url };
  if (derivedPublicId) standalonePayload.avatarPublicId = derivedPublicId;

  await StudentProfile.findOneAndUpdate({ userId }, { $set: standalonePayload }, { upsert: true });
  await MentorProfile.findOneAndUpdate({ userId }, { $set: standalonePayload }, { upsert: true });

  revalidatePath("/student/profile");
  revalidatePath("/mentor/profile");
  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/dashboard");
  return { success: true, url, publicId: derivedPublicId };
}

export async function updateBannerUrl(url: string, newPublicId?: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  // Step 2: Asset Cleanup - Retrieve existing banner publicId to purge obsolete asset
  const existingUser = await User.findById(userId).lean();
  const oldPublicId =
    existingUser?.studentProfile?.bannerPublicId ||
    existingUser?.mentorProfile?.bannerPublicId;

  const derivedPublicId = newPublicId || extractCloudinaryPublicId(url);

  if (oldPublicId && oldPublicId !== derivedPublicId) {
    try {
      await purgeCloudinaryAsset(oldPublicId);
    } catch (purgeErr) {
      console.warn("[Cloudinary] Could not purge old banner:", purgeErr);
    }
  }

  const setPayload: Record<string, unknown> = {
    "studentProfile.bannerUrl": url,
    "mentorProfile.bannerUrl": url,
  };
  if (derivedPublicId) {
    setPayload["studentProfile.bannerPublicId"] = derivedPublicId;
    setPayload["mentorProfile.bannerPublicId"] = derivedPublicId;
  }

  await User.findByIdAndUpdate(userId, { $set: setPayload });

  const standalonePayload: Record<string, unknown> = { bannerUrl: url };
  if (derivedPublicId) standalonePayload.bannerPublicId = derivedPublicId;

  await StudentProfile.findOneAndUpdate({ userId }, { $set: standalonePayload }, { upsert: true });
  await MentorProfile.findOneAndUpdate({ userId }, { $set: standalonePayload }, { upsert: true });

  revalidatePath("/student/profile");
  revalidatePath("/mentor/profile");
  return { success: true, url, publicId: derivedPublicId };
}

// ============================================================================
// STUDENT PROFILE MUTATIONS
// ============================================================================

export async function updateStudentBio(bio: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, { $set: { "studentProfile.bio": bio.trim() } });
  await StudentProfile.findOneAndUpdate({ userId }, { $set: { bio: bio.trim() } }, { upsert: true });

  revalidatePath("/student/profile");
  return { success: true };
}

export async function updateStudentEducation(data: {
  major?: string;
  graduationYear?: number;
  cgpa?: number;
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  const updateFields: Record<string, unknown> = {};
  if (data.major !== undefined) updateFields["studentProfile.major"] = data.major.trim();
  if (data.graduationYear !== undefined) updateFields["studentProfile.graduationYear"] = Number(data.graduationYear);
  if (data.cgpa !== undefined) updateFields["studentProfile.cgpa"] = Number(data.cgpa);

  await User.findByIdAndUpdate(userId, { $set: updateFields });
  await StudentProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(data.major !== undefined && { major: data.major.trim() }),
        ...(data.graduationYear !== undefined && { graduationYear: Number(data.graduationYear) }),
        ...(data.cgpa !== undefined && { cgpa: Number(data.cgpa) }),
      },
    },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

export async function addStudentSkill(skill: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  const cleanSkill = skill.trim();
  if (!cleanSkill) return { success: false, error: "Skill name is required" };

  await User.findByIdAndUpdate(userId, { $addToSet: { "studentProfile.skills": cleanSkill } });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $addToSet: { skills: cleanSkill } },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

export async function removeStudentSkill(skill: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, { $pull: { "studentProfile.skills": skill } });
  await StudentProfile.findOneAndUpdate({ userId }, { $pull: { skills: skill } });

  revalidatePath("/student/profile");
  return { success: true };
}

export async function addStudentProject(project: {
  title: string;
  description?: string;
  liveLink?: string;
  githubLink?: string;
  techStack?: string[];
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  if (!project.title.trim()) return { success: false, error: "Project title is required" };

  const newProject = {
    title: project.title.trim(),
    description: project.description?.trim(),
    liveLink: project.liveLink?.trim(),
    githubLink: project.githubLink?.trim(),
    techStack: project.techStack || [],
  };

  await User.findByIdAndUpdate(userId, { $push: { "studentProfile.projects": newProject } });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $push: { projects: newProject } },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

export async function deleteStudentProject(title: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "studentProfile.projects": { title } },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $pull: { projects: { title } } }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

export async function addStudentExperience(exp: {
  role: string;
  company: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  if (!exp.role.trim() || !exp.company.trim()) {
    return { success: false, error: "Role and company are required" };
  }

  const newExp = {
    role: exp.role.trim(),
    company: exp.company.trim(),
    startDate: exp.startDate ? new Date(exp.startDate) : undefined,
    endDate: exp.endDate ? new Date(exp.endDate) : undefined,
    current: Boolean(exp.current),
    description: exp.description?.trim(),
  };

  await User.findByIdAndUpdate(userId, { $push: { "studentProfile.experience": newExp } });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $push: { experience: newExp } },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

export async function deleteStudentExperience(company: string, role: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "studentProfile.experience": { company, role } },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $pull: { experience: { company, role } } }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

// ============================================================================
// MENTOR PROFILE MUTATIONS
// ============================================================================

export async function updateMentorProfile(data: {
  headline?: string;
  bio?: string;
  availability?: "open" | "waitlist";
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  const updateFields: Record<string, unknown> = {};
  if (data.headline !== undefined) {
    updateFields["mentorProfile.headline"] = data.headline.trim();
  }
  if (data.bio !== undefined) {
    updateFields["mentorProfile.bio"] = data.bio.trim();
  }
  if (data.availability !== undefined) {
    updateFields["mentorProfile.availability"] = data.availability;
  }

  await User.findByIdAndUpdate(userId, { $set: updateFields });
  await MentorProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(data.headline !== undefined && { headline: data.headline.trim() }),
        ...(data.bio !== undefined && { bio: data.bio.trim() }),
        ...(data.availability !== undefined && { availability: data.availability }),
      },
    },
    { upsert: true }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function addMentorSkill(name: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  const cleanName = name.trim();
  if (!cleanName) return { success: false, error: "Skill name is required" };

  const newSkill = { name: cleanName, endorsements: 0 };

  await User.findByIdAndUpdate(userId, { $push: { "mentorProfile.skills": newSkill } });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $push: { skills: newSkill } },
    { upsert: true }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function removeMentorSkill(name: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "mentorProfile.skills": { name } },
  });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $pull: { skills: { name } } }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function addMentorshipArea(area: {
  title: string;
  description?: string;
  icon?: string;
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  if (!area.title.trim()) return { success: false, error: "Title is required" };

  const newArea = {
    title: area.title.trim(),
    description: area.description?.trim(),
    icon: area.icon?.trim() || "compass",
  };

  await User.findByIdAndUpdate(userId, { $push: { "mentorProfile.mentorshipAreas": newArea } });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $push: { mentorshipAreas: newArea } },
    { upsert: true }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function deleteMentorshipArea(title: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "mentorProfile.mentorshipAreas": { title } },
  });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $pull: { mentorshipAreas: { title } } }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function addMentorExperience(exp: {
  role: string;
  company: string;
  type?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
  skills?: string[];
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  if (!exp.role.trim() || !exp.company.trim()) {
    return { success: false, error: "Role and company are required" };
  }

  const newExp = {
    role: exp.role.trim(),
    company: exp.company.trim(),
    type: exp.type?.trim() || "Full-time",
    location: exp.location?.trim(),
    startDate: exp.startDate ? new Date(exp.startDate) : new Date(),
    endDate: exp.endDate ? new Date(exp.endDate) : undefined,
    bullets: exp.bullets || [],
    skills: exp.skills || [],
  };

  await User.findByIdAndUpdate(userId, { $push: { "mentorProfile.experience": newExp } });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $push: { experience: newExp } },
    { upsert: true }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function deleteMentorExperience(company: string, role: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "mentorProfile.experience": { company, role } },
  });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $pull: { experience: { company, role } } }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function addMentorFeaturedWork(work: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  tags?: string[];
  link?: string;
}) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  if (!work.title.trim()) return { success: false, error: "Title is required" };

  const newWork = {
    title: work.title.trim(),
    description: work.description?.trim(),
    thumbnailUrl: work.thumbnailUrl?.trim(),
    tags: work.tags || [],
    link: work.link?.trim(),
  };

  await User.findByIdAndUpdate(userId, { $push: { "mentorProfile.featuredWork": newWork } });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $push: { featuredWork: newWork } },
    { upsert: true }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}

export async function deleteMentorFeaturedWork(title: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "mentorProfile.featuredWork": { title } },
  });
  await MentorProfile.findOneAndUpdate(
    { userId },
    { $pull: { featuredWork: { title } } }
  );

  revalidatePath("/mentor/profile");
  return { success: true };
}


export interface StudentCareerProfileViewData {
  studentId: string;
  name: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  major?: string;
  graduationYear?: number;
  cgpa?: number;
  totalPoints: number;
  skills: string[];
  projects: Array<{
    title: string;
    description?: string;
    liveLink?: string;
    githubLink?: string;
    techStack: string[];
  }>;
  experience: Array<{
    role: string;
    company: string;
    startDate?: string | Date;
    endDate?: string | Date;
    current?: boolean;
    description?: string;
  }>;
  targetIndustries?: string[];
  skillsToDevelop?: string[];
  codingProfiles?: Array<{
    platform: string;
    username?: string;
    url?: string;
    synced?: boolean;
  }>;
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  otherLinks?: Array<{
    title: string;
    url: string;
  }>;
}

/**
 * Retrieves the career profile of a student for mentor evaluation.
 * Invariant 2 Enforcement: Strips out private personal email, phone numbers, and addresses.
 */
export async function getStudentCareerProfile(
  studentId: string
): Promise<{
  success: boolean;
  profile?: StudentCareerProfileViewData;
  error?: string;
}> {
  try {
    await connectDB();
    const callerId = await getAuthenticatedUserId();
    if (!callerId) {
      return { success: false, error: "Authentication required." };
    }

    const studentUser = await User.findById(studentId).select("name studentProfile").lean();
    if (!studentUser) {
      return { success: false, error: "Student profile not found." };
    }

    const standalone = (await StudentProfile.findOne({ userId: studentId }).lean()) as Record<string, unknown> | null;
    const embedded = (studentUser.studentProfile || {}) as Record<string, unknown>;

    const careerProfile: StudentCareerProfileViewData = {
      studentId,
      name: studentUser.name || "Student Mentee",
      avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
      bannerUrl: (standalone?.bannerUrl as string) || (embedded.bannerUrl as string | undefined),
      bio: (standalone?.bio as string) ?? (embedded.bio as string) ?? "",
      major: (standalone?.major as string) ?? (embedded.major as string) ?? "Computer Science",
      graduationYear: (standalone?.graduationYear as number) ?? (embedded.graduationYear as number) ?? (new Date().getFullYear() + 2),
      cgpa: (standalone?.cgpa as number) ?? (embedded.cgpa as number) ?? undefined,
      totalPoints: (standalone?.totalPoints as number) ?? (embedded.totalPoints as number) ?? 0,
      skills: ((standalone?.skills as string[]) || (embedded.skills as string[]) || []),
      projects: ((standalone?.projects as StudentCareerProfileViewData["projects"]) || (embedded.projects as StudentCareerProfileViewData["projects"]) || []),
      experience: (() => {
        interface RawExpItem {
          role?: string;
          company?: string;
          startDate?: Date | string;
          endDate?: Date | string;
          current?: boolean;
          description?: string;
        }
        const raw = ((standalone?.experience as RawExpItem[] | undefined) || (embedded.experience as RawExpItem[] | undefined) || []);
        return raw.map((exp) => ({
          role: String(exp.role || ""),
          company: String(exp.company || ""),
          startDate: exp.startDate instanceof Date ? exp.startDate.toISOString() : (exp.startDate ? String(exp.startDate) : undefined),
          endDate: exp.endDate instanceof Date ? exp.endDate.toISOString() : (exp.endDate ? String(exp.endDate) : undefined),
          current: Boolean(exp.current),
          description: exp.description ? String(exp.description) : undefined,
        }));
      })(),
      targetIndustries: ((standalone?.targetIndustries as string[]) || (embedded.targetIndustries as string[]) || []),
      skillsToDevelop: ((standalone?.skillsToDevelop as string[]) || (embedded.skillsToDevelop as string[]) || []),
      codingProfiles: ((standalone?.codingProfiles as StudentCareerProfileViewData["codingProfiles"]) || (embedded.codingProfiles as StudentCareerProfileViewData["codingProfiles"]) || []),
      socialLinks: ((standalone?.socialLinks as StudentCareerProfileViewData["socialLinks"]) || (embedded.socialLinks as StudentCareerProfileViewData["socialLinks"]) || []),
      otherLinks: ((standalone?.otherLinks as StudentCareerProfileViewData["otherLinks"]) || (embedded.otherLinks as StudentCareerProfileViewData["otherLinks"]) || []),
    };

    return {
      success: true,
      profile: careerProfile,
    };
  } catch (error) {
    console.error("getStudentCareerProfile error:", error);
    return {
      success: false,
      error: "An error occurred while fetching the career profile.",
    };
  }
}


// ============================================================================
export interface MentorPublicProfileViewData {
  mentorId: string;
  name: string;
  avatarUrl?: string;
  bannerUrl?: string;
  headline?: string;
  company: string;
  jobTitle: string;
  industry: string;
  department?: string;
  graduationYear?: number;
  bio?: string;
  availability: "open" | "waitlist";
  expertiseTags: string[];
  skills: Array<{ name: string; endorsements: number }>;
  mentorshipAreas: Array<{ title: string; description?: string; icon?: string }>;
  experience: Array<{
    role: string;
    company: string;
    type?: string;
    location?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    bullets?: string[];
    skills?: string[];
  }>;
  featuredWork: Array<{
    title: string;
    description?: string;
    thumbnailUrl?: string;
    tags?: string[];
    link?: string;
  }>;
  capacity?: {
    maxMentees: number;
    activeMentees: number;
    remainingSpots: number;
    status: string;
    acceptingRequests: boolean;
  };
  totalMentees?: number;
  sessionsCompleted?: number;
}

const DEMO_MENTOR_PROFILES: Record<string, MentorPublicProfileViewData> = {
  "m-priya-nair": {
    mentorId: "m-priya-nair",
    name: "Priya Nair",
    avatarUrl: "",
    bannerUrl: "",
    headline: "Senior Software Engineer @ Stripe · Building global real-time payout rails",
    company: "Stripe",
    jobTitle: "Senior Software Engineer",
    industry: "FinTech",
    department: "Computer Science & Engineering",
    graduationYear: 2020,
    bio: "Passionate about high-throughput distributed systems, fault-tolerant payment infrastructures, and engineering velocity. I love mentoring aspiring engineers on system design interviews, practical TypeScript/Next.js patterns, and transitioning from academic projects to production microservices.",
    availability: "open",
    expertiseTags: ["TypeScript", "Next.js", "System Design", "Distributed Systems"],
    skills: [
      { name: "TypeScript", endorsements: 24 },
      { name: "Next.js", endorsements: 19 },
      { name: "Distributed Systems", endorsements: 28 },
      { name: "System Design", endorsements: 31 },
      { name: "PostgreSQL", endorsements: 15 },
    ],
    mentorshipAreas: [
      {
        title: "Distributed Architecture & Systems",
        description: "Designing resilient APIs, idempotency keys, queue workers, and event-driven pipelines.",
      },
      {
        title: "Interview Prep & System Design",
        description: "Mock architectural interviews, trade-off analysis, and behavioral question frameworks.",
      },
      {
        title: "Resume & Portfolio Review",
        description: "Polishing project narratives, GitHub repos, and highlighting production-readiness.",
      },
    ],
    experience: [
      {
        role: "Senior Software Engineer",
        company: "Stripe",
        type: "Full-time",
        location: "Bengaluru / Hybrid",
        startDate: "2022-04-01",
        endDate: undefined,
        bullets: [
          "Architected real-time settlement settlement pipelines handling over $12M daily volume with 99.999% SLA.",
          "Spearheaded adoption of TypeScript across backend ingestion services, cutting runtime error rates by 34%.",
        ],
        skills: ["TypeScript", "Distributed Systems", "Kafka", "PostgreSQL"],
      },
      {
        role: "Software Development Engineer II",
        company: "Amazon Web Services",
        type: "Full-time",
        location: "Hyderabad",
        startDate: "2020-07-01",
        endDate: "2022-03-31",
        bullets: [
          "Built multi-region VPC control plane tooling reducing failover latency by 45%.",
          "Collaborated with principal engineers on automated chaos engineering drills.",
        ],
        skills: ["Java", "Distributed Systems", "AWS", "Go"],
      },
    ],
    featuredWork: [
      {
        title: "High-Throughput Idempotency Engine",
        description: "Open-source distributed deduplication library leveraging Redis cluster and optimistic leasing.",
        tags: ["TypeScript", "Redis", "Distributed Systems"],
        link: "https://github.com",
      },
      {
        title: "Guide: Modern Web Application Scaling",
        description: "Comprehensive guide for university seniors on transitioning from monoliths to event pipelines.",
        tags: ["Next.js", "Architecture", "System Design"],
        link: "https://stripe.com",
      },
    ],
    capacity: {
      maxMentees: 3,
      activeMentees: 0,
      remainingSpots: 3,
      status: "available",
      acceptingRequests: true,
    },
    totalMentees: 8,
    sessionsCompleted: 24,
  },
  "m-rohan-mehta": {
    mentorId: "m-rohan-mehta",
    name: "Rohan Mehta",
    avatarUrl: "",
    bannerUrl: "",
    headline: "VP, Quantitative Engineering @ Goldman Sachs · Low-latency trading engines",
    company: "Goldman Sachs",
    jobTitle: "VP, Quantitative Engineering",
    industry: "FinTech",
    department: "Information Technology",
    graduationYear: 2018,
    bio: "Leading quantitative platform engineering at Goldman Sachs. Specializing in algorithmic trading infrastructure, statistical modeling, high-frequency execution engines, and risk management pipelines.",
    availability: "open",
    expertiseTags: ["TypeScript", "Python", "Algorithmic Trading", "PostgreSQL"],
    skills: [
      { name: "Python", endorsements: 36 },
      { name: "Algorithmic Trading", endorsements: 29 },
      { name: "PostgreSQL", endorsements: 22 },
      { name: "TypeScript", endorsements: 18 },
      { name: "Risk Analytics", endorsements: 14 },
    ],
    mentorshipAreas: [
      {
        title: "FinTech & Quant Career Pathways",
        description: "Understanding requirements for hedge funds, investment banks, and algorithmic prop desks.",
      },
      {
        title: "Performance Optimization & DBs",
        description: "Low latency query execution, memory caching, and database indexing strategies.",
      },
    ],
    experience: [
      {
        role: "VP, Quantitative Engineering",
        company: "Goldman Sachs",
        type: "Full-time",
        location: "Mumbai",
        startDate: "2021-08-01",
        endDate: undefined,
        bullets: [
          "Leads team of 8 quants and platform engineers managing execution infrastructure for equities and derivatives.",
        ],
        skills: ["Python", "C++", "PostgreSQL", "Quant Architecture"],
      },
    ],
    featuredWork: [
      {
        title: "Algorithmic Execution Backtester",
        description: "Open-source Python framework for simulating high-frequency order book dynamics.",
        tags: ["Python", "FinTech", "Quantitative"],
        link: "https://github.com",
      },
    ],
    capacity: {
      maxMentees: 2,
      activeMentees: 0,
      remainingSpots: 2,
      status: "available",
      acceptingRequests: true,
    },
    totalMentees: 6,
    sessionsCompleted: 19,
  },
  "m-ananya-verma": {
    mentorId: "m-ananya-verma",
    name: "Ananya Verma",
    avatarUrl: "",
    bannerUrl: "",
    headline: "Staff Software Engineer @ Uber · Rider & Driver mobile-web architecture",
    company: "Uber",
    jobTitle: "Staff Software Engineer",
    industry: "Technology",
    department: "Computer Science & Engineering",
    graduationYear: 2017,
    bio: "Staff engineer driving web architecture across Uber's global mobility and delivery surfaces. Focused on web performance at billion-request scale, micro-frontends, and GraphQL federation.",
    availability: "open",
    expertiseTags: ["Next.js", "React", "GraphQL", "Architecture"],
    skills: [
      { name: "React", endorsements: 42 },
      { name: "Next.js", endorsements: 38 },
      { name: "GraphQL", endorsements: 27 },
      { name: "Web Architecture", endorsements: 33 },
    ],
    mentorshipAreas: [
      {
        title: "Frontend Architecture at Scale",
        description: "Building resilient micro-frontends, design systems, and client-side telemetry.",
      },
      {
        title: "Engineering Staff Leadership",
        description: "Navigating technical staff leadership, RFC processes, and cross-team consensus.",
      },
    ],
    experience: [
      {
        role: "Staff Software Engineer",
        company: "Uber",
        type: "Full-time",
        location: "Bengaluru",
        startDate: "2021-01-01",
        endDate: undefined,
        bullets: [
          "Spearheaded next-gen web platform serving 130M+ monthly active riders globally.",
        ],
        skills: ["React", "Next.js", "GraphQL", "Web Perf"],
      },
    ],
    featuredWork: [
      {
        title: "Next-Gen Web Performance Playbook",
        description: "Core Web Vitals optimization guide for massive enterprise SPAs and SSR apps.",
        tags: ["React", "Performance", "Web Architecture"],
        link: "https://uber.com",
      },
    ],
    capacity: {
      maxMentees: 2,
      activeMentees: 1,
      remainingSpots: 1,
      status: "available",
      acceptingRequests: true,
    },
    totalMentees: 11,
    sessionsCompleted: 35,
  },
  "m-kabir-sen": {
    mentorId: "m-kabir-sen",
    name: "Kabir Sen",
    avatarUrl: "",
    bannerUrl: "",
    headline: "Staff Infrastructure Engineer @ Datadog · Observability & Cloud Native Kubernetes",
    company: "Datadog",
    jobTitle: "Staff Infrastructure Engineer",
    industry: "Cloud Infrastructure",
    department: "Electronics & Communication",
    graduationYear: 2016,
    bio: "Infrastructure engineer obsessed with distributed tracing, Kubernetes operator design, and cloud cost governance. Happy to mentor students interested in DevOps, SRE, and systems programming.",
    availability: "open",
    expertiseTags: ["System Design", "Kubernetes", "Golang", "Observability"],
    skills: [
      { name: "Kubernetes", endorsements: 39 },
      { name: "Golang", endorsements: 34 },
      { name: "System Design", endorsements: 29 },
      { name: "Observability", endorsements: 26 },
    ],
    mentorshipAreas: [
      {
        title: "DevOps & Cloud-Native Platforms",
        description: "Kubernetes clustering, service meshes, eBPF tracing, and Terraform automation.",
      },
      {
        title: "SRE & Incident Management",
        description: "Building production error budgets, SLOs, and blameless post-mortem cultures.",
      },
    ],
    experience: [
      {
        role: "Staff Infrastructure Engineer",
        company: "Datadog",
        type: "Full-time",
        location: "Remote / APAC",
        startDate: "2021-03-01",
        endDate: undefined,
        bullets: [
          "Architected multi-cloud telemetry ingestion tier processing 50B+ daily events.",
        ],
        skills: ["Golang", "Kubernetes", "Distributed Systems"],
      },
    ],
    featuredWork: [
      {
        title: "Kubernetes Custom Controller for Dynamic Autoscaling",
        description: "Production controller scaling stateful compute nodes based on custom Prometheus metrics.",
        tags: ["Kubernetes", "Golang", "Cloud"],
        link: "https://github.com",
      },
    ],
    capacity: {
      maxMentees: 3,
      activeMentees: 1,
      remainingSpots: 2,
      status: "available",
      acceptingRequests: true,
    },
    totalMentees: 9,
    sessionsCompleted: 26,
  },
  "m-meera-chawla": {
    mentorId: "m-meera-chawla",
    name: "Meera Chawla",
    avatarUrl: "",
    bannerUrl: "",
    headline: "Principal Product Designer @ Figma · Design Systems & Collaborative Canvas",
    company: "Figma",
    jobTitle: "Principal Product Designer",
    industry: "Design",
    department: "Design & Media",
    graduationYear: 2019,
    bio: "Leading design systems and craft initiatives. Mentoring aspiring UI/UX designers, design engineers, and students who want to build thoughtful, accessible software interfaces.",
    availability: "open",
    expertiseTags: ["Design Systems", "Product Strategy", "Figma", "User Research"],
    skills: [
      { name: "Design Systems", endorsements: 35 },
      { name: "Figma", endorsements: 44 },
      { name: "Product Strategy", endorsements: 28 },
      { name: "User Research", endorsements: 21 },
    ],
    mentorshipAreas: [
      {
        title: "Portfolio & Case Study Critique",
        description: "Refining UX case studies to stand out in top product design recruiting pipelines.",
      },
      {
        title: "Design Systems Architecture",
        description: "Token architectures, component lifecycle management, and Figma-to-code workflows.",
      },
    ],
    experience: [
      {
        role: "Principal Product Designer",
        company: "Figma",
        type: "Full-time",
        location: "San Francisco / Remote",
        startDate: "2022-01-01",
        endDate: undefined,
        bullets: [
          "Designed multi-brand token system used by thousands of enterprise design teams.",
        ],
        skills: ["Figma", "Design Systems", "Prototyping"],
      },
    ],
    featuredWork: [
      {
        title: "Universal Design Tokens Specification",
        description: "Framework bridging design tokens from Figma styles straight into CSS/Tailwind variables.",
        tags: ["Design Systems", "Tokens", "Figma"],
        link: "https://figma.com",
      },
    ],
    capacity: {
      maxMentees: 2,
      activeMentees: 0,
      remainingSpots: 2,
      status: "available",
      acceptingRequests: true,
    },
    totalMentees: 5,
    sessionsCompleted: 16,
  },
  "m-aditya-rao": {
    mentorId: "m-aditya-rao",
    name: "Aditya Rao",
    avatarUrl: "",
    bannerUrl: "",
    headline: "Frontend Architect @ Vercel · Next.js runtime, React Server Components & edge computing",
    company: "Vercel",
    jobTitle: "Frontend Architect",
    industry: "Technology",
    department: "Computer Science & Engineering",
    graduationYear: 2019,
    bio: "Passionate about making the web faster. Working on Next.js compiler optimizations, React Server Components streaming architecture, and edge caching strategies. Eager to mentor students building cutting-edge full-stack apps.",
    availability: "open",
    expertiseTags: ["TypeScript", "Next.js", "Web Performance", "React"],
    skills: [
      { name: "Next.js", endorsements: 46 },
      { name: "TypeScript", endorsements: 39 },
      { name: "React", endorsements: 41 },
      { name: "Web Performance", endorsements: 32 },
    ],
    mentorshipAreas: [
      {
        title: "Modern Full-Stack with Next.js & React 19",
        description: "Server Actions, streaming SSR, optimistic UI updates, and caching topologies.",
      },
      {
        title: "Web Vitals & Performance Engineering",
        description: "LCP/INP optimization, bundle size pruning, dynamic imports, and asset delivery.",
      },
    ],
    experience: [
      {
        role: "Frontend Architect",
        company: "Vercel",
        type: "Full-time",
        location: "Bengaluru / Remote",
        startDate: "2021-06-01",
        endDate: undefined,
        bullets: [
          "Contributed to Next.js App Router streaming pipeline and edge middleware benchmarks.",
          "Advised Fortune 500 engineering teams on headless migration strategies.",
        ],
        skills: ["Next.js", "React", "TypeScript", "Performance"],
      },
    ],
    featuredWork: [
      {
        title: "RSC Streaming Benchmark Suite",
        description: "Open performance harness measuring streaming time-to-first-byte across cloud runtimes.",
        tags: ["Next.js", "React", "Streaming"],
        link: "https://vercel.com",
      },
    ],
    capacity: {
      maxMentees: 3,
      activeMentees: 2,
      remainingSpots: 1,
      status: "available",
      acceptingRequests: true,
    },
    totalMentees: 14,
    sessionsCompleted: 42,
  },
};

/**
 * Retrieves the public professional profile of an alumni mentor for student discovery.
 * Invariant 2 Enforcement: Strips out private personal email, phone numbers, and addresses.
 */
export async function getMentorPublicProfile(
  mentorId: string
): Promise<{
  success: boolean;
  profile?: MentorPublicProfileViewData;
  error?: string;
}> {
  try {
    // 1. Check demo mentor catalog first
    if (DEMO_MENTOR_PROFILES[mentorId]) {
      return {
        success: true,
        profile: DEMO_MENTOR_PROFILES[mentorId],
      };
    }

    await connectDB();

    // 2. Query MongoDB user record (Strict projection to prevent contact detail leakage)
    const mentorUser = await User.findById(mentorId)
      .select("name role mentorProfile")
      .lean();

    if (!mentorUser) {
      // Check if mentorId matches any demo ID by key prefix or fallback
      const foundDemo = Object.values(DEMO_MENTOR_PROFILES).find(
        (m) => m.mentorId === mentorId
      );
      if (foundDemo) {
        return { success: true, profile: foundDemo };
      }
      return { success: false, error: "Mentor profile not found." };
    }

    const standalone = (await MentorProfile.findOne({ userId: mentorId }).lean()) as Record<string, unknown> | null;
    const embedded = (mentorUser.mentorProfile || {}) as Record<string, unknown>;

    // Fetch capacity info
    const capacityDoc = (await MentorCapacity.findOne({ mentorId }).lean()) as {
      maxMentees?: number;
      activeMentees?: number;
      status?: string;
      acceptingRequests?: boolean;
    } | null;

    const maxMentees = capacityDoc?.maxMentees ?? (standalone?.totalMentees as number) ?? 3;
    const activeMentees = capacityDoc?.activeMentees ?? 0;
    const remainingSpots = Math.max(0, maxMentees - activeMentees);

    const expertiseTags = (standalone?.expertiseTags as string[]) || (embedded.expertiseTags as string[]) || [
      "Software Engineering",
      "Career Strategy",
    ];

    interface RawSkill {
      name?: string;
      endorsements?: number;
    }
    const rawSkills = ((standalone?.skills as RawSkill[]) || (embedded.skills as RawSkill[]) || []);
    const skills = rawSkills.length > 0
      ? rawSkills.map((s) => ({ name: String(s.name || ""), endorsements: Number(s.endorsements || 1) }))
      : expertiseTags.map((tag) => ({ name: tag, endorsements: 5 }));

    interface RawMentorshipArea {
      title?: string;
      description?: string;
      icon?: string;
    }
    const rawAreas = ((standalone?.mentorshipAreas as RawMentorshipArea[]) || (embedded.mentorshipAreas as RawMentorshipArea[]) || []);
    const mentorshipAreas = rawAreas.length > 0
      ? rawAreas.map((a) => ({
          title: String(a.title || ""),
          description: a.description ? String(a.description) : undefined,
          icon: a.icon ? String(a.icon) : undefined,
        }))
      : [
          {
            title: "Career Navigation & Industry Transitions",
            description: "Guidance on resumes, interview preparation, and negotiating entry-level and junior roles.",
          },
          {
            title: "Technical Mentorship & Code Quality",
            description: "Architectural advice, code reviews, and scaling applications to production grade.",
          },
        ];

    interface RawExperience {
      role?: string;
      company?: string;
      type?: string;
      location?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      bullets?: string[];
      skills?: string[];
    }
    const rawExp = ((standalone?.experience as RawExperience[]) || (embedded.experience as RawExperience[]) || []);
    const experience = rawExp.map((exp) => ({
      role: String(exp.role || ""),
      company: String(exp.company || ""),
      type: exp.type ? String(exp.type) : undefined,
      location: exp.location ? String(exp.location) : undefined,
      startDate: exp.startDate instanceof Date ? exp.startDate.toISOString() : (exp.startDate ? String(exp.startDate) : undefined),
      endDate: exp.endDate instanceof Date ? exp.endDate.toISOString() : (exp.endDate ? String(exp.endDate) : undefined),
      bullets: Array.isArray(exp.bullets) ? exp.bullets.map(String) : [],
      skills: Array.isArray(exp.skills) ? exp.skills.map(String) : [],
    }));

    interface RawFeaturedWork {
      title?: string;
      description?: string;
      thumbnailUrl?: string;
      tags?: string[];
      link?: string;
    }
    const rawWork = ((standalone?.featuredWork as RawFeaturedWork[]) || (embedded.featuredWork as RawFeaturedWork[]) || []);
    const featuredWork = rawWork.map((w) => ({
      title: String(w.title || ""),
      description: w.description ? String(w.description) : undefined,
      thumbnailUrl: w.thumbnailUrl ? String(w.thumbnailUrl) : undefined,
      tags: Array.isArray(w.tags) ? w.tags.map(String) : [],
      link: w.link ? String(w.link) : undefined,
    }));

    const jobTitle = (standalone?.jobTitle as string) || (embedded.jobTitle as string) || "Senior Engineer";
    const company = (standalone?.company as string) || (embedded.company as string) || "Alumni Organization";
    const industry = (standalone?.industry as string) || (embedded.industry as string) || "Technology";

    const profile: MentorPublicProfileViewData = {
      mentorId,
      name: mentorUser.name || "Alumni Mentor",
      avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
      bannerUrl: (standalone?.bannerUrl as string) || (embedded.bannerUrl as string | undefined),
      headline: (standalone?.headline as string) || (embedded.headline as string) || `${jobTitle} at ${company}`,
      company,
      jobTitle,
      industry,
      department: (standalone?.department as string) || "Computer Science",
      graduationYear: (standalone?.graduationYear as number) || 2020,
      bio: (standalone?.bio as string) || (embedded.bio as string) || "Dedicated alumni mentor passionate about helping students navigate technical careers, system architecture, and professional growth.",
      availability: (standalone?.availability as "open" | "waitlist") || (embedded.availability as "open" | "waitlist") || "open",
      expertiseTags,
      skills,
      mentorshipAreas,
      experience,
      featuredWork,
      capacity: {
        maxMentees,
        activeMentees,
        remainingSpots,
        status: capacityDoc?.status || (remainingSpots > 0 ? "available" : "at_capacity"),
        acceptingRequests: capacityDoc?.acceptingRequests ?? (remainingSpots > 0),
      },
      totalMentees: (standalone?.totalMentees as number) || (embedded.totalMentees as number) || 4,
      sessionsCompleted: (standalone?.sessionsCompleted as number) || (embedded.sessionsCompleted as number) || 12,
    };

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error("getMentorPublicProfile error:", error);
    return {
      success: false,
      error: "An error occurred while fetching the mentor profile.",
    };
  }
}

// STUDENT LINKS & CODING PROFILES MUTATIONS
// ============================================================================

export async function updateStudentCodingProfiles(
  codingProfiles: Array<{ platform: string; username?: string; url?: string; synced?: boolean }>
) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $set: { "studentProfile.codingProfiles": codingProfiles },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $set: { codingProfiles } },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true, codingProfiles };
}

export async function addStudentSocialLink(platform: string, url: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  const link = { platform: platform.trim(), url: url.trim() };
  await User.findByIdAndUpdate(userId, {
    $push: { "studentProfile.socialLinks": link },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $push: { socialLinks: link } },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true, link };
}

export async function removeStudentSocialLink(url: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "studentProfile.socialLinks": { url } },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $pull: { socialLinks: { url } } }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

export async function addStudentOtherLink(title: string, url: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  const link = { title: title.trim(), url: url.trim() };
  await User.findByIdAndUpdate(userId, {
    $push: { "studentProfile.otherLinks": link },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $push: { otherLinks: link } },
    { upsert: true }
  );

  revalidatePath("/student/profile");
  return { success: true, link };
}

export async function removeStudentOtherLink(url: string) {
  await connectDB();
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Authentication required" };

  await User.findByIdAndUpdate(userId, {
    $pull: { "studentProfile.otherLinks": { url } },
  });
  await StudentProfile.findOneAndUpdate(
    { userId },
    { $pull: { otherLinks: { url } } }
  );

  revalidatePath("/student/profile");
  return { success: true };
}

// ============================================================================
// CLIENT-SIDE CROPPED IMAGE UPLOAD ACTION (USER-SIDE CROP -> CLOUDINARY)
// ============================================================================

export async function uploadCroppedProfileImageAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided for upload." };
    }
    const variant = (formData.get("variant") as string) || "avatar";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder = variant === "banner" ? "alma_banners" : "alma_avatars";
    const uploadRes = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
        },
        (err, result) => {
          if (err || !result) {
            return reject(err || new Error("Failed to upload image to Cloudinary."));
          }
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      uploadStream.end(buffer);
    });

    return { success: true, url: uploadRes.secure_url, publicId: uploadRes.public_id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to upload image.";
    console.error("uploadCroppedProfileImageAction error:", msg);
    return { success: false, error: msg };
  }
}
