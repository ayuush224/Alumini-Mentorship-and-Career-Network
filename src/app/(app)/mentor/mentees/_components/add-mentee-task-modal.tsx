"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createTaskAction } from "@/actions/tasks";

interface AddMenteeTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentee: {
    id: string; // studentId
    name: string;
    mentorshipId?: string;
  } | null;
  onSuccess?: (taskTitle: string) => void;
}

export function AddMenteeTaskModal({
  isOpen,
  onClose,
  mentee,
  onSuccess,
}: AddMenteeTaskModalProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Focus and ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      // Reset form
      setTaskTitle("");
      // Default due date to 3 days from now
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setDueDate(d.toISOString().split("T")[0]);
      setFormError(null);
      setSuccessMsg(null);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mentee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle) {
      setFormError("Task title is required.");
      return;
    }
    if (!dueDate) {
      setFormError("Due date is mandatory.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTaskAction({
        title: trimmedTitle,
        dueDate: dueDate,
        studentId: mentee.id,
        mentorshipId: mentee.mentorshipId,
        addedBy: "mentor",
      });

      if (!res.success) {
        setFormError(res.error || "Failed to create task. Please try again.");
        return;
      }

      setSuccessMsg(`Task assigned to ${mentee.name}!`);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess(trimmedTitle);
      }, 700);
    } catch {
      setFormError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-subtask-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 id="add-subtask-title" className="text-base font-bold text-stone-900">
              Add Sub-Task
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Assign action item for <span className="text-stone-700 font-semibold">{mentee.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {formError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body matching user's reference image */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g. Implement Redis caching layer"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              disabled={isSubmitting}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 transition-all disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#c4533a] text-white text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
