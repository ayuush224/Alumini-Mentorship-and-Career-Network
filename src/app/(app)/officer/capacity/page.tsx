import React from "react";
import { getMentorCapacitiesData } from "@/app/actions/officer";
import { CapacityWatchdog } from "../_components/capacity-watchdog";
import { Users } from "lucide-react";


export const metadata = {
  title: "Mentor Capacity & Workload Balance | Alma",
  description: "Monitor mentor saturation and manage request intake state to prevent mentor burnout.",
};

export default async function CapacityPage() {
  const res = await getMentorCapacitiesData();
  const mentors = res.mentors || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-600/10 text-primary-600 border border-primary-600/30 text-xs font-semibold">
          <Users className="w-3.5 h-3.5" />
          <span>Module M2 • Capacity & Workload Balance</span>
        </div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          Mentor Capacity Watchdog
        </h1>
        <p className="text-xs text-stone-500 max-w-2xl">
          Enforce hard mentee limits (Invariant 1) to prevent alumni burnout. Pause intake for overloaded mentors or resume request reception when appropriate.
        </p>
      </div>

      <CapacityWatchdog initialMentors={mentors} />
    </div>
  );
}
