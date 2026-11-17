import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { verifyAccess } from "@/lib/app-tokens";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If user already has an active session, redirect directly to their dashboard
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
          redirect("/mentor/dashboard");
        } else if (payload.role === "alumni_relations_officer") {
          redirect("/officer");
        } else if (
          payload.role === "administrator" ||
          payload.role === "admin" ||
          payload.role === "placement_officer"
        ) {
          redirect("/analytics");
        } else {
          redirect("/student/dashboard");
        }
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-background selection:bg-primary-100 selection:text-primary-900">
      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-5 bg-background/85 backdrop-blur-md border-b border-primary-600/10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-bold text-2xl tracking-tight text-deep font-heading group"
        >
          <span>alma</span>
          <span className="text-primary-600 font-black text-3xl leading-none">.</span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-deep px-4 py-2 rounded-full border border-slate-200/80 bg-white/80 hover:bg-white shadow-2xs transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-primary-600" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-20 sm:pt-28 sm:pb-24">
        {children}
      </main>

      {/* Fixed Bottom Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-3 bg-background/90 backdrop-blur-md border-t border-primary-600/10 text-[11px]">
        {/* Left Side */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold">
            A
          </span>
          <span className="font-semibold tracking-wider text-deep">ALMA NETWORK</span>
        </div>

        {/* Middle */}
        <div className="hidden md:block tracking-widest text-slate-400 font-medium text-[10px]">
          STUDENT &bull; ALUMNI &bull; INSTITUTION
        </div>

        {/* Right Side */}
        <div className="tracking-wide text-slate-500 font-medium text-[10px]">
          VERIFIED MENTORSHIP PLATFORM
        </div>
      </footer>
    </div>
  );
}
