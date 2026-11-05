import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  fetchStudent12MonthAnalytics,
  StudentAnalyticsOverview,
} from "@/lib/utils/analytics";
import { StudentAnalyticsView } from "./_components/student-analytics-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics & Performance | Alma",
  description: "12-month performance trajectory and mentor completeness metrics.",
};

export default async function StudentAnalyticsPage() {
  await connectDB();

  let studentName = "Student";
  let studentId = "";

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        studentId = payload.sub;
        const user = await User.findById(studentId).lean();
        if (user) {
          studentName = user.name
            ? user.name.split(" ")[0]
            : user.email
            ? user.email.split("@")[0]
            : "Student";
        }
      }
    }
  } catch (err) {
    console.error("Error reading student session for analytics:", err);
  }

  if (!studentId) {
    redirect("/login");
  }

  const analyticsData: StudentAnalyticsOverview = await fetchStudent12MonthAnalytics(studentId);

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <StudentAnalyticsView analytics={analyticsData} studentName={studentName} />
    </div>
  );
}
