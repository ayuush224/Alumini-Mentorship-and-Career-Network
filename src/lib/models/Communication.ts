import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// MESSAGE MODEL & INTERFACE
// ============================================================================

export interface IMessage extends Document {
  mentorshipId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: "student" | "mentor";
  content?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = new Schema<IMessage>(
  {
    mentorshipId: {
      type: Schema.Types.ObjectId,
      ref: "Mentorship",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "mentor"],
      required: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    fileUrl: {
      type: String,
      default: null,
      trim: true,
    },
    fileName: {
      type: String,
      default: null,
      trim: true,
    },
    fileType: {
      type: String,
      default: null,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// CRUCIAL COMPOUND INDEX: Ultra-fast reverse-chronological message history sorting
MessageSchema.index({ mentorshipId: 1, createdAt: -1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

// ============================================================================
// SHARED NOTE MODEL & INTERFACE
// ============================================================================

export interface ISharedNote extends Document {
  mentorId: mongoose.Types.ObjectId;
  menteeId?: mongoose.Types.ObjectId | null;
  isAllMentees?: boolean;
  sessionId?: mongoose.Types.ObjectId | null;
  title: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SharedNoteSchema = new Schema<ISharedNote>(
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
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 10000,
    },
    fileUrl: {
      type: String,
      default: null,
      trim: true,
    },
    fileName: {
      type: String,
      default: null,
      trim: true,
    },
    fileType: {
      type: String,
      default: null,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// COMPOUND INDEX: Fast reverse-chronological retrieval of a mentor's shared notes
SharedNoteSchema.index({ mentorId: 1, createdAt: -1 });
SharedNoteSchema.index({ mentorId: 1, menteeId: 1, createdAt: -1 });

// Ensure hot-reloading in development doesn't retain old schema definitions without fileUrl
if (mongoose.models.SharedNote && !mongoose.models.SharedNote.schema.path("fileUrl")) {
  delete (mongoose.models as Record<string, unknown>).SharedNote;
}

export const SharedNote: Model<ISharedNote> =
  mongoose.models.SharedNote || mongoose.model<ISharedNote>("SharedNote", SharedNoteSchema);
