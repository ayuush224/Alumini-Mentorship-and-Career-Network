import React from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Mentorship } from "@/lib/models/Mentorship";
import { Message } from "@/lib/models/Communication";
import { User, MentorProfile } from "@/lib/models/User";
import { StudentChatView } from "./_components/student-chat-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat with Mentor | Alma",
  description: "Real-time communication with your verified alumni mentor.",
};

interface StudentChatPageProps {
  params: Promise<{
    mentorId: string;
  }>;
}

export default async function StudentChatPage({ params }: StudentChatPageProps) {
  const { mentorId } = await params;
  await connectDB();

  let studentId = "";

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyAccess(token);
  if (!payload?.sub) {
    redirect("/login");
  }
  studentId = payload.sub;

  // Step 4 Verification: Ensure active mentorship contract exists between this student and mentorId
  const mentorship = await Mentorship.findOne({
    studentId,
    mentorId,
    status: "active",
    isDeleted: { $ne: true },
  }).lean();

  if (!mentorship) {
    redirect("/student/mentorship");
  }

  // Fetch mentor user and profile details
  const [mentorUser, mp] = await Promise.all([
    User.findById(mentorId).lean(),
    MentorProfile.findOne({ userId: mentorId }).lean(),
  ]);

  if (!mentorUser) {
    notFound();
  }

  const embeddedMp = (mentorUser.mentorProfile || {}) as Record<string, unknown>;

  const mentorDetails = {
    id: mentorId,
    name: mentorUser.name || "Alumni Mentor",
    company: mp?.company || (embeddedMp.company as string) || "Partner Organization",
    role: mp?.jobTitle || (embeddedMp.jobTitle as string) || "Alumni Mentor",
    avatarUrl: mp?.avatarUrl || (embeddedMp.avatarUrl as string | undefined),
  };

  // Fetch initial message history
  const rawMessages = await Message.find({ mentorshipId: mentorship._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const initialMessages = rawMessages.reverse().map((m) => ({
    id: String(m._id),
    mentorshipId: String(m.mentorshipId),
    senderId: String(m.senderId),
    senderRole: m.senderRole,
    content: m.content || "",
    fileUrl: m.fileUrl || undefined,
    fileName: m.fileName || undefined,
    fileType: m.fileType || undefined,
    fileSize: m.fileSize || undefined,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <StudentChatView
        mentorshipId={String(mentorship._id)}
        mentor={mentorDetails}
        currentUserId={studentId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
