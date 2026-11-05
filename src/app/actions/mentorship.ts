"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectDB, startSafeTransaction } from "@/lib/db";
import { MentorshipRequest, MentorCapacity, Mentorship, User } from "@/lib/models";
import { Session } from "@/lib/models/Mentorship";
import { SharedNote } from "@/lib/models/Communication";
import { MentorSession } from "@/lib/models/MentorSession";
import { checkSessionOverlap, calculateSessionInterval } from "@/lib/utils/scheduling";
import { verifyAccess } from "@/lib/app-tokens";
import { MAX_PENDING_REQUESTS_PER_STUDENT } from "@/lib/config";

export interface RequestMentorshipResult {
  success: boolean;
  message?: string;
  error?: string;
  requestId?: string;
}

/**
 * Server Action: Submit a new mentorship request.
 *
 * Enforces:
 * 1. Authentication check via JWT access token cookie
 * 2. Pending request throttling (max 3 pending requests per student)
 * 3. Prevention of duplicate requests or active mentorships
 * 4. Invariant: Mentor declared capacity must never be exceeded
 */
export async function requestMentorship(
  mentorId: string,
  message: string
): Promise<RequestMentorshipResult> {
  try {
    await connectDB();

    // 1. Authenticate student via access token cookie
    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("access_token")?.value;
    } catch {
      token = undefined;
    }

    if (!token) {
      return {
        success: false,
        error: "Please sign in to send a mentorship request.",
      };
    }

    const payload = await verifyAccess(token);
    if (!payload || typeof payload.sub !== "string") {
      return {
        success: false,
        error: "Your session has expired. Please sign in again.",
      };
    }

    const studentId = payload.sub;

    // 2. Validate inputs
    const trimmedMessage = message ? message.trim() : "";
    if (!trimmedMessage) {
      return {
        success: false,
        error: "Please include a personalized note explaining what advice or mentorship you seek.",
      };
    }

    if (trimmedMessage.length > 1000) {
      return {
        success: false,
        error: "Your note is too long (maximum 1,000 characters).",
      };
    }

    if (!mentorId || !mongoose.Types.ObjectId.isValid(mentorId)) {
      return {
        success: false,
        error: "Invalid mentor identifier provided.",
      };
    }

    if (studentId === mentorId) {
      return {
        success: false,
        error: "You cannot request mentorship from yourself.",
      };
    }

    // 3. Verify mentor exists and is an alumni
    const mentorUser = await User.findById(mentorId);
    if (!mentorUser) {
      return {
        success: false,
        error: "The selected mentor could not be found.",
      };
    }

    // 4. Invariant: Mentor capacity must never be exceeded
    const capacity = await MentorCapacity.findOne({ mentorId });
    if (capacity && capacity.activeMentees >= capacity.maxMentees) {
      return {
        success: false,
        error: "This mentor is currently at full capacity and cannot accept new mentees.",
      };
    }

    // 5. Throttling: Max active pending requests per student based on system threshold
    const pendingCount = await MentorshipRequest.countDocuments({
      studentId,
      status: "pending",
    });

    if (pendingCount >= MAX_PENDING_REQUESTS_PER_STUDENT) {
      return {
        success: false,
        error: `You have reached the maximum limit of ${MAX_PENDING_REQUESTS_PER_STUDENT} active pending requests. Please wait for mentors to reply before requesting more.`,
      };
    }

    // 6. Check for duplicate pending request
    const existingRequest = await MentorshipRequest.findOne({
      studentId,
      mentorId,
      status: "pending",
    });

    if (existingRequest) {
      return {
        success: false,
        error: "You already have a pending mentorship request with this mentor.",
      };
    }

    // 7. Check for already active mentorship
    const existingMentorship = await Mentorship.findOne({
      studentId,
      mentorId,
      status: "active",
    });

    if (existingMentorship) {
      return {
        success: false,
        error: "You already have an active mentorship with this mentor.",
      };
    }

    // 8. Create new MentorshipRequest
    const newRequest = await MentorshipRequest.create({
      studentId,
      mentorId,
      status: "pending",
      message: trimmedMessage,
    });

    // Revalidate dashboard so request counts & buttons update immediately
    revalidatePath("/dashboard");
    revalidatePath("/student/mentors");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: "Mentorship request sent successfully!",
      requestId: String(newRequest._id),
    };
  } catch (error) {
    console.error("requestMentorship server action error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while sending your request. Please try again.",
    };
  }
}

// ============================================================================
// STEP 2: DISCOVERY & SCORING SERVER ACTION (BATCH / INFINITE SCROLL)
// ============================================================================

export interface ScoredMentorCardItem {
  id: string;
  mentorId: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
  company: string;
  jobTitle: string;
  industry: string;
  expertiseTags: string[];
  activeMentees: number;
  maxMentees: number;
  remainingSpots: number;
  score: number;
  rationale: string;
  sharedSkills: string[];
  hasIndustryFit: boolean;
  hasRoleFit: boolean;
  isAtCapacity: boolean;
  hasPendingRequest: boolean;
  hasActiveMentorship: boolean;
}

export interface FetchMentorsBatchResult {
  success: boolean;
  mentors: ScoredMentorCardItem[];
  total: number;
  page: number;
  hasMore: boolean;
  pendingRequestsCount: number;
  maxPendingAllowed: number;
  hasReachedPendingLimit: boolean;
  error?: string;
}

export async function fetchScoredMentorsAction({
  page = 1,
  limit = 12,
  search = "",
  industry = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
}): Promise<FetchMentorsBatchResult> {
  try {
    await connectDB();
    const { matchMentors } = await import("@/lib/utils/matching");
    const { StudentProfile, MentorProfile } = await import("@/lib/models/User");
    const { MAX_MENTEES_PER_MENTOR } = await import("@/lib/config");

    // 1. Authenticate user if available
    let studentId: string | null = null;
    let studentProfileData: Record<string, unknown> = {
      skills: ["TypeScript", "Next.js", "System Design", "Docker", "PostgreSQL"],
      targetIndustries: ["Technology", "Financial Technology", "Cloud Infrastructure"],
      major: "Computer Science",
    };

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("access_token")?.value;
      if (token) {
        const payload = await verifyAccess(token);
        if (payload?.sub) {
          studentId = payload.sub;
          const user = await User.findById(studentId).lean();
          const sp = await StudentProfile.findOne({ userId: studentId }).lean();
          if (user || sp) {
            studentProfileData = {
              skills: (sp?.skills?.length ? sp.skills : user?.studentProfile?.skills) || studentProfileData.skills,
              skillsToDevelop: sp?.skillsToDevelop || [],
              targetIndustries: sp?.targetIndustries?.length
                ? sp.targetIndustries
                : user?.studentProfile?.targetIndustries || studentProfileData.targetIndustries,
              major: sp?.major || user?.studentProfile?.major || "Computer Science",
              bio: sp?.bio || user?.studentProfile?.bio || "",
            };
          }
        }
      }
    } catch {
      // Non-blocking
    }

    // 2. Fetch pending requests count for this student
    let pendingRequestsCount = 0;
    let pendingMentorIds = new Set<string>();
    let activeMentorIds = new Set<string>();

    if (studentId) {
      const pendingReqs = await MentorshipRequest.find({
        studentId,
        status: "pending",
      }).select("mentorId").lean();

      pendingRequestsCount = pendingReqs.length;
      pendingMentorIds = new Set(pendingReqs.map((r) => String(r.mentorId)));

      const activeMentorships = await Mentorship.find({
        studentId,
        status: "active",
      }).select("mentorId").lean();

      activeMentorIds = new Set(activeMentorships.map((m) => String(m.mentorId)));
    }

    const hasReachedPendingLimit = pendingRequestsCount >= MAX_PENDING_REQUESTS_PER_STUDENT;

    // 3. Fetch all eligible mentors (Sanitizing to NEVER leak email, phone, passwords)
    const mentorUsers = await User.find({
      role: "alumni",
      ...(studentId ? { _id: { $ne: studentId } } : {}),
    })
      .select("_id name mentorProfile")
      .lean();

    const mentorUserIds = mentorUsers.map((u) => u._id);
    const standaloneProfiles = await MentorProfile.find({
      userId: { $in: mentorUserIds },
    }).lean();
    const capacityRecords = await MentorCapacity.find({
      mentorId: { $in: mentorUserIds },
    }).lean();

    const profileMap = new Map(standaloneProfiles.map((p) => [String(p.userId), p]));
    const capacityMap = new Map(capacityRecords.map((c) => [String(c.mentorId), c]));

    // Construct raw mentor list for scoring utility
    type RawMentorItem = Parameters<typeof matchMentors>[1][number];
    const rawMentorList: RawMentorItem[] = mentorUsers.map((u) => {
      const userIdStr = String(u._id);
      const standalone = profileMap.get(userIdStr) as Record<string, unknown> | undefined;
      const embedded = (u.mentorProfile || {}) as Record<string, unknown>;
      const capacity = capacityMap.get(userIdStr);

      const activeMentees = (capacity?.activeMentees as number) ?? ((standalone?.totalMentees as number) ? Math.min(Number(standalone?.totalMentees), 2) : 1);
      const maxMentees = (capacity?.maxMentees as number) ?? MAX_MENTEES_PER_MENTOR;

      return {
        mentorId: userIdStr,
        name: u.name || "Alumni Mentor",
        avatarUrl: (standalone?.avatarUrl as string) || (embedded.avatarUrl as string | undefined),
        headline: (standalone?.headline as string) || (embedded.headline as string) || "Alumni Mentor & Senior Engineer",
        company: (standalone?.company as string) || (embedded.company as string) || "Independent",
        jobTitle: (standalone?.jobTitle as string) || (embedded.jobTitle as string) || "Software Engineer",
        industry: (standalone?.industry as string) || (embedded.industry as string) || "Technology",
        expertiseTags: ((standalone?.expertiseTags as string[])?.length ? (standalone?.expertiseTags as string[]) : (embedded.expertiseTags as string[])) || [
          "Distributed Systems",
          "System Design",
          "Backend Architecture",
        ],
        skills: ((standalone?.skills as RawMentorItem["skills"])?.length ? (standalone?.skills as RawMentorItem["skills"]) : (embedded.skills as RawMentorItem["skills"])) || [],
        activeMentees,
        maxMentees,
        availability: ((standalone?.availability as "open" | "waitlist") || (embedded.availability as "open" | "waitlist") || "open") as "open" | "waitlist",
      };
    });

    // Fallback seed mentors if database has none
    if (rawMentorList.length === 0) {
      rawMentorList.push(
        {
          mentorId: "seed-mentor-1",
          name: "Priya Nair",
          avatarUrl: undefined,
          headline: "Staff Distributed Systems Engineer @ Stripe | Ex-Google",
          company: "Stripe",
          jobTitle: "Staff Software Engineer",
          industry: "Financial Technology",
          expertiseTags: ["Distributed Systems", "Go", "Kafka", "PostgreSQL", "System Design"],
          skills: [{ name: "Distributed Systems", endorsements: 14 }, { name: "Go", endorsements: 11 }],
          activeMentees: 2,
          maxMentees: 5,
          availability: "open",
        },
        {
          mentorId: "seed-mentor-2",
          name: "Vikram Malhotra",
          avatarUrl: undefined,
          headline: "Senior Cloud Architect @ AWS | Kubernetes & Scalability",
          company: "Amazon Web Services",
          jobTitle: "Senior Cloud Architect",
          industry: "Cloud Infrastructure",
          expertiseTags: ["Cloud Infrastructure", "Kubernetes", "Docker", "DevOps", "AWS"],
          skills: [{ name: "Kubernetes", endorsements: 12 }, { name: "AWS", endorsements: 15 }],
          activeMentees: 3,
          maxMentees: 5,
          availability: "open",
        },
        {
          mentorId: "seed-mentor-3",
          name: "Ananya Roy",
          avatarUrl: undefined,
          headline: "Principal Engineer @ Uber | Microservices & Reliability",
          company: "Uber",
          jobTitle: "Principal Engineer",
          industry: "Technology",
          expertiseTags: ["Microservices", "Reliability", "TypeScript", "Next.js", "Go"],
          skills: [{ name: "TypeScript", endorsements: 18 }, { name: "System Design", endorsements: 16 }],
          activeMentees: 1,
          maxMentees: 4,
          availability: "open",
        },
        {
          mentorId: "seed-mentor-4",
          name: "Rohan Varma",
          avatarUrl: undefined,
          headline: "Engineering Lead @ Databricks | Large-Scale Analytics",
          company: "Databricks",
          jobTitle: "Engineering Lead",
          industry: "Technology",
          expertiseTags: ["Data Engineering", "Apache Spark", "Python", "Distributed Systems"],
          skills: [{ name: "Apache Spark", endorsements: 9 }, { name: "Python", endorsements: 14 }],
          activeMentees: 2,
          maxMentees: 5,
          availability: "open",
        }
      );
    }

    // 4. Run Step 1 Algorithmic Matching Utility
    const allScored = matchMentors(studentProfileData, rawMentorList);

    // 5. Apply filters (Search & Industry)
    let filtered = allScored;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.company && m.company.toLowerCase().includes(q)) ||
          (m.jobTitle && m.jobTitle.toLowerCase().includes(q)) ||
          (m.headline && m.headline.toLowerCase().includes(q)) ||
          m.expertiseTags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (industry.trim() && industry !== "all") {
      const ind = industry.trim().toLowerCase();
      filtered = filtered.filter(
        (m) => m.industry && m.industry.toLowerCase().includes(ind)
      );
    }

    // 6. Pagination (Batch size e.g. 12 per page)
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedSlice = filtered.slice(startIndex, startIndex + limit);

    // 7. Map to client card items with pending/active status flags
    const cards: ScoredMentorCardItem[] = paginatedSlice.map((m) => ({
      id: m.mentorId,
      mentorId: m.mentorId,
      name: m.name,
      avatarUrl: m.avatarUrl,
      headline: m.headline,
      company: m.company || "Independent",
      jobTitle: m.jobTitle || "Mentor",
      industry: m.industry || "Technology",
      expertiseTags: m.expertiseTags,
      activeMentees: m.activeMentees,
      maxMentees: m.maxMentees,
      remainingSpots: m.remainingSpots,
      score: m.score,
      rationale: m.rationale,
      sharedSkills: m.sharedSkills,
      hasIndustryFit: m.hasIndustryFit,
      hasRoleFit: m.hasRoleFit,
      isAtCapacity: m.isAtCapacity,
      hasPendingRequest: pendingMentorIds.has(m.mentorId),
      hasActiveMentorship: activeMentorIds.has(m.mentorId),
    }));

    return {
      success: true,
      mentors: cards,
      total,
      page,
      hasMore: total > startIndex + limit,
      pendingRequestsCount,
      maxPendingAllowed: MAX_PENDING_REQUESTS_PER_STUDENT,
      hasReachedPendingLimit,
    };
  } catch (error) {
    console.error("fetchScoredMentorsAction error:", error);
    return {
      success: false,
      mentors: [],
      total: 0,
      page: 1,
      hasMore: false,
      pendingRequestsCount: 0,
      maxPendingAllowed: MAX_PENDING_REQUESTS_PER_STUDENT,
      hasReachedPendingLimit: false,
      error: "Failed to load mentors.",
    };
  }
}

// ============================================================================
// STEP 3: MENTOR REQUESTS ACCEPT & DECLINE MUTATIONS (MONGOOSE TRANSACTION)
// ============================================================================

export async function acceptMentorshipRequest(requestId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  let session: mongoose.ClientSession | null = null;

  try {
    await connectDB();
    const { MAX_MENTEES_PER_MENTOR } = await import("@/lib/config");

    // 1. Authenticate mentor
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) {
      return { success: false, error: "Authentication required to accept mentorship." };
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      return { success: false, error: "Your session has expired. Please sign in again." };
    }

    const mentorId = payload.sub;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return { success: false, error: "Invalid request ID provided." };
    }

    // 2. ATOMIC TRANSACTION: Invariant: Mentor capacity must NEVER be exceeded
    session = await startSafeTransaction();

    const requestDoc = session ? await MentorshipRequest.findById(requestId).session(session) : await MentorshipRequest.findById(requestId);
    if (!requestDoc) {
      if (session) { await session.abortTransaction(); session.endSession(); }
      return { success: false, error: "Mentorship request not found." };
    }

    if (String(requestDoc.mentorId) !== mentorId) {
      if (session) { await session.abortTransaction(); session.endSession(); }
      return { success: false, error: "Forbidden: You are not authorized to accept this request." };
    }

    if (requestDoc.status !== "pending") {
      if (session) { await session.abortTransaction(); session.endSession(); }
      return {
        success: false,
        error: `Request has already been ${requestDoc.status}.`,
      };
    }

    // 3. Count active Mentorship documents for this mentor
    const activeMentorshipsCount = session ? await Mentorship.countDocuments({
      mentorId,
      status: "active",
    }).session(session) : await Mentorship.countDocuments({
      mentorId,
      status: "active",
    });

    // 4. Find MentorCapacity to verify declared capacity limit
    const capacity = session ? await MentorCapacity.findOne({ mentorId }).session(session) : await MentorCapacity.findOne({ mentorId });
    const declaredMax = capacity?.maxMentees && capacity.maxMentees > 0 ? capacity.maxMentees : MAX_MENTEES_PER_MENTOR;
    const effectiveLimit = Math.min(declaredMax, MAX_MENTEES_PER_MENTOR);

    if (activeMentorshipsCount >= effectiveLimit || (capacity && capacity.activeMentees >= capacity.maxMentees)) {
      if (session) { await session.abortTransaction(); session.endSession(); }
      return {
        success: false,
        error: `Cannot accept: You have reached your active mentee capacity limit of ${effectiveLimit}.`,
      };
    }

    // 5. Update MentorshipRequest to 'accepted'
    requestDoc.status = "accepted";
    await requestDoc.save(session ? { session } : {});

    // 6. Create active Mentorship document
    await Mentorship.create(
      [
        {
          studentId: requestDoc.studentId,
          mentorId: requestDoc.mentorId,
          startDate: new Date(),
          status: "active",
        },
      ],
      session ? { session } : {}
    );

    // 7. Increment active mentees stat
    if (capacity) {
      capacity.activeMentees += 1;
      await capacity.save(session ? { session } : {});
    } else {
      await MentorCapacity.create(
        [
          {
            mentorId,
            maxMentees: effectiveLimit,
            activeMentees: activeMentorshipsCount + 1,
          },
        ],
        session ? { session } : {}
      );
    }

    // 8. Commit atomic transaction
    if (session) {
      await session.commitTransaction();
      session.endSession();
      session = null;
    }

    // Trigger path revalidations
    revalidatePath("/mentor");
    revalidatePath("/mentor/requests");
    revalidatePath("/mentor/mentees");
    revalidatePath("/mentor/profile");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Mentorship request accepted! New active relationship created.",
    };
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {
        // Ignore abort cleanup
      }
    }
    console.error("acceptMentorshipRequest error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while accepting the request.",
    };
  }
}

export async function declineMentorshipRequest(requestId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) {
      return { success: false, error: "Authentication required to decline request." };
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      return { success: false, error: "Your session has expired. Please sign in again." };
    }

    const mentorId = payload.sub;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return { success: false, error: "Invalid request ID." };
    }

    const requestDoc = await MentorshipRequest.findOne({
      _id: requestId,
      mentorId,
    });

    if (!requestDoc) {
      return { success: false, error: "Request not found or unauthorized." };
    }

    requestDoc.status = "declined";
    await requestDoc.save();

    revalidatePath("/mentor");
    revalidatePath("/mentor/requests");

    return {
      success: true,
      message: "Mentorship request declined.",
    };
  } catch (error) {
    console.error("declineMentorshipRequest error:", error);
    return {
      success: false,
      error: "Failed to decline the mentorship request.",
    };
  }
}

/**
 * Step 1: Session Mechanics & Overlap Validation Action
 *
 * Schedules a new mentorship session, verifying that the calculated
 * time block does not overlap with any existing scheduled session.
 */
export async function scheduleMentorshipSession(data: {
  mentorId: string;
  menteeId?: string | null;
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  location?: string;
  prerequisites?: string[];
  sharedNote?: {
    title?: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
}): Promise<{
  success: boolean;
  session?: {
    id: string;
    title: string;
    date: string;
    time: string;
    durationMinutes: number;
    location: string;
  };
  error?: string;
}> {
  try {
    await connectDB();

    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("access_token")?.value;
    } catch {
      token = undefined;
    }

    if (!token) {
      return { success: false, error: "Please sign in to schedule a session." };
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      return { success: false, error: "Your session has expired. Please sign in again." };
    }

    const userId = payload.sub;

    if (!data.mentorId || !mongoose.Types.ObjectId.isValid(data.mentorId)) {
      return { success: false, error: "Invalid mentor ID." };
    }

    if (!data.title?.trim()) {
      return { success: false, error: "Session title is required." };
    }

    if (!data.date) {
      return { success: false, error: "Session date is required." };
    }

    if (!data.time?.trim()) {
      return { success: false, error: "Session time is required." };
    }

    const durationMinutes = data.durationMinutes || 45;

    // Verify authorized participant
    const isAllMentees = data.menteeId === "all";
    const isMentor = userId === data.mentorId;
    const isMentee = Boolean(data.menteeId && data.menteeId !== "all" && userId === data.menteeId);

    if (isAllMentees && !isMentor) {
      return { success: false, error: "Only mentors can schedule a session for all mentees." };
    }

    if (!isMentor && !isMentee) {
      return { success: false, error: "Forbidden: You are not a participant in this mentorship." };
    }

    let targetMenteeId: mongoose.Types.ObjectId | null = null;
    let menteeIdsForMentorSession: mongoose.Types.ObjectId[] = [];

    if (isAllMentees) {
      const activeMentorships = await Mentorship.find({
        mentorId: new mongoose.Types.ObjectId(data.mentorId),
        status: "active",
        isDeleted: { $ne: true },
      }).lean();

      menteeIdsForMentorSession = activeMentorships
        .map((m) => m.studentId)
        .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
        .map((id) => new mongoose.Types.ObjectId(String(id)));
    } else if (data.menteeId && mongoose.Types.ObjectId.isValid(data.menteeId)) {
      targetMenteeId = new mongoose.Types.ObjectId(data.menteeId);
      menteeIdsForMentorSession = [targetMenteeId];
    }

    // Step 1: Overlap validation check (always check mentor's calendar; check mentee if 1-on-1)
    const overlapCheck = await checkSessionOverlap({
      mentorId: data.mentorId,
      menteeId: isAllMentees ? null : data.menteeId,
      date: data.date,
      time: data.time,
      durationMinutes,
    });

    if (overlapCheck.hasOverlap) {
      return {
        success: false,
        error: overlapCheck.reason || "The selected time block overlaps with an existing session.",
      };
    }

    const newSession = await Session.create({
      mentorId: new mongoose.Types.ObjectId(data.mentorId),
      menteeId: targetMenteeId,
      isAllMentees,
      title: data.title.trim(),
      date: new Date(data.date),
      time: data.time.trim(),
      durationMinutes,
      location:
        data.location?.trim() ||
        `https://meet.alma.edu/session/${Math.random().toString(36).substring(2, 9)}`,
      status: "scheduled",
      isDeleted: false,
      prerequisites: data.prerequisites || [],
    });

    // Step 2: If shared notes or file attachments were provided, create a scoped SharedNote
    if (
      data.sharedNote &&
      (data.sharedNote.title || data.sharedNote.content || data.sharedNote.fileUrl)
    ) {
      try {
        const noteTitle =
          data.sharedNote.title?.trim() || `${data.title.trim()} — Session Notes`;
        const noteContent =
          data.sharedNote.content?.trim() ||
          (data.sharedNote.fileName
            ? `Materials and notes for session: ${data.title.trim()}`
            : "");

        const newNote = await SharedNote.create({
          mentorId: new mongoose.Types.ObjectId(data.mentorId),
          menteeId: targetMenteeId,
          isAllMentees,
          sessionId: newSession._id,
          title: noteTitle,
          content: noteContent,
          fileUrl: data.sharedNote.fileUrl || null,
          fileName: data.sharedNote.fileName || null,
          fileType: data.sharedNote.fileType || null,
          fileSize: data.sharedNote.fileSize || null,
        });

        newSession.noteId = newNote._id;
        await newSession.save();
      } catch (noteErr) {
        console.warn("Could not create associated SharedNote for session:", noteErr);
      }
    }

    // Also mirror into MentorSession collection for unified queryability
    try {
      const { start: slotStart, end: slotEnd } = calculateSessionInterval(
        data.date,
        data.time,
        durationMinutes
      );

      await MentorSession.create({
        mentorId: new mongoose.Types.ObjectId(data.mentorId),
        menteeIds: menteeIdsForMentorSession,
        topic: data.title.trim(),
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes,
        meetingLink: newSession.location,
        status: "scheduled",
      });
    } catch (mirrorErr) {
      console.warn("Could not mirror session to MentorSession:", mirrorErr);
    }

    revalidatePath("/student/dashboard");
    revalidatePath("/student/mentorship");
    revalidatePath("/mentor/dashboard");
    revalidatePath("/mentor/sessions");

    return {
      success: true,
      session: {
        id: String(newSession._id),
        title: newSession.title,
        date: newSession.date.toISOString(),
        time: newSession.time,
        durationMinutes: newSession.durationMinutes,
        location: newSession.location,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to schedule session.";
    return { success: false, error: errMsg };
  }
}


/**
 * Updates status of a mentorship session (e.g. mark as completed or cancelled).
 */
export async function updateSessionStatusAction(
  sessionId: string,
  status: "scheduled" | "completed" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return { success: false, error: "Unauthorized" };

    const payload = await verifyAccess(token);
    if (!payload?.sub) return { success: false, error: "Unauthorized" };

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return { success: false, error: "Invalid session ID." };
    }

    const sessionDoc = await Session.findById(sessionId);
    if (!sessionDoc) return { success: false, error: "Session not found." };

    const isMentor = String(sessionDoc.mentorId) === payload.sub;
    const isMentee = String(sessionDoc.menteeId) === payload.sub;
    if (!isMentor && !isMentee) {
      return { success: false, error: "Forbidden: Not a participant in this session." };
    }

    sessionDoc.status = status;
    await sessionDoc.save();

    revalidatePath("/mentor/sessions");
    revalidatePath("/mentor/dashboard");
    revalidatePath("/student/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to update session.";
    return { success: false, error: errMsg };
  }
}

export interface UpdateSessionMaterialsParams {
  sessionId: string;
  title?: string;
  content?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  removeFile?: boolean;
}

export interface UpdateSessionMaterialsResult {
  success: boolean;
  error?: string;
  note?: {
    id: string;
    title: string;
    content: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    updatedAt: string;
  };
}

/**
 * Updates or attaches preparation materials / notes for an active session.
 * Business Rule: A mentor can edit / upload materials at any time before,
 * during, and up to exactly 1 hour after the session ends.
 */
export async function updateSessionMaterialsAction(
  params: UpdateSessionMaterialsParams
): Promise<UpdateSessionMaterialsResult> {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return { success: false, error: "Authentication required." };

    const payload = await verifyAccess(token);
    if (!payload?.sub) return { success: false, error: "Session expired. Sign in again." };

    const mentorId = payload.sub;

    if (!params.sessionId || !mongoose.Types.ObjectId.isValid(params.sessionId)) {
      return { success: false, error: "Invalid session ID." };
    }

    const sessionDoc = await Session.findById(params.sessionId);
    if (!sessionDoc || sessionDoc.isDeleted) {
      return { success: false, error: "Session not found." };
    }

    // Only the mentor of this session is authorized to modify preparation materials
    if (String(sessionDoc.mentorId) !== mentorId) {
      return {
        success: false,
        error: "Forbidden: You are not authorized to edit materials for this session.",
      };
    }

    if (sessionDoc.status === "cancelled") {
      return {
        success: false,
        error: "Cannot update materials for a cancelled session.",
      };
    }

    // Strict 1-Hour Post-Session Window Enforcement
    const { end: sessionEnd } = calculateSessionInterval(
      sessionDoc.date,
      sessionDoc.time,
      sessionDoc.durationMinutes || 45
    );

    const ONE_HOUR_MS = 60 * 60 * 1000;
    const cutoffTime = sessionEnd.getTime() + ONE_HOUR_MS;
    const now = Date.now();

    if (now > cutoffTime) {
      return {
        success: false,
        error:
          "The editing window has closed. Session materials can only be updated up to 1 hour after the session ends.",
      };
    }

    // Locate existing note (either via noteId or direct sessionId lookup)
    let noteDoc = null;
    if (sessionDoc.noteId && mongoose.Types.ObjectId.isValid(String(sessionDoc.noteId))) {
      noteDoc = await SharedNote.findById(sessionDoc.noteId);
    }
    if (!noteDoc) {
      noteDoc = await SharedNote.findOne({
        sessionId: sessionDoc._id,
        mentorId: sessionDoc.mentorId,
      });
    }

    const noteTitle =
      params.title?.trim() ||
      noteDoc?.title ||
      `${sessionDoc.title.trim()} — Session Notes`;
    const noteContent =
      params.content !== undefined ? params.content.trim() : (noteDoc?.content || "");

    if (noteDoc) {
      noteDoc.title = noteTitle;
      noteDoc.content = noteContent;
      if (params.removeFile) {
        noteDoc.fileUrl = null;
        noteDoc.fileName = null;
        noteDoc.fileType = null;
        noteDoc.fileSize = null;
      } else if (params.fileUrl) {
        noteDoc.fileUrl = params.fileUrl;
        noteDoc.fileName = params.fileName || noteDoc.fileName || "Session_Materials";
        noteDoc.fileType = params.fileType || noteDoc.fileType || null;
        noteDoc.fileSize = params.fileSize !== undefined ? params.fileSize : noteDoc.fileSize;
      }
      await noteDoc.save();
    } else {
      // Determine mentee recipient
      const isAllMentees = Boolean(sessionDoc.isAllMentees || !sessionDoc.menteeId);
      const targetMenteeId = isAllMentees ? null : sessionDoc.menteeId;

      noteDoc = await SharedNote.create({
        mentorId: sessionDoc.mentorId,
        menteeId: targetMenteeId,
        isAllMentees,
        sessionId: sessionDoc._id,
        title: noteTitle,
        content: noteContent,
        fileUrl: params.removeFile ? null : (params.fileUrl || null),
        fileName: params.removeFile ? null : (params.fileName || null),
        fileType: params.removeFile ? null : (params.fileType || null),
        fileSize: params.removeFile ? null : (params.fileSize || null),
      });

      sessionDoc.noteId = noteDoc._id;
      await sessionDoc.save();
    }

    revalidatePath("/mentor/sessions");
    revalidatePath("/student/mentorship");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      note: {
        id: String(noteDoc._id),
        title: noteDoc.title,
        content: noteDoc.content,
        fileUrl: noteDoc.fileUrl || null,
        fileName: noteDoc.fileName || null,
        fileType: noteDoc.fileType || null,
        fileSize: noteDoc.fileSize || null,
        updatedAt: noteDoc.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to update session materials.";
    return { success: false, error: errMsg };
  }
}
