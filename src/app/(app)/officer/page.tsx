import React from "react";
import { redirect } from "next/navigation";
import { getOfficerDashboardData } from "@/app/actions/officer";
import { OfficerDashboardView } from "./_components/officer-dashboard-view";


export const metadata = {
  title: "Alumni Relations Officer Portal | Alma",
  description:
    "Review alumni verifications, monitor relationship momentum, maintain mentor capacity limits, and export audit reports.",
};

export default async function OfficerPage() {
  const dashRes = await getOfficerDashboardData();

  if (!dashRes.success || !dashRes.officer || !dashRes.metrics) {
    redirect("/login");
  }

  return (
    <OfficerDashboardView
      officer={dashRes.officer}
      metrics={dashRes.metrics}
      momentumDistribution={dashRes.momentumDistribution || []}
      capacityDistribution={dashRes.capacityDistribution || []}
      saturatedMentors={dashRes.saturatedMentors || []}
      recentVerifications={dashRes.recentVerifications || []}
      recentPairings={dashRes.recentPairings || []}
      auditLogs={dashRes.auditLogs || []}
    />
  );
}
