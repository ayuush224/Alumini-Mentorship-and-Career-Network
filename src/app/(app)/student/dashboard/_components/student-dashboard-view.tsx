"use client";

import React, { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Sparkles,
  CheckCircle2,
  Circle,
  Target,
  ArrowRight,
  Plus,
  Award,
  Pencil,
  Trash2,
  Shield,
  AlertCircle,
  X,
} from "lucide-react";
import {
  toggleActionCompletion,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions/tasks";

export interface UpcomingSessionData {
  id: string;
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  isCohort?: boolean;
  location?: string | null;
  linkNotice?: string;
  mentorName: string;
  mentorAvatarUrl?: string;
  mentorCompany?: string;
  mentorJobTitle?: string;
  prerequisites: string[];
}

export interface GoalProgressData {
  totalGoals: number;
  completedGoals: number;
  totalActions: number;
  completedActions: number;
  percentage: number;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  addedBy: "student" | "mentor";
  pointsAwarded?: boolean;
}

/**
 * Checks if a task's deadline day has passed (the very next day at 00:00:00).
 */
export function isTaskExpired(dueDateStr: string): boolean {
  if (!dueDateStr) return false;
  const parts = dueDateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const endOfDueDay = new Date(year, month, day, 23, 59, 59, 999);
    const now = new Date();
    return now.getTime() > endOfDueDay.getTime();
  }
  const d = new Date(dueDateStr);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}

function formatDateForInput(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

interface StudentDashboardViewProps {
  studentName: string;
  totalPoints: number;
  upcomingSession: UpcomingSessionData | null;
  goalsData: GoalProgressData;
  initialTasks: DashboardTaskItem[];
}

export function StudentDashboardView({
  studentName,
  totalPoints: initialPoints,
  upcomingSession,
  goalsData,
  initialTasks,
}: StudentDashboardViewProps) {
  const [tasks, setTasks] = useState<DashboardTaskItem[]>(initialTasks);
  const [points, setPoints] = useState(initialPoints);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<string | null>(null);

  // Sync state if server revalidates with fresh data
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  React.useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  // New task modal state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<DashboardTaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const handleToggle = (task: DashboardTaskItem) => {
    const nextCompleted = !task.completed;
    const pointsDelta = nextCompleted ? 20 : -20;

    // 1. Instant optimistic UI update (0ms latency, Instagram-like feel)
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
    );

    setPoints((prev) => Math.max(0, prev + pointsDelta));
    if (nextCompleted) {
      setNotification("🎉 +20 Reputation Points Earned!");
    } else {
      setNotification(null);
    }

    // 2. Asynchronous background database persistence
    startTransition(async () => {
      try {
        const res = await toggleActionCompletion(task.id, nextCompleted);
        if (res.success) {
          if (res.totalPoints !== undefined) {
            setPoints(res.totalPoints);
          }
        } else {
          // Revert optimistically on server error
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
          );
          setPoints((prev) => Math.max(0, prev - pointsDelta));
          setNotification("Failed to update task. Please try again.");
        }
      } catch {
        // Revert on network exception
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
        );
        setPoints((prev) => Math.max(0, prev - pointsDelta));
        setNotification("Network error. Please try again.");
      }
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDate) return;

    const res = await createTaskAction({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      dueDate: newTaskDate,
      addedBy: "student",
    });

    if (res.success && res.task) {
      const createdTask = res.task;
      setTasks((prev) => [
        {
          id: createdTask.id,
          title: createdTask.title,
          description: createdTask.description,
          dueDate: createdTask.dueDate,
          completed: false,
          addedBy: "student",
        },
        ...prev,
      ]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDate("");
      setShowAddTask(false);
      setNotification("Personal sub-task added.");
    } else {
      setNotification(res.error || "Failed to create task.");
    }
  };

  const handleOpenEdit = (task: DashboardTaskItem) => {
    if (task.addedBy === "mentor") {
      setNotification("Mentor-assigned tasks cannot be edited.");
      return;
    }
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
    const updatedTask: DashboardTaskItem = {
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
        setNotification(res.error || "Failed to update task.");
      } else {
        setNotification("Task updated successfully.");
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === oldTask.id ? oldTask : t)));
      setNotification("Network error while updating task.");
    }
  };

  const handleDeleteTask = async (task: DashboardTaskItem) => {
    if (task.addedBy === "mentor") {
      setNotification("Mentor-assigned tasks cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      const res = await deleteTaskAction(task.id);
      if (!res.success) {
        setTasks((prev) => [...prev, task]);
        setNotification(res.error || "Failed to delete task.");
      } else {
        setNotification("Task deleted.");
      }
    } catch {
      setTasks((prev) => [...prev, task]);
      setNotification("Network error while deleting task.");
    }
  };

  // SVG Radial Ring Calculation for Goals
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  // Filter out expired tasks whose deadline day has fully passed (the very next day)
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => !isTaskExpired(t.dueDate));
  }, [tasks]);

  // Arrange task checklist by nearest date first
  const sortedTasks = useMemo(() => {
    return [...activeTasks].sort((a, b) => {
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      return timeA - timeB;
    });
  }, [activeTasks]);

  const completedTaskCount = activeTasks.filter((t) => t.completed).length;
  const totalTaskCount = Math.max(activeTasks.length, 1);
  const currentPercentage = activeTasks.length > 0
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : goalsData.percentage;
  const strokeDashoffset =
    circumference - (currentPercentage / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* =====================================================================
          GREETING & REPUTATION BANNER
      ====================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-[#2563EB] font-mono">
            STUDENT DASHBOARD
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-stone-900 mt-1">
            Keep your career moving forward.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {`Welcome back, ${studentName}. Track your upcoming sessions, milestones, and active goals.`}
          </p>
        </div>

        {/* Reputation Points Pill */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-stone-400 uppercase">Reputation Points</p>
              <p className="text-sm font-bold text-stone-900 flex items-center gap-1">
                <span>{points} pts</span>
                <span className="text-[10px] text-emerald-600 font-normal">(+20/task)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* =====================================================================
          2-COLUMN TOP ROW: UPCOMING SESSION + GOALS RADIAL CHART
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. NEXT ON YOUR CALENDAR WIDGET (2 COLS) */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                <span>Next on Your Calendar</span>
              </h2>
              <span className="text-xs font-mono text-stone-400">Step 4 Widget</span>
            </div>

            {upcomingSession ? (
              <div className="p-5 rounded-2xl bg-[#F8F9FC] border border-stone-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 border border-stone-300 relative shrink-0">
                      {upcomingSession.mentorAvatarUrl ? (
                        <Image
                          src={upcomingSession.mentorAvatarUrl}
                          alt={upcomingSession.mentorName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-sm text-stone-600 bg-stone-100">
                          {upcomingSession.mentorName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">
                          {upcomingSession.mentorName}
                        </span>
                        {upcomingSession.isCohort && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                            Cohort Session
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">
                        {upcomingSession.mentorJobTitle} &bull; {upcomingSession.mentorCompany}
                      </p>
                      <p className="text-xs font-medium text-stone-800 mt-1">
                        {upcomingSession.title}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-mono font-semibold text-stone-800 shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{upcomingSession.time}</span>
                    </span>
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

                {upcomingSession.prerequisites && upcomingSession.prerequisites.length > 0 && (
                  <div className="pt-3 border-t border-stone-200/60">
                    <p className="text-[11px] font-semibold text-stone-700 mb-1.5">
                      Agenda &amp; Prerequisites:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {upcomingSession.prerequisites.map((req, rIdx) => (
                        <span
                          key={rIdx}
                          className="px-2 py-0.5 rounded-md bg-white text-[11px] font-mono text-stone-700 border border-stone-200"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400 font-mono">
                    Verified Alma Video Room Protected
                  </span>
                  {upcomingSession.location ? (
                    <a
                      href={upcomingSession.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Video Consultation</span>
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-mono">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{upcomingSession.linkNotice || "Link available 15 minutes before session"}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border-2 border-dashed border-stone-200 text-center bg-stone-50/60">
                <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-700">No session scheduled</p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1 mb-4">
                  Connect with your verified mentor or schedule your next check-in to keep momentum.
                </p>
                <Link
                  href="/student/mentors"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 shadow-2xs"
                >
                  <span>Find a Mentor</span>
                  <ArrowRight className="w-3 h-3 text-[#2563EB]" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 2. "YOUR GOALS" RADIAL PROGRESS CHART (1 COL) */}
        <section className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2563EB]" />
                <span>Your Goals</span>
              </h2>
              <span className="text-xs font-mono font-bold text-[#2563EB]">
                {currentPercentage}%
              </span>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="text-stone-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="text-[#2563EB] transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold font-mono text-stone-900">
                    {currentPercentage}%
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Goal Breakdown Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-stone-100">
              <div className="p-2 rounded-xl bg-stone-50">
                <p className="text-[10px] font-mono text-stone-400 uppercase">Active Goals</p>
                <p className="text-sm font-bold text-stone-800">{goalsData.totalGoals}</p>
              </div>
              <div className="p-2 rounded-xl bg-stone-50">
                <p className="text-[10px] font-mono text-stone-400 uppercase">Sub-Tasks</p>
                <p className="text-sm font-bold text-stone-800">
                  {completedTaskCount} / {totalTaskCount}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/mentorship"
              className="w-full py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View Mentorship Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* =====================================================================
          ACTIVE ACTION ITEMS & SUB-TASKS CHECKLIST
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span>Active Action Items &amp; Sub-Tasks</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Click checkbox to complete. Mentor-assigned items automatically grant +20 reputation points.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Personal Sub-Task</span>
          </button>
        </div>

        {sortedTasks.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="py-3.5 px-2 rounded-xl hover:bg-stone-50/70 transition-colors flex items-start justify-between gap-4 group"
              >
                <div
                  className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer group/task"
                  onClick={() => !isPending && handleToggle(task)}
                >
                  <button
                    type="button"
                    disabled={isPending}
                    aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                    className="text-stone-400 hover:text-[#2563EB] transition-colors shrink-0 cursor-pointer p-0.5 mt-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPending) handleToggle(task);
                    }}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                    ) : (
                      <Circle className="w-5 h-5 group-hover/task:text-[#2563EB]" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium transition-all select-none ${
                        task.completed
                          ? "line-through text-stone-400"
                          : "text-stone-800 group-hover/task:text-stone-950"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 select-none leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <p className="text-[11px] text-stone-400 font-mono mt-1 select-none flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-stone-400" />
                      Due{" "}
                      {new Date(task.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {task.addedBy === "mentor" ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Mentor Assigned (+20 pts)
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600">
                        Personal Task
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(task);
                        }}
                        title="Edit personal task"
                        className="p-1.5 text-stone-400 hover:text-[#2563EB] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task);
                        }}
                        title="Delete personal task"
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/60">
            <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-stone-600">All tasks completed!</p>
            <p className="text-xs text-stone-400 mt-0.5 mb-3">
              No outstanding action items. Work with your mentor to set your next goals.
            </p>
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-medium text-stone-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Add Sub-Task</span>
            </button>
          </div>
        )}
      </section>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Personal Sub-Task</h3>
              <button
                type="button"
                onClick={() => setShowAddTask(false)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Redis caching layer"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or notes..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Edit Personal Task</h3>
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
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
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}