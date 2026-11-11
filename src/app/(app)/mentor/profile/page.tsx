import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User, MentorProfile } from "@/lib/models/User";
import { MentorCapacity } from "@/lib/models";
import { MAX_MENTEES_PER_MENTOR } from "@/lib/config";
import { MentorProfileEditor, MentorProfileData } from "./_components/mentor-profile-editor";


export const metadata = {
  title: "Mentor Profile Manager | Alma",
  description: "Manage your alumni mentorship profile, timeline, capacity, and expertise.",
};

export default async function MentorProfilePage() {
  await connectDB();

  let profileData: MentorProfileData | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        const user = await User.findById(payload.sub).lean();
        if (user) {
          const standalone = (await MentorProfile.findOne({ userId: user._id }).lean()) as Record<string, unknown> | null;
          const embedded = ((user.mentorProfile || {}) as Record<string, unknown>);
          const capacity = await MentorCapacity.findOne({ mentorId: user._id }).lean();

          profileData = {
            name: user.name || user.email.split("@")[0] || "Mentor",
            email: user.email,
            avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
            bannerUrl: (standalone?.bannerUrl as string) || (embedded.bannerUrl as string | undefined),
            jobTitle: (standalone?.jobTitle as string) || (embedded.jobTitle as string) || "Mentor",
            company: (standalone?.company as string) || (embedded.company as string) || "Independent",
            industry: (standalone?.industry as string) || (embedded.industry as string) || "Technology",
            headline: (standalone?.headline as string) ?? (embedded.headline as string) ?? "",
            bio: (standalone?.bio as string) ?? (embedded.bio as string) ?? "",
            availability: (standalone?.availability as "open" | "waitlist") || (embedded.availability as "open" | "waitlist") || "open",
            activeMentees: capacity?.activeMentees ?? 0,
            maxMentees: capacity?.maxMentees ?? MAX_MENTEES_PER_MENTOR,
            sessionsCompleted: (standalone?.sessionsCompleted as number) ?? (embedded.sessionsCompleted as number) ?? 0,
            totalMentees: (standalone?.totalMentees as number) ?? (embedded.totalMentees as number) ?? 0,
            averageRating: 5.0,
            skills: ((standalone?.skills as MentorProfileData["skills"]) || (embedded.skills as MentorProfileData["skills"]) || []),
            mentorshipAreas: ((standalone?.mentorshipAreas as MentorProfileData["mentorshipAreas"]) || (embedded.mentorshipAreas as MentorProfileData["mentorshipAreas"]) || []),
            experience: ((standalone?.experience as MentorProfileData["experience"]) || (embedded.experience as MentorProfileData["experience"]) || []),
            featuredWork: ((standalone?.featuredWork as MentorProfileData["featuredWork"]) || (embedded.featuredWork as MentorProfileData["featuredWork"]) || []),
          };
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error loading mentor profile:", err);
  }

  if (!profileData) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <MentorProfileEditor initialData={profileData} />
    </div>
  );
}
