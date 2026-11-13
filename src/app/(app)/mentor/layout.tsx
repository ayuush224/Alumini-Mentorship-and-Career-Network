import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { getCachedUser, getCachedMentorProfile, getCachedPendingRequestsCount } from "@/lib/dal";
import { MentorHeader } from "./_components/mentor-header";

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
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        const [user, profile, reqCount] = await Promise.all([
          getCachedUser(payload.sub),
          getCachedMentorProfile(payload.sub),
          getCachedPendingRequestsCount(payload.sub),
        ]);
        if (user) {
          mentorName = user.name || (user.email ? user.email.split("@")[0] : "Mentor");
          avatarUrl = profile?.avatarUrl || user.mentorProfile?.avatarUrl;
          pendingRequestsCount = reqCount;
        }
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
