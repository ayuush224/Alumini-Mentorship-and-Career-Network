import React from "react";
import Link from "next/link";
import { Compass, ArrowRight, Home, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Page Not Found | Alma",
  description: "The requested page could not be found on Alma.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-slate-700 selection:bg-blue-100 selection:text-blue-600">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand mark */}
        <div className="inline-flex items-center gap-1 font-heading font-black text-2xl tracking-tight text-deep">
          <span>alma</span>
          <span className="text-primary-600 font-black text-2xl leading-none">.</span>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold">
          <Compass className="w-3.5 h-3.5 text-primary-600" />
          <span>Error 404 &middot; Missing Connection</span>
        </div>

        {/* Heading & Explanation */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-deep tracking-tight font-heading">
            We couldn&apos;t connect you to that page
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-sm mx-auto leading-relaxed">
            The link you followed may have expired, changed, or you might not have access to this resource.
          </p>
        </div>

        {/* Quick Recovery Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            prefetch={true}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            href="/student/mentors"
            prefetch={true}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold shadow-2xs transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none"
          >
            <span>Browse Mentors</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Privacy Note */}
        <div className="pt-6 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Alma Verified Mentorship Network</span>
        </div>
      </div>
    </div>
  );
}
