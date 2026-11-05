import { cookies } from "next/headers";
import { Sparkles, Clock, Target } from "lucide-react";
import { connectDB } from "@/lib/db";
import {
  User as UserModel,
  StudentProfile as StudentProfileModel,
  AlumniProfile as AlumniProfileModel,
  MentorProfile as MentorProfileModel,
  MentorCapacity as MentorCapacityModel,
  MentorshipRequest as MentorshipRequestModel,
} from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import { calculateMatchScore } from "@/lib/matching";
import { type Mentor } from "@/app/_components/mentor-card";
import { StudentMentorsDirectory } from "./_components/student-mentors-directory";

export const dynamic = "force-dynamic";

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

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub && typeof payload.sub === "string") {
        studentUserId = payload.sub;
        studentUser = await UserModel.findById(studentUserId)
          .select("name studentProfile")
          .lean() as StudentUserDoc | null;
      }
    }
  } catch {
    // Fallback gracefully
  }

  // 1. Fetch student career profile from both standalone and embedded collections
  const studentProfile = studentUserId
    ? await StudentProfileModel.findOne({ userId: studentUserId }).lean()
    : null;

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

  // 2. Fetch active pending mentorship requests sent by this student
  const pendingRequests = studentUserId
    ? await MentorshipRequestModel.find({
        studentId: studentUserId,
        status: "pending",
      }).lean()
    : [];

  const pendingMentorIds = new Set(
    pendingRequests.map((r) => String(r.mentorId))
  );

  // 3. Invariant: Query MentorCapacity where activeMentees < maxMentees
  const availableCapacities = await MentorCapacityModel.find({
    $expr: { $lt: ["$activeMentees", "$maxMentees"] },
  }).lean();

  const availableMentorIds = availableCapacities.map((c) => c.mentorId);
  const capacityMap = new Map(
    availableCapacities.map((c) => [String(c.mentorId), c])
  );

  // 4. Fetch AlumniProfile & MentorProfile records (never leak alumni contact email or phone)
  const [alumniFromAlumni, alumniFromMentor] = await Promise.all([
    AlumniProfileModel.find({
      userId: {
        $in: availableMentorIds,
        ...(studentUserId ? { $ne: studentUserId } : {}),
      },
    })
      .populate({ path: "userId", select: "name _id" })
      .lean(),
    MentorProfileModel.find({
      userId: {
        $in: availableMentorIds,
        ...(studentUserId ? { $ne: studentUserId } : {}),
      },
    })
      .populate({ path: "userId", select: "name _id" })
      .lean(),
  ]);

  // Deduplicate profiles by userId
  const seenUserIds = new Set<string>();
  const combinedProfiles: Array<{
    _id: unknown;
    userId: unknown;
    company?: string;
    jobTitle?: string;
    industry?: string;
    expertiseTags?: string[];
  }> = [];

  for (const prof of [...alumniFromMentor, ...alumniFromAlumni]) {
    const uDoc = typeof prof.userId === "object" ? (prof.userId as { _id?: unknown }) : null;
    const uidStr = String(uDoc?._id || prof.userId);
    if (!seenUserIds.has(uidStr)) {
      seenUserIds.add(uidStr);
      combinedProfiles.push(prof as (typeof combinedProfiles)[0]);
    }
  }

  // 5. Calculate verified match scores and rationales
  let mentors: Mentor[] = combinedProfiles.map((alumni) => {
    const userDoc =
      typeof alumni.userId === "object"
        ? (alumni.userId as { _id?: unknown; name?: string })
        : null;
    const mentorUserId = String(userDoc?._id || alumni.userId);
    const capacity = capacityMap.get(mentorUserId);

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

    const maxMentees = capacity?.maxMentees ?? 1;
    const activeMentees = capacity?.activeMentees ?? 0;

    return {
      id: String(alumni._id),
      mentorId: mentorUserId,
      name: userDoc?.name || "Alumni Mentor",
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
      hasPendingRequest: pendingMentorIds.has(mentorUserId),
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-stone-200/80">
        <div>
          <span className="uppercase tracking-widest text-[11px] font-semibold text-[#2563EB] flex items-center gap-1.5 mb-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ALUMNI DISCOVERY &amp; MATCHING</span>
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-[#1e293b] tracking-tight">
            {`Welcome, ${studentUser?.name ? studentUser.name.split(" ")[0] : "Student"}`}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Search, filter, and discover verified alumni mentors tailored to your career milestones.
          </p>
        </div>

        {/* Top-right badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Pending Requests Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-stone-200 shadow-2xs text-stone-700">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>
              <strong>{pendingRequests.length}</strong> / 3 pending intros
            </span>
          </div>

          {/* Focus Industry Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 border border-blue-200/80 shadow-2xs text-[#2563EB]">
            <Target className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Focus: {studentTargets[0] || "Technology"}</span>
          </div>
        </div>
      </div>

      {/* Interactive Directory with Live Search & Filter Controls */}
      <StudentMentorsDirectory
        initialMentors={mentors}
        studentFocusIndustry={studentTargets[0]}
        studentSkills={studentSkills}
      />
    </div>
  );
}
