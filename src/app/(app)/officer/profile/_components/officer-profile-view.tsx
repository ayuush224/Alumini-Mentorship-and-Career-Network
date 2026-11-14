"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Clock,
  KeyRound,
  Edit3,
  Award,
  Zap,
  X,
  Compass,
  Briefcase,
  MapPin,
  Users,
  Upload,
  ImageIcon,
} from "lucide-react";
import {
  updateOfficerPassword,
  updateOfficerAvatar,
  updateOfficerBanner,
  updateOfficerProfileDetails,
  updateInstitutionDetails,
} from "@/actions/officer";

export interface OfficerProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  institutionId: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  stats?: {
    degreesVerified: number;
    nudgesIssued: number;
    pairingsOverseen: number;
  };
}

export interface InstitutionProfileData {
  code: string;
  name: string;
  domain: string;
  status: string;
  officeLocation?: string;
  officeHours?: string;
}

export interface OfficerActionLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  details: Record<string, unknown>;
}

interface OfficerProfileViewProps {
  officer: OfficerProfileData;
  institution: InstitutionProfileData;
  recentActions: OfficerActionLog[];
}

// ----------------------------------------------------------------------------
// Timestamp Formatter for My Administrative Action History
// ----------------------------------------------------------------------------
function formatAuditTimestamp(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = "";
    if (diffMins < 1) {
      relative = "Just now";
    } else if (diffMins < 60) {
      relative = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      relative = `${diffHours}h ago`;
    } else if (diffDays === 1) {
      relative = "Yesterday";
    } else if (diffDays < 7) {
      relative = `${diffDays}d ago`;
    } else {
      relative = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    return {
      relative,
      timeStr,
      full: `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${timeStr}`,
    };
  } catch {
    return { relative: dateStr, timeStr: "", full: dateStr };
  }
}

export function OfficerProfileView({
  officer: initialOfficer,
  institution: initialInstitution,
  recentActions,
}: OfficerProfileViewProps) {
  const [officer, setOfficer] = useState<OfficerProfileData>(initialOfficer);
  const [institution, setInstitution] = useState<InstitutionProfileData>(initialInstitution);

  // Hidden native file input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);

  // Password Modal form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Name Modal form state
  const [nameInput, setNameInput] = useState(officer.name);
  const [nameLoading, setNameLoading] = useState(false);
  const [designationInput, setDesignationInput] = useState(
    officer.designation || "Director of Alumni Relations & Mentorship Governance"
  );

  // Upload loading states
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);

  // Institution Modal form state
  const [instName, setInstName] = useState(institution.name);
  const [instLocation, setInstLocation] = useState(
    institution.officeLocation || "Administration Hall, Suite 402"
  );
  const [instHours, setInstHours] = useState(
    institution.officeHours || "Mon–Fri, 9:00 AM – 5:00 PM"
  );
  const [instLoading, setInstLoading] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const initials = officer.name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "OF";

  // --------------------------------------------------------------------------
  // Laptop Avatar Upload Handler (FileReader + Client-Side Canvas Optimization)
  // --------------------------------------------------------------------------
  const handleLaptopFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "Please select an image file (PNG, JPG, WebP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Image file is too large. Please select a file under 5MB." });
      return;
    }

    setAvatarLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 400;
          const width = img.width;
          const height = img.height;
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = MAX_DIM;
          canvas.height = MAX_DIM;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Could not process image on canvas.");
          }

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, MAX_DIM, MAX_DIM);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.88);

          const res = await updateOfficerAvatar(optimizedDataUrl);
          if (res.success) {
            setOfficer((prev) => ({ ...prev, avatarUrl: optimizedDataUrl }));
            setFeedback({ type: "success", text: "Profile picture uploaded from your laptop successfully." });
          } else {
            setFeedback({ type: "error", text: res.error || "Failed to update profile picture." });
          }
        } catch (err) {
          console.error("Laptop image processing error:", err);
          setFeedback({ type: "error", text: "Failed to process photo from laptop." });
        } finally {
          setAvatarLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      img.onerror = () => {
        setFeedback({ type: "error", text: "Failed to load image from laptop." });
        setAvatarLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setFeedback({ type: "error", text: "Failed to read file from laptop." });
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------------------------
  // Laptop Banner Upload Handler (FileReader + Client-Side Canvas Optimization)
  // --------------------------------------------------------------------------
  const handleLaptopBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "Please select an image file (PNG, JPG, WebP)." });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Banner image is too large. Please select a file under 8MB." });
      return;
    }

    setBannerLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const TARGET_WIDTH = 1200;
          const TARGET_HEIGHT = 380;

          canvas.width = TARGET_WIDTH;
          canvas.height = TARGET_HEIGHT;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Could not process banner on canvas.");
          }

          // Calculate aspect ratio crop
          const imgAspect = img.width / img.height;
          const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
          let drawWidth = img.width;
          let drawHeight = img.height;
          let startX = 0;
          let startY = 0;

          if (imgAspect > targetAspect) {
            drawWidth = img.height * targetAspect;
            startX = (img.width - drawWidth) / 2;
          } else {
            drawHeight = img.width / targetAspect;
            startY = (img.height - drawHeight) / 2;
          }

          ctx.drawImage(img, startX, startY, drawWidth, drawHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.88);

          const res = await updateOfficerBanner(optimizedDataUrl);
          if (res.success) {
            setOfficer((prev) => ({ ...prev, bannerUrl: optimizedDataUrl }));
            setFeedback({ type: "success", text: "Profile banner updated from your laptop successfully." });
          } else {
            setFeedback({ type: "error", text: res.error || "Failed to update banner." });
          }
        } catch (err) {
          console.error("Banner processing error:", err);
          setFeedback({ type: "error", text: "Failed to process banner from laptop." });
        } finally {
          setBannerLoading(false);
          if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
        }
      };
      img.onerror = () => {
        setFeedback({ type: "error", text: "Failed to load banner from laptop." });
        setBannerLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setFeedback({ type: "error", text: "Failed to read banner file from laptop." });
      setBannerLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------------------------
  // Handle Officer Name Update
  // --------------------------------------------------------------------------
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFeedback({ type: "error", text: "Officer name cannot be empty." });
      return;
    }

    setNameLoading(true);
    try {
      const res = await updateOfficerProfileDetails(nameInput.trim(), designationInput.trim());
      if (res.success) {
        setOfficer((prev) => ({
          ...prev,
          name: nameInput.trim(),
          designation: designationInput.trim() || "Director of Alumni Relations & Mentorship Governance",
        }));
        setIsNameModalOpen(false);
        setFeedback({ type: "success", text: "Officer profile details updated successfully." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update name." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setNameLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handle Password Update (Opened strictly on demand from Security card)
  // --------------------------------------------------------------------------
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFeedback({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await updateOfficerPassword(newPassword);
      if (res.success) {
        setFeedback({ type: "success", text: "Your administrative password has been updated." });
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update password." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setPasswordLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handle Institution Details Update
  // --------------------------------------------------------------------------
  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim()) {
      setFeedback({ type: "error", text: "Institution name cannot be empty." });
      return;
    }

    setInstLoading(true);
    try {
      const res = await updateInstitutionDetails({
        name: instName.trim(),
        officeLocation: instLocation.trim(),
        officeHours: instHours.trim(),
      });
      if (res.success) {
        setInstitution((prev) => ({
          ...prev,
          name: instName.trim(),
          officeLocation: instLocation.trim(),
          officeHours: instHours.trim(),
        }));
        setIsInstitutionModalOpen(false);
        setFeedback({ type: "success", text: "Institution details updated successfully." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update institution." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setInstLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hidden Native File Inputs for Laptop Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={handleLaptopFileUpload}
      />
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={handleLaptopBannerUpload}
      />

      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-semibold underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          href="/officer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Command Center</span>
        </Link>
      </div>

      {/* =====================================================================
          CARD 1: EXECUTIVE HERO BANNER WITH OVERLAPPING AVATAR & IDENTITY
          (Light white banner by default + change banner icon button; 
           Name layout properly visible with no cuts/overlaps; right upload button removed)
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs">
        {/* Banner Top Strip: Light White by Default */}
        <div className="h-36 sm:h-48 bg-stone-100/90 border-b border-stone-200/80 relative overflow-hidden">
          {officer.bannerUrl ? (
            <Image
              src={officer.bannerUrl}
              alt="Officer Profile Banner"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-stone-50 via-white to-stone-100 flex items-center justify-between px-8">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#2563EB]/5 rounded-full blur-2xl pointer-events-none" />
            </div>
          )}

          {/* Top Right: Role Pill & Small Change Banner Icon Button */}
          <div className="absolute top-4 right-4 sm:right-6 flex items-center gap-2.5 z-10">
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-white/90 text-stone-700 border border-stone-200 uppercase shadow-2xs backdrop-blur-xs">
              Alumni Relations Officer
            </span>

            {/* Small icon button to change banner */}
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              disabled={bannerLoading}
              title="Upload banner from laptop"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/95 hover:bg-white text-stone-700 text-xs font-semibold shadow-xs border border-stone-200/90 transition-all hover:scale-105 flex items-center gap-1.5 backdrop-blur-xs"
            >
              {bannerLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
              )}
              <span className="hidden sm:inline">Change Banner</span>
            </button>
          </div>
        </div>

        {/* Profile Card Body: Name UI Layout is cleanly visible and spacious */}
        <div className="px-6 sm:px-8 pb-7 pt-3 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Overlapping Laptop Photo Upload */}
              <div className="relative group shrink-0 -mt-16 sm:-mt-20">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-stone-100 flex items-center justify-center relative cursor-pointer hover:ring-2 hover:ring-[#2563EB]/30 transition-all"
                title="Click to change profile photo from laptop"
              >
                {officer.avatarUrl ? (
                  <Image
                    src={officer.avatarUrl}
                    alt={officer.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold font-serif text-stone-700">
                    {initials}
                  </span>
                )}

                {avatarLoading && (
                  <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Laptop File Trigger Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                title="Upload photo from laptop"
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white shadow-md transition-all hover:scale-105 border-2 border-white"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Officer Identity & Name Container: Completely visible on white card with proper hierarchy */}
              <div className="pt-2 sm:pt-4 flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-stone-900 leading-tight">
                  {officer.name}
                </h1>

                {/* Edit Name Button */}
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(officer.name);
                    setIsNameModalOpen(true);
                  }}
                  className="hidden"
                  title="Edit officer name"
                >
                  <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Edit Name</span>
                </button>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Authority</span>
                </span>
              </div>

              <p className="text-sm text-stone-600 font-medium">
                {officer.designation || "Director of Alumni Relations & Mentorship Governance"}
              </p>
              <p className="text-xs text-stone-500">
                {officer.email} &bull; {institution.name}
              </p>
            </div>
          </div>

          {/* Single Edit Button on Right Bottom Corner */}
          <div className="self-end shrink-0 pb-1 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                setNameInput(officer.name);
                setDesignationInput(officer.designation || "Director of Alumni Relations & Mentorship Governance");
                setIsNameModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold border border-stone-200/70 transition-all shadow-2xs hover:scale-105"
              title="Edit name and designation"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-500" />
              <span>Edit Details</span>
            </button>
          </div>
          <div className="hidden">
            <div>
              <p></p></div></div></div><div className="hidden"><div><p>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CARD 2: LIFETIME GOVERNANCE IMPACT
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-[#2563EB]" />
          </span>
          <div>
            <h2 className="font-semibold text-stone-900 text-base">Lifetime Governance Impact</h2>
            <p className="text-xs text-stone-500">
              Verified administrative metrics overseen under this institution
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
              <span>Degrees Verified</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-stone-900">
              {officer.stats?.degreesVerified ?? 0}
            </p>
            <p className="text-[11px] text-stone-500">Alumni credential reviews approved</p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
              <span>Engagement Nudges</span>
              <Zap className="w-4 h-4 text-[#2563EB]" />
            </div>
            <p className="text-2xl font-bold text-stone-900">
              {officer.stats?.nudgesIssued ?? 0}
            </p>
            <p className="text-[11px] text-stone-500">Stalled relationships reignited</p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
              <span>Pairings Overseen</span>
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-stone-900">
              {officer.stats?.pairingsOverseen ?? 0}
            </p>
            <p className="text-[11px] text-stone-500">Active student-mentor mentorships</p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CARD 3: INSTITUTIONAL AFFILIATION & CAMPUS OFFICE (EDITABLE)
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#2563EB]" />
            </span>
            <div>
              <h2 className="font-semibold text-stone-900 text-base">Institutional Tenancy &amp; Office</h2>
              <p className="text-xs text-stone-500">Multi-tenant university configuration and campus office details</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInstName(institution.name);
              setInstLocation(institution.officeLocation || "Administration Hall, Suite 402");
              setInstHours(institution.officeHours || "Mon–Fri, 9:00 AM – 5:00 PM");
              setIsInstitutionModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            <span>Edit Details</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block">
              University Name
            </span>
            <span className="font-bold text-stone-900 text-sm sm:text-base">{institution.name}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200/60">
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block">
                Tenant Code
              </span>
              <span className="font-mono font-semibold text-stone-800">{institution.code}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block">
                Domain
              </span>
              <span className="text-stone-700">{institution.domain}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200/60">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block">
                  Campus Office Location
                </span>
                <span className="text-stone-800 font-medium">{institution.officeLocation}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block">
                  Official Office Hours
                </span>
                <span className="text-stone-800 font-medium">{institution.officeHours}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-stone-500 leading-relaxed">
          All alumni mentor verifications, relationship monitoring, and capacity watchdog limits operate strictly inside this tenant boundary.
        </p>
      </section>

      {/* =====================================================================
          CARD 4: ADMINISTRATIVE AUTHORITY SCOPE & PRIVILEGES
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </span>
          <div>
            <h2 className="font-semibold text-stone-900 text-base">Administrative Authority Scope</h2>
            <p className="text-xs text-stone-500">Verified governance capabilities under institutional charter</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[
            {
              title: "Degree & Credential Verification Authority",
              desc: "Review transcripts, degree certificates, and admit verified alumni to the mentor directory.",
              icon: ShieldCheck,
              color: "text-emerald-700 bg-emerald-50 border-emerald-200",
            },
            {
              title: "Relationship Momentum & Nudge Intervention",
              desc: "Monitor pairing frequency and dispatch automated email/in-app check-in notifications.",
              icon: Zap,
              color: "text-amber-700 bg-amber-50 border-amber-200",
            },
            {
              title: "Mentor Capacity & Intake Override",
              desc: "Enforce declared mentee limits and toggle request intake to prevent mentor burnout.",
              icon: Briefcase,
              color: "text-blue-700 bg-blue-50 border-blue-200",
            },
            {
              title: "Accredited Audit & Compliance Export",
              desc: "Generate privacy-preserving compliance CSV reports with personal contact details shielded.",
              icon: Compass,
              color: "text-purple-700 bg-purple-50 border-purple-200",
            },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="p-4 rounded-2xl border border-stone-100 bg-stone-50/50 flex items-start gap-3.5"
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${p.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-900">{p.title}</p>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          CARD 5: SECURITY & CREDENTIALS (PASSWORD CHANGED STRICTLY ON-DEMAND HERE)
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-[#2563EB]" />
            </span>
            <div>
              <h2 className="font-semibold text-stone-900 text-base">Security &amp; Credentials</h2>
              <p className="text-xs text-stone-500">
                Administrative authentication credential and two-factor enforcement
              </p>
            </div>
          </div>

          {/* Change Password Button (Dedicated location) */}
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Change Password</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-stone-800 block">Administrative Password</span>
              <span className="text-[11px] text-stone-500">Secured via bcrypt cryptographic hash</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              Active
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-stone-800 block">Two-Factor Authentication</span>
              <span className="text-[11px] text-stone-500">Graceful enrollment enabled for officers</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                officer.twoFactorEnabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {officer.twoFactorEnabled ? "Enrolled" : "Conditional"}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CARD 6: AUDIT HISTORY BY THIS OFFICER (IMPROVED TIMESTAMP UI)
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-900 text-base">
              My Administrative Action History
            </h2>
            <p className="text-xs text-stone-500">
              Immutable audit trail recorded under this officer account
            </p>
          </div>
          <Link
            href="/officer/reports"
            className="text-xs font-semibold text-[#2563EB] hover:underline"
          >
            Full Program Audit Trail &rarr;
          </Link>
        </div>

        {recentActions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
            <Clock className="w-6 h-6 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-600">No recent actions logged yet.</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Your approvals, rejections, nudges, and capacity adjustments will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentActions.map((log) => {
              const auditTime = formatAuditTimestamp(log.timestamp);
              return (
                <div
                  key={log.id}
                  className="py-3.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50/60 rounded-2xl transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-semibold text-stone-900 bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {log.action}
                      </span>
                      <span className="text-stone-500 font-medium text-[11px]">
                        on {log.resource}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-[11px] text-stone-500 font-mono truncate max-w-lg">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>

                  {/* Improved Timestamp UI Pill */}
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100/80 border border-stone-200/70 text-stone-600 text-xs font-medium shrink-0 shadow-2xs self-start sm:self-auto"
                    title={auditTime.full}
                  >
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="font-semibold text-stone-800">{auditTime.relative}</span>
                    <span className="text-stone-300">&bull;</span>
                    <span className="text-stone-500 text-[11px] font-mono">{auditTime.timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          MODAL 1: CHANGE PASSWORD (Opened strictly on demand)
      ====================================================================== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-[#2563EB]" />
                </span>
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">Update Password</h3>
                  <p className="text-xs text-stone-500">Ensure at least 8 characters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {passwordLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EDIT OFFICER NAME
      ====================================================================== */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-[#2563EB]" />
                </span>
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">Edit Profile Details</h3>
                  <p className="text-xs text-stone-500">Update your official administrative name and designation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNameModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Dr. Eleanor Vance"
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Designation / Official Title
                </label>
                <input
                  type="text"
                  value={designationInput}
                  onChange={(e) => setDesignationInput(e.target.value)}
                  placeholder="e.g. Director of Alumni Relations & Mentorship Governance"
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>
              <div className="hidden">
                <input
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={nameLoading || !nameInput.trim()}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {nameLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: EDIT INSTITUTION DETAILS (Name, Office, Hours)
      ====================================================================== */}
      {isInstitutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#2563EB]" />
                </span>
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">Edit Institution Details</h3>
                  <p className="text-xs text-stone-500">Update university name and office contact info</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstitutionModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInstitution} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  University / Institution Name
                </label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. Apex Institute of Technology"
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Campus Office Location
                </label>
                <input
                  type="text"
                  value={instLocation}
                  onChange={(e) => setInstLocation(e.target.value)}
                  placeholder="e.g. Administration Hall, Suite 402"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Official Office Hours
                </label>
                <input
                  type="text"
                  value={instHours}
                  onChange={(e) => setInstHours(e.target.value)}
                  placeholder="e.g. Mon–Fri, 9:00 AM – 5:00 PM"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInstitutionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={instLoading || !instName.trim()}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {instLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
