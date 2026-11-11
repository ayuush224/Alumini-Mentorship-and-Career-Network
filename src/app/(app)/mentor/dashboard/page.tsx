import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Session, Mentorship, MentorCapacity } from "@/lib/models/Mentorship";
import { MentorSession } from "@/lib/models/MentorSession";
import { MentorTask } from "@/lib/models/Tasks";
import { getCachedUser, getCachedMentorProfile, getCachedPendingRequestsCount } from "@/lib/dal";
import {
  MentorDashboardView,
  MentorUpcomingSession,
  MentorAdminTask,
} from "./_components/mentor-dashboard-view";


export const metadata = {
  title: "Mentor Dashboard | Alma",
  description: "Track your active mentees, upcoming sessions, and administrative tasks.",
};

export default async function MentorDashboardPage() {
  await connectDB();

  let mentorName = "Mentor";
  let mentorHeadline = "Alumni Mentor";
  let mentorId = "";
  let activeMenteesCount = 0;
  let maxMenteesLimit = Number(process.env.MAX_MENTEES_PER_MENTOR || 5);
  let pendingRequestsCount = 0;
  let upcomingSession: MentorUpcomingSession | null = null;
  let tasks: MentorAdminTask[] = [];
  const activeMentees: Array<{ id: string; name: string; major: string; avatarUrl?: string }> = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        mentorId = payload.sub;
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Background task cleanup (non-blocking for SSR render)
        MentorTask.updateMany(
          {
            mentorId,
            dueDate: { $lt: startOfToday },
            status: { $ne: "archived" },
          },
          {
            $set: { status: "archived", isDeleted: true },
          }
        ).catch(() => {});

        // Parallel Fetching Optimization with Request-Scoped Cache (Promise.all)
        const [
          user,
          mp,
          capacity,
          activeCount,
          pendingCount,
          nextSessionDoc,
          nextMentorSessionDoc,
          dbTasks,
        ] = await Promise.all([
          getCachedUser(mentorId),
          getCachedMentorProfile(mentorId),
          MentorCapacity.findOne({ mentorId }).lean(),
          Mentorship.countDocuments({
            mentorId,
            status: "active",
            isDeleted: { $ne: true },
          }),
          getCachedPendingRequestsCount(mentorId),
          Session.findOne({
            mentorId,
            date: { $gte: now },
            status: "scheduled",
            isDeleted: { $ne: true },
          })
            .sort({ date: 1 })
            .populate("menteeId", "name studentProfile email")
            .lean(),
          MentorSession.findOne({
            mentorId,
            startTime: { $gte: now },
            status: "scheduled",
          })
            .sort({ startTime: 1 })
            .populate("menteeIds", "name studentProfile avatarUrl")
            .lean(),
          MentorTask.find({
            dueDate: { $gte: startOfToday },
            mentorId,
            status: { $ne: "archived" },
            isDeleted: { $ne: true },
            $or: [
              { studentId: { $exists: false } },
              { studentId: null },
            ],
          })
            .sort({ dueDate: 1 })
            .lean(),
        ]);

        if (user) {
          mentorName = user.name || (user.email ? user.email.split("@")[0] : "Mentor");
          if (mp?.headline) {
            mentorHeadline = mp.headline;
          } else if (user.mentorProfile?.headline) {
            mentorHeadline = user.mentorProfile.headline;
          } else if (mp?.jobTitle && mp?.company) {
            mentorHeadline = `${mp.jobTitle} @ ${mp.company}`;
          } else if (user.mentorProfile?.jobTitle && user.mentorProfile?.company) {
            mentorHeadline = `${user.mentorProfile.jobTitle} @ ${user.mentorProfile.company}`;
          }

          if (capacity?.maxMentees !== undefined) {
            maxMenteesLimit = capacity.maxMentees;
          }
          activeMenteesCount = capacity?.activeMentees ?? activeCount;
          pendingRequestsCount = pendingCount;

          if (nextMentorSessionDoc) {
            const firstMentee =
              Array.isArray(nextMentorSessionDoc.menteeIds) && nextMentorSessionDoc.menteeIds.length > 0
                ? (nextMentorSessionDoc.menteeIds[0] as unknown as Record<string, unknown>)
                : null;
            const menteeProfile = (firstMentee?.studentProfile || {}) as Record<string, unknown>;
            const additionalCount = nextMentorSessionDoc.menteeIds.length - 1;
            const menteeNameStr = (firstMentee?.name as string) || "Mentee";

            upcomingSession = {
              id: String(nextMentorSessionDoc._id),
              title: nextMentorSessionDoc.topic || "1:1 Mentoring Consultation",
              date: nextMentorSessionDoc.startTime.toISOString(),
              time: nextMentorSessionDoc.startTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              location: nextMentorSessionDoc.meetingLink,
              menteeName: additionalCount > 0 ? `${menteeNameStr} (+${additionalCount} more)` : menteeNameStr,
              menteeAvatarUrl: (menteeProfile?.avatarUrl as string) || (firstMentee?.avatarUrl as string) || undefined,
              menteeHeadline:
                (menteeProfile?.major as string)
                  ? `${menteeProfile.major} · Class of ${menteeProfile.graduationYear || 2026}`
                  : "Student Mentee · Alma Fellow",
              prerequisites: ["Review mutual goals", "Prepare session discussion items"],
            };
          } else if (nextSessionDoc) {
            const menteeObj = nextSessionDoc.menteeId as unknown as Record<string, unknown> | null;
            const menteeProfile = (menteeObj?.studentProfile || {}) as Record<string, unknown>;

            upcomingSession = {
              id: String(nextSessionDoc._id),
              title: nextSessionDoc.title,
              date: nextSessionDoc.date.toISOString(),
              time: nextSessionDoc.time,
              location: nextSessionDoc.location,
              menteeName: (menteeObj?.name as string) || "Mentee",
              menteeAvatarUrl: menteeProfile?.avatarUrl as string | undefined,
              menteeHeadline:
                (menteeProfile?.major as string)
                  ? `${menteeProfile.major} · Class of ${menteeProfile.graduationYear || 2026}`
                  : "Student Mentee · Alma Fellow",
              prerequisites: nextSessionDoc.prerequisites || [],
            };
          }

          if (dbTasks.length > 0) {
            tasks = dbTasks.map((t) => ({
              id: String(t._id),
              title: t.title,
              description: t.description,
              dueDate: t.dueDate.toISOString(),
              completed: t.completed,
              completedAt: t.completedAt?.toISOString(),
            }));
          }

          // Fetch active mentees roster for Schedule Session modal
          const rawMentorships = await Mentorship.find({
            mentorId,
            status: "active",
            isDeleted: { $ne: true },

          })
            .populate("studentId", "name studentProfile email avatarUrl")
            .lean();

          for (const m of rawMentorships) {
            const studentObj = m.studentId as unknown as Record<string, unknown> | null;
            if (studentObj && studentObj._id) {
              const studentUserId = String(studentObj._id);
              const embeddedSp = (studentObj.studentProfile || {}) as Record<string, unknown>;

              const avatarUrl = (studentObj.avatarUrl as string) || (embeddedSp.avatarUrl as string | undefined);
              const major = (embeddedSp.major as string) || "Computer Science";

              activeMentees.push({
                id: studentUserId,
                name: (studentObj.name as string) || "Student Mentee",
                major,
                avatarUrl,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error loading mentor dashboard:", err);
  }

  return (
    <MentorDashboardView
      mentorName={mentorName}
      mentorHeadline={mentorHeadline}
      activeMenteesCount={activeMenteesCount}
      maxMenteesLimit={maxMenteesLimit}
      pendingRequestsCount={pendingRequestsCount}
      upcomingSession={upcomingSession}
      initialTasks={tasks}
      mentorId={mentorId}
      activeMentees={activeMentees}
    />
  );
}
