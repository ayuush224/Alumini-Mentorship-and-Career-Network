"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  FileText,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  LogOut,
  Mail,
  Building2,
} from "lucide-react";

interface DocumentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  documentType?: string;
  sizeBytes?: number;
}

interface MentorVerificationPendingProps {
  user: {
    id: string;
    name: string;
    email: string;
    verificationStatus?: string;
    isVerified?: boolean;
  };
  verification?: {
    institutionalIdentifier?: string;
    graduationYear?: number;
    degree?: string;
    submittedAt?: string;
    rejectionReason?: string;
    status?: string;
    documents?: DocumentItem[];
  } | null;
}

export function MentorVerificationPending({
  user,
  verification,
}: MentorVerificationPendingProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isRejected =
    user.verificationStatus === "rejected" || verification?.status === "rejected";

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Document attached";
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const documents = verification?.documents || [];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 sm:px-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-stone-200/90 shadow-[0_12px_40px_rgb(0,0,0,0.06)] overflow-hidden transition-all">
        {/* Top Status Header */}
        <div
          className={`p-6 sm:p-8 border-b ${
            isRejected
              ? "bg-rose-50/70 border-rose-100"
              : "bg-amber-50/70 border-amber-100/80"
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                isRejected
                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                  : "bg-amber-100 text-amber-900 border border-amber-200/90"
              }`}
            >
              {isRejected ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>ACTION REQUIRED • VERIFICATION REJECTED</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  <span>UNDER REVIEW • VERIFICATION PENDING</span>
                </>
              )}
            </span>

            <div className="flex items-center gap-1.5 text-stone-400 text-xs">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-medium text-stone-600">Lovely Professional University</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 tracking-tight">
            {isRejected
              ? "Verification Request Disapproved"
              : "Your Mentorship Request is Pending Review"}
          </h1>

          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            {isRejected ? (
              <span>
                The Alumni Relations Office was unable to verify your credentials. Reason:{" "}
                <strong className="text-rose-700">
                  {verification?.rejectionReason || "Credential mismatch with university records."}
                </strong>
              </span>
            ) : (
              <span>
                Your alumni credentials and uploaded institutional ID documents have been submitted to the{" "}
                <strong>Lovely Professional University Alumni Relations Office</strong>. Our officer is
                currently verifying your document.
              </span>
            )}
          </p>
        </div>

        {/* Notice Strip */}
        {!isRejected && (
          <div className="px-6 sm:px-8 py-3.5 bg-blue-50/60 border-b border-blue-100/70 flex items-start gap-3 text-xs text-blue-900">
            <Mail className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span>
                You will receive an email confirmation at{" "}
                <strong className="font-semibold text-[#1D4ED8]">{user.email}</strong> once your
                verification has been processed. Until the officer verifies your document, mentor
                workspace features remain locked.
              </span>
            </div>
          </div>
        )}

        {/* Verification Summary Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Submitted Verification Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <span className="text-[10px] uppercase font-semibold text-stone-400 block mb-0.5">
                  Alumnus Name
                </span>
                <span className="text-sm font-bold text-stone-800">{user.name}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <span className="text-[10px] uppercase font-semibold text-stone-400 block mb-0.5">
                  Institutional / Student ID
                </span>
                <span className="text-sm font-mono font-bold text-stone-800">
                  {verification?.institutionalIdentifier || "LPU-PENDING"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <span className="text-[10px] uppercase font-semibold text-stone-400 block mb-0.5">
                  Graduation Year
                </span>
                <span className="text-sm font-bold text-stone-800">
                  {verification?.graduationYear || new Date().getFullYear()}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <span className="text-[10px] uppercase font-semibold text-stone-400 block mb-0.5">
                  Submission Date
                </span>
                <span className="text-sm font-bold text-stone-800">
                  {verification?.submittedAt
                    ? new Date(verification.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                </span>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Attached Documents ({documents.length})
              </h2>
              <span className="text-[11px] text-stone-400">Under review by officer</span>
            </div>

            {documents.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 text-center">
                <p className="text-xs text-stone-500">
                  Institutional ID proof document attached with your application.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-3.5 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {doc.fileName || `Document_${idx + 1}`}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {doc.documentType === "institutional_id_proof"
                            ? "Institutional ID Proof"
                            : "Additional Supporting Document"}{" "}
                          • {formatFileSize(doc.sizeBytes)}
                        </p>
                      </div>
                    </div>

                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Roadmap Tracker */}
          <div className="pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Verification Progress
            </h2>
            <div className="relative border-l-2 border-stone-200 pl-4 space-y-4 ml-2">
              <div className="relative">
                <span className="absolute -left-[23px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <p className="text-xs font-bold text-stone-800">
                  Profile Registered &amp; ID Proof Uploaded
                </p>
                <p className="text-[11px] text-stone-500">
                  Your credentials and documentation were dispatched to the verification queue.
                </p>
              </div>

              <div className="relative">
                <span
                  className={`absolute -left-[23px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isRejected
                      ? "bg-rose-500 text-white"
                      : "bg-amber-400 text-amber-950 animate-ping"
                  }`}
                />
                <span
                  className={`absolute -left-[23px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isRejected ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  }`}
                >
                  {isRejected ? "✕" : "⏳"}
                </span>
                <p className="text-xs font-bold text-stone-800">
                  Alumni Relations Officer Document Review
                </p>
                <p className="text-[11px] text-stone-500">
                  {isRejected
                    ? "Review concluded with disapproval."
                    : "The officer is reviewing your institutional ID proof and university records."}
                </p>
              </div>

              <div className="relative opacity-60">
                <span className="absolute -left-[23px] top-0.5 w-4 h-4 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center text-[10px]">
                  3
                </span>
                <p className="text-xs font-bold text-stone-800">
                  Email Dispatch &amp; Mentor Workspace Unlocked
                </p>
                <p className="text-[11px] text-stone-500">
                  Once verified, an email notification will be dispatched and you can enter the
                  mentor workspace.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking Status..." : "Check Verification Status"}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400" />
              <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
