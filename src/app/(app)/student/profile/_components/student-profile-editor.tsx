"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  GraduationCap,
  Briefcase,
  Code2,
  ExternalLink,
  GitBranch,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  User as UserIcon,
  BarChart3,
} from "lucide-react";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { StudentLinksCard } from "./student-links-card";
import {
  updateAvatarUrl,
  updateBannerUrl,
  updateStudentBio,
  updateStudentEducation,
  addStudentSkill,
  removeStudentSkill,
  addStudentProject,
  deleteStudentProject,
  addStudentExperience,
  deleteStudentExperience,
} from "@/app/actions/profile";

export interface StudentProfileData {
  name: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  major?: string;
  graduationYear?: number;
  cgpa?: number;
  totalPoints: number;
  skills: string[];
  projects: Array<{
    title: string;
    description?: string;
    liveLink?: string;
    githubLink?: string;
    techStack: string[];
  }>;
  experience: Array<{
    role: string;
    company: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  codingProfiles?: Array<{
    platform: string;
    username?: string;
    url?: string;
    synced?: boolean;
  }>;
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  otherLinks?: Array<{
    title: string;
    url: string;
  }>;
}

export interface StudentProfileUpcomingSession {
  id: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  mentorName: string;
  isCohort?: boolean;
  location?: string;
}

export function StudentProfileEditor({
  initialData,
}: {
  initialData: StudentProfileData;
  upcomingSessions?: StudentProfileUpcomingSession[];
}) {
  const [data, setData] = useState<StudentProfileData>(initialData);
  const [isPending, startTransition] = useTransition();

  // Modal / Inline Edit States
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(data.bio || "");

  const [editingEducation, setEditingEducation] = useState(false);
  const [eduMajor, setEduMajor] = useState(data.major || "");
  const [eduGradYear, setEduGradYear] = useState(data.graduationYear || new Date().getFullYear() + 2);
  const [eduCgpa, setEduCgpa] = useState<number | string>(data.cgpa !== undefined ? data.cgpa : "");

  const [newSkill, setNewSkill] = useState("");
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    liveLink: "",
    githubLink: "",
    techStack: "",
  });

  const [showAddExpModal, setShowAddExpModal] = useState(false);
  const [expForm, setExpForm] = useState({
    role: "",
    company: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  });

  // Banner & Avatar handlers
  const handleBannerUpload = async (url: string, publicId?: string) => {
    setData((prev) => ({ ...prev, bannerUrl: url }));
    await updateBannerUrl(url, publicId);
  };

  const handleAvatarUpload = async (url: string, publicId?: string) => {
    setData((prev) => ({ ...prev, avatarUrl: url }));
    await updateAvatarUrl(url, publicId);
  };

  // Bio handler
  const handleSaveBio = () => {
    startTransition(async () => {
      await updateStudentBio(bioInput);
      setData((prev) => ({ ...prev, bio: bioInput }));
      setEditingBio(false);
    });
  };

  // Education handler
  const handleSaveEducation = () => {
    startTransition(async () => {
      await updateStudentEducation({
        major: eduMajor,
        graduationYear: Number(eduGradYear),
        cgpa: Number(eduCgpa),
      });
      setData((prev) => ({
        ...prev,
        major: eduMajor,
        graduationYear: Number(eduGradYear),
        cgpa: Number(eduCgpa),
      }));
      setEditingEducation(false);
    });
  };

  // Skill handlers
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (!trimmed || data.skills.includes(trimmed)) return;

    startTransition(async () => {
      await addStudentSkill(trimmed);
      setData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
      setNewSkill("");
    });
  };

  const handleRemoveSkill = (skill: string) => {
    startTransition(async () => {
      await removeStudentSkill(skill);
      setData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
    });
  };

  // Project handlers
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim()) return;

    const stack = projectForm.techStack
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newProj = {
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      liveLink: projectForm.liveLink.trim(),
      githubLink: projectForm.githubLink.trim(),
      techStack: stack,
    };

    startTransition(async () => {
      await addStudentProject(newProj);
      setData((prev) => ({
        ...prev,
        projects: [newProj, ...prev.projects],
      }));
      setProjectForm({ title: "", description: "", liveLink: "", githubLink: "", techStack: "" });
      setShowAddProjectModal(false);
    });
  };

  const handleDeleteProject = (title: string) => {
    startTransition(async () => {
      await deleteStudentProject(title);
      setData((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.title !== title),
      }));
    });
  };

  // Experience handlers
  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.role.trim() || !expForm.company.trim()) return;

    const newExp = {
      role: expForm.role.trim(),
      company: expForm.company.trim(),
      startDate: expForm.startDate,
      endDate: expForm.current ? undefined : expForm.endDate,
      current: expForm.current,
      description: expForm.description.trim(),
    };

    startTransition(async () => {
      await addStudentExperience(newExp);
      setData((prev) => ({
        ...prev,
        experience: [newExp, ...prev.experience],
      }));
      setExpForm({
        role: "",
        company: "",
        startDate: "",
        endDate: "",
        current: false,
        description: "",
      });
      setShowAddExpModal(false);
    });
  };

  const handleDeleteExperience = (company: string, role: string) => {
    startTransition(async () => {
      await deleteStudentExperience(company, role);
      setData((prev) => ({
        ...prev,
        experience: prev.experience.filter((e) => !(e.company === company && e.role === role)),
      }));
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* =====================================================================
          HEADER HERO WITH BANNER & OVERLAPPING AVATAR (MATCHING IMAGE 0)
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-blue-100/80 overflow-hidden shadow-xs">
        {/* Banner with Cloudinary Upload */}
        <div className="relative">
          <ImageUpload
            variant="banner"
            currentUrl={data.bannerUrl}
            onUploadSuccess={handleBannerUpload}
            label="Profile Banner"
            className="rounded-none border-0 aspect-[16/9] sm:aspect-[3.6/1] max-h-60"
          />
        </div>

        {/* Profile Info Bar with Overlapping Avatar (Matching Image 0) */}
        <div className="px-6 pb-6 pt-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-2">
            <div className="flex items-end gap-5">
              {/* Circular Overlapping Avatar with Camera Icon "Add Photo" */}
              <div className="relative z-10 shrink-0">
                <ImageUpload
                  variant="avatar"
                  currentUrl={data.avatarUrl}
                  onUploadSuccess={handleAvatarUpload}
                  label={data.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white shadow-md bg-blue-50/80"
                />
              </div>

              <div className="pt-2 sm:pt-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                    {data.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Student
                  </span>
                </div>
                <p className="text-sm text-stone-500 mt-1 font-normal">
                  {data.major || "Software Developer"} • Class of {data.graduationYear || 2028}
                </p>
              </div>
            </div>

            {/* Right Side Stats (CGPA box matching Image 0) */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white border border-stone-200 flex items-center gap-4 shadow-2xs">
                <span className="text-xs font-semibold text-stone-500 tracking-wider">CGPA</span>
                <span className="w-px h-4 bg-stone-200" />
                <span className="text-sm font-bold text-stone-900">
                  {data.cgpa !== undefined && data.cgpa !== null ? Number(data.cgpa).toFixed(1) : "—"}
                </span>
              </div>
              {data.totalPoints > 0 && (
                <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-center flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{data.totalPoints} pts</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          MAIN MODULAR CARDS (2-COLUMN GRID MATCHING IMAGE 0 & IMAGE 1)
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================================================================
            LEFT COLUMN (7 COLS): ABOUT, WORK EXPERIENCE, FEATURED PROJECTS
        ==================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. ABOUT CARD (MATCHING IMAGE 0) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-600" />
                <span>About</span>
              </h2>
              {!editingBio && (
                <button
                  type="button"
                  onClick={() => setEditingBio(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingBio ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Share your academic background, passions, and what mentorship guidance you're seeking..."
                  className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBioInput(data.bio || "");
                      setEditingBio(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBio}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save Bio
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {data.bio || "Exploring Backend Development"}
              </p>
            )}
          </div>

          {/* 2. WORK EXPERIENCE CARD (MATCHING IMAGE 0) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Work Experience</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddExpModal(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Role</span>
              </button>
            </div>

            {data.experience && data.experience.length > 0 ? (
              <div className="space-y-4 divide-y divide-stone-100">
                {data.experience.map((exp, idx) => (
                  <div key={idx} className={`flex items-start justify-between gap-4 ${idx > 0 ? "pt-4" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">{exp.role}</h3>
                        <p className="text-xs text-stone-600 font-medium">{exp.company}</p>
                        <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {exp.startDate ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                          {" — "}
                          {exp.current
                            ? "Present"
                            : exp.endDate
                            ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                            : "Present"}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
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
                ))}
              </div>
            ) : (
              /* Empty State Exactly Matching Image 0 */
              <div className="border border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/40">
                <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-center mx-auto mb-3 text-stone-400 shadow-2xs">
                  <Briefcase className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-stone-800 mb-1">No experience added</h4>
                <p className="text-xs text-stone-500 mb-4 max-w-sm mx-auto leading-relaxed">
                  Add your past internships, research assistantships, campus leadership, or part-time roles.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddExpModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors border border-blue-100 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Experience
                </button>
              </div>
            )}
          </div>

          {/* 3. FEATURED PROJECTS CARD (RESTRUCTURED IN BLUE THEME) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span>Featured Projects</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddProjectModal(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </button>
            </div>

            {data.projects && data.projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-stone-200 bg-[#F8FAFF]/60 flex flex-col justify-between hover:border-blue-200 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-stone-900">{proj.title}</h3>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj.title)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-stone-600 line-clamp-3 mb-3 leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                    </div>

                    <div>
                      {/* Tech stack badges */}
                      {proj.techStack && proj.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {proj.techStack.map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded-md bg-stone-100 text-[11px] font-mono text-stone-700 border border-stone-200/80"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* External links */}
                      <div className="flex items-center gap-3 pt-2 border-t border-stone-200/60">
                        {proj.liveLink && (
                          <a
                            href={proj.liveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Live Demo
                          </a>
                        )}
                        {proj.githubLink && (
                          <a
                            href={proj.githubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            Repository
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/40">
                <Code2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-700 mb-1">No projects added</p>
                <p className="text-xs text-stone-400 mb-4 max-w-sm mx-auto">
                  Showcase capstone projects, open-source work, or side builds to demonstrate your practical engineering skills.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors border border-blue-100 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN (5 COLS): EDUCATION, SKILLS, AND NEW LINKS CARD (BELOW SKILLS)
        ==================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* 4. EDUCATION CARD (MATCHING IMAGE 0) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Education</span>
              </h2>
              {!editingEducation && (
                <button
                  type="button"
                  onClick={() => setEditingEducation(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingEducation ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-stone-500 uppercase mb-1">
                    Major / Degree
                  </label>
                  <input
                    type="text"
                    value={eduMajor}
                    onChange={(e) => setEduMajor(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 uppercase mb-1">
                      Grad Year
                    </label>
                    <input
                      type="number"
                      value={eduGradYear}
                      onChange={(e) => setEduGradYear(Number(e.target.value))}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 uppercase mb-1">
                      CGPA (10 pt)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={eduCgpa}
                      onChange={(e) => setEduCgpa(Number(e.target.value))}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingEducation(false)}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEducation}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{data.major || "Software Developer"}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">University Affiliated Institute</p>
                </div>
                <div className="flex items-center gap-4 text-xs pt-3 border-t border-stone-100 text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Class of {data.graduationYear || 2028}</span>
                  </div>
                  <div className="h-3.5 w-px bg-stone-200" />
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-stone-400" />
                    <span>CGPA: {data.cgpa !== undefined && data.cgpa !== null ? Number(data.cgpa).toFixed(1) : "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. SKILLS CARD (MATCHING IMAGE 0) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Skills</span>
              </span>
              <span className="text-xs font-normal text-stone-400">
                {data.skills?.length || 0} added
              </span>
            </h2>

            {/* Quick Add Form Matching Image 0 */}
            <form onSubmit={handleAddSkill} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add skill (e.g. Next.js, Go, Docker)"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={!newSkill.trim() || isPending}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-600 rounded-xl text-xs font-semibold transition-colors border border-blue-100 shadow-2xs"
              >
                Add
              </button>
            </form>

            {data.skills && data.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-800 text-xs font-medium group hover:bg-stone-200/80 transition-colors"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-stone-400 hover:text-stone-700 transition-colors"
                      title="Remove skill"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-stone-200 rounded-xl p-6 text-center bg-stone-50/60">
                <p className="text-xs text-stone-500 mb-1">No skills added</p>
                <p className="text-[11px] text-stone-400">
                  Type a skill above to highlight your core engineering competencies.
                </p>
              </div>
            )}
          </div>

          {/* 6. CODING PROFILES, SOCIAL LINKS & OTHER LINKS (ONE BOX BELOW SKILLS MATCHING IMAGE 1) */}
          <StudentLinksCard
            initialCodingProfiles={data.codingProfiles}
            initialSocialLinks={data.socialLinks}
            initialOtherLinks={data.otherLinks}
          />
        </div>
      </div>

      {/* =====================================================================
          ADD PROJECT MODAL
      ====================================================================== */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Featured Project</h3>
              <button
                type="button"
                onClick={() => setShowAddProjectModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Queue"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what the project accomplishes and key architecture decisions..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Live Demo Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={projectForm.liveLink}
                    onChange={(e) => setProjectForm({ ...projectForm, liveLink: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={projectForm.githubLink}
                    onChange={(e) => setProjectForm({ ...projectForm, githubLink: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Tech Stack (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="TypeScript, Next.js, Redis, Docker"
                  value={projectForm.techStack}
                  onChange={(e) => setProjectForm({ ...projectForm, techStack: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADD WORK EXPERIENCE MODAL
      ====================================================================== */}
      {showAddExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Work Experience</h3>
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
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Role / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Intern"
                    value={expForm.role}
                    onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Company / Org *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={expForm.startDate}
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    disabled={expForm.current}
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={expForm.current}
                  onChange={(e) => setExpForm({ ...expForm, current: e.target.checked })}
                  className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                />
                <span>I currently work here</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description / Responsibilities
                </label>
                <textarea
                  rows={3}
                  placeholder="Key accomplishments, tools used, metrics improved..."
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddExpModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
