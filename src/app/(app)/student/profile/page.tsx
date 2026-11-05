import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User, StudentProfile } from "@/lib/models/User";
import { Session, Mentorship } from "@/lib/models/Mentorship";
import {
  StudentProfileEditor,
  StudentProfileData,
  StudentProfileUpcomingSession,
} from "./_components/student-profile-editor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Student Profile | Alma",
  description: "View and update your academic details, skills, experience, and projects.",
};

export default async function StudentProfilePage() {
  await connectDB();

  let profileData: StudentProfileData | null = null;
  let upcomingSessions: StudentProfileUpcomingSession[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        const user = await User.findById(payload.sub).lean();
        if (user) {
          const standalone = (await StudentProfile.findOne({ userId: user._id }).lean()) as Record<string, unknown> | null;
          const embedded = ((user.studentProfile || {}) as Record<string, unknown>);

          profileData = {
            name: user.name || user.email.split("@")[0] || "Student",
            email: user.email,
            avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
            bannerUrl: (standalone?.bannerUrl as string) || (embedded.bannerUrl as string | undefined),
            bio: (standalone?.bio as string) ?? (embedded.bio as string) ?? "",
            major: (standalone?.major as string) ?? (embedded.major as string) ?? "",
            graduationYear: (standalone?.graduationYear as number) ?? (embedded.graduationYear as number) ?? (new Date().getFullYear() + 2),
            cgpa: (standalone?.cgpa as number) ?? (embedded.cgpa as number) ?? undefined,
            totalPoints: (standalone?.totalPoints as number) ?? (embedded.totalPoints as number) ?? 0,
            skills: ((standalone?.skills as string[]) || (embedded.skills as string[]) || []),
            projects: ((standalone?.projects as StudentProfileData["projects"]) || (embedded.projects as StudentProfileData["projects"]) || []),
            experience: ((standalone?.experience as StudentProfileData["experience"]) || (embedded.experience as StudentProfileData["experience"]) || []),
            codingProfiles: ((standalone?.codingProfiles as StudentProfileData["codingProfiles"]) || (embedded.codingProfiles as StudentProfileData["codingProfiles"]) || [
              { platform: "LeetCode", username: "alex_chen", synced: true },
            ]),
            socialLinks: ((standalone?.socialLinks as StudentProfileData["socialLinks"]) || (embedded.socialLinks as StudentProfileData["socialLinks"]) || []),
            otherLinks: ((standalone?.otherLinks as StudentProfileData["otherLinks"]) || (embedded.otherLinks as StudentProfileData["otherLinks"]) || []),
          };

          // Fetch student's upcoming sessions
          const now = new Date();
          const studentMentorships = await Mentorship.find({
            studentId: payload.sub,
            status: "active",
            isDeleted: { $ne: true },
          }).select("mentorId").lean();

          const activeMentorIds = studentMentorships.map((m) => m.mentorId);

          const rawSessions = await Session.find({
            $or: [
              { menteeId: payload.sub },
              {
                mentorId: { $in: activeMentorIds },
                $or: [{ isAllMentees: true }, { menteeId: null }],
              },
            ],
            date: { $gte: now },
            status: "scheduled",
            isDeleted: { $ne: true },
          })
            .sort({ date: 1 })
            .limit(5)
            .populate("mentorId", "name studentProfile mentorProfile")
            .lean();

          upcomingSessions = rawSessions.map((s) => {
            const mentorObj = s.mentorId as unknown as Record<string, unknown> | null;
            return {
              id: String(s._id),
              title: s.title,
              date: s.date.toISOString(),
              time: s.time,
              durationMinutes: s.durationMinutes || 45,
              mentorName: (mentorObj?.name as string) || "Alumni Mentor",
              isCohort: Boolean(s.isAllMentees || !s.menteeId),
              location: s.location,
            };
          });
        }
      }
    }
  } catch (err) {
    console.error("Error loading student profile:", err);
  }

  if (!profileData) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-16">
      <StudentProfileEditor initialData={profileData} upcomingSessions={upcomingSessions} />
    </div>
  );
}
