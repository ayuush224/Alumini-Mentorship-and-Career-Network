import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import {
  Users,
  ArrowRight,
  Compass,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
} from "lucide-react";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { MentorProfile } from "@/lib/models/User";
import { Mentorship, MentorshipRequest, Session } from "@/lib/models/Mentorship";
import { SharedNote } from "@/lib/models/Communication";
import { Action } from "@/lib/models/Tasks";
import {
  StudentMentorshipHubView,
  ActiveMentorshipData,
} from "./_components/student-mentorship-hub-view";


export const metadata = {
  title: "My Mentorship | Alma",
  description: "Track your active mentorship milestones, timeline, shared notes, and live chat.",
};

export default async function StudentMentorshipPage() {
  await connectDB();

  let studentId: string | null = null;
  let activeMentorships: ActiveMentorshipData[] = [];

  interface PendingRequestItem {
    id: string;
    mentorName: string;
    mentorCompany: string;
    mentorRole: string;
    requestedAt: string;
    message?: string;
  }

  let pendingRequests: PendingRequestItem[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        studentId = payload.sub;
        const currentStudentId = payload.sub;

        const studentObjectId = mongoose.Types.ObjectId.isValid(currentStudentId)
          ? new mongoose.Types.ObjectId(currentStudentId)
          : null;

        // 1. Fetch ALL active mentorships for this student
        const mentorshipDocs = await Mentorship.find({
          studentId: studentObjectId || currentStudentId,
          status: "active",
          isDeleted: { $ne: true },
        })
          .populate("mentorId")
          .sort({ startDate: -1 })
          .lean();

        if (mentorshipDocs && mentorshipDocs.length > 0) {
          const activeMentorIds = mentorshipDocs
            .map((doc) => {
              const mentorUser = doc.mentorId as unknown as Record<string, unknown> | null;
              return mentorUser?._id ? String(mentorUser._id) : null;
            })
            .filter(Boolean) as string[];

          const standaloneProfiles =
            activeMentorIds.length > 0
              ? await MentorProfile.find({ userId: { $in: activeMentorIds } }).lean()
              : [];
          const profileMap = new Map<string, Record<string, unknown>>(
            standaloneProfiles.map((p) => [String(p.userId), p as unknown as Record<string, unknown>])
          );

          activeMentorships = await Promise.all(
            mentorshipDocs.map(async (doc) => {
              const mentorUser = doc.mentorId as unknown as Record<string, unknown> | null;
              const mentorUserId = mentorUser?._id ? String(mentorUser._id) : "";
              const mentorObjectId = mongoose.Types.ObjectId.isValid(mentorUserId)
                ? new mongoose.Types.ObjectId(mentorUserId)
                : null;

              let mp = (mentorUser?.mentorProfile || {}) as Record<string, unknown>;

              if (mentorUserId) {
                const standaloneMp = profileMap.get(mentorUserId);
                if (standaloneMp) mp = standaloneMp;
              }

              const startDateObj = doc.startDate ? new Date(doc.startDate) : new Date();
              const formattedStartDate = !isNaN(startDateObj.getTime())
                ? startDateObj.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Active Mentorship";

              // 1. Shared Notes Sub-query (Defensively isolated)
              const sharedNotes: Array<{
                id: string;
                title: string;
                content: string;
                createdAt: string;
                fileUrl?: string;
                fileName?: string;
                fileType?: string;
                fileSize?: number;
                sessionId?: string;
              }> = [];

              const rawNotesForSessionLookup: Array<Record<string, unknown>> = [];

              if (mentorObjectId || mentorUserId) {
                try {
                  const rawNotes = await SharedNote.find({
                    mentorId: mentorObjectId || mentorUserId,
                    createdAt: { $gte: isNaN(startDateObj.getTime()) ? new Date(0) : startDateObj },
                    $or: [
                      ...(studentObjectId ? [{ menteeId: studentObjectId }] : []),
                      { menteeId: currentStudentId },
                      { isAllMentees: true },
                      { menteeId: null, isAllMentees: { $ne: false } },
                      { menteeId: { $exists: false } },
                    ],
                  })
                    .sort({ createdAt: -1 })
                    .lean();

                  for (const n of rawNotes) {
                    rawNotesForSessionLookup.push(n as unknown as Record<string, unknown>);
                    const noteCreated = n.createdAt ? new Date(n.createdAt) : new Date();
                    sharedNotes.push({
                      id: String(n._id),
                      title: n.title || "Shared Note",
                      content: n.content || "",
                      createdAt: !isNaN(noteCreated.getTime()) ? noteCreated.toISOString() : new Date().toISOString(),
                      fileUrl: (n.fileUrl as string) || undefined,
                      fileName: (n.fileName as string) || undefined,
                      fileType: (n.fileType as string) || undefined,
                      fileSize: (n.fileSize as number) || undefined,
                      sessionId: n.sessionId ? String(n.sessionId) : undefined,
                    });
                  }
                } catch (notesErr) {
                  console.warn("Could not load shared notes for mentor:", mentorUserId, notesErr);
                }
              }

              // Index notes by sessionId in memory (Zero .populate dependency)
              const notesBySessionId = new Map<string, Record<string, unknown>>();
              for (const rn of rawNotesForSessionLookup) {
                if (rn.sessionId) {
                  notesBySessionId.set(String(rn.sessionId), rn);
                }
              }

              // 2. Previous & Upcoming Sessions Sub-query (Defensively isolated)
              let sessions: Array<{
                id: string;
                title: string;
                date: string;
                rawDate: string;
                time: string;
                durationMinutes: number;
                location?: string | null;
                status: "scheduled" | "completed" | "cancelled";
                isCohort?: boolean;
                attachedNote?: {
                  id: string;
                  title: string;
                  fileUrl?: string;
                  fileName?: string;
                  fileType?: string;
                  fileSize?: number;
                };
              }> = [];

              if (mentorObjectId || mentorUserId) {
                try {
                  const rawSessions = await Session.find({
                    mentorId: mentorObjectId || mentorUserId,
                    $or: [
                      ...(studentObjectId ? [{ menteeId: studentObjectId }] : []),
                      { menteeId: currentStudentId },
                      { isAllMentees: true },
                    ],
                    isDeleted: { $ne: true },
                  })
                    .sort({ date: -1 })
                    .lean();

                  const nowTime = Date.now();
                  sessions = rawSessions.map((s) => {
                    const sessionDate = s.date ? new Date(s.date) : new Date();
                    const isCohort = Boolean(s.isAllMentees);
                    const noteObj = notesBySessionId.get(String(s._id));

                    // 15-Minute Link Gating Rule (Invariant 2)
                    let startMs = !isNaN(sessionDate.getTime()) ? sessionDate.getTime() : nowTime;
                    if (s.time) {
                      const match = s.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                      if (match) {
                        let hh = parseInt(match[1], 10);
                        const mm = parseInt(match[2], 10);
                        const ampm = match[3]?.toUpperCase();
                        if (ampm === "PM" && hh < 12) hh += 12;
                        if (ampm === "AM" && hh === 12) hh = 0;
                        const d = new Date(sessionDate);
                        d.setHours(hh, mm, 0, 0);
                        startMs = d.getTime();
                      }
                    }
                    const isLinkAvailable = nowTime >= startMs - 15 * 60 * 1000;

                    return {
                      id: String(s._id),
                      title: s.title || "Mentoring Session",
                      date: !isNaN(sessionDate.getTime())
                        ? sessionDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Scheduled Session",
                      rawDate: !isNaN(sessionDate.getTime()) ? sessionDate.toISOString() : new Date().toISOString(),
                      time: s.time || "12:00 PM",
                      durationMinutes: s.durationMinutes || 45,
                      location: isLinkAvailable ? s.location : null,
                      status: (s.status || "scheduled") as "scheduled" | "completed" | "cancelled",
                      isCohort,
                      attachedNote: noteObj
                        ? {
                            id: String(noteObj._id),
                            title: (noteObj.title as string) || "Session Notes",
                            fileUrl: (noteObj.fileUrl as string) || undefined,
                            fileName: (noteObj.fileName as string) || undefined,
                            fileType: (noteObj.fileType as string) || undefined,
                            fileSize: (noteObj.fileSize as number) || undefined,
                          }
                        : undefined,
                    };
                  });
                } catch (sessionsErr) {
                  console.warn("Could not load sessions for mentor:", mentorUserId, sessionsErr);
                }
              }

              // 3. Task Timeline Sub-query (Defensively isolated)
              let completedTasks: Array<{
                id: string;
                title: string;
                completedAt?: string;
                addedBy: string;
              }> = [];

              let activeTasks: Array<{
                id: string;
                title: string;
                dueDate?: string;
                addedBy: string;
              }> = [];

              try {
                const mentorQueryConditions: Array<Record<string, unknown>> = [];
                if (mentorObjectId) {
                  mentorQueryConditions.push({ mentorId: mentorObjectId });
                }
                if (doc._id && mongoose.Types.ObjectId.isValid(String(doc._id))) {
                  mentorQueryConditions.push({ mentorshipId: new mongoose.Types.ObjectId(String(doc._id)) });
                }

                const rawCompletedTasks = await Action.find({
                  studentId: studentObjectId || currentStudentId,
                  ...(mentorQueryConditions.length > 0 ? { $or: mentorQueryConditions } : { mentorId: null }),
                  completed: true,
                  isDeleted: { $ne: true },
                })
                  .sort({ completedAt: -1, createdAt: -1 })
                  .lean();

                const rawActiveTasks = await Action.find({
                  studentId: studentObjectId || currentStudentId,
                  ...(mentorQueryConditions.length > 0 ? { $or: mentorQueryConditions } : { mentorId: null }),
                  completed: false,
                  isDeleted: { $ne: true },
                })
                  .sort({ dueDate: 1 })
                  .lean();

                completedTasks = rawCompletedTasks.map((t) => ({
                  id: String(t._id),
                  title: t.title || "Task Item",
                  completedAt: t.completedAt
                    ? new Date(t.completedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : undefined,
                  addedBy: t.addedBy || "mentor",
                }));

                activeTasks = rawActiveTasks.map((t) => ({
                  id: String(t._id),
                  title: t.title || "Task Item",
                  dueDate: t.dueDate
                    ? new Date(t.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : undefined,
                  addedBy: t.addedBy || "mentor",
                }));
              } catch (tasksErr) {
                console.warn("Could not load tasks for mentor:", mentorUserId, tasksErr);
              }

              return {
                mentorshipId: String(doc._id),
                mentorId: mentorUserId,
                mentorName: (mentorUser?.name as string) || "Alumni Mentor",
                mentorCompany: (mp?.company as string) || "Partner Organization",
                mentorRole: (mp?.jobTitle as string) || "Alumni Mentor",
                mentorAvatarUrl:
                  (mp?.avatarUrl as string) ||
                  ((mentorUser?.mentorProfile as Record<string, unknown> | undefined)?.avatarUrl as string | undefined),
                startDate: formattedStartDate,
                sharedNotes,
                completedTasks,
                activeTasks,
                sessions,
              };
            })
          );
        } else {
          // 2. If no active mentorship, check for pending mentorship requests
          const rawPending = await MentorshipRequest.find({
            studentId,
            status: "pending",
          })
            .populate("mentorId")
            .sort({ createdAt: -1 })
            .lean();

          if (rawPending && rawPending.length > 0) {
            const pendingMentorIds = rawPending
              .map((doc) => {
                const mentorUser = doc.mentorId as unknown as Record<string, unknown> | null;
                return mentorUser?._id ? String(mentorUser._id) : null;
              })
              .filter(Boolean) as string[];

            const pendingProfiles =
              pendingMentorIds.length > 0
                ? await MentorProfile.find({ userId: { $in: pendingMentorIds } }).lean()
                : [];
            const pendingProfileMap = new Map<string, Record<string, unknown>>(
              pendingProfiles.map((p) => [String(p.userId), p as unknown as Record<string, unknown>])
            );

            pendingRequests = rawPending.map((doc) => {
              const mentorUser = doc.mentorId as unknown as Record<string, unknown> | null;
              const mentorId = mentorUser?._id ? String(mentorUser._id) : "";
              let mp = (mentorUser?.mentorProfile || {}) as Record<string, unknown>;

              if (mentorId) {
                const standaloneMp = pendingProfileMap.get(mentorId);
                if (standaloneMp) mp = standaloneMp;
              }

              return {
                id: String(doc._id),
                mentorName: (mentorUser?.name as string) || "Alumni Mentor",
                mentorCompany: (mp?.company as string) || "Partner Organization",
                mentorRole: (mp?.jobTitle as string) || "Alumni Mentor",
                requestedAt: new Date(doc.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
                message: doc.message || undefined,
              };
            });
          }
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Error reading mentorship page:", err);
  }

  if (!studentId) {
    redirect("/login");
  }

  // Active mentorship view with Dropdown Context Switcher, Shared Notes, & Task Timeline
  if (activeMentorships.length > 0) {
    return <StudentMentorshipHubView mentorships={activeMentorships} />;
  }

  // Enhanced, centered empty state with 3-step guidance pathway
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-8">
      {/* =====================================================================
          MAIN HERO CARD
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-8 sm:p-12 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] flex items-center justify-center mb-4 shadow-2xs">
          <Users className="w-7 h-7" />
        </div>

        <span className="block text-center uppercase tracking-widest text-[10px] sm:text-[11px] font-semibold text-[#2563EB] font-mono mb-2">
          1-ON-1 CAREER GUIDANCE
        </span>

        <h1
          className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-stone-900 tracking-tight [text-wrap:balance] max-w-xl w-full mx-auto mb-3 leading-tight"
          style={{ textAlign: "center" }}
        >
          No Active Mentorship Pairing
        </h1>

        <p
          className="text-center text-xs sm:text-sm text-stone-500 [text-wrap:balance] max-w-lg w-full mx-auto leading-relaxed mb-8"
          style={{ textAlign: "center" }}
        >
          You are not currently paired with an alumni mentor. Explore our verified alumni directory to discover mentors matched to your career focus.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <Link
            href="/student/mentors"
            prefetch={true}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all hover:shadow-md"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Alumni Mentors</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/student/dashboard"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-medium transition-colors text-center"
          >
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </section>

      {/* =====================================================================
          PENDING REQUESTS (IF ANY AWAITING RESPONSE)
      ====================================================================== */}
      {pendingRequests.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-stone-900">
                  Pending Introduction Requests
                </h2>
                <p className="text-[11px] text-stone-500">
                  Awaiting mentor response. Mentors usually reply within 2â€“3 business days.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-semibold">
              {pendingRequests.length} Pending
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{req.mentorName}</h3>
                  <p className="text-xs text-stone-600">
                    {req.mentorRole} &bull; {req.mentorCompany}
                  </p>
                  {req.message && (
                    <p className="text-xs text-stone-500 mt-1.5 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100 max-w-xl">
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <span className="text-[11px] font-mono text-stone-400">
                    Requested on {req.requestedAt}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-medium border border-stone-200">
                    Under Review
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          THREE-STEP PATHWAY GUIDE
      ====================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">
              1. Discover &amp; Match
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Filter verified alumni by industry, graduation year, target roles, and algorithmic match scores tailored to your profile.
            </p>
          </div>
          <Link
            href="/student/mentors"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4"
          >
            <span>Explore directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">
              2. Request an Intro
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Send a tailored note outlining your career milestones, resume focus, or topics you want guidance on.
            </p>
          </div>
          <span className="text-xs font-medium text-stone-400 mt-4 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Throttled to prevent spam</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">
              3. Track &amp; Progress
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Once matched, this workspace unlocks shared 1-on-1 agendas, mutual action items, and real-time reputation points.
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-600 mt-4 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>+20 pts per completed task</span>
          </span>
        </div>
      </section>

      {/* =====================================================================
          PRIVACY & REASSURANCE FOOTER STRIP
      ====================================================================== */}
      <div className="p-4 rounded-2xl bg-stone-100/80 border border-stone-200/80 flex items-center justify-between text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Verified Alumni Network:</strong> All mentors hold verified university credentials. Personal contact details remain strictly shielded.
          </span>
        </div>
        <Link
          href="/student/mentors"
          className="text-xs font-semibold text-[#2563EB] hover:underline shrink-0 ml-4 hidden sm:inline"
        >
          Find a Mentor &rarr;
        </Link>
      </div>
    </div>
  );
}
