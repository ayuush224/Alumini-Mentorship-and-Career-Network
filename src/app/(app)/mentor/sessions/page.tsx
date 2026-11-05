import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { verifyAccess } from "@/lib/app-tokens";
import { Session, Mentorship } from "@/lib/models/Mentorship";
import { SharedNote } from "@/lib/models/Communication";
import { MentorSession } from "@/lib/models/MentorSession";
import { StudentProfile } from "@/lib/models/User";
import { calculateSessionInterval } from "@/lib/utils/scheduling";
import {
  MentorSessionsView,
  MentorSessionItem,
  MentorMenteeOption,
} from "./_components/mentor-sessions-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mentoring Sessions Coordination | Alma",
  description: "Schedule and manage upcoming 1-on-1 check-ins, portfolio reviews, and mock interviews.",
};

export default async function MentorSessionsPage() {
  await connectDB();

  let mentorId = "";
  const initialSessions: MentorSessionItem[] = [];
  const activeMentees: MentorMenteeOption[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        mentorId = payload.sub;

        // 1. Fetch active mentorships to populate the mentee roster dropdown
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

            let avatarUrl = (studentObj.avatarUrl as string) || (embeddedSp.avatarUrl as string | undefined);
            let major = (embeddedSp.major as string) || "Computer Science";

            if (studentUserId) {
              const sp = (await StudentProfile.findOne({ userId: studentUserId }).lean()) as Record<
                string,
                unknown
              > | null;
              if (sp) {
                avatarUrl = (sp.avatarUrl as string) || avatarUrl;
                major = (sp.major as string) || major;
              }
            }

            activeMentees.push({
              id: studentUserId,
              name: (studentObj.name as string) || "Student Mentee",
              major,
              avatarUrl,
            });
          }
        }

        // 2. Query all scheduled and completed sessions for this mentor
        const rawSessions = await Session.find({
          mentorId,
          isDeleted: { $ne: true },
        })
          .populate("menteeId", "name studentProfile email avatarUrl")
          .sort({ date: 1 })
          .lean();

        // 2.1 Retrieve all shared notes linked to these sessions
        const sessionIds = rawSessions.map((s) => s._id);
        const rawNotes = await SharedNote.find({
          mentorId,
          sessionId: { $in: sessionIds },
        }).lean();

        const notesBySessionId = new Map<string, Record<string, unknown>>();
        for (const n of rawNotes) {
          if (n.sessionId) {
            notesBySessionId.set(String(n.sessionId), n as unknown as Record<string, unknown>);
          }
        }

        const ONE_HOUR_MS = 60 * 60 * 1000;
        const nowMs = Date.now();

        for (const s of rawSessions) {
          const menteeObj = s.menteeId as unknown as Record<string, unknown> | null;
          const isCohort = Boolean(s.isAllMentees || !s.menteeId);
          let menteeName = isCohort ? "All Active Mentees (Cohort)" : "Open Mentorship Call";
          let menteeMajor = isCohort ? `Cohort (${activeMentees.length} Mentees)` : "General Check-In";
          let menteeAvatarUrl: string | undefined;

          if (menteeObj && menteeObj._id) {
            menteeName = (menteeObj.name as string) || "Student Mentee";
            const embeddedSp = (menteeObj.studentProfile || {}) as Record<string, unknown>;
            menteeAvatarUrl = (menteeObj.avatarUrl as string) || (embeddedSp.avatarUrl as string | undefined);
            menteeMajor = (embeddedSp.major as string) || "Computer Science";
          }

          // Calculate 1-hour post-session cutoff window
          const { end: sessionEnd } = calculateSessionInterval(
            s.date,
            s.time,
            s.durationMinutes || 45
          );
          const cutoffTimeMs = sessionEnd.getTime() + ONE_HOUR_MS;
          const editCutoffTime = new Date(cutoffTimeMs).toISOString();
          const canEditMaterials = nowMs <= cutoffTimeMs && s.status !== "cancelled";

          const noteObj = notesBySessionId.get(String(s._id));
          const attachedNote = noteObj
            ? {
                id: String(noteObj._id),
                title: (noteObj.title as string) || "Session Notes",
                content: (noteObj.content as string) || "",
                fileUrl: (noteObj.fileUrl as string) || undefined,
                fileName: (noteObj.fileName as string) || undefined,
                fileType: (noteObj.fileType as string) || undefined,
                fileSize: (noteObj.fileSize as number) || undefined,
              }
            : undefined;

          initialSessions.push({
            id: String(s._id),
            menteeId: s.menteeId ? String(menteeObj?._id || s.menteeId) : null,
            menteeName,
            menteeMajor,
            menteeAvatarUrl,
            title: s.title,
            date: s.date.toISOString(),
            time: s.time,
            durationMinutes: s.durationMinutes || 45,
            location: s.location || "https://meet.alma.edu/session",
            status: s.status || "scheduled",
            isCohort,
            attachedNote,
            editCutoffTime,
            canEditMaterials,
          });
        }

        // 3. Query all new MentorSession records for this mentor
        const rawMentorSessions = await MentorSession.find({
          mentorId,
        })
          .populate("menteeIds", "name studentProfile email avatarUrl")
          .sort({ startTime: 1 })
          .lean();

        for (const ms of rawMentorSessions) {
          const alreadyIncluded = initialSessions.some(
            (existing) =>
              (ms.meetingLink && existing.location === ms.meetingLink) ||
              existing.id === String(ms._id)
          );
          if (alreadyIncluded) continue;

          const isCohort = ms.menteeIds.length > 1 || ms.menteeIds.length === 0;
          const firstMentee =
            Array.isArray(ms.menteeIds) && ms.menteeIds.length > 0
              ? (ms.menteeIds[0] as unknown as Record<string, unknown>)
              : null;
          const embeddedSp = (firstMentee?.studentProfile || {}) as Record<string, unknown>;
          const addCount = ms.menteeIds.length - 1;
          const firstMenteeName = (firstMentee?.name as string) || "Mentee";

          const msCutoffMs = ms.endTime.getTime() + ONE_HOUR_MS;
          const canEditMaterials = nowMs <= msCutoffMs && ms.status !== "cancelled";

          initialSessions.push({
            id: String(ms._id),
            menteeId: firstMentee ? String(firstMentee._id) : null,
            menteeName: isCohort
              ? `All Active Mentees (${ms.menteeIds.length} Mentees)`
              : addCount > 0
              ? `${firstMenteeName} (+${addCount} more)`
              : firstMenteeName,
            menteeMajor: isCohort
              ? "Cohort Mentoring"
              : ((embeddedSp.major as string) || "Alma Mentee"),
            menteeAvatarUrl: isCohort
              ? undefined
              : ((firstMentee?.avatarUrl as string) || (embeddedSp.avatarUrl as string | undefined)),
            title: ms.topic || (isCohort ? "Cohort Mentoring Session" : "1:1 Mentoring Consultation"),
            date: ms.startTime.toISOString(),
            time: ms.startTime.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            durationMinutes: ms.durationMinutes,
            location: ms.meetingLink,
            status: ms.status,
            isCohort,
            editCutoffTime: new Date(msCutoffMs).toISOString(),
            canEditMaterials,
          });
        }

        // Sort combined sessions by date ascending
        initialSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    }
  } catch (err) {
    console.error("Error loading mentor sessions page:", err);
  }

  if (!mentorId) {
    redirect("/login");
  }

  return (
    <MentorSessionsView
      initialSessions={initialSessions}
      activeMentees={activeMentees}
      mentorId={mentorId}
    />
  );
}
