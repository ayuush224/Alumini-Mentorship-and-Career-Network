"use client";

import React, { useState, useEffect, useRef } from "react";
import NextLink from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  ShieldCheck,
  Wifi,
  WifiOff,
  CheckCircle2,
  Paperclip,
  FileText,
  Download,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";
import {
  sendMessageAction,
  fetchMessagesAction,
  uploadChatAttachmentAction,
  ChatMessageItem,
} from "@/actions/chat";
import { getPusherClient } from "@/lib/pusher-client";
import {
  getAttachmentDownloadUrl,
  getAttachmentViewUrl,
  getFileTypeInfo,
  formatAttachmentBytes,
  isImageFile,
} from "@/lib/chat-attachments";

interface StudentChatViewProps {
  mentorshipId: string;
  mentor: {
    id: string;
    name: string;
    company: string;
    role: string;
    avatarUrl?: string;
  };
  currentUserId: string;
  initialMessages: ChatMessageItem[];
}

export function StudentChatView({
  mentorshipId,
  mentor,
  currentUserId,
  initialMessages,
}: StudentChatViewProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl?: string;
    isUploading: boolean;
    uploadedData?: {
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    };
    error?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Restore saved draft from localStorage on mount or mentorshipId change
  useEffect(() => {
    if (typeof window !== "undefined" && mentorshipId) {
      try {
        const saved = localStorage.getItem(`alma_chat_draft_${mentorshipId}`);
        if (saved) {
          setInputValue(saved);
        }
      } catch {
        // Ignore localStorage read errors
      }
    }
  }, [mentorshipId]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (typeof window !== "undefined" && mentorshipId) {
      try {
        const key = `alma_chat_draft_${mentorshipId}`;
        if (val.trim()) {
          localStorage.setItem(key, val);
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // Ignore localStorage quota
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // =========================================================================
  // PUSHER REAL-TIME WEBSOCKET SUBSCRIPTION & MEMORY LEAK CLEANUP
  // =========================================================================
  useEffect(() => {
    const channelName = `private-chat-${mentorshipId}`;
    const pusher = getPusherClient();

    if (!pusher) {
      setIsConnected(false);
      return;
    }

    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
    });

    channel.bind("pusher:subscription_error", () => {
      setIsConnected(false);
    });

    channel.bind("new-message", (incoming: ChatMessageItem) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) {
          return prev;
        }
        return [...prev, incoming];
      });
    });

    // MEMORY LEAK PREVENTION: Cleanup subscription on unmount or mentorshipId change
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setIsConnected(false);
    };
  }, [mentorshipId]);

  // =========================================================================
  // AUTO-SYNC POLLING FALLBACK (Ensures instant sync when websocket is offline)
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    const pollInterval = isConnected ? 12000 : 3500;

    const interval = setInterval(() => {
      fetchMessagesAction(mentorshipId)
        .then((res) => {
          if (isMounted && res.success && res.messages) {
            const incomingMessages = res.messages;
            setMessages((prev) => {
              // Check if any message count or latest id differs
              if (
                incomingMessages.length !== prev.length ||
                incomingMessages[incomingMessages.length - 1]?.id !== prev[prev.length - 1]?.id ||
                Boolean(incomingMessages[incomingMessages.length - 1]?.fileUrl) !== Boolean(prev[prev.length - 1]?.fileUrl)
              ) {
                return incomingMessages;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [mentorshipId, isConnected]);

  // =========================================================================
  // FILE ATTACHMENT SELECTION & CLOUDINARY UPLOAD
  // =========================================================================
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    setPendingAttachment({
      file,
      previewUrl,
      isUploading: true,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadChatAttachmentAction(mentorshipId, formData);

      if (res.success && res.fileUrl && res.fileName && res.fileType) {
        setPendingAttachment({
          file,
          previewUrl,
          isUploading: false,
          uploadedData: {
            fileUrl: res.fileUrl,
            fileName: res.fileName,
            fileType: res.fileType,
            fileSize: res.fileSize || file.size,
          },
        });
      } else {
        setPendingAttachment((prev) =>
          prev
            ? {
                ...prev,
                isUploading: false,
                error: res.error || "Failed to upload file to Cloudinary.",
              }
            : null
        );
      }
    } catch {
      setPendingAttachment((prev) =>
        prev
          ? {
              ...prev,
              isUploading: false,
              error: "Network error during file upload.",
            }
          : null
      );
    }
  };

  // =========================================================================
  // OPTIMISTIC MESSAGE TRANSMISSION
  // =========================================================================
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;

    const content = inputValue.trim();
    const attachment = pendingAttachment?.uploadedData;

    if (!content && !attachment) return;
    if (pendingAttachment?.isUploading) {
      alert("Please wait for your attachment to finish uploading.");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    // 1. Instant Optimistic UI Update (0ms perceived latency)
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      mentorshipId,
      senderId: currentUserId,
      senderRole: "student",
      content,
      fileUrl: attachment?.fileUrl,
      fileName: attachment?.fileName,
      fileType: attachment?.fileType,
      fileSize: attachment?.fileSize,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue("");
    if (typeof window !== "undefined" && mentorshipId) {
      try {
        localStorage.removeItem(`alma_chat_draft_${mentorshipId}`);
      } catch {}
    }
    setPendingAttachment(null);
    setIsSending(true);

    try {
      // 2. Transmit to server database + Pusher broadcast
      const res = await sendMessageAction(mentorshipId, content, {
        fileAttachment: attachment,
      });

      if (res.success && res.message) {
        const authoritative = res.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? authoritative : m))
        );
      } else {
        // Rollback on server rejection
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(res.error || "Failed to send message.");
      }
    } catch {
      // Rollback on network failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Network exception. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const initials = mentor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-stone-50 rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs">
      {/* Top Navigation Bar */}
      <header className="p-4 bg-white border-b border-stone-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <NextLink
            href="/student/mentorship"
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors"
            title="Back to Mentorship Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </NextLink>

          {mentor.avatarUrl ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-stone-200 shrink-0">
              <Image src={mentor.avatarUrl} alt={mentor.name} fill className="object-cover" sizes="40px" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-stone-900 leading-tight">
                {mentor.name}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full font-medium">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Verified Mentor
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {mentor.role} &bull; <strong className="text-stone-700 font-semibold">{mentor.company}</strong>
            </p>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Pusher Live</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-500 border border-stone-200 text-xs font-mono font-medium">
              <WifiOff className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Connecting...</span>
            </span>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-stone-50/60">
        <div className="flex justify-center my-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-stone-200 text-[11px] text-stone-500 font-mono shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Bilateral Channel &bull; Institutional Audited</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-16 text-center text-stone-400 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-700">Start your conversation</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Ask {mentor.name} about your resume, portfolio, or career guidance.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromMe = msg.senderRole === "student";
            const timeFormatted = new Date(msg.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const isImage = isImageFile(msg.fileType, msg.fileName, msg.fileUrl);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isFromMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isFromMe
                      ? "bg-[#2563EB] text-white rounded-tr-none"
                      : "bg-white border border-stone-200 text-stone-900 rounded-tl-none"
                  }`}
                >
                  {msg.content && (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}

                  {/* Cloudinary File Attachment Preview */}
                  {msg.fileUrl && (
                    <div
                      className={
                        msg.content
                          ? `mt-2 pt-2 border-t ${isFromMe ? "border-white/20" : "border-stone-100"}`
                          : ""
                      }
                    >
                      {isImage ? (
                        <div className="relative group rounded-xl overflow-hidden border border-stone-200/80 bg-stone-900/5">
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:opacity-95 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.fileUrl}
                              alt={msg.fileName || "Cloudinary image attachment"}
                              className="max-h-60 max-w-full rounded-xl object-contain mx-auto"
                              loading="lazy"
                            />
                          </a>
                          {/* Quick download button for images */}
                          <a
                            href={getAttachmentDownloadUrl(msg.fileUrl, msg.fileName)}
                            download={msg.fileName || "image"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-900 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            title="Download full image"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        (() => {
                          const fileInfo = getFileTypeInfo(msg.fileName, msg.fileType);
                          const downloadUrl = getAttachmentDownloadUrl(msg.fileUrl, msg.fileName);

                          return (
                            <div
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                isFromMe
                                  ? "bg-white/15 border-white/25 text-white"
                                  : "bg-stone-50 border-stone-200 text-stone-800"
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-black tracking-wider ${
                                  isFromMe
                                    ? "bg-white/20 border-white/30 text-white"
                                    : `${fileInfo.badgeBg} ${fileInfo.badgeText}`
                                }`}
                              >
                                {fileInfo.badge}
                              </div>
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-xs font-semibold truncate leading-tight">
                                  {msg.fileName || "Attached Document"}
                                </p>
                                <p
                                  className={`text-[10px] mt-0.5 font-mono ${
                                    isFromMe ? "text-white/80" : "text-stone-400"
                                  }`}
                                >
                                  {fileInfo.label} &bull; {formatAttachmentBytes(msg.fileSize) || "Download"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={getAttachmentViewUrl(msg.fileUrl, msg.fileName)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isFromMe
                                      ? "hover:bg-white/20 text-white/90 hover:text-white"
                                      : "hover:bg-stone-200 text-stone-500 hover:text-stone-800"
                                  }`}
                                  title="Open / View document"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={msg.fileName || "document"}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isFromMe
                                      ? "hover:bg-white/20 text-white/90 hover:text-white"
                                      : "hover:bg-stone-200 text-stone-500 hover:text-stone-800"
                                  }`}
                                  title="Download to computer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-stone-400 mt-1 font-mono px-1">
                  {timeFormatted}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-stone-200">
        {/* Pending Attachment Preview Bar */}
        {pendingAttachment && (
          <div className="max-w-4xl mx-auto mb-2.5 p-2 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {pendingAttachment.previewUrl ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingAttachment.previewUrl}
                    alt={pendingAttachment.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-stone-200 text-stone-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-stone-800 truncate text-xs">
                  {pendingAttachment.file.name}
                </p>
                <p className="text-[11px] text-stone-500 font-mono">
                  {formatAttachmentBytes(pendingAttachment.file.size)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingAttachment.isUploading ? (
                <span className="flex items-center gap-1.5 text-amber-600 font-medium text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Cloudinary...</span>
                </span>
              ) : pendingAttachment.error ? (
                <span className="text-red-500 text-[11px] font-medium">
                  {pendingAttachment.error}
                </span>
              ) : (
                <span className="text-emerald-600 text-[11px] font-medium">
                  ✓ Cloudinary uploaded
                </span>
              )}
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Hidden File Input for Cloudinary Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip"
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || pendingAttachment?.isUploading}
            className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50"
            title="Attach image or document (Cloudinary)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              pendingAttachment
                ? "Add an optional message..."
                : `Message ${mentor.name}...`
            }
            disabled={isSending}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={
              isSending ||
              pendingAttachment?.isUploading ||
              (!inputValue.trim() && !pendingAttachment?.uploadedData)
            }
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
