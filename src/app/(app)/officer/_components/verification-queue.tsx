"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { decideVerification } from "@/app/actions/officer";
import { DocumentModal, VerificationDocumentItem } from "./document-modal";

export interface VerificationRequestItem {
  id: string;
  alumnusId: string;
  alumnusName: string;
  institutionalIdentifier: string;
  degree: string;
  graduationYear: number;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
  decidedAt?: string;
  rejectionReason?: string;
  documents: VerificationDocumentItem[];
}

interface VerificationQueueProps {
  initialRequests: VerificationRequestItem[];
}

const REJECTION_REASONS = [
  "Degree or enrollment record not found in institutional database",
  "Submitted certificate/transcript document is illegible or corrupted",
  "Graduation year or major does not match official records",
  "Institutional identifier does not match government or student records",
  "Candidate did not complete graduation requirements",
  "Other administrative discrepancy",
];

export function VerificationQueue({ initialRequests }: VerificationQueueProps) {
  const [requests, setRequests] = useState<VerificationRequestItem[]>(initialRequests);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [selectedDocReq, setSelectedDocReq] = useState<VerificationRequestItem | null>(null);

  // Reject Modal State
  const [rejectModalReq, setRejectModalReq] = useState<VerificationRequestItem | null>(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  // Loading & Feedback
  const [actingId, setActingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const handleApprove = async (request: VerificationRequestItem) => {
    setActingId(request.id);
    setFeedback(null);

    try {
      const res = await decideVerification(request.id, "verified");
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === request.id ? { ...r, status: "verified", decidedAt: new Date().toISOString() } : r
          )
        );
        setFeedback({
          type: "success",
          text: `Alumnus ${request.alumnusName} has been verified and granted mentor directory status.`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to approve verification." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setActingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    const finalReason = selectedReason === "Other administrative discrepancy" && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    setActingId(rejectModalReq.id);
    setFeedback(null);

    try {
      const res = await decideVerification(rejectModalReq.id, "rejected", finalReason);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === rejectModalReq.id
              ? {
                  ...r,
                  status: "rejected",
                  decidedAt: new Date().toISOString(),
                  rejectionReason: finalReason,
                }
              : r
          )
        );
        setFeedback({
          type: "success",
          text: `Verification request for ${rejectModalReq.alumnusName} rejected with recorded reason.`,
        });
        setRejectModalReq(null);
        setCustomReason("");
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to reject verification." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
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

      {/* Filter Tabs & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-stone-200/80 rounded-xl shadow-2xs w-fit">
          {(["pending", "verified", "rejected", "all"] as const).map((tab) => {
            const count = tab === "all" ? requests.length : requests.filter((r) => r.status === tab).length;
            const isActive = filter === tab;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-stone-500">
          Showing <span className="font-semibold text-stone-800">{filteredRequests.length}</span> request
          {filteredRequests.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Requests Grid / List */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white border border-stone-200/80 rounded-2xl shadow-xs">
          <ShieldCheck className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h4 className="font-semibold text-stone-800 text-sm">No verification requests found</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {filter === "pending"
              ? "All alumni verification submissions have been reviewed! New requests will appear here automatically."
              : `There are currently no verification records matching the '${filter}' filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isActing = actingId === req.id;
            const initials = req.alumnusName
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={req.id}
                className="p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Alumnus Info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 border border-stone-200/60 font-semibold text-sm flex items-center justify-center shrink-0">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-stone-900 text-sm truncate">
                        {req.alumnusName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-100 text-stone-600 border border-stone-200/60">
                        {req.institutionalIdentifier}
                      </span>
                      {req.status === "verified" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {req.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs text-stone-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
                        <span>{req.degree}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>Class of {req.graduationYear}</span>
                      </span>
                      <span>
                        Submitted {new Date(req.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {req.rejectionReason && (
                      <p className="mt-1.5 text-xs text-rose-600 bg-rose-50/60 px-2 py-1 rounded border border-rose-100">
                        <strong>Reason:</strong> {req.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {/* View Documents Button */}
                  <button
                    onClick={() => setSelectedDocReq(req)}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-500" />
                    <span>Evidence ({req.documents.length})</span>
                  </button>

                  {/* Decision Controls (Pending Only) */}
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isActing}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectModalReq(req);
                          setSelectedReason(REJECTION_REASONS[0]);
                          setCustomReason("");
                        }}
                        disabled={isActing}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Evidence Viewer Modal */}
      {selectedDocReq && (
        <DocumentModal
          isOpen={Boolean(selectedDocReq)}
          onClose={() => setSelectedDocReq(null)}
          alumnusName={selectedDocReq.alumnusName}
          institutionalIdentifier={selectedDocReq.institutionalIdentifier}
          degree={selectedDocReq.degree}
          graduationYear={selectedDocReq.graduationYear}
          documents={selectedDocReq.documents}
        />
      )}

      {/* Reject Reason Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-semibold text-stone-900 text-sm">
                  Reject Verification Request
                </h3>
                <p className="text-xs text-stone-500">
                  {rejectModalReq.alumnusName} ({rejectModalReq.institutionalIdentifier})
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              Please specify the institutional rejection reason. This rationale will be logged in the audit trail and communicated to the candidate.
            </p>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Primary Reason
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-600/15 focus:border-stone-400"
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === "Other administrative discrepancy" && (
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Detailed Explanation
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Detail the specific record discrepancy..."
                  rows={3}
                  required
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-600/15 focus:border-stone-400"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actingId === rejectModalReq.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {actingId === rejectModalReq.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
