import { cache } from "react";
import { connectDB } from "@/lib/db";
import { User, StudentProfile, MentorProfile, AlumniProfile } from "@/lib/models/User";
import { MentorshipRequest, Mentorship, MentorCapacity } from "@/lib/models/Mentorship";
import { getCached, setCached, invalidateCache } from "@/lib/redis";
import { REDIS_MENTORS_CACHE_TTL_SECONDS } from "@/lib/config";

/**
 * Request-scoped memoized data access layer for Next.js App Router (RSC).
 * Using React.cache() guarantees that if both Layout and Page call these
 * functions during the same server request, the database is queried only ONCE.
 */

export const getCachedUser = cache(async (userId: string) => {
  if (!userId) return null;
  await connectDB();
  return User.findById(userId).lean();
});

export const getCachedStudentProfile = cache(async (userId: string) => {
  if (!userId) return null;
  await connectDB();
  return StudentProfile.findOne({ userId }).lean();
});

export const getCachedMentorProfile = cache(async (userId: string) => {
  if (!userId) return null;
  await connectDB();
  return MentorProfile.findOne({ userId }).lean();
});

export const getCachedPendingRequestsCount = cache(async (mentorId: string) => {
  if (!mentorId) return 0;
  await connectDB();
  return MentorshipRequest.countDocuments({
    mentorId,
    status: "pending",
  });
});

export const getCachedActiveMentorships = cache(async (studentId: string) => {
  if (!studentId) return [];
  await connectDB();
  return Mentorship.find({
    studentId,
    status: "active",
    isDeleted: { $ne: true },
  })
    .select("mentorId")
    .lean();
});

// ---------------------------------------------------------------------------
// DISTRIBUTED MENTOR DIRECTORY CACHING (UPSTASH REDIS)
// ---------------------------------------------------------------------------

export interface CachedMentorBase {
  id: string;
  mentorId: string;
  name: string;
  company: string;
  jobTitle: string;
  industry: string;
  expertiseTags: string[];
  maxMentees: number;
  activeMentees: number;
}

export const MENTORS_DIRECTORY_CACHE_KEY = "mentors:base_directory";

/**
 * Retrieves the base verified alumni mentor directory.
 * Served directly from Upstash Redis if cached; falls back to MongoDB on miss
 * and populates the cache for subsequent platform-wide requests.
 */
export async function getBaseMentorDirectory(): Promise<CachedMentorBase[]> {
  // 1. Check Upstash Redis cache
  const cached = await getCached<CachedMentorBase[]>(MENTORS_DIRECTORY_CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  // 2. Fetch from MongoDB
  await connectDB();

  // Strictly filter for alumni who are verified by an alumni officer
  const verifiedUsers = (await User.find({
    role: { $in: ["alumni", "alumni_mentor"] },
    isVerified: true,
    verificationStatus: "verified",
    isDeleted: { $ne: true },
  })
    .select("_id name mentorProfile")
    .lean()) as unknown as Array<{
      _id: unknown;
      name?: string;
      mentorProfile?: Record<string, unknown>;
    }>;

  if (verifiedUsers.length === 0) {
    return [];
  }

  const verifiedUserIds = verifiedUsers.map((u) => String(u._id));
  const verifiedUserMap = new Map(verifiedUsers.map((u) => [String(u._id), u]));

  interface CapacityRecord {
    _id: unknown;
    mentorId: string;
    maxMentees: number;
    activeMentees: number;
    acceptingRequests?: boolean;
  }

  const availableCapacities = (await MentorCapacity.find({
    mentorId: { $in: verifiedUserIds },
    acceptingRequests: { $ne: false },
    status: { $ne: "paused" },
    $expr: { $lt: ["$activeMentees", "$maxMentees"] },
  }).lean()) as unknown as CapacityRecord[];

  if (availableCapacities.length === 0) {
    return [];
  }

  const availableMentorIds: string[] = availableCapacities.map((c) => String(c.mentorId));
  const capacityMap = new Map(
    availableCapacities.map((c) => [String(c.mentorId), c])
  );

  const combinedProfiles = (await AlumniProfile.find({
    userId: { $in: availableMentorIds },
    isVerified: { $ne: false },
  }).lean()) as unknown as Array<{
    _id: unknown;
    userId: unknown;
    company?: string;
    jobTitle?: string;
    industry?: string;
    expertiseTags?: string[];
    availability?: string;
  }>;

  const profileMap = new Map(
    combinedProfiles.map((p) => [String(p.userId), p])
  );

  const sanitizedDirectory: CachedMentorBase[] = availableCapacities
    .map((capacity) => {
      const mentorUserId = String(capacity.mentorId);
      const userDoc = verifiedUserMap.get(mentorUserId);
      if (!userDoc) return null;

      const standalone = profileMap.get(mentorUserId);
      const embedded = (userDoc.mentorProfile || {}) as Record<string, unknown>;

      // Strictly exclude mentors whose availability is stopped or waitlist
      const isStopped =
        embedded?.availability === "stopped" ||
        embedded?.availability === "waitlist" ||
        standalone?.availability === "stopped" ||
        standalone?.availability === "waitlist" ||
        capacity.acceptingRequests === false;

      if (isStopped) return null;

      const maxMentees = capacity.maxMentees ?? 1;
      const activeMentees = capacity.activeMentees ?? 0;

      return {
        id: String(standalone?._id || userDoc._id),
        mentorId: mentorUserId,
        name: userDoc.name || "Alumni Mentor",
        company: (standalone?.company || embedded?.company || "Independent") as string,
        jobTitle: (standalone?.jobTitle || embedded?.jobTitle || "Mentor") as string,
        industry: (standalone?.industry || embedded?.industry || "Technology") as string,
        expertiseTags: (
          (standalone?.expertiseTags?.length ? standalone.expertiseTags : embedded?.expertiseTags) || []
        ) as string[],
        maxMentees,
        activeMentees,
      };
    })
    .filter((m): m is CachedMentorBase => m !== null);

  if (sanitizedDirectory.length > 0) {
    await setCached(
      MENTORS_DIRECTORY_CACHE_KEY,
      sanitizedDirectory,
      REDIS_MENTORS_CACHE_TTL_SECONDS
    );
  }

  return sanitizedDirectory;
}

/**
 * Invalidates the base mentor directory cache (called when mentor status or capacity changes).
 */
export async function invalidateMentorDirectoryCache(): Promise<void> {
  await invalidateCache(MENTORS_DIRECTORY_CACHE_KEY);
}
