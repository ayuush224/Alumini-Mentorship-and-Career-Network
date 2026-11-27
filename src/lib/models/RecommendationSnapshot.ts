import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRecommendedMentorItem {
  mentorId: mongoose.Types.ObjectId;
  rank: number;
  finalScore: number;
  scoreBreakdown: {
    semantic: number;
    skillCoverage: number;
    careerRelevance: number;
    mentoringCapability: number;
    seniority: number;
    availability: number;
    reliability: number;
    rating: number;
  };
  reasons: string[];
}

const RecommendedMentorItemSchema = new Schema<IRecommendedMentorItem>(
  {
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    finalScore: {
      type: Number,
      required: true,
    },
    scoreBreakdown: {
      semantic: { type: Number, default: 0 },
      skillCoverage: { type: Number, default: 0 },
      careerRelevance: { type: Number, default: 0 },
      mentoringCapability: { type: Number, default: 0 },
      seniority: { type: Number, default: 0 },
      availability: { type: Number, default: 0 },
      reliability: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
    },
    reasons: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

export interface IRecommendationSnapshot extends Document {
  requestId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  institutionId: string;
  recommendedMentors: IRecommendedMentorItem[];
  selectedMentorId?: mongoose.Types.ObjectId;
  requestOutcome:
    | "none"
    | "requested"
    | "accepted"
    | "rejected"
    | "session_completed"
    | "goal_achieved";
  weightsUsed: Record<string, number>;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const RecommendationSnapshotSchema = new Schema<IRecommendationSnapshot>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "MentorshipGoalRequest",
      index: true,
    },
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
    recommendedMentors: {
      type: [RecommendedMentorItemSchema],
      default: [],
    },
    selectedMentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    requestOutcome: {
      type: String,
      enum: [
        "none",
        "requested",
        "accepted",
        "rejected",
        "session_completed",
        "goal_achieved",
      ],
      default: "none",
      index: true,
    },
    weightsUsed: {
      type: Map,
      of: Number,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "recommendation_snapshots",
  }
);

RecommendationSnapshotSchema.index({ studentId: 1, generatedAt: -1 });

export const RecommendationSnapshot: Model<IRecommendationSnapshot> =
  mongoose.models.RecommendationSnapshot ||
  mongoose.model<IRecommendationSnapshot>(
    "RecommendationSnapshot",
    RecommendationSnapshotSchema
  );

export default RecommendationSnapshot;
