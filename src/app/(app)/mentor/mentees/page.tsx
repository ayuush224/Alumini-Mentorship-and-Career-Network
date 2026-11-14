import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Mentorship, Session } from "@/lib/models/Mentorship";
import { Action } from "@/lib/models/Tasks";
import { SharedNote } from "@/lib/models/Communication";
import { StudentProfile } from "@/lib/models/User";
import {
  MentorMenteesView,
  ActiveMenteeItem,
} from "./_components/mentor-mentees-view";
import { MenteeReportData } from "./_components/mentee-report-modal";
import { StudentCareerProfileViewData } from "@/actions/profile";


export const metadata = {
  title: "Your Mentees | Alma",
  description: "Manage your active student mentorships, assign tasks, and review career dossiers.",
};

interface RawExperienceItem {
  role?: string;
  company?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  current?: boolean;
  description?: string;
}

function normalizeExperience(rawExpList?: unknown[]) {
  if (!Array.isArray(rawExpList)) return [];
  return (rawExpList as RawExperienceItem[]).map((exp) => ({
    role: String(exp.role || ""),
    company: String(exp.company || ""),
    startDate: exp.startDate instanceof Date ? exp.startDate.toISOString() : (exp.startDate ? String(exp.startDate) : undefined),
    endDate: exp.endDate instanceof Date ? exp.endDate.toISOString() : (exp.endDate ? String(exp.endDate) : undefined),
    current: Boolean(exp.current),
    description: exp.description ? String(exp.description) : undefined,
  }));
}

export default async function MentorMenteesPage() {
  await connectDB();

  let mentorId = "";
  const menteesList: ActiveMenteeItem[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        mentorId = payload.sub;

        const rawMentorships = await Mentorship.find({
          mentorId,
          status: "active",
          isDeleted: { $ne: true },
        })
          .sort({ startDate: -1 })
          .populate("studentId", "name email studentProfile avatarUrl")
          .lean();

        // Collect all active mentee IDs to query tasks, sessions, and profiles in batch
        const menteeUserIds = rawMentorships
          .map((m) => {
            const studentObj = m.studentId as unknown as Record<string, unknown> | null;
            return studentObj?._id ? String(studentObj._id) : null;
          })
          .filter(Boolean) as string[];

        // Batch fetch standalone StudentProfiles in 1 query (Eradicating N+1 loop)
        const menteeProfiles =
          menteeUserIds.length > 0
            ? await StudentProfile.find({ userId: { $in: menteeUserIds } }).lean()
            : [];
        const menteeProfileMap = new Map<string, Record<string, unknown>>(
          menteeProfiles.map((p) => [String(p.userId), p as unknown as Record<string, unknown>])
        );

        // 1. Fetch strictly tasks assigned by THIS mentor to these mentees
        const rawTasks =
          menteeUserIds.length > 0
            ? await Action.find({
                mentorId: new mongoose.Types.ObjectId(mentorId),
                studentId: {
                  $in: menteeUserIds.map((id) => new mongoose.Types.ObjectId(id)),
                },
                isDeleted: { $ne: true },
              })
                .sort({ createdAt: -1 })
                .lean()
            : [];

        // 2. Fetch strictly personal & cohort sessions held by THIS mentor
        const rawSessions =
          menteeUserIds.length > 0
            ? await Session.find({
                mentorId: new mongoose.Types.ObjectId(mentorId),
                $or: [
                  {
                    menteeId: {
                      $in: menteeUserIds.map((id) => new mongoose.Types.ObjectId(id)),
                    },
                  },
                  { isAllMentees: true },
                ],
                isDeleted: { $ne: true },
              })
                .sort({ date: -1 })
                .lean()
            : [];

        // 3. Fetch shared notes/materials for these sessions
        const sessionIds = rawSessions.map((s) => s._id);
        const rawNotes =
          sessionIds.length > 0
            ? await SharedNote.find({
                mentorId: new mongoose.Types.ObjectId(mentorId),
                sessionId: { $in: sessionIds },
              }).lean()
            : [];

        const notesBySessionId = new Map<string, Record<string, unknown>>();
        for (const n of rawNotes) {
          if (n.sessionId) {
            notesBySessionId.set(
              String(n.sessionId),
              n as unknown as Record<string, unknown>
            );
          }
        }

        for (const m of rawMentorships) {
          const studentObj = m.studentId as unknown as Record<string, unknown> | null;
          if (studentObj && studentObj._id) {
            const studentUserId = String(studentObj._id);
            const embedded = (studentObj.studentProfile || {}) as Record<string, unknown>;

            let avatarUrl = (studentObj.avatarUrl as string) || (embedded.avatarUrl as string | undefined);
            let bannerUrl = embedded.bannerUrl as string | undefined;
            let major = (embedded.major as string) || "Computer Science";
            let bio = embedded.bio as string | undefined;
            let graduationYear = (embedded.graduationYear as number) || (new Date().getFullYear() + 2);
            let cgpa = embedded.cgpa as number | undefined;
            let totalPoints = (embedded.totalPoints as number) || 0;
            let skills: string[] = (embedded.skills as string[]) || [];
            let projects = (embedded.projects as Array<{
              title: string;
              description?: string;
              liveLink?: string;
              githubLink?: string;
              techStack: string[];
            }>) || [];
            let experience = normalizeExperience(embedded.experience as unknown[]);
            let targetIndustries: string[] = (embedded.targetIndustries as string[]) || [];
            let skillsToDevelop: string[] = (embedded.skillsToDevelop as string[]) || [];
            let codingProfiles = (embedded.codingProfiles as StudentCareerProfileViewData["codingProfiles"]) || [];
            let socialLinks = (embedded.socialLinks as StudentCareerProfileViewData["socialLinks"]) || [];
            let otherLinks = (embedded.otherLinks as StudentCareerProfileViewData["otherLinks"]) || [];

            // Lookup standalone StudentProfile from batched map
            const sp = menteeProfileMap.get(studentUserId) || null;
            if (sp) {
              avatarUrl = (sp.avatarUrl as string) || avatarUrl;
              bannerUrl = (sp.bannerUrl as string) || bannerUrl;
              major = (sp.major as string) || major;
              bio = (sp.bio as string) || bio;
              graduationYear = (sp.graduationYear as number) || graduationYear;
              cgpa = (sp.cgpa as number) || cgpa;
              totalPoints = (sp.totalPoints as number) || totalPoints;
              skills = (sp.skills as string[]) || skills;
              projects = (sp.projects as typeof projects) || projects;
              if (Array.isArray(sp.experience)) {
                experience = normalizeExperience(sp.experience as unknown[]);
              }
              targetIndustries = (sp.targetIndustries as string[]) || targetIndustries;
              skillsToDevelop = (sp.skillsToDevelop as string[]) || skillsToDevelop;
              codingProfiles = (sp.codingProfiles as typeof codingProfiles) || codingProfiles;
              socialLinks = (sp.socialLinks as typeof socialLinks) || socialLinks;
              otherLinks = (sp.otherLinks as typeof otherLinks) || otherLinks;
            }

            // Filter strictly tasks assigned by THIS mentor to THIS mentee
            const studentTasks = rawTasks
              .filter((t) => String(t.studentId) === studentUserId)
              .map((t) => ({
                id: String(t._id),
                title: t.title,
                dueDate: t.dueDate
                  ? new Date(t.dueDate).toISOString()
                  : new Date().toISOString(),
                completed: Boolean(t.completed),
                completedAt: t.completedAt
                  ? new Date(t.completedAt).toISOString()
                  : undefined,
                pointsAwarded: Boolean(t.pointsAwarded),
              }));

            // Filter strictly sessions between THIS mentor and THIS mentee
            const studentSessions = rawSessions
              .filter(
                (s) =>
                  Boolean(s.isAllMentees) || String(s.menteeId) === studentUserId
              )
              .map((s) => {
                const noteObj = notesBySessionId.get(String(s._id));
                return {
                  id: String(s._id),
                  title: s.title || "Mentoring Session",
                  date: s.date
                    ? new Date(s.date).toISOString()
                    : new Date().toISOString(),
                  time: s.time || "12:00 PM",
                  durationMinutes: s.durationMinutes || 45,
                  status: (s.status || "scheduled") as
                    | "scheduled"
                    | "completed"
                    | "cancelled",
                  isCohort: Boolean(s.isAllMentees),
                  location: s.location || undefined,
                  attachedNote: noteObj
                    ? {
                        id: String(noteObj._id),
                        title: (noteObj.title as string) || "Session Notes",
                        fileName: (noteObj.fileName as string) || undefined,
                        fileType: (noteObj.fileType as string) || undefined,
                        fileUrl: (noteObj.fileUrl as string) || undefined,
                        fileSize: (noteObj.fileSize as number) || undefined,
                      }
                    : undefined,
                };
              });

            const totalTasks = studentTasks.length;
            const completedTasks = studentTasks.filter((t) => t.completed).length;
            const pendingTasks = totalTasks - completedTasks;
            const completionRate =
              totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            const totalSessions = studentSessions.length;
            const completedSessions = studentSessions.filter(
              (s) => s.status === "completed"
            ).length;
            const scheduledSessions = studentSessions.filter(
              (s) => s.status === "scheduled"
            ).length;
            const totalMinutesMentored = studentSessions
              .filter((s) => s.status === "completed")
              .reduce((sum, s) => sum + (s.durationMinutes || 45), 0);

            const report: MenteeReportData = {
              totalTasks,
              completedTasks,
              pendingTasks,
              completionRate,
              tasks: studentTasks,
              totalSessions,
              completedSessions,
              scheduledSessions,
              totalMinutesMentored,
              sessions: studentSessions,
            };

            menteesList.push({
              id: studentUserId,
              mentorshipId: String(m._id),
              name: (studentObj.name as string) || "Student Mentee",
              email: studentObj.email as string | undefined,
              avatarUrl,
              major,
              graduationYear,
              startDate: m.startDate ? new Date(m.startDate).toISOString() : new Date().toISOString(),
              careerProfile: {
                studentId: studentUserId,
                name: (studentObj.name as string) || "Student Mentee",
                avatarUrl,
                bannerUrl,
                bio,
                major,
                graduationYear,
                cgpa,
                totalPoints,
                skills,
                projects,
                experience,
                targetIndustries,
                skillsToDevelop,
                codingProfiles,
                socialLinks,
                otherLinks,
              },
              report,
            });
          }
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error loading mentor mentees page:", err);
  }

  if (!mentorId) {
    redirect("/login");
  }

  return <MentorMenteesView mentees={menteesList} />;
}
