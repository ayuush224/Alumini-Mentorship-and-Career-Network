import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User, MentorProfile } from "@/lib/models/User";
import { MentorshipRequest } from "@/lib/models/Mentorship";
import { MentorHeader } from "./_components/mentor-header";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let mentorName = "Mentor";
  let avatarUrl: string | undefined;
  let pendingRequestsCount = 0;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        await connectDB();
        const [user, profile, reqCount] = await Promise.all([
          User.findById(payload.sub).lean(),
          MentorProfile.findOne({ userId: payload.sub }).lean(),
          MentorshipRequest.countDocuments({
            mentorId: payload.sub,
            status: "pending",
          }),
        ]);
        if (user) {
          mentorName = user.name || (user.email ? user.email.split("@")[0] : "Mentor");
          avatarUrl = profile?.avatarUrl || user.mentorProfile?.avatarUrl;
          pendingRequestsCount = reqCount;
        }
      }
    }
  } catch {
    // Fallback gracefully
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF] text-stone-900">
      <MentorHeader
        user={{ name: mentorName, avatarUrl }}
        pendingRequestsCount={pendingRequestsCount}
      />
      <main className="flex-1 py-8 px-4 sm:px-6">{children}</main>
    </div>
  );
}
