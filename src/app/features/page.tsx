import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Compass,
  Link2,
  Heart,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  MessageSquare,
  FileCheck,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "Features & Architecture · Alma",
  description: "Explore the 10 cohesive modules powering verified, sustainable university mentorship.",
};

export default function FeaturesPage() {
  const modules = [
    {
      code: "M1",
      name: "Alumni Verification & Profile",
      desc: "Degree verification, employment credentials, and industry expertise tags review pipeline.",
      icon: FileCheck,
      benefit: "Quarantined document review prevents unverified claims.",
    },
    {
      code: "M2",
      name: "Capacity & Intake Throttling",
      desc: "Strict declared mentee limit per mentor enforced via atomic MongoDB conditional updates.",
      icon: ShieldCheck,
      benefit: "Invariant 1 guaranteed: Mentors never exceed their declared capacity.",
    },
    {
      code: "M3",
      name: "Student Career Profile",
      desc: "Target roles, industries, skill gaps, and career goals structured for high-signal matching.",
      icon: Compass,
      benefit: "Direct alignment with alumni experience tracks.",
    },
    {
      code: "M4",
      name: "Discovery & Explainable Matching",
      desc: "Affinity score computation with transparent matching rationale (e.g. 'Strong portfolio fit').",
      icon: Sparkles,
      benefit: "Zero black-box recommendations.",
    },
    {
      code: "M5",
      name: "Requests & Single-Click Acceptance",
      desc: "Student request throttling (max 3 active) with 14-day auto-expiry to maintain momentum.",
      icon: Link2,
      benefit: "Fast responses and no ghosting.",
    },
    {
      code: "M6",
      name: "Scheduling & Structured Sessions",
      desc: "Agenda setting, integrated Alma video room coordination, and attendance tracking.",
      icon: Calendar,
      benefit: "Every session starts with a concrete purpose.",
    },
    {
      code: "M7",
      name: "Bilateral Goals & Action Items",
      desc: "Mutually editable milestone checklists and 1–5 star post-session feedback loops.",
      icon: Heart,
      benefit: "Measurable student skill growth.",
    },
    {
      code: "M8",
      name: "Engagement Momentum Watchdog",
      desc: "Continuous health scoring flagging relationships inactive for 14+ days with automated nudges.",
      icon: Zap,
      benefit: "Pre-empts stalled mentorships before students drop out.",
    },
    {
      code: "M9",
      name: "Scoped In-Platform Messaging",
      desc: "Bilateral messaging strictly scoped to active pairings with alumni contact details shielded.",
      icon: MessageSquare,
      benefit: "Invariant 2 guaranteed: Personal emails and numbers never leak.",
    },
    {
      code: "M10",
      name: "Programme Analytics & Audit Trail",
      desc: "Accreditation-ready CSV compliance exports and multi-tenant administrative oversight.",
      icon: TrendingUp,
      benefit: "Institutional reporting ready in minutes.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNavbar />

      <main className="flex-1 relative overflow-hidden">
        <CurvedBackground />

        {/* Hero */}
        <section className="pt-8 sm:pt-12 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 text-deep text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-primary-600" />
            <span>Architecture &amp; Features</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-deep tracking-tight max-w-3xl w-full mx-auto text-center mb-4">
            Engineered from the ground up for{" "}
            <span className="font-serif-accent font-normal italic text-primary-600">
              trust and scale.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            A breakdown of the 10 cohesive architectural modules (M1–M10) transforming chaotic alumni outreach into an accredited institutional mentorship network.
          </p>
        </section>

        {/* Module Grid */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.code}
                  className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs hover:shadow-md transition-all space-y-4 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {m.code}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold font-heading text-deep mb-1.5">
                      {m.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{m.benefit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Deep Dive UI Mockup Section */}
        <section className="py-20 bg-white border-y border-primary-600/15 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 block">
                IMMUTABLE SYSTEM INVARIANTS
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-heading text-deep">
                Guaranteed by design, not by good intentions
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Invariant 1 Mockup */}
              <div className="p-8 rounded-3xl bg-background border border-primary-600/20 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                    1
                  </span>
                  <h3 className="text-xl font-bold font-heading text-deep">
                    Invariant 1: Mentor Capacity Must Never Be Exceeded
                  </h3>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  When a mentor accepts a mentee, the operation executes atomically in MongoDB:
                  <code className="block mt-2 p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800">
                    {`await MentorCapacity.findOneAndUpdate({ mentorId, activeMentees: { $lt: maxMentees } }, { $inc: { activeMentees: 1 } })`}
                  </code>
                </p>

                <p className="text-xs text-slate-500">
                  If two students request acceptance concurrently, race conditions are mathematically prevented. Saturated mentors become non-requestable.
                </p>
              </div>

              {/* Invariant 2 Mockup */}
              <div className="p-8 rounded-3xl bg-background border border-primary-600/20 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                    2
                  </span>
                  <h3 className="text-xl font-bold font-heading text-deep">
                    Invariant 2: Alumni Contact Details Must Never Leak
                  </h3>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Personal phone numbers and email addresses are stripped at the server response boundary before any payload leaves the server:
                  <code className="block mt-2 p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800">
                    {`sanitizeUser(userDoc) // excludes email, phone, physicalAddress`}
                  </code>
                </p>

                <p className="text-xs text-slate-500">
                  Students interact exclusively through Alma video rooms and scoped messaging channels, keeping alumni shielded from unsolicited cold messages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-deep text-white py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl font-bold font-heading text-white">
              Ready to see Alma in action?
            </h2>
            <p className="text-sm text-slate-300">
              Get started as a student, mentor, or university officer today.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all hover:scale-105"
              >
                <span>Create your account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
