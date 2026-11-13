import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MentorshipRequest, MentorCapacity, User } from "@/lib/models";
import { verifyAccess } from "@/lib/app-tokens";
import { MAX_PENDING_REQUESTS_PER_STUDENT } from "@/lib/config";
import { acquireMentorLock, releaseMentorLock } from "@/lib/redis";

export const runtime = "nodejs";

const requestBodySchema = z
  .object({
    mentorId: z.string().trim().min(1, "mentorId is required"),
    message: z.string().trim().min(1, "message is required").max(1000, "message is too long"),
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
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const studentId = authUser.sub as string;

    const body = await request.json().catch(() => null);
    const parsed = requestBodySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid request payload";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { mentorId, message } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return NextResponse.json({ error: "Invalid mentorId format" }, { status: 400 });
    }

    if (studentId === mentorId) {
      return NextResponse.json(
        { error: "Students cannot send a mentorship request to themselves" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // REDIS CONCURRENCY GUARD (Ticket-Booking Distributed Mutex):
    // Acquires an exclusive short-lived lock for this mentor.
    // If two students request the same mentor simultaneously, Redis serializes
    // them sequentially. The second request backs off and retries, ensuring
    // mentor capacity is never exceeded and eliminating race conditions.
    // -------------------------------------------------------------------------
    const lockToken = await acquireMentorLock(mentorId, studentId);
    if (!lockToken) {
      return NextResponse.json(
        {
          error:
            "This mentor is currently processing another mentorship request. Please try again in a few moments.",
        },
        { status: 409 }
      );
    }

    try {
      // Verify mentor exists
      const mentorUser = await User.findById(mentorId);
      if (!mentorUser) {
        return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
      }

      // Verify mentor is not at capacity
      const capacity = await MentorCapacity.findOne({ mentorId });
      if (capacity && capacity.activeMentees >= capacity.maxMentees) {
        return NextResponse.json(
          { error: "Mentor is currently at full capacity and cannot accept new requests" },
          { status: 400 }
        );
      }

      // Enforce student pending requests limit (Threshold Enforcement)
      const pendingCount = await MentorshipRequest.countDocuments({
        studentId,
        status: "pending",
      });

      if (pendingCount >= MAX_PENDING_REQUESTS_PER_STUDENT) {
        return NextResponse.json(
          {
            error: `Maximum pending mentorship requests reached (${MAX_PENDING_REQUESTS_PER_STUDENT}). You cannot have more pending requests.`,
          },
          { status: 429 }
        );
      }

      // Prevent duplicate pending requests
      const existingRequest = await MentorshipRequest.findOne({
        studentId,
        mentorId,
        status: "pending",
      });

      if (existingRequest) {
        return NextResponse.json(
          { error: "You already have a pending mentorship request with this mentor" },
          { status: 400 }
        );
      }

      const newRequest = await MentorshipRequest.create({
        studentId,
        mentorId,
        status: "pending",
        message,
      });

      return NextResponse.json(
        {
          message: "Mentorship request submitted successfully",
          request: newRequest,
        },
        { status: 201 }
      );
    } finally {
      // Atomically release the distributed mentor lock
      await releaseMentorLock(mentorId, lockToken);
    }
  } catch (error) {
    console.error("Mentorship request creation error:", error);
    return NextResponse.json(
      { error: "Internal server error creating mentorship request" },
      { status: 500 }
    );
  }
}
