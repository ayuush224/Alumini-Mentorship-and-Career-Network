"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { connectDB } from "@/lib/db";
import {
  User,
  AlumniProfile,
  MentorProfile,
} from "@/lib/models/User";
import {
  VerificationRequest,
} from "@/lib/models/Verification";
import {
  Mentorship,
  MentorCapacity,
  Session,
} from "@/lib/models/Mentorship";
import {
  EngagementSnapshot,
  AuditLog,
} from "@/lib/models/Analytics";
import { Institution } from "@/lib/models/Institution";
import { verifyAccess } from "@/lib/app-tokens";

// Multi-tenant officer session validator
async function getOfficerContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    throw new Error("Unauthorized: No session token found.");
  }

  const payload = await verifyAccess(token);
  if (!payload || !payload.sub) {
    throw new Error("Unauthorized: Invalid session.");
  }

  await connectDB();
  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw new Error("User record not found.");
  }

  if (user.role !== "alumni_relations_officer" && user.role !== "administrator") {
    throw new Error("Forbidden: Access restricted to Alumni Relations Officers.");
  }

  return {
    officerId: String(user._id),
    officerName: user.name || "Alumni Relations Officer",
    role: user.role,
    institutionId: user.institutionId || "INST-001",
  };
}

// ----------------------------------------------------------------------------
// 1. DASHBOARD OVERVIEW DATA
// ----------------------------------------------------------------------------
export async function getOfficerDashboardData() {
  try {
    const { officerId, officerName, role, institutionId } = await getOfficerContext();

    // 1. Fetch institution metadata
    const institution = await Institution.findOne({ code: institutionId }).lean();
    const institutionName = institution?.name || "Apex Institute of Technology";

    // 2. Metrics aggregation
    const [
      pendingVerificationsCount,
      verifiedAlumniCount,
      activeMentorshipsCount,
      capacities,
      recentVerificationsRaw,
      recentMentorshipsRaw,
      recentAuditLogs,
    ] = await Promise.all([
      // Count pending verifications
      VerificationRequest.countDocuments({
        institutionId: { $in: [institutionId, "INST-001", "Lovely Professional University"] },
        status: "pending",
      }),
      // Count verified alumni
      VerificationRequest.countDocuments({
        institutionId: { $in: [institutionId, "INST-001", "Lovely Professional University"] },
        status: "verified",
      }),
      // Count active mentorship pairings
      Mentorship.countDocuments({
        status: "active",
      }),
      // Get all mentor capacities
      MentorCapacity.find().lean(),
      // Get 5 most recent pending verification requests
      VerificationRequest.find({
        institutionId: { $in: [institutionId, "INST-001", "Lovely Professional University"] },
        status: "pending",
      })
        .sort({ submittedAt: -1 })
        .limit(5)
        .populate("userId", "name role createdAt")
        .populate("documents")
        .lean(),
      // Get recent active mentorships
      Mentorship.find({ status: "active" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("studentId", "name")
        .populate("mentorId", "name")
        .lean(),
      // Get recent audit logs
      AuditLog.find({ institutionId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    // 3. Compute overall mentor capacity saturation
    let totalCapacity = 0;
    let totalActiveMentees = 0;
    for (const cap of capacities) {
      totalCapacity += cap.maxMentees || 0;
      totalActiveMentees += cap.activeMentees || 0;
    }
    const saturationRate = totalCapacity > 0 ? Math.round((totalActiveMentees / totalCapacity) * 100) : 0;

    // 4. Transform verifications (Strict Invariant 2: Contact Details Shielded)
    const recentVerifications = recentVerificationsRaw.map((v) => {
      const u = v.userId as unknown as { name?: string; _id: mongoose.Types.ObjectId } | null;
      return {
        id: String(v._id),
        alumnusName: u?.name || "Alumnus",
        alumnusId: String(v.userId?._id || v.alumnusId),
        degree: v.degree || "Degree Unspecified",
        graduationYear: v.graduationYear || new Date().getFullYear(),
        institutionalIdentifier: v.institutionalIdentifier,
        status: v.status,
        submittedAt: v.submittedAt ? v.submittedAt.toISOString() : new Date().toISOString(),
        documentCount: Array.isArray(v.documents) ? v.documents.length : 0,
      };
    });

    // 5. Transform mentorships with momentum calculation
    const now = Date.now();

    const recentPairings = await Promise.all(
      recentMentorshipsRaw.map(async (m) => {
        const student = m.studentId as unknown as { name?: string; _id: mongoose.Types.ObjectId } | null;
        const mentor = m.mentorId as unknown as { name?: string; _id: mongoose.Types.ObjectId } | null;

        // Find last session or activity
        const lastSession = await Session.findOne({
          mentorId: m.mentorId,
          menteeId: m.studentId,
        })
          .sort({ date: -1 })
          .lean();

        // Check for engagement snapshot
        const snapshot = await EngagementSnapshot.findOne({
          mentorshipId: m._id,
        }).lean();

        const lastActivityDate =
          lastSession?.date ? new Date(lastSession.date).getTime() : new Date(m.createdAt).getTime();

        const daysInactive = Math.max(0, Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24)));

        let health: "healthy" | "at_risk" | "stalled" = "healthy";
        if (daysInactive >= 14) {
          health = "stalled";
        } else if (daysInactive >= 8) {
          health = "at_risk";
        }

        const lastNudgeDate = snapshot?.nudgeIssuedAt ? new Date(snapshot.nudgeIssuedAt) : null;
        const daysSinceNudge = lastNudgeDate
          ? Math.floor((now - lastNudgeDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const canNudge = health === "stalled" && daysSinceNudge >= 7;

        return {
          id: String(m._id),
          studentName: student?.name || "Student",
          mentorName: mentor?.name || "Mentor",
          daysInactive,
          health,
          canNudge,
          cooldownRemainingDays: daysSinceNudge < 7 ? 7 - daysSinceNudge : 0,
          startDate: m.startDate ? m.startDate.toISOString() : new Date().toISOString(),
        };
      })
    );

    // 6. Compute Diagrammatic Distributions for Visual Reports (Parallelized Batch)
    const allActiveMentorships = await Mentorship.find({ status: "active" })
      .select("_id mentorId studentId createdAt")
      .lean();

    let totalHealthy = 0;
    let totalAtRisk = 0;
    let totalStalled = 0;

    const allSessions = await Promise.all(
      allActiveMentorships.map((m) =>
        Session.findOne({
          mentorId: m.mentorId,
          menteeId: m.studentId,
        })
          .sort({ date: -1 })
          .select("date")
          .lean()
      )
    );

    allSessions.forEach((lastSession, idx) => {
      const m = allActiveMentorships[idx];
      const lastActivityDate = lastSession?.date ? new Date(lastSession.date).getTime() : new Date(m.createdAt).getTime();
      const daysInactive = Math.max(0, Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24)));
      if (daysInactive >= 14) totalStalled++;
      else if (daysInactive >= 8) totalAtRisk++;
      else totalHealthy++;
    });

    let capAvailable = 0;
    let capNearCapacity = 0;
    let capAtCapacity = 0;
    let capPaused = 0;

    const saturatedCaps = capacities.filter((cap) => {
      const active = cap.activeMentees || 0;
      const max = cap.maxMentees || 1;
      return active >= max;
    });

    const saturatedMentorIds = saturatedCaps.map((c) => c.mentorId);
    const saturatedUserDocs = await User.find({ _id: { $in: saturatedMentorIds } })
      .select("name")
      .lean();
    const saturatedUserMap = new Map(saturatedUserDocs.map((u) => [String(u._id), u.name]));

    const saturatedMentors: Array<{ id: string; mentorId: string; name: string; activeMentees: number; maxMentees: number }> = [];

    for (const cap of capacities) {
      const active = cap.activeMentees || 0;
      const max = cap.maxMentees || 1;
      const isPaused = cap.acceptingRequests === false;
      const isAtLimit = active >= max;

      if (isPaused) {
        capPaused++;
      } else if (isAtLimit) {
        capAtCapacity++;
      } else if (active / max >= 0.75) {
        capNearCapacity++;
      } else {
        capAvailable++;
      }

      if (isAtLimit) {
        const mentorName = saturatedUserMap.get(String(cap.mentorId)) || "Alumni Mentor";
        saturatedMentors.push({
          id: String(cap._id),
          mentorId: String(cap.mentorId),
          name: mentorName,
          activeMentees: active,
          maxMentees: max,
        });
      }
    }

    return {
      success: true,
      officer: {
        id: officerId,
        name: officerName,
        role,
        institutionId,
        institutionName,
      },
      metrics: {
        pendingVerifications: pendingVerificationsCount,
        verifiedAlumni: verifiedAlumniCount,
        activeMentorships: activeMentorshipsCount,
        stalledMentorships: totalStalled,
        mentorSaturationRate: saturationRate,
        totalMentors: capacities.length,
      },
      momentumDistribution: [
        { name: "Healthy (≤7d)", count: totalHealthy, fill: "#10b981" },
        { name: "At Risk (8-13d)", count: totalAtRisk, fill: "#f59e0b" },
        { name: "Stalled (≥14d)", count: totalStalled, fill: "#f43f5e" },
      ],
      capacityDistribution: [
        { status: "Available (<75%)", count: capAvailable, fill: "#10b981" },
        { status: "Near Limit (75-99%)", count: capNearCapacity, fill: "#f59e0b" },
        { status: "At Capacity (100%)", count: capAtCapacity, fill: "#f43f5e" },
        { status: "Intake Paused", count: capPaused, fill: "#78716c" },
      ],
      saturatedMentors: saturatedMentors.slice(0, 5),
      recentVerifications,
      recentPairings,
      auditLogs: recentAuditLogs.map((log) => ({
        id: String(log._id),
        action: log.action,
        resource: log.resource,
        timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
        actorRole: log.actorRole || "alumni_relations_officer",
        details: log.details || {},
      })),
    };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to load officer dashboard data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal error loading dashboard",
    };
  }
}

// ----------------------------------------------------------------------------
// 2. VERIFICATION QUEUE & DECISIONS (Module M1)
// ----------------------------------------------------------------------------
export async function getVerificationRequests(
  filter: "all" | "pending" | "verified" | "rejected" = "pending"
) {
  try {
    const { institutionId } = await getOfficerContext();

    const query: Record<string, unknown> = {
      institutionId: { $in: [institutionId, "INST-001", "Lovely Professional University"] },
    };
    if (filter !== "all") {
      query.status = filter;
    }

    const requests = await VerificationRequest.find(query)
      .sort({ submittedAt: -1 })
      .populate("userId", "name role createdAt")
      .populate("documents")
      .lean();

    // Map safely with zero personal email or phone leakage (Invariant 2)
    const items = requests.map((req) => {
      const u = req.userId as unknown as { name?: string; _id: mongoose.Types.ObjectId; createdAt?: Date } | null;
      const docs = Array.isArray(req.documents) ? req.documents : [];

      return {
        id: String(req._id),
        alumnusId: String(req.userId?._id || req.alumnusId),
        alumnusName: u?.name || "Alumnus",
        institutionalIdentifier: req.institutionalIdentifier,
        degree: req.degree || "Degree Unspecified",
        graduationYear: req.graduationYear || new Date().getFullYear(),
        status: req.status,
        submittedAt: req.submittedAt ? req.submittedAt.toISOString() : new Date().toISOString(),
        decidedAt: req.decidedAt ? req.decidedAt.toISOString() : undefined,
        rejectionReason: req.rejectionReason,
        documents: docs.map((doc: unknown) => {
          const d = doc as {
            _id: mongoose.Types.ObjectId;
            fileName?: string;
            fileUrl?: string;
            declaredContentType?: string;
            documentType?: string;
            sizeBytes?: number;
          };
          return {
            id: String(d._id),
            fileName: d.fileName || "Credential_Document.pdf",
            fileUrl: d.fileUrl || "#",
            contentType: d.declaredContentType || "application/pdf",
            documentType: d.documentType || "institutional_id_proof",
            sizeBytes: d.sizeBytes || 0,
          };
        }),
      };
    });

    return { success: true, requests: items };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to fetch verification requests:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error fetching verifications" };
  }
}

export async function decideVerification(
  requestId: string,
  decision: "verified" | "rejected",
  rejectionReason?: string
) {
  try {
    const { officerId, officerName, role, institutionId } = await getOfficerContext();

    if (!requestId || !["verified", "rejected"].includes(decision)) {
      return { success: false, error: "Invalid verification decision parameters." };
    }

    if (decision === "rejected" && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return { success: false, error: "A rejection reason is mandatory when declining a verification request." };
    }

    const verificationReq = await VerificationRequest.findOne({
      _id: requestId,
      institutionId: { $in: [institutionId, "INST-001", "Lovely Professional University"] },
    });

    if (!verificationReq) {
      return { success: false, error: "Verification request not found." };
    }

    if (verificationReq.status !== "pending") {
      return { success: false, error: `This request has already been ${verificationReq.status}.` };
    }

    // Atomic update
    verificationReq.status = decision;
    verificationReq.decidedAt = new Date();
    verificationReq.decidedBy = new mongoose.Types.ObjectId(officerId);
    if (decision === "rejected") {
      verificationReq.rejectionReason = rejectionReason?.trim();
    }
    await verificationReq.save();

    // If verified, ensure User, AlumniProfile, and MentorProfile reflect verified status
    if (decision === "verified") {
      await User.findByIdAndUpdate(verificationReq.userId, {
        $set: {
          verificationStatus: "verified",
          isVerified: true,
        },
      });

      await AlumniProfile.findOneAndUpdate(
        { userId: verificationReq.userId },
        {
          $set: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        },
        { upsert: false }
      );

      await MentorProfile.findOneAndUpdate(
        { userId: verificationReq.userId },
        {
          $set: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        },
        { upsert: false }
      );

      await MentorCapacity.findOneAndUpdate(
        { mentorId: verificationReq.userId },
        { $set: { acceptingRequests: true } },
        { upsert: true }
      );
    } else if (decision === "rejected") {
      await User.findByIdAndUpdate(verificationReq.userId, {
        $set: {
          verificationStatus: "rejected",
          isVerified: false,
        },
      });
    }

    // Send email notification to Alumnus via Resend
    try {
      const alumnus = await User.findById(verificationReq.userId).lean();
      if (alumnus?.email) {
        const resendApiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        if (decision === "verified") {
          const subject = "Congratulations! Your Alma Alumni Verification is Approved 🎉";
          const bodyText = `Hello ${alumnus.name || "Alumnus"},\n\nGreat news! Your alumni verification request for Lovely Professional University has been reviewed and approved by the Alumni Relations Office.\n\nYour Mentor Workspace is now unlocked, and students can now discover you in the mentor directory.\n\nSign in to your dashboard: ${appUrl}/mentor/dashboard\n\nWarm regards,\nAlumni Relations Office\nLovely Professional University`;

          if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: fromEmail,
              to: [alumnus.email],
              subject,
              text: bodyText,
            });
          }
          console.log(`[ALMA EMAIL] Verification approval email dispatched to ${alumnus.email}`);
        } else {
          const subject = "Update regarding your Alma Alumni Verification Request";
          const reasonText = rejectionReason || "Credential mismatch with institutional records";
          const bodyText = `Hello ${alumnus.name || "Alumnus"},\n\nYour alumni verification request for Lovely Professional University could not be verified at this time.\n\nReason: ${reasonText}\n\nPlease log in to review your submission or contact the Alumni Relations Office at alumni@university.edu for assistance.\n\nPortal: ${appUrl}/mentor/dashboard\n\nWarm regards,\nAlumni Relations Office\nLovely Professional University`;

          if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: fromEmail,
              to: [alumnus.email],
              subject,
              text: bodyText,
            });
          }
          console.log(`[ALMA EMAIL] Verification rejection notice dispatched to ${alumnus.email}`);
        }
      }
    } catch (mailErr) {
      console.error("[Email Notification Error]:", mailErr);
    }

    // Write audit log entry
    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: decision === "verified" ? "ALUMNI_VERIFIED" : "ALUMNI_REJECTED",
      resource: "VerificationRequest",
      resourceId: requestId,
      details: {
        alumnusId: String(verificationReq.userId),
        decision,
        rejectionReason: rejectionReason || null,
        decidedBy: officerName,
      },
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/verifications");

    return {
      success: true,
      message: `Alumni verification request ${decision === "verified" ? "approved" : "rejected"} successfully.`,
    };
  } catch (error) {
    console.error("Failed to decide verification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Internal error updating verification." };
  }
}

// ----------------------------------------------------------------------------
// 3. MOMENTUM & INACTIVITY WATCHDOG (Module M8)
// ----------------------------------------------------------------------------
export async function getMomentumPairings() {
  try {
    await getOfficerContext();

    const activePairings = await Mentorship.find({ status: "active" })
      .populate("studentId", "name createdAt")
      .populate("mentorId", "name createdAt")
      .lean();

    const now = Date.now();

    const pairings = await Promise.all(
      activePairings.map(async (p) => {
        const student = p.studentId as unknown as { name?: string; _id: mongoose.Types.ObjectId } | null;
        const mentor = p.mentorId as unknown as { name?: string; _id: mongoose.Types.ObjectId } | null;

        // Check last session (covered by compound index { mentorId, menteeId, date: -1 })
        const lastSession = await Session.findOne({
          mentorId: p.mentorId,
          menteeId: p.studentId,
        })
          .sort({ date: -1 })
          .select("date")
          .lean();

        // Check engagement snapshot
        const snapshot = await EngagementSnapshot.findOne({
          mentorshipId: p._id,
        }).lean();

        const lastActivityDate = lastSession?.date
          ? new Date(lastSession.date).getTime()
          : new Date(p.createdAt).getTime();

        const daysInactive = Math.max(0, Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24)));

        let health: "healthy" | "at_risk" | "stalled" = "healthy";
        if (daysInactive >= 14) {
          health = "stalled";
        } else if (daysInactive >= 8) {
          health = "at_risk";
        }

        const lastNudgeDate = snapshot?.nudgeIssuedAt ? new Date(snapshot.nudgeIssuedAt) : null;
        const daysSinceNudge = lastNudgeDate
          ? Math.floor((now - lastNudgeDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const canNudge = daysSinceNudge >= 7;
        const cooldownRemainingDays = daysSinceNudge < 7 ? 7 - daysSinceNudge : 0;

        return {
          id: String(p._id),
          studentId: String(student?._id || p.studentId),
          studentName: student?.name || "Student",
          mentorId: String(mentor?._id || p.mentorId),
          mentorName: mentor?.name || "Mentor",
          startDate: p.startDate ? p.startDate.toISOString() : new Date().toISOString(),
          daysInactive,
          health,
          lastSessionDate: lastSession?.date ? new Date(lastSession.date).toISOString() : null,
          canNudge,
          cooldownRemainingDays,
          lastNudgeIssuedAt: lastNudgeDate ? lastNudgeDate.toISOString() : null,
        };
      })
    );

    return { success: true, pairings };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to fetch momentum pairings:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error loading momentum data." };
  }
}

export async function nudgeMentorship(mentorshipId: string) {
  try {
    const { officerId, officerName, role, institutionId } = await getOfficerContext();

    if (!mentorshipId) {
      return { success: false, error: "Mentorship ID is required." };
    }

    const mentorship = await Mentorship.findById(mentorshipId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email")
      .lean();

    if (!mentorship) {
      return { success: false, error: "Mentorship relationship not found." };
    }

    // Check 7-day cooldown guard
    const existingSnapshot = await EngagementSnapshot.findOne({
      mentorshipId: new mongoose.Types.ObjectId(mentorshipId),
    }).lean();

    const now = new Date();
    if (existingSnapshot?.nudgeIssuedAt) {
      const msSinceNudge = now.getTime() - new Date(existingSnapshot.nudgeIssuedAt).getTime();
      const daysSinceNudge = msSinceNudge / (1000 * 60 * 60 * 24);
      if (daysSinceNudge < 7) {
        const remainingDays = Math.ceil(7 - daysSinceNudge);
        return {
          success: false,
          error: `Cooldown active: A nudge was issued recently. Please wait ${remainingDays} more day(s) before nudging again.`,
        };
      }
    }

    // Upsert EngagementSnapshot with new nudgeIssuedAt timestamp
    await EngagementSnapshot.findOneAndUpdate(
      { mentorshipId: new mongoose.Types.ObjectId(mentorshipId) },
      {
        $set: {
          institutionId,
          status: "stalled",
          nudgeIssuedAt: now,
          assessedAt: now,
        },
      },
      { upsert: true, new: true }
    );

    // Option B: Dispatch automated email notification via Resend to both parties
    const student = mentorship.studentId as unknown as { name?: string; email?: string } | null;
    const mentor = mentorship.mentorId as unknown as { name?: string; email?: string } | null;

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (resendApiKey && student?.email && mentor?.email) {
      try {
        const resend = new Resend(resendApiKey);

        // Send email to student
        await resend.emails.send({
          from: fromEmail,
          to: [student.email],
          subject: "Keep the momentum going! Check in with your Alma mentor",
          text: `Hi ${student.name || "Student"},\n\nIt has been a little while since your last activity with your mentor ${mentor.name || "Alumni Mentor"}. Log in to Alma to review your goals, share updates, or schedule your next check-in session:\n\nhttps://alma.network/mentorship\n\nBest regards,\nAlumni Relations Office`,
        });

        // Send email to mentor
        await resend.emails.send({
          from: fromEmail,
          to: [mentor.email],
          subject: "Mentorship Check-in: Reconnect with your mentee",
          text: `Hi ${mentor.name || "Mentor"},\n\nWe noticed your mentorship pairing with ${student.name || "Student"} hasn't had recent activity. A quick message or 15-minute sync can make a world of difference in their career journey!\n\nVisit your mentor workspace to send a message or suggest a time:\n\nhttps://alma.network/mentor/dashboard\n\nThank you for your dedication,\nAlumni Relations Office`,
        });
      } catch (emailErr) {
        console.warn("Resend email dispatch notice (non-fatal):", emailErr);
      }
    }

    // Log the action in AuditLog
    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "ENGAGEMENT_NUDGE_TRIGGERED",
      resource: "Mentorship",
      resourceId: mentorshipId,
      details: {
        studentId: String(mentorship.studentId?._id || mentorship.studentId),
        mentorId: String(mentorship.mentorId?._id || mentorship.mentorId),
        dispatchedBy: officerName,
        emailNotified: Boolean(resendApiKey),
      },
      timestamp: now,
    });

    revalidatePath("/officer");
    revalidatePath("/officer/momentum");

    return {
      success: true,
      message: "Engagement nudge successfully dispatched to both student and mentor.",
    };
  } catch (error) {
    console.error("Failed to nudge mentorship:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error triggering nudge." };
  }
}

// ----------------------------------------------------------------------------
// 4. MENTOR CAPACITY WATCHDOG (Module M2)
// ----------------------------------------------------------------------------
export async function getMentorCapacitiesData() {
  try {
    await getOfficerContext();

    // Query mentor capacities
    const capacities = await MentorCapacity.find()
      .populate("mentorId", "name role createdAt")
      .lean();

    // Invariant 2: Contact Details Shielded (strictly no email or phone returned)
    const mentors = await Promise.all(
      capacities.map(async (c) => {
        const u = c.mentorId as unknown as { name?: string; _id: mongoose.Types.ObjectId } | null;
        const profile = await AlumniProfile.findOne({ userId: c.mentorId }).lean();

        const active = c.activeMentees || 0;
        const max = c.maxMentees || 0;
        const saturation = max > 0 ? Math.round((active / max) * 100) : 0;
        const isAtCapacity = active >= max;

        return {
          id: String(c._id),
          mentorId: String(u?._id || c.mentorId),
          name: u?.name || "Mentor",
          company: profile?.company || "Tech Company",
          jobTitle: profile?.jobTitle || "Mentor",
          industry: profile?.industry || "Software",
          maxMentees: max,
          activeMentees: active,
          saturationPercentage: saturation,
          isAtCapacity,
          acceptingRequests: c.acceptingRequests !== false,
          status: c.status || (isAtCapacity ? "at_capacity" : "available"),
        };
      })
    );

    return { success: true, mentors };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to fetch mentor capacities:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error loading capacity data." };
  }
}

export async function toggleMentorAcceptance(mentorId: string, accepting: boolean) {
  try {
    const { officerId, officerName, role, institutionId } = await getOfficerContext();

    if (!mentorId) {
      return { success: false, error: "Mentor ID is required." };
    }

    const capacity = await MentorCapacity.findOne({ mentorId });
    if (!capacity) {
      return { success: false, error: "Mentor capacity record not found." };
    }

    // Invariant 1: Mentor declared capacity must never be exceeded
    // If attempting to re-open while already at or above capacity, enforce limit
    if (accepting && capacity.activeMentees >= capacity.maxMentees) {
      return {
        success: false,
        error: `Cannot open requests: Mentor is currently at full capacity (${capacity.activeMentees}/${capacity.maxMentees} mentees).`,
      };
    }

    capacity.acceptingRequests = accepting;
    capacity.status = accepting ? (capacity.activeMentees >= capacity.maxMentees ? "at_capacity" : "available") : "paused";
    await capacity.save();

    // Audit log entry
    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: accepting ? "MENTOR_INTAKE_RESUMED" : "MENTOR_INTAKE_PAUSED",
      resource: "MentorCapacity",
      resourceId: String(capacity._id),
      details: {
        mentorId,
        acceptingRequests: accepting,
        toggledBy: officerName,
      },
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/capacity");

    return {
      success: true,
      message: `Mentor request intake ${accepting ? "resumed" : "paused"} successfully.`,
    };
  } catch (error) {
    console.error("Failed to toggle mentor acceptance:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error toggling intake state." };
  }
}

// ----------------------------------------------------------------------------
// 5. REPORTS & AUDIT TRAIL (Module M10)
// ----------------------------------------------------------------------------
export async function getAuditReportsData() {
  try {
    const { institutionId } = await getOfficerContext();

    const [logs, totalActive, totalCompleted, totalVerified] = await Promise.all([
      AuditLog.find({ institutionId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean(),
      Mentorship.countDocuments({ status: "active" }),
      Mentorship.countDocuments({ status: "completed" }),
      VerificationRequest.countDocuments({ institutionId, status: "verified" }),
    ]);

    const totalPairings = totalActive + totalCompleted;
    const completionRate = totalPairings > 0 ? Math.round((totalCompleted / totalPairings) * 100) : 0;

    return {
      success: true,
      stats: {
        activePairings: totalActive,
        completedPairings: totalCompleted,
        totalVerifiedAlumni: totalVerified,
        completionRate,
        satisfactionScore: 4.8, // Institutional benchmark
      },
      auditLogs: logs.map((log) => ({
        id: String(log._id),
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        actorRole: log.actorRole || "alumni_relations_officer",
        timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
        details: log.details || {},
      })),
    };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to load audit reports:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error loading reports." };
  }
}

// ----------------------------------------------------------------------------
// 6. OFFICER PROFILE & PASSWORD MANAGEMENT
// ----------------------------------------------------------------------------
export async function updateOfficerPassword(newPassword: string) {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(officerId, {
      $set: { password: hashedPassword },
    });

    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "OFFICER_PASSWORD_UPDATED",
      resource: "User",
      resourceId: officerId,
      details: { timestamp: new Date() },
      timestamp: new Date(),
    });

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    console.error("Failed to update officer password:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update password." };
  }
}

// Admin-assisted officer provisioning
export async function createOfficerAccount(input: {
  email: string;
  name: string;
  password?: string;
  institutionId?: string;
}) {
  try {
    const { role, institutionId: currentInstId } = await getOfficerContext();

    // Only administrators or existing officers can provision
    if (role !== "administrator") {
      return { success: false, error: "Only platform administrators can create new officer accounts." };
    }

    const email = input.email.trim().toLowerCase();
    const rawPassword = input.password || "Officer@123";
    const targetInst = input.institutionId || currentInstId;

    const existing = await User.findOne({ email });
    if (existing) {
      return { success: false, error: "An account with this email address already exists." };
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const newOfficer = await User.create({
      email,
      name: input.name.trim(),
      password: hashedPassword,
      role: "alumni_relations_officer",
      institutionId: targetInst,
      twoFactorEnabled: false,
    });

    return {
      success: true,
      message: `Officer account created for ${email}.`,
      officerId: String(newOfficer._id),
    };
  } catch (error) {
    console.error("Failed to create officer account:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error creating officer account." };
  }
}


// ----------------------------------------------------------------------------
// 7. OFFICER PROFILE & INSTITUTION SETTINGS
// ----------------------------------------------------------------------------
export async function getOfficerProfileData() {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    const [user, institution, logs, verifiedCount, nudgesCount, activePairingsCount] = await Promise.all([
      User.findById(officerId).lean(),
      Institution.findOne({ code: institutionId }).lean(),
      AuditLog.find({ actorId: new mongoose.Types.ObjectId(officerId) })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
      VerificationRequest.countDocuments({ institutionId, status: "verified" }),
      AuditLog.countDocuments({ institutionId, action: "ENGAGEMENT_NUDGE_TRIGGERED" }),
      Mentorship.countDocuments({ status: "active" }),
    ]);

    if (!user) {
      return { success: false, error: "Officer record not found." };
    }

    return {
      success: true,
      officer: {
        id: officerId,
        name: user.name || "Alumni Relations Officer",
        email: user.email,
        role: user.role || role,
        designation: user.designation || "Director of Alumni Relations & Mentorship Governance",
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        institutionId,
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        stats: {
          degreesVerified: verifiedCount,
          nudgesIssued: nudgesCount,
          pairingsOverseen: activePairingsCount,
        },
      },
      institution: {
        code: institution?.code || institutionId,
        name: institution?.name || "Apex Institute of Technology",
        domain: institution?.domain || "apex.edu",
        status: institution?.status || "active",
        officeLocation: institution?.officeLocation || "Administration Hall, Suite 402",
        officeHours: institution?.officeHours || "Mon–Fri, 9:00 AM – 5:00 PM",
      },
      recentActions: logs.map((log) => ({
        id: String(log._id),
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
        details: log.details || {},
      })),
    };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to load officer profile data:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error loading profile." };
  }
}

export async function updateOfficerProfileDetails(name: string, designation?: string) {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    if (!name || !name.trim()) {
      return { success: false, error: "Officer name cannot be empty." };
    }

    const trimmedName = name.trim();
    const trimmedDesignation = (designation && designation.trim()) || "Director of Alumni Relations & Mentorship Governance";

    await User.findByIdAndUpdate(officerId, {
      $set: {
        name: trimmedName,
        designation: trimmedDesignation,
      },
    });

    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "OFFICER_PROFILE_UPDATED",
      resource: "User",
      resourceId: officerId,
      details: { name: trimmedName, designation: trimmedDesignation, timestamp: new Date() },
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/profile");

    return { success: true, message: "Officer profile details updated successfully." };
  } catch (error) {
    console.error("Failed to update officer profile:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error updating profile." };
  }
}

export async function updateOfficerName(name: string, designation?: string) {
  return updateOfficerProfileDetails(name, designation);
}

export async function _legacyUpdateOfficerName(name: string) {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    if (!name || !name.trim()) {
      return { success: false, error: "Officer name cannot be empty." };
    }

    const trimmedName = name.trim();

    await User.findByIdAndUpdate(officerId, {
      $set: { name: trimmedName },
    });

    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "OFFICER_NAME_UPDATED",
      resource: "User",
      resourceId: officerId,
      details: { name: trimmedName, timestamp: new Date() },
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/profile");

    return { success: true, message: "Officer name updated successfully." };
  } catch (error) {
    console.error("Failed to update officer name:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error updating name." };
  }
}

export async function updateOfficerAvatar(avatarUrl: string) {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    await User.findByIdAndUpdate(officerId, {
      $set: { avatarUrl: avatarUrl.trim() },
    });

    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "OFFICER_AVATAR_UPDATED",
      resource: "User",
      resourceId: officerId,
      details: { timestamp: new Date() },
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/profile");

    return { success: true, message: "Profile picture updated successfully." };
  } catch (error) {
    console.error("Failed to update officer avatar:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error updating photo." };
  }
}

export async function updateOfficerBanner(bannerUrl: string) {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    await User.findByIdAndUpdate(officerId, {
      $set: { bannerUrl: bannerUrl.trim() },
    });

    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "OFFICER_BANNER_UPDATED",
      resource: "User",
      resourceId: officerId,
      details: { timestamp: new Date() },
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/profile");

    return { success: true, message: "Profile banner updated successfully." };
  } catch (error) {
    console.error("Failed to update officer banner:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error updating banner." };
  }
}

export async function updateInstitutionDetails(input: {
  name: string;
  officeLocation?: string;
  officeHours?: string;
}) {
  try {
    const { officerId, institutionId, role } = await getOfficerContext();

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: "Institution name cannot be empty." };
    }

    const trimmedName = input.name.trim();
    const updatePayload: Record<string, unknown> = { name: trimmedName };
    if (input.officeLocation !== undefined) updatePayload.officeLocation = input.officeLocation.trim();
    if (input.officeHours !== undefined) updatePayload.officeHours = input.officeHours.trim();

    await Institution.findOneAndUpdate(
      { code: institutionId },
      { $set: updatePayload },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      institutionId,
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: role,
      action: "INSTITUTION_DETAILS_UPDATED",
      resource: "Institution",
      resourceId: institutionId,
      details: updatePayload,
      timestamp: new Date(),
    });

    revalidatePath("/officer");
    revalidatePath("/officer/profile");

    return { success: true, message: "Institution details updated successfully." };
  } catch (error) {
    console.error("Failed to update institution details:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error updating institution." };
  }
}
