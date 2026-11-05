"use client";

import React, { useState, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Users,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Paperclip,
  Trash2,
  Upload,
  Edit3,
  Download,
  Lock,
} from "lucide-react";
import {
  scheduleMentorshipSession,
  updateSessionStatusAction,
  updateSessionMaterialsAction,
} from "@/app/actions/mentorship";
import { uploadSessionAttachmentAction } from "@/app/actions/chat";
import {
  formatAttachmentBytes,
  getFileTypeInfo,
  getAttachmentViewUrl,
  getAttachmentDownloadUrl,
} from "@/lib/chat-attachments";

export interface MentorMenteeOption {
  id: string; // student user id
  name: string;
  major: string;
  avatarUrl?: string;
}

export interface MentorSessionItem {
  id: string;
  menteeId?: string | null;
  menteeName?: string;
  menteeMajor?: string;
  menteeAvatarUrl?: string;
  title: string;
  date: string; // ISO date string
  time: string;
  durationMinutes: number;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
  isCohort?: boolean;
  attachedNote?: {
    id: string;
    title: string;
    content: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
  editCutoffTime?: string;
  canEditMaterials?: boolean;
}

interface MentorSessionsViewProps {
  initialSessions: MentorSessionItem[];
  activeMentees: MentorMenteeOption[];
  mentorId: string;
}

export function MentorSessionsView({
  initialSessions,
  activeMentees,
  mentorId,
}: MentorSessionsViewProps) {
  const [sessions, setSessions] = useState<MentorSessionItem[]>(initialSessions);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Schedule Modal Form State
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [selectedMenteeId, setSelectedMenteeId] = useState<string>(
    activeMentees[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("15:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Share Notes Attachment Form State
  const [showNotesSection, setShowNotesSection] = useState(false);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Materials Modal State (Editable up to 1 hr post-session)
  const [editingSession, setEditingSession] = useState<MentorSessionItem | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");
  const [editNoteFile, setEditNoteFile] = useState<File | null>(null);
  const [editRemoveCurrentFile, setEditRemoveCurrentFile] = useState(false);
  const [isSavingMaterials, setIsSavingMaterials] = useState(false);
  const [materialsModalError, setMaterialsModalError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEditMaterials = (session: MentorSessionItem) => {
    setEditingSession(session);
    setEditNoteTitle(session.attachedNote?.title || "");
    setEditNoteContent(session.attachedNote?.content || "");
    setEditNoteFile(null);
    setEditRemoveCurrentFile(false);
    setMaterialsModalError(null);
  };

  const handleSaveMaterials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    setIsSavingMaterials(true);
    setMaterialsModalError(null);

    try {
      let fileData: {
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      } | undefined = undefined;

      // 1. If mentor uploaded a new replacement file, upload to Cloudinary
      if (editNoteFile) {
        const formData = new FormData();
        formData.append("file", editNoteFile);
        const uploadRes = await uploadSessionAttachmentAction(formData);

        if (!uploadRes.success || !uploadRes.fileUrl) {
          setMaterialsModalError(uploadRes.error || "Failed to upload file. Please try again.");
          setIsSavingMaterials(false);
          return;
        }

        fileData = {
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileType: uploadRes.fileType,
          fileSize: uploadRes.fileSize,
        };
      }

      // 2. Call updateSessionMaterialsAction
      const updateRes = await updateSessionMaterialsAction({
        sessionId: editingSession.id,
        title: editNoteTitle.trim(),
        content: editNoteContent.trim(),
        removeFile: editRemoveCurrentFile && !editNoteFile,
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileType: fileData?.fileType,
        fileSize: fileData?.fileSize,
      });

      if (!updateRes.success || !updateRes.note) {
        setMaterialsModalError(updateRes.error || "Failed to update materials.");
        setIsSavingMaterials(false);
        return;
      }

      // 3. Update in-memory session item so UI updates instantly
      const updatedNoteData = {
        id: updateRes.note.id,
        title: updateRes.note.title,
        content: updateRes.note.content,
        fileUrl: updateRes.note.fileUrl || undefined,
        fileName: updateRes.note.fileName || undefined,
        fileType: updateRes.note.fileType || undefined,
        fileSize: updateRes.note.fileSize || undefined,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? { ...s, attachedNote: updatedNoteData }
            : s
        )
      );

      setSuccessBanner(
        `✓ Preparation materials updated successfully for "${editingSession.title}"!`
      );
      setTimeout(() => setSuccessBanner(null), 5000);
      setEditingSession(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update materials.";
      setMaterialsModalError(errMsg);
    } finally {
      setIsSavingMaterials(false);
    }
  };

  // Copy meeting link helper
  const handleCopy = (sessionId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(sessionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open modal with fresh defaults
  const handleOpenModal = () => {
    setFormError(null);
    setTitle("");
    setDate(tomorrow);
    setTime("15:00");
    setDurationMinutes(45);
    setLocation(`https://meet.alma.edu/session/${Math.random().toString(36).substring(2, 9)}`);
    setShowNotesSection(false);
    setNoteFile(null);
    setNoteTitle("");
    setNoteContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (activeMentees.length > 0 && !selectedMenteeId) {
      setSelectedMenteeId(activeMentees[0].id);
    }
    setIsModalOpen(true);
  };

  // Handle Session Creation
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Please enter a session title or topic.");
      return;
    }
    if (!date) {
      setFormError("Please select a date for the session.");
      return;
    }
    if (!time.trim()) {
      setFormError("Please select a session time.");
      return;
    }

    if (!durationMinutes || durationMinutes < 5 || durationMinutes > 480) {
      setFormError("Please enter a valid session duration between 5 and 480 minutes.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const isAll = selectedMenteeId === "all";
      const mentee = activeMentees.find((m) => m.id === selectedMenteeId);

      let fileUploadData: {
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      } | undefined = undefined;

      // Upload file to Cloudinary if mentor attached one
      if (noteFile) {
        const formData = new FormData();
        formData.append("file", noteFile);
        const uploadRes = await uploadSessionAttachmentAction(formData);

        if (!uploadRes.success || !uploadRes.fileUrl) {
          setFormError(uploadRes.error || "Failed to upload attached file. Please try again.");
          setIsSubmitting(false);
          return;
        }

        fileUploadData = {
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileType: uploadRes.fileType,
          fileSize: uploadRes.fileSize,
        };
      }

      const hasSharedNote = Boolean(
        fileUploadData || noteTitle.trim() || noteContent.trim()
      );

      const res = await scheduleMentorshipSession({
        mentorId,
        menteeId: isAll ? "all" : selectedMenteeId || null,
        title: title.trim(),
        date,
        time: time.trim(),
        durationMinutes,
        location: location.trim(),
        sharedNote: hasSharedNote
          ? {
              title: noteTitle.trim() || `[Session Notes] ${title.trim()}`,
              content: noteContent.trim(),
              ...fileUploadData,
            }
          : undefined,
      });

      if (res.success && res.session) {
        const newSessionItem: MentorSessionItem = {
          id: res.session.id,
          menteeId: isAll ? "all" : selectedMenteeId || null,
          menteeName: isAll ? "All Active Mentees (Cohort)" : (mentee?.name || "Mentee Check-In"),
          menteeMajor: isAll ? `All Active Cohort (${activeMentees.length} Mentees)` : (mentee?.major || "Computer Science"),
          menteeAvatarUrl: isAll ? undefined : mentee?.avatarUrl,
          title: res.session.title,
          date: res.session.date,
          time: res.session.time,
          durationMinutes: res.session.durationMinutes,
          location: res.session.location,
          status: "scheduled",
          isCohort: isAll,
        };

        setSessions((prev) => [newSessionItem, ...prev]);
        setIsModalOpen(false);
        setSuccessBanner(`✓ Successfully scheduled "${newSessionItem.title}"!${hasSharedNote ? " Shared notes have been delivered." : ""}`);
        setTimeout(() => setSuccessBanner(null), 5000);
      } else {
        setFormError(res.error || "Failed to schedule session. Check for schedule overlaps.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to schedule session.";
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Session Status (Supports both Session and MentorSession collections)
  const handleUpdateStatus = async (
    sessionId: string,
    newStatus: "completed" | "cancelled"
  ) => {
    try {
      if (newStatus === "cancelled") {
        const patchRes = await fetch(`/api/sessions/${sessionId}/cancel`, {
          method: "PATCH",
        });
        if (patchRes.ok) {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
          );
          return;
        }
      }

      const res = await updateSessionStatusAction(sessionId, newStatus);
      if (res.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
        );
      }
    } catch {
      // Degrade gracefully
    }
  };

  // Filtered Sessions
  const now = new Date();
  const sortedUpcoming = useMemo(() => {
    return sessions
      .filter((s) => s.status === "scheduled" && new Date(s.date) >= new Date(now.setHours(0, 0, 0, 0)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  const sortedPast = useMemo(() => {
    return sessions
      .filter((s) => s.status !== "scheduled" || new Date(s.date) < new Date(now.setHours(0, 0, 0, 0)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions]);

  const displayedSessions =
    activeTab === "upcoming"
      ? sortedUpcoming
      : activeTab === "past"
      ? sortedPast
      : sessions;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* =====================================================================
          HEADER BAR & ACTIONS
      ====================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-[#2563EB] font-mono">
            COORDINATION &amp; WORKSPACE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-1">
            Mentoring Sessions
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Coordinate 1-on-1 check-ins, portfolio reviews, and mock interviews with your active mentees.
          </p>
        </div>

        {/* Schedule Session Button */}
        <button
          type="button"
          onClick={handleOpenModal}
          className="px-4 sm:px-5 py-2.5 bg-[#2563EB] hover:bg-[#c4533a] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Session</span>
        </button>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          STATS BAR
      ====================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
              Upcoming Sessions
            </p>
            <p className="text-lg font-bold text-stone-900">{sortedUpcoming.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
              Completed Check-Ins
            </p>
            <p className="text-lg font-bold text-stone-900">
              {sessions.filter((s) => s.status === "completed").length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
              Active Mentees
            </p>
            <p className="text-lg font-bold text-stone-900">{activeMentees.length}</p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          FILTER TABS
      ====================================================================== */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-[#2563EB] text-white"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          Upcoming ({sortedUpcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "past"
              ? "bg-[#2563EB] text-white"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          Past &amp; Completed ({sortedPast.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "all"
              ? "bg-[#2563EB] text-white"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          All ({sessions.length})
        </button>
      </div>

      {/* =====================================================================
          SESSIONS LIST
      ====================================================================== */}
      {displayedSessions.length > 0 ? (
        <div className="space-y-4">
          {displayedSessions.map((session) => {
            const sessionDate = new Date(session.date);
            const isCompleted = session.status === "completed";
            const isCancelled = session.status === "cancelled";
            const isUpcoming = session.status === "scheduled";

            const dayName = sessionDate.toLocaleDateString("en-US", { weekday: "short" });
            const dayNumber = sessionDate.toLocaleDateString("en-US", { day: "2-digit" });
            const monthName = sessionDate.toLocaleDateString("en-US", { month: "short" });

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-stone-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Date Badge + Session Info */}
                <div className="flex items-start gap-4">
                  {/* Calendar Date Pill */}
                  <div className="w-14 h-16 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-center shrink-0 text-center">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#2563EB]">
                      {monthName}
                    </span>
                    <span className="text-xl font-bold font-mono text-stone-900 leading-none">
                      {dayNumber}
                    </span>
                    <span className="text-[9px] font-mono text-stone-400 mt-0.5">
                      {dayName}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900 font-serif leading-tight">
                        {session.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-mono font-medium border border-stone-200">
                        {session.durationMinutes} mins
                      </span>
                      {session.isCohort && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200 flex items-center gap-1 font-mono">
                          <Users className="w-3 h-3 text-purple-600" />
                          <span>All Active Mentees</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-medium border border-red-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Cancelled</span>
                        </span>
                      )}
                    </div>

                    {/* Mentee info & time */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span className="font-mono text-stone-700 font-medium">
                          {session.time}
                        </span>
                      </div>

                      {session.isCohort ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">&bull;</span>
                          <span className="text-purple-700 font-medium">
                            Audience: All Active Mentees (Cohort)
                          </span>
                        </div>
                      ) : session.menteeName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">&bull;</span>
                          {session.menteeAvatarUrl ? (
                            <div className="relative w-4 h-4 rounded-full overflow-hidden border border-stone-200 shrink-0">
                              <Image
                                src={session.menteeAvatarUrl}
                                alt={session.menteeName}
                                fill
                                className="object-cover"
                                sizes="16px"
                              />
                            </div>
                          ) : null}
                          <span className="text-stone-700 font-medium">
                            Mentee: {session.menteeName}
                          </span>
                          {session.menteeMajor && (
                            <span className="text-stone-400">({session.menteeMajor})</span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Video Link */}
                    {session.location && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-stone-500">
                        <Video className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span className="truncate max-w-xs">{session.location}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(session.id, session.location)}
                          className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                          title="Copy meeting link"
                        >
                          {copiedId === session.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Session Materials & File Attachment Display */}
                    <div className="pt-2.5 mt-1 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2.5">
                      {session.attachedNote ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                          {session.attachedNote.fileUrl ? (
                            (() => {
                              const fileInfo = getFileTypeInfo(
                                session.attachedNote.fileName,
                                session.attachedNote.fileType
                              );
                              return (
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                                  <span
                                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${fileInfo.badgeBg} ${fileInfo.badgeText}`}
                                  >
                                    {fileInfo.badge}
                                  </span>
                                  <span
                                    className="font-medium text-stone-800 truncate max-w-[200px]"
                                    title={session.attachedNote.fileName}
                                  >
                                    {session.attachedNote.fileName}
                                  </span>
                                  {session.attachedNote.fileSize && (
                                    <span className="text-[10px] font-mono text-stone-400">
                                      ({formatAttachmentBytes(session.attachedNote.fileSize)})
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 pl-1 border-l border-stone-200">
                                    <a
                                      href={getAttachmentViewUrl(
                                        session.attachedNote.fileUrl,
                                        session.attachedNote.fileName
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded cursor-pointer"
                                      title="Open / View document"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <a
                                      href={getAttachmentDownloadUrl(
                                        session.attachedNote.fileUrl,
                                        session.attachedNote.fileName
                                      )}
                                      download={session.attachedNote.fileName || "document"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded cursor-pointer"
                                      title="Download document"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700">
                              <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span className="font-medium truncate max-w-[220px]">
                                {session.attachedNote.title}
                              </span>
                              <span className="text-[10px] font-mono text-stone-400">
                                (Text Notes)
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 italic">
                          No preparation materials attached
                        </span>
                      )}

                      {/* Edit Materials or Lock Indicator */}
                      {session.canEditMaterials ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditMaterials(session)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer border border-stone-200/80 shadow-2xs"
                          title={
                            session.editCutoffTime
                              ? `Editable until ${new Date(
                                  session.editCutoffTime
                                ).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })} (1h post-session)`
                              : "Editable up to 1h post-session"
                          }
                        >
                          <Edit3 className="w-3 h-3 text-stone-500" />
                          <span>
                            {session.attachedNote ? "Edit Materials" : "+ Add Materials"}
                          </span>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-400"
                          title="Materials can only be updated up to 1 hour after session concludes"
                        >
                          <Lock className="w-3 h-3 text-stone-300" />
                          <span>Materials locked</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                  {isUpcoming && (
                    <>
                      <a
                        href={session.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Room</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(session.id, "completed")}
                        className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                        title="Mark session complete"
                      >
                        Mark Done
                      </button>
                    </>
                  )}

                  {isCompleted && (
                    <span className="text-xs text-stone-400 italic">Check-in finished</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-900 font-serif">
              {activeTab === "upcoming"
                ? "No upcoming sessions on your calendar"
                : "No sessions recorded in this view"}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Coordinate 1-on-1 check-ins, portfolio walk-throughs, or interview prep sessions with your active mentees.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          SCHEDULE SESSION MODAL DIALOG
      ====================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden my-auto z-10 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Schedule Mentoring Session</h3>
                  <p className="text-[11px] text-stone-500">
                    {selectedMenteeId === "all"
                      ? "Cohort session with all verified active mentees"
                      : "1-on-1 check-in with verified active mentee"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed">{formError}</span>
                </div>
              )}

              {/* Mentee Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Active Mentee
                </label>
                {activeMentees.length > 0 ? (
                  <select
                    value={selectedMenteeId}
                    onChange={(e) => setSelectedMenteeId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  >
                    <option value="all">ðŸ‘¥ All Active Mentees (Cohort / Group Session)</option>
                    {activeMentees.map((mentee) => (
                      <option key={mentee.id} value={mentee.id}>
                        {mentee.name} â€” {mentee.major}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                    You currently have no active mentees. Accept student intro requests from your Requests inbox to schedule sessions.
                  </p>
                )}
              </div>

              {/* Title / Topic */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Session Topic / Agenda
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. System Architecture Review & Career Roadmap"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  required
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Time (e.g. 15:00)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Duration Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    Duration (Minutes)
                  </label>
                  <span className="text-[11px] font-mono text-stone-500">
                    {durationMinutes > 0
                      ? `${durationMinutes} mins (${(durationMinutes / 60).toFixed(durationMinutes % 60 === 0 ? 0 : 1)}h)`
                      : "Enter minutes"}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={durationMinutes || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDurationMinutes(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    placeholder="Enter duration in minutes (e.g. 45)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 pr-12 text-xs text-stone-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-mono pointer-events-none">
                    mins
                  </span>
                </div>

                {/* Presets removed per user preference: dynamic minute input is authoritative */}
              </div>

              {/* Video Room / Location */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alma Video Call Room URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="https://meet.alma.edu/session/..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  />
                  <Video className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  A unique Alma video room is generated automatically. You can also paste a Google Meet or Zoom link.
                </p>
              </div>

              {/* Share Notes & Preparation Material (Optional) */}
              <div className="p-4 rounded-2xl bg-stone-50/90 border border-stone-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Share Notes &amp; Preparation Materials
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {selectedMenteeId === "all"
                          ? "Delivered to all active mentees in their Shared Notes"
                          : `Delivered to ${activeMentees.find((m) => m.id === selectedMenteeId)?.name || "selected mentee"}'s Shared Notes`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotesSection((prev) => !prev)}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {showNotesSection ? "Hide" : "+ Add Notes / PDF"}
                  </button>
                </div>

                {showNotesSection && (
                  <div className="pt-2 space-y-3 border-t border-stone-200/70 animate-in fade-in">
                    {/* Note Title */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Note Title
                      </label>
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder={title ? `[Session Notes] ${title}` : "e.g. Session Agenda & Preparation Guide"}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                      />
                    </div>

                    {/* Note Content */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Notes / Instructions (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add preparation guidelines, talking points, or reading links for this session..."
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
                      />
                    </div>

                    {/* File Attachment Dropzone / Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Attach Document or PDF (Max 10MB)
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              setFormError("Attached file exceeds 10MB limit.");
                              return;
                            }
                            setNoteFile(file);
                            setFormError(null);
                          }
                        }}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                      />

                      {noteFile ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                              <Paperclip className="w-3.5 h-3.5" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-stone-900 truncate">
                                {noteFile.name}
                              </p>
                              <p className="text-[10px] text-stone-400 font-mono">
                                {formatAttachmentBytes(noteFile.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNoteFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove attached file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 px-4 border-2 border-dashed border-stone-200 hover:border-[#2563EB]/60 bg-white rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                        >
                          <Upload className="w-4 h-4 text-stone-400 group-hover:text-[#2563EB] transition-colors" />
                          <span className="text-xs font-semibold text-stone-700 group-hover:text-stone-900">
                            Click to attach PDF, slides, or document
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            PDF, DOCX, PPTX, ZIP up to 10MB
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || (activeMentees.length === 0 && !selectedMenteeId)}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Availability...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MANAGE SESSION MATERIALS & PREPARATION NOTES MODAL
      ====================================================================== */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#2563EB]">
                  SESSION PREPARATION &amp; MATERIALS
                </span>
                <h3 className="text-lg font-bold font-serif text-stone-900 leading-tight">
                  {editingSession.title}
                </h3>
                <p className="text-xs text-stone-500">
                  {editingSession.isCohort
                    ? "Cohort Check-in (All Active Mentees)"
                    : `1-on-1 with ${editingSession.menteeName || "Mentee"}`}{" "}
                  &bull; {editingSession.time}
                </p>
              </div>

              <button
                type="button"
                disabled={isSavingMaterials}
                onClick={() => setEditingSession(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Window Countdown Notice */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-900">
                  Materials Editing Window Active
                </p>
                <p className="text-[11px] text-amber-700">
                  You can upload, replace, or edit materials until{" "}
                  <strong>
                    {editingSession.editCutoffTime
                      ? new Date(editingSession.editCutoffTime).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "1 hour after the session ends"}
                  </strong>{" "}
                  (1 hour after session concludes).
                </p>
              </div>
            </div>

            {/* Error Message */}
            {materialsModalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{materialsModalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveMaterials} className="space-y-4">
              {/* Note Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Materials Title
                </label>
                <input
                  type="text"
                  value={editNoteTitle}
                  onChange={(e) => setEditNoteTitle(e.target.value)}
                  placeholder={`[Session Notes] ${editingSession.title}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-hidden focus:border-[#2563EB] transition-colors"
                />
              </div>

              {/* Note Content */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Preparation Guidance &amp; Instructions
                </label>
                <textarea
                  rows={3}
                  value={editNoteContent}
                  onChange={(e) => setEditNoteContent(e.target.value)}
                  placeholder="Provide preparation reading, agenda, or topics to review..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-hidden focus:border-[#2563EB] transition-colors resize-none"
                />
              </div>

              {/* File Attachment Section */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Attached File (PDF, Slides, Document)
                </label>

                {/* Hidden File Input */}
                <input
                  ref={editFileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        setMaterialsModalError("Attached file exceeds 10MB limit.");
                        return;
                      }
                      setEditNoteFile(file);
                      setEditRemoveCurrentFile(false);
                      setMaterialsModalError(null);
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                />

                {/* Case 1: New file selected */}
                {editNoteFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {editNoteFile.name} (New file)
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          {formatAttachmentBytes(editNoteFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditNoteFile(null);
                        if (editFileInputRef.current) editFileInputRef.current.value = "";
                      }}
                      className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Cancel replacement file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : editingSession.attachedNote?.fileUrl && !editRemoveCurrentFile ? (
                  /* Case 2: Existing file attached */
                  <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-black tracking-wider ${
                          getFileTypeInfo(
                            editingSession.attachedNote.fileName,
                            editingSession.attachedNote.fileType
                          ).badgeBg
                        } ${
                          getFileTypeInfo(
                            editingSession.attachedNote.fileName,
                            editingSession.attachedNote.fileType
                          ).badgeText
                        }`}
                      >
                        {
                          getFileTypeInfo(
                            editingSession.attachedNote.fileName,
                            editingSession.attachedNote.fileType
                          ).badge
                        }
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {editingSession.attachedNote.fileName || "Attached Document"}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          {formatAttachmentBytes(editingSession.attachedNote.fileSize) || "Active File"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRemoveCurrentFile(true)}
                        className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove attached file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Case 3: No file attached or existing removed */
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full py-4 px-4 border-2 border-dashed border-stone-200 hover:border-[#2563EB]/60 bg-white rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer group"
                  >
                    <Upload className="w-5 h-5 text-stone-400 group-hover:text-[#2563EB] transition-colors" />
                    <span className="text-xs font-semibold text-stone-700 group-hover:text-stone-900">
                      Click to attach PDF, slides, or document
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      PDF, DOCX, PPTX, ZIP up to 10MB
                    </span>
                  </button>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingMaterials}
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingMaterials}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingMaterials ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Materials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
