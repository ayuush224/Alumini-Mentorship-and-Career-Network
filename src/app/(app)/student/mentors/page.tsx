import { cookies } from "next/headers";
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
    id: "seed-mentor-1",
    mentorId: "seed-mentor-1",
    name: "Priya Nair",
    company: "Stripe",
    jobTitle: "Staff Software Engineer",
    industry: "Financial Technology",
    expertiseTags: ["Distributed Systems", "Go", "Kafka", "PostgreSQL", "System Design"],
    capacity: { maxMentees: 5, activeMentees: 2, remainingSpots: 3 },
    matchScore: 94,
    matchRationale: "Strong fit for Financial Technology and Distributed Systems goals",
  },
  {
    id: "seed-mentor-2",
    mentorId: "seed-mentor-2",
    name: "Vikram Malhotra",
    company: "Amazon Web Services",
    jobTitle: "Senior Cloud Architect",
    industry: "Cloud Infrastructure",
    expertiseTags: ["Cloud Infrastructure", "Kubernetes", "Docker", "DevOps", "AWS"],
    capacity: { maxMentees: 5, activeMentees: 3, remainingSpots: 2 },
    matchScore: 89,
    matchRationale: "Experienced with Kubernetes architecture & cloud transition",
  },
  {
    id: "seed-mentor-3",
    mentorId: "seed-mentor-3",
    name: "Ananya Roy",
    company: "Uber",
    jobTitle: "Principal Engineer",
    industry: "Technology",
    expertiseTags: ["Microservices", "Reliability", "TypeScript", "Next.js", "Go"],
    capacity: { maxMentees: 4, activeMentees: 1, remainingSpots: 3 },
    matchScore: 96,
    matchRationale: "Aligned with your Next.js, TypeScript & Microservices pathway",
  },
  {
    id: "seed-mentor-4",
    mentorId: "seed-mentor-4",
    name: "Dr. Aris Thorne",
    company: "Google DeepMind",
    jobTitle: "Staff AI Scientist",
    industry: "Artificial Intelligence",
    expertiseTags: ["Artificial Intelligence", "Machine Learning", "PyTorch", "Generative AI", "NLP"],
    capacity: { maxMentees: 3, activeMentees: 1, remainingSpots: 2 },
    matchScore: 92,
    matchRationale: "Research & applied guidance for Generative AI and ML engineering",
  },
  {
    id: "seed-mentor-5",
    mentorId: "seed-mentor-5",
    name: "Sarah Chen",
    company: "Figma",
    jobTitle: "Group Product Manager",
    industry: "Product Management",
    expertiseTags: ["Product Management", "Product Strategy", "User Research", "Agile Roadmap"],
    capacity: { maxMentees: 4, activeMentees: 2, remainingSpots: 2 },
    matchScore: 86,
    matchRationale: "Industry expertise in tech product discovery and roadmap execution",
  },
  {
    id: "seed-mentor-6",
    mentorId: "seed-mentor-6",
    name: "Marcus Rivera",
    company: "Airbnb",
    jobTitle: "Staff Product Designer",
    industry: "Design",
    expertiseTags: ["UI/UX Design", "Design Systems", "Figma", "User Experience", "Interaction Design"],
    capacity: { maxMentees: 4, activeMentees: 1, remainingSpots: 3 },
    matchScore: 88,
    matchRationale: "Portfolio reviews and design systems guidance from design leader",
  },
  {
    id: "seed-mentor-7",
    mentorId: "seed-mentor-7",
    name: "Maya Patel",
    company: "CrowdStrike",
    jobTitle: "Lead Security Architect",
    industry: "Cybersecurity",
    expertiseTags: ["Cybersecurity", "Cloud Security", "Threat Modeling", "Zero Trust", "Penetration Testing"],
    capacity: { maxMentees: 5, activeMentees: 2, remainingSpots: 3 },
    matchScore: 87,
    matchRationale: "Direct mentorship for Cloud Security & InfoSec career pathways",
  },
  {
    id: "seed-mentor-8",
    mentorId: "seed-mentor-8",
    name: "Kabir Mehta",
    company: "Netflix",
    jobTitle: "Principal Data Scientist",
    industry: "Data Science",
    expertiseTags: ["Data Science", "Recommendation Systems", "Python", "SQL", "Big Data"],
    capacity: { maxMentees: 4, activeMentees: 2, remainingSpots: 2 },
    matchScore: 91,
    matchRationale: "Strong technical alignment with Data Science and Big Data stacks",
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header (Consistent with Mentor Workspace Design System) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-primary-600 font-mono">
            VERIFIED ALUMNI DIRECTORY
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-1">
            Discover Mentors
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Find trusted alumni who match your goals, interests, and career trajectory. Every recommendation is explainable with visible capacity limits.
          </p>
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
