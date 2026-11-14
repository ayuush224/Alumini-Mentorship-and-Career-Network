import React from "react";
import Link from "next/link";
import {
  Calendar,
  CheckSquare,
  Lock,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "Stage 03: Mentor · Alma Mentorship",
  description: "Shared relationship workspace with meeting agendas, bilateral goals, action checklists, and private notes.",
};

export default function MentorStagePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNavbar />

      <main className="flex-1 relative overflow-hidden">
        <CurvedBackground />

        {/* Hero */}
        <section className="pt-8 sm:pt-12 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 text-deep text-xs font-semibold mb-4">
            <span className="font-mono font-bold text-primary-600">03</span>
            <span>The Mentoring Journey</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-deep tracking-tight max-w-3xl w-full mx-auto text-center mb-4">
            Mentor inside a{" "}
            <span className="font-serif-accent font-normal italic text-primary-600">
              shared workspace.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            Every mentorship is anchored in a bilateral relationship hub with shared meeting agendas, actionable checkboxes, and private notes.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all hover:scale-105"
            >
              <span>Get started &rarr;</span>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-deep">Integrated Video Rooms</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                One-click Alma video rooms eliminate messy calendar link exchanges. Agendas are set ahead of time so every minute counts.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center font-bold">
                <CheckSquare className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-deep">Actionable Milestones</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Both student and mentor collaboratively manage action checklists between calls, ensuring advice turns into executed results.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-deep">Private Notes</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mentors keep private observations and feedback notes strictly confidential, visible only to themselves for session continuity.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
