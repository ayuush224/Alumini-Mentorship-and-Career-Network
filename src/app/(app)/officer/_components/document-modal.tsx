"use client";

import React from "react";
import { FileText, ExternalLink, X, ShieldCheck, Image as ImageIcon } from "lucide-react";

export interface VerificationDocumentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  contentType: string;
  documentType?: string;
  sizeBytes: number;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumnusName: string;
  institutionalIdentifier: string;
  degree: string;
  graduationYear: number;
  documents: VerificationDocumentItem[];
}

export function DocumentModal({
  isOpen,
  onClose,
  alumnusName,
  institutionalIdentifier,
  degree,
  graduationYear,
  documents,
}: DocumentModalProps) {
  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const isImageDoc = (doc: VerificationDocumentItem) => {
    if (doc.contentType && doc.contentType.startsWith("image/")) return true;
    if (doc.fileName && /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName)) return true;
    if (doc.fileUrl && doc.fileUrl.startsWith("data:image/")) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-600" />
            </span>
            <div>
              <h3 className="font-semibold text-stone-900 text-sm">
                Alumni Verification Evidence
              </h3>
              <p className="text-xs text-stone-500">
                {alumnusName} • ID: {institutionalIdentifier}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Academic Details Strip */}
        <div className="px-6 py-3.5 bg-stone-100/60 border-b border-stone-200/60 flex flex-wrap items-center gap-6 text-xs text-stone-600">
          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] block">
              Declared Role / Degree
            </span>
            <span className="font-semibold text-stone-900">{degree}</span>
          </div>
          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] block">
              Graduation Year
            </span>
            <span className="font-semibold text-stone-900">{graduationYear}</span>
          </div>
          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] block">
              Student / Roll No.
            </span>
            <span className="font-mono font-medium text-stone-800">
              {institutionalIdentifier}
            </span>
          </div>
        </div>

        {/* Documents Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Uploaded Credentials &amp; Proofs ({documents.length})
          </h4>

          {documents.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
              <FileText className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs font-medium text-stone-600">
                No certificate or transcript uploaded yet.
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Alumnus submitted institutional ID verification without attached files.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, idx) => {
                const isImage = isImageDoc(doc);
                const isPrimaryIdProof =
                  doc.documentType === "institutional_id_proof" || idx === 0;

                return (
                  <div
                    key={doc.id || idx}
                    className="p-4 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-blue-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                        {isImage ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isPrimaryIdProof
                                ? "bg-blue-100 text-primary-700 border border-blue-200"
                                : "bg-purple-100 text-purple-800 border border-purple-200"
                            }`}
                          >
                            {isPrimaryIdProof
                              ? "Institutional ID Proof"
                              : "Additional Supporting Document"}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {formatFileSize(doc.sizeBytes)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {doc.fileName}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {doc.contentType || "document"}
                        </p>
                      </div>
                    </div>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                    >
                      <span>View Document</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-300" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
