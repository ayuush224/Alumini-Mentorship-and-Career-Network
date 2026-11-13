import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { getCachedUser, getCachedMentorProfile, getCachedPendingRequestsCount } from "@/lib/dal";
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
        const [user, profile, reqCount] = await Promise.all([
          getCachedUser(payload.sub),
          getCachedMentorProfile(payload.sub),
          getCachedPendingRequestsCount(payload.sub),
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
