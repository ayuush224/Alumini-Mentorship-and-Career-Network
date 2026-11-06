import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// STUDENT PROFILE SUB-INTERFACES & SCHEMAS
// ============================================================================

export interface IProject {
  title: string;
  description?: string;
  liveLink?: string;
  githubLink?: string;
  techStack: string[];
}

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    liveLink: { type: String, trim: true },
    githubLink: { type: String, trim: true },
    techStack: { type: [String], default: [] },
  },
  { _id: false }
);

export interface IStudentExperience {
  role: string;
  company: string;
  startDate?: Date;
  endDate?: Date;
  current?: boolean;
  description?: string;
}

const StudentExperienceSchema = new Schema<IStudentExperience>(
  {
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true },
  },
  { _id: false }
);

export interface ICodingProfile {
  platform: string;
  username?: string;
  url?: string;
  synced?: boolean;
}

export interface ISocialLink {
  platform: string;
  url: string;
}

export interface IOtherLink {
  title: string;
  url: string;
}

export interface IStudentProfileData {
  avatarUrl?: string;
  avatarPublicId?: string;
  bannerUrl?: string;
  bannerPublicId?: string;
  bio?: string;
  cgpa?: number;
  skills: string[];
  achievements: string[];
  extracurriculars: string[];
  totalPoints: number;
  projects: IProject[];
  experience: IStudentExperience[];
  // Platform discovery fields
  major?: string;
  graduationYear?: number;
  targetIndustries?: string[];
  skillsToDevelop?: string[];
  codingProfiles?: ICodingProfile[];
  socialLinks?: ISocialLink[];
  otherLinks?: IOtherLink[];
}

export const StudentProfileSchema = new Schema<IStudentProfileData>(
  {
    avatarUrl: { type: String, trim: true },
    avatarPublicId: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    bannerPublicId: { type: String, trim: true },
    bio: { type: String, trim: true },
    cgpa: { type: Number, min: 0, max: 10 },
    skills: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    extracurriculars: { type: [String], default: [] },
    totalPoints: { type: Number, default: 0 },
    projects: { type: [ProjectSchema], default: [] },
    experience: { type: [StudentExperienceSchema], default: [] },
    major: { type: String, trim: true },
    graduationYear: { type: Number },
    targetIndustries: { type: [String], default: [] },
    skillsToDevelop: { type: [String], default: [] },
    codingProfiles: {
      type: [
        {
          platform: { type: String, required: true },
          username: { type: String, trim: true },
          url: { type: String, trim: true },
          synced: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    socialLinks: {
      type: [
        {
          platform: { type: String, required: true },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    otherLinks: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

// Standalone document interface for StudentProfile collection
export interface IStudentProfile extends Document, IStudentProfileData {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StandaloneStudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    avatarUrl: { type: String, trim: true },
    avatarPublicId: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    bannerPublicId: { type: String, trim: true },
    bio: { type: String, trim: true },
    cgpa: { type: Number, min: 0, max: 10 },
    skills: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    extracurriculars: { type: [String], default: [] },
    totalPoints: { type: Number, default: 0 },
    projects: { type: [ProjectSchema], default: [] },
    experience: { type: [StudentExperienceSchema], default: [] },
    major: { type: String, default: "Undeclared", trim: true },
    graduationYear: { type: Number, default: () => new Date().getFullYear() + 2 },
    targetIndustries: { type: [String], default: [] },
    skillsToDevelop: { type: [String], default: [] },
    codingProfiles: {
      type: [
        {
          platform: { type: String, required: true },
          username: { type: String, trim: true },
          url: { type: String, trim: true },
          synced: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    socialLinks: {
      type: [
        {
          platform: { type: String, required: true },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    otherLinks: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// ============================================================================
// MENTOR PROFILE SUB-INTERFACES & SCHEMAS
// ============================================================================

export interface IMentorSkill {
  name: string;
  endorsements: number;
}

const MentorSkillSchema = new Schema<IMentorSkill>(
  {
    name: { type: String, required: true, trim: true },
    endorsements: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

export interface IMentorshipArea {
  title: string;
  description?: string;
  icon?: string;
}

const MentorshipAreaSchema = new Schema<IMentorshipArea>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
  },
  { _id: false }
);

export interface IMentorExperience {
  role: string;
  company: string;
  type?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  bullets: string[];
  skills: string[];
}

const MentorExperienceSchema = new Schema<IMentorExperience>(
  {
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    location: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    bullets: { type: [String], default: [] },
    skills: { type: [String], default: [] },
  },
  { _id: false }
);

export interface ICurrentCompany {
  name: string;
  logoUrl?: string;
  since?: Date;
}

const CurrentCompanySchema = new Schema<ICurrentCompany>(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, trim: true },
    since: { type: Date },
  },
  { _id: false }
);

export interface IFeaturedWork {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  tags: string[];
  link?: string;
}

const FeaturedWorkSchema = new Schema<IFeaturedWork>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
    tags: { type: [String], default: [] },
    link: { type: String, trim: true },
  },
  { _id: false }
);

export interface IReview {
  menteeId?: mongoose.Types.ObjectId;
  rating: number;
  quote?: string;
  date?: Date;
  outcome?: string;
}

const ReviewSchema = new Schema<IReview>(
  {
    menteeId: { type: Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    quote: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    outcome: { type: String, trim: true },
  },
  { _id: false }
);

export interface IMentorProfileData {
  avatarUrl?: string;
  avatarPublicId?: string;
  bannerUrl?: string;
  bannerPublicId?: string;
  bio?: string;
  headline?: string;
  availability: "open" | "waitlist";
  skills: IMentorSkill[];
  mentorshipAreas: IMentorshipArea[];
  experience: IMentorExperience[];
  currentCompany?: ICurrentCompany;
  featuredWork: IFeaturedWork[];
  reviews: IReview[];
  totalMentees: number;
  sessionsCompleted: number;
  // Platform discovery fields
  company?: string;
  jobTitle?: string;
  industry?: string;
  expertiseTags?: string[];
  isVerified?: boolean;
  verifiedAt?: Date;
}

export const MentorProfileSchema = new Schema<IMentorProfileData>(
  {
    avatarUrl: { type: String, trim: true },
    avatarPublicId: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    bannerPublicId: { type: String, trim: true },
    bio: { type: String, trim: true },
    headline: { type: String, trim: true },
    availability: {
      type: String,
      enum: ["open", "waitlist"],
      default: "open",
      required: true,
    },
    skills: { type: [MentorSkillSchema], default: [] },
    mentorshipAreas: { type: [MentorshipAreaSchema], default: [] },
    experience: { type: [MentorExperienceSchema], default: [] },
    currentCompany: { type: CurrentCompanySchema },
    featuredWork: { type: [FeaturedWorkSchema], default: [] },
    reviews: { type: [ReviewSchema], default: [] },
    totalMentees: { type: Number, default: 0, min: 0 },
    sessionsCompleted: { type: Number, default: 0, min: 0 },
    company: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    industry: { type: String, trim: true },
    expertiseTags: { type: [String], default: [] },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

// Standalone document interface for MentorProfile / AlumniProfile collection
export interface IMentorProfile extends Document, IMentorProfileData {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StandaloneMentorProfileSchema = new Schema<IMentorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    avatarUrl: { type: String, trim: true },
    avatarPublicId: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    bannerPublicId: { type: String, trim: true },
    bio: { type: String, trim: true },
    headline: { type: String, trim: true },
    availability: {
      type: String,
      enum: ["open", "waitlist"],
      default: "open",
      required: true,
    },
    skills: { type: [MentorSkillSchema], default: [] },
    mentorshipAreas: { type: [MentorshipAreaSchema], default: [] },
    experience: { type: [MentorExperienceSchema], default: [] },
    currentCompany: { type: CurrentCompanySchema },
    featuredWork: { type: [FeaturedWorkSchema], default: [] },
    reviews: { type: [ReviewSchema], default: [] },
    totalMentees: { type: Number, default: 0, min: 0 },
    sessionsCompleted: { type: Number, default: 0, min: 0 },
    company: { type: String, default: "Independent", trim: true },
    jobTitle: { type: String, default: "Mentor", trim: true },
    industry: { type: String, default: "Technology", trim: true },
    expertiseTags: { type: [String], default: [] },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

// ============================================================================
// EXPANDED USER SCHEMA
// ============================================================================

export type UserRole =
  | "student"
  | "alumni"
  | "administrator"
  | "alumni_relations_officer"
  | "placement_officer"
  | "alumni_mentor";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  name?: string;
  designation?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  role: UserRole;
  institutionId?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  studentProfile?: IStudentProfileData;
  mentorProfile?: IMentorProfileData;
  verificationStatus?: "pending" | "verified" | "rejected";
  isVerified?: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    designation: { type: String, trim: true, default: "Director of Alumni Relations & Mentorship Governance" },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        "student",
        "alumni",
        "administrator",
        "alumni_relations_officer",
        "placement_officer",
        "alumni_mentor",
      ],
      default: "student",
      required: true,
    },
    institutionId: {
      type: String,
      trim: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      trim: true,
    },
    studentProfile: {
      type: StudentProfileSchema,
    },
    mentorProfile: {
      type: MentorProfileSchema,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    isVerified: {
      type: Boolean,
      default: false,
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

// Exclude soft-deleted users automatically
function excludeDeletedUsers(this: mongoose.Query<unknown, unknown>) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
}
UserSchema.pre("find", excludeDeletedUsers);
UserSchema.pre("findOne", excludeDeletedUsers);
UserSchema.pre("countDocuments", excludeDeletedUsers);

// ============================================================================
// MODEL EXPORTS (With Next.js hot-reload safe pattern)
// ============================================================================

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>("StudentProfile", StandaloneStudentProfileSchema);

export const MentorProfile: Model<IMentorProfile> =
  mongoose.models.MentorProfile ||
  mongoose.model<IMentorProfile>("MentorProfile", StandaloneMentorProfileSchema, "alumniprofiles");

// AlumniProfile alias for backward compatibility with Phase 2 models
export const AlumniProfile: Model<IMentorProfile> =
  mongoose.models.AlumniProfile ||
  mongoose.model<IMentorProfile>("AlumniProfile", StandaloneMentorProfileSchema, "alumniprofiles");

// Canonical Alumnus alias from CES Database Design specification
export const Alumnus: Model<IMentorProfile> = MentorProfile;
export type IAlumnus = IMentorProfile;

export default User;
