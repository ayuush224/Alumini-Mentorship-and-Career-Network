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
import { type Mentor } from "./_components/mentor-card";
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
    <div className="space-y-6">
      {/* Top Banner: Verification & Matching Transparency */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-7 text-white shadow-md border border-stone-800">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Verified Alumni Directory</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white font-serif">
            Discover Your Career Mentor
          </h1>
          <p className="text-sm text-stone-300 leading-relaxed">
            Recommendations are computed transparently based on your target industries, desired skills, and alumni expertise. Every mentor has declared active bandwidth to ensure quality engagement.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-stone-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              14-day auto-expiry on requests
            </span>
            <span className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-stone-400" />
              Transparent match score (0–100%)
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Directory with Search, Filter & Modals */}
      <StudentMentorsDirectory
        initialMentors={mentors}
        studentFocusIndustry={studentTargets[0]}
        studentSkills={studentSkills}
      />
    </div>
  );
}
