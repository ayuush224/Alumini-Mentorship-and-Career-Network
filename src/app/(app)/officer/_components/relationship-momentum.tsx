"use client";

import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Calendar,
} from "lucide-react";
import { nudgeMentorship } from "@/app/actions/officer";

export interface MomentumPairingItem {
  id: string;
  studentId: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  startDate: string;
  daysInactive: number;
  health: "healthy" | "at_risk" | "stalled";
  lastSessionDate: string | null;
  canNudge: boolean;
  cooldownRemainingDays: number;
  lastNudgeIssuedAt: string | null;
}

interface RelationshipMomentumProps {
  initialPairings: MomentumPairingItem[];
}

export function RelationshipMomentum({ initialPairings }: RelationshipMomentumProps) {
  const [pairings, setPairings] = useState<MomentumPairingItem[]>(initialPairings);
  const [filter, setFilter] = useState<"all" | "stalled" | "at_risk" | "healthy">("all");
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredPairings = pairings.filter((p) => {
    if (filter === "all") return true;
    return p.health === filter;
  });

  const stalledCount = pairings.filter((p) => p.health === "stalled").length;
  const atRiskCount = pairings.filter((p) => p.health === "at_risk").length;
  const healthyCount = pairings.filter((p) => p.health === "healthy").length;

  const handleNudge = async (pairing: MomentumPairingItem) => {
    setNudgingId(pairing.id);
    setFeedback(null);

    try {
      const res = await nudgeMentorship(pairing.id);
      if (res.success) {
        setPairings((prev) =>
          prev.map((p) =>
            p.id === pairing.id
              ? {
                  ...p,
                  canNudge: false,
                  cooldownRemainingDays: 7,
                  lastNudgeIssuedAt: new Date().toISOString(),
                }
              : p
          )
        );
        setFeedback({
          type: "success",
          text: `Engagement nudge dispatched to ${pairing.studentName} and ${pairing.mentorName} via in-app notification & email.`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to issue nudge." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setNudgingId(null);
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

      {/* Health Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter("healthy")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filter === "healthy"
              ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200"
              : "bg-white border-stone-200/80 hover:border-emerald-200 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Healthy Momentum</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{healthyCount}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Active within last 7 days</p>
        </div>

        <div
          onClick={() => setFilter("at_risk")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filter === "at_risk"
              ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-200"
              : "bg-white border-stone-200/80 hover:border-amber-200 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">At Risk</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{atRiskCount}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">8 – 13 days of inactivity</p>
        </div>

        <div
          onClick={() => setFilter("stalled")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filter === "stalled"
              ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-200"
              : "bg-white border-stone-200/80 hover:border-rose-200 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Stalled Mentorships</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{stalledCount}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">≥ 14 days without activity</p>
        </div>
      </div>

      {/* Filter Reset Button if active */}
      {filter !== "all" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Filtered by: <strong className="capitalize text-stone-800">{filter.replace("_", " ")}</strong>
          </span>
          <button
            onClick={() => setFilter("all")}
            className="text-xs font-medium text-[#2563EB] hover:underline"
          >
            Show All Active Pairings ({pairings.length})
          </button>
        </div>
      )}

      {/* Pairings List */}
      {filteredPairings.length === 0 ? (
        <div className="p-12 text-center bg-white border border-stone-200/80 rounded-2xl shadow-xs">
          <Activity className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h4 className="font-semibold text-stone-800 text-sm">No pairings in this state</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {filter === "stalled"
              ? "Excellent! No mentorship pairings are currently stalled."
              : "No mentorships match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPairings.map((pairing) => {
            const isNudging = nudgingId === pairing.id;

            return (
              <div
                key={pairing.id}
                className="p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Pairing Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-stone-900">
                      {pairing.studentName}
                    </span>
                    <span className="text-stone-400 text-xs font-light">paired with</span>
                    <span className="font-semibold text-sm text-stone-900">
                      {pairing.mentorName}
                    </span>

                    {/* Health Tag */}
                    {pairing.health === "healthy" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>Healthy</span>
                      </span>
                    )}
                    {pairing.health === "at_risk" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>At Risk</span>
                      </span>
                    )}
                    {pairing.health === "stalled" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <span>Stalled</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-stone-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        <strong>{pairing.daysInactive}</strong> day
                        {pairing.daysInactive === 1 ? "" : "s"} since last session
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>Started {new Date(pairing.startDate).toLocaleDateString()}</span>
                    </span>
                    {pairing.lastNudgeIssuedAt && (
                      <span className="text-stone-400 text-[11px]">
                        Last nudged: {new Date(pairing.lastNudgeIssuedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Nudge Button */}
                <div className="self-end md:self-center shrink-0">
                  {pairing.health === "stalled" ? (
                    pairing.canNudge ? (
                      <button
                        onClick={() => handleNudge(pairing)}
                        disabled={isNudging}
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#c5563d] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isNudging ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Trigger Engagement Nudge</span>
                      </button>
                    ) : (
                      <div className="text-right">
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Nudge Cooldown Active</span>
                        </button>
                        <p className="text-[10px] text-stone-400 mt-1">
                          Available in {pairing.cooldownRemainingDays} day(s)
                        </p>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-stone-400 font-medium">Momentum active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
