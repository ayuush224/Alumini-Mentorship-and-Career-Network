"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Video,
  Award,
  FileText,
  ExternalLink,
  Download,
  Copy,
  Check,
  Plus,
  Briefcase,
  Target,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  getFileTypeInfo,
  getAttachmentViewUrl,
  getAttachmentDownloadUrl,
  formatAttachmentBytes,
} from "@/lib/chat-attachments";

export interface MenteeReportTaskItem {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  pointsAwarded?: boolean;
}

export interface MenteeReportSessionItem {
  id: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  isCohort: boolean;
  location?: string;
  attachedNote?: {
    id: string;
    title: string;
    fileName?: string;
    fileType?: string;
    fileUrl?: string;
    fileSize?: number;
  };
}

export interface MenteeReportData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number; // 0 to 100
  tasks: MenteeReportTaskItem[];
  totalSessions: number;
  completedSessions: number;
  scheduledSessions: number;
  totalMinutesMentored: number;
  sessions: MenteeReportSessionItem[];
}

export interface MenteeReportMentee {
  id: string;
  name: string;
  avatarUrl?: string;
  major?: string;
  graduationYear?: number;
  startDate: string;
  careerProfile?: {
    totalPoints?: number;
    targetIndustries?: string[];
    skillsToDevelop?: string[];
    skills?: string[];
    projects?: unknown[];
    experience?: unknown[];
  };
  report: MenteeReportData;
}

interface MenteeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentee: MenteeReportMentee | null;
  onOpenAddTask?: () => void;
}

export function MenteeReportModal({
  isOpen,
  onClose,
  mentee,
  onOpenAddTask,
}: MenteeReportModalProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "sessions" | "snapshot">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "completed" | "pending">("all");
  const [sessionFilter, setSessionFilter] = useState<"all" | "completed" | "scheduled">("all");
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mentee) return null;

  const { report } = mentee;
  const initials = mentee.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedPairedDate = new Date(mentee.startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const hoursMentored = (report.totalMinutesMentored / 60).toFixed(1);

  // Handle meeting link copy
  const handleCopyLink = (sessionId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSessionId(sessionId);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  // Filtered Tasks
  const filteredTasks = report.tasks.filter((t) => {
    if (taskFilter === "completed") return t.completed;
    if (taskFilter === "pending") return !t.completed;
    return true;
  });

  // Filtered Sessions
  const filteredSessions = report.sessions.filter((s) => {
    if (sessionFilter === "completed") return s.status === "completed";
    if (sessionFilter === "scheduled") return s.status === "scheduled";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        {/* ===================================================================
            MODAL HEADER & STUDENT PROFILE HERO
        ==================================================================== */}
        <div className="p-5 sm:p-6 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-[#2563EB]/10 text-[#2563EB] font-bold flex items-center justify-center text-sm border border-stone-200 shadow-2xs shrink-0">
                {mentee.avatarUrl ? (
                  <Image
                    src={mentee.avatarUrl}
                    alt={mentee.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif leading-tight truncate">
                    {mentee.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                    Mentee Report
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {mentee.major || "Computer Science"} &bull; Class of {mentee.graduationYear || 2026}
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Paired on {formattedPairedDate}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ===================================================================
              TOP KEY PERFORMANCE INDICATORS (KPIs)
          ==================================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {/* 1. Completeness Rate */}
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-stone-400">
                  Completion Rate
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-stone-900">
                  {report.completionRate}%
                </span>
              </div>
              {/* Visual Progress Bar */}
              <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    report.completionRate >= 75
                      ? "bg-emerald-500"
                      : report.completionRate >= 40
                      ? "bg-amber-500"
                      : "bg-[#2563EB]"
                  }`}
                  style={{ width: `${report.completionRate}%` }}
                />
              </div>
              <span className="text-[9px] text-stone-400 font-mono mt-1 block">
                {report.completedTasks} of {report.totalTasks} assigned tasks done
              </span>
            </div>

            {/* 2. Tasks Completed */}
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-stone-400">
                  Tasks Done
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-stone-900">
                  {report.completedTasks}
                </span>
                <span className="text-xs text-stone-400 font-mono">/ {report.totalTasks}</span>
              </div>
              <span className="text-[10px] text-amber-600 font-medium mt-1.5 block">
                {report.pendingTasks} in progress
              </span>
            </div>

            {/* 3. Personal Sessions */}
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-stone-400">
                  Sessions Held
                </span>
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-stone-900">
                  {report.totalSessions}
                </span>
                <span className="text-xs text-stone-400">held</span>
              </div>
              <span className="text-[10px] text-stone-500 mt-1.5 block">
                {report.completedSessions} done &bull; {report.scheduledSessions} upcoming
              </span>
            </div>

            {/* 4. Hours Mentored */}
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-stone-400">
                  Time Mentored
                </span>
                <Clock className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-stone-900">
                  {hoursMentored}
                </span>
                <span className="text-xs text-stone-400 font-mono">hrs</span>
              </div>
              <span className="text-[10px] text-stone-500 mt-1.5 block">
                Total consultation time
              </span>
            </div>
          </div>

          {/* ===================================================================
              INTERACTIVE TABS NAVIGATION
          ==================================================================== */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-200/70">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "tasks"
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Assigned Tasks ({report.tasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "sessions"
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Personal Sessions ({report.sessions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("snapshot")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "snapshot"
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Career Snapshot</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            MODAL SCROLLABLE BODY
        ==================================================================== */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: ASSIGNED TASKS */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {/* Filter Chips & Add Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="text-stone-400 text-[11px] font-mono mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      taskFilter === "all"
                        ? "bg-stone-900 text-white font-semibold"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    All ({report.tasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("completed")}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      taskFilter === "completed"
                        ? "bg-emerald-700 text-white font-semibold"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    Done ({report.completedTasks})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("pending")}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      taskFilter === "pending"
                        ? "bg-amber-600 text-white font-semibold"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    In Progress ({report.pendingTasks})
                  </button>
                </div>

                {onOpenAddTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddTask();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign New Task</span>
                  </button>
                )}
              </div>

              {/* Tasks List */}
              {filteredTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => {
                    const dueDateFormatted = new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const completedDateFormatted = task.completedAt
                      ? new Date(task.completedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : null;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          task.completed
                            ? "bg-emerald-50/40 border-emerald-200/70"
                            : "bg-stone-50 border-stone-200/90"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                                task.completed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {task.completed ? "COMPLETED" : "IN PROGRESS"}
                            </span>
                            {task.pointsAwarded && (
                              <span className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                +20 pts
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                            {task.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-stone-500 self-start sm:self-center">
                          {task.completed ? (
                            <span className="text-emerald-700 font-medium">
                              Completed {completedDateFormatted || "recently"}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">
                              Due: {dueDateFormatted}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-stone-400 space-y-2 bg-stone-50 rounded-2xl border border-stone-200/80 p-6">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs font-semibold text-stone-700">No tasks match this filter</p>
                  <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                    {taskFilter === "completed"
                      ? "The mentee hasn't marked any tasks completed yet."
                      : taskFilter === "pending"
                      ? "All assigned tasks have been completed!"
                      : "You haven't assigned any structured tasks to this mentee yet."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERSONAL SESSIONS */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 text-xs font-medium pb-2">
                <span className="text-stone-400 text-[11px] font-mono mr-1">Filter:</span>
                <button
                  type="button"
                  onClick={() => setSessionFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    sessionFilter === "all"
                      ? "bg-stone-900 text-white font-semibold"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  All ({report.sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter("completed")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    sessionFilter === "completed"
                      ? "bg-emerald-700 text-white font-semibold"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  Completed ({report.completedSessions})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter("scheduled")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    sessionFilter === "scheduled"
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  }`}
                >
                  Scheduled ({report.scheduledSessions})
                </button>
              </div>

              {/* Sessions List */}
              {filteredSessions.length > 0 ? (
                <div className="space-y-3">
                  {filteredSessions.map((sess) => {
                    const sessionDate = new Date(sess.date);
                    const formattedDate = sessionDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const isCompleted = sess.status === "completed";
                    const isScheduled = sess.status === "scheduled";

                    return (
                      <div
                        key={sess.id}
                        className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 flex flex-col gap-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
                                  sess.isCohort
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {sess.isCohort ? "Cohort Workshop" : "1-on-1 Consultation"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
                                  isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isScheduled
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-stone-200 text-stone-600"
                                }`}
                              >
                                {sess.status}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 pt-0.5">
                              {sess.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-stone-600 bg-white px-3 py-1.5 rounded-xl border border-stone-200 self-start">
                            <Calendar className="w-3 h-3 text-[#2563EB]" />
                            <span>{formattedDate}</span>
                            <span className="text-stone-300">&bull;</span>
                            <span>{sess.time}</span>
                            <span className="text-stone-300">&bull;</span>
                            <span className="text-stone-400 font-sans">{sess.durationMinutes}m</span>
                          </div>
                        </div>

                        {/* Meeting Room Link */}
                        {sess.location && (
                          <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                            <Video className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span className="truncate max-w-sm">{sess.location}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(sess.id, sess.location!)}
                              className="p-1 hover:bg-stone-200/60 rounded text-stone-400 hover:text-stone-700 transition-colors"
                              title="Copy room link"
                            >
                              {copiedSessionId === sess.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Attached Preparation Notes / Materials */}
                        {sess.attachedNote && (
                          <div className="p-3 rounded-xl bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                              {sess.attachedNote.fileUrl ? (() => {
                                const fileInfo = getFileTypeInfo(
                                  sess.attachedNote.fileName,
                                  sess.attachedNote.fileType
                                );
                                return (
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-[9px] font-black ${fileInfo.badgeBg} ${fileInfo.badgeText}`}
                                  >
                                    {fileInfo.badge}
                                  </div>
                                );
                              })() : (
                                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div className="overflow-hidden min-w-0">
                                <p className="text-xs font-bold text-stone-900 truncate">
                                  {sess.attachedNote.title}
                                </p>
                                <p className="text-[10px] font-mono text-stone-400 truncate">
                                  {sess.attachedNote.fileName
                                    ? `${sess.attachedNote.fileName} • ${formatAttachmentBytes(sess.attachedNote.fileSize)}`
                                    : "Preparation Notes"}
                                </p>
                              </div>
                            </div>

                            {sess.attachedNote.fileUrl && (
                              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                <a
                                  href={getAttachmentViewUrl(
                                    sess.attachedNote.fileUrl,
                                    sess.attachedNote.fileName
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors border border-stone-200/80 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>See</span>
                                </a>
                                <a
                                  href={getAttachmentDownloadUrl(
                                    sess.attachedNote.fileUrl,
                                    sess.attachedNote.fileName
                                  )}
                                  download={sess.attachedNote.fileName || "materials"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#c4533a] text-white text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-stone-400 space-y-2 bg-stone-50 rounded-2xl border border-stone-200/80 p-6">
                  <Calendar className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs font-semibold text-stone-700">No sessions recorded yet</p>
                  <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                    You haven&apos;t conducted personal check-in sessions with {mentee.name} yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAREER SNAPSHOT */}
          {activeTab === "snapshot" && (
            <div className="space-y-4">
              {/* Target Job Roles & Industries */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wider font-mono">
                  <Target className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Target Industries &amp; Goals</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mentee.careerProfile?.targetIndustries && mentee.careerProfile.targetIndustries.length > 0 ? (
                    mentee.careerProfile.targetIndustries.map((ind, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium"
                      >
                        {ind}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic">No target industries declared</span>
                  )}
                </div>
              </div>

              {/* Skills to Develop */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wider font-mono">
                  <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Skills Being Developed</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mentee.careerProfile?.skillsToDevelop && mentee.careerProfile.skillsToDevelop.length > 0 ? (
                    mentee.careerProfile.skillsToDevelop.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic">No specific skills listed</span>
                  )}
                </div>
              </div>

              {/* Reputation & Engagement Score */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-900 font-serif">
                    Alma Program Reputation Points
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Earned via completing assigned tasks and verified milestones.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black font-mono text-emerald-600">
                    +{mentee.careerProfile?.totalPoints || 0} pts
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            MODAL FOOTER
        ==================================================================== */}
        <div className="p-4 border-t border-stone-100 flex items-center justify-end bg-stone-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
