"use client";

import React from "react";
import { FileText, ExternalLink, X, ShieldCheck } from "lucide-react";

export interface VerificationDocumentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  contentType: string;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
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
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Academic Details Strip */}
        <div className="px-6 py-3.5 bg-stone-100/60 border-b border-stone-200/60 flex flex-wrap items-center gap-6 text-xs text-stone-600">
          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] block">
              Declared Degree
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
            Uploaded Credentials ({documents.length})
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
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {doc.contentType} • {formatFileSize(doc.sizeBytes)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span>View File</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
