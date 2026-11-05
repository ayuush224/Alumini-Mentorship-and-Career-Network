"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
  X,
  GraduationCap,
  Briefcase,
  Code2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  Building,
  GitBranch,
  Compass,
  Target,
  Layers,
  User as UserIcon,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import { StudentCareerProfileViewData } from "@/app/actions/profile";

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

interface StudentCareerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentCareerProfileViewData;
  requestMessage?: string;
  requestCreatedAt?: string | Date;
  onAccept?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
  isAtCapacity?: boolean;
}

export function StudentCareerProfileModal({
  isOpen,
  onClose,
  profile,
  requestMessage,
  requestCreatedAt,
  onAccept,
  onDecline,
  isProcessing = false,
  isAtCapacity = false,
}: StudentCareerProfileModalProps) {
  // Close on Escape key press
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

  if (!isOpen) return null;

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const leetCodeProfile = profile.codingProfiles?.find(
    (c) => c.platform.toLowerCase() === "leetcode"
  ) || { platform: "LeetCode", username: "synced", synced: true };


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
            <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-[#2563EB]">
              <GraduationCap className="w-3.5 h-3.5" />
            </span>
            <span className="font-heading text-stone-800">
              Student Career Profile &bull; Verified Academic Dossier
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
          {/* =====================================================================
              1. HERO BANNER & IDENTITY SECTION (FIXED: NO BANNER TEXT OVERLAP)
          ====================================================================== */}
          <section className="bg-white rounded-3xl border border-blue-100/90 overflow-hidden shadow-xs">
            {/* Banner Container */}
            <div className="relative">
              {profile.bannerUrl ? (
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
                /* Fallback Light Blue Wavy Illustration */
                <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-blue-50">
                  <svg
                    className="w-full h-full object-cover"
                    viewBox="0 0 1200 400"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <defs>
                      <linearGradient id="modalBannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#DBEAFE" />
                        <stop offset="50%" stopColor="#EFF6FF" />
                        <stop offset="100%" stopColor="#BFDBFE" />
                      </linearGradient>
                    </defs>
                    <rect width="1200" height="400" fill="url(#modalBannerGrad)" />
                    <path
                      d="M0,280 C300,340 450,220 750,280 C1000,330 1150,260 1200,280 L1200,400 L0,400 Z"
                      fill="#93C5FD"
                      fillOpacity="0.4"
                    />
                    <path
                      d="M0,320 C200,260 500,340 850,290 C1050,260 1150,300 1200,320 L1200,400 L0,400 Z"
                      fill="#60A5FA"
                      fillOpacity="0.3"
                    />
                  </svg>
                </div>
              )}

              {/* Overlapping Circular Avatar (Clean absolute position, exactly half-overlapping) */}
              <div className="absolute -bottom-10 sm:-bottom-12 left-6 z-10">
                <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full overflow-hidden border-4 border-white shadow-md bg-stone-100 shrink-0">
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={profile.name}
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

            {/* Profile Info Bar (Fully below the banner: 100% on clean white surface) */}
            <div className="px-6 pt-13 sm:pt-15 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Name, verified badge, subtitle */}
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold font-heading text-stone-900 tracking-tight">
                      {profile.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Student
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1 font-normal">
                    {profile.major || "Software Developer"} &bull; Class of{" "}
                    {profile.graduationYear || 2028}
                  </p>
                </div>

                {/* Quick Stat Badges on Right */}
                <div className="flex items-center gap-2.5 self-start sm:self-center">
                  <div className="px-4 py-2 rounded-xl bg-white border border-stone-200 flex items-center gap-3 shadow-2xs">
                    <span className="text-xs font-semibold text-stone-500 tracking-wider">
                      CGPA
                    </span>
                    <span className="w-px h-4 bg-stone-200" />
                    <span className="text-sm font-bold text-stone-900">
                      {profile.cgpa !== undefined && profile.cgpa !== null
                        ? Number(profile.cgpa).toFixed(1)
                        : "—"}
                    </span>
                  </div>

                  {(profile.totalPoints ?? 0) > 0 && (
                    <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-center flex items-center gap-1.5 text-blue-600 font-bold text-xs shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{profile.totalPoints} pts</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================================
              2. INTRODUCTORY NOTE (FROM MENTORSHIP REQUEST IF PRESENT)
          ====================================================================== */}
          {requestMessage && (
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] font-mono uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Introductory Note from {profile.name}</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-800 italic leading-relaxed pl-5 border-l-2 border-[#2563EB]/50">
                &ldquo;{requestMessage}&rdquo;
              </p>
              {requestCreatedAt && (
                <p className="text-[11px] font-mono text-stone-400 pl-5">
                  Received on{" "}
                  {new Date(requestCreatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* =====================================================================
              3. MAIN MODULAR CARDS (2-COLUMN GRID MATCHING STUDENT PROFILE)
          ====================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 Cols): About, Work Experience, Featured Projects */}
            <div className="lg:col-span-7 space-y-6">
              {/* CARD 1: ABOUT */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2 font-heading">
                  <UserIcon className="w-4 h-4 text-[#2563EB]" />
                  <span>About</span>
                </h3>
                {profile.bio ? (
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                ) : (
                  <div className="border border-dashed border-stone-200 rounded-xl p-6 text-center bg-stone-50/40">
                    <p className="text-xs text-stone-400">Exploring Backend Development</p>
                  </div>
                )}
              </div>

              {/* CARD 2: WORK EXPERIENCE */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 font-heading">
                    <Briefcase className="w-4 h-4 text-[#2563EB]" />
                    <span>Work Experience</span>
                  </h3>
                  <span className="text-xs font-mono text-stone-400">
                    {profile.experience?.length || 0} listed
                  </span>
                </div>

                {profile.experience && profile.experience.length > 0 ? (
                  <div className="space-y-4 divide-y divide-stone-100">
                    {profile.experience.map((exp, idx) => (
                      <div
                        key={`${exp.company}-${idx}`}
                        className={`flex items-start gap-3.5 ${idx > 0 ? "pt-4" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0 text-[#2563EB]">
                          <Building className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                            {exp.role}
                          </h4>
                          <p className="text-xs font-semibold text-[#2563EB] mt-0.5">
                            {exp.company}
                          </p>
                          <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                            {formatExperienceDate(exp.startDate) || "Date"} &ndash;{" "}
                            {exp.current
                              ? "Present"
                              : formatExperienceDate(exp.endDate) || "Present"}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/30">
                    <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-700 mb-0.5">
                      No experience added
                    </p>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                      Student has not yet added past internships, research assistantships, or part-time roles.
                    </p>
                  </div>
                )}
              </div>

              {/* CARD 3: FEATURED PROJECTS */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 font-heading">
                    <Code2 className="w-4 h-4 text-[#2563EB]" />
                    <span>Featured Projects</span>
                  </h3>
                  <span className="text-xs font-mono text-stone-400">
                    {profile.projects?.length || 0} showcased
                  </span>
                </div>

                {profile.projects && profile.projects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.projects.map((proj, idx) => (
                      <div
                        key={`${proj.title}-${idx}`}
                        className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between hover:border-blue-200 transition-colors"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                              {proj.title}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                              {proj.liveLink && (
                                <a
                                  href={proj.liveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-stone-400 hover:text-[#2563EB] transition-colors"
                                  title="Live Demo"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {proj.githubLink && (
                                <a
                                  href={proj.githubLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-stone-400 hover:text-stone-900 transition-colors"
                                  title="GitHub Repository"
                                >
                                  <GitBranch className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          {proj.description && (
                            <p className="text-xs text-stone-600 line-clamp-3 mb-3 leading-relaxed">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <div>
                          {proj.techStack && proj.techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-200/60">
                              {proj.techStack.map((tech, tIdx) => (
                                <span
                                  key={`${tech}-${tIdx}`}
                                  className="px-2 py-0.5 rounded-md bg-white text-[10px] font-mono text-stone-700 border border-stone-200"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/30">
                    <Code2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-700 mb-0.5">
                      No projects showcased yet
                    </p>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                      Student has not yet added capstone or open-source builds to their profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (5 Cols): Education, Skills, Coding/Links, Career Focus */}
            <div className="lg:col-span-5 space-y-6">
              {/* CARD 4: EDUCATION */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2 font-heading">
                  <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                  <span>Education</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-stone-900">
                      {profile.major || "Software Developer"}
                    </p>
                    <p className="text-xs text-stone-500">University Affiliated Institute</p>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-stone-100 text-stone-600">
                    <span>Class of {profile.graduationYear || "\u2014"}</span>
                    <span className="font-semibold text-stone-900">
                      CGPA:{" "}
                      {profile.cgpa !== undefined && profile.cgpa !== null
                        ? Number(profile.cgpa).toFixed(1)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 5: SKILLS */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 font-heading">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <span>Skills</span>
                  </h3>
                  <span className="text-xs font-mono text-stone-400">
                    {profile.skills?.length || 0} added
                  </span>
                </div>

                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <span
                        key={`${skill}-${idx}`}
                        className="px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200/90 shadow-2xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-stone-200 rounded-xl p-5 text-center bg-stone-50/40">
                    <p className="text-xs text-stone-400">No skills added yet</p>
                  </div>
                )}
              </div>

              {/* CARD 6: CODING PROFILES & LINKS (MATCHING IMAGE 1 IN READ-ONLY MODE) */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                {/* 1. CODING PROFILES */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    CODING PROFILES
                  </span>
                  <div className="flex items-center justify-between py-1.5 px-1 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                          <path
                            fill="#262626"
                            d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"
                          />
                          <path
                            fill="#FFA116"
                            d="M9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900">LeetCode</h4>
                        {leetCodeProfile.username && leetCodeProfile.username !== "synced" && (
                          <span className="text-[11px] font-mono text-stone-400">
                            @{leetCodeProfile.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-emerald-600 text-xs font-semibold">Synced</span>
                  </div>
                </div>

                <div className="border-b border-stone-100" />

                {/* 2. SOCIAL LINKS */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    SOCIAL LINKS
                  </span>
                  {profile.socialLinks && profile.socialLinks.length > 0 ? (
                    <div className="space-y-1.5">
                      {profile.socialLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-blue-50 border border-stone-200/80 text-xs text-stone-800 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Globe className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            <span className="font-semibold text-stone-900">{link.platform}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-stone-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-stone-200 rounded-xl py-4 text-center bg-stone-50/20">
                      <p className="text-xs text-stone-400">No social links added</p>
                    </div>
                  )}
                </div>

                <div className="border-b border-stone-100" />

                {/* 3. OTHER LINKS */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    OTHER LINKS
                  </span>
                  {profile.otherLinks && profile.otherLinks.length > 0 ? (
                    <div className="space-y-1.5">
                      {profile.otherLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-blue-50 border border-stone-200/80 text-xs text-stone-800 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <LinkIcon className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            <span className="font-semibold text-stone-900">{link.title}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-stone-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-stone-200 rounded-xl py-4 text-center bg-stone-50/20">
                      <p className="text-xs text-stone-400">No other links added</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 7: CAREER FOCUS & TARGET INDUSTRIES */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
                <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2 font-heading">
                  <Compass className="w-4 h-4 text-[#2563EB]" />
                  <span>Career Focus</span>
                </h3>

                {profile.targetIndustries && profile.targetIndustries.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Target className="w-3 h-3 text-stone-400" />
                        <span>Target Industries</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.targetIndustries.map((ind, idx) => (
                          <span
                            key={`${ind}-${idx}`}
                            className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200"
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
                    <p className="font-semibold text-stone-800">Software Engineering Focus</p>
                    <p className="text-[11px] text-stone-500">
                      Seeking 1-on-1 alumni mentorship for architecture review, interview preparation, and technical portfolio development.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. ACTION FOOTER BAR
        ====================================================================== */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {onAccept
                ? "Shielded Contact: Personal details remain private. Communication unlocks inside Alma upon acceptance."
                : "Active Mentorship Relationship • Verified Academic Dossier"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onDecline && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={onDecline}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Decline</span>
              </button>
            )}

            {onAccept ? (
              <button
                type="button"
                disabled={isProcessing || isAtCapacity}
                onClick={onAccept}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isAtCapacity ? "Capacity Reached" : "Accept Mentorship"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Close Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
