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
  const availableCapacities = await MentorCapacity.find({
    $expr: { $lt: ["$activeMentees", "$maxMentees"] },
  }).lean();

  if (availableCapacities.length === 0) {
    return [];
  }

  const availableMentorIds = availableCapacities.map((c) => c.mentorId);
  const capacityMap = new Map(
    availableCapacities.map((c) => [String(c.mentorId), c])
  );

  const combinedProfiles = (await AlumniProfile.find({
    userId: { $in: availableMentorIds },
  })
    .populate({ path: "userId", select: "name _id" })
    .lean()) as unknown as Array<{
      _id: unknown;
      userId: unknown;
      company?: string;
      jobTitle?: string;
      industry?: string;
      expertiseTags?: string[];
    }>;

  const sanitizedDirectory: CachedMentorBase[] = combinedProfiles.map((alumni) => {
    const userDoc =
      typeof alumni.userId === "object"
        ? (alumni.userId as { _id?: unknown; name?: string })
        : null;
    const mentorUserId = String(userDoc?._id || alumni.userId);
    const capacity = capacityMap.get(mentorUserId);
    const maxMentees = capacity?.maxMentees ?? 1;
    const activeMentees = capacity?.activeMentees ?? 0;

    return {
      id: String(alumni._id),
      mentorId: mentorUserId,
      name: userDoc?.name || "Alumni Mentor",
      company: alumni.company || "Independent",
      jobTitle: alumni.jobTitle || "Mentor",
      industry: alumni.industry || "Technology",
      expertiseTags: alumni.expertiseTags || [],
      maxMentees,
      activeMentees,
    };
  });

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
