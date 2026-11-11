import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Session } from "@/lib/models/Mentorship";
import { MentorSession } from "@/lib/models/MentorSession";
import { Goal, Action } from "@/lib/models/Tasks";
import { serializeSession } from "@/lib/session-service";
import { getCachedUser, getCachedStudentProfile, getCachedActiveMentorships } from "@/lib/dal";
import {
  StudentDashboardView,
  UpcomingSessionData,
  GoalProgressData,
  DashboardTaskItem,
} from "./_components/student-dashboard-view";


export const metadata = {
  title: "Student Dashboard | Alma",
  description: "Track your upcoming mentorship sessions, goals, and active sub-tasks.",
};

export default async function StudentDashboardPage() {
  await connectDB();

  let studentName = "Student";
  let totalPoints = 0;
  let upcomingSession: UpcomingSessionData | null = null;
  let goalsData: GoalProgressData = {
    totalGoals: 0,
    completedGoals: 0,
    totalActions: 0,
    completedActions: 0,
    percentage: 0,
  };
  let tasks: DashboardTaskItem[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        const studentId = payload.sub;
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Background task cleanup (non-blocking for SSR render)
        Action.updateMany(
          {
            studentId,
            dueDate: { $lt: startOfToday },
            status: { $ne: "archived" },
          },
          {
            $set: { status: "archived", isDeleted: true },
          }
        ).catch(() => {});

        // 1. Fetch active mentorships using request-scoped cache
        const studentMentorships = await getCachedActiveMentorships(studentId);
        const activeMentorIds = studentMentorships.map((m) => m.mentorId);

        // 2. Parallel Fetching with Request-Scoped Cache (Promise.all)
        const [user, sp, nextSessionDoc, nextMentorSessionDoc, dbGoals, dbActions] = await Promise.all([
          getCachedUser(studentId),
          getCachedStudentProfile(studentId),
          Session.findOne({
            $or: [
              { menteeId: studentId },
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
            .populate("mentorId", "name studentProfile mentorProfile")
            .lean(),
          MentorSession.findOne({
            $or: [
              { menteeIds: studentId },
              { mentorId: { $in: activeMentorIds } },
            ],
            startTime: { $gte: now },
            status: "scheduled",
          })
            .sort({ startTime: 1 })
            .populate("mentorId", "name studentProfile mentorProfile")
            .lean(),
          Goal.find({ studentId }).lean(),
          Action.find({
            studentId,
            status: { $ne: "archived" },
            dueDate: { $gte: startOfToday },
            isDeleted: { $ne: true },
          })
            .sort({ dueDate: 1 })
            .lean(),
        ]);

        if (user) {
          studentName = user.name
            ? user.name.split(" ")[0]
            : user.email
            ? user.email.split("@")[0]
            : "Student";

          totalPoints = sp?.totalPoints ?? user.studentProfile?.totalPoints ?? 0;

          let studentActions = dbActions;
          if (studentActions.length === 0) {
            const starterTasks = [
              {
                studentId: user._id,
                title: "Explore verified alumni mentors in your focus industries",
                dueDate: new Date(Date.now() + 86400000 * 2),
                completed: false,
                addedBy: "mentor" as const,
                pointsAwarded: false,
                status: "active" as const,
              },
              {
                studentId: user._id,
                title: "Review career goals and update your student skills profile",
                dueDate: new Date(Date.now() + 86400000 * 4),
                completed: false,
                addedBy: "mentor" as const,
                pointsAwarded: false,
                status: "active" as const,
              },
              {
                studentId: user._id,
                title: "Draft questions and schedule your first 1-on-1 mentorship consultation",
                dueDate: new Date(Date.now() + 86400000 * 6),
                completed: false,
                addedBy: "student" as const,
                pointsAwarded: false,
                status: "active" as const,
              },
            ];
            // Non-blocking background persistence
            Action.insertMany(starterTasks).catch(() => {});
            studentActions = starterTasks as unknown as typeof dbActions;
          }

          let chosenSource: "mentorSession" | "session" | null = null;
          if (nextMentorSessionDoc && nextSessionDoc) {
            const tMentor = new Date(nextMentorSessionDoc.startTime).getTime();
            const tSession = new Date(nextSessionDoc.date).getTime();
            chosenSource = tMentor <= tSession ? "mentorSession" : "session";
          } else if (nextMentorSessionDoc) {
            chosenSource = "mentorSession";
          } else if (nextSessionDoc) {
            chosenSource = "session";
          }

          if (chosenSource === "mentorSession" && nextMentorSessionDoc) {
            const serialized = serializeSession(nextMentorSessionDoc, studentId, "student");
            const mentorObj = nextMentorSessionDoc.mentorId as unknown as Record<string, unknown> | null;
            const mentorProfile = (mentorObj?.mentorProfile || {}) as Record<string, unknown>;
            const isCohort = (nextMentorSessionDoc.menteeIds?.length || 0) > 1 || !nextMentorSessionDoc.menteeIds?.some((m: unknown) => String(m) === studentId);

            upcomingSession = {
              id: String(nextMentorSessionDoc._id),
              title: nextMentorSessionDoc.topic || (isCohort ? "Cohort Mentoring Session" : "1:1 Mentoring Consultation"),
              date: nextMentorSessionDoc.startTime.toISOString(),
              time: nextMentorSessionDoc.startTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              durationMinutes: nextMentorSessionDoc.durationMinutes || 45,
              isCohort,
              location: serialized?.meetingLink,
              linkNotice: serialized?.linkNotice,
              mentorName: (mentorObj?.name as string) || "Alumni Mentor",
              mentorAvatarUrl: mentorProfile?.avatarUrl as string | undefined,
              mentorCompany: (mentorProfile?.company as string) || "Independent",
              mentorJobTitle: (mentorProfile?.jobTitle as string) || "Mentor",
              prerequisites: ["Review mutual goals", "Prepare session discussion items"],
            };
          } else if (chosenSource === "session" && nextSessionDoc) {
            const mentorObj = nextSessionDoc.mentorId as unknown as Record<string, unknown> | null;
            const mentorProfile = (mentorObj?.mentorProfile || {}) as Record<string, unknown>;
            const isCohort = Boolean(nextSessionDoc.isAllMentees || !nextSessionDoc.menteeId);

            upcomingSession = {
              id: String(nextSessionDoc._id),
              title: nextSessionDoc.title,
              date: nextSessionDoc.date.toISOString(),
              time: nextSessionDoc.time,
              durationMinutes: nextSessionDoc.durationMinutes || 45,
              isCohort,
              location: nextSessionDoc.location,
              mentorName: (mentorObj?.name as string) || "Alumni Mentor",
              mentorAvatarUrl: mentorProfile?.avatarUrl as string | undefined,
              mentorCompany: (mentorProfile?.company as string) || "Independent",
              mentorJobTitle: (mentorProfile?.jobTitle as string) || "Mentor",
              prerequisites: nextSessionDoc.prerequisites || [],
            };
          }

          const completedActions = studentActions.filter((a) => a.completed).length;
          const totalActions = studentActions.length;
          const percentage =
            totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

          goalsData = {
            totalGoals: Math.max(dbGoals.length, totalActions > 0 ? 1 : 0),
            completedGoals: completedActions,
            totalActions,
            completedActions,
            percentage,
          };

          tasks = studentActions.map((a) => ({
            id: String(a._id),
            title: a.title,
            description: a.description,
            dueDate:
              a.dueDate instanceof Date
                ? a.dueDate.toISOString()
                : new Date(a.dueDate).toISOString(),
            completed: a.completed,
            completedAt: a.completedAt
              ? a.completedAt instanceof Date
                ? a.completedAt.toISOString()
                : new Date(a.completedAt).toISOString()
              : undefined,
            addedBy: a.addedBy,
            pointsAwarded: a.pointsAwarded,
          }));
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error loading student dashboard:", err);
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <StudentDashboardView
        studentName={studentName}
        totalPoints={totalPoints}
        upcomingSession={upcomingSession}
        goalsData={goalsData}
        initialTasks={tasks}
      />
    </div>
  );
}
