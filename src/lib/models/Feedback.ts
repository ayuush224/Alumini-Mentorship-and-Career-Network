import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// FEEDBACK MODEL & INTERFACE (M7 Bidirectional Feedback)
// ============================================================================

export interface IFeedback extends Document {
  institutionId?: string;
  mentorshipId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  submittedByRole: "student" | "mentor";
  rating: number; // 1 to 5
  comments?: string;
  aspects?: {
    preparation?: number;
    punctuality?: number;
    guidanceQuality?: number;
    actionability?: number;
  };
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const FeedbackSchema = new Schema<IFeedback>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    mentorshipId: {
      type: Schema.Types.ObjectId,
      ref: "Mentorship",
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    submittedByRole: {
      type: String,
      enum: ["student", "mentor"],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comments: {
      type: String,
      trim: true,
    },
    aspects: {
      preparation: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      guidanceQuality: { type: Number, min: 1, max: 5 },
      actionability: { type: Number, min: 1, max: 5 },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "feedback",
  }
);

FeedbackSchema.index({ mentorshipId: 1, submittedBy: 1, sessionId: 1 });

export const Feedback: Model<IFeedback> =
  mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
