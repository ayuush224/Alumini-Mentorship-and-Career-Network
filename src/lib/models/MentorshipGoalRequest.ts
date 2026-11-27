import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAvailabilitySlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00" (HH:MM 24h format)
  endTime: string;   // "11:00"
}

export const AvailabilitySlotSchema = new Schema<IAvailabilitySlot>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false }
);

export interface IMentorshipGoalRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  institutionId: string;
  title: string;
  goal: string;
  needs: string[];
  targetRole?: string;
  targetIndustry?: string;
  problemDescription?: string;
  preferredMentoringStyle?: "hands_on" | "strategic" | "structured" | "casual" | "any";
  preferredLanguage?: string;
  meetingPreference?: "remote" | "in_person" | "hybrid";
  availabilitySchedule?: IAvailabilitySlot[];
  status: "active" | "draft" | "fulfilled" | "archived";
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export const MentorshipGoalRequestSchema = new Schema<IMentorshipGoalRequest>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    institutionId: {
      type: String,
      default: "INST-001",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
    },
    needs: {
      type: [String],
      default: [],
      index: true,
    },
    targetRole: {
      type: String,
      trim: true,
    },
    targetIndustry: {
      type: String,
      trim: true,
    },
    problemDescription: {
      type: String,
      trim: true,
    },
    preferredMentoringStyle: {
      type: String,
      enum: ["hands_on", "strategic", "structured", "casual", "any"],
      default: "any",
    },
    preferredLanguage: {
      type: String,
      default: "English",
      trim: true,
    },
    meetingPreference: {
      type: String,
      enum: ["remote", "in_person", "hybrid"],
      default: "remote",
    },
    availabilitySchedule: {
      type: [AvailabilitySlotSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "draft", "fulfilled", "archived"],
      default: "active",
      index: true,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: "mentorship_goal_requests",
  }
);

MentorshipGoalRequestSchema.index({ studentId: 1, status: 1 });
MentorshipGoalRequestSchema.index({ institutionId: 1, status: 1 });

export const MentorshipGoalRequest: Model<IMentorshipGoalRequest> =
  mongoose.models.MentorshipGoalRequest ||
  mongoose.model<IMentorshipGoalRequest>(
    "MentorshipGoalRequest",
    MentorshipGoalRequestSchema
  );

export default MentorshipGoalRequest;
