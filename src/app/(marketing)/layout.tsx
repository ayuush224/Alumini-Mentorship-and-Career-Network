import React from "react";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userDashboardUrl: string | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (
        payload?.role === "alumni" ||
        payload?.role === "mentor" ||
        payload?.role === "alumni_mentor"
      ) {
        userDashboardUrl = "/mentor/dashboard";
      } else if (
        payload?.role === "alumni_relations_officer" ||
        payload?.role === "admin" ||
        payload?.role === "placement_officer"
      ) {
        userDashboardUrl = "/officer";
      } else if (payload?.sub) {
        userDashboardUrl = "/student/dashboard";
      }
    }
  } catch {
    // Guest visitor
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF] relative selection:bg-[#DBEAFE] selection:text-[#1E3A8A]">
      <MarketingNavbar userDashboardUrl={userDashboardUrl} />
      <div className="flex-1 flex flex-col">{children}</div>
      <MarketingFooter />
    </div>
  );
}
