"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import {
  Sparkles,
  ShieldCheck,
  Star,
  Users,
  Video,
  Clock,
  Briefcase,
  Compass,
  Code2,
  ExternalLink,
  MessageSquare,
  Check,
  AlertCircle,
  Loader2,
  X,
  Target,
  ArrowRight,
  Quote,
} from "lucide-react";
import { formatDuration } from "@/app/(app)/mentor/profile/_components/mentor-profile-editor";
import { requestMentorship } from "@/app/actions/mentorship";

export interface PublicMentorData {
  id: string;
  name: string;
  avatarUrl?: string;
  bannerUrl?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  headline?: string;
  bio?: string;
  availability: "open" | "waitlist";
  activeMentees: number;
  maxMentees: number;
  sessionsCompleted: number;
  averageRating: number;
  skills: Array<{ name: string; endorsements: number }>;
  mentorshipAreas: Array<{ title: string; description?: string; icon?: string }>;
  experience: Array<{
    role: string;
    company: string;
    type?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
    skills: string[];
  }>;
  featuredWork: Array<{
    title: string;
    description?: string;
    tags: string[];
    link?: string;
  }>;
  reviews?: Array<{
    rating: number;
    quote?: string;
    date?: string;
    outcome?: string;
  }>;
}

interface PublicMentorViewProps {
  mentor: PublicMentorData;
  studentGoals: Array<{ id: string; title: string }>;
  isLoggedInStudent: boolean;
}

export function PublicMentorView({
  mentor,
  studentGoals,
  isLoggedInStudent,
}: PublicMentorViewProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>(
    studentGoals.length > 0 ? studentGoals[0].title : "System Architecture & Scalability"
  );
  const [customGoal, setCustomGoal] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [requestStatus, setRequestStatus] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const isAtCapacity = mentor.activeMentees >= mentor.maxMentees;
  const isWaitlistOnly = mentor.availability === "waitlist" || isAtCapacity;

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus(null);

    const goalToUse = selectedGoal === "custom" ? customGoal.trim() : selectedGoal;
    const fullMessage = `[Primary Goal: ${goalToUse}]\n\n${introMessage.trim()}`;

    startTransition(async () => {
      const res = await requestMentorship(mentor.id, fullMessage);
      if (res.success) {
        setRequestStatus({
          success: true,
          message: res.message || "Mentorship request sent successfully! The mentor has been notified.",
        });
      } else {
        setRequestStatus({
          success: false,
          error: res.error || "Failed to send request. Please try again.",
        });
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* =====================================================================
          HEADER HERO
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs">
        {/* Banner */}
        <div className="h-44 sm:h-56 w-full relative bg-gradient-to-r from-stone-900 via-stone-800 to-[#12264A]">
          {mentor.bannerUrl && (
            <Image
              src={mentor.bannerUrl}
              alt={`${mentor.name} banner`}
              fill
              className="object-cover opacity-85"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Profile Info Bar with Overlapping Avatar */}
        <div className="px-6 pb-6 pt-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="flex items-end gap-5">
              <div className="relative z-10 shrink-0 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-stone-100">
                {mentor.avatarUrl ? (
                  <Image
                    src={mentor.avatarUrl}
                    alt={mentor.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-stone-700 text-2xl bg-stone-200">
                    {mentor.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
              </div>

              <div className="pt-2 sm:pt-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                    {mentor.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Alumni
                  </span>
                </div>
                <p className="text-sm text-stone-600 mt-0.5 font-medium">
                  {mentor.jobTitle || "Senior Software Engineer"} &bull; {mentor.company || "Independent"} &bull; {mentor.industry || "Technology"}
                </p>
              </div>
            </div>

            {/* CTA Button: Request Mentorship */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  !isWaitlistOnly
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    !isWaitlistOnly ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {!isWaitlistOnly ? "Accepting Mentees" : isAtCapacity ? "At Capacity" : "Waitlist Only"}
              </span>

              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                disabled={isAtCapacity}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#c4533a] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAtCapacity ? "Capacity Reached" : "Request Mentorship"}</span>
              </button>
            </div>
          </div>

          {/* Headline & Bio */}
          <div className="pt-3 border-t border-stone-100">
            {mentor.headline && (
              <p className="text-sm font-semibold text-stone-900 mb-2">
                {mentor.headline}
              </p>
            )}
            {mentor.bio && (
              <p className="text-xs text-stone-600 leading-relaxed max-w-3xl whitespace-pre-line">
                {mentor.bio}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          STATS ROW (CAPACITY, SESSIONS, REVIEWS)
      ====================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Mentee Capacity
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {mentor.activeMentees}{" "}
              <span className="text-sm font-normal text-stone-400">
                / {mentor.maxMentees} active
              </span>
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Strict capacity limits prevent mentor burnout
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Sessions Completed
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {mentor.sessionsCompleted}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Verified Alma video consultations
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Mentee Satisfaction
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1 flex items-center gap-1.5">
              <span>{mentor.averageRating.toFixed(1)}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Rated across curriculum & guidance
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* =====================================================================
          CAREER EXPERIENCE TIMELINE WITH CIRCULAR NODES & DURATION
      ====================================================================== */}
      <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-stone-500" />
            <span>Career Experience Timeline</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Verified professional track record and duration
          </p>
        </div>

        {mentor.experience && mentor.experience.length > 0 ? (
          <div className="relative pl-6 ml-2 border-l-2 border-stone-200 space-y-8">
            {mentor.experience.map((exp, idx) => {
              const duration = formatDuration(exp.startDate, exp.endDate);
              const startStr = exp.startDate
                ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "";
              const endStr = exp.endDate
                ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "Present";

              return (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#2563EB] group-hover:scale-125 transition-transform" />

                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{exp.role}</h3>
                    <p className="text-xs text-stone-700 font-medium">
                      {exp.company}
                      {exp.type && <span className="text-stone-400 font-normal"> &bull; {exp.type}</span>}
                      {exp.location && (
                        <span className="text-stone-400 font-normal"> &bull; {exp.location}</span>
                      )}
                    </p>

                    <p className="text-[11px] text-stone-500 font-mono mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span>{startStr} — {endStr}</span>
                      <span className="text-stone-300">&bull;</span>
                      <span className="text-[#2563EB] font-semibold">{duration}</span>
                    </p>

                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-stone-600 list-disc list-inside">
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-relaxed">
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {exp.skills && exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {exp.skills.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] font-mono text-stone-700 border border-stone-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">No experience listed.</p>
        )}
      </section>

      {/* =====================================================================
          MENTORSHIP AREAS & SKILLS
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mentorship Areas */}
        <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-stone-500" />
            <span>Mentorship Focus Areas</span>
          </h2>

          {mentor.mentorshipAreas && mentor.mentorshipAreas.length > 0 ? (
            <div className="space-y-3">
              {mentor.mentorshipAreas.map((area, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 bg-[#F8F9FC]/60 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">{area.title}</h3>
                    {area.description && (
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                        {area.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">No specific mentorship focus defined.</p>
          )}
        </section>

        {/* Skills */}
        <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-4">
            <span>Skills & Expertise</span>
          </h2>

          {mentor.skills && mentor.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mentor.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-800 text-xs font-medium"
                >
                  <span>{skill.name}</span>
                  {skill.endorsements > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-[10px] text-stone-500 font-mono">
                      {skill.endorsements}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">No skills listed.</p>
          )}
        </section>
      </div>

      {/* =====================================================================
          FEATURED WORK & REVIEWS
      ====================================================================== */}
      {mentor.featuredWork && mentor.featuredWork.length > 0 && (
        <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-stone-500" />
            <span>Featured Work & Writing</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentor.featuredWork.map((work, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-stone-200 bg-[#F8F9FC]/60 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-1">{work.title}</h3>
                  {work.description && (
                    <p className="text-xs text-stone-600 line-clamp-3 mb-3 leading-relaxed">
                      {work.description}
                    </p>
                  )}
                </div>
                <div>
                  {work.tags && work.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {work.tags.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] font-mono text-stone-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {work.link && (
                    <a
                      href={work.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Artifact
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {mentor.reviews && mentor.reviews.length > 0 && (
        <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Quote className="w-5 h-5 text-stone-500" />
            <span>Verified Mentee Feedback</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentor.reviews.map((rev, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(rev.rating || 5)].map((_, sIdx) => (
                    <Star key={sIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-stone-700 italic mb-2 leading-relaxed">
                  &ldquo;{rev.quote}&rdquo;
                </p>
                {rev.outcome && (
                  <p className="text-[11px] font-medium text-[#2563EB]">
                    Outcome: {rev.outcome}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          REQUEST MENTORSHIP MODAL
      ====================================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  Request Mentorship with {mentor.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestStatus(null);
                }}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestStatus?.success ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-emerald-900">Request Dispatched!</p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {requestStatus.message}
                </p>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  Back to Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                {requestStatus?.error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{requestStatus.error}</span>
                  </div>
                )}

                {/* Invariant & Capacity Notice */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {isLoggedInStudent
                      ? "Mentor capacity is verified. Once accepted, you will collaborate via scoped sessions and action items. Personal emails remain shielded."
                      : "Please ensure you are signed in with your student account to track application status and session coordination."}
                  </span>
                </div>

                {/* 1. Goal Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Select Mentorship Goal *</span>
                  </label>
                  <select
                    value={selectedGoal}
                    onChange={(e) => setSelectedGoal(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium"
                  >
                    {studentGoals.map((g) => (
                      <option key={g.id} value={g.title}>
                        {g.title}
                      </option>
                    ))}
                    <option value="System Architecture & Scalability">
                      System Architecture & Scalability
                    </option>
                    <option value="Technical Mock Interview Preparation">
                      Technical Mock Interview Preparation
                    </option>
                    <option value="Portfolio & Resume Review">
                      Portfolio & Resume Review
                    </option>
                    <option value="Early-Career Engineering Pathways">
                      Early-Career Engineering Pathways
                    </option>
                    <option value="custom">Other / Custom Goal...</option>
                  </select>
                </div>

                {selectedGoal === "custom" && (
                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 uppercase mb-1">
                      Custom Goal Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Distributed Consensus Implementations"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900"
                    />
                  </div>
                )}

                {/* 2. Personalized Message */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Personalized Note to Mentor *</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Introduce yourself, your academic background, and what specific questions or guidance you'd like to explore..."
                    value={introMessage}
                    onChange={(e) => setIntroMessage(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Keep your message focused and clear (max 1,000 characters).
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !introMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#c4533a] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
