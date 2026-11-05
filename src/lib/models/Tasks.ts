import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// GOAL MODEL & INTERFACE
// ============================================================================

export interface IGoal extends Document {
  studentId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const GoalSchema = new Schema<IGoal>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// UNIVERSAL ACTION (SUB-TASK) MODEL & INTERFACE
// ============================================================================

export interface IAction extends Document {
  title: string;
  description?: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  studentId?: mongoose.Types.ObjectId;
  mentorId?: mongoose.Types.ObjectId;
  goalId?: mongoose.Types.ObjectId;
  mentorshipId?: mongoose.Types.ObjectId;
  addedBy: "student" | "mentor";
  status: "active" | "archived";
  pointsAwarded?: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ActionSchema = new Schema<IAction>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    goalId: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      index: true,
    },
    mentorshipId: {
      type: Schema.Types.ObjectId,
      ref: "Mentorship",
      index: true,
    },
    addedBy: {
      type: String,
      enum: ["student", "mentor"],
      default: function (this: IAction) {
        return this.mentorId && !this.studentId ? "mentor" : "student";
      },
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    pointsAwarded: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Exclude soft-deleted tasks automatically
function excludeDeletedActions(this: mongoose.Query<unknown, unknown>) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
}
ActionSchema.pre("find", excludeDeletedActions);
ActionSchema.pre("findOne", excludeDeletedActions);
ActionSchema.pre("countDocuments", excludeDeletedActions);

// Compound indexes for low-latency aggregations & queries (Step 1)
ActionSchema.index({ studentId: 1, completedAt: -1 });
ActionSchema.index({ mentorId: 1, dueDate: 1 });

// Auto-set or clear completedAt based on completed status
ActionSchema.pre("save", function () {
  if (this.isModified("completed")) {
    if (this.completed && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.completed) {
      this.completedAt = undefined;
    }
  }
});

// ============================================================================
// CAREER GOAL MODEL & INTERFACE (M3 Student Career Milestones)
// ============================================================================

export interface ICareerGoal extends Document {
  institutionId?: string;
  studentId: mongoose.Types.ObjectId;
  studentProfileId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: "not_started" | "in_progress" | "completed";
  deadline?: Date;
  skills?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const CareerGoalSchema = new Schema<ICareerGoal>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentProfileId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true,
    },
    deadline: {
      type: Date,
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "career_goals",
  }
);

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);

export const CareerGoal: Model<ICareerGoal> =
  mongoose.models.CareerGoal ||
  mongoose.model<ICareerGoal>("CareerGoal", CareerGoalSchema);

export const Action: Model<IAction> =
  mongoose.models.Action || mongoose.model<IAction>("Action", ActionSchema);

// Canonical ActionItem alias from CES Database Design specification
export const ActionItem: Model<IAction> = Action;
export type IActionItem = IAction;

// Convenient alias for Task and MentorTask
export const Task: Model<IAction> = Action;
export const MentorTask: Model<IAction> = Action;

export default Action;
