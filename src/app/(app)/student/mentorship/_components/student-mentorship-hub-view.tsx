"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  MessageSquare,
  FileText,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Calendar,
  Clock,
  Video,
  Download,
  ExternalLink,
  X,
  Copy,
  Check,
} from "lucide-react";
import {
  getFileTypeInfo,
  getAttachmentDownloadUrl,
  getAttachmentViewUrl,
  formatAttachmentBytes,
} from "@/lib/chat-attachments";

export interface MentorshipSessionItem {
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
}

export interface MentorshipSharedNoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  sessionId?: string;
}

export interface ActiveMentorshipData {
  mentorshipId: string;
  mentorId: string;
  mentorName: string;
  mentorRole: string;
  mentorCompany: string;
  mentorAvatarUrl?: string;
  startDate: string;
  sharedNotes: MentorshipSharedNoteItem[];
  completedTasks: Array<{
    id: string;
    title: string;
    completedAt?: string;
    addedBy: string;
  }>;
  activeTasks?: Array<{
    id: string;
    title: string;
    dueDate?: string;
    addedBy: string;
  }>;
  sessions: MentorshipSessionItem[];
}

interface StudentMentorshipHubViewProps {
  mentorships: ActiveMentorshipData[];
}

export function StudentMentorshipHubView({ mentorships }: StudentMentorshipHubViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "timeline" | "sessions">("overview");
  const [sessionFilter, setSessionFilter] = useState<"all" | "completed" | "scheduled">("all");
  const [viewingNote, setViewingNote] = useState<MentorshipSharedNoteItem | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const current = mentorships[selectedIdx] || mentorships[0];

  const handleDownloadTextNote = (note: MentorshipSharedNoteItem) => {
    const textContent = `${note.title}\nAuthored by: ${current?.mentorName || "Mentor"}\nDate: ${new Date(note.createdAt).toLocaleDateString()}\n\n${note.content || ""}`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(note.title || "note").replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyNoteContent = async (note: MentorshipSharedNoteItem) => {
    try {
      await navigator.clipboard.writeText(note.content || note.title);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2500);
    } catch {
      // Fallback
    }
  };

  if (!current) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-2xs border border-primary-200">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-heading">
            No Active Mentorship Pairing
          </h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            You do not currently have an active alumni mentorship workspace. Explore our verified alumni directory to discover a mentor aligned with your career goals.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/student/mentors"
            prefetch={true}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all hover:shadow-md"
          >
            <span>Discover Alumni Mentors</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const initials = current.mentorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* =====================================================================
          HEADER HERO WITH MENTOR SWITCHER & REAL-TIME CHAT CTA
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-stone-100">
          <div className="flex items-center gap-4">
            {current.mentorAvatarUrl ? (
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-stone-200 shadow-2xs">
                <Image
                  src={current.mentorAvatarUrl}
                  alt={current.mentorName}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary-600/10 border border-primary-600/20 text-primary-600 font-bold text-lg flex items-center justify-center shadow-2xs">
                {initials}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="uppercase tracking-widest text-[10px] font-semibold text-primary-600 font-mono">
                  ACTIVE MENTORSHIP
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Alumnus
                </span>
              </div>

              {/* Context Switcher Dropdown (if multiple mentors) */}
              {mentorships.length > 1 ? (
                <div className="relative inline-block mt-1">
                  <select
                    value={selectedIdx}
                    onChange={(e) => setSelectedIdx(Number(e.target.value))}
                    className="appearance-none bg-stone-50 border border-stone-200 rounded-xl py-1.5 pl-3 pr-8 text-base font-bold font-serif text-stone-900 focus:outline-hidden focus:border-primary-600 cursor-pointer"
                  >
                    {mentorships.map((m, idx) => (
                      <option key={m.mentorshipId} value={idx}>
                        {m.mentorName} ({m.mentorCompany})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 mt-0.5">
                  {current.mentorName}
                </h1>
              )}

              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                {current.mentorRole} &bull; <strong className="text-stone-700 font-semibold">{current.mentorCompany}</strong>
              </p>
            </div>
          </div>

          {/* Primary CTA: Launch Full-Screen Chat Room */}
          <div className="flex items-center gap-3">
            <Link
              href={`/student/mentorship/${current.mentorId}/chat`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Launch Live Chat</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </Link>
          </div>
        </div>

        {/* Quick Relationship Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Paired Date</p>
            <p className="text-sm font-bold text-stone-900 mt-1">{current.startDate}</p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Sessions Held</p>
            <p className="text-sm font-bold text-stone-900 mt-1">{(current.sessions || []).length} sessions</p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Shared Notes</p>
            <p className="text-sm font-bold text-stone-900 mt-1">{current.sharedNotes.length} notes</p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Milestones Done</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">
              {current.completedTasks.length} {current.completedTasks.length === 1 ? "task" : "tasks"}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          NAVIGATION TABS (OVERVIEW / SHARED NOTES / TASK TIMELINE / PREVIOUS SESSIONS)
      ====================================================================== */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === "overview"
              ? "border-primary-600 text-primary-600 bg-white shadow-2xs"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Workspace Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === "sessions"
              ? "border-primary-600 text-primary-600 bg-white shadow-2xs"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Previous Sessions ({(current.sessions || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === "notes"
              ? "border-primary-600 text-primary-600 bg-white shadow-2xs"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Shared Notes ({current.sharedNotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === "timeline"
              ? "border-primary-600 text-primary-600 bg-white shadow-2xs"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Task Timeline ({current.completedTasks.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB CONTENT PANELS
      ====================================================================== */}
      {/* 1. WORKSPACE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* 1-on-1 Mentorship Chat Launcher Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-600/10 via-primary-600/5 to-transparent border border-primary-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Direct 1-on-1 Mentorship Chat
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed max-w-md">
                  Talk personally with {current.mentorName} anytime. Discuss your career roadmaps, ask questions on resumes and interview prep, and get direct 1-on-1 advice.
                </p>
              </div>
              <Link
                href={`/student/mentorship/${current.mentorId}/chat`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
              >
                <span>Open Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Recent Shared Notes preview */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Recent Shared Notes</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("notes")}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  View all ({current.sharedNotes.length})
                </button>
              </div>

              {current.sharedNotes.length > 0 ? (
                <div className="space-y-3">
                  {current.sharedNotes.slice(0, 2).map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-100"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-stone-900">{note.title}</h4>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(note.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">
                  No notes shared yet since your mentorship started on {current.startDate}.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Timeline quick preview */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tasks from {current.mentorName}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className="text-xs font-semibold text-primary-600 hover:underline cursor-pointer"
                >
                  History
                </button>
              </div>

              {current.completedTasks.length > 0 || (current.activeTasks && current.activeTasks.length > 0) ? (
                <div className="space-y-3">
                  {current.completedTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold text-stone-800 line-clamp-1">
                          {task.title}
                        </p>
                      </div>
                      <p className="text-[10px] text-emerald-700 font-mono mt-1 pl-5">
                        Completed &bull; {task.completedAt || "Finished"}
                      </p>
                    </div>
                  ))}

                  {current.activeTasks && current.activeTasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 shrink-0" />
                        <p className="text-xs font-semibold text-stone-800 line-clamp-1">
                          {task.title}
                        </p>
                      </div>
                      <p className="text-[10px] text-amber-700 font-mono mt-1 pl-5">
                        In Progress &bull; Target: {task.dueDate || "Upcoming"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-6 text-center">
                  No tasks assigned yet by {current.mentorName}.
                </p>
              )}
            </div>

            <Link
              href="/student/dashboard"
              className="mt-6 w-full py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold text-center transition-colors block"
            >
              Go to Action Checklist
            </Link>
          </div>
        </div>
      )}

      {/* 2. SHARED NOTES FEED */}
      {activeTab === "notes" && (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Shared Guidance Notes from {current.mentorName}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Filtered strictly to notes authored after your pairing date ({current.startDate}).
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {current.sharedNotes.length} notes available
            </span>
          </div>

          {current.sharedNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {current.sharedNotes.map((note) => {
                const hasFile = Boolean(note.fileUrl);
                const fileInfo = getFileTypeInfo(note.fileName || undefined, note.fileType || undefined);
                const downloadUrl = note.fileUrl
                  ? getAttachmentDownloadUrl(note.fileUrl, note.fileName || undefined)
                  : "";
                const viewUrl = note.fileUrl
                  ? getAttachmentViewUrl(note.fileUrl, note.fileName || undefined)
                  : "";

                return (
                  <div
                    key={note.id}
                    className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between hover:border-stone-300 transition-colors shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-stone-900">{note.title}</h4>
                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                          {new Date(note.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {note.content && (
                        <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {note.content}
                        </p>
                      )}

                      {/* File Attachment Card if note has attached file */}
                      {hasFile && (
                        <div className="mt-3.5 p-3 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 overflow-hidden min-w-0">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-black tracking-wider ${fileInfo.badgeBg} ${fileInfo.badgeText}`}
                            >
                              {fileInfo.badge}
                            </div>
                            <div className="overflow-hidden min-w-0">
                              <p
                                className="text-xs font-bold text-stone-900 truncate leading-tight"
                                title={note.fileName || "Attachment"}
                              >
                                {note.fileName || "Attached Document"}
                              </p>
                              <p className="text-[10px] font-mono text-stone-400 mt-0.5 truncate">
                                {fileInfo.label} &bull; {formatAttachmentBytes(note.fileSize || undefined) || "File Ready"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors border border-stone-200/80 cursor-pointer"
                              title="See / View document in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>See</span>
                            </a>
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={note.fileName || "document"}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                              title="Download to computer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Action Bar if note has NO binary file attachment (Text-only note) */}
                      {!hasFile && (
                        <div className="mt-3.5 pt-2.5 border-t border-stone-200/50 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingNote(note)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors border border-stone-200/80 cursor-pointer"
                            title="See / Read note"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>See</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadTextNote(note)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                            title="Download note text"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-4 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                      <span>Authored by {current.mentorName}</span>
                      <span className="font-mono text-emerald-600 font-medium">
                        {note.sessionId ? "Session Materials" : "Workspace Note"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-semibold text-stone-700">No shared notes recorded yet</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {current.mentorName} hasn&apos;t published shared workspace notes since your mentorship started on {current.startDate}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. PREVIOUS SESSIONS FEED */}
      {activeTab === "sessions" && (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Mentoring Sessions with {current.mentorName}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Complete log of 1-on-1 consultations and group cohort workshops with this mentor.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-stone-100/80 p-1 rounded-xl self-start sm:self-center">
              {(["all", "completed", "scheduled"] as const).map((filterKey) => {
                const count =
                  filterKey === "all"
                    ? (current.sessions || []).length
                    : (current.sessions || []).filter((s) => s.status === filterKey).length;

                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setSessionFilter(filterKey)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      sessionFilter === filterKey
                        ? "bg-white text-stone-900 shadow-2xs"
                        : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    {filterKey} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const allSessions = current.sessions || [];
            const filtered =
              sessionFilter === "all"
                ? allSessions
                : allSessions.filter((s) => s.status === sessionFilter);

            if (filtered.length === 0) {
              return (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-stone-700">No sessions match this filter</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    {sessionFilter === "completed"
                      ? "No completed sessions have been recorded yet with this mentor."
                      : sessionFilter === "scheduled"
                      ? "No upcoming sessions currently on your schedule with this mentor."
                      : `You don't have any sessions scheduled with ${current.mentorName} yet.`}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filtered.map((sess) => {
                  const isCompleted = sess.status === "completed";
                  const isCancelled = sess.status === "cancelled";
                  const isScheduled = sess.status === "scheduled";

                  return (
                    <div
                      key={sess.id}
                      className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-stone-300 transition-colors flex flex-col gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${
                                sess.isCohort
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {sess.isCohort ? "Cohort Session (All Mentees)" : "1-on-1 Consultation"}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isCancelled
                                  ? "bg-stone-200 text-stone-600 border border-stone-300"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {isCompleted ? "Completed" : isCancelled ? "Cancelled" : "Scheduled"}
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-stone-900 pt-1">
                            {sess.title}
                          </h4>
                        </div>

                        {/* Date & Time pill */}
                        <div className="flex items-center gap-2.5 text-xs text-stone-600 font-mono bg-white px-3 py-1.5 rounded-xl border border-stone-200 self-start">
                          <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-primary-600" />
                            <span>{sess.date}</span>
                          </div>
                          <span className="text-stone-300">•</span>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{sess.time}</span>
                          </div>
                          <span className="text-stone-300">•</span>
                          <span className="text-stone-500 font-sans font-medium">{sess.durationMinutes}m</span>
                        </div>
                      </div>

                      {/* Attached Note / PDF Pill if available */}
                      {sess.attachedNote && (() => {
                        const fileInfo = getFileTypeInfo(
                          sess.attachedNote.fileName,
                          sess.attachedNote.fileType
                        );
                        const hasFile = Boolean(sess.attachedNote.fileUrl);

                        return (
                          <div className="p-3.5 rounded-xl bg-white border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-black tracking-wider ${
                                  hasFile
                                    ? `${fileInfo.badgeBg} ${fileInfo.badgeText}`
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {hasFile ? fileInfo.badge : "NOTE"}
                              </div>
                              <div className="overflow-hidden min-w-0">
                                <p className="text-xs font-bold text-stone-900 truncate">
                                  {sess.attachedNote.title}
                                </p>
                                <p className="text-[10px] font-mono text-stone-400 mt-0.5 truncate">
                                  {hasFile
                                    ? `${sess.attachedNote.fileName || "Preparation File"} • ${
                                        formatAttachmentBytes(sess.attachedNote.fileSize) || fileInfo.label
                                      }`
                                    : "Session Preparation Notes"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              {hasFile ? (
                                <>
                                  <a
                                    href={getAttachmentViewUrl(
                                      sess.attachedNote.fileUrl!,
                                      sess.attachedNote.fileName
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-200/80"
                                    title="Open / View document in new tab"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>See</span>
                                  </a>
                                  <a
                                    href={getAttachmentDownloadUrl(
                                      sess.attachedNote.fileUrl!,
                                      sess.attachedNote.fileName
                                    )}
                                    download={sess.attachedNote.fileName || "session_materials"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                    title="Download file to computer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchingNote = current.sharedNotes.find(
                                      (n) => n.sessionId === sess.id || n.id === sess.attachedNote?.id
                                    );
                                    if (matchingNote) setViewingNote(matchingNote);
                                    else {
                                      setViewingNote({
                                        id: sess.attachedNote!.id,
                                        title: sess.attachedNote!.title,
                                        content: `Notes for session: ${sess.title}`,
                                        createdAt: sess.rawDate,
                                      });
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-200/80"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>See</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Video Room link for scheduled session */}
                      {isScheduled && (
                        <div className="pt-2 border-t border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-stone-600">
                            <Video className="w-4 h-4 text-primary-600" />
                            {sess.location ? (
                              <span className="font-mono text-stone-700 truncate max-w-sm">
                                {sess.location}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic">
                                Video room link unlocks 15 minutes before start
                              </span>
                            )}
                          </div>

                          {sess.location && (
                            <a
                              href={sess.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs self-start sm:self-center transition-colors"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Video Room</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. TASK TIMELINE */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-stone-100">
            <h3 className="text-base font-bold text-stone-900">
              Milestones with {current.mentorName}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Ledger of milestones and action items assigned by {current.mentorName} for your mentorship.
            </p>
          </div>

          {current.completedTasks.length > 0 || (current.activeTasks && current.activeTasks.length > 0) ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {current.completedTasks.map((task) => (
                <div key={task.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs flex items-center justify-center" />

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                          {task.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Assigned by: <strong className="capitalize">{current.mentorName}</strong>
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                        COMPLETED (+20 PTS)
                      </span>
                    </div>
                    {task.completedAt && (
                      <div className="mt-2 text-[10px] font-mono text-stone-400">
                        Finished on: {task.completedAt}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {current.activeTasks && current.activeTasks.map((task) => (
                <div key={task.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-xs flex items-center justify-center" />

                  <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                          {task.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Assigned by: <strong className="capitalize">{current.mentorName}</strong>
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-semibold">
                        IN PROGRESS
                      </span>
                    </div>
                    {task.dueDate && (
                      <div className="mt-2 text-[10px] font-mono text-amber-600">
                        Target due: {task.dueDate}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-semibold text-stone-700">No tasks assigned yet</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Tasks assigned to you by {current.mentorName} will appear here along with your completion history.
              </p>
              <Link
                href="/student/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors mt-2"
              >
                <span>View Dashboard Actions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Note View / Reading Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-xl w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-primary-600">
                  {viewingNote.sessionId ? "Session Materials & Notes" : "Shared Workspace Note"}
                </span>
                <h3 className="text-lg font-bold font-serif text-stone-900 leading-tight">
                  {viewingNote.title}
                </h3>
                <p className="text-xs text-stone-400 font-mono">
                  Authored by {current.mentorName} &bull;{" "}
                  {new Date(viewingNote.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note text content */}
            <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
              {viewingNote.content ? (
                <p className="text-xs sm:text-sm text-stone-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {viewingNote.content}
                </p>
              ) : (
                <p className="text-xs text-stone-400 italic">
                  No additional text notes were attached.
                </p>
              )}
            </div>

            {/* Attached file if present in note */}
            {viewingNote.fileUrl && (() => {
              const fileInfo = getFileTypeInfo(viewingNote.fileName, viewingNote.fileType);
              const downloadUrl = getAttachmentDownloadUrl(viewingNote.fileUrl, viewingNote.fileName);
              const viewUrl = getAttachmentViewUrl(viewingNote.fileUrl, viewingNote.fileName);

              return (
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-black tracking-wider ${fileInfo.badgeBg} ${fileInfo.badgeText}`}
                    >
                      {fileInfo.badge}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {viewingNote.fileName || "Attached Document"}
                      </p>
                      <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                        {fileInfo.label} &bull; {formatAttachmentBytes(viewingNote.fileSize) || "File Ready"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors border border-stone-200 cursor-pointer flex items-center gap-1.5"
                      title="Open / View document in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>See</span>
                    </a>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={viewingNote.fileName || "document"}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                      title="Download to computer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* Modal actions */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyNoteContent(viewingNote)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedNoteId === viewingNote.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTextNote(viewingNote)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>Download .txt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
