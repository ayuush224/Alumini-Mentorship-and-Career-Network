"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  ShieldCheck,
  Clock,
  Search,
  BarChart3,
  Award,
  Sparkles,
} from "lucide-react";

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  actorRole: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface ProgramStats {
  activePairings: number;
  completedPairings: number;
  totalVerifiedAlumni: number;
  completionRate: number;
  satisfactionScore: number;
}

interface AuditReportsProps {
  initialStats: ProgramStats;
  initialLogs: AuditLogItem[];
}

export function AuditReports({ initialStats, initialLogs }: AuditReportsProps) {
  const [logs] = useState<AuditLogItem[]>(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.resource.toLowerCase().includes(q) ||
      log.actorRole.toLowerCase().includes(q) ||
      JSON.stringify(log.details).toLowerCase().includes(q)
    );
  });

  // Strict Invariant 2 Enforcer: CSV export with personal contacts stripped
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Timestamp", "Action", "Resource", "Resource ID", "Actor Role", "Details (Sanitized)"];
      const rows = filteredLogs.map((log) => {
        // Sanitize details: strip any email or phone if present
        const sanitizedDetails = { ...log.details };
        delete (sanitizedDetails as Record<string, unknown>).email;
        delete (sanitizedDetails as Record<string, unknown>).phone;
        delete (sanitizedDetails as Record<string, unknown>).phoneNumber;

        return [
          `"${new Date(log.timestamp).toISOString()}"`,
          `"${log.action.replace(/"/g, '""')}"`,
          `"${log.resource.replace(/"/g, '""')}"`,
          `"${(log.resourceId || "").replace(/"/g, '""')}"`,
          `"${log.actorRole.replace(/"/g, '""')}"`,
          `"${JSON.stringify(sanitizedDetails).replace(/"/g, '""')}"`,
        ].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Alma_Accreditation_Audit_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Verified Alumni Mentors</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{initialStats.totalVerifiedAlumni}</p>
          <p className="text-[11px] text-stone-500">Degree & credentials validated</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Active Relationships</span>
            <BarChart3 className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{initialStats.activePairings}</p>
          <p className="text-[11px] text-stone-500">Currently in progress</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Completion Rate</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{initialStats.completionRate}%</p>
          <p className="text-[11px] text-stone-500">
            {initialStats.completedPairings} mentorships graduated
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Student Satisfaction</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{initialStats.satisfactionScore} / 5.0</p>
          <p className="text-[11px] text-stone-500">Accredited benchmark score</p>
        </div>
      </div>

      {/* Header and CSV Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">
            Institutional Audit Trail & Governance Logs
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Immutable log of verification reviews, momentum nudges, and capacity adjustments.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={isExporting || logs.length === 0}
          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Compliance CSV</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter audit logs by action, role, resource, or details..."
          className="w-full bg-white border border-stone-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-stone-400 transition-all shadow-2xs"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h4 className="font-semibold text-stone-800 text-sm">No audit records found</h4>
            <p className="text-xs text-stone-500 mt-1">Audit events will appear here as administrative actions occur.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 overflow-x-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                      {log.action}
                    </span>
                    <span className="text-stone-400">•</span>
                    <span className="font-medium text-stone-700">{log.resource}</span>
                    <span className="text-stone-400 text-[11px]">by {log.actorRole}</span>
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-[11px] text-stone-500 font-mono truncate max-w-xl">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-stone-400 text-[11px] shrink-0 self-end sm:self-center">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
