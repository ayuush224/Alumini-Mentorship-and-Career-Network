import React from "react";
import Link from "next/link";
import {
  Heart,
  Award,
  ShieldCheck,
  Star,
  Quote,
  Building2,
  GraduationCap,
} from "lucide-react";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "Community & Impact · Alma Mentorship",
  description: "Discover our vibrant alumni community, core values, and verified mentorship success stories.",
};

export default function CommunityPage() {
  const stories = [
    {
      studentName: "Rahul Gupta",
      studentRole: "Computer Science Finalist",
      mentorName: "Priya Nair",
      mentorRole: "Senior Software Engineer @ Stripe",
      quote: "Having an alumni mentor from Stripe completely changed how I approached system design interviews. Within 6 sessions, I landed an engineering offer.",
      stars: 5,
    },
    {
      studentName: "Ananya Roy",
      studentRole: "Pre-MBA & Product Scholar",
      mentorName: "Rohan Kapoor",
      mentorRole: "Principal Product Manager @ Microsoft",
      quote: "Rohan's feedback on my product teardowns gave me real Silicon Valley caliber confidence. The throttled scheduling made sure our calls were always high signal.",
      stars: 5,
    },
    {
      studentName: "Simran Kaur",
      studentRole: "Hardware & Microelectronics Fellow",
      mentorName: "Dr. Marcus Vance",
      mentorRole: "Silicon Architecture Director @ Apple",
      quote: "Connecting with an alumnus who graduated from my exact department 10 years ago was invaluable. The private notes and shared action checklist kept us aligned.",
      stars: 5,
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <CurvedBackground />

        {/* Hero */}
        <section className="pt-8 sm:pt-12 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DBEAFE] text-[#0B1F44] text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>Alumni Network &amp; Community</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-[#0B1F44] tracking-tight max-w-3xl w-full mx-auto text-center mb-4">
            Built on reciprocal trust, powered by{" "}
            <span className="font-serif-accent font-normal italic text-[#2563EB]">
              shared pride.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl w-full mx-auto text-center mb-6 leading-relaxed font-normal">
            Where university alumni pay their experience forward and emerging graduates find confident footings in competitive global industries.
          </p>
        </section>

        {/* Community Values */}
        <section id="values" className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
              OUR GUIDING ETHOS
            </span>
            <h2 className="text-3xl font-bold font-heading text-[#0B1F44]">
              Values that anchor every pairing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Respect for Time</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mentorship succeeds when volunteers are protected from fatigue. Capacity ceilings ensure alumni stay energized for every mentee they admit.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Psychological Safety</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Contact information remains shielded behind platform channels. Communication stays professional, structured, and free from unsolicited pressure.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-[#0B1F44]">Actionable Momentum</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every meeting centers on bilateral action items, milestones, and constructive feedback loops. Mentorship translates into tangible career growth.
              </p>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section id="stories" className="py-20 bg-white border-y border-[#2563EB]/15 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
                STORIES OF MOMENTUM
              </span>
              <h2 className="text-3xl font-bold font-heading text-[#0B1F44]">
                Verified outcomes from active pairings
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stories.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-[#F8FAFF] rounded-3xl border border-slate-200/90 p-8 shadow-xs flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(s.stars)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-8 h-8 text-[#93C5FD]" />
                    <p className="text-sm text-slate-700 italic leading-relaxed">
                      &ldquo;{s.quote}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200/80 space-y-1">
                    <p className="text-sm font-bold font-heading text-[#0B1F44]">{s.studentName}</p>
                    <p className="text-xs text-slate-500">{s.studentRole}</p>
                    <p className="text-xs font-semibold text-[#2563EB] pt-1">
                      Mentored by {s.mentorName} ({s.mentorRole.split("@")[1]?.trim() || "Alumni"})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ways to Get Involved */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
              PARTICIPATION TRACKS
            </span>
            <h2 className="text-3xl font-bold font-heading text-[#0B1F44]">
              Three ways to join our community
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-xs">
              <GraduationCap className="w-8 h-8 text-[#2563EB]" />
              <h3 className="text-xl font-bold font-heading text-[#0B1F44]">Students</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Connect with alumni who walked the same campus corridors and now work in top tier roles across technology, finance, product, and research.
              </p>
              <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline">
                <span>Register as Student &rarr;</span>
              </Link>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-xs">
              <Award className="w-8 h-8 text-[#2563EB]" />
              <h3 className="text-xl font-bold font-heading text-[#0B1F44]">Alumni Mentors</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Give back with total peace of mind. Choose your mentee limit, approve requests with a click, and watch the next generation flourish.
              </p>
              <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline">
                <span>Apply as Verified Mentor &rarr;</span>
              </Link>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-xs">
              <Building2 className="w-8 h-8 text-[#2563EB]" />
              <h3 className="text-xl font-bold font-heading text-[#0B1F44]">Universities</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Equip your Alumni Relations &amp; Career Services office with an automated command center, credential reviews, and momentum watchdogs.
              </p>
              <Link href="/officer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline">
                <span>Explore Officer Portal &rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
