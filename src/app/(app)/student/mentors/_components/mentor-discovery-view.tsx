"use client";

import React, { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  fetchScoredMentorsAction,
  requestMentorship,
  ScoredMentorCardItem,
} from "@/app/actions/mentorship";

interface MentorDiscoveryViewProps {
  initialMentors: ScoredMentorCardItem[];
  initialTotal: number;
  initialHasMore: boolean;
  initialPendingCount: number;
  maxPendingAllowed: number;
  initialReachedLimit: boolean;
}

const INDUSTRIES = [
  { label: "All Industries", value: "all" },
  { label: "Technology", value: "Technology" },
  { label: "Financial Technology", value: "Financial Technology" },
  { label: "Cloud Infrastructure", value: "Cloud Infrastructure" },
];

export function MentorDiscoveryView({
  initialMentors,
  initialTotal,
  initialHasMore,
  initialPendingCount,
  maxPendingAllowed,
  initialReachedLimit,
}: MentorDiscoveryViewProps) {
  const [mentors, setMentors] = useState<ScoredMentorCardItem[]>(initialMentors);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");

  // Pending request quota state
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [hasReachedLimit, setHasReachedLimit] = useState(initialReachedLimit);

  // Intro Request Modal
  const [activeMentor, setActiveMentor] = useState<ScoredMentorCardItem | null>(null);
  const [introNote, setIntroNote] = useState("");
  const [isSubmitting, startTransition] = useTransition();
  const [modalFeedback, setModalFeedback] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Intersection Observer Sentinel for Infinite Scrolling
  const observerTarget = useRef<HTMLDivElement>(null);

  // Debounced search / filter reload
  const reloadWithFilters = useCallback(
    async (searchTerm: string, industryTerm: string) => {
      setIsLoadingMore(true);
      const res = await fetchScoredMentorsAction({
        page: 1,
        limit: 12,
        search: searchTerm,
        industry: industryTerm,
      });

      if (res.success) {
        setMentors(res.mentors);
        setPage(1);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPendingCount(res.pendingRequestsCount);
        setHasReachedLimit(res.hasReachedPendingLimit);
      }
      setIsLoadingMore(false);
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      reloadWithFilters(search, selectedIndustry);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedIndustry, reloadWithFilters]);

  // Load next batch on scroll intersection
  const loadNextBatch = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    const res = await fetchScoredMentorsAction({
      page: nextPage,
      limit: 12,
      search,
      industry: selectedIndustry,
    });

    if (res.success) {
      setMentors((prev) => [...prev, ...res.mentors]);
      setPage(nextPage);
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPendingCount(res.pendingRequestsCount);
      setHasReachedLimit(res.hasReachedPendingLimit);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, page, search, selectedIndustry]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadNextBatch();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadNextBatch]);

  // Submit Intro Request
  const handleSubmitIntro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMentor || !introNote.trim() || hasReachedLimit) return;

    setModalFeedback(null);

    startTransition(async () => {
      const res = await requestMentorship(activeMentor.mentorId, introNote.trim());
      if (res.success) {
        setModalFeedback({
          success: true,
          message: res.message || "Request sent successfully!",
        });

        // Update local status flag
        setMentors((prev) =>
          prev.map((m) =>
            m.mentorId === activeMentor.mentorId
              ? { ...m, hasPendingRequest: true }
              : m
          )
        );

        setPendingCount((c) => c + 1);
        if (pendingCount + 1 >= maxPendingAllowed) {
          setHasReachedLimit(true);
        }
      } else {
        setModalFeedback({
          success: false,
          error: res.error || "Failed to send request. Please try again.",
        });
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* =====================================================================
          HEADER & EXPLAINABLE MATCHING BANNER
      ====================================================================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-[#2563EB] font-mono">
            M4 DISCOVERY &amp; MATCHING
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 tracking-tight mt-1">
            Verified Alumni Mentors
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
            Algorithmic matchmaking scores mentors based on your career interests (+60%) and shared skills (+40%), strictly filtered by verified capacity limits.
          </p>
        </div>

        {/* Pending Request Throttling Tracker */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 ${
              hasReachedLimit
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-white text-stone-700 border-stone-200 shadow-2xs"
            }`}
          >
            <Clock className={`w-4 h-4 ${hasReachedLimit ? "text-rose-600" : "text-[#2563EB]"}`} />
            <div>
              <span className="font-semibold">Pending Requests: </span>
              <span className="font-mono font-bold">
                {pendingCount} / {maxPendingAllowed}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Throttling Warning Notice if Limit Reached */}
      {hasReachedLimit && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pending Request Limit Reached ({maxPendingAllowed})</p>
            <p className="text-amber-800 mt-0.5">
              To respect mentor time and prevent spam, you can have a maximum of {maxPendingAllowed} active pending requests at once. Please wait for mentors to reply before requesting additional introductions.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          SEARCH & INDUSTRY FILTER CONTROLS
      ====================================================================== */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by mentor name, company, job title, or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>

          {/* Industry pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.value}
                type="button"
                onClick={() => setSelectedIndustry(ind.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedIndustry === ind.value
                    ? "bg-[#2563EB] text-white shadow-2xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-600 font-mono pt-2 border-t border-stone-100">
          <span>
            Showing {mentors.length} of {total} available mentors
          </span>
          <span>Sorted by match score (% descending)</span>
        </div>
      </div>

      {/* =====================================================================
          MENTOR CARDS GRID (STEP 2 UI)
      ====================================================================== */}
      {mentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => {
            const isRequestDisabled =
              hasReachedLimit ||
              mentor.hasPendingRequest ||
              mentor.hasActiveMentorship ||
              mentor.isAtCapacity;

            return (
              <div
                key={mentor.id}
                className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Avatar, Name, Company & Verified Alumni Pill */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 border border-stone-200 relative shrink-0">
                        {mentor.avatarUrl ? (
                          <Image
                            src={mentor.avatarUrl}
                            alt={mentor.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-stone-700 text-sm bg-stone-200">
                            {mentor.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/profile/${mentor.mentorId}`}
                            className="font-bold text-stone-900 text-sm hover:text-[#2563EB] transition-colors"
                          >
                            {mentor.name}
                          </Link>
                          <span title="Verified Alumni">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 font-medium truncate max-w-[180px]">
                          {mentor.jobTitle} &bull; {mentor.company}
                        </p>
                      </div>
                    </div>

                    {/* Match Score Badge (+X% Match) */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      +{mentor.score}% Match
                    </span>
                  </div>

                  {/* Headline */}
                  {mentor.headline && (
                    <p className="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">
                      {mentor.headline}
                    </p>
                  )}

                  {/* Match Rationale Pill */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-3 text-[11px] text-stone-700 leading-snug">
                    <span className="font-semibold text-stone-900">Why this match: </span>
                    <span className="text-stone-600">{mentor.rationale}</span>
                  </div>

                  {/* Skills Tag Cloud */}
                  {mentor.expertiseTags && mentor.expertiseTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {mentor.expertiseTags.slice(0, 3).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] font-mono text-stone-700 border border-stone-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {mentor.expertiseTags.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-stone-400 font-mono">
                          +{mentor.expertiseTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Capacity Spots & Request Intro Action */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {mentor.remainingSpots > 0
                        ? `${mentor.remainingSpots} spot${mentor.remainingSpots > 1 ? "s" : ""} open`
                        : "At capacity"}
                    </span>
                  </div>

                  {mentor.hasActiveMentorship ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Mentee
                    </span>
                  ) : mentor.hasPendingRequest ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      Request Pending
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isRequestDisabled}
                      onClick={() => {
                        setActiveMentor(mentor);
                        setIntroNote("");
                        setModalFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#c4533a] disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Request Intro</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto shadow-xs">
          <Filter className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-900 mb-1">No Mentors Found</h3>
          <p className="text-xs text-stone-500 mb-4">
            No verified alumni mentors match your current search or industry filters. Try broadening your criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedIndustry("all");
            }}
            className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Infinite Scrolling Sentinel & Loading Indicator */}
      <div ref={observerTarget} className="py-6 text-center">
        {isLoadingMore && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-xs text-stone-600 shadow-2xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
            <span>Loading next batch of mentors...</span>
          </div>
        )}
        {!hasMore && mentors.length > 0 && (
          <p className="text-xs text-stone-400 font-mono">
            &bull; All available mentors loaded &bull;
          </p>
        )}
      </div>

      {/* =====================================================================
          REQUEST INTRO MODAL
      ====================================================================== */}
      {activeMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Request Introduction to {activeMentor.name}
                </h3>
                <p className="text-xs text-stone-500">
                  {activeMentor.jobTitle} &bull; {activeMentor.company}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMentor(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback?.success ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-900">Introduction Sent!</p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {modalFeedback.message}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveMentor(null)}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitIntro} className="space-y-4">
                {modalFeedback?.error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalFeedback.error}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Your request is bounded by institutional rules. Alumni personal contact details remain shielded. Once accepted, you will collaborate via scoped sessions.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                    <span>Brief Introductory Note *</span>
                    <span className="text-[11px] text-stone-400 font-mono font-normal">
                      {introNote.length} / 1000
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    maxLength={1000}
                    placeholder="Hello! I would value your guidance and career mentorship on preparing for technical roles and industry growth..."
                    value={introNote}
                    onChange={(e) => setIntroNote(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Explain what specific mentorship advice or topic you hope to explore together.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <Link
                    href={`/profile/${activeMentor.mentorId}`}
                    target="_blank"
                    className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>View Full Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMentor(null)}
                      className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !introNote.trim() || hasReachedLimit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#c4533a] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                      Send Request
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
