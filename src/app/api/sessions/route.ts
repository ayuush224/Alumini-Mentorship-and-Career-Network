import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { MentorSession, MentorSessionSlot } from "@/lib/models/MentorSession";
import { Mentorship } from "@/lib/models/Mentorship";
import { verifyAccess } from "@/lib/app-tokens";
import {
  validateMeetingLink,
  generate5MinSlots,
  isFiveMinuteIncrement,
  roundToFiveMinutes,
  serializeSession,
} from "@/lib/session-service";

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
  return { ...payload, sub: payload.sub as string, role: payload.role as string | undefined };
}

const createSessionSchema = z
  .object({
    startTime: z.string().datetime({ message: "startTime must be a valid ISO-8601 UTC string" }),
    durationMinutes: z
      .number()
      .int("durationMinutes must be an integer")
      .min(15, "Duration must be at least 15 minutes")
      .max(240, "Duration cannot exceed 240 minutes (4 hours)")
      .refine((val) => val % 5 === 0, "Duration must be a multiple of 5 minutes"),
    topic: z
      .string()
      .max(120, "Topic cannot exceed 120 characters")
      .optional()
      .transform((val) => (val ? val.trim() : undefined)),
    menteeIds: z
      .array(z.string().min(1, "Mentee ID cannot be empty"))
      .min(1, "At least one mentee is required")
      .max(20, "A session cannot include more than 20 mentees")
      .transform((arr) => Array.from(new Set(arr))), // Deduplicate
    meetingLink: z.string().trim().min(1, "Meeting link is required"),
    requestId: z.string().trim().optional(),
  })
  .strict();

/**
 * POST /api/sessions
 * Creates a new mentor–mentee session with:
 * 1. Strict input validation
 * 2. Active mentee membership enforcement
 * 3. Layer 1 friendly overlap pre-check
 * 4. Layer 2 race-condition safe 5-minute bucket slot reservations
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const role = (authUser.role as string) || "student";
    if (role !== "alumni" && role !== "mentor" && role !== "administrator") {
      return NextResponse.json(
        { error: "Forbidden: Only mentors can schedule mentoring sessions" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { durationMinutes, topic, menteeIds, meetingLink, requestId } = parsed.data;
    let startTime = new Date(parsed.data.startTime);

    // Round or check 5-minute increment
    if (!isFiveMinuteIncrement(startTime)) {
      startTime = roundToFiveMinutes(startTime);
    }

    // Must be at least 5 minutes in the future
    const now = Date.now();
    const MINIMUM_FUTURE_MS = 5 * 60 * 1000;
    if (startTime.getTime() < now + MINIMUM_FUTURE_MS) {
      return NextResponse.json(
        {
          error: "Session startTime must be at least 5 minutes in the future",
          code: "TIME_IN_PAST",
        },
        { status: 400 }
      );
    }

    // Validate meeting link against secure allow-list
    const linkValidation = validateMeetingLink(meetingLink);
    if (!linkValidation.isValid || !linkValidation.normalized) {
      return NextResponse.json(
        { error: linkValidation.error || "Invalid meeting link", code: "INVALID_MEETING_LINK" },
        { status: 400 }
      );
    }
    const normalizedMeetingLink = linkValidation.normalized;

    // Check for idempotency via requestId
    if (requestId) {
      const existingRequestSession = await MentorSession.findOne({
        mentorId: authUser.sub,
        requestId,
      }).lean();

      if (existingRequestSession) {
        const serialized = serializeSession(existingRequestSession, authUser.sub, role);
        return NextResponse.json({ success: true, session: serialized }, { status: 200 });
      }
    }

    // Validate all menteeIds are valid ObjectIds
    for (const mId of menteeIds) {
      if (!mongoose.Types.ObjectId.isValid(mId)) {
        return NextResponse.json(
          { error: `Invalid mentee user ID: ${mId}`, code: "INVALID_MENTEE_ID" },
          { status: 400 }
        );
      }
    }
    const menteeObjectIds = menteeIds.map((id) => new mongoose.Types.ObjectId(id));

    // =========================================================================
    // ACTIVE MENTEE ELIGIBILITY VERIFICATION
    // Mentee is eligible if an active, non-deleted Mentorship exists with this mentor.
    // =========================================================================
    const activeMentorships = await Mentorship.find({
      mentorId: authUser.sub,
      studentId: { $in: menteeObjectIds },
      status: "active",
      isDeleted: { $ne: true },
    }).lean();

    const activeMenteeIdSet = new Set(activeMentorships.map((m) => String(m.studentId)));
    const invalidMentees = menteeIds.filter((id) => !activeMenteeIdSet.has(id));

    if (invalidMentees.length > 0) {
      return NextResponse.json(
        {
          error: "One or more selected mentees are not in your active mentee list",
          code: "MENTEE_NOT_ACTIVE",
          invalidMentees,
        },
        { status: 403 }
      );
    }

    // Calculate endTime
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // =========================================================================
    // LAYER 1: FRIENDLY PRE-CHECK OVERLAP DETECTION
    // Formula: newStart < existingEnd AND newEnd > existingStart
    // Status must be "scheduled"
    // =========================================================================
    const conflictingSession = await MentorSession.findOne({
      mentorId: authUser.sub,
      status: "scheduled",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).lean();

    if (conflictingSession) {
      return NextResponse.json(
        {
          error: "You already have a scheduled session during this time window",
          code: "SESSION_OVERLAP",
          conflictingSession: {
            id: String(conflictingSession._id),
            startTime: conflictingSession.startTime.toISOString(),
            endTime: conflictingSession.endTime.toISOString(),
            topic: conflictingSession.topic,
          },
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // LAYER 2: RACE-CONDITION SAFETY VIA MentorSessionSlot (Standalone MongoDB)
    // Inserts 5-minute slot documents with unique index on { mentorId, slot }.
    // =========================================================================
    const sessionId = new mongoose.Types.ObjectId();
    const slotDates = generate5MinSlots(startTime, durationMinutes);
    const slotDocs = slotDates.map((slot) => ({
      mentorId: new mongoose.Types.ObjectId(authUser.sub),
      slot,
      sessionId,
    }));

    try {
      await MentorSessionSlot.insertMany(slotDocs, { ordered: true });
    } catch (insertErr: unknown) {
      // Clean up any slots that might have been partially written for this sessionId
      await MentorSessionSlot.deleteMany({ sessionId });

      const isDuplicateKey =
        typeof insertErr === "object" &&
        insertErr !== null &&
        "code" in insertErr &&
        (insertErr as { code?: number }).code === 11000;

      if (isDuplicateKey) {
        return NextResponse.json(
          {
            error: "Another session was just booked during this time slot. Please choose another time.",
            code: "SESSION_OVERLAP",
          },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    // Insert the session document
    try {
      const newSession = await MentorSession.create({
        _id: sessionId,
        mentorId: new mongoose.Types.ObjectId(authUser.sub),
        menteeIds: menteeObjectIds,
        topic: topic || undefined,
        startTime,
        endTime,
        durationMinutes,
        meetingLink: normalizedMeetingLink,
        status: "scheduled",
        requestId: requestId || undefined,
      });

      const serialized = serializeSession(newSession, authUser.sub, role);
      return NextResponse.json({ success: true, session: serialized }, { status: 201 });
    } catch (createErr) {
      // Rollback inserted slots if creating MentorSession failed
      await MentorSessionSlot.deleteMany({ sessionId });
      throw createErr;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /api/sessions] Error:", message);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

/**
 * GET /api/sessions
 * Returns sessions for the authenticated user (mentor or mentee).
 * Supports filters: ?status=scheduled|cancelled|completed & ?from=ISO & ?to=ISO
 * Serializes sessions enforcing the 15-minute meeting link privacy gate for mentees.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const role = (authUser.role as string) || "student";
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const query: Record<string, unknown> = {};

    if (role === "alumni" || role === "mentor") {
      query.mentorId = authUser.sub;
    } else if (role === "student") {
      query.menteeIds = authUser.sub;
    } else if (role !== "administrator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (statusParam && ["scheduled", "cancelled", "completed"].includes(statusParam)) {
      query.status = statusParam;
    }

    if (fromParam || toParam) {
      const timeFilter: Record<string, Date> = {};
      if (fromParam) timeFilter.$gte = new Date(fromParam);
      if (toParam) timeFilter.$lte = new Date(toParam);
      query.startTime = timeFilter;
    }

    const sessions = await MentorSession.find(query)
      .sort({ startTime: 1 })
      .lean();

    const serializedSessions = sessions
      .map((s) => serializeSession(s, authUser.sub, role))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return NextResponse.json({ sessions: serializedSessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[GET /api/sessions] Error:", message);
    return NextResponse.json({ error: "Failed to retrieve sessions" }, { status: 500 });
  }
}
