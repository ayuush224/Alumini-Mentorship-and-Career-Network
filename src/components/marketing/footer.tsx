import React from "react";
import Link from "next/link";
import { ShieldCheck, Heart, ArrowUpRight } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="bg-deep text-white pt-20 pb-12 border-t border-primary-600/20 relative overflow-hidden">
      {/* Ambient decorative glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-white/10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="inline-flex items-center gap-1 text-2xl font-black tracking-tight text-white font-heading">
              <span>alma</span>
              <span className="text-primary-300 font-black text-3xl leading-none">.</span>
            </Link>

            <p className="text-slate-300 text-sm max-w-sm leading-relaxed">
              An institution-backed mentorship platform connecting university students with verified alumni mentors. Structured, sustainable, privacy-respecting, and measurable.
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-primary-300" />
              <span>Contact details shielded &bull; Capacity limits strictly enforced</span>
            </div>
          </div>

          {/* Col 1: Product */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-300">Product</h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Features &amp; Modules
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/discover" className="hover:text-white transition-colors">
                  Mentor Discovery
                </Link>
              </li>
              <li>
                <Link href="/connect" className="hover:text-white transition-colors">
                  Requests &amp; Matching
                </Link>
              </li>
              <li>
                <Link href="/measure" className="hover:text-white transition-colors">
                  Impact Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Institutional Portals */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-300">Portals &amp; Community</h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link href="/community" className="hover:text-white transition-colors">
                  Alumni Network
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Become a Mentor
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/officer" className="hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>Officer Command</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary-300" />
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>Accredited Analytics</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary-300" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Alma Mentorship Network. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-primary-300 fill-primary-300" />
              <span>for verified alumni communities</span>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="font-mono text-[11px] text-slate-400">P11 Track J Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
