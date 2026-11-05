"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
} from "lucide-react";
import { requestMentorship } from "@/app/actions/mentorship";

export interface Mentor {
  id: string;
  mentorId: string;
  name: string;
  company: string;
  jobTitle: string;
  industry: string;
  expertiseTags: string[];
  capacity?: {
    maxMentees: number;
    activeMentees: number;
    remainingSpots: number;
  };
  matchScore: number;
  matchRationale: string;
  hasPendingRequest?: boolean;
}

/**
 * Mask full name to First Name + Last Initial (e.g., "Priya Nair" -> "Priya N.")
 * to respect platform alumni privacy conventions.
 */
function maskName(fullName: string): string {
  if (!fullName) return "Alumni Mentor";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Get 2-character initials for avatar
 */
function getInitials(name: string): string {
  if (!name) return "AM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function MentorCard({
  mentor,
  onViewProfile,
}: {
  mentor: Mentor;
  onViewProfile?: (mentor: Mentor) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSent, setIsSent] = useState(mentor.hasPendingRequest || false);

  const displayName = maskName(mentor.name);
  const initials = getInitials(mentor.name);
  const visibleTags = mentor.expertiseTags.slice(0, 3);
  const extraTagsCount = Math.max(0, mentor.expertiseTags.length - 3);
  const remainingSpots = mentor.capacity?.remainingSpots ?? 1;
  const isAtCapacity = remainingSpots <= 0;

  const handleSendRequest = () => {
    setError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please write a short note for the mentor.");
      return;
    }

    startTransition(async () => {
      const result = await requestMentorship(mentor.mentorId, trimmed);
      if (result.success) {
        setIsSent(true);
        setIsExpanded(false);
      } else {
        setError(result.error || "Unable to send request. Please try again.");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative">
      {/* Top Row: Avatar, Name, Job, and Match Indicator */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar with Initials (Clickable if onViewProfile is provided) */}
            {onViewProfile ? (
              <button
                type="button"
                onClick={() => onViewProfile(mentor)}
                className="w-11 h-11 rounded-full bg-stone-100 hover:bg-blue-50 border border-stone-200 hover:border-blue-300 flex items-center justify-center text-stone-700 hover:text-blue-600 font-bold text-sm shrink-0 shadow-xs cursor-pointer transition-all"
                title={`View ${mentor.name}'s full profile`}
              >
                {initials}
              </button>
            ) : (
              <div className="w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-bold text-sm shrink-0 shadow-xs">
                {initials}
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                {onViewProfile ? (
                  <button
                    type="button"
                    onClick={() => onViewProfile(mentor)}
                    className="font-bold text-stone-900 hover:text-blue-600 text-base tracking-tight leading-snug cursor-pointer transition-colors text-left"
                    title={`View ${mentor.name}'s full profile`}
                  >
                    {mentor.name || displayName}
                  </button>
                ) : (
                  <h3 className="font-bold text-stone-900 text-base tracking-tight leading-snug">
                    {mentor.name || displayName}
                  </h3>
                )}
                <span title="Verified Alumni" className="text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs text-stone-500 font-normal leading-tight mt-0.5 flex items-center gap-1">
                <span>{mentor.jobTitle}</span>
                <span className="text-stone-300">·</span>
                <span className="font-medium text-stone-600">{mentor.company}</span>
              </p>
            </div>
          </div>

          {/* Match Score Badge */}
          <div className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>+{mentor.matchScore}% Match</span>
          </div>
        </div>

        {/* Expertise Tags (Light grey chips) */}
        <div className="flex flex-wrap items-center gap-1.5 my-3">
          {visibleTags.map((tag, idx) => (
            <span
              key={idx}
              className="bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-lg font-medium"
            >
              {tag}
            </span>
          ))}
          {extraTagsCount > 0 && (
            <span className="bg-stone-50 text-stone-500 border border-stone-200 text-xs px-2 py-0.5 rounded-lg font-medium">
              +{extraTagsCount} more
            </span>
          )}
        </div>

        {/* Match Rationale (Italicized text) */}
        <div className="mt-2.5 mb-4">
          <p className="text-xs italic text-stone-500 leading-relaxed">
            *{mentor.matchRationale}*
          </p>
        </div>
      </div>

      {/* Bottom Area: Metadata Bar & Action Buttons */}
      <div className="pt-3 border-t border-stone-100 mt-2">
        {/* Availability & Network status bar */}
        <div className="flex items-center justify-between text-xs text-stone-500 mb-2.5">
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                isAtCapacity ? "bg-stone-300" : "bg-emerald-500"
              }`}
            />
            <span>
              {isAtCapacity
                ? "At Capacity"
                : `${remainingSpots} spot${remainingSpots !== 1 ? "s" : ""} open`}
            </span>
          </span>
          <span className="text-[11px] font-semibold text-stone-400">
            Verified Alumni
          </span>
        </div>

        {/* Expanded Note Form vs. Standard Action Buttons */}
        {isExpanded ? (
          /* State 3: Expanded Intro Request Form */
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Personalized Note
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setError(null);
                }}
                className="text-stone-400 hover:text-stone-600 transition-colors p-0.5"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${
                displayName.split(" ")[0]
              }, I would love guidance on breaking into ${mentor.industry} and developing skills in ${
                visibleTags[0] || "this field"
              }...`}
              rows={3}
              maxLength={1000}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
            />

            {error && (
              <div className="flex items-start gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded-md text-[11px] text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendRequest}
                disabled={isPending}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setError(null);
                }}
                disabled={isPending}
                className="py-2 px-3 border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isSent ? (
          /* State 1: Request Already Sent */
          <div className="grid grid-cols-2 gap-2">
            {onViewProfile ? (
              <button
                type="button"
                onClick={() => onViewProfile(mentor)}
                className="w-full py-2 px-3 border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer"
              >
                View Profile
              </button>
            ) : (
              <div />
            )}
            <div className="w-full py-2 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Request Sent</span>
            </div>
          </div>
        ) : isAtCapacity ? (
          /* State 2: Mentor at Capacity */
          <div className="grid grid-cols-2 gap-2">
            {onViewProfile ? (
              <button
                type="button"
                onClick={() => onViewProfile(mentor)}
                className="w-full py-2 px-3 border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer"
              >
                View Profile
              </button>
            ) : (
              <div />
            )}
            <div className="w-full py-2 px-2 bg-stone-100 text-stone-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>At Capacity</span>
            </div>
          </div>
        ) : (
          /* State 4: Default Clean 2-Button Grid */
          <div className="grid grid-cols-2 gap-2">
            {onViewProfile ? (
              <button
                type="button"
                onClick={() => onViewProfile(mentor)}
                className="w-full py-2 px-3 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center"
              >
                View Profile
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-all text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Request Intro</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
