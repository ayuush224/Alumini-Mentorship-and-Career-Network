"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  X,
  Briefcase,
  ShieldCheck,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  Award,
  ExternalLink,
  Layers,
  Compass,
  Users,
  Lock,
} from "lucide-react";
import {
  getMentorPublicProfile,
  type MentorPublicProfileViewData,
} from "@/app/actions/profile";
import { requestMentorship } from "@/app/actions/mentorship";
import type { Mentor } from "@/app/_components/mentor-card";

function formatExperienceDate(dateVal?: string | Date | null): string {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime())
      ? ""
      : dateVal.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  const str = String(dateVal).trim();
  if (!str) return "";
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    if (/^\d{4}$/.test(str)) {
      return str;
    }
    return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return str;
}

interface MentorPublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor | null;
  onRequestSent?: (mentorId: string) => void;
}

export function MentorPublicProfileModal({
  isOpen,
  onClose,
  mentor,
  onRequestSent,
}: MentorPublicProfileModalProps) {
  const [profile, setProfile] = useState<MentorPublicProfileViewData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Request intro form state
  const [message, setMessage] = useState<string>("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSent, setIsSent] = useState<boolean>(false);

  // Close on Escape key press and prevent background scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Fetch full public profile when mentor changes
  useEffect(() => {
    if (!isOpen || !mentor) {
      setProfile(null);
      return;
    }

    setIsSent(mentor.hasPendingRequest || false);
    setMessage("");
    setSendError(null);
    setLoading(true);
    setFetchError(null);

    let isMounted = true;
    getMentorPublicProfile(mentor.mentorId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.profile) {
          setProfile(res.profile);
        } else {
          setFetchError(res.error || "Could not load mentor profile.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setFetchError(
          err instanceof Error ? err.message : "Failed to load mentor profile."
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, mentor]);

  if (!isOpen || !mentor) return null;

  const displayName = profile?.name || mentor.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const remainingSpots =
    profile?.capacity?.remainingSpots ?? mentor.capacity?.remainingSpots ?? 1;
  const isAtCapacity = remainingSpots <= 0;

  const handleSendRequest = () => {
    setSendError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setSendError("Please write a short note for the mentor.");
      return;
    }

    startTransition(async () => {
      const result = await requestMentorship(mentor.mentorId, trimmed);
      if (result.success) {
        setIsSent(true);
        if (onRequestSent) {
          onRequestSent(mentor.mentorId);
        }
      } else {
        setSendError(result.error || "Unable to send request. Please try again.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-4xl lg:max-w-5xl bg-[#F8FAFF] rounded-3xl border border-stone-200/90 shadow-2xl overflow-hidden my-auto z-10 flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-stone-700">
            <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <Award className="w-3.5 h-3.5" />
            </span>
            <span className="font-heading text-stone-800">
              Alumni Mentor Profile &bull; Verified Institutional Dossier
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-stone-500">
                Loading verified mentor dossier...
              </p>
            </div>
          ) : fetchError && !profile ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-900">{fetchError}</p>
              <p className="text-xs text-rose-600">
                Please try again or close this dialog.
              </p>
            </div>
          ) : (
            <>
              {/* =====================================================================
                  1. HERO BANNER & IDENTITY SECTION
              ====================================================================== */}
              <section className="bg-white rounded-3xl border border-blue-100/90 overflow-hidden shadow-xs">
                {/* Banner Container */}
                <div className="relative">
                  {profile?.bannerUrl ? (
                    <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-slate-100">
                      <Image
                        src={profile.bannerUrl}
                        alt="Profile Banner"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 1000px"
                        priority
                      />
                    </div>
                  ) : (
                    /* Fallback Royal Blue & Teal Wavy Illustration */
                    <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-gradient-to-r from-blue-100 via-indigo-50 to-blue-100">
                      <svg
                        className="w-full h-full object-cover"
                        viewBox="0 0 1200 400"
                        preserveAspectRatio="none"
                        fill="none"
                      >
                        <defs>
                          <linearGradient
                            id="mentorModalBannerGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#DBEAFE" />
                            <stop offset="50%" stopColor="#E0E7FF" />
                            <stop offset="100%" stopColor="#BFDBFE" />
                          </linearGradient>
                        </defs>
                        <rect
                          width="1200"
                          height="400"
                          fill="url(#mentorModalBannerGrad)"
                        />
                        <path
                          d="M0,280 C300,340 450,220 750,280 C1000,330 1150,260 1200,280 L1200,400 L0,400 Z"
                          fill="#93C5FD"
                          fillOpacity="0.45"
                        />
                        <path
                          d="M0,320 C200,260 500,340 850,290 C1050,260 1150,300 1200,320 L1200,400 L0,400 Z"
                          fill="#6366F1"
                          fillOpacity="0.25"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Overlapping Circular Avatar */}
                  <div className="absolute -bottom-10 sm:-bottom-12 left-6 z-10">
                    <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full overflow-hidden border-4 border-white shadow-md bg-stone-100 shrink-0">
                      {profile?.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                          sizes="104px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-stone-700 text-xl bg-blue-50">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Info Bar */}
                <div className="px-6 pt-13 sm:pt-15 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold font-heading text-stone-900 tracking-tight">
                          {displayName}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified Alumni Mentor
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>{profile?.jobTitle || mentor.jobTitle}</span>
                        <span className="text-stone-300">&bull;</span>
                        <span className="text-stone-900 font-semibold">
                          {profile?.company || mentor.company}
                        </span>
                        <span className="text-stone-300">&bull;</span>
                        <span className="text-stone-500">
                          {profile?.industry || mentor.industry}
                        </span>
                      </p>
                      <p className="text-xs text-stone-500 mt-1 font-normal flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          {profile?.department || "Computer Science"} &bull; Class of{" "}
                          {profile?.graduationYear || 2020}
                        </span>
                      </p>
                    </div>

                    {/* Quick Stat Badges on Right */}
                    <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
                      {/* Match Score Badge */}
                      <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-1.5 text-blue-600 font-bold text-xs shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+{mentor.matchScore}% Match</span>
                      </div>

                      {/* Capacity Indicator */}
                      <div className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 flex items-center gap-2 text-xs font-medium text-stone-700 shadow-2xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAtCapacity ? "bg-stone-300" : "bg-emerald-500"
                          }`}
                        />
                        <span>
                          {isAtCapacity
                            ? "At Capacity"
                            : `${remainingSpots} spot${
                                remainingSpots !== 1 ? "s" : ""
                              } open`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =====================================================================
                  2. MATCH RATIONALE CALLOUT CARD
              ====================================================================== */}
              <section className="bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 border border-blue-200/90 rounded-2xl p-4.5 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Why this match was recommended
                    </h3>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                      Affinity: {mentor.matchScore}%
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 font-normal mt-1 leading-relaxed">
                    {mentor.matchRationale}
                  </p>
                </div>
              </section>

              {/* =====================================================================
                  3. MAIN CONTENT TWO-COLUMN GRID
              ====================================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN (8 COLS): REQUEST BOX FIRST, THEN BIO, AREAS, EXPERIENCE */}
                <div className="lg:col-span-8 space-y-6">
                  {/* POSITION 1: Request Mentorship Intro Box (Prominently at the top) */}
                  <section className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-blue-600" />
                          <span>Request Mentorship Intro</span>
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed font-normal">
                          Introduce yourself to {displayName.split(" ")[0]} and share what career goals or technical questions you want guidance on.
                        </p>
                      </div>

                      <div className="shrink-0 text-[11px] font-medium text-stone-500 flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/70">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAtCapacity ? "bg-stone-300" : "bg-emerald-500"
                          }`}
                        />
                        <span>
                          {isAtCapacity
                            ? "At Capacity"
                            : `${remainingSpots} spot${
                                remainingSpots !== 1 ? "s" : ""
                              } open`}
                        </span>
                      </div>
                    </div>

                    {isSent ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5 animate-in fade-in duration-200">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <p className="text-xs font-bold text-emerald-800">
                          Request Successfully Sent!
                        </p>
                        <p className="text-[11px] text-emerald-600 leading-normal">
                          The mentor has been notified. You can track this request on your student dashboard.
                        </p>
                      </div>
                    ) : isAtCapacity ? (
                      <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl text-center space-y-1.5">
                        <Clock className="w-6 h-6 text-stone-400 mx-auto" />
                        <p className="text-xs font-bold text-stone-700">
                          Currently at Full Capacity
                        </p>
                        <p className="text-[11px] text-stone-500 leading-normal">
                          This mentor has reached their declared mentee limit. Please check back later or explore other recommended mentors.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                            Your Intro Note
                          </label>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`Hi ${
                              displayName.split(" ")[0]
                            }, I would love guidance on breaking into ${
                              mentor.industry
                            } and developing skills in ${
                              mentor.expertiseTags[0] || "this field"
                            }...`}
                            rows={3}
                            maxLength={1000}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
                          />
                        </div>

                        {sendError && (
                          <div className="flex items-start gap-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{sendError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <p className="text-[11px] text-stone-400 font-normal">
                            Max 1000 characters &bull; Typically responds in 24–48 hours
                          </p>
                          <button
                            type="button"
                            onClick={handleSendRequest}
                            disabled={isPending}
                            className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs cursor-pointer shrink-0"
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Send Intro Request</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* POSITION 2: About & Mentorship Philosophy (Directly below Request Mentorship) */}
                  <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-2 mb-3">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <h3 className="font-heading font-bold text-stone-900 text-sm">
                        About & Mentorship Philosophy
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal whitespace-pre-line">
                      {profile?.bio ||
                        profile?.headline ||
                        "Dedicated alumni mentor passionate about helping students navigate technical careers, system architecture, and professional growth."}
                    </p>
                  </section>

                  {/* Mentorship Focus Areas */}
                  {(profile?.mentorshipAreas || []).length > 0 && (
                    <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <h3 className="font-heading font-bold text-stone-900 text-sm">
                            Mentorship Focus Areas
                          </h3>
                        </div>
                        <span className="text-xs text-stone-400 font-medium">
                          {profile?.mentorshipAreas.length} topics offered
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {profile?.mentorshipAreas.map((area, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-white hover:border-blue-200 transition-all flex flex-col justify-between"
                          >
                            <h4 className="text-xs font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                              <span>{area.title}</span>
                            </h4>
                            {area.description && (
                              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                                {area.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Career Journey & Experience */}
                  {(profile?.experience || []).length > 0 && (
                    <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          <h3 className="font-heading font-bold text-stone-900 text-sm">
                            Career Journey & Experience
                          </h3>
                        </div>
                        <span className="text-xs text-stone-400 font-medium">
                          {profile?.experience.length} listed
                        </span>
                      </div>

                      <div className="space-y-4">
                        {profile?.experience.map((exp, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl border border-stone-200/70 bg-stone-50/40 relative"
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <h4 className="text-sm font-bold text-stone-900">
                                  {exp.role}
                                </h4>
                                <p className="text-xs text-stone-600 font-medium mt-0.5 flex items-center gap-1.5">
                                  <span className="text-stone-900 font-semibold">
                                    {exp.company}
                                  </span>
                                  {exp.type && (
                                    <>
                                      <span className="text-stone-300">&bull;</span>
                                      <span className="text-stone-500">{exp.type}</span>
                                    </>
                                  )}
                                  {exp.location && (
                                    <>
                                      <span className="text-stone-300">&bull;</span>
                                      <span className="text-stone-400">
                                        {exp.location}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>

                              {(exp.startDate || exp.endDate) && (
                                <span className="text-xs text-stone-500 font-medium bg-white px-2.5 py-1 rounded-lg border border-stone-200/70 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-stone-400" />
                                  <span>
                                    {formatExperienceDate(exp.startDate)} &mdash;{" "}
                                    {exp.endDate
                                      ? formatExperienceDate(exp.endDate)
                                      : "Present"}
                                  </span>
                                </span>
                              )}
                            </div>

                            {/* Bullets */}
                            {exp.bullets && exp.bullets.length > 0 && (
                              <ul className="mt-3 space-y-1 text-xs text-stone-600 pl-4 list-disc marker:text-blue-500">
                                {exp.bullets.map((b, bIdx) => (
                                  <li key={bIdx} className="leading-relaxed">
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Skills Tags */}
                            {exp.skills && exp.skills.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-stone-200/60">
                                {exp.skills.map((s, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-stone-200 text-stone-600"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Featured Work / Contributions */}
                  {(profile?.featuredWork || []).length > 0 && (
                    <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                          <h3 className="font-heading font-bold text-stone-900 text-sm">
                            Featured Projects & Publications
                          </h3>
                        </div>
                        <span className="text-xs text-stone-400 font-medium">
                          {profile?.featuredWork.length} showcased
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {profile?.featuredWork.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-stone-900">
                                  {item.title}
                                </h4>
                                {item.link && (
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-700 transition-colors p-0.5"
                                    title="Open external link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-stone-200/60">
                                {item.tags.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* RIGHT COLUMN (4 COLS): SKILLS, STATS, PRIVACY */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Endorsed Skills & Expertise */}
                  <section className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
                    <h3 className="font-heading font-bold text-stone-900 text-xs uppercase tracking-wider mb-3">
                      Skills & Expertise
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {((profile?.skills || []).length > 0
                        ? profile!.skills
                        : mentor.expertiseTags.map((t) => ({
                            name: t,
                            endorsements: 1,
                          }))
                      ).map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200/60"
                        >
                          <span>{skill.name}</span>
                          {skill.endorsements > 1 && (
                            <span className="text-[10px] text-stone-500 font-bold bg-white px-1.5 py-0.2 rounded-full border border-stone-200">
                              +{skill.endorsements}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Track Record & Stats */}
                  <section className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-3">
                    <h3 className="font-heading font-bold text-stone-900 text-xs uppercase tracking-wider">
                      Mentorship Impact
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-center">
                        <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <span className="block text-base font-bold text-stone-900">
                          {profile?.totalMentees ?? 6}
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium">
                          Mentees Guided
                        </span>
                      </div>

                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-center">
                        <Award className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <span className="block text-base font-bold text-stone-900">
                          {profile?.sessionsCompleted ?? 18}
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium">
                          Sessions Done
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-500 text-center pt-1 flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Typically responds in 24–48 hours</span>
                    </p>
                  </section>

                  {/* Invariant 2 Privacy Notice */}
                  <section className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60 flex items-start gap-2.5 text-[11px] text-stone-600">
                    <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Alumni contact info is shielded by Alma to prevent unsolicited
                      outreach. All messaging and scheduled sessions occur within
                      platform channels.
                    </span>
                  </section>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Footer Bar */}
        <div className="px-6 py-3.5 bg-white border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Alma Verified Institutional Mentorship Network</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
