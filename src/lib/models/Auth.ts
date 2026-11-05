import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// REFRESH TOKEN MODEL & INTERFACE
// ============================================================================

export interface IAuthRefreshToken extends Document {
  tokenHash: string;
  family: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export const AuthRefreshTokenSchema = new Schema<IAuthRefreshToken>({
  tokenHash: {
    type: String,
    required: true,
    index: true,
  },
  family: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================================================
// RATE LIMIT MODEL & INTERFACE
// ============================================================================

export interface IAuthRateLimit extends Document {
  key: string;
  attempts: number;
  resetAt: Date;
}

export const AuthRateLimitSchema = new Schema<IAuthRateLimit>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  resetAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

// ============================================================================
// EMAIL OTP MODEL & INTERFACE
// ============================================================================

export interface IAuthEmailOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

export const AuthEmailOtpSchema = new Schema<IAuthEmailOtp>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const AuthRefreshToken: Model<IAuthRefreshToken> =
  mongoose.models.AuthRefreshToken ||
  mongoose.model<IAuthRefreshToken>("AuthRefreshToken", AuthRefreshTokenSchema);

export const AuthRateLimit: Model<IAuthRateLimit> =
  mongoose.models.AuthRateLimit ||
  mongoose.model<IAuthRateLimit>("AuthRateLimit", AuthRateLimitSchema);

export const AuthEmailOtp: Model<IAuthEmailOtp> =
  mongoose.models.AuthEmailOtp ||
  mongoose.model<IAuthEmailOtp>("AuthEmailOtp", AuthEmailOtpSchema);
