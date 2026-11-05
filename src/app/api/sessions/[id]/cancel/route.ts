import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MentorSession, MentorSessionSlot } from "@/lib/models/MentorSession";
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

/**
 * PATCH /api/sessions/[id]/cancel
 * Cancels a scheduled session and frees up its time slots for rebooking.
 * Only the mentor who scheduled the session can cancel it.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const session = await MentorSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Authorization: Only the creator mentor (or admin) can cancel
    const isOwner = String(session.mentorId) === authUser.sub;
    const isAdmin = authUser.role === "administrator";
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only the mentor who scheduled this session can cancel it" },
        { status: 403 }
      );
    }

    if (session.status === "cancelled") {
      return NextResponse.json(
        { success: true, message: "Session is already cancelled" },
        { status: 200 }
      );
    }

    // 1. Mark session cancelled
    session.status = "cancelled";
    await session.save();

    // 2. Free up 5-minute slots so mentor can book another session during this time
    await MentorSessionSlot.deleteMany({ sessionId: session._id });

    return NextResponse.json({
      success: true,
      message: "Session cancelled successfully and time slot freed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[PATCH /api/sessions/[id]/cancel] Error:", message);
    return NextResponse.json({ error: "Failed to cancel session" }, { status: 500 });
  }
}
