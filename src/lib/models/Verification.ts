import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// EXPERTISE TAG MODEL & INTERFACE (M1 Controlled Taxonomy)
// ============================================================================

export interface IExpertiseTag extends Document {
  institutionId?: string;
  name: string;
  category?: string;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export const ExpertiseTagSchema = new Schema<IExpertiseTag>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "expertise_tags",
  }
);

ExpertiseTagSchema.index({ institutionId: 1, name: 1 }, { unique: true });

export const ExpertiseTag: Model<IExpertiseTag> =
  mongoose.models.ExpertiseTag ||
  mongoose.model<IExpertiseTag>("ExpertiseTag", ExpertiseTagSchema);

// ============================================================================
// VERIFICATION DOCUMENT MODEL & INTERFACE (M1 Quarantined Evidence)
// ============================================================================

export interface IVerificationDocument extends Document {
  institutionId?: string;
  verificationRequestId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  objectKey: string;
  fileName: string;
  fileUrl: string;
  declaredContentType?: string;
  detectedContentType?: string;
  sizeBytes?: number;
  status: "pending_upload" | "validating" | "approved" | "rejected";
  validationMessage?: string;
  uploadedAt?: Date;
  validatedAt?: Date;
  scannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const VerificationDocumentSchema = new Schema<IVerificationDocument>(
  {
    institutionId: {
      type: String,
      default: "INST-001",
      index: true,
    },
    verificationRequestId: {
      type: Schema.Types.ObjectId,
      ref: "VerificationRequest",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    objectKey: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    declaredContentType: {
      type: String,
      trim: true,
    },
    detectedContentType: {
      type: String,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending_upload", "validating", "approved", "rejected"],
      default: "pending_upload",
      index: true,
    },
    validationMessage: {
      type: String,
      trim: true,
    },
    uploadedAt: {
      type: Date,
    },
    validatedAt: {
      type: Date,
    },
    scannedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "verification_documents",
  }
);

export const VerificationDocument: Model<IVerificationDocument> =
  mongoose.models.VerificationDocument ||
  mongoose.model<IVerificationDocument>("VerificationDocument", VerificationDocumentSchema);

// ============================================================================
// VERIFICATION REQUEST MODEL & INTERFACE (M1 Workflow)
// ============================================================================

export interface IVerificationRequest extends Document {
  institutionId?: string;
  alumnusId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  institutionalIdentifier: string;
  graduationYear?: number;
  degree?: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: Date;
  decidedAt?: Date;
  decidedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  documents?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export const VerificationRequestSchema = new Schema<IVerificationRequest>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    institutionalIdentifier: {
      type: String,
      required: true,
      trim: true,
    },
    graduationYear: {
      type: Number,
    },
    degree: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    decidedAt: {
      type: Date,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    documents: [
      {
        type: Schema.Types.ObjectId,
        ref: "VerificationDocument",
      },
    ],
  },
  {
    timestamps: true,
    collection: "verification_requests",
  }
);

VerificationRequestSchema.index({ institutionId: 1, status: 1 });
VerificationRequestSchema.index({ institutionId: 1, status: 1, submittedAt: -1 });
VerificationRequestSchema.index({ userId: 1, createdAt: -1 });

export const VerificationRequest: Model<IVerificationRequest> =
  mongoose.models.VerificationRequest ||
  mongoose.model<IVerificationRequest>("VerificationRequest", VerificationRequestSchema);
