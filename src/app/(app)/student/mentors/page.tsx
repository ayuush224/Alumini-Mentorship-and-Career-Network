import { cookies } from "next/headers";
import { Sparkles, Clock, Target } from "lucide-react";
import { connectDB } from "@/lib/db";
import {
  User as UserModel,
  StudentProfile as StudentProfileModel,
  MentorshipRequest as MentorshipRequestModel,
} from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import { calculateMatchScore } from "@/lib/matching";
import { type Mentor } from "@/app/_components/mentor-card";
import { StudentMentorsDirectory } from "./_components/student-mentors-directory";
import { getBaseMentorDirectory } from "@/lib/dal";

export const metadata = {
  title: "Mentor Discovery & Matching | Alma",
  description: "Discover verified alumni mentors recommended for your career goals.",
};

const DEMO_MENTORS: Mentor[] = [
  {
    id: "demo-1",
    mentorId: "m-priya-nair",
    name: "Priya Nair",
    company: "Stripe",
    jobTitle: "Senior Software Engineer",
    industry: "FinTech",
    expertiseTags: ["TypeScript", "Next.js", "System Design", "Distributed Systems"],
    capacity: { maxMentees: 3, activeMentees: 0, remainingSpots: 3 },
    matchScore: 95,
    matchRationale: "Industry match in FinTech & 3 shared skills (TypeScript, Next.js, System Design)",
  },
  {
    id: "demo-2",
    mentorId: "m-rohan-mehta",
    name: "Rohan Mehta",
    company: "Goldman Sachs",
    jobTitle: "VP, Quantitative Engineering",
    industry: "FinTech",
    expertiseTags: ["TypeScript", "Python", "Algorithmic Trading", "PostgreSQL"],
    capacity: { maxMentees: 2, activeMentees: 0, remainingSpots: 2 },
    matchScore: 92,
    matchRationale: "Industry match in FinTech & 2 shared skills (TypeScript, Python)",
  },
  {
    id: "demo-3",
    mentorId: "m-ananya-verma",
    name: "Ananya Verma",
    company: "Uber",
    jobTitle: "Staff Software Engineer",
    industry: "Technology",
    expertiseTags: ["Next.js", "React", "GraphQL", "Architecture"],
    capacity: { maxMentees: 2, activeMentees: 1, remainingSpots: 1 },
    matchScore: 88,
    matchRationale: "Strong industry match in Technology & shared architecture focus",
  },
  {
    id: "demo-4",
    mentorId: "m-kabir-sen",
    name: "Kabir Sen",
    company: "Datadog",
    jobTitle: "Staff Infrastructure Engineer",
    industry: "Cloud Infrastructure",
    expertiseTags: ["System Design", "Kubernetes", "Golang", "Observability"],
    capacity: { maxMentees: 3, activeMentees: 1, remainingSpots: 2 },
    matchScore: 82,
    matchRationale: "Shared systems design and cloud infrastructure skill (System Design)",
  },
  {
    id: "demo-5",
    mentorId: "m-meera-chawla",
    name: "Meera Chawla",
    company: "Figma",
    jobTitle: "Principal Product Designer",
    industry: "Design",
    expertiseTags: ["Design Systems", "Product Strategy", "Figma", "User Research"],
    capacity: { maxMentees: 2, activeMentees: 0, remainingSpots: 2 },
    matchScore: 78,
    matchRationale: "Cross-functional design systems alignment & product strategy",
  },
  {
    id: "demo-6",
    mentorId: "m-aditya-rao",
    name: "Aditya Rao",
    company: "Vercel",
    jobTitle: "Frontend Architect",
    industry: "Technology",
    expertiseTags: ["TypeScript", "Next.js", "Web Performance", "React"],
    capacity: { maxMentees: 3, activeMentees: 2, remainingSpots: 1 },
    matchScore: 96,
    matchRationale: "Industry match in Technology & 3 shared skills (TypeScript, Next.js, React)",
  },
];

interface StudentUserDoc {
  name?: string;
  studentProfile?: {
    targetIndustries?: string[];
    skillsToDevelop?: string[];
    skills?: string[];
  };
}

export default async function StudentMentorsPage() {
  await connectDB();

  let studentUserId: string | null = null;
  let studentUser: StudentUserDoc | null = null;
  let studentProfile: {
    targetIndustries?: string[];
    skillsToDevelop?: string[];
    skills?: string[];
  } | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub && typeof payload.sub === "string") {
        studentUserId = payload.sub;
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
  }

  // 1. Parallel Batch Fetching: Fetch student identity, profile, pending requests, and cached mentor directory concurrently
  const [fetchedUser, fetchedProfile, pendingRequests, baseMentors] = await Promise.all([
    studentUserId
      ? (UserModel.findById(studentUserId).select("name studentProfile").lean() as Promise<StudentUserDoc | null>)
      : Promise.resolve(null),
    studentUserId
      ? (StudentProfileModel.findOne({ userId: studentUserId }).lean() as Promise<{
          targetIndustries?: string[];
          skillsToDevelop?: string[];
          skills?: string[];
        } | null>)
      : Promise.resolve(null),
    studentUserId
      ? MentorshipRequestModel.find({ studentId: studentUserId, status: "pending" }).select("mentorId").lean()
      : Promise.resolve([]),
    getBaseMentorDirectory(),
  ]);

  studentUser = fetchedUser;
  studentProfile = fetchedProfile;

  const embeddedProfile = (studentUser?.studentProfile || {}) as Record<string, unknown>;

  const studentTargets: string[] =
    studentProfile?.targetIndustries && studentProfile.targetIndustries.length > 0
      ? studentProfile.targetIndustries
      : (embeddedProfile.targetIndustries as string[])?.length
      ? (embeddedProfile.targetIndustries as string[])
      : ["Technology", "FinTech", "Design"];

  const studentSkills: string[] =
    studentProfile?.skillsToDevelop && studentProfile.skillsToDevelop.length > 0
      ? studentProfile.skillsToDevelop
      : studentProfile?.skills && studentProfile.skills.length > 0
      ? studentProfile.skills
      : (embeddedProfile.skillsToDevelop as string[])?.length
      ? (embeddedProfile.skillsToDevelop as string[])
      : (embeddedProfile.skills as string[])?.length
      ? (embeddedProfile.skills as string[])
      : ["TypeScript", "Next.js", "System Design", "Product Strategy"];

  const studentAllSkills: string[] = [
    ...(studentProfile?.skillsToDevelop || []),
    ...(studentProfile?.skills || []),
    ...((embeddedProfile.skillsToDevelop as string[]) || []),
    ...((embeddedProfile.skills as string[]) || []),
  ];

  const pendingMentorIds = new Set(
    pendingRequests.map((r) => String(r.mentorId))
  );

  // Filter out student themselves if registered as an alumni mentor
  const eligibleMentors = studentUserId
    ? baseMentors.filter((m) => m.mentorId !== studentUserId)
    : baseMentors;

  // 2. Calculate verified match scores and rationales
  let mentors: Mentor[] = eligibleMentors.map((alumni) => {
    const match = calculateMatchScore(
      {
        targetIndustries: studentTargets,
        skillsToDevelop: studentSkills,
        skills: studentAllSkills,
      },
      {
        industry: alumni.industry,
        expertiseTags: alumni.expertiseTags || [],
        jobTitle: alumni.jobTitle,
        company: alumni.company,
      }
    );

    const maxMentees = alumni.maxMentees ?? 1;
    const activeMentees = alumni.activeMentees ?? 0;

    return {
      id: alumni.id,
      mentorId: alumni.mentorId,
      name: alumni.name || "Alumni Mentor",
      company: alumni.company || "Independent",
      jobTitle: alumni.jobTitle || "Mentor",
      industry: alumni.industry || "Technology",
      expertiseTags: alumni.expertiseTags || [],
      capacity: {
        maxMentees,
        activeMentees,
        remainingSpots: Math.max(0, maxMentees - activeMentees),
      },
      matchScore: match.score,
      matchRationale: match.rationale,
      hasPendingRequest: pendingMentorIds.has(alumni.mentorId),
    };
  });

  // Fallback to high-quality demo mentors if database has none
  if (mentors.length === 0) {
    mentors = DEMO_MENTORS.map((m) => {
      const match = calculateMatchScore(
        {
          targetIndustries: studentTargets,
          skillsToDevelop: studentSkills,
          skills: studentAllSkills,
        },
        {
          industry: m.industry,
          expertiseTags: m.expertiseTags || [],
          jobTitle: m.jobTitle,
          company: m.company,
        }
      );

      return {
        ...m,
        matchScore: match.score || m.matchScore,
        matchRationale: match.rationale || m.matchRationale,
        hasPendingRequest: pendingMentorIds.has(m.mentorId),
      };
    });
  }

  // Sort by match score descending
  mentors.sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Top Banner: Verification & Matching Transparency */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-deep via-plum to-deep px-6 py-7 text-white shadow-xl shadow-deep/10 sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-24 h-72 w-72 rounded-full border border-primary-300/20" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-300/30 bg-primary-600/15 px-3 py-1 text-xs font-semibold text-primary-200">
              <Sparkles className="h-3.5 w-3.5 text-primary-300" />
              <span>Verified alumni directory</span>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Discover your career mentor
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              Find trusted alumni who match your goals, interests, and next step. Every recommendation is explainable, and every mentor has a visible capacity limit.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary-300" />
                14-day request expiry
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary-300" />
                Transparent 0–100% matching
              </span>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-200">
              How matches work
            </p>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              <div className="flex items-center justify-between gap-4">
                <span>Career direction</span>
                <span className="font-semibold text-white">60%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/5 rounded-full bg-primary-500" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Shared skills</span>
                <span className="font-semibold text-white">40%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/5 rounded-full bg-primary-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Directory with Search, Filter & Modals */}
      <StudentMentorsDirectory
        initialMentors={mentors}
        studentFocusIndustry={studentTargets[0]}
        studentSkills={studentSkills}
      />
    </div>
  );
}
