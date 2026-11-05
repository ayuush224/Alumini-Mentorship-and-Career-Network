import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User, MentorProfile } from "@/lib/models/User";
import { MentorCapacity } from "@/lib/models";
import { Goal } from "@/lib/models/Tasks";
import { MAX_MENTEES_PER_MENTOR } from "@/lib/config";
import { PublicMentorView, PublicMentorData } from "./_components/public-mentor-view";

export const dynamic = "force-dynamic";

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata() {
  return {
    title: `Alumni Mentor Profile | Alma`,
    description: "Connect with verified alumni mentors for structured career guidance.",
  };
}

export default async function PublicMentorProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;

  await connectDB();

  // 1. Check logged-in user context
  let studentGoals: Array<{ id: string; title: string }> = [];
  let isLoggedInStudent = false;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        if (payload.role === "student") isLoggedInStudent = true;
        const userGoals = await Goal.find({ studentId: payload.sub }).lean();
        studentGoals = userGoals.map((g) => ({
          id: String(g._id),
          title: g.title,
        }));
      }
    }
  } catch {
    // Non-blocking
  }

  // 2. Fetch mentor from DB (ensuring sanitization - NEVER LEAK PERSONAL CONTACT INFO)
  let mentorData: PublicMentorData | null = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    try {
      const mentorUser = await User.findById(id).select("-password -email").lean();
      if (mentorUser) {
        const standalone = (await MentorProfile.findOne({ userId: mentorUser._id }).lean()) as Record<string, unknown> | null;
        const embedded = ((mentorUser.mentorProfile || {}) as Record<string, unknown>);
        const capacity = await MentorCapacity.findOne({ mentorId: mentorUser._id }).lean();

        mentorData = {
          id: String(mentorUser._id),
          name: mentorUser.name || "Alumni Mentor",
          avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
          bannerUrl: (standalone?.bannerUrl as string) || (embedded.bannerUrl as string | undefined),
          jobTitle: (standalone?.jobTitle as string) || (embedded.jobTitle as string) || "Mentor",
          company: (standalone?.company as string) || (embedded.company as string) || "Independent",
          industry: (standalone?.industry as string) || (embedded.industry as string) || "Technology",
          headline: (standalone?.headline as string) ?? (embedded.headline as string) ?? "Alma Verified Mentor",
          bio: (standalone?.bio as string) ?? (embedded.bio as string) ?? "",
          availability: (standalone?.availability as "open" | "waitlist") || (embedded.availability as "open" | "waitlist") || "open",
          activeMentees: capacity?.activeMentees ?? 0,
          maxMentees: capacity?.maxMentees ?? MAX_MENTEES_PER_MENTOR,
          sessionsCompleted: (standalone?.sessionsCompleted as number) ?? (embedded.sessionsCompleted as number) ?? 0,
          averageRating: 5.0,
          skills: ((standalone?.skills as PublicMentorData["skills"]) || (embedded.skills as PublicMentorData["skills"]) || []),
          mentorshipAreas: ((standalone?.mentorshipAreas as PublicMentorData["mentorshipAreas"]) || (embedded.mentorshipAreas as PublicMentorData["mentorshipAreas"]) || []),
          experience: ((standalone?.experience as PublicMentorData["experience"]) || (embedded.experience as PublicMentorData["experience"]) || []),
          featuredWork: ((standalone?.featuredWork as PublicMentorData["featuredWork"]) || (embedded.featuredWork as PublicMentorData["featuredWork"]) || []),
          reviews: ((standalone?.reviews as PublicMentorData["reviews"]) || (embedded.reviews as PublicMentorData["reviews"]) || []),
        };
      }
    } catch (err) {
      console.error("Error fetching mentor by id:", err);
    }
  }

  if (!mentorData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PublicMentorView
        mentor={mentorData}
        studentGoals={studentGoals}
        isLoggedInStudent={isLoggedInStudent}
      />
    </div>
  );
}
