"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import {
  acceptMentorshipRequest,
  declineMentorshipRequest,
} from "@/app/actions/mentorship";
import { StudentCareerProfileViewData } from "@/app/actions/profile";
import { StudentCareerProfileModal } from "./student-career-profile-modal";

export interface PendingRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  studentMajor: string;
  studentBio?: string;
  message: string;
  createdAt: string;
  careerProfile: StudentCareerProfileViewData;
}

interface MentorRequestsListProps {
  initialRequests: PendingRequestItem[];
  activeMenteesCount: number;
  maxMenteesLimit: number;
}

export function MentorRequestsList({
  initialRequests,
  activeMenteesCount,
  maxMenteesLimit,
}: MentorRequestsListProps) {
  const [requests, setRequests] = useState<PendingRequestItem[]>(initialRequests);
  const [activeCount, setActiveCount] = useState(activeMenteesCount);
  const [isPending, startTransition] = useTransition();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedRequestForProfile, setSelectedRequestForProfile] =
    useState<PendingRequestItem | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isAtCapacity = activeCount >= maxMenteesLimit;

  const handleAccept = (requestId: string) => {
    setActiveActionId(requestId);
    setNotification(null);

    startTransition(async () => {
      const result = await acceptMentorshipRequest(requestId);
      if (result.success) {
        setNotification({
          type: "success",
          message: result.message || "Mentorship request accepted!",
        });
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setActiveCount((c) => c + 1);
      } else {
        setNotification({
          type: "error",
          message: result.error || "Failed to accept request.",
        });
      }
      setActiveActionId(null);
    });
  };

  const handleDecline = (requestId: string) => {
    setActiveActionId(requestId);
    setNotification(null);

    startTransition(async () => {
      const result = await declineMentorshipRequest(requestId);
      if (result.success) {
        setNotification({
          type: "success",
          message: "Mentorship request declined.",
        });
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        setNotification({
          type: "error",
          message: result.error || "Failed to decline request.",
        });
      }
      setActiveActionId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Capacity Status Banner */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              Active Capacity: {activeCount} / {maxMenteesLimit} Mentees
            </h2>
            <p className="text-xs text-stone-500">
              {isAtCapacity
                ? "You have reached your declared capacity limit. Acceptances are locked until a mentorship completes."
                : `${maxMenteesLimit - activeCount} spots open for new mentee pairings.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isAtCapacity
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isAtCapacity ? "Full Capacity" : "Accepting Intros"}
          </span>
        </div>
      </div>

      {/* Action Notification Alert */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Requests List */}
      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((req) => {
            const isProcessingThis = isPending && activeActionId === req.id;

            return (
              <div
                key={req.id}
                onClick={() => setSelectedRequestForProfile(req)}
                className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs hover:border-[#2563EB]/50 hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-6 cursor-pointer group"
              >
                {/* Left: Student Identity & Note */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 border border-stone-200 relative shrink-0">
                    {req.studentAvatarUrl ? (
                      <Image
                        src={req.studentAvatarUrl}
                        alt={req.studentName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-stone-700 text-sm bg-stone-200">
                        {req.studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-sm group-hover:text-[#2563EB] transition-colors">
                          {req.studentName}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Student
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        {req.studentMajor}
                      </p>
                    </div>

                    {/* Introductory Note Quote Box */}
                    <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-stone-200/70 text-xs text-stone-700 leading-relaxed italic">
                      &ldquo;{req.message}&rdquo;
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>
                          Received{" "}
                          {new Date(req.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] group-hover:underline">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>View Career Profile</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div
                  className="flex sm:flex-col md:flex-row items-center gap-2.5 shrink-0 self-end md:self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecline(req.id);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-50 text-xs font-semibold text-stone-600 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isProcessingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-stone-400" />
                    )}
                    <span>Decline</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending || isAtCapacity}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(req.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isProcessingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isAtCapacity ? "Capacity Reached" : "Accept Intro"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            No Pending Requests
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Your mentorship requests inbox is clear. When students find your profile and request guidance, they will appear here.
          </p>
        </div>
      )}

      {/* Student Career Profile Modal */}
      {selectedRequestForProfile && (
        <StudentCareerProfileModal
          isOpen={Boolean(selectedRequestForProfile)}
          onClose={() => setSelectedRequestForProfile(null)}
          profile={selectedRequestForProfile.careerProfile}
          requestMessage={selectedRequestForProfile.message}
          requestCreatedAt={selectedRequestForProfile.createdAt}
          onAccept={() => {
            const reqId = selectedRequestForProfile.id;
            handleAccept(reqId);
            setSelectedRequestForProfile(null);
          }}
          onDecline={() => {
            const reqId = selectedRequestForProfile.id;
            handleDecline(reqId);
            setSelectedRequestForProfile(null);
          }}
          isProcessing={isPending && activeActionId === selectedRequestForProfile.id}
          isAtCapacity={isAtCapacity}
        />
      )}
    </div>
  );
}
