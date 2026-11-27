import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { getCachedUser, getCachedStudentProfile } from "@/lib/dal";
import { StudentHeader } from "./_components/student-header";

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

    if (!token) {
      redirect("/login");
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      // Purge invalid cookies to prevent redirect loops
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      cookieStore.delete("better-auth.session_token");
      redirect("/login");
    }

    // Role-based boundary: Mentors and Officers should be in their own workspaces
    if (
      payload.role === "alumni" ||
      payload.role === "mentor" ||
      payload.role === "alumni_mentor"
    ) {
      redirect("/mentor/dashboard");
    }

    if (
      payload.role === "alumni_relations_officer" ||
      payload.role === "placement_officer"
    ) {
      redirect("/officer");
    }

    const [user, profile] = await Promise.all([
      getCachedUser(payload.sub),
      getCachedStudentProfile(payload.sub),
    ]);

    if (!user) {
      // User ID from valid token no longer exists in DB (deleted or deactivated)
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      cookieStore.delete("better-auth.session_token");
      redirect("/login");
    }

    userName = user.name || (user.email ? user.email.split("@")[0] : "Student");
    avatarUrl = profile?.avatarUrl || user.studentProfile?.avatarUrl;
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-stone-900">
      <StudentHeader user={{ name: userName, avatarUrl }} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
