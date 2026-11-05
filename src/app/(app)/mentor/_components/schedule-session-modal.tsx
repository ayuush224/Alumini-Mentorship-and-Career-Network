"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Calendar,
  Video,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Paperclip,
  Trash2,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { scheduleMentorshipSession } from "@/app/actions/mentorship";
import { uploadSessionAttachmentAction } from "@/app/actions/chat";
import { formatAttachmentBytes } from "@/lib/chat-attachments";

export interface ActiveMenteeOption {
  id: string;
  name: string;
  major: string;
  avatarUrl?: string;
}

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  activeMentees?: ActiveMenteeOption[];
  onSuccess?: () => void;
}

export function ScheduleSessionModal({
  isOpen,
  onClose,
  mentorId,
  activeMentees = [],
  onSuccess,
}: ScheduleSessionModalProps) {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [selectedMenteeId, setSelectedMenteeId] = useState<string>(
    activeMentees[0]?.id || "all"
  );
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("15:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [location, setLocation] = useState(
    `https://meet.alma.edu/session/${Math.random().toString(36).substring(2, 9)}`
  );

  // Optional Preparation Material State
  const [showNotesSection, setShowNotesSection] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteFile, setNoteFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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

      let fileUploadData:
        | {
            fileUrl?: string;
            fileName?: string;
            fileType?: string;
            fileSize?: number;
          }
        | undefined = undefined;

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

      if (res.success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container (Identical to Sessions Section) */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto z-10 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Schedule Mentoring Session</h3>
              <p className="text-[11px] text-slate-500">
                {selectedMenteeId === "all"
                  ? "Cohort session with all verified active mentees"
                  : "1-on-1 check-in with verified active mentee"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Active Mentee
            </label>
            {activeMentees.length > 0 ? (
              <select
                value={selectedMenteeId}
                onChange={(e) => setSelectedMenteeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="all">👥 All Active Mentees (Cohort / Group Session)</option>
                {activeMentees.map((mentee) => (
                  <option key={mentee.id} value={mentee.id}>
                    {mentee.name} — {mentee.major}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Topic / Agenda
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Architecture Review & Career Roadmap"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              required
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time (e.g. 15:00)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Dynamic Duration Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Duration (Minutes)
              </label>
              <span className="text-[11px] font-mono text-slate-500">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-12 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono pointer-events-none">
                mins
              </span>
            </div>
          </div>

          {/* Video Room / Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alma Video Call Room URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="https://meet.alma.edu/session/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <Video className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              A unique Alma video room is generated automatically. You can also paste a Google Meet or Zoom link.
            </p>
          </div>

          {/* Share Notes & Preparation Material (Optional) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Share Notes &amp; Preparation Materials
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {selectedMenteeId === "all"
                      ? "Delivered to all active mentees in their Shared Notes"
                      : `Delivered to ${activeMentees.find((m) => m.id === selectedMenteeId)?.name || "selected mentee"}'s Shared Notes`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesSection((prev) => !prev)}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {showNotesSection ? "Hide" : "+ Add Notes / PDF"}
              </button>
            </div>

            {showNotesSection && (
              <div className="pt-2 space-y-3 border-t border-slate-200 animate-in fade-in">
                {/* Note Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Note Title
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder={title ? `[Session Notes] ${title}` : "e.g. Session Agenda & Preparation Guide"}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Note Content */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Notes / Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add preparation guidelines, talking points, or reading links for this session..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                  />
                </div>

                {/* File Attachment Dropzone / Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <Paperclip className="w-3.5 h-3.5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {noteFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
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
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove attached file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 border-2 border-dashed border-slate-200 hover:border-blue-500/60 bg-white rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                    >
                      <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                        Click to attach PDF, slides, or document
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        PDF, DOCX, PPTX, ZIP up to 10MB
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (activeMentees.length === 0 && !selectedMenteeId)}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Availability...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Schedule Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleSessionModal;
