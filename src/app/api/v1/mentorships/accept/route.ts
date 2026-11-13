import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB, startSafeTransaction } from "@/lib/db";
import { MentorshipRequest, MentorCapacity, Mentorship } from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import { invalidateMentorDirectoryCache } from "@/lib/dal";
import { acquireMentorLock, releaseMentorLock } from "@/lib/redis";

export const runtime = "nodejs";

const acceptBodySchema = z
  .object({
    requestId: z.string().trim().min(1, "requestId is required"),
  })
  .strict();

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

export async function POST(request: Request) {
  let session: mongoose.ClientSession | null = null;

  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const mentorId = authUser.sub as string;

    const body = await request.json().catch(() => null);
    const parsed = acceptBodySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid request payload";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { requestId } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json({ error: "Invalid requestId format" }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // REDIS CONCURRENCY GUARD: Acquire exclusive lock for this mentor
    // Serializes concurrent acceptance calls and prevents race conditions with requests
    // -------------------------------------------------------------------------
    const lockToken = await acquireMentorLock(mentorId, mentorId);
    if (!lockToken) {
      return NextResponse.json(
        {
          error:
            "Another operation is currently updating this mentor's capacity. Please try again shortly.",
        },
        { status: 409 }
      );
    }

    try {
      // CRITICAL INVARIANT: Execute acceptance atomically inside a transaction if supported
      session = await startSafeTransaction();

      // 1. Find the request inside the transaction (or fallback)
      const mentorshipRequest = session
        ? await MentorshipRequest.findById(requestId).session(session)
        : await MentorshipRequest.findById(requestId);

    if (!mentorshipRequest) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
        session = null;
      }
      return NextResponse.json({ error: "Mentorship request not found" }, { status: 404 });
    }

    if (mentorshipRequest.status !== "pending") {
      if (session) {
        await session.abortTransaction();
        session.endSession();
        session = null;
      }
      return NextResponse.json(
        { error: `Cannot accept request already marked as '${mentorshipRequest.status}'` },
        { status: 400 }
      );
    }

    // Verify authorized user is the designated mentor
    if (String(mentorshipRequest.mentorId) !== authUser.sub) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
        session = null;
      }
      return NextResponse.json(
        { error: "Forbidden: Only the requested mentor can accept this request" },
        { status: 403 }
      );
    }

    // 2. Find mentor's MentorCapacity inside the transaction (or fallback)
    const capacity = session
      ? await MentorCapacity.findOne({ mentorId: mentorshipRequest.mentorId }).session(session)
      : await MentorCapacity.findOne({ mentorId: mentorshipRequest.mentorId });

    if (!capacity) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
        session = null;
      }
      return NextResponse.json(
        { error: "Mentor capacity record not found" },
        { status: 400 }
      );
    }

    // 3. ATOMIC CAPACITY INVARIANT: Reject if activeMentees >= maxMentees
    if (capacity.activeMentees >= capacity.maxMentees) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
        session = null;
      }
      return NextResponse.json(
        { error: "Mentor has reached their maximum active mentee capacity" },
        { status: 400 }
      );
    }

    // 4. Increment activeMentees
    capacity.activeMentees += 1;
    await capacity.save(session ? { session } : {});

    // 5. Update request status to 'accepted'
    mentorshipRequest.status = "accepted";
    await mentorshipRequest.save(session ? { session } : {});

    // 6. Insert new Mentorship document
    const [newMentorship] = await Mentorship.create(
      [
        {
          studentId: mentorshipRequest.studentId,
          mentorId: mentorshipRequest.mentorId,
          status: "active",
        },
      ],
      session ? { session } : {}
    );

    // 7. Commit atomic transaction if replica set
    if (session) {
      await session.commitTransaction();
      session.endSession();
      session = null;
    }

    // Invalidate distributed mentor directory cache
    await invalidateMentorDirectoryCache();

    return NextResponse.json(
      {
        message: "Mentorship request accepted successfully",
        mentorship: newMentorship,
        request: mentorshipRequest,
      },
      { status: 200 }
    );
    } finally {
      await releaseMentorLock(mentorId, lockToken);
    }
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {
        // Session already aborted or terminated
      }
    }
    console.error("Mentorship accept error:", error);
    return NextResponse.json(
      { error: "Internal server error accepting mentorship request" },
      { status: 500 }
    );
  }
}
