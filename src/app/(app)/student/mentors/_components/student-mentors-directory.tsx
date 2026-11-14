"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Clock,
} from "lucide-react";
import { MentorCard, type Mentor } from "@/app/_components/mentor-card";
import { MentorPublicProfileModal } from "./mentor-public-profile-modal";

interface StudentMentorsDirectoryProps {
  initialMentors: Mentor[];
  studentFocusIndustry?: string;
  studentSkills?: string[];
}

export function StudentMentorsDirectory({
  initialMentors,
  studentFocusIndustry,
  studentSkills = [],
}: StudentMentorsDirectoryProps) {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"matchScore" | "remainingSpots" | "name">("matchScore");

  // Public Profile Modal State
  const [selectedMentorForModal, setSelectedMentorForModal] = useState<Mentor | null>(null);
  const [sentMentorIds, setSentMentorIds] = useState<Set<string>>(new Set());

  // Recently Viewed Mentors State (persisted in localStorage)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  // Load recently viewed mentor IDs on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("alma_recently_viewed_mentors");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentlyViewedIds(parsed);
          }
        }
      } catch {
        // Ignore localStorage read errors
      }
    }
  }, []);

  // Map recently viewed IDs to authoritative Mentor objects
  const recentlyViewedMentors = useMemo(() => {
    if (recentlyViewedIds.length === 0) return [];
    const mentorMap = new Map<string, Mentor>();
    for (const m of initialMentors) {
      if (m.mentorId) mentorMap.set(m.mentorId, m);
      if (m.id) mentorMap.set(m.id, m);
    }
    return recentlyViewedIds
      .map((id) => mentorMap.get(id))
      .filter((m): m is Mentor => Boolean(m));
  }, [recentlyViewedIds, initialMentors]);

  // Track mentor view and open modal
  const handleOpenMentorModal = (mentor: Mentor) => {
    setSelectedMentorForModal(mentor);
    if (typeof window !== "undefined") {
      try {
        const key = "alma_recently_viewed_mentors";
        const currentJson = localStorage.getItem(key);
        const currentIds: string[] = currentJson ? JSON.parse(currentJson) : [];
        const mentorId = mentor.mentorId || mentor.id;
        const updated = [mentorId, ...currentIds.filter((id) => id !== mentorId)].slice(0, 6);
        localStorage.setItem(key, JSON.stringify(updated));
        setRecentlyViewedIds(updated);
      } catch {
        // Ignore localStorage quota errors
      }
    }
  };

  const handleClearRecentlyViewed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("alma_recently_viewed_mentors");
        setRecentlyViewedIds([]);
      } catch {
        // Ignore
      }
    }
  };

  // Extract unique industries from mentors list
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    for (const m of initialMentors) {
      if (m.industry?.trim()) {
        set.add(m.industry.trim());
      }
    }
    return Array.from(set).sort();
  }, [initialMentors]);

  // Extract unique skills / expertise tags from mentors list
  const availableSkills = useMemo(() => {
    const set = new Set<string>();
    for (const m of initialMentors) {
      if (Array.isArray(m.expertiseTags)) {
        for (const tag of m.expertiseTags) {
          if (tag?.trim()) set.add(tag.trim());
        }
      }
    }
    return Array.from(set).sort();
  }, [initialMentors]);

  // Filter & sort logic
  const filteredMentors = useMemo(() => {
    const list = initialMentors.map((m) => {
      if (sentMentorIds.has(m.mentorId)) {
        return { ...m, hasPendingRequest: true };
      }
      return m;
    });

    return list.filter((m) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = m.name?.toLowerCase().includes(query);
        const companyMatch = m.company?.toLowerCase().includes(query);
        const jobTitleMatch = m.jobTitle?.toLowerCase().includes(query);
        const industryMatch = m.industry?.toLowerCase().includes(query);
        const tagsMatch = m.expertiseTags?.some((t) => t.toLowerCase().includes(query));

        if (!nameMatch && !companyMatch && !jobTitleMatch && !industryMatch && !tagsMatch) {
          return false;
        }
      }

      // 2. Industry Filter
      if (selectedIndustry !== "all") {
        if (!m.industry || m.industry.toLowerCase() !== selectedIndustry.toLowerCase()) {
          return false;
        }
      }

      // 3. Skill / Expertise Filter
      if (selectedSkill !== "all") {
        if (
          !m.expertiseTags ||
          !m.expertiseTags.some((t) => t.toLowerCase() === selectedSkill.toLowerCase())
        ) {
          return false;
        }
      }

      // 4. Minimum Match Score Filter
      if (minMatchScore > 0) {
        if ((m.matchScore || 0) < minMatchScore) {
          return false;
        }
      }

      // 5. Availability Filter
      if (availableOnly) {
        const remaining = m.capacity?.remainingSpots ?? 1;
        if (remaining <= 0) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "matchScore") {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      if (sortBy === "remainingSpots") {
        const spotsA = a.capacity?.remainingSpots ?? 1;
        const spotsB = b.capacity?.remainingSpots ?? 1;
        return spotsB - spotsA;
      }
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });
  }, [
    initialMentors,
    searchQuery,
    selectedIndustry,
    selectedSkill,
    minMatchScore,
    availableOnly,
    sortBy,
    sentMentorIds,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedIndustry !== "all" ||
    selectedSkill !== "all" ||
    minMatchScore > 0 ||
    availableOnly ||
    sortBy !== "matchScore";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedIndustry("all");
    setSelectedSkill("all");
    setMinMatchScore(0);
    setAvailableOnly(false);
    setSortBy("matchScore");
  };

  const handleRequestSentSuccess = (mentorId: string) => {
    setSentMentorIds((prev) => new Set(prev).add(mentorId));
  };

  return (
    <div className="space-y-6">
      {/* Recently Viewed Mentors Carousel */}
      {recentlyViewedMentors.length > 0 && (
        <div className="bg-white/85 backdrop-blur-xs rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs space-y-3 transition-all animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Recently Viewed Mentors
              </h3>
              <span className="text-[11px] font-medium text-stone-400">
                ({recentlyViewedMentors.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearRecentlyViewed}
              className="text-[11px] font-medium text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              Clear history
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {recentlyViewedMentors.map((m) => {
              const mentorInitials = m.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <button
                  key={m.id || m.mentorId}
                  type="button"
                  onClick={() => handleOpenMentorModal(m)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-stone-50 hover:bg-blue-50/70 border border-stone-200/80 hover:border-blue-200 text-left transition-all shrink-0 cursor-pointer group shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-[10px] shrink-0">
                    {mentorInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-800 group-hover:text-blue-700 transition-colors truncate max-w-[130px]">
                      {m.name}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate max-w-[130px]">
                      {m.jobTitle ? `${m.jobTitle} • ${m.company}` : m.company}
                    </div>
                  </div>
                  {m.matchScore !== undefined && (
                    <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded-md shrink-0">
                      {m.matchScore}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Command Center Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Row 1: Search Input & Quick Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Main Keyword Search Bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by mentor name, company (e.g. Stripe, Uber), job title, or skill..."
              className="w-full pl-10 pr-9 py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200/80 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Industry Filter Dropdown */}
          <div className="md:col-span-3 relative">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200/80 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all pr-8 cursor-pointer"
            >
              <option value="all">All Industries ({availableIndustries.length})</option>
              {availableIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Skills Filter Dropdown */}
          <div className="md:col-span-3 relative">
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200/80 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all pr-8 cursor-pointer"
            >
              <option value="all">All Skills & Topics ({availableSkills.length})</option>
              {availableSkills.map((sk) => (
                <option key={sk} value={sk}>
                  {sk}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Row 2: Secondary Quick Filter Toggles & Sorting */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Score Pills & Availability Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mr-1">
              Affinity:
            </span>

            {/* Score Filters */}
            {[
              { label: "All Scores", value: 0 },
              { label: "90%+ Match", value: 90 },
              { label: "80%+ Match", value: 80 },
              { label: "70%+ Match", value: 70 },
            ].map((scoreOpt) => {
              const active = minMatchScore === scoreOpt.value;
              return (
                <button
                  key={scoreOpt.value}
                  type="button"
                  onClick={() => setMinMatchScore(scoreOpt.value)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? "bg-blue-50 text-blue-600 border border-blue-200 font-semibold"
                      : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70"
                  }`}
                >
                  {scoreOpt.value > 0 && <Sparkles className="w-3 h-3 text-blue-600" />}
                  <span>{scoreOpt.label}</span>
                </button>
              );
            })}

            <span className="w-px h-4 bg-stone-200 mx-1 hidden sm:inline-block" />

            {/* Available Spots Toggle */}
            <button
              type="button"
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                availableOnly
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  availableOnly ? "bg-emerald-500" : "bg-stone-300"
                }`}
              />
              <span>Open Spots Only</span>
            </button>
          </div>

          {/* Right: Sort By Selection */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-stone-500 text-xs">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "matchScore" | "remainingSpots" | "name")
                }
                className="appearance-none pl-3 pr-7 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="matchScore">Best Match Score</option>
                <option value="remainingSpots">Remaining Spots</option>
                <option value="name">Mentor Name (A-Z)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 3: Active Filter Chips & Clear Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-stone-500 font-medium">
              Showing <strong className="text-stone-900">{filteredMentors.length}</strong> of{" "}
              {initialMentors.length} verified mentors
            </span>

            {/* Personalized Context Pill */}
            {studentFocusIndustry && selectedIndustry === "all" && (
              <button
                type="button"
                onClick={() => setSelectedIndustry(studentFocusIndustry)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50/70 hover:bg-blue-100/70 text-primary-600 border border-blue-200/60 text-[11px] font-medium transition-colors cursor-pointer"
                title="Filter by your declared target industry"
              >
                <span>Target: {studentFocusIndustry}</span>
              </button>
            )}

            {/* Student skill quick pills */}
            {studentSkills.slice(0, 2).map((sk) => (
              <button
                key={sk}
                type="button"
                onClick={() => setSelectedSkill(sk)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200/70 text-stone-600 text-[11px] font-medium transition-colors cursor-pointer"
                title={`Filter mentors by your skill ${sk}`}
              >
                <span>#{sk}</span>
              </button>
            ))}

            {/* Active Filters List */}
            {selectedIndustry !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-medium">
                <span>Industry: {selectedIndustry}</span>
                <button
                  type="button"
                  onClick={() => setSelectedIndustry("all")}
                  className="hover:text-blue-800 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSkill !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-medium">
                <span>Skill: {selectedSkill}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSkill("all")}
                  className="hover:text-stone-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {minMatchScore > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-medium">
                <span>Min: {minMatchScore}% Match</span>
                <button
                  type="button"
                  onClick={() => setMinMatchScore(0)}
                  className="hover:text-blue-800 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {availableOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                <span>Available Spots Only</span>
                <button
                  type="button"
                  onClick={() => setAvailableOnly(false)}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Mentor Cards Grid */}
      {filteredMentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              onViewProfile={handleOpenMentorModal}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading text-stone-900">
              No mentors match your search criteria
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
              We couldn&apos;t find any alumni mentors matching your current filters. Try searching for different keywords, lowering the match affinity score, or clearing active filters.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Public Profile Modal */}
      <MentorPublicProfileModal
        isOpen={!!selectedMentorForModal}
        onClose={() => setSelectedMentorForModal(null)}
        mentor={selectedMentorForModal}
        onRequestSent={handleRequestSentSuccess}
      />
    </div>
  );
}
