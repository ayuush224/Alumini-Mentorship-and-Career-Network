import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Compass,
  Link2,
  Calendar,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "How it Works · Alma Mentorship",
  description: "A step-by-step walkthrough of the verified mentorship journey for students, alumni, and institutions.",
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Alumni Credential Verification",
      actor: "Alumni & University Officer",
      desc: "Alumni register with their institutional degree details. The Alumni Relations Officer reviews transcripts and admits verified mentors into the verified directory.",
      icon: UserCheck,
      details: ["Quarantined evidence pipeline", "Strict degree validation", "Verification status badges"],
    },
    {
      num: "02",
      title: "Capacity & Intake Configuration",
      actor: "Alumni Mentors",
      desc: "Mentors define their maximum active mentee limit (e.g. 2 mentees) and preferred meeting frequency. Requests are automatically throttled when full.",
      icon: ShieldCheck,
      details: ["Zero alumni burnout", "Atomic limit enforcement", "Single-click pause intake"],
    },
    {
      num: "03",
      title: "Student Career Profiling & Discovery",
      actor: "Students (Mentees)",
      desc: "Students build career profiles with target industries, dream roles, and skills to develop. The system generates transparent, explainable recommendations.",
      icon: Compass,
      details: ["Affinity score (0–100%)", "Transparent match rationale", "Capacity visibility"],
    },
    {
      num: "04",
      title: "Throttled Request & Single-Click Acceptance",
      actor: "Students & Mentors",
      desc: "Students send targeted intros with tailored messages. Requests expire after 14 days if unaddressed, keeping queues fresh and responsive.",
      icon: Link2,
      details: ["Max 3 active pending requests", "Single-click accept/decline", "Shielded contact info"],
    },
    {
      num: "05",
      title: "Structured Sessions & Bilateral Goals",
      actor: "Active Pairings",
      desc: "Meetings happen in Alma video rooms. Mentors and mentees track bilateral goals, review action item checkboxes, and submit post-session feedback.",
      icon: Calendar,
      details: ["Integrated meeting agenda", "Mutually editable action items", "1–5 star rating reviews"],
    },
    {
      num: "06",
      title: "Momentum Monitoring & Program Analytics",
      actor: "Institutional Staff",
      desc: "Alma monitors pairing momentum. Stalled relationships (inactive for 14+ days) trigger automated nudges. Accredited compliance reports export in CSV.",
      icon: TrendingUp,
      details: ["Automated inactivity nudges", "Accredited analytics exports", "Multi-tenant governance"],
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
            <span>Step-by-Step Mentorship Lifecycle</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-deep tracking-tight max-w-3xl w-full mx-auto text-center mb-4">
            How Alma transforms outreach into{" "}
            <span className="font-serif-accent font-normal italic text-primary-600">
              meaningful outcomes.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            From verified alumni onboarding to accredited institutional analytics, every step of the relationship is structured for sustainability.
          </p>
        </section>

        {/* Vertical Timeline */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10">
          <div className="space-y-8 relative before:absolute before:inset-0 before:left-8 sm:before:left-1/2 before:w-0.5 before:bg-primary-600/20 before:-translate-x-1/2 before:hidden sm:before:block">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={step.num}
                  className={`flex flex-col sm:flex-row items-center gap-8 ${
                    isEven ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  {/* Step Card Content */}
                  <div className="w-full sm:w-1/2">
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs hover:shadow-md transition-all space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
                          Step {step.num}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {step.actor}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold font-heading text-deep">
                        {step.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {step.desc}
                      </p>

                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
                        {step.details.map((d, dIdx) => (
                          <div key={dIdx} className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Center Node Badge */}
                  <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold shadow-md shadow-primary-600/30 shrink-0 z-10">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Spacer for Alternate Grid */}
                  <div className="hidden sm:block sm:w-1/2" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-deep text-white py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl font-bold font-heading text-white">
              Start your verified mentoring journey
            </h2>
            <p className="text-sm text-slate-300">
              Students, alumni, and administrators can register and explore the platform today.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all hover:scale-105"
              >
                <span>Get started</span>
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
