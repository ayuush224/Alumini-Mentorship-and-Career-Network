import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { User, MentorProfile } from "@/lib/models/User";
import { MentorshipRequest } from "@/lib/models/Mentorship";
import { VerificationRequest } from "@/lib/models/Verification";
import { MentorHeader } from "./_components/mentor-header";
import { MentorVerificationPending } from "./_components/mentor-verification-pending";

export const dynamic = "force-dynamic";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let mentorName = "Mentor";
  let mentorEmail = "";
  let mentorId = "";
  let avatarUrl: string | undefined;
  let pendingRequestsCount = 0;
  let isVerified = false;
  let verificationStatus = "pending";
  let verificationData: {
    institutionalIdentifier?: string;
    graduationYear?: number;
    degree?: string;
    submittedAt?: string;
    rejectionReason?: string;
    status?: string;
    documents?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      documentType?: string;
      sizeBytes?: number;
    }>;
  } | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) {
      redirect("/login");
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      redirect("/login");
    }

    mentorId = payload.sub;

    await connectDB();
    const [user, profile, reqCount, verificationReq] = await Promise.all([
      User.findById(mentorId).lean(),
      MentorProfile.findOne({ userId: mentorId }).lean(),
      MentorshipRequest.countDocuments({
        mentorId,
        status: "pending",
      }),
      VerificationRequest.findOne({
        $or: [{ userId: mentorId }, { alumnusId: mentorId }],
      })
        .sort({ submittedAt: -1 })
        .populate("documents")
        .lean(),
    ]);

    if (!user) {
      redirect("/login");
    }

    mentorName = user.name || (user.email ? user.email.split("@")[0] : "Mentor");
    mentorEmail = user.email;
    avatarUrl = profile?.avatarUrl || user.mentorProfile?.avatarUrl;
    pendingRequestsCount = reqCount;

    // Determine verification status
    // A user is verified if:
    // 1. user.isVerified === true OR user.verificationStatus === "verified"
    // 2. OR their latest VerificationRequest status is "verified"
    // 3. OR profile.isVerified === true
    if (
      user.isVerified === true ||
      user.verificationStatus === "verified" ||
      verificationReq?.status === "verified" ||
      profile?.isVerified === true
    ) {
      isVerified = true;
      verificationStatus = "verified";

      // Self-heal user document if needed
      if (!user.isVerified || user.verificationStatus !== "verified") {
        await User.findByIdAndUpdate(mentorId, {
          $set: { isVerified: true, verificationStatus: "verified" },
        });
      }
    } else if (
      user.verificationStatus === "rejected" ||
      verificationReq?.status === "rejected"
    ) {
      isVerified = false;
      verificationStatus = "rejected";
    } else {
      isVerified = false;
      verificationStatus = "pending";
    }

    if (verificationReq) {
      const rawDocs = Array.isArray(verificationReq.documents) ? verificationReq.documents : [];
      verificationData = {
        institutionalIdentifier: verificationReq.institutionalIdentifier,
        graduationYear: verificationReq.graduationYear,
        degree: verificationReq.degree,
        submittedAt: verificationReq.submittedAt ? verificationReq.submittedAt.toISOString() : undefined,
        rejectionReason: verificationReq.rejectionReason,
        status: verificationReq.status,
        documents: rawDocs.map((d: unknown) => {
          const doc = d as {
            _id: unknown;
            fileName?: string;
            fileUrl?: string;
            documentType?: string;
            sizeBytes?: number;
          };
          return {
            id: String(doc._id),
            fileName: doc.fileName || "Uploaded_Document",
            fileUrl: doc.fileUrl || "#",
            documentType: doc.documentType || "institutional_id_proof",
            sizeBytes: doc.sizeBytes || 0,
          };
        }),
      };
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    redirect("/login");
  }

  // If alumni is NOT verified, restrict access and show Verification Pending Screen
  if (!isVerified) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFF] text-stone-900">
        <MentorVerificationPending
          user={{
            id: mentorId,
            name: mentorName,
            email: mentorEmail,
            verificationStatus,
            isVerified,
          }}
          verification={verificationData}
        />
      </div>
    );
  }

  // Once verified, full mentor workspace is rendered!
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF] text-stone-900">
      <MentorHeader
        user={{ name: mentorName, avatarUrl }}
        pendingRequestsCount={pendingRequestsCount}
      />
      <main className="flex-1 py-8 px-4 sm:px-6">{children}</main>
    </div>
  );
}
