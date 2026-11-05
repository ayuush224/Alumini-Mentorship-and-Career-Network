import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Session } from "@/lib/models/Mentorship";

export interface SessionTimeInterval {
  start: Date;
  end: Date;
}

export interface OverlapValidationResult {
  hasOverlap: boolean;
  conflictingSession?: {
    id: string;
    title: string;
    time: string;
    date: string;
  };
  reason?: string;
}

/**
 * Parses time strings such as "4:30 PM", "16:30", "4:30 PM - 5:15 PM IST"
 * and returns start Date and calculated end Date based on durationMinutes.
 */
export function calculateSessionInterval(
  dateInput: Date | string,
  timeString: string,
  durationMinutes: number = 45
): SessionTimeInterval {
  const baseDate = new Date(dateInput);

  let hours = 12;
  let minutes = 0;

  if (timeString) {
    // Extract first time pattern (e.g. "4:30 PM" or "16:30" or "09:00")
    const match12 = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const meridian = match12[3]?.toUpperCase();

      if (meridian === "PM" && h < 12) h += 12;
      if (meridian === "AM" && h === 12) h = 0;

      hours = h;
      minutes = m;
    }
  }

  // Construct start date
  const start = new Date(baseDate);
  start.setHours(hours, minutes, 0, 0);

  // Calculate end date based on durationMinutes (Step 1 requirement)
  const durationMs = Math.max(durationMinutes, 15) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);

  return { start, end };
}

/**
 * Step 1: Session Mechanics & Overlap Validation Utility
 *
 * Queries existing sessions and blocks creation if a new session's
 * calculated time block overlaps with an existing scheduled session
 * for either the mentor or the mentee.
 */
export async function checkSessionOverlap(params: {
  mentorId: string;
  menteeId?: string | null;
  date: Date | string;
  time: string;
  durationMinutes?: number;
  excludeSessionId?: string;
}): Promise<OverlapValidationResult> {
  await connectDB();

  const duration = params.durationMinutes || 45;
  const { start: newStart, end: newEnd } = calculateSessionInterval(
    params.date,
    params.time,
    duration
  );

  // Look for sessions on the same calendar day (+- 1 day buffer for timezones)
  const dayStart = new Date(newStart);
  dayStart.setHours(0, 0, 0, 0);
  dayStart.setDate(dayStart.getDate() - 1);

  const dayEnd = new Date(newStart);
  dayEnd.setHours(23, 59, 59, 999);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const participantConditions: Array<Record<string, unknown>> = [
    { mentorId: new mongoose.Types.ObjectId(params.mentorId) },
  ];

  if (params.menteeId && mongoose.Types.ObjectId.isValid(params.menteeId)) {
    participantConditions.push({
      menteeId: new mongoose.Types.ObjectId(params.menteeId),
    });
  }

  const existingSessions = await Session.find({
    $or: participantConditions,
    status: "scheduled",
    isDeleted: { $ne: true },
    date: { $gte: dayStart, $lte: dayEnd },
    ...(params.excludeSessionId && mongoose.Types.ObjectId.isValid(params.excludeSessionId)
      ? { _id: { $ne: new mongoose.Types.ObjectId(params.excludeSessionId) } }
      : {}),
  }).lean();

  for (const session of existingSessions) {
    const existingDuration = session.durationMinutes || 45;
    const { start: existStart, end: existEnd } = calculateSessionInterval(
      session.date,
      session.time,
      existingDuration
    );

    // Overlap condition: startA < endB && startB < endA
    if (newStart < existEnd && existStart < newEnd) {
      return {
        hasOverlap: true,
        conflictingSession: {
          id: String(session._id),
          title: session.title,
          time: session.time,
          date: session.date.toISOString(),
        },
        reason: `Scheduling conflict: Overlaps with an existing session "${session.title}" (${session.time}).`,
      };
    }
  }

  return { hasOverlap: false };
}
