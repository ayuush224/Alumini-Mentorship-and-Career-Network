import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Mentorship } from "@/lib/models/Mentorship";
import { Message } from "@/lib/models/Communication";
import { StudentProfile } from "@/lib/models/User";
import {
  MentorChatWorkspace,
  MenteeConversationItem,
} from "./_components/mentor-chat-workspace";


export const metadata = {
  title: "Mentor Communications | Alma",
  description: "Real-time bilateral messaging with verified student mentees.",
};

interface MentorChatPageProps {
  searchParams?: Promise<{
    menteeId?: string;
    mentorshipId?: string;
    studentId?: string;
  }>;
}

export default async function MentorChatPage(props: MentorChatPageProps) {
  await connectDB();

  const resolvedParams = props.searchParams ? await props.searchParams : undefined;
  const initialMenteeId = resolvedParams?.menteeId || resolvedParams?.studentId;
  const initialMentorshipId = resolvedParams?.mentorshipId;

  let mentorId = "";
  let mentees: MenteeConversationItem[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        mentorId = payload.sub;

        // Query active mentorships for this mentor
        const activeMentorships = await Mentorship.find({
          mentorId,
          status: "active",
          isDeleted: { $ne: true },
        })
          .populate("studentId")
          .lean();

        // Batch fetch all student profiles for chat roster in 1 query
        const studentUserIds = activeMentorships
          .map((m) => {
            const studentUser = (m.studentId as unknown as Record<string, unknown>) || {};
            return studentUser._id ? String(studentUser._id) : null;
          })
          .filter(Boolean) as string[];

        const studentProfiles =
          studentUserIds.length > 0
            ? await StudentProfile.find({ userId: { $in: studentUserIds } }).lean()
            : [];
        const profileMap = new Map(studentProfiles.map((p) => [String(p.userId), p]));

        mentees = await Promise.all(
          activeMentorships.map(async (m) => {
            const studentUser = (m.studentId as unknown as Record<string, unknown>) || {};
            const studentUserId = studentUser._id ? String(studentUser._id) : "";

            let avatarUrl: string | undefined;
            let major = "Undergraduate Student";

            if (studentUserId) {
              const sp = profileMap.get(studentUserId);
              if (sp) {
                avatarUrl = sp.avatarUrl;
                major = sp.major || major;
              } else {
                const embeddedSp = (studentUser.studentProfile || {}) as Record<string, unknown>;
                avatarUrl = embeddedSp.avatarUrl as string | undefined;
                major = (embeddedSp.major as string) || major;
              }
            }

            // Fetch last message for preview
            const lastMsg = await Message.findOne({ mentorshipId: m._id })
              .sort({ createdAt: -1 })
              .lean();

            let lastMessageTime: string | undefined;
            if (lastMsg) {
              lastMessageTime = new Date(lastMsg.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }

            return {
              mentorshipId: String(m._id),
              studentId: studentUserId,
              name: (studentUser.name as string) || "Student Mentee",
              major,
              avatarUrl,
              lastMessage: lastMsg?.content
                ? lastMsg.content
                : lastMsg?.fileUrl
                ? "📎 Sent an attachment"
                : "Conversation active",
              lastMessageTime,
            };
          })
        );
      }
    }
  } catch (err) {
    console.error("Error loading mentor chat:", err);
  }

  if (!mentorId) {
    redirect("/login");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <MentorChatWorkspace
        initialMentees={mentees}
        currentUserId={mentorId}
        initialSelectedMentorshipId={initialMentorshipId}
        initialSelectedStudentId={initialMenteeId}
      />
    </div>
  );
}
