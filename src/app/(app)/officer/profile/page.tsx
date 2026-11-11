import React from "react";
import { redirect } from "next/navigation";
import { getOfficerProfileData } from "@/app/actions/officer";
import { OfficerProfileView } from "./_components/officer-profile-view";


export const metadata = {
  title: "Officer Profile & Institutional Settings | Alma",
  description: "Manage administrator credentials, view institutional tenancy, and review security logs.",
};

export default async function OfficerProfilePage() {
  const res = await getOfficerProfileData();

  if (!res.success || !res.officer || !res.institution) {
    redirect("/officer");
  }

  return (
    <OfficerProfileView
      officer={res.officer}
      institution={res.institution}
      recentActions={res.recentActions || []}
    />
  );
}
