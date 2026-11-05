import React from "react";
import { getMomentumPairings } from "@/app/actions/officer";
import { RelationshipMomentum } from "../_components/relationship-momentum";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relationship Momentum & Inactivity Watchdog | Alma",
  description: "Monitor active mentorship momentum, flag stalled pairings, and issue engagement nudges.",
};

export default async function MomentumPage() {
  const res = await getMomentumPairings();
  const pairings = res.pairings || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5" />
          <span>Module M8 • Relationship Health</span>
        </div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          Relationship Momentum Watchdog
        </h1>
        <p className="text-xs text-stone-500 max-w-2xl">
          Track session frequency and check-in momentum across all active student-mentor pairings. Trigger engagement nudges for relationships inactive for 14+ days.
        </p>
      </div>

      <RelationshipMomentum initialPairings={pairings} />
    </div>
  );
}
