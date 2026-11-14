import React from "react";
import Link from "next/link";
import {
  Activity,
  Zap,
  FileSpreadsheet,
} from "lucide-react";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "Stage 04: Measure · Alma Mentorship",
  description: "Accredited institutional health monitoring, momentum watchdogs, and audit compliance exports.",
};

export default function MeasureStagePage() {
  return (
    <div className="relative overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <CurvedBackground />

        {/* Hero */}
        <section className="pt-8 sm:pt-12 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DBEAFE] text-[#0B1F44] text-xs font-semibold mb-4">
            <span className="font-mono font-bold text-[#2563EB]">04</span>
            <span>The Mentoring Journey</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-[#0B1F44] tracking-tight max-w-3xl w-full mx-auto text-center mb-4">
            Measure impact with{" "}
            <span className="font-serif-accent font-normal italic text-[#2563EB]">
              accredited precision.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            Equip university leaders with real-time pairing momentum watchdogs, automated nudges, and privacy-preserving CSV compliance exports.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md transition-all hover:scale-105"
            >
              <span>Get started &rarr;</span>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Momentum Watchdog</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Automated classification of active mentorships: Healthy (&lt;8 days), At-Risk (8–13 days), and Stalled (14+ days) based on session activity.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Automated Check-in Nudges</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                When a pairing slows down, the system schedules check-ins with a 7-day cooldown guard, reigniting stalled engagement automatically.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Accredited CSV Exports</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Generate accreditation-ready CSV reports on participation, outcomes, and satisfaction with all personal contact details strictly shielded.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
