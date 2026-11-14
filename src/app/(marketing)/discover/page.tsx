import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
} from "lucide-react";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "Stage 01: Discover · Alma Mentorship",
  description: "Explainable alumni mentor discovery with visible capacity limits and verified credentials.",
};

export default function DiscoverStagePage() {
  return (
    <div className="relative overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <CurvedBackground />

        {/* Hero */}
        <section className="pt-8 sm:pt-12 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DBEAFE] text-[#0B1F44] text-xs font-semibold mb-4">
            <span className="font-mono font-bold text-[#2563EB]">01</span>
            <span>The Mentoring Journey</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-[#0B1F44] tracking-tight max-w-3xl w-full mx-auto text-center mb-4">
            Discover mentors with{" "}
            <span className="font-serif-accent font-normal italic text-[#2563EB]">
              explainable affinity.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            No endless scrolling through unverified profiles. Alma calculates multi-attribute matching scores and provides transparent rationale for every recommendation.
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

        {/* Stage Features */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Explainable Rationale</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every match displays why it fits: e.g. &ldquo;Strong fit for your target job role in Cloud Architecture and shared undergraduate major.&rdquo;
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Verified Alumni Only</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mentors are accredited by the university relations officer with verified degrees, employer tags, and graduation years.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Visible Capacity Status</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Students see live availability badges: Available (1/2), Waitlist, or At Capacity. No time wasted requesting saturated mentors.
              </p>
            </div>
          </div>

          {/* Simulated HTML/CSS Mockup */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center font-bold">
                  96%
                </span>
                <div>
                  <h4 className="font-bold font-heading text-[#0B1F44]">Affinity Match Profile</h4>
                  <p className="text-xs text-slate-500">Multi-factor algorithmic scoring</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Accepting Mentees (1 of 2)
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600">
              <p className="p-3.5 rounded-2xl bg-[#EFF6FF] text-[#1E3A8A] font-medium border border-[#BFDBFE]/60">
                &ldquo;Why this match: Top industry match for your target role in FinTech engineering, with 4 shared skills (Next.js, TypeScript, API Design, System Architecture).&rdquo;
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Alumni &bull; Senior Engineer @ Stripe &bull; Class of 2017</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
