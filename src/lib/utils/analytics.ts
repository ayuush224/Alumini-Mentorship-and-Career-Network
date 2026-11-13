import { unstable_cache } from "next/cache";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Action } from "@/lib/models/Tasks";
import { StudentProfile, User } from "@/lib/models/User";
import { getCached, setCached, invalidateCache } from "@/lib/redis";
import { REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS } from "@/lib/config";

export interface MonthlyAnalyticsItem {
  month: string; // "YYYY-MM"
  label: string; // "Jan", "Feb", etc.
  totalActions: number;
  completedActions: number;
  mentorTotal: number;
  mentorCompleted: number;
  studentTotal: number;
  studentCompleted: number;
  weightedScore: number; // 0 - 100 (80% mentor-weighted, 20% student-weighted)
}

export interface StudentAnalyticsOverview {
  timeline: MonthlyAnalyticsItem[];
  mentorTaskCompleteness: number; // 0 - 100 (for green radial chart)
  studentTaskCompleteness: number; // 0 - 100
  overallCompletionRate: number; // 0 - 100
  totalMentorTasks: number;
  completedMentorTasks: number;
  totalStudentTasks: number;
  completedStudentTasks: number;
  totalPoints: number;
  momentumScore: number;
}

/**
 * Generates the past 12 consecutive month strings ("YYYY-MM").
 */
function getLast12Months(): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    months.push({ key, label });
  }

  return months;
}

/**
 * Step 3: MongoDB Analytics Aggregation Pipeline
 *
 * Runs native aggregation for the student's 12-month performance.
 * Groups by month using $dateToString: { format: "%Y-%m", date: "$createdAt" }.
 * Calculates the 80/20 weighted score natively in the pipeline:
 * - 80% weight for addedBy: 'mentor' completion rate
 * - 20% weight for addedBy: 'student' completion rate
 */
export async function fetchStudent12MonthAnalytics(
  studentId: string
): Promise<StudentAnalyticsOverview> {
  const cacheKey = `analytics:student:${studentId}`;

  // 1. Check Upstash Redis cache first
  const cachedResult = await getCached<StudentAnalyticsOverview>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  await connectDB();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const studentObjId = mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId)
    : null;

  // Query student profile for totalPoints
  let totalPoints = 0;
  if (studentObjId) {
    const [sp, u] = await Promise.all([
      StudentProfile.findOne({ userId: studentObjId }).lean(),
      User.findById(studentObjId).lean(),
    ]);
    totalPoints = sp?.totalPoints ?? u?.studentProfile?.totalPoints ?? 0;
  }

  let aggregatedMonths: Array<{
    _id: string;
    totalActions: number;
    completedActions: number;
    mentorTotal: number;
    mentorCompleted: number;
    studentTotal: number;
    studentCompleted: number;
    weightedScore: number;
  }> = [];

  if (studentObjId) {
    aggregatedMonths = await Action.aggregate([
      {
        $match: {
          studentId: { $in: [studentObjId, String(studentId)] },
          createdAt: { $gte: twelveMonthsAgo },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          totalActions: { $sum: 1 },
          completedActions: {
            $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
          },
          mentorTotal: {
            $sum: { $cond: [{ $eq: ["$addedBy", "mentor"] }, 1, 0] },
          },
          mentorCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$addedBy", "mentor"] },
                    { $eq: ["$completed", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          studentTotal: {
            $sum: { $cond: [{ $eq: ["$addedBy", "student"] }, 1, 0] },
          },
          studentCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$addedBy", "student"] },
                    { $eq: ["$completed", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalActions: 1,
          completedActions: 1,
          mentorTotal: 1,
          mentorCompleted: 1,
          studentTotal: 1,
          studentCompleted: 1,
          weightedScore: {
            $round: [
              {
                $add: [
                  // 80% weight for mentor tasks
                  {
                    $cond: [
                      { $gt: ["$mentorTotal", 0] },
                      {
                        $multiply: [
                          { $divide: ["$mentorCompleted", "$mentorTotal"] },
                          80,
                        ],
                      },
                      // If no mentor tasks, scale student tasks to full 100%
                      {
                        $cond: [
                          { $gt: ["$studentTotal", 0] },
                          {
                            $multiply: [
                              { $divide: ["$studentCompleted", "$studentTotal"] },
                              100,
                            ],
                          },
                          0,
                        ],
                      },
                    ],
                  },
                  // 20% weight for student tasks (only when mentor tasks exist)
                  {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$mentorTotal", 0] },
                          { $gt: ["$studentTotal", 0] },
                        ],
                      },
                      {
                        $multiply: [
                          { $divide: ["$studentCompleted", "$studentTotal"] },
                          20,
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  // Create dictionary lookup for fast assembly
  const monthMap = new Map<string, (typeof aggregatedMonths)[number]>();
  for (const m of aggregatedMonths) {
    monthMap.set(m._id, m);
  }

  const last12 = getLast12Months();
  let sumMentorTotal = 0;
  let sumMentorCompleted = 0;
  let sumStudentTotal = 0;
  let sumStudentCompleted = 0;

  const timeline: MonthlyAnalyticsItem[] = last12.map(({ key, label }) => {
    const item = monthMap.get(key);
    if (item) {
      sumMentorTotal += item.mentorTotal;
      sumMentorCompleted += item.mentorCompleted;
      sumStudentTotal += item.studentTotal;
      sumStudentCompleted += item.studentCompleted;

      return {
        month: key,
        label,
        totalActions: item.totalActions,
        completedActions: item.completedActions,
        mentorTotal: item.mentorTotal,
        mentorCompleted: item.mentorCompleted,
        studentTotal: item.studentTotal,
        studentCompleted: item.studentCompleted,
        weightedScore: Math.min(100, Math.max(0, item.weightedScore || 0)),
      };
    }

    return {
      month: key,
      label,
      totalActions: 0,
      completedActions: 0,
      mentorTotal: 0,
      mentorCompleted: 0,
      studentTotal: 0,
      studentCompleted: 0,
      weightedScore: 0,
    };
  });

  // Calculate isolated mentor completeness rate for green radial chart
  const mentorTaskCompleteness =
    sumMentorTotal > 0
      ? Math.round((sumMentorCompleted / sumMentorTotal) * 100)
      : 0;

  const studentTaskCompleteness =
    sumStudentTotal > 0
      ? Math.round((sumStudentCompleted / sumStudentTotal) * 100)
      : 0;

  const totalAll = sumMentorTotal + sumStudentTotal;
  const completedAll = sumMentorCompleted + sumStudentCompleted;
  const overallCompletionRate =
    totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;

  // Momentum score (weighted average of recent 3 months)
  const recent3 = timeline.slice(-3);
  const momentumScore = Math.round(
    recent3.reduce((acc, m) => acc + m.weightedScore, 0) / Math.max(1, recent3.length)
  );

  const result: StudentAnalyticsOverview = {
    timeline,
    mentorTaskCompleteness,
    studentTaskCompleteness,
    overallCompletionRate,
    totalMentorTasks: sumMentorTotal,
    completedMentorTasks: sumMentorCompleted,
    totalStudentTasks: sumStudentTotal,
    completedStudentTasks: sumStudentCompleted,
    totalPoints: totalPoints ?? 0,
    momentumScore,
  };

  // 2. Store computed result in Upstash Redis
  await setCached(cacheKey, result, REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS);

  return result;
}

/**
 * Invalidates the cached student analytics in Upstash Redis.
 */
export async function invalidateStudentAnalyticsCache(studentId: string): Promise<void> {
  await invalidateCache(`analytics:student:${studentId}`);
}

/**
 * Next.js Cached Fetch (revalidate: 3600 seconds = 1 hour)
 * Prevents redundant DB scans across page loads.
 */
export const getCachedStudentAnalytics = unstable_cache(
  async (studentId: string) => fetchStudent12MonthAnalytics(studentId),
  ["student-12-month-analytics-cache"],
  {
    revalidate: 3600,
    tags: ["analytics", "student-analytics"],
  }
);
