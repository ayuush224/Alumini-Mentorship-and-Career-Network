import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccess } from "@/lib/app-tokens";
import {
  ShieldCheck,
  Users,
  Lock,
  ArrowRight,
  Play,
  Compass,
  Link2,
  Heart,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Zap,
  HelpCircle,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CurvedBackground } from "@/components/marketing/curved-background";


export default async function HomePage(props: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const isPreview = searchParams?.preview === "true";

  let userDashboardUrl: string | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (payload?.sub) {
        if (
          payload.role === "alumni" ||
          payload.role === "mentor" ||
          payload.role === "alumni_mentor"
        ) {
          userDashboardUrl = "/mentor/dashboard";
        } else if (payload.role === "alumni_relations_officer") {
          userDashboardUrl = "/officer";
        } else if (
          payload.role === "administrator" ||
          payload.role === "admin" ||
          payload.role === "placement_officer"
        ) {
          userDashboardUrl = "/officer";
        } else {
          userDashboardUrl = "/student/dashboard";
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
  }

  // Automatic login routing: if session cookie is active and valid, take user straight to their workspace
  if (userDashboardUrl && !isPreview) {
    redirect(userDashboardUrl);
  }

  const journeyCards = [
    {
      num: "01",
      title: "Discover",
      desc: "Explainable multi-attribute matching with visible mentor capacity, background, and trusted signals.",
      icon: Compass,
      href: "/discover",
      tag: "M3 &bull; M4 Matching",
    },
    {
      num: "02",
      title: "Connect",
      desc: "Throttled student request queues with single-click acceptances and anti-burnout capacity guards.",
      icon: Link2,
      href: "/connect",
      tag: "M5 Throttled Intake",
    },
    {
      num: "03",
      title: "Mentor",
      desc: "Shared relationship workspace with meeting agendas, bilateral goals, action checklists, and notes.",
      icon: Heart,
      href: "/journey/mentor",
      tag: "M6 &bull; M7 Active Hub",
    },
    {
      num: "04",
      title: "Measure",
      desc: "Real-time relationship momentum watchdog, engagement nudges, and accredited audit compliance exports.",
      icon: TrendingUp,
      href: "/measure",
      tag: "M8 &bull; M10 Analytics",
    },
  ];

  const faqs = [
    {
      q: "How does degree and alumni credential verification work?",
      a: "Institutional staff review graduation transcripts and student records before admitting mentors to the directory. Only accredited alumni can receive mentorship requests.",
    },
    {
      q: "What prevents alumni mentors from experiencing burnout?",
      a: "Mentors declare a hard limit on concurrent mentees (e.g. 2 active mentees). Atomic database constraints physically block new requests once saturated, keeping participation sustainable.",
    },
    {
      q: "Are alumni personal email addresses or phone numbers visible to students?",
      a: "Never. Under Invariant 2, personal contact info is sanitized at the server API boundary. All scheduling, sessions, and bilateral messaging happen securely within the Alma platform.",
    },
    {
      q: "How do university administrators identify stalled mentorships?",
      a: "Our momentum watchdog algorithm tracks session frequency and goal completion. Any pairing inactive for 14+ days triggers an automated check-in nudge without exposing private notes.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary-100 selection:text-primary-900">
      {/* Global Marketing Navbar */}
      <MarketingNavbar userDashboardUrl={userDashboardUrl} />

      {/* Main Hero & Content Flow */}
      <main className="flex-1 relative overflow-hidden">
        {/* Soft Wave & Curved Blob Background (Image 2 Replica) */}
        <CurvedBackground />

        {/* ===================================================================
            1. HERO SECTION (FAITHFUL IMAGE 2 REPLICA)
        ==================================================================== */}
        <section className="pt-8 sm:pt-14 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          {/* Centered Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary-100/80 border border-primary-200/60 text-primary-800 text-xs font-semibold shadow-2xs mb-5 transition-transform hover:scale-105">
            <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
            <span>Verified Alumni Mentorship Platform</span>
          </div>

          {/* Two-line Signature Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black font-heading tracking-tight text-deep max-w-4xl w-full mx-auto text-center leading-[1.08] mb-4">
            Turn alumni goodwill{" "}
            <span className="block font-serif font-bold italic text-primary-600 tracking-tight mt-1 text-center">
              into momentum.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            A considered mentoring network for students, alumni, and the teams who make meaningful connections possible.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 w-full">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold bg-primary-100 hover:bg-primary-200 text-primary-600 shadow-2xs transition-all hover:scale-105"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="#the-journey"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-medium bg-white/90 hover:bg-white text-slate-700 border border-slate-200/90 shadow-2xs transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 text-slate-700" />
              <span>See how it works</span>
            </Link>
          </div>

          {/* Trust Row with Icons */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 pt-0 max-w-2xl mx-auto text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Built around trust</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Grow real capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Privacy by design</span>
            </div>
          </div>
        </section>

        {/* ===================================================================
            2. "THE MENTORING JOURNEY, END TO END" (IMAGE 2 REPLICA)
        ==================================================================== */}
        <section
          id="the-journey"
          className="pt-4 sm:pt-6 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 block mb-1">
                REPORT-READY SCREENS
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading text-deep">
                The mentoring journey, end to end
              </h2>
            </div>

            <div className="self-start sm:self-auto">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary-100 text-primary-600 border border-primary-200">
                04 PAGES
              </span>
            </div>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {journeyCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Link
                  key={card.num}
                  href={card.href}
                  className="group bg-white rounded-3xl border border-primary-600/15 p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-primary-600/40 transition-all flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    {/* Top Row: Number & Soft-Blue Icon Square */}
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-primary-600 transition-colors">
                        {card.num}
                      </span>
                      <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-200/60 text-primary-600 flex items-center justify-center transition-transform group-hover:scale-110">
                        <IconComponent className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold font-heading text-deep mb-2 group-hover:text-primary-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary-600">
                    <span>Explore stage</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            3. INSTITUTIONAL SOCIAL PROOF & STATS STRIP
        ==================================================================== */}
        <section className="py-16 bg-primary-50/70 border-y border-primary-600/10 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold font-heading text-deep">
                  100%
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Capacity Limit Enforced
                </p>
                <p className="text-[11px] text-slate-400">Zero mentor burnout</p>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold font-heading text-primary-600">
                  &lt;48h
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Response SLA Benchmark
                </p>
                <p className="text-[11px] text-slate-400">Automated intake throttling</p>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold font-heading text-deep">
                  4.8 / 5.0
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Mentee Satisfaction Score
                </p>
                <p className="text-[11px] text-slate-400">Post-session feedback</p>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold font-heading text-primary-600">
                  0
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Contact Details Leaked
                </p>
                <p className="text-[11px] text-slate-400">Strict Invariant 2 Shielding</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            4. CORE ARCHITECTURE PILLARS (TRUST & SUSTAINABILITY)
        ==================================================================== */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 block">
              ENGINEERED FOR GOVERNANCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-deep">
              Three structural pillars informal networks ignore
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Unlike LinkedIn outreach or spreadsheets, Alma builds institutional safeguards right into the database schema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-heading text-deep">
                Strict Mentor Capacity Control
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mentors set declared active limits. Atomic MongoDB updates physically prohibit concurrent over-subscription, preventing alumni volunteer fatigue.
              </p>
              <div className="pt-2 text-xs font-semibold text-primary-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invariant 1 Guarantee</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-heading text-deep">
                Shielded Alumni Privacy
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Personal emails and phone numbers never cross server response boundaries. All scheduling, notes, and messages take place securely within Alma.
              </p>
              <div className="pt-2 text-xs font-semibold text-primary-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invariant 2 Guarantee</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-heading text-deep">
                Momentum Health Watchdog
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Passive analytics monitor pairing momentum. If a mentorship sits idle for 14+ days, the system schedules check-ins without human policing.
              </p>
              <div className="pt-2 text-xs font-semibold text-primary-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Accreditation Ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. FREQUENTLY ASKED QUESTIONS
        ==================================================================== */}
        <section className="py-20 bg-primary-50/50 border-t border-primary-600/10 relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 block">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading text-deep">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-2"
                >
                  <h3 className="text-sm sm:text-base font-bold font-heading text-deep flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary-600 shrink-0" />
                    <span>{faq.q}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            6. FINAL CTA BAND (DEEP BLUE THEMED AS SPECIFIED)
        ==================================================================== */}
        <section className="bg-deep text-white py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-radial at-center from-primary-600/25 to-transparent opacity-50 pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-primary-300 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-primary-300" />
              <span>Ready for your institution</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-white leading-tight">
              Turn alumni goodwill into measurable momentum.
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Launch a structured, accredited mentorship program backed by hard capacity limits, privacy shields, and real-time relationship momentum tracking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
              >
                <span>Get started today</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all hover:scale-105"
              >
                <span>Sign in to portal</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Global Marketing Footer */}
      <MarketingFooter />
    </div>
  );
}
