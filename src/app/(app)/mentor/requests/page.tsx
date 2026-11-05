import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { MentorshipRequest, MentorCapacity, Mentorship } from "@/lib/models";
import { StudentProfile } from "@/lib/models/User";
import { MAX_MENTEES_PER_MENTOR } from "@/lib/config";
import { MentorRequestsList, PendingRequestItem } from "./_components/mentor-requests-list";
import { StudentCareerProfileViewData } from "@/app/actions/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mentorship Requests Inbox | Alma",
  description: "Review incoming student mentorship introductions and accept or decline requests.",
};

interface RawExperienceItem {
  role?: string;
  company?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  current?: boolean;
  description?: string;
}

function normalizeExperience(rawExpList?: unknown[]) {
  if (!Array.isArray(rawExpList)) return [];
  return (rawExpList as RawExperienceItem[]).map((exp) => ({
    role: String(exp.role || ""),
    company: String(exp.company || ""),
    startDate: exp.startDate instanceof Date ? exp.startDate.toISOString() : (exp.startDate ? String(exp.startDate) : undefined),
    endDate: exp.endDate instanceof Date ? exp.endDate.toISOString() : (exp.endDate ? String(exp.endDate) : undefined),
    current: Boolean(exp.current),
    description: exp.description ? String(exp.description) : undefined,
  }));
}

export default async function MentorRequestsPage() {
  await connectDB();

  const pendingRequests: PendingRequestItem[] = [];
  let activeMenteesCount = 0;
  let maxMenteesLimit = MAX_MENTEES_PER_MENTOR;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        const mentorId = payload.sub;

        // 1. Fetch active capacity stats
        activeMenteesCount = await Mentorship.countDocuments({
          mentorId,
          status: "active",
        });

        const capacity = await MentorCapacity.findOne({ mentorId }).lean();
        if (capacity?.maxMentees && capacity.maxMentees > 0) {
          maxMenteesLimit = Math.min(capacity.maxMentees, MAX_MENTEES_PER_MENTOR);
        }

        // 2. Query pending requests for this mentor
        const rawRequests = await MentorshipRequest.find({
          mentorId,
          status: "pending",
        })
          .sort({ createdAt: -1 })
          .populate({
            path: "studentId",
            select: "name _id studentProfile",
          })
          .lean();

        // 3. Populate student profile details
        for (const req of rawRequests) {
          const studentObj = req.studentId as unknown as Record<string, unknown> | null;
          const studentUserId = studentObj?._id ? String(studentObj._id) : "";
          let avatarUrl: string | undefined;
          let bannerUrl: string | undefined;
          let major = "Computer Science & Engineering";
          let bio: string | undefined;
          let graduationYear = new Date().getFullYear() + 2;
          let cgpa: number | undefined;
          let totalPoints = 0;
          let skills: string[] = [];
          let projects: Array<{
            title: string;
            description?: string;
            liveLink?: string;
            githubLink?: string;
            techStack: string[];
          }> = [];
          let experience: ReturnType<typeof normalizeExperience> = [];

          let targetIndustries: string[] = [];
          let skillsToDevelop: string[] = [];
          let codingProfiles: StudentCareerProfileViewData["codingProfiles"] = [];
          let socialLinks: StudentCareerProfileViewData["socialLinks"] = [];
          let otherLinks: StudentCareerProfileViewData["otherLinks"] = [];

          if (studentUserId) {
            const sp = (await StudentProfile.findOne({ userId: studentUserId }).lean()) as Record<string, unknown> | null;
            const embedded = (studentObj?.studentProfile || {}) as Record<string, unknown>;
            avatarUrl = (sp?.avatarUrl as string) || (embedded.avatarUrl as string | undefined);
            bannerUrl = (sp?.bannerUrl as string) || (embedded.bannerUrl as string | undefined);
            major = (sp?.major as string) || (embedded.major as string) || major;
            bio = (sp?.bio as string) || (embedded.bio as string | undefined);
            graduationYear = (sp?.graduationYear as number) ?? (embedded.graduationYear as number) ?? graduationYear;
            cgpa = (sp?.cgpa as number) ?? (embedded.cgpa as number) ?? undefined;
            totalPoints = (sp?.totalPoints as number) ?? (embedded.totalPoints as number) ?? 0;
            skills = ((sp?.skills as string[]) || (embedded.skills as string[]) || []);
            projects = ((sp?.projects as typeof projects) || (embedded.projects as typeof projects) || []);
            experience = normalizeExperience(
              (sp?.experience as unknown[]) || (embedded.experience as unknown[]) || []
            );
            targetIndustries = ((sp?.targetIndustries as string[]) || (embedded.targetIndustries as string[]) || []);
            skillsToDevelop = ((sp?.skillsToDevelop as string[]) || (embedded.skillsToDevelop as string[]) || []);
            codingProfiles = (sp?.codingProfiles as StudentCareerProfileViewData["codingProfiles"]) || (embedded.codingProfiles as StudentCareerProfileViewData["codingProfiles"]) || [];
            socialLinks = (sp?.socialLinks as StudentCareerProfileViewData["socialLinks"]) || (embedded.socialLinks as StudentCareerProfileViewData["socialLinks"]) || [];
            otherLinks = (sp?.otherLinks as StudentCareerProfileViewData["otherLinks"]) || (embedded.otherLinks as StudentCareerProfileViewData["otherLinks"]) || [];
          }

          const studentName = (studentObj?.name as string) || "Student Mentee";

          pendingRequests.push({
            id: String(req._id),
            studentId: studentUserId,
            studentName,
            studentAvatarUrl: avatarUrl,
            studentMajor: major,
            studentBio: bio,
            message: req.message || "Hello! I would value your guidance on systems engineering.",
            createdAt: new Date(req.createdAt).toISOString(),
            careerProfile: {
              studentId: studentUserId,
              name: studentName,
              avatarUrl,
              bannerUrl,
              bio,
              major,
              graduationYear,
              cgpa,
              totalPoints,
              skills,
              projects,
              experience,
              targetIndustries,
              skillsToDevelop,
              codingProfiles,
              socialLinks,
              otherLinks,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error("Error loading mentor requests:", err);
  }



  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <span className="uppercase tracking-widest text-[10px] font-semibold text-[#2563EB] font-mono">
          INCOMING INTRODUCTIONS
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-1">
          Mentorship Requests ({pendingRequests.length})
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Review personalized requests from students seeking your career advice and guidance.
        </p>
      </div>

      <MentorRequestsList
        initialRequests={pendingRequests}
        activeMenteesCount={activeMenteesCount}
        maxMenteesLimit={maxMenteesLimit}
      />
    </div>
  );
}
