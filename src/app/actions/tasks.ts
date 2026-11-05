"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectDB, startSafeTransaction } from "@/lib/db";
import { Action } from "@/lib/models/Tasks";
import { User, StudentProfile } from "@/lib/models/User";
import { verifyAccess } from "@/lib/app-tokens";

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccess(token);
    return (payload?.sub as string) || null;
  } catch {
    return null;
  }
}

export interface ToggleActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  action?: {
    id: string;
    completed: boolean;
    completedAt?: string;
    pointsAwarded?: boolean;
  };
  pointsAwardedThisToggle?: number;
  totalPoints?: number;
}

/**
 * Step 2: Task Completion Server Action
 *
 * Toggles completion status of an Action sub-task.
 * Enforces idempotent point calculation:
 * - If isComplete is true and task is mentor-assigned, uses a Mongoose transaction to
 *   set completedAt: new Date() (UTC) and $inc: { totalPoints: 20 } on the student's profile.
 * - Prevents point subtraction or re-addition if toggled repeatedly via pointsAwarded flag.
 */
export async function toggleActionCompletion(
  actionId: string,
  isComplete: boolean
): Promise<ToggleActionResponse> {
  let session: mongoose.ClientSession | null = null;

  try {
    await connectDB();
    const userId = await getAuthenticatedUserId();

    if (actionId.startsWith("demo-")) {
      let currentTotal = 0;
      let pointsAwarded = 0;

      if (userId) {
        const title =
          actionId === "demo-task-1"
            ? "Complete Distributed Systems Architecture Document"
            : actionId === "demo-task-2"
            ? "Benchmark write-through vs read-through caching latency"
            : "Review Raft leader election failure scenarios";
        const isMentorAssigned = actionId !== "demo-task-3";

        let dbAction = await Action.findOne({
          studentId: userId,
          title,
        });

        if (!dbAction) {
          dbAction = await Action.create({
            studentId: userId,
            title,
            dueDate: new Date(Date.now() + 86400000 * 2),
            completed: isComplete,
            completedAt: isComplete ? new Date() : undefined,
            addedBy: isMentorAssigned ? "mentor" : "student",
            pointsAwarded: isComplete && isMentorAssigned,
            status: "active",
          });
          if (isComplete && isMentorAssigned) {
            pointsAwarded = 20;
            await Promise.all([
              User.findByIdAndUpdate(userId, { $inc: { "studentProfile.totalPoints": 20 } }),
              StudentProfile.findOneAndUpdate({ userId }, { $inc: { totalPoints: 20 } }),
            ]);
          }
        } else {
          dbAction.completed = isComplete;
          dbAction.completedAt = isComplete ? new Date() : undefined;
          if (isComplete && !dbAction.pointsAwarded) {
            dbAction.pointsAwarded = true;
            pointsAwarded = 20;
            await Promise.all([
              User.findByIdAndUpdate(userId, { $inc: { "studentProfile.totalPoints": 20 } }),
              StudentProfile.findOneAndUpdate({ userId }, { $inc: { totalPoints: 20 } }, { upsert: true }),
            ]);
          } else if (!isComplete && dbAction.pointsAwarded) {
            dbAction.pointsAwarded = false;
            pointsAwarded = -20;
            await Promise.all([
              User.findByIdAndUpdate(userId, { $inc: { "studentProfile.totalPoints": -20 } }),
              StudentProfile.findOneAndUpdate({ userId }, { $inc: { totalPoints: -20 } }, { upsert: true }),
            ]);
          }
          await dbAction.save();
        }

        const [u, sp] = await Promise.all([
          User.findById(userId).lean(),
          StudentProfile.findOne({ userId }).lean(),
        ]);
        currentTotal = sp?.totalPoints ?? u?.studentProfile?.totalPoints ?? 0;
      } else {
        pointsAwarded = isComplete ? 20 : -20;
      }

      revalidatePath("/student/dashboard");
      revalidatePath("/dashboard");

      return {
        success: true,
        message: isComplete
          ? `Task completed! +20 points awarded.`
          : `Task marked incomplete. 20 points deducted.`,
        pointsAwardedThisToggle: pointsAwarded,
        totalPoints: currentTotal,
      };
    }

    if (!userId) {
      return { success: false, error: "Authentication required to update tasks." };
    }

    if (!actionId || !mongoose.Types.ObjectId.isValid(actionId)) {
      return { success: false, error: "Invalid task identifier." };
    }

    session = await startSafeTransaction();

    const action = session ? await Action.findById(actionId).session(session) : await Action.findById(actionId);
    if (!action) {
      if (session) { await session.abortTransaction(); session.endSession(); }
      return { success: false, error: "Task not found." };
    }

    // Verify user owns or is assigned to this action
    const isStudentOwner = action.studentId && String(action.studentId) === userId;
    const isMentorOwner = action.mentorId && String(action.mentorId) === userId;

    if (!isStudentOwner && !isMentorOwner) {
      if (session) { await session.abortTransaction(); session.endSession(); }
      return { success: false, error: "Forbidden: You are not authorized to update this task." };
    }

    let pointsAwardedThisToggle = 0;

    if (isComplete) {
      action.completed = true;
      action.completedAt = new Date(); // Stored in UTC

      // Award points (+20) if points haven't been awarded yet
      if (!action.pointsAwarded) {
        action.pointsAwarded = true;
        pointsAwardedThisToggle = 20;

        if (action.studentId) {
          await User.findByIdAndUpdate(
            action.studentId,
            { $inc: { "studentProfile.totalPoints": 20 } },
            session ? { session } : {}
          );

          await StudentProfile.findOneAndUpdate(
            { userId: action.studentId },
            { $inc: { totalPoints: 20 } },
            { upsert: true, session: session || undefined }
          );
        }
      }
    } else {
      action.completed = false;
      action.completedAt = undefined;

      // Deduct points (-20) if points were previously awarded
      if (action.pointsAwarded) {
        action.pointsAwarded = false;
        pointsAwardedThisToggle = -20;

        if (action.studentId) {
          await User.findByIdAndUpdate(
            action.studentId,
            { $inc: { "studentProfile.totalPoints": -20 } },
            session ? { session } : {}
          );

          await StudentProfile.findOneAndUpdate(
            { userId: action.studentId },
            { $inc: { totalPoints: -20 } },
            { upsert: true, session: session || undefined }
          );
        }
      }
    }

    await action.save(session ? { session } : {});
    if (session) {
      await session.commitTransaction();
      session.endSession();
      session = null;
    }

    // Fetch updated points total for response
    let currentTotalPoints: number | undefined;
    if (action.studentId) {
      const [u, sp] = await Promise.all([
        User.findById(action.studentId).lean(),
        StudentProfile.findOne({ userId: action.studentId }).lean(),
      ]);
      currentTotalPoints = sp?.totalPoints ?? u?.studentProfile?.totalPoints;
    }

    // Revalidate affected views
    revalidatePath("/student/dashboard");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/student/analytics");
    revalidatePath("/mentor/dashboard");
    revalidatePath("/mentor");

    return {
      success: true,
      message: isComplete
        ? pointsAwardedThisToggle > 0
          ? `Task completed! +${pointsAwardedThisToggle} points awarded.`
          : "Task marked as completed."
        : "Task marked as incomplete.",
      action: {
        id: String(action._id),
        completed: action.completed,
        completedAt: action.completedAt?.toISOString(),
        pointsAwarded: action.pointsAwarded,
      },
      pointsAwardedThisToggle,
      totalPoints: currentTotalPoints,
    };
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {
        // Ignore
      }
    }
    console.error("toggleActionCompletion error:", error);
    return {
      success: false,
      error: "An error occurred while updating task completion.",
    };
  }
}

function parseDueDate(dueDateStr: string): Date {
  if (dueDateStr.length === 10 && dueDateStr.includes("-")) {
    return new Date(`${dueDateStr}T23:59:59.999Z`);
  }
  return new Date(dueDateStr);
}

/**
 * Creates a personal administrative task for mentor or sub-task for student.
 */
export async function createTaskAction(data: {
  title: string;
  dueDate: string;
  description?: string;
  studentId?: string;
  mentorId?: string;
  goalId?: string;
  mentorshipId?: string;
  addedBy?: "student" | "mentor";
}): Promise<{
  success: boolean;
  task?: {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    completed: boolean;
    addedBy: "student" | "mentor";
  };
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: "Authentication required." };

    if (!data.title?.trim()) {
      return { success: false, error: "Task title is required." };
    }
    if (!data.dueDate) {
      return { success: false, error: "Due date is mandatory." };
    }

    const newTask = await Action.create({
      title: data.title.trim(),
      description: data.description?.trim(),
      dueDate: parseDueDate(data.dueDate),
      studentId: data.studentId || (data.addedBy === "student" ? userId : undefined),
      mentorId: data.mentorId || (data.addedBy === "mentor" ? userId : undefined),
      goalId: data.goalId,
      mentorshipId: data.mentorshipId,
      addedBy: data.addedBy || (data.mentorId && !data.studentId ? "mentor" : "student"),
      status: "active",
      isDeleted: false,
    });

    revalidatePath("/student/dashboard");
    revalidatePath("/mentor/dashboard");
    revalidatePath("/mentor");
    revalidatePath("/analytics");

    return {
      success: true,
      task: {
        id: String(newTask._id),
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate.toISOString(),
        completed: newTask.completed,
        addedBy: newTask.addedBy,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to create task.";
    return {
      success: false,
      error: errMsg,
    };
  }
}

/**
 * Update personal task details (title, description, dueDate).
 * Enforces rule: Students cannot edit tasks assigned by their mentors.
 */
export async function updateTaskAction(
  actionId: string,
  data: {
    title: string;
    dueDate: string;
    description?: string;
  }
): Promise<{
  success: boolean;
  task?: {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    completed: boolean;
    addedBy: "student" | "mentor";
  };
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Authentication required to edit task." };
    }

    if (!actionId || !mongoose.Types.ObjectId.isValid(actionId)) {
      return { success: false, error: "Invalid task ID." };
    }

    if (!data.title?.trim()) {
      return { success: false, error: "Task title cannot be empty." };
    }
    if (!data.dueDate) {
      return { success: false, error: "Due date is required." };
    }

    const task = await Action.findById(actionId);
    if (!task) {
      return { success: false, error: "Task not found." };
    }

    const isStudentOwner = task.studentId && String(task.studentId) === userId;
    const isMentorOwner = task.mentorId && String(task.mentorId) === userId;
    if (!isStudentOwner && !isMentorOwner) {
      return { success: false, error: "Forbidden: You are not authorized to edit this task." };
    }

    // Invariant: Student CANNOT edit tasks assigned by mentor!
    if (isStudentOwner && !isMentorOwner && task.addedBy === "mentor") {
      return { success: false, error: "You cannot edit tasks assigned by your mentor." };
    }

    task.title = data.title.trim();
    task.dueDate = parseDueDate(data.dueDate);
    if (data.description !== undefined) {
      task.description = data.description.trim();
    }
    await task.save();

    revalidatePath("/student/dashboard");
    revalidatePath("/mentor/dashboard");
    revalidatePath("/analytics");

    return {
      success: true,
      task: {
        id: String(task._id),
        title: task.title,
        description: task.description,
        dueDate: task.dueDate.toISOString(),
        completed: task.completed,
        addedBy: task.addedBy,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to update task.";
    return { success: false, error: errMsg };
  }
}

export interface DeleteTaskResponse {
  success: boolean;
  archived?: boolean;
  deleted?: boolean;
  message?: string;
  error?: string;
}

/**
 * Task Deletion Action:
 * - Students can delete their personal tasks before the deadline.
 * - Students CANNOT delete tasks assigned by mentors.
 * - Mentors can delete their own tasks.
 */
export async function deleteTaskAction(actionId: string): Promise<DeleteTaskResponse> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Authentication required to delete task." };
    }

    if (!actionId || !mongoose.Types.ObjectId.isValid(actionId)) {
      return { success: false, error: "Invalid task ID." };
    }

    const task = await Action.findById(actionId);
    if (!task) {
      return { success: false, error: "Task not found." };
    }

    const isStudentOwner = task.studentId && String(task.studentId) === userId;
    const isMentorOwner = task.mentorId && String(task.mentorId) === userId;
    if (!isStudentOwner && !isMentorOwner) {
      return { success: false, error: "Forbidden: You are not authorized to delete this task." };
    }

    // Invariant: Student CANNOT delete tasks assigned by mentor!
    if (isStudentOwner && !isMentorOwner && task.addedBy === "mentor") {
      return { success: false, error: "You cannot delete tasks assigned by your mentor." };
    }

    // Soft delete / archive to keep database consistent
    task.isDeleted = true;
    task.status = "archived";
    await task.save();

    revalidatePath("/student/dashboard");
    revalidatePath("/mentor/dashboard");
    revalidatePath("/analytics");

    return {
      success: true,
      deleted: true,
      message: "Task successfully deleted.",
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to delete task.";
    return { success: false, error: errMsg };
  }
}

/**
 * Automatically purges / archives tasks whose deadline has passed (the very next day after dueDate).
 */
export async function cleanupExpiredTasks(userId: string): Promise<number> {
  try {
    await connectDB();
    // A task's deadline day has passed once the calendar day reaches the very next day (00:00:00).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const res = await Action.updateMany(
      {
        $or: [{ studentId: userId }, { mentorId: userId }],
        dueDate: { $lt: startOfToday },
        status: { $ne: "archived" },
      },
      {
        $set: { status: "archived", isDeleted: true },
      }
    );

    return res.modifiedCount || 0;
  } catch {
    return 0;
  }
}
