import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentProfile } from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import { calculateMatchScore } from "@/lib/matching";
import { getBaseMentorDirectory } from "@/lib/dal";

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

    // 1. Fetch student career profile and cached mentor directory in parallel
    const [studentProfile, baseMentors] = await Promise.all([
      StudentProfile.findOne({ userId: studentUserId }),
      getBaseMentorDirectory(),
    ]);

    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // 2. Filter out student themselves if registered as an alumni mentor
    const eligibleMentors = baseMentors.filter((m) => m.mentorId !== studentUserId);

    // 3. Calculate match scores and rationales
    const scoredMentors = eligibleMentors.map((alumni) => {
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

      return {
        id: alumni.id,
        mentorId: alumni.mentorId,
        name: alumni.name || "Alumni Mentor",
        company: alumni.company,
        jobTitle: alumni.jobTitle,
        industry: alumni.industry,
        expertiseTags: alumni.expertiseTags || [],
        capacity: {
          maxMentees: alumni.maxMentees,
          activeMentees: alumni.activeMentees,
          remainingSpots: Math.max(0, alumni.maxMentees - alumni.activeMentees),
        },
        matchScore: match.score,
        matchRationale: match.rationale,
      };
    });

    // 4. Sort from highest match score to lowest
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
