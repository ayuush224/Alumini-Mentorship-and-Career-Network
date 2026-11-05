"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  ArrowRight,
  Plus,
  ExternalLink,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { StudentCareerProfileViewData } from "@/app/actions/profile";
import { StudentCareerProfileModal } from "../../requests/_components/student-career-profile-modal";
import { AddMenteeTaskModal } from "./add-mentee-task-modal";
import {
  MenteeReportModal,
  MenteeReportData,
} from "./mentee-report-modal";

export interface ActiveMenteeItem {
  id: string; // student user id
  mentorshipId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  major?: string;
  graduationYear?: number;
  startDate: string; // ISO
  careerProfile: StudentCareerProfileViewData;
  report: MenteeReportData;
}

interface MentorMenteesViewProps {
  mentees: ActiveMenteeItem[];
}

export function MentorMenteesView({ mentees }: MentorMenteesViewProps) {
  // Modal states
  const [selectedMenteeForProfile, setSelectedMenteeForProfile] =
    useState<ActiveMenteeItem | null>(null);
  const [selectedMenteeForTask, setSelectedMenteeForTask] =
    useState<ActiveMenteeItem | null>(null);
  const [selectedMenteeForReport, setSelectedMenteeForReport] =
    useState<ActiveMenteeItem | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const handleTaskSuccess = (taskTitle: string) => {
    if (selectedMenteeForTask) {
      setToastNotification(
        `✓ Assigned "${taskTitle}" to ${selectedMenteeForTask.name}! It is now active on their dashboard.`
      );
      setTimeout(() => setToastNotification(null), 5000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <span className="uppercase tracking-widest text-[10px] font-semibold text-[#2563EB] font-mono">
          ACTIVE RELATIONSHIPS
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-1">
          Your Mentees
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Manage your ongoing student mentorships, assign structured sub-tasks, and review student career dossiers.
        </p>
      </div>

      {/* Floating Success Banner */}
      {toastNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {mentees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentees.map((m) => {
            const initials = m.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const pairedDate = new Date(m.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 hover:shadow-sm transition-all"
              >
                {/* Clickable Mentee Info Header (Opens Full Career Dossier) */}
                <div
                  onClick={() => setSelectedMenteeForProfile(m)}
                  className="flex items-start justify-between cursor-pointer group"
                  title="Click to view verified student career dossier"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#2563EB]/10 text-[#2563EB] font-bold flex items-center justify-center text-xs border border-stone-200 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      {m.avatarUrl ? (
                        <Image
                          src={m.avatarUrl}
                          alt={m.name}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-sm truncate group-hover:text-[#2563EB] transition-colors">
                          {m.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold shrink-0">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {m.major || "Computer Science"} &bull; Class of {m.graduationYear || 2026}
                      </p>
                      <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                        Paired on {pairedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 group-hover:text-[#2563EB] transition-colors shrink-0 ml-2 pt-1">
                    <span className="hidden sm:inline">Career Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card Action Bar: Add Task, Report & Message */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMenteeForTask(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Add Task</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMenteeForReport(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold transition-colors shadow-2xs cursor-pointer"
                      title="View student task completion rate & personal sessions report"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Report</span>
                    </button>
                  </div>

                  <Link
                    href={`/mentor/chat?mentorshipId=${m.mentorshipId}&menteeId=${m.id}`}
                    className="text-[#2563EB] hover:text-[#c9543a] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Message</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900 font-serif mb-1">
            No active mentees yet
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            When students send intro requests and you accept them, their profiles, task checklists, and mentorship timelines will appear here.
          </p>
          <Link
            href="/mentor/requests"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors"
          >
            <span>Check pending requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 1. Add Sub-Task Modal (Matches user's reference screenshot) */}
      <AddMenteeTaskModal
        isOpen={Boolean(selectedMenteeForTask)}
        onClose={() => setSelectedMenteeForTask(null)}
        mentee={
          selectedMenteeForTask
            ? {
                id: selectedMenteeForTask.id,
                name: selectedMenteeForTask.name,
                mentorshipId: selectedMenteeForTask.mentorshipId,
              }
            : null
        }
        onSuccess={handleTaskSuccess}
      />

      {/* 2. Student Career Profile Modal (Same view as in mentor requests) */}
      {selectedMenteeForProfile && (
        <StudentCareerProfileModal
          isOpen={Boolean(selectedMenteeForProfile)}
          onClose={() => setSelectedMenteeForProfile(null)}
          profile={selectedMenteeForProfile.careerProfile}
        />
      )}

      {/* 3. Mentee Analytics & Performance Report Modal */}
      {selectedMenteeForReport && (
        <MenteeReportModal
          isOpen={Boolean(selectedMenteeForReport)}
          onClose={() => setSelectedMenteeForReport(null)}
          mentee={selectedMenteeForReport}
          onOpenAddTask={() => {
            const m = selectedMenteeForReport;
            setSelectedMenteeForReport(null);
            setSelectedMenteeForTask(m);
          }}
        />
      )}
    </div>
  );
}
