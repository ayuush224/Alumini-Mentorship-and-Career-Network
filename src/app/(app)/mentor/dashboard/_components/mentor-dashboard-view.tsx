"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Video,
  ExternalLink,
  CheckCircle2,
  Circle,
  Plus,
  Copy,
  Check,
  Users,
  Inbox,
  ArrowRight,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Clock,
} from "lucide-react";
import {
  toggleActionCompletion,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions/tasks";
import { isTaskExpired, formatDateForInput } from "@/lib/utils/tasks";
export { isTaskExpired };
import { ScheduleSessionModal, ActiveMenteeOption } from "../../_components/schedule-session-modal";

export interface MentorUpcomingSession {
  id: string;
  title: string;
  date: string; // ISO
  time: string;
  location: string; // video room link
  menteeName: string;
  menteeAvatarUrl?: string;
  menteeHeadline?: string;
  prerequisites: string[];
}

export interface MentorAdminTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO
  completed: boolean;
  completedAt?: string;
}

interface MentorDashboardViewProps {
  mentorName: string;
  mentorHeadline?: string;
  activeMenteesCount: number;
  maxMenteesLimit: number;
  pendingRequestsCount: number;
  upcomingSession: MentorUpcomingSession | null;
  initialTasks: MentorAdminTask[];
  mentorId?: string;
  activeMentees?: ActiveMenteeOption[];
}

/**
 * Reusable SVG ProgressRing component calculating task completion percentage.
 */
export function ProgressRing({
  percentage,
  size = 140,
  strokeWidth = 10,
  strokeColor = "#F58220",
  trailColor = "#f5f5f4",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  trailColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trailColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">
          {percentage}%
        </span>
        <span className="text-[9px] uppercase tracking-wider font-mono text-stone-400">
          Completed
        </span>
      </div>
    </div>
  );
}

export function MentorDashboardView({
  mentorName,
  mentorHeadline = "Alma Verified Mentor",
  activeMenteesCount,
  maxMenteesLimit,
  pendingRequestsCount,
  upcomingSession,
  initialTasks,
  mentorId,
  activeMentees = [],
}: MentorDashboardViewProps) {
  const [tasks, setTasks] = useState<MentorAdminTask[]>(initialTasks);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sync state if initialTasks changes
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<MentorAdminTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Filter out expired tasks whose deadline day has fully passed (the very next day)
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => !isTaskExpired(t.dueDate));
  }, [tasks]);

  // Calculate completion percentage for personal administrative tasks
  const completedCount = activeTasks.filter((t) => t.completed).length;
  const totalCount = activeTasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Arrange task checklist by nearest date first
  const sortedTasks = useMemo(() => {
    return [...activeTasks].sort((a, b) => {
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      return timeA - timeB;
    });
  }, [activeTasks]);

  // Toggle task completion
  const handleToggle = async (taskId: string, currentCompleted: boolean) => {
    if (togglingId) return;
    setTogglingId(taskId);

    const nextState = !currentCompleted;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: nextState } : t))
    );

    try {
      const res = await toggleActionCompletion(taskId, nextState);
      if (!res.success) {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t))
        );
      }
    } catch {
      // Rollback on network error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Add new administrative task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) {
      setAddError("Please provide both a task title and a deadline.");
      return;
    }
    setAddError(null);
    setIsAdding(true);

    try {
      const res = await createTaskAction({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        dueDate: newDueDate,
        mentorId,
        addedBy: "mentor",
      });

      if (res.success && res.task) {
        const createdTask = res.task;
        setTasks((prev) => [
          ...prev,
          {
            id: createdTask.id,
            title: createdTask.title,
            description: createdTask.description,
            dueDate: createdTask.dueDate,
            completed: false,
          },
        ]);
        setNewTitle("");
        setNewDescription("");
        setNewDueDate("");
      } else {
        setAddError(res.error || "Failed to add task.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to add task.";
      setAddError(errMsg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (task: MentorAdminTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueDate(formatDateForInput(task.dueDate));
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      setEditError("Task title is required.");
      return;
    }
    if (!editDueDate) {
      setEditError("Due date is required.");
      return;
    }

    const oldTask = editingTask;
    const updatedTask: MentorAdminTask = {
      ...oldTask,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      dueDate: editDueDate,
    };

    setTasks((prev) => prev.map((t) => (t.id === oldTask.id ? updatedTask : t)));
    setEditingTask(null);

    try {
      const res = await updateTaskAction(oldTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        dueDate: editDueDate,
      });

      if (!res.success) {
        setTasks((prev) => prev.map((t) => (t.id === oldTask.id ? oldTask : t)));
        setAddError(res.error || "Failed to update task.");
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === oldTask.id ? oldTask : t)));
      setAddError("Network error while updating task.");
    }
  };

  const handleDeleteTask = async (task: MentorAdminTask) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      const res = await deleteTaskAction(task.id);
      if (!res.success) {
        setTasks((prev) => [...prev, task]);
        setAddError(res.error || "Failed to delete task.");
      }
    } catch {
      setTasks((prev) => [...prev, task]);
      setAddError("Network error while deleting task.");
    }
  };

  // Copy meeting link
  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const menteeInitials = upcomingSession?.menteeName
    ? upcomingSession.menteeName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* =====================================================================
          PAGE HEADER & CAPACITY SUMMARY
      ====================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-primary-600 font-mono">
            MENTOR WORKSPACE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-1">
            {`Welcome back, ${mentorName}`}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {mentorHeadline}
          </p>
        </div>

        {/* Capacity & Requests Badges */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                Active Mentees
              </p>
              <p className="text-sm font-bold text-stone-900">
                {activeMenteesCount} / {maxMenteesLimit}{" "}
                <span className="text-[11px] font-normal text-stone-500">
                  ({maxMenteesLimit - activeMenteesCount} available)
                </span>
              </p>
            </div>
          </div>

          {pendingRequestsCount > 0 && (
            <Link
              href="/mentor/requests"
              className="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white shadow-2xs flex items-center gap-2 text-xs font-semibold transition-colors"
            >
              <Inbox className="w-4 h-4" />
              <span>{pendingRequestsCount} Pending Requests</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN 2-COLUMN GRID: SESSIONS & ADMINISTRATIVE TASKS
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ===================================================================
            LEFT COLUMN: NEXT UPCOMING SESSION (7 COLS)
        ==================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-serif text-stone-900">
                    Next on Your Calendar
                  </h2>
                  <p className="text-xs text-stone-400 font-mono">
                    Upcoming 1:1 or Cohort Mentorship
                  </p>
                </div>
              </div>

              {upcomingSession && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-mono font-medium border border-emerald-200/60">
                  Confirmed Session
                </span>
              )}
            </div>

            {upcomingSession ? (
              <div className="p-5 rounded-2xl bg-background border border-stone-200/80 space-y-5">
                {/* Session topic header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-600">
                      Topic Focus
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      {upcomingSession.title}
                    </h3>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-stone-200 shadow-2xs text-xs font-mono font-semibold text-stone-800">
                      <Clock className="w-3.5 h-3.5 text-primary-600" />
                      <span>{upcomingSession.time}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-mono mt-1">
                      {new Date(upcomingSession.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Mentee info card */}
                <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-200 relative flex-shrink-0">
                    {upcomingSession.menteeAvatarUrl ? (
                      <Image
                        src={upcomingSession.menteeAvatarUrl}
                        alt={upcomingSession.menteeName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-stone-600 bg-stone-100">
                        {menteeInitials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {upcomingSession.menteeName}
                    </p>
                    <p className="text-[11px] text-stone-400 truncate">
                      {upcomingSession.menteeHeadline || "Mentee"}
                    </p>
                  </div>
                  <Link
                    href="/mentor/mentees"
                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0"
                  >
                    <span>Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Video room action bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-500">
                    <span>Alma Protected Video Room</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(upcomingSession.location)}
                      className="text-[11px] text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-sans font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="font-sans">Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 font-mono bg-white/80 px-3 py-2 rounded-xl border border-stone-200/80 truncate select-all">
                    {upcomingSession.location}
                  </p>

                  <a
                    href={upcomingSession.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Video Room</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>

                {/* Prerequisites list */}
                {upcomingSession.prerequisites.length > 0 && (
                  <div className="pt-2 border-t border-stone-100">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block mb-2">
                      Agenda &amp; Discussion Topics
                    </span>
                    <ul className="space-y-1.5">
                      {upcomingSession.prerequisites.map((p, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-stone-600 flex items-start gap-2"
                        >
                          <span className="text-primary-600 font-bold">&bull;</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-900 font-serif">
                  No upcoming sessions on your calendar
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Coordinate session dates and video links directly with your active mentees.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Session</span>
                  </button>
                  <Link
                    href="/mentor/sessions"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
                  >
                    <span>All Sessions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Quick Mentorship Roster Card */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">
                  Mentee Relationships
                </h4>
                <p className="text-xs text-stone-500">
                  {activeMenteesCount} active mentees assigned to you
                </p>
              </div>
            </div>
            <Link
              href="/mentor/mentees"
              className="px-3.5 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 flex items-center gap-1 transition-colors"
            >
              <span>View Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: ADMINISTRATIVE TASKS & PROGRESS RING (5 COLS)
        ==================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-600">
                    Administrative Tasks
                  </span>
                  <h2 className="text-lg font-bold font-serif text-stone-900 mt-0.5">
                    Task Progress
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-600/10 text-primary-600 text-[10px] font-mono font-semibold">
                  Personal Tasks
                </span>
              </div>

              {/* ProgressRing Chart */}
              <div className="flex flex-col items-center justify-center py-4 bg-stone-50/60 rounded-2xl border border-stone-100 mb-6">
                <ProgressRing
                  percentage={percentage}
                  size={144}
                  strokeWidth={11}
                  strokeColor="#F58220"
                  trailColor="#e7e5e4"
                />
                <div className="text-center mt-3">
                  <p className="text-xs font-bold text-stone-900">
                    {completedCount} of {totalCount} Tasks Completed
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {totalCount - completedCount} administrative items pending
                  </p>
                </div>
              </div>

              {/* Interactive Checklist */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs font-bold font-mono uppercase tracking-wider text-stone-400 pb-1">
                  <span>Task Checklist</span>
                  <span>Due Date</span>
                </div>

                {sortedTasks.length > 0 ? (
                  sortedTasks.map((task) => {
                    const isToggling = togglingId === task.id;
                    return (
                      <div
                        key={task.id}
                        className={`group p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          task.completed
                            ? "bg-stone-50/80 border-stone-200/70 text-stone-400"
                            : "bg-white border-stone-200 hover:border-stone-300 shadow-2xs"
                        }`}
                      >
                        <div
                          className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleToggle(task.id, task.completed)}
                        >
                          <button
                            type="button"
                            disabled={isToggling}
                            className="flex-shrink-0 text-stone-400 group-hover:text-stone-600 transition-colors mt-0.5 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(task.id, task.completed);
                            }}
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-stone-300" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-xs font-medium block leading-snug ${
                                task.completed ? "line-through text-stone-400" : "text-stone-800"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                          <span className="text-[10px] font-mono text-stone-400 mr-1">
                            {new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(task);
                            }}
                            title="Edit task"
                            className="p-1 text-stone-400 hover:text-primary-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            title="Delete task"
                            className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-stone-400 py-3 text-center">
                    No administrative tasks recorded yet.
                  </p>
                )}
              </div>

              {/* Quick Add Administrative Task Form */}
              <form onSubmit={handleCreateTask} className="pt-4 border-t border-stone-100 space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block">
                  Add Administrative Task
                </span>

                {addError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{addError}</span>
                  </p>
                )}

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g., Review Q3 mentee project architectures"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                  <textarea
                    rows={2}
                    placeholder="Optional details or instructions..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                    <button
                      type="submit"
                      disabled={isAdding}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAdding ? "Adding..." : "Add"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Administrative Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Edit Administrative Task</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Task details or requirements..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Mentoring Session Modal (Identical to Sessions Section) */}
      <ScheduleSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mentorId={mentorId || ""}
        activeMentees={activeMentees}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}