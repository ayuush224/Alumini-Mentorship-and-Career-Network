"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageSquare,
  ShieldCheck,
  Send,
  ArrowRight,
  Wifi,
  WifiOff,
  Search,
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

export interface MenteeConversationItem {
  mentorshipId: string;
  studentId: string;
  name: string;
  major: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface MentorChatWorkspaceProps {
  initialMentees: MenteeConversationItem[];
  currentUserId: string;
  initialSelectedMentorshipId?: string;
  initialSelectedStudentId?: string;
}

export function MentorChatWorkspace({
  initialMentees,
  currentUserId,
  initialSelectedMentorshipId,
  initialSelectedStudentId,
}: MentorChatWorkspaceProps) {
  const [selectedMentee, setSelectedMentee] = useState<MenteeConversationItem | null>(() => {
    if (initialSelectedMentorshipId) {
      const match = initialMentees.find((m) => m.mentorshipId === initialSelectedMentorshipId);
      if (match) return match;
    }
    if (initialSelectedStudentId) {
      const match = initialMentees.find((m) => m.studentId === initialSelectedStudentId);
      if (match) return match;
    }
    return initialMentees[0] || null;
  });

  // Keep selected mentee in sync if URL query params change
  useEffect(() => {
    if (initialSelectedMentorshipId) {
      const match = initialMentees.find((m) => m.mentorshipId === initialSelectedMentorshipId);
      if (match) {
        setSelectedMentee(match);
        return;
      }
    }
    if (initialSelectedStudentId) {
      const match = initialMentees.find((m) => m.studentId === initialSelectedStudentId);
      if (match) {
        setSelectedMentee(match);
        return;
      }
    }
  }, [initialSelectedMentorshipId, initialSelectedStudentId, initialMentees]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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

  // Restore saved draft from localStorage when switching mentees
  useEffect(() => {
    if (typeof window !== "undefined" && selectedMentee?.mentorshipId) {
      try {
        const saved = localStorage.getItem(`alma_chat_draft_${selectedMentee.mentorshipId}`);
        setInputValue(saved || "");
      } catch {
        // Ignore localStorage read errors
      }
    }
  }, [selectedMentee?.mentorshipId]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (typeof window !== "undefined" && selectedMentee?.mentorshipId) {
      try {
        const key = `alma_chat_draft_${selectedMentee.mentorshipId}`;
        if (val.trim()) {
          localStorage.setItem(key, val);
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // Ignore quota
      }
    }
  };

  // Auto-scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history when selectedMentee changes
  useEffect(() => {
    if (!selectedMentee) return;

    let isMounted = true;
    setIsLoadingMessages(true);
    setPendingAttachment(null);

    fetchMessagesAction(selectedMentee.mentorshipId)
      .then((res) => {
        if (isMounted && res.success && res.messages) {
          setMessages(res.messages);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMentee?.mentorshipId]);

  // =========================================================================
  // PUSHER REAL-TIME WEBSOCKET SUBSCRIPTION & MEMORY LEAK CLEANUP
  // =========================================================================
  useEffect(() => {
    if (!selectedMentee) return;

    const mentorshipId = selectedMentee.mentorshipId;
    const channelName = `private-chat-${mentorshipId}`;
    const pusher = getPusherClient();

    if (!pusher) {
      setIsConnected(false);
      return;
    }

    // Subscribe to private channel
    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
    });

    channel.bind("pusher:subscription_error", () => {
      setIsConnected(false);
    });

    // Listen for new-message broadcast
    channel.bind("new-message", (incoming: ChatMessageItem) => {
      setMessages((prev) => {
        // Prevent duplicate append if message was optimistically added
        if (prev.some((m) => m.id === incoming.id)) {
          return prev;
        }
        return [...prev, incoming];
      });
    });

    // MEMORY LEAK PREVENTION: Cleanup subscription on unmount or mentorshipId switch
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setIsConnected(false);
    };
  }, [selectedMentee?.mentorshipId]);

  // =========================================================================
  // AUTO-SYNC POLLING FALLBACK (Ensures instant sync when websocket is offline)
  // =========================================================================
  useEffect(() => {
    if (!selectedMentee) return;
    const mentorshipId = selectedMentee.mentorshipId;
    let isMounted = true;
    const pollInterval = isConnected ? 12000 : 3500;

    const interval = setInterval(() => {
      fetchMessagesAction(mentorshipId)
        .then((res) => {
          if (isMounted && res.success && res.messages) {
            const incomingMessages = res.messages;
            setMessages((prev) => {
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
  }, [selectedMentee?.mentorshipId, isConnected]);

  // =========================================================================
  // FILE ATTACHMENT SELECTION & CLOUDINARY UPLOAD
  // =========================================================================
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMentee) return;

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

      const res = await uploadChatAttachmentAction(
        selectedMentee.mentorshipId,
        formData
      );

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
    if (!selectedMentee || isSending) return;

    const content = inputValue.trim();
    const attachment = pendingAttachment?.uploadedData;

    if (!content && !attachment) return;
    if (pendingAttachment?.isUploading) {
      alert("Please wait for your attachment to finish uploading.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const mentorshipId = selectedMentee.mentorshipId;

    // 1. Instant Optimistic UI Update (0ms perceived latency)
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      mentorshipId,
      senderId: currentUserId,
      senderRole: "mentor",
      content,
      fileUrl: attachment?.fileUrl,
      fileName: attachment?.fileName,
      fileType: attachment?.fileType,
      fileSize: attachment?.fileSize,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue("");
    if (typeof window !== "undefined" && selectedMentee?.mentorshipId) {
      try {
        localStorage.removeItem(`alma_chat_draft_${selectedMentee.mentorshipId}`);
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
        // Replace temporary optimistic message with authoritative MongoDB document
        const authoritative = res.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? authoritative : m))
        );
      } else {
        // Rollback on server failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(res.error || "Failed to send message. Please try again.");
      }
    } catch {
      // Rollback on network failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Network exception. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredMentees = initialMentees.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.major.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col bg-stone-50 rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs">
      {/* Top Banner Notice */}
      <div className="bg-white border-b border-stone-200/80 px-6 py-2.5 flex items-center justify-between text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Privacy Protected:</strong> Direct messaging is encrypted and restricted to verified active pairings.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Wifi className="w-3 h-3 text-emerald-600" />
              <span>Real-Time Connected</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
              <WifiOff className="w-3 h-3 text-stone-400" />
              <span>Connecting Pusher...</span>
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Pane Chat Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Active Mentees Master List */}
        <aside className="w-72 sm:w-80 border-r border-stone-200 bg-white flex flex-col shrink-0">
          <div className="p-3.5 border-b border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">Active Mentees</h2>
              <span className="text-xs font-mono text-stone-400">
                {initialMentees.length} paired
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search mentee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {filteredMentees.length > 0 ? (
              filteredMentees.map((mentee) => {
                const isSelected = selectedMentee?.mentorshipId === mentee.mentorshipId;
                const initials = mentee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={mentee.mentorshipId}
                    type="button"
                    onClick={() => setSelectedMentee(mentee)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                      isSelected
                        ? "bg-[#2563EB]/5 border-l-4 border-[#2563EB]"
                        : "hover:bg-stone-50 border-l-4 border-transparent"
                    }`}
                  >
                    {mentee.avatarUrl ? (
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border border-stone-200 shrink-0">
                        <Image src={mentee.avatarUrl} alt={mentee.name} fill className="object-cover" sizes="36px" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {mentee.name}
                        </p>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {mentee.lastMessageTime || "Active"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">
                        {mentee.major}
                      </p>
                      {mentee.lastMessage && (
                        <p className="text-[11px] text-stone-400 truncate mt-0.5 italic">
                          {mentee.lastMessage}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-stone-400 space-y-1">
                <p className="font-semibold text-stone-600">No active conversations</p>
                <p className="text-[11px]">Accept intro requests from students to start chatting.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Pane: Active Chat Room */}
        <section className="flex-1 flex flex-col bg-stone-50/70 overflow-hidden">
          {selectedMentee ? (
            <>
              {/* Mentee Header */}
              <div className="p-4 bg-white border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedMentee.avatarUrl ? (
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-stone-200">
                      <Image src={selectedMentee.avatarUrl} alt={selectedMentee.name} fill className="object-cover" sizes="36px" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center">
                      {selectedMentee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 leading-tight">
                      {selectedMentee.name}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      {selectedMentee.major}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified Mentorship</span>
                  </span>
                </div>
              </div>

              {/* Messages Thread Container */}
              <div className="flex-1 p-6 overflow-y-auto space-y-3.5">
                <div className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-white border border-stone-200 text-[11px] text-stone-500 font-mono shadow-2xs">
                    Mentorship initiated &bull; Encrypted Alma Channel
                  </span>
                </div>

                {isLoadingMessages ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    Loading conversation history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="text-xs">No messages yet. Send an opening greeting to {selectedMentee.name}!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromMe = msg.senderRole === "mentor";
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
              <div className="p-4 bg-white border-t border-stone-200">
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

                <form
                  onSubmit={handleSendMessage}
                  className="max-w-4xl mx-auto flex items-center gap-2"
                >
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
                        : `Type message to ${selectedMentee.name}...`
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold font-serif text-stone-900 mb-1">
                No active mentee conversations
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mb-6 leading-relaxed">
                When you accept an intro request from a student, your direct, privacy-protected communication channel will appear here.
              </p>
              <Link
                href="/mentor/requests"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                <span>View Pending Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
