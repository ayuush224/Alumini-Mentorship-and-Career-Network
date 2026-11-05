import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// MATCH SCORE MODEL & INTERFACE (M4 Matching Snapshot)
// ============================================================================

export interface IMatchScore extends Document {
  institutionId?: string;
  studentProfileId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  alumnusId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  score: number;
  rank?: number;
  reasons: string[];
  matchingVersion?: string;
  generatedAt: Date;
  createdAt: Date;
}

export const MatchScoreSchema = new Schema<IMatchScore>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    studentProfileId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    alumnusId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    rank: {
      type: Number,
    },
    reasons: {
      type: [String],
      default: [],
    },
    matchingVersion: {
      type: String,
      default: "v1.0",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "match_scores",
  }
);

MatchScoreSchema.index({ studentId: 1, mentorId: 1 });

export const MatchScore: Model<IMatchScore> =
  mongoose.models.MatchScore ||
  mongoose.model<IMatchScore>("MatchScore", MatchScoreSchema);

// ============================================================================
// ENGAGEMENT SNAPSHOT MODEL & INTERFACE (M8 Engagement & Health Monitoring)
// ============================================================================

export interface IEngagementSnapshot extends Document {
  institutionId?: string;
  mentorshipId: mongoose.Types.ObjectId;
  status: "thriving" | "healthy" | "at_risk" | "stalled";
  score?: number;
  lastMeaningfulActivityAt?: Date;
  daysSinceLastActivity?: number;
  criteriaVersion?: string;
  nudgeIssuedAt?: Date;
  assessedAt: Date;
  createdAt: Date;
}

export const EngagementSnapshotSchema = new Schema<IEngagementSnapshot>(
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
    status: {
      type: String,
      enum: ["thriving", "healthy", "at_risk", "stalled"],
      required: true,
      index: true,
    },
    score: {
      type: Number,
    },
    lastMeaningfulActivityAt: {
      type: Date,
    },
    daysSinceLastActivity: {
      type: Number,
    },
    criteriaVersion: {
      type: String,
      default: "v1.0",
    },
    nudgeIssuedAt: {
      type: Date,
    },
    assessedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "engagement_snapshots",
  }
);

export const EngagementSnapshot: Model<IEngagementSnapshot> =
  mongoose.models.EngagementSnapshot ||
  mongoose.model<IEngagementSnapshot>("EngagementSnapshot", EngagementSnapshotSchema);

// ============================================================================
// PLACEMENT OUTCOME MODEL & INTERFACE (M10 Outcomes Correlation)
// ============================================================================

export interface IPlacementOutcome extends Document {
  institutionId?: string;
  studentId: mongoose.Types.ObjectId;
  studentProfileId?: mongoose.Types.ObjectId;
  company: string;
  role: string;
  industry?: string;
  offerDate?: Date;
  verifiedByInstitution: boolean;
  mentorshipAssisted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PlacementOutcomeSchema = new Schema<IPlacementOutcome>(
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
    company: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    offerDate: {
      type: Date,
    },
    verifiedByInstitution: {
      type: Boolean,
      default: false,
    },
    mentorshipAssisted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "placement_outcomes",
  }
);

export const PlacementOutcome: Model<IPlacementOutcome> =
  mongoose.models.PlacementOutcome ||
  mongoose.model<IPlacementOutcome>("PlacementOutcome", PlacementOutcomeSchema);

// ============================================================================
// PROGRAMME CONFIGURATION MODEL & INTERFACE (M10 & Cross-Cutting Policies)
// ============================================================================

export interface IProgrammeConfiguration extends Document {
  institutionId: string;
  maxPendingRequestsPerStudent: number;
  requestExpiryDays: number;
  defaultMaxMentees: number;
  inactivityNudgeDays: number;
  nudgeCooldownDays: number;
  allowStudentScheduling: boolean;
  requireAdminVerification: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const ProgrammeConfigurationSchema = new Schema<IProgrammeConfiguration>(
  {
    institutionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    maxPendingRequestsPerStudent: {
      type: Number,
      default: 3,
    },
    requestExpiryDays: {
      type: Number,
      default: 14,
    },
    defaultMaxMentees: {
      type: Number,
      default: 2,
    },
    inactivityNudgeDays: {
      type: Number,
      default: 14,
    },
    nudgeCooldownDays: {
      type: Number,
      default: 7,
    },
    allowStudentScheduling: {
      type: Boolean,
      default: true,
    },
    requireAdminVerification: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "programme_configurations",
  }
);

export const ProgrammeConfiguration: Model<IProgrammeConfiguration> =
  mongoose.models.ProgrammeConfiguration ||
  mongoose.model<IProgrammeConfiguration>("ProgrammeConfiguration", ProgrammeConfigurationSchema);

// ============================================================================
// AUDIT ENTRY MODEL & INTERFACE (Cross-Cutting Compliance Log)
// ============================================================================

export interface IAuditEntry extends Document {
  institutionId?: string;
  actorId?: mongoose.Types.ObjectId;
  actorRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
}

export const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    actorRole: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_entries",
  }
);

export const AuditEntry: Model<IAuditEntry> =
  mongoose.models.AuditEntry ||
  mongoose.model<IAuditEntry>("AuditEntry", AuditEntrySchema);

// Convenient alias for AuditLog
export const AuditLog: Model<IAuditEntry> = AuditEntry;

// ============================================================================
// OUTBOX EVENT MODEL & INTERFACE (Cross-Cutting Reliable Async Events)
// ============================================================================

export interface IOutboxEvent extends Document {
  institutionId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "dispatched" | "failed";
  attempts: number;
  error?: string;
  dispatchedAt?: Date;
  createdAt: Date;
}

export const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "dispatched", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
    dispatchedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "outbox_events",
  }
);

export const OutboxEvent: Model<IOutboxEvent> =
  mongoose.models.OutboxEvent ||
  mongoose.model<IOutboxEvent>("OutboxEvent", OutboxEventSchema);
