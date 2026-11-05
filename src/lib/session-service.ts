import { IMentorSession } from "./models/MentorSession";

// ============================================================================
// MEETING LINK ALLOW-LIST & VALIDATOR
// ============================================================================

/**
 * Approved video conference providers for Alma.
 * Zoom supports root domain and any subdomains (e.g., org.zoom.us, us05web.zoom.us).
 */
export const ALLOWED_MEETING_HOSTS = [
  "meet.google.com",
  "zoom.us",
  "meet.jit.si",
  "8x8.vc",
] as const;

export function isValidMeetingHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "meet.google.com") return true;
  if (host === "meet.jit.si") return true;
  if (host === "8x8.vc") return true;
  if (host === "zoom.us" || host.endsWith(".zoom.us")) return true;
  return false;
}

export function validateMeetingLink(urlStr: string): { isValid: boolean; normalized?: string; error?: string } {
  if (!urlStr || typeof urlStr !== "string") {
    return { isValid: false, error: "Meeting link is required" };
  }

  const trimmed = urlStr.trim();

  // Reject dangerous protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { isValid: false, error: "Unsupported or insecure URL protocol" };
  }

  try {
    const parsed = new URL(trimmed);

    // Require https:
    if (parsed.protocol !== "https:") {
      return { isValid: false, error: "Meeting link must use secure https:// protocol" };
    }

    // Reject userinfo / credentials in URL (e.g. https://user:pass@meet.google.com)
    if (parsed.username || parsed.password) {
      return { isValid: false, error: "Meeting link cannot contain embedded credentials" };
    }

    // Check host allow-list
    if (!isValidMeetingHost(parsed.hostname)) {
      return {
        isValid: false,
        error: `Host "${parsed.hostname}" is not permitted. Allowed providers: Google Meet (meet.google.com), Zoom (zoom.us), Jitsi (meet.jit.si), and 8x8 (8x8.vc)`,
      };
    }

    return { isValid: true, normalized: trimmed };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

// ============================================================================
// 5-MINUTE SLOT BUCKET GENERATOR (Layer 2 Race Condition Guard)
// ============================================================================

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Validates that a date is rounded to a 5-minute increment with zero seconds and milliseconds.
 */
export function isFiveMinuteIncrement(date: Date): boolean {
  return (
    date.getUTCMinutes() % 5 === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

/**
 * Rounds a Date down or to nearest 5-minute increment.
 */
export function roundToFiveMinutes(date: Date): Date {
  const ms = date.getTime();
  const roundedMs = Math.round(ms / FIVE_MINUTES_MS) * FIVE_MINUTES_MS;
  const rounded = new Date(roundedMs);
  rounded.setUTCSeconds(0, 0);
  return rounded;
}

/**
 * Generates an array of Date objects representing 5-minute bucket starts
 * from startTime (inclusive) to endTime (exclusive).
 */
export function generate5MinSlots(startTime: Date, durationMinutes: number): Date[] {
  const slots: Date[] = [];
  const startMs = startTime.getTime();
  const totalSlots = Math.round(durationMinutes / 5);

  for (let i = 0; i < totalSlots; i++) {
    slots.push(new Date(startMs + i * FIVE_MINUTES_MS));
  }

  return slots;
}

// ============================================================================
// PRIVACY & SERIALIZATION (Phase 6: 15-Minute Link Gate)
// ============================================================================

export interface SerializedMentorSession {
  id: string;
  mentorId: string;
  menteeIds: string[];
  topic?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  durationMinutes: number;
  meetingLink: string | null;
  linkNotice?: string;
  status: "scheduled" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
}

/**
 * Serializes a MentorSession document enforcing role-based privacy rules:
 * - Mentors always see the meeting link.
 * - Mentees only see the meeting link starting 15 minutes before session startTime.
 *   Prior to 15 minutes before startTime, meetingLink is null with a helpful notice.
 * - Non-participants receive null.
 */
export function serializeSession(
  session: IMentorSession | (Record<string, unknown> & { _id: unknown }),
  viewerId: string,
  viewerRole?: string
): SerializedMentorSession | null {
  const mentorIdStr = String(
    session.mentorId && typeof session.mentorId === "object" && "_id" in session.mentorId
      ? (session.mentorId as { _id: unknown })._id
      : session.mentorId
  );

  const menteeIdStrs: string[] = Array.isArray(session.menteeIds)
    ? session.menteeIds.map((m: unknown) =>
        String(m && typeof m === "object" && "_id" in m ? (m as { _id: unknown })._id : m)
      )
    : [];

  const isMentor = mentorIdStr === viewerId || viewerRole === "administrator";
  const isMentee = menteeIdStrs.includes(viewerId);

  // If viewer is neither the mentor nor an included mentee, deny access
  if (!isMentor && !isMentee) {
    return null;
  }

  const startDate = session.startTime instanceof Date ? session.startTime : new Date(session.startTime as string);
  const endDate = session.endTime instanceof Date ? session.endTime : new Date(session.endTime as string);
  const now = Date.now();
  const fifteenMinutesBeforeMs = startDate.getTime() - 15 * 60 * 1000;

  let meetingLink: string | null = null;
  let linkNotice: string | undefined = undefined;

  if (isMentor) {
    meetingLink = session.meetingLink as string;
  } else if (isMentee) {
    if (now >= fifteenMinutesBeforeMs) {
      meetingLink = session.meetingLink as string;
    } else {
      meetingLink = null;
      linkNotice = "Link available 15 minutes before the session.";
    }
  }

  return {
    id: String(session._id),
    mentorId: mentorIdStr,
    menteeIds: menteeIdStrs,
    topic: session.topic as string | undefined,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    durationMinutes: Number(session.durationMinutes),
    meetingLink,
    linkNotice,
    status: session.status as "scheduled" | "cancelled" | "completed",
    createdAt: (session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt as string)).toISOString(),
    updatedAt: (session.updatedAt instanceof Date ? session.updatedAt : new Date(session.updatedAt as string)).toISOString(),
  };
}
