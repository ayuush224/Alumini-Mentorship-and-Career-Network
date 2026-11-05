import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Mentorship } from "@/lib/models/Mentorship";
import { getPusherServer } from "@/lib/pusher-server";

export const dynamic = "force-dynamic";

/**
 * Step 1: Pusher Private Channel Authentication Handshake
 *
 * Route: POST /api/pusher/auth
 * Handles subscription handshakes for 'private-chat-${mentorshipId}'.
 * Strict Security Checks:
 * 1. Verifies caller has valid HttpOnly access_token JWT.
 * 2. Parses target mentorshipId and queries active Mentorship contract in MongoDB.
 * 3. Enforces that caller is strictly the studentId or mentorId on that active document.
 * 4. Returns 403 Forbidden if the caller is not a bilateral participant.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user from JWT cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing access token." },
        { status: 401 }
      );
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired session." },
        { status: 401 }
      );
    }
    const authenticatedUserId = String(payload.sub);

    // 2. Parse socket_id and channel_name from request body
    let socketId = "";
    let channelName = "";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await request.json();
      socketId = json.socket_id;
      channelName = json.channel_name;
    } else {
      const formData = await request.formData();
      socketId = formData.get("socket_id") as string;
      channelName = formData.get("channel_name") as string;
    }

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Bad Request: Missing socket_id or channel_name." },
        { status: 400 }
      );
    }

    // 3. Extract mentorshipId from private channel name (private-chat-<mentorshipId>)
    const match = channelName.match(/^private-chat-([0-9a-fA-F]{24})$/);
    if (!match) {
      return NextResponse.json(
        { error: "Forbidden: Invalid channel naming pattern." },
        { status: 403 }
      );
    }
    const mentorshipId = match[1];

    // 4. Validate existence and bilateral participation in MongoDB
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(mentorshipId)) {
      return NextResponse.json(
        { error: "Forbidden: Malformed mentorship identifier." },
        { status: 403 }
      );
    }

    const mentorship = await Mentorship.findById(mentorshipId).lean();
    if (!mentorship) {
      return NextResponse.json(
        { error: "Forbidden: Mentorship contract does not exist." },
        { status: 403 }
      );
    }

    if (mentorship.status !== "active" || mentorship.isDeleted) {
      return NextResponse.json(
        { error: "Forbidden: Mentorship relationship is not active." },
        { status: 403 }
      );
    }

    const isStudent = String(mentorship.studentId) === authenticatedUserId;
    const isMentor = String(mentorship.mentorId) === authenticatedUserId;

    if (!isStudent && !isMentor) {
      // Invariant 2: Contact Details & Workspace Must Never Leak to unauthorized parties
      return NextResponse.json(
        { error: "Forbidden: You are not an active participant in this mentorship." },
        { status: 403 }
      );
    }

    // 5. Generate Pusher authorization token
    const pusher = getPusherServer();
    if (!pusher) {
      // Fallback for local development when Pusher keys are not yet configured
      return NextResponse.json({
        auth: `mock-pusher-key:mock-auth-signature-${Date.now()}`,
      });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth handshake error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during channel authorization." },
      { status: 500 }
    );
  }
}
