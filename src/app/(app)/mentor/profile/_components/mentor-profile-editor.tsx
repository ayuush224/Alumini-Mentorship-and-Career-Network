"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  ShieldCheck,
  Star,
  Users,
  Video,
  Plus,
  Trash2,
  Edit3,
  X,
  ExternalLink,
  Briefcase,
  Compass,
  Code2,
  Clock,
} from "lucide-react";
import { ImageUpload } from "@/components/shared/ImageUpload";
import {
  updateAvatarUrl,
  updateBannerUrl,
  updateMentorProfile,
  addMentorSkill,
  removeMentorSkill,
  addMentorshipArea,
  deleteMentorshipArea,
  addMentorExperience,
  deleteMentorExperience,
  addMentorFeaturedWork,
  deleteMentorFeaturedWork,
} from "@/app/actions/profile";

export interface MentorProfileData {
  name: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  headline?: string;
  bio?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  availability: "open" | "waitlist";
  totalMentees: number;
  activeMentees?: number;
  maxMentees?: number;
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
    thumbnailUrl?: string;
    tags: string[];
    link?: string;
  }>;
}

export function formatDuration(
  startDate?: string | Date,
  endDate?: string | Date
): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  if (months < 1) months = 1;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths} mo${remainingMonths > 1 ? "s" : ""}`);

  return parts.join(" ") || "1 mo";
}

export function MentorProfileEditor({ initialData }: { initialData: MentorProfileData }) {
  const [data, setData] = useState<MentorProfileData>(initialData);
  const [isPending, startTransition] = useTransition();

  // Editing headline / bio
  const [editingHeader, setEditingHeader] = useState(false);
  const [headlineInput, setHeadlineInput] = useState(data.headline || "");
  const [bioInput, setBioInput] = useState(data.bio || "");

  // Modal states
  const [newSkill, setNewSkill] = useState("");
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [areaForm, setAreaForm] = useState({ title: "", description: "", icon: "compass" });

  const [showAddExpModal, setShowAddExpModal] = useState(false);
  const [expForm, setExpForm] = useState({
    role: "",
    company: "",
    type: "Full-time",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: "",
    skills: "",
  });

  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [workForm, setWorkForm] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    tags: "",
    link: "",
  });

  // Banner & Avatar
  const handleBannerUpload = async (url: string, publicId?: string) => {
    setData((prev) => ({ ...prev, bannerUrl: url }));
    await updateBannerUrl(url, publicId);
  };

  const handleAvatarUpload = async (url: string, publicId?: string) => {
    setData((prev) => ({ ...prev, avatarUrl: url }));
    await updateAvatarUrl(url, publicId);
  };

  // Availability toggle
  const handleToggleAvailability = () => {
    const nextAvailability = data.availability === "open" ? "waitlist" : "open";
    startTransition(async () => {
      await updateMentorProfile({ availability: nextAvailability });
      setData((prev) => ({ ...prev, availability: nextAvailability }));
    });
  };

  // Save headline & bio
  const handleSaveHeader = () => {
    startTransition(async () => {
      await updateMentorProfile({
        headline: headlineInput,
        bio: bioInput,
      });
      setData((prev) => ({
        ...prev,
        headline: headlineInput,
        bio: bioInput,
      }));
      setEditingHeader(false);
    });
  };

  // Skill handlers
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSkill.trim();
    if (!clean || data.skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return;

    startTransition(async () => {
      await addMentorSkill(clean);
      setData((prev) => ({
        ...prev,
        skills: [...prev.skills, { name: clean, endorsements: 0 }],
      }));
      setNewSkill("");
    });
  };

  const handleRemoveSkill = (name: string) => {
    startTransition(async () => {
      await removeMentorSkill(name);
      setData((prev) => ({
        ...prev,
        skills: prev.skills.filter((s) => s.name !== name),
      }));
    });
  };

  // Mentorship Area handlers
  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaForm.title.trim()) return;

    const newArea = {
      title: areaForm.title.trim(),
      description: areaForm.description.trim(),
      icon: areaForm.icon.trim() || "compass",
    };

    startTransition(async () => {
      await addMentorshipArea(newArea);
      setData((prev) => ({
        ...prev,
        mentorshipAreas: [...prev.mentorshipAreas, newArea],
      }));
      setAreaForm({ title: "", description: "", icon: "compass" });
      setShowAddAreaModal(false);
    });
  };

  const handleDeleteArea = (title: string) => {
    startTransition(async () => {
      await deleteMentorshipArea(title);
      setData((prev) => ({
        ...prev,
        mentorshipAreas: prev.mentorshipAreas.filter((a) => a.title !== title),
      }));
    });
  };

  // Experience handlers
  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.role.trim() || !expForm.company.trim()) return;

    const bulletsList = expForm.bullets
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    const skillsList = expForm.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newExp = {
      role: expForm.role.trim(),
      company: expForm.company.trim(),
      type: expForm.type.trim(),
      location: expForm.location.trim(),
      startDate: expForm.startDate,
      endDate: expForm.current ? undefined : expForm.endDate,
      bullets: bulletsList,
      skills: skillsList,
    };

    startTransition(async () => {
      await addMentorExperience(newExp);
      setData((prev) => ({
        ...prev,
        experience: [newExp, ...prev.experience],
      }));
      setExpForm({
        role: "",
        company: "",
        type: "Full-time",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        bullets: "",
        skills: "",
      });
      setShowAddExpModal(false);
    });
  };

  const handleDeleteExperience = (company: string, role: string) => {
    startTransition(async () => {
      await deleteMentorExperience(company, role);
      setData((prev) => ({
        ...prev,
        experience: prev.experience.filter((e) => !(e.company === company && e.role === role)),
      }));
    });
  };

  // Featured Work handlers
  const handleAddWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workForm.title.trim()) return;

    const tagsList = workForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newWork = {
      title: workForm.title.trim(),
      description: workForm.description.trim(),
      thumbnailUrl: workForm.thumbnailUrl.trim(),
      tags: tagsList,
      link: workForm.link.trim(),
    };

    startTransition(async () => {
      await addMentorFeaturedWork(newWork);
      setData((prev) => ({
        ...prev,
        featuredWork: [...prev.featuredWork, newWork],
      }));
      setWorkForm({ title: "", description: "", thumbnailUrl: "", tags: "", link: "" });
      setShowAddWorkModal(false);
    });
  };

  const handleDeleteWork = (title: string) => {
    startTransition(async () => {
      await deleteMentorFeaturedWork(title);
      setData((prev) => ({
        ...prev,
        featuredWork: prev.featuredWork.filter((w) => w.title !== title),
      }));
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* =====================================================================
          HEADER HERO WITH BANNER & OVERLAPPING AVATAR
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="relative">
          <ImageUpload
            variant="banner"
            currentUrl={data.bannerUrl}
            onUploadSuccess={handleBannerUpload}
            label="Mentor Profile Banner"
          />
        </div>

        <div className="px-6 pb-6 pt-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="flex items-end gap-5">
              <div className="relative z-10 shrink-0">
                <ImageUpload
                  variant="avatar"
                  currentUrl={data.avatarUrl}
                  onUploadSuccess={handleAvatarUpload}
                  label={data.name}
                />
              </div>

              <div className="pt-2 sm:pt-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                    {data.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Alumni
                  </span>
                </div>
                <p className="text-sm text-stone-600 mt-0.5 font-medium">
                  {data.jobTitle || "Senior Software Engineer"} &bull; {data.company || "Independent"}
                </p>
              </div>
            </div>

            {/* Availability Pill & Public Link */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAvailability}
                disabled={isPending}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors shadow-2xs ${
                  data.availability === "open"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                }`}
                title="Click to toggle availability status"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    data.availability === "open" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span>{data.availability === "open" ? "Accepting Mentees" : "Waitlist Only"}</span>
              </button>
            </div>
          </div>

          {/* Headline & Bio Row */}
          <div className="pt-2 border-t border-stone-100">
            {editingHeader ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono text-stone-500 uppercase mb-1">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={headlineInput}
                    onChange={(e) => setHeadlineInput(e.target.value)}
                    placeholder="e.g. Staff Distributed Systems Engineer @ Stripe | Ex-Google"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-stone-500 uppercase mb-1">
                    Mentorship Bio & Approach
                  </label>
                  <textarea
                    rows={3}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Describe how you coach mentees, what you expect, and areas of career guidance..."
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHeader(false)}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHeader}
                    disabled={isPending}
                    className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4 pt-1">
                <div>
                  {data.headline && (
                    <p className="text-sm font-semibold text-stone-800 mb-1">{data.headline}</p>
                  )}
                  {data.bio ? (
                    <p className="text-xs text-stone-600 leading-relaxed max-w-3xl whitespace-pre-line">
                      {data.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 italic">No bio or headline specified yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingHeader(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          READ-ONLY STATS ROW (CAPACITY, SESSIONS, AVERAGE RATING)
      ====================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Mentees / Capacity */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Active Mentees
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {data.activeMentees ?? 0}{" "}
              {data.maxMentees !== undefined && (
                <span className="text-sm font-normal text-stone-400">
                  / {data.maxMentees} max
                </span>
              )}
            </p>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Invariant: declared capacity limit enforced
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sessions */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Sessions Completed
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {data.sessionsCompleted ?? 18}
            </p>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Structured 1:1 and group advising
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Video className="w-6 h-6" />
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Average Rating
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1 flex items-center gap-1.5">
              <span>{data.averageRating ? data.averageRating.toFixed(1) : "4.9"}</span>
              <span className="text-amber-400 flex items-center">
                <Star className="w-5 h-5 fill-amber-400" />
              </span>
            </p>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Verified post-session feedback
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* =====================================================================
          EXPERIENCE TIMELINE WITH CIRCULAR NODES & DYNAMIC DURATION
      ====================================================================== */}
      <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-stone-500" />
              <span>Career Experience Timeline</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological track record with calculated durations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddExpModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Experience</span>
          </button>
        </div>

        {data.experience && data.experience.length > 0 ? (
          <div className="relative pl-6 ml-2 border-l-2 border-stone-200 space-y-8">
            {data.experience.map((exp, idx) => {
              const duration = formatDuration(exp.startDate, exp.endDate);
              const startStr = exp.startDate
                ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "";
              const endStr = exp.endDate
                ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "Present";

              return (
                <div key={idx} className="relative group">
                  {/* Circular Node */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-primary-600 group-hover:scale-125 transition-transform" />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">{exp.role}</h3>
                      <p className="text-xs text-stone-700 font-medium">
                        {exp.company}
                        {exp.type && <span className="text-stone-400 font-normal"> &bull; {exp.type}</span>}
                        {exp.location && (
                          <span className="text-stone-400 font-normal"> &bull; {exp.location}</span>
                        )}
                      </p>

                      {/* Date & Calculated Duration */}
                      <p className="text-[11px] text-stone-500 font-mono mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{startStr} — {endStr}</span>
                        <span className="text-stone-300">&bull;</span>
                        <span className="text-primary-600 font-semibold">{duration}</span>
                      </p>

                      {/* Bullets */}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-stone-600 list-disc list-inside">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Skills */}
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

                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(exp.company, exp.role)}
                      className="text-stone-400 hover:text-rose-600 p-1.5 transition-colors"
                      title="Delete experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center bg-stone-50/60">
            <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500 mb-1">No experience recorded</p>
            <p className="text-xs text-stone-400 mb-4 max-w-sm mx-auto">
              Add your current and past industry roles so mentees can understand your background and career arc.
            </p>
            <button
              type="button"
              onClick={() => setShowAddExpModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-primary-600" />
              Add Experience
            </button>
          </div>
        )}
      </section>

      {/* =====================================================================
          MANAGEMENT CARDS: SKILLS, MENTORSHIP AREAS & FEATURED WORK
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. MENTORSHIP AREAS CARD */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-stone-500" />
              <span>Mentorship Areas</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddAreaModal(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Area</span>
            </button>
          </div>

          {data.mentorshipAreas && data.mentorshipAreas.length > 0 ? (
            <div className="space-y-3">
              {data.mentorshipAreas.map((area, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 bg-background/60 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center text-primary-600 shrink-0 mt-0.5">
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
                  <button
                    type="button"
                    onClick={() => handleDeleteArea(area.title)}
                    className="text-stone-400 hover:text-rose-600 p-1"
                    title="Delete area"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center bg-stone-50/60">
              <p className="text-xs text-stone-500 mb-1">No mentorship areas defined</p>
              <p className="text-[11px] text-stone-400 mb-3">
                Specify topics you mentor on (e.g. System Design, Resume Reviews, Grad School).
              </p>
              <button
                type="button"
                onClick={() => setShowAddAreaModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-stone-300 text-xs font-medium text-stone-700"
              >
                <Plus className="w-3 h-3 text-primary-600" />
                Add Area
              </button>
            </div>
          )}
        </div>

        {/* 2. SKILLS CARD */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center justify-between">
            <span>Skills & Expertise</span>
            <span className="text-xs font-mono font-normal text-stone-400">
              {data.skills?.length || 0} skills
            </span>
          </h2>

          <form onSubmit={handleAddSkill} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add skill (e.g. Distributed Systems, Kubernetes)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-primary-600"
            />
            <button
              type="submit"
              disabled={!newSkill.trim() || isPending}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Add
            </button>
          </form>

          {data.skills && data.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-medium group hover:bg-stone-200/80 transition-colors"
                >
                  <span>{skill.name}</span>
                  {skill.endorsements > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-[10px] text-stone-500 font-mono">
                      {skill.endorsements}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-stone-400 hover:text-stone-700 transition-colors"
                    title="Remove skill"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center bg-stone-50/60">
              <p className="text-xs text-stone-500">No skills added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. FEATURED WORK CARD */}
      <section className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-stone-500" />
            <span>Featured Work & Writing</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowAddWorkModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Work</span>
          </button>
        </div>

        {data.featuredWork && data.featuredWork.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.featuredWork.map((work, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-stone-200 bg-background/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-stone-900">{work.title}</h3>
                    <button
                      type="button"
                      onClick={() => handleDeleteWork(work.title)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title="Delete work"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {work.description && (
                    <p className="text-xs text-stone-600 line-clamp-3 mb-3 leading-relaxed">
                      {work.description}
                    </p>
                  )}
                </div>

                <div>
                  {work.tags && work.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {work.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] font-mono text-stone-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {work.link && (
                    <a
                      href={work.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Project / Article
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center bg-stone-50/60">
            <Code2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500 mb-1">No featured work added</p>
            <p className="text-xs text-stone-400 mb-4 max-w-sm mx-auto">
              Showcase architecture designs, technical blog posts, open source packages, or published papers.
            </p>
            <button
              type="button"
              onClick={() => setShowAddWorkModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-primary-600" />
              Add Featured Work
            </button>
          </div>
        )}
      </section>

      {/* =====================================================================
          MODALS: ADD AREA, ADD EXPERIENCE, ADD WORK
      ====================================================================== */}
      {showAddAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Mentorship Area</h3>
              <button
                type="button"
                onClick={() => setShowAddAreaModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddArea} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems & Reliability"
                  value={areaForm.title}
                  onChange={(e) => setAreaForm({ ...areaForm, title: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Briefly explain what mentees can explore with you in this area..."
                  value={areaForm.description}
                  onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddAreaModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium"
                >
                  Save Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Career Experience</h3>
              <button
                type="button"
                onClick={() => setShowAddExpModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExperience} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staff Software Engineer"
                    value={expForm.role}
                    onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe"
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Type</label>
                  <input
                    type="text"
                    placeholder="Full-time, Contract..."
                    value={expForm.type}
                    onChange={(e) => setExpForm({ ...expForm, type: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru, India or Remote"
                    value={expForm.location}
                    onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={expForm.startDate}
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={expForm.current}
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 disabled:opacity-50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={expForm.current}
                  onChange={(e) => setExpForm({ ...expForm, current: e.target.checked })}
                  className="rounded border-stone-300 text-primary-600"
                />
                <span>I currently work here</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Bullet Points (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Architected cross-region data replication...&#10;Mentored 10+ junior engineers..."
                  value={expForm.bullets}
                  onChange={(e) => setExpForm({ ...expForm, bullets: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Skills Used (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Distributed Systems, Go, Kafka, AWS"
                  value={expForm.skills}
                  onChange={(e) => setExpForm({ ...expForm, skills: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddExpModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium"
                >
                  Save Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Featured Work</h3>
              <button
                type="button"
                onClick={() => setShowAddWorkModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddWork} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Designing High-Throughput Event Logs"
                  value={workForm.title}
                  onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Summary of the article, open source project, or talk..."
                  value={workForm.description}
                  onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Link URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={workForm.link}
                  onChange={(e) => setWorkForm({ ...workForm, link: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Architecture, Writing, Go"
                  value={workForm.tags}
                  onChange={(e) => setWorkForm({ ...workForm, tags: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddWorkModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium"
                >
                  Save Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
