import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { getCachedUser, getCachedStudentProfile } from "@/lib/dal";
import { StudentHeader } from "./_components/student-header";
import { PageTransition } from "@/app/_components/page-transition";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userName = "Student";
  let avatarUrl: string | undefined;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        const [user, profile] = await Promise.all([
          getCachedUser(payload.sub),
          getCachedStudentProfile(payload.sub),
        ]);
        if (user) {
          userName = user.name || (user.email ? user.email.split("@")[0] : "Student");
          avatarUrl = profile?.avatarUrl || user.studentProfile?.avatarUrl;
        }
      }
    }
  } catch {
    // Fallback gracefully
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF] text-stone-900">
      <StudentHeader user={{ name: userName, avatarUrl }} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
