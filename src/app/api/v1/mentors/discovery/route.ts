import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentProfile, AlumniProfile, MentorCapacity } from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import { calculateMatchScore } from "@/lib/matching";

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

export async function GET(request: Request) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const studentUserId = authUser.sub as string;

    // 1. Fetch student career profile
    const studentProfile = await StudentProfile.findOne({ userId: studentUserId });
    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // 2. Fetch all mentor capacities where activeMentees < maxMentees
    const availableCapacities = await MentorCapacity.find({
      $expr: { $lt: ["$activeMentees", "$maxMentees"] },
    }).lean();

    const availableMentorIds = availableCapacities.map((c) => c.mentorId);
    const capacityMap = new Map(
      availableCapacities.map((c) => [String(c.mentorId), c])
    );

    // 3. Fetch corresponding AlumniProfiles (exclude student's own profile if applicable)
    // CRITICAL INVARIANT: Select only 'name _id' from User to strip emails, phone numbers, and credentials
    const alumniProfiles = await AlumniProfile.find({
      userId: { $in: availableMentorIds, $ne: studentUserId },
    })
      .populate({ path: "userId", select: "name _id" })
      .lean();

    // 4. Calculate match scores and rationales
    const scoredMentors = alumniProfiles.map((alumni) => {
      const match = calculateMatchScore(
        {
          targetIndustries: studentProfile.targetIndustries,
          skillsToDevelop: studentProfile.skillsToDevelop,
        },
        {
          industry: alumni.industry,
          expertiseTags: alumni.expertiseTags,
        }
      );

      const userDoc = typeof alumni.userId === "object" ? (alumni.userId as { _id?: unknown; name?: string }) : null;
      const mentorUserId = String(userDoc?._id || alumni.userId);
      const capacity = capacityMap.get(mentorUserId);

      return {
        id: String(alumni._id),
        mentorId: mentorUserId,
        name: userDoc?.name || "Alumni Mentor",
        company: alumni.company,
        jobTitle: alumni.jobTitle,
        industry: alumni.industry,
        expertiseTags: alumni.expertiseTags || [],
        capacity: {
          maxMentees: capacity?.maxMentees ?? 0,
          activeMentees: capacity?.activeMentees ?? 0,
          remainingSpots: Math.max(0, (capacity?.maxMentees ?? 0) - (capacity?.activeMentees ?? 0)),
        },
        matchScore: match.score,
        matchRationale: match.rationale,
      };
    });

    // 5. Sort from highest match score to lowest
    scoredMentors.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ mentors: scoredMentors });
  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json(
      { error: "Internal server error during mentor discovery" },
      { status: 500 }
    );
  }
}
