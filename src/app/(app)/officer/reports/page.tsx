import React from "react";
import { getAuditReportsData } from "@/app/actions/officer";
import { AuditReports } from "../_components/audit-reports";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accreditation Reports & Audit Trail | Alma",
  description: "Accreditation analytics, program KPIs, and compliance audit trail.",
};

export default async function ReportsPage() {
  const res = await getAuditReportsData();
  const stats = res.stats || {
    activePairings: 0,
    completedPairings: 0,
    totalVerifiedAlumni: 0,
    completionRate: 0,
    satisfactionScore: 4.8,
  };
  const logs = res.auditLogs || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200/80 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Module M10 • Institutional Governance</span>
        </div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          Program Accreditation Reports & Audit Logs
        </h1>
        <p className="text-xs text-stone-500 max-w-2xl">
          Review institutional KPIs, track accreditation milestones, and export privacy-preserving compliance audit logs (Invariant 2).
        </p>
      </div>

      <AuditReports initialStats={stats} initialLogs={logs} />
    </div>
  );
}
