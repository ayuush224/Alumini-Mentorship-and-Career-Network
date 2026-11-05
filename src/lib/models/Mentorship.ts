import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// MENTORSHIP REQUEST MODEL & INTERFACE
// ============================================================================

export interface IMentorshipRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined";
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const MentorshipRequestSchema = new Schema<IMentorshipRequest>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to prevent multiple pending requests between the same student and mentor
MentorshipRequestSchema.index({ studentId: 1, mentorId: 1, status: 1 });

// ============================================================================
// ACTIVE MENTORSHIP MODEL & INTERFACE
// ============================================================================

export interface IMentorship extends Document {
  studentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  startDate: Date;
  status: "active" | "completed" | "terminated";
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const MentorshipSchema = new Schema<IMentorship>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "terminated"],
      default: "active",
      required: true,
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

// Exclude soft-deleted mentorships automatically
function excludeDeletedMentorships(this: mongoose.Query<unknown, unknown>) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
}
MentorshipSchema.pre("find", excludeDeletedMentorships);
MentorshipSchema.pre("findOne", excludeDeletedMentorships);
MentorshipSchema.pre("countDocuments", excludeDeletedMentorships);

// Unique index to prevent duplicate active mentorship pairings
MentorshipSchema.index({ studentId: 1, mentorId: 1, status: 1 });

// ============================================================================
// SESSION MODEL & INTERFACE
// ============================================================================

export interface ISession extends Document {
  mentorId: mongoose.Types.ObjectId;
  menteeId?: mongoose.Types.ObjectId | null;
  isAllMentees?: boolean;
  title: string;
  date: Date;
  time: string;
  durationMinutes: number;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
  noteId?: mongoose.Types.ObjectId | null;
  isDeleted?: boolean;
  prerequisites: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const SessionSchema = new Schema<ISession>(
  {
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    menteeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    isAllMentees: {
      type: Boolean,
      default: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
      min: 15,
      max: 240,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
      required: true,
    },
    noteId: {
      type: Schema.Types.ObjectId,
      ref: "SharedNote",
      default: null,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Exclude soft-deleted sessions automatically
function excludeDeletedSessions(this: mongoose.Query<unknown, unknown>) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
}
SessionSchema.pre("find", excludeDeletedSessions);
SessionSchema.pre("findOne", excludeDeletedSessions);
SessionSchema.pre("countDocuments", excludeDeletedSessions);

// ============================================================================
// MENTOR CAPACITY MODEL & INTERFACE (Invariant 1 Enforcer)
// ============================================================================

export interface IMentorCapacity extends Document {
  mentorId: mongoose.Types.ObjectId;
  maxMentees: number;
  activeMentees: number;
  acceptingRequests?: boolean;
  status?: "available" | "near_capacity" | "at_capacity" | "paused";
  createdAt: Date;
  updatedAt: Date;
}

export const MentorCapacitySchema = new Schema<IMentorCapacity>(
  {
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    maxMentees: {
      type: Number,
      required: true,
      min: 0,
    },
    activeMentees: {
      type: Number,
      default: 0,
      min: 0,
    },
    acceptingRequests: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["available", "near_capacity", "at_capacity", "paused"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const MentorshipRequest: Model<IMentorshipRequest> =
  mongoose.models.MentorshipRequest ||
  mongoose.model<IMentorshipRequest>("MentorshipRequest", MentorshipRequestSchema);

export const Mentorship: Model<IMentorship> =
  mongoose.models.Mentorship ||
  mongoose.model<IMentorship>("Mentorship", MentorshipSchema);

if (mongoose.models.Session && !mongoose.models.Session.schema.path("noteId")) {
  delete (mongoose.models as Record<string, unknown>).Session;
}

export const Session: Model<ISession> =
  mongoose.models.Session ||
  mongoose.model<ISession>("Session", SessionSchema);

export const MentorCapacity: Model<IMentorCapacity> =
  mongoose.models.MentorCapacity ||
  mongoose.model<IMentorCapacity>("MentorCapacity", MentorCapacitySchema);

// ============================================================================
// AVAILABILITY WINDOW MODEL & INTERFACE (M2 Recurring/Calendar Availability)
// ============================================================================

export interface IAvailabilityWindow extends Document {
  institutionId?: string;
  alumnusId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  startAt?: Date;
  endAt?: Date;
  timezone: string;
  recurring: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const AvailabilityWindowSchema = new Schema<IAvailabilityWindow>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    alumnusId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    startAt: {
      type: Date,
    },
    endAt: {
      type: Date,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    recurring: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "availability_windows",
  }
);

export const AvailabilityWindow: Model<IAvailabilityWindow> =
  mongoose.models.AvailabilityWindow ||
  mongoose.model<IAvailabilityWindow>("AvailabilityWindow", AvailabilityWindowSchema);

export default Mentorship;
