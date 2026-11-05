import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// INSTITUTION MODEL & INTERFACE (Core Tenant Scope)
// ============================================================================

export interface IInstitution extends Document {
  name: string;
  code: string;
  domain?: string;
  status: "active" | "inactive";
  officeLocation?: string;
  officeHours?: string;
  settings?: {
    allowStudentScheduling?: boolean;
    requireAdminVerification?: boolean;
    maxPendingRequestsPerStudent?: number;
    defaultMaxMentees?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const InstitutionSchema = new Schema<IInstitution>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    officeLocation: {
      type: String,
      trim: true,
      default: "Administration Hall, Suite 402",
    },
    officeHours: {
      type: String,
      trim: true,
      default: "Mon–Fri, 9:00 AM – 5:00 PM",
    },
    settings: {
      allowStudentScheduling: { type: Boolean, default: true },
      requireAdminVerification: { type: Boolean, default: true },
      maxPendingRequestsPerStudent: { type: Number, default: 3 },
      defaultMaxMentees: { type: Number, default: 2 },
    },
  },
  {
    timestamps: true,
    collection: "institutions",
  }
);

export const Institution: Model<IInstitution> =
  mongoose.models.Institution ||
  mongoose.model<IInstitution>("Institution", InstitutionSchema);

export default Institution;
