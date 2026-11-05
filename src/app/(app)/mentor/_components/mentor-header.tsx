"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutGrid,
  Users,
  Inbox,
  Calendar,
  MessageSquare,
  User,
  ShieldCheck,
  LogOut,
  Loader2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface MentorHeaderProps {
  user: {
    name?: string;
    avatarUrl?: string;
  };
  pendingRequestsCount?: number;
}

export function MentorHeader({ user, pendingRequestsCount = 0 }: MentorHeaderProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const tabs = [
    { label: "Dashboard", href: "/mentor/dashboard", icon: LayoutGrid },
    { label: "Mentees", href: "/mentor/mentees", icon: Users },
    {
      label: "Requests",
      href: "/mentor/requests",
      icon: Inbox,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    { label: "Sessions", href: "/mentor/sessions", icon: Calendar },
    { label: "Chat", href: "/mentor/chat", icon: MessageSquare, hasDot: true },
    { label: "Profile", href: "/mentor/profile", icon: User },
  ];

  const initials = user.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ME";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Navigation Tabs */}
        <div className="flex items-center gap-6 sm:gap-8 min-w-0">
          <Link
            href="/mentor/dashboard"
            className="inline-flex items-center gap-1 font-heading font-black text-2xl tracking-tight text-[#0B1F44] group shrink-0"
          >
            <span>alma</span>
            <span className="text-[#2563EB] font-black text-2xl leading-none">.</span>
          </Link>

          {/* Horizontal Navigation Tabs */}
          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                pathname === tab.href ||
                (tab.href === "/mentor/dashboard" && (pathname === "/mentor" || pathname === "/mentor/dashboard")) ||
                pathname.startsWith(`${tab.href}/`);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 relative ${
                    isActive
                      ? "bg-[#E8F0FE] text-[#2563EB] font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-[#0B1F44] hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#2563EB]" : "text-slate-500"}`} />
                  <span>{tab.label}</span>

                  {tab.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#2563EB] text-white leading-tight">
                      {tab.badge}
                    </span>
                  )}

                  {tab.hasDot && !tab.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Mentor Portal Badge & Profile User Menu */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#BFDBFE] text-[#2563EB] text-xs font-semibold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Mentor Portal</span>
            <ExternalLink className="w-3 h-3 text-[#2563EB]" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mentor/profile"
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-full hover:bg-slate-100/70 transition-colors"
              title="View & Edit Mentor Profile"
            >
              {user.avatarUrl ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#BFDBFE]">
                  <Image src={user.avatarUrl} alt="Mentor avatar" fill className="object-cover" sizes="32px" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] font-bold text-xs flex items-center justify-center">
                  {initials}
                </div>
              )}
              <span className="hidden sm:inline text-sm font-medium text-[#0F172A]">
                {user.name || "Mentor"}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:inline" />
            </Link>

            <form action="/api/v1/auth/logout" method="POST" onSubmit={handleLogout}>
              <button
                type="submit"
                disabled={isLoggingOut}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
