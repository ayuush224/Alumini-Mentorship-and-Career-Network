"use client";

import React, { useState } from "react";
import {
  Users,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Loader2,
  Building2,
  Briefcase,
  Search,
} from "lucide-react";
import { toggleMentorAcceptance } from "@/app/actions/officer";

export interface MentorCapacityItem {
  id: string;
  mentorId: string;
  name: string;
  company: string;
  jobTitle: string;
  industry: string;
  maxMentees: number;
  activeMentees: number;
  saturationPercentage: number;
  isAtCapacity: boolean;
  acceptingRequests: boolean;
  status: string;
}

interface CapacityWatchdogProps {
  initialMentors: MentorCapacityItem[];
}

export function CapacityWatchdog({ initialMentors }: CapacityWatchdogProps) {
  const [mentors, setMentors] = useState<MentorCapacityItem[]>(initialMentors);
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredMentors = mentors.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      m.jobTitle.toLowerCase().includes(q) ||
      m.industry.toLowerCase().includes(q)
    );
  });

  const totalCapacity = mentors.reduce((acc, m) => acc + m.maxMentees, 0);
  const totalActive = mentors.reduce((acc, m) => acc + m.activeMentees, 0);
  const saturatedMentorsCount = mentors.filter((m) => m.isAtCapacity).length;
  const overallUtilization = totalCapacity > 0 ? Math.round((totalActive / totalCapacity) * 100) : 0;

  const handleToggle = async (mentor: MentorCapacityItem) => {
    setTogglingId(mentor.mentorId);
    setFeedback(null);
    const newStatus = !mentor.acceptingRequests;

    try {
      const res = await toggleMentorAcceptance(mentor.mentorId, newStatus);
      if (res.success) {
        setMentors((prev) =>
          prev.map((m) =>
            m.mentorId === mentor.mentorId
              ? {
                  ...m,
                  acceptingRequests: newStatus,
                  status: newStatus ? (m.isAtCapacity ? "at_capacity" : "available") : "paused",
                }
              : m
          )
        );
        setFeedback({
          type: "success",
          text: `Mentor intake for ${mentor.name} is now ${newStatus ? "resumed" : "paused"}.`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update intake status." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-semibold underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Aggregate Saturation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Total Program Slots</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{totalActive}</span>
            <span className="text-xs text-stone-400">/ {totalCapacity} slots filled</span>
          </div>
          {/* Global Progress Bar */}
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallUtilization > 85 ? "bg-amber-500" : "bg-primary-600"
              }`}
              style={{ width: `${Math.min(100, overallUtilization)}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Overall Utilization</span>
            <span className="text-xs font-semibold text-primary-600">{overallUtilization}%</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">{overallUtilization}%</p>
          <p className="text-[11px] text-stone-500">
            {overallUtilization > 90
              ? "High capacity demand. Consider onboarding new alumni mentors."
              : "Healthy mentor capacity balance across all active departments."}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Mentors at 100% Limit</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{saturatedMentorsCount}</p>
          <p className="text-[11px] text-stone-500">
            Invariant 1 strictly enforced: No student can request intro past declared limit.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by mentor name, company, title, or industry..."
          className="w-full bg-white border border-stone-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-600/15 focus:border-stone-400 transition-all shadow-2xs"
        />
      </div>

      {/* Mentors Capacity Listing */}
      <div className="space-y-3">
        {filteredMentors.length === 0 ? (
          <div className="p-12 text-center bg-white border border-stone-200/80 rounded-2xl shadow-xs">
            <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h4 className="font-semibold text-stone-800 text-sm">No mentors match your search</h4>
            <p className="text-xs text-stone-500 mt-1">Try another search term or clear the filter.</p>
          </div>
        ) : (
          filteredMentors.map((m) => {
            const isToggling = togglingId === m.mentorId;
            const initials = m.name
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={m.id}
                className="p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Mentor Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm flex items-center justify-center shrink-0">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-stone-900 text-sm truncate">{m.name}</h4>

                      {/* Status Badges */}
                      {m.isAtCapacity && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                          At Capacity (100%)
                        </span>
                      )}
                      {!m.acceptingRequests && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700">
                          Intake Paused
                        </span>
                      )}
                      {m.acceptingRequests && !m.isAtCapacity && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Accepting
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                        <span>{m.jobTitle}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>{m.company}</span>
                      </span>
                      <span className="text-stone-400 text-[11px]">• {m.industry}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Saturation Gauge & Intake Switch */}
                <div className="flex items-center gap-6 self-end md:self-center shrink-0">
                  {/* Saturation Bar */}
                  <div className="w-36 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-stone-800">
                        {m.activeMentees} / {m.maxMentees}
                      </span>
                      <span className="text-stone-400">{m.saturationPercentage}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.isAtCapacity
                            ? "bg-rose-500"
                            : m.saturationPercentage >= 75
                            ? "bg-amber-500"
                            : "bg-primary-600"
                        }`}
                        style={{ width: `${Math.min(100, m.saturationPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Toggle Intake Button */}
                  <button
                    onClick={() => handleToggle(m)}
                    disabled={isToggling || (!m.acceptingRequests && m.isAtCapacity)}
                    title={
                      !m.acceptingRequests && m.isAtCapacity
                        ? "Cannot resume intake: Mentor is at declared max limit"
                        : m.acceptingRequests
                        ? "Click to pause incoming requests"
                        : "Click to resume requests"
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      m.acceptingRequests
                        ? "bg-stone-100 hover:bg-stone-200/80 text-stone-700"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : m.acceptingRequests ? (
                      <PauseCircle className="w-3.5 h-3.5 text-stone-500" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{m.acceptingRequests ? "Pause Intake" : "Resume Intake"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
