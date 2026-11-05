import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// MENTOR SESSION DATA MODEL
// ============================================================================

export interface IMentorSession extends Document {
  mentorId: mongoose.Types.ObjectId;
  menteeIds: mongoose.Types.ObjectId[];
  topic?: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  meetingLink: string;
  status: "scheduled" | "cancelled" | "completed";
  requestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const MentorSessionSchema = new Schema<IMentorSession>(
  {
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    menteeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    topic: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 240,
    },
    meetingLink: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
      required: true,
    },
    requestId: {
      type: String,
      trim: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying mentor sessions and checking overlaps
MentorSessionSchema.index({ mentorId: 1, status: 1, startTime: 1, endTime: 1 });

// Multikey index for querying mentee sessions
MentorSessionSchema.index({ menteeIds: 1, startTime: 1 });

// Idempotency index: one request ID per mentor (partial filter ensures null/missing requestIds do not collide)
MentorSessionSchema.index(
  { mentorId: 1, requestId: 1 },
  {
    unique: true,
    partialFilterExpression: { requestId: { $type: "string" } },
  }
);

// ============================================================================
// MENTOR SESSION SLOT (Overlap Guard Collection)
// ============================================================================

export interface IMentorSessionSlot extends Document {
  mentorId: mongoose.Types.ObjectId;
  slot: Date;
  sessionId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export const MentorSessionSlotSchema = new Schema<IMentorSessionSlot>(
  {
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    slot: {
      type: Date,
      required: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "MentorSession",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// CRITICAL UNIQUE CONSTRAINT: Prevents any two sessions for the same mentor
// from occupying the same 5-minute time bucket (race condition safety).
MentorSessionSlotSchema.index({ mentorId: 1, slot: 1 }, { unique: true });

// Safe Mongoose model registration for Next.js hot module reloading
export const MentorSession: Model<IMentorSession> =
  (mongoose.models.MentorSession as Model<IMentorSession>) ||
  mongoose.model<IMentorSession>("MentorSession", MentorSessionSchema);

export const MentorSessionSlot: Model<IMentorSessionSlot> =
  (mongoose.models.MentorSessionSlot as Model<IMentorSessionSlot>) ||
  mongoose.model<IMentorSessionSlot>("MentorSessionSlot", MentorSessionSlotSchema);
