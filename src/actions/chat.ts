"use server";

import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyAccess } from "@/lib/app-tokens";
import { connectDB } from "@/lib/db";
import { Message, SharedNote, IMessage } from "@/lib/models/Communication";
import { Mentorship } from "@/lib/models/Mentorship";
import { broadcastMessage } from "@/lib/pusher-server";
import { uploadChatAttachmentToCloudinary } from "@/lib/cloudinary";

export interface ChatMessageItem {
  id: string;
  mentorshipId: string;
  senderId: string;
  senderRole: "student" | "mentor";
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string; // ISO
}

export interface SharedNoteItem {
  id: string;
  mentorId: string;
  menteeId?: string | null;
  isAllMentees?: boolean;
  sessionId?: string | null;
  title: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string; // ISO
}

export interface SendMessageOptions {
  fileAttachment?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize?: number;
  };
}

async function getAuthenticatedUser(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccess(token);
    return (payload?.sub as string) || null;
  } catch {
    return null;
  }
}

/**
 * Uploads a file attachment to Cloudinary for a verified mentorship conversation.
 * Max file size: 10MB.
 */
export async function uploadChatAttachmentAction(
  mentorshipId: string,
  formData: FormData
): Promise<{
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUser();
    if (!userId) {
      return { success: false, error: "Authentication required to upload files." };
    }

    if (!mongoose.Types.ObjectId.isValid(mentorshipId)) {
      return { success: false, error: "Invalid mentorship ID." };
    }

    // Verify caller is active student or mentor
    const mentorship = await Mentorship.findById(mentorshipId).lean();
    if (!mentorship || mentorship.status !== "active" || mentorship.isDeleted) {
      return { success: false, error: "Active mentorship relationship required." };
    }

    const isStudent = String(mentorship.studentId) === userId;
    const isMentor = String(mentorship.mentorId) === userId;
    if (!isStudent && !isMentor) {
      return { success: false, error: "Forbidden: You are not a member of this mentorship." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided." };
    }

    // Size limit: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File exceeds 10MB size limit." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRes = await uploadChatAttachmentToCloudinary(buffer, file.name);

    if (!uploadRes.success || !uploadRes.data) {
      return { success: false, error: uploadRes.error || "Failed to upload file to Cloudinary." };
    }

    return {
      success: true,
      fileUrl: uploadRes.data.secure_url,
      fileName: file.name,
      fileType: file.type || uploadRes.data.format || "application/octet-stream",
      fileSize: uploadRes.data.bytes || file.size,
    };
  } catch (error) {
    console.error("uploadChatAttachmentAction error:", error);
    return {
      success: false,
      error: "An error occurred while uploading your attachment.",
    };
  }
}

/**
 * Sends a real-time message inside a verified bilateral mentorship.
 * Enforces database persistence + real-time Pusher broadcasting.
 */
export async function sendMessageAction(
  mentorshipId: string,
  content: string,
  options?: SendMessageOptions
): Promise<{
  success: boolean;
  message?: ChatMessageItem;
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUser();
    if (!userId) {
      return { success: false, error: "Authentication required to send messages." };
    }

    const trimmedContent = content?.trim() || "";
    const hasFile = Boolean(options?.fileAttachment?.fileUrl);

    if (!trimmedContent && !hasFile) {
      return { success: false, error: "Message must contain text or an attachment." };
    }

    if (!mongoose.Types.ObjectId.isValid(mentorshipId)) {
      return { success: false, error: "Invalid mentorship ID." };
    }

    // Verify caller is active student or mentor
    const mentorship = await Mentorship.findById(mentorshipId).lean();
    if (!mentorship || mentorship.status !== "active" || mentorship.isDeleted) {
      return { success: false, error: "Active mentorship relationship required." };
    }

    const isStudent = String(mentorship.studentId) === userId;
    const isMentor = String(mentorship.mentorId) === userId;

    if (!isStudent && !isMentor) {
      return { success: false, error: "Forbidden: You are not a member of this mentorship." };
    }

    const senderRole: "student" | "mentor" = isMentor ? "mentor" : "student";

    // 1. Persist to MongoDB
    const createPayload: Partial<IMessage> = {
      mentorshipId: new mongoose.Types.ObjectId(mentorshipId),
      senderId: new mongoose.Types.ObjectId(userId),
      senderRole,
      content: trimmedContent,
      fileUrl: options?.fileAttachment?.fileUrl || null,
      fileName: options?.fileAttachment?.fileName || null,
      fileType: options?.fileAttachment?.fileType || null,
      fileSize: options?.fileAttachment?.fileSize || null,
    };

    const newMessageDoc = await Message.create(createPayload);

    const serializedMessage: ChatMessageItem = {
      id: String(newMessageDoc._id),
      mentorshipId,
      senderId: userId,
      senderRole,
      content: newMessageDoc.content || "",
      fileUrl: newMessageDoc.fileUrl || undefined,
      fileName: newMessageDoc.fileName || undefined,
      fileType: newMessageDoc.fileType || undefined,
      fileSize: newMessageDoc.fileSize || undefined,
      createdAt: newMessageDoc.createdAt.toISOString(),
    };

    // 2. Broadcast via Pusher WebSocket to the bilateral private channel
    await broadcastMessage(mentorshipId, "new-message", serializedMessage);

    return {
      success: true,
      message: serializedMessage,
    };
  } catch (error) {
    console.error("sendMessageAction error:", error);
    return {
      success: false,
      error: "An error occurred while transmitting your message.",
    };
  }
}

/**
 * Fetches message history using the compound index { mentorshipId: 1, createdAt: -1 }.
 */
export async function fetchMessagesAction(
  mentorshipId: string,
  limit = 50
): Promise<{
  success: boolean;
  messages?: ChatMessageItem[];
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUser();
    if (!userId) {
      return { success: false, error: "Authentication required." };
    }

    if (!mongoose.Types.ObjectId.isValid(mentorshipId)) {
      return { success: false, error: "Invalid mentorship ID." };
    }

    const mentorship = await Mentorship.findById(mentorshipId).lean();
    if (!mentorship || mentorship.status !== "active" || mentorship.isDeleted) {
      return { success: false, error: "Active mentorship not found." };
    }

    const isParticipant =
      String(mentorship.studentId) === userId || String(mentorship.mentorId) === userId;
    if (!isParticipant) {
      return { success: false, error: "Forbidden." };
    }

    // High performance index-backed query
    const rawMessages = await Message.find({ mentorshipId: new mongoose.Types.ObjectId(mentorshipId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Reverse to chronological order for client UI display
    const chronological: ChatMessageItem[] = rawMessages.reverse().map((m) => ({
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

    return {
      success: true,
      messages: chronological,
    };
  } catch (error) {
    console.error("fetchMessagesAction error:", error);
    return { success: false, error: "Failed to load message history." };
  }
}

/**
 * Uploads a file attachment for a session note or shared workspace note to Cloudinary.
 * Supported files: PDF, DOC, PPT, XLS, images, code/text files, ZIP (up to 10MB).
 */
export async function uploadSessionAttachmentAction(
  formData: FormData
): Promise<{
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUser();
    if (!userId) {
      return { success: false, error: "Authentication required to upload files." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided." };
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File exceeds 10MB size limit." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRes = await uploadChatAttachmentToCloudinary(buffer, file.name);

    if (!uploadRes.success || !uploadRes.data) {
      return {
        success: false,
        error: uploadRes.error || "Failed to upload file to Cloudinary.",
      };
    }

    return {
      success: true,
      fileUrl: uploadRes.data.secure_url,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: uploadRes.data.bytes || file.size,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Upload error";
    console.error("uploadSessionAttachmentAction error:", errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Step 3: Shared Notes Feed with strict Mentorship.startDate filter and recipient scoping.
 * Strictly excludes any notes created prior to the student's mentorship pairing date.
 * If a note was created for a specific mentee (1-on-1), only that mentee can view it.
 * If a note was created for all mentees (cohort), all mentees of this mentor can view it.
 */
export async function fetchSharedNotesAction(
  mentorId: string,
  mentorshipStartDate: string
): Promise<{
  success: boolean;
  notes?: SharedNoteItem[];
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUser();
    if (!userId) {
      return { success: false, error: "Authentication required." };
    }

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return { success: false, error: "Invalid mentor identifier." };
    }

    const startDate = new Date(mentorshipStartDate);
    if (isNaN(startDate.getTime())) {
      return { success: false, error: "Invalid mentorship start date." };
    }

    // Validation Check: Strictly filter out any notes created before Mentorship.startDate
    // and isolate 1-on-1 notes vs cohort notes
    const rawNotes = await SharedNote.find({
      mentorId: new mongoose.Types.ObjectId(mentorId),
      createdAt: { $gte: startDate },
      $or: [
        { menteeId: new mongoose.Types.ObjectId(userId) },
        { isAllMentees: true },
        { menteeId: null, isAllMentees: { $ne: false } },
        { menteeId: { $exists: false } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const notes: SharedNoteItem[] = rawNotes.map((n) => ({
      id: String(n._id),
      mentorId: String(n.mentorId),
      menteeId: n.menteeId ? String(n.menteeId) : null,
      isAllMentees: Boolean(n.isAllMentees),
      sessionId: n.sessionId ? String(n.sessionId) : null,
      title: n.title,
      content: n.content,
      fileUrl: n.fileUrl || null,
      fileName: n.fileName || null,
      fileType: n.fileType || null,
      fileSize: n.fileSize || null,
      createdAt: n.createdAt.toISOString(),
    }));

    return {
      success: true,
      notes,
    };
  } catch (error) {
    console.error("fetchSharedNotesAction error:", error);
    return { success: false, error: "Failed to retrieve shared notes." };
  }
}

/**
 * Creates a shared guidance note authored by the mentor.
 */
export async function createSharedNoteAction(
  title: string,
  content: string,
  options?: {
    menteeId?: string | null;
    isAllMentees?: boolean;
    sessionId?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
  }
): Promise<{
  success: boolean;
  note?: SharedNoteItem;
  error?: string;
}> {
  try {
    await connectDB();
    const userId = await getAuthenticatedUser();
    if (!userId) {
      return { success: false, error: "Authentication required." };
    }

    if (!title?.trim() && !options?.fileName) {
      return { success: false, error: "Title or attached file is required." };
    }

    const noteTitle = title?.trim() || options?.fileName || "Shared Resource";
    const noteContent = content?.trim() || "";

    const newNote = await SharedNote.create({
      mentorId: new mongoose.Types.ObjectId(userId),
      menteeId:
        options?.menteeId && mongoose.Types.ObjectId.isValid(options.menteeId)
          ? new mongoose.Types.ObjectId(options.menteeId)
          : null,
      isAllMentees: Boolean(options?.isAllMentees),
      sessionId:
        options?.sessionId && mongoose.Types.ObjectId.isValid(options.sessionId)
          ? new mongoose.Types.ObjectId(options.sessionId)
          : null,
      title: noteTitle,
      content: noteContent,
      fileUrl: options?.fileUrl || null,
      fileName: options?.fileName || null,
      fileType: options?.fileType || null,
      fileSize: options?.fileSize || null,
    });

    return {
      success: true,
      note: {
        id: String(newNote._id),
        mentorId: userId,
        menteeId: newNote.menteeId ? String(newNote.menteeId) : null,
        isAllMentees: Boolean(newNote.isAllMentees),
        sessionId: newNote.sessionId ? String(newNote.sessionId) : null,
        title: newNote.title,
        content: newNote.content,
        fileUrl: newNote.fileUrl || null,
        fileName: newNote.fileName || null,
        fileType: newNote.fileType || null,
        fileSize: newNote.fileSize || null,
        createdAt: newNote.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("createSharedNoteAction error:", error);
    return { success: false, error: "Failed to create note." };
  }
}
