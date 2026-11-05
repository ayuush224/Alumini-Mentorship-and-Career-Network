import React from "react";
import { getVerificationRequests } from "@/app/actions/officer";
import { VerificationQueue } from "../_components/verification-queue";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alumni Credential Verifications | Alma",
  description: "Verify degree credentials and transcripts for prospective alumni mentors.",
};

export default async function VerificationsPage() {
  const res = await getVerificationRequests("all");
  const requests = res.requests || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Module M1 • Credential Review</span>
        </div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          Alumni Credential Verification Queue
        </h1>
        <p className="text-xs text-stone-500 max-w-2xl">
          Review submitted degree certificates, graduation years, and roll numbers before admitting alumni to the verified mentor directory.
        </p>
      </div>

      <VerificationQueue initialRequests={requests} />
    </div>
  );
}
