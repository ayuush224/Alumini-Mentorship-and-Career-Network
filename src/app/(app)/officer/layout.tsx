import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { VerificationRequest } from "@/lib/models/Verification";
import { Mentorship, Session } from "@/lib/models/Mentorship";
import { OfficerHeader } from "./_components/officer-header";

export const dynamic = "force-dynamic";

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let officerName = "Officer";
  let avatarUrl: string | undefined;
  let pendingVerificationsCount = 0;
  let stalledMentorshipsCount = 0;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      redirect("/login");
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      redirect("/login");
    }

    // Role-based gatekeeper
    if (payload.role !== "alumni_relations_officer" && payload.role !== "administrator") {
      if (
        payload.role === "alumni" ||
        payload.role === "mentor" ||
        payload.role === "alumni_mentor"
      ) {
        redirect("/mentor/dashboard");
      } else {
        redirect("/student/dashboard");
      }
    }

    await connectDB();

    const [user, pendingCount, activeMentorships] = await Promise.all([
      User.findById(payload.sub).lean(),
      VerificationRequest.countDocuments({
        status: "pending",
      }),
      Mentorship.find({ status: "active" }).select("_id createdAt mentorId studentId").lean(),
    ]);

    if (user) {
      officerName = user.name || (user.email ? user.email.split("@")[0] : "Officer");
      avatarUrl = user.avatarUrl;
    }

    pendingVerificationsCount = pendingCount;

    // Calculate stalled count (>= 14 days inactive)
    const now = Date.now();
    for (const m of activeMentorships) {
      const lastSession = await Session.findOne({
        mentorId: m.mentorId,
        menteeId: m.studentId,
      })
        .sort({ date: -1 })
        .lean();

      const lastActivity = lastSession?.date ? new Date(lastSession.date).getTime() : new Date(m.createdAt).getTime();
      const daysInactive = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
      if (daysInactive >= 14) {
        stalledMentorshipsCount++;
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF] text-stone-900">
      <OfficerHeader
        user={{
          name: officerName,
          role: "alumni_relations_officer",
          avatarUrl,
        }}
        pendingVerificationsCount={pendingVerificationsCount}
        stalledMentorshipsCount={stalledMentorshipsCount}
      />
      <main className="flex-1 py-8 px-4 sm:px-6">{children}</main>
    </div>
  );
}
