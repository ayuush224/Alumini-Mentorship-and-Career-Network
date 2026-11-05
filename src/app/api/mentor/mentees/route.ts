import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Mentorship } from "@/lib/models/Mentorship";
import { verifyAccess } from "@/lib/app-tokens";

export const dynamic = "force-dynamic";

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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/mentor/mentees?q=...
 * Returns the authenticated mentor's current active mentees.
 * Supports partial search query 'q' matching student name.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const role = (authUser.role as string) || "student";
    if (role !== "alumni" && role !== "mentor" && role !== "administrator") {
      return NextResponse.json({ error: "Forbidden: Only mentors can access active mentees" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get("q") || "").trim();

    // Query active, non-deleted mentorships for this mentor
    const activeMentorships = await Mentorship.find({
      mentorId: authUser.sub,
      status: "active",
      isDeleted: { $ne: true },
    })
      .populate("studentId", "name studentProfile avatarUrl")
      .lean();

    const menteesMap = new Map<string, { id: string; name: string; avatarUrl?: string; headline?: string }>();

    for (const m of activeMentorships) {
      const student = m.studentId as unknown as {
        _id: unknown;
        name?: string;
        studentProfile?: { avatarUrl?: string; headline?: string };
        avatarUrl?: string;
      } | null;

      if (!student || !student._id) continue;

      const studentId = String(student._id);
      const studentName = student.name?.trim() || "Student Mentee";
      const avatarUrl = student.studentProfile?.avatarUrl || student.avatarUrl || undefined;
      const headline = student.studentProfile?.headline || "Active Mentee";

      // If query is provided, filter by case-insensitive name match
      if (query) {
        const regex = new RegExp(escapeRegex(query), "i");
        if (!regex.test(studentName)) {
          continue;
        }
      }

      if (!menteesMap.has(studentId)) {
        menteesMap.set(studentId, {
          id: studentId,
          name: studentName,
          avatarUrl,
          headline,
        });
      }
    }

    const mentees = Array.from(menteesMap.values());
    return NextResponse.json({ mentees });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/mentor/mentees] Error:", message);
    return NextResponse.json({ error: "Failed to retrieve mentees" }, { status: 500 });
  }
}
