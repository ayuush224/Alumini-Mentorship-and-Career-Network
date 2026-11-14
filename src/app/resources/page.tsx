import React from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CurvedBackground } from "@/components/marketing/curved-background";

export const metadata = {
  title: "Resources & Playbooks · Alma",
  description: "Guides, mentorship playbooks, and best practices for productive alumni relationships.",
};

export default function ResourcesPage() {
  const categories = ["All Resources", "Mentee Playbooks", "Mentor Guides", "Governance & Policy", "Meeting Agendas"];

  const guides = [
    {
      title: "First Session Blueprint: Structuring the 45-Minute Kickoff",
      category: "Meeting Agendas",
      readTime: "4 min read",
      desc: "How to set clear relationship expectations, align career goals, and agree on measurable action items during your initial video session.",
    },
    {
      title: "The Art of the High-Signal Request: Avoid Being Declined",
      category: "Mentee Playbooks",
      readTime: "5 min read",
      desc: "Why generic 'Can I pick your brain?' messages fail, and how to craft a specific, high-affinity introductory pitch with portfolio links.",
    },
    {
      title: "Guarding Your Bandwidth: Sustainable Mentoring Practices",
      category: "Mentor Guides",
      readTime: "6 min read",
      desc: "How alumni leaders leverage Alma's declared capacity limits and asynchronous notes to support mentees without calendar stress.",
    },
    {
      title: "Institutional Audit & Accreditation Compliance Guide",
      category: "Governance & Policy",
      readTime: "7 min read",
      desc: "A walkthrough of Track J compliance standards, privacy-preserving CSV exports, and Invariant 2 data sanitation protocols.",
    },
    {
      title: "Portfolio & Resume Teardown Agenda Template",
      category: "Meeting Agendas",
      readTime: "3 min read",
      desc: "A ready-to-use checklist for reviewing software engineering, product design, and finance case study portfolios.",
    },
    {
      title: "Navigating Career Pivots with Alumni Guidance",
      category: "Mentee Playbooks",
      readTime: "5 min read",
      desc: "Leveraging departmental alumni networks to transition from traditional engineering to AI research and product management.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNavbar />

      <main className="flex-1 relative overflow-hidden">
        <CurvedBackground />

        {/* Hero */}
        <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 text-deep text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-600" />
            <span>Knowledge Base &amp; Playbooks</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-heading text-deep tracking-tight max-w-3xl mx-auto mb-6">
            Guides and frameworks for{" "}
            <span className="font-serif-accent font-normal italic text-primary-600">
              productive mentorship.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Actionable playbooks, meeting templates, and governance policies tested across university cohorts.
          </p>

          {/* Search Bar Simulation */}
          <div className="max-w-xl mx-auto relative mb-10">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              value=""
              placeholder="Search guides, agendas, and policy documents..."
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white border border-slate-300 text-sm shadow-xs focus:outline-none cursor-default"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap max-w-3xl mx-auto">
            {categories.map((c, i) => (
              <span
                key={c}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  i === 0
                    ? "bg-primary-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-primary-600/40 hover:text-deep"
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Guides Grid */}
        <section id="guides" className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((g, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="font-semibold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
                      {g.category}
                    </span>
                    <span>{g.readTime}</span>
                  </div>

                  <h3 className="text-lg font-bold font-heading text-deep hover:text-primary-600 transition-colors cursor-pointer">
                    {g.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {g.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary-600">
                  <span>Read playbook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Support Banner */}
        <section className="bg-white border-y border-primary-600/15 py-16 px-4">
          <div className="max-w-4xl mx-auto rounded-3xl bg-primary-50 border border-primary-600/20 p-8 sm:p-12 text-center space-y-4">
            <MessageCircle className="w-10 h-10 text-primary-600 mx-auto" />
            <h2 className="text-2xl font-bold font-heading text-deep">
              Have questions about university onboarding?
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Our institutional team provides custom tenant setups, legacy data ingestion, and officer role training.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-xs transition-all hover:scale-105"
              >
                <span>Contact Institutional Team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
