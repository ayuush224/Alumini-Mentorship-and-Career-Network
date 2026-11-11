import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { getCachedUser, getCachedStudentProfile } from "@/lib/dal";
import {
  getCachedStudentAnalytics,
  fetchStudent12MonthAnalytics,
  StudentAnalyticsOverview,
} from "@/lib/utils/analytics";
import { StudentAnalyticsView } from "@/app/(app)/student/analytics/_components/student-analytics-view";
import { StudentHeader } from "@/app/(app)/student/_components/student-header";


export const metadata = {
  title: "Analytics & Performance | Alma",
  description: "12-month performance trajectory and mentor completeness metrics.",
};

export default async function AnalyticsPage() {
  await connectDB();

  let studentName = "Aarav";
  let avatarUrl: string | undefined;
  let studentId = "";
  let analyticsData: StudentAnalyticsOverview | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        studentId = payload.sub;
        const [user, profile] = await Promise.all([
          getCachedUser(studentId),
          getCachedStudentProfile(studentId),
        ]);
        if (user) {
          studentName = user.name ? user.name.split(" ")[0] : studentName;
          avatarUrl = profile?.avatarUrl || user.studentProfile?.avatarUrl;
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error reading student session in /analytics:", err);
  }

  try {
    if (studentId) {
      analyticsData = await getCachedStudentAnalytics(studentId);
    } else {
      analyticsData = await fetchStudent12MonthAnalytics("demo-student-id");
    }
  } catch (err) {
    console.error("Error loading analytics data:", err);
    analyticsData = await fetchStudent12MonthAnalytics("demo-student-id");
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <StudentHeader user={{ name: studentName, avatarUrl }} />
      <main className="flex-1 pb-16">
        <StudentAnalyticsView analytics={analyticsData} studentName={studentName} />
      </main>
    </div>
  );
}
