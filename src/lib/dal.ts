import { cache } from "react";
import { connectDB } from "@/lib/db";
import { User, StudentProfile, MentorProfile } from "@/lib/models/User";
import { MentorshipRequest, Mentorship } from "@/lib/models/Mentorship";

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
