import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  User,
  MentorProfile,
  MentorCapacity,
  MentorshipRequest,
  Mentorship,
  MentorshipGoalRequest,
  RecommendationSnapshot,
} from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import {
  recommendMentors,
  MenteeGoalInput,
  MentorCandidate,
} from "@/lib/recommendation";

export const runtime = "nodejs";

async function getAuthenticatedUser(request: Request) {
  let token: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get("access_token")?.value;
  } catch {
    const cookieHeader = request.headers.get("cookie") || "";
    token = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
  }

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return null;

  const payload = await verifyAccess(token);
  if (!payload || typeof payload.sub !== "string") return null;
  return payload;
}

/**
 * Helper to fetch and map all verified mentors into MentorCandidate[] domain format.
 */
async function loadMentorCandidates(institutionId?: string): Promise<MentorCandidate[]> {
  const verifiedUsers = await User.find({
    role: { $in: ["alumni", "alumni_mentor"] },
    isVerified: true,
    verificationStatus: "verified",
    isDeleted: { $ne: true },
    ...(institutionId ? { institutionId } : {}),
  })
    .select("_id name mentorProfile institutionId")
    .lean();

  if (verifiedUsers.length === 0) return [];

  const userIds = verifiedUsers.map((u) => u._id);
  const [standaloneProfiles, capacityRecords] = await Promise.all([
    MentorProfile.find({ userId: { $in: userIds } }).lean(),
    MentorCapacity.find({ mentorId: { $in: userIds } }).lean(),
  ]);

  const profileMap = new Map(standaloneProfiles.map((p) => [String(p.userId), p]));
  const capacityMap = new Map(capacityRecords.map((c) => [String(c.mentorId), c]));

  return verifiedUsers.map((u) => {
    const userIdStr = String(u._id);
    const standalone = profileMap.get(userIdStr) as Record<string, unknown> | undefined;
    const embedded = (u.mentorProfile || {}) as Record<string, unknown>;
    const capacity = capacityMap.get(userIdStr);

    const skillsRaw = (standalone?.skills as any[])?.length ? (standalone?.skills as any[]) : (embedded.skills as any[]) || [];
    const extractedSkills = skillsRaw.map((s: any) => (typeof s === "string" ? s : s?.name)).filter(Boolean);
    const expTags = ((standalone?.expertiseTags as string[]) || (embedded.expertiseTags as string[]) || []);
    const mergedSkills = Array.from(new Set([...extractedSkills, ...expTags]));

    const canTeach = (standalone?.skillsCanTeach as string[]) || (embedded.skillsCanTeach as string[]) || mergedSkills;
    const topics = (standalone?.topicsCanMentor as string[]) || (embedded.topicsCanMentor as string[]) || expTags;

    return {
      mentorId: userIdStr,
      name: (u.name as string) || "Alumni Mentor",
      institutionId: (u.institutionId as string) || "INST-001",
      isVerified: true,
      verificationStatus: "verified",
      isDeleted: false,
      avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
      headline: (standalone?.headline as string) || (embedded.headline as string) || "Alumni Mentor",
      company: (standalone?.company as string) || (embedded.company as string) || "Independent",
      jobTitle: (standalone?.jobTitle as string) || (embedded.jobTitle as string) || "Mentor",
      industry: (standalone?.industry as string) || (embedded.industry as string) || "Technology",
      yearsOfExperience: (standalone?.yearsOfExperience as number) || (embedded.yearsOfExperience as number) || 4,
      skills: mergedSkills,
      skillsCanTeach: canTeach,
      topicsCanMentor: topics,
      preferredMentoringStyle: (standalone?.preferredMentoringStyle as string) || (embedded.preferredMentoringStyle as string),
      languages: (standalone?.languages as string[]) || (embedded.languages as string[]) || ["English"],
      meetingPreference: (standalone?.meetingPreference as any) || (embedded.meetingPreference as any) || "remote",
      maxMentees: (capacity?.maxMentees as number) ?? 5,
      activeMentees: (capacity?.activeMentees as number) ?? 0,
      pendingReservations: (capacity?.pendingReservations as number) ?? 0,
      acceptingRequests: capacity?.acceptingRequests ?? true,
      status: capacity?.status ?? "available",
      availability: (embedded?.availability as any) || (standalone?.availability as any) || "open",
      availabilitySchedule: (standalone?.availabilitySchedule as any) || (embedded.availabilitySchedule as any) || [],
      reliabilityStats: (standalone?.reliabilityStats as any) || (embedded.reliabilityStats as any) || undefined,
      averageRating: (embedded?.averageRating as number) || 4.5,
      reviewCount: (embedded?.reviewCount as number) || 5,
      expertiseTags: expTags,
    };
  });
}

/**
 * POST /api/v1/mentorships/recommendations
 * Creates a request-centric mentorship goal and returns explainable recommendations.
 */
export async function POST(request: Request) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const studentId = authUser.sub as string;
    const institutionId = (authUser.institutionId as string) || "INST-001";
    const body = await request.json().catch(() => ({}));

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const needs = Array.isArray(body.needs) ? body.needs.filter((n: any) => typeof n === "string" && n.trim()) : [];

    if (!title || !goal) {
      return NextResponse.json(
        { error: "A title and clear mentorship goal description are required." },
        { status: 400 }
      );
    }

    // 1. Create and persist MentorshipGoalRequest
    const goalRequestDoc = await MentorshipGoalRequest.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      institutionId,
      title,
      goal,
      needs,
      targetRole: body.targetRole?.trim() || undefined,
      targetIndustry: body.targetIndustry?.trim() || undefined,
      problemDescription: body.problemDescription?.trim() || undefined,
      preferredMentoringStyle: body.preferredMentoringStyle || "any",
      preferredLanguage: body.preferredLanguage?.trim() || "English",
      meetingPreference: body.meetingPreference || "remote",
      availabilitySchedule: Array.isArray(body.availabilitySchedule) ? body.availabilitySchedule : [],
      status: "active",
    });

    // 2. Fetch existing active and pending mentorships for this student
    const [activeMentorships, pendingReqs, mentorCandidates] = await Promise.all([
      Mentorship.find({ studentId, status: "active" }).select("mentorId").lean(),
      MentorshipRequest.find({ studentId, status: "pending" }).select("mentorId").lean(),
      loadMentorCandidates(institutionId),
    ]);

    const activeMentorIds = new Set(activeMentorships.map((m) => String(m.mentorId)));
    const pendingMentorIds = new Set(pendingReqs.map((r) => String(r.mentorId)));

    // 3. Map to MenteeGoalInput
    const menteeGoal: MenteeGoalInput = {
      studentId,
      institutionId,
      targetRole: goalRequestDoc.targetRole,
      targetIndustry: goalRequestDoc.targetIndustry,
      careerGoal: goalRequestDoc.goal,
      skillsToLearn: goalRequestDoc.needs,
      knowledgeGaps: goalRequestDoc.needs,
      problemDescription: goalRequestDoc.problemDescription,
      preferredMentoringStyle: goalRequestDoc.preferredMentoringStyle,
      preferredLanguage: goalRequestDoc.preferredLanguage,
      meetingPreference: goalRequestDoc.meetingPreference,
      availabilitySchedule: goalRequestDoc.availabilitySchedule as any,
    };

    // 4. Run the 4-Stage Mentorship Recommendation Funnel
    const { recommendations, metrics } = recommendMentors(menteeGoal, mentorCandidates, {
      activeMentorIds,
      pendingMentorIds,
      limit: 10,
      applyDiversity: true,
    });

    // 5. Persist Recommendation Snapshot for Outcome Tracking & Feedback Loop
    try {
      await RecommendationSnapshot.create({
        requestId: goalRequestDoc._id,
        studentId: new mongoose.Types.ObjectId(studentId),
        institutionId,
        recommendedMentors: recommendations.map((r, idx) => ({
          mentorId: new mongoose.Types.ObjectId(r.mentorId),
          rank: idx + 1,
          finalScore: r.finalScore,
          scoreBreakdown: r.scoreBreakdown,
          reasons: r.reasons,
        })),
        requestOutcome: "none",
        weightsUsed: {
          semantic: 0.25,
          skillCoverage: 0.20,
          careerRelevance: 0.15,
          mentoringCapability: 0.10,
          seniority: 0.10,
          availability: 0.10,
          reliability: 0.05,
          rating: 0.05,
        },
      });
    } catch (snapshotErr) {
      console.warn("Failed to persist recommendation snapshot:", snapshotErr);
    }

    return NextResponse.json({
      success: true,
      requestId: String(goalRequestDoc._id),
      goalRequest: {
        id: String(goalRequestDoc._id),
        title: goalRequestDoc.title,
        goal: goalRequestDoc.goal,
        needs: goalRequestDoc.needs,
      },
      recommendations,
      metrics,
    });
  } catch (error) {
    console.error("POST /api/v1/mentorships/recommendations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/v1/mentorships/recommendations?requestId=...
 * Retrieves recommendations for an existing mentorship goal request.
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const studentId = authUser.sub as string;
    const institutionId = (authUser.institutionId as string) || "INST-001";
    const url = new URL(request.url);
    const requestId = url.searchParams.get("requestId");

    let goalRequestDoc: any = null;
    if (requestId && mongoose.Types.ObjectId.isValid(requestId)) {
      goalRequestDoc = await MentorshipGoalRequest.findOne({
        _id: requestId,
        studentId,
      });
    } else {
      // Find latest active goal request for student
      goalRequestDoc = await MentorshipGoalRequest.findOne({
        studentId,
        status: "active",
      }).sort({ createdAt: -1 });
    }

    if (!goalRequestDoc) {
      return NextResponse.json(
        { error: "No active mentorship goal request found. Please create one first." },
        { status: 404 }
      );
    }

    const [activeMentorships, pendingReqs, mentorCandidates] = await Promise.all([
      Mentorship.find({ studentId, status: "active" }).select("mentorId").lean(),
      MentorshipRequest.find({ studentId, status: "pending" }).select("mentorId").lean(),
      loadMentorCandidates(institutionId),
    ]);

    const activeMentorIds = new Set(activeMentorships.map((m) => String(m.mentorId)));
    const pendingMentorIds = new Set(pendingReqs.map((r) => String(r.mentorId)));

    const menteeGoal: MenteeGoalInput = {
      studentId,
      institutionId,
      targetRole: goalRequestDoc.targetRole,
      targetIndustry: goalRequestDoc.targetIndustry,
      careerGoal: goalRequestDoc.goal,
      skillsToLearn: goalRequestDoc.needs,
      knowledgeGaps: goalRequestDoc.needs,
      problemDescription: goalRequestDoc.problemDescription,
      preferredMentoringStyle: goalRequestDoc.preferredMentoringStyle,
      preferredLanguage: goalRequestDoc.preferredLanguage,
      meetingPreference: goalRequestDoc.meetingPreference,
      availabilitySchedule: goalRequestDoc.availabilitySchedule as any,
    };

    const { recommendations, metrics } = recommendMentors(menteeGoal, mentorCandidates, {
      activeMentorIds,
      pendingMentorIds,
      limit: 10,
      applyDiversity: true,
    });

    return NextResponse.json({
      success: true,
      requestId: String(goalRequestDoc._id),
      goalRequest: {
        id: String(goalRequestDoc._id),
        title: goalRequestDoc.title,
        goal: goalRequestDoc.goal,
        needs: goalRequestDoc.needs,
      },
      recommendations,
      metrics,
    });
  } catch (error) {
    console.error("GET /api/v1/mentorships/recommendations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
