"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  ShieldCheck,
  Activity,
  Users,
  ArrowRight,
  CheckCircle2,
  Building2,
  Award,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { nudgeMentorship, decideVerification } from "@/app/actions/officer";

export interface VerificationPreviewItem {
  id: string;
  alumnusName: string;
  alumnusId: string;
  degree: string;
  graduationYear: number;
  institutionalIdentifier: string;
  status: string;
  submittedAt: string;
  documentCount: number;
}

export interface PairingPreviewItem {
  id: string;
  studentName: string;
  mentorName: string;
  daysInactive: number;
  health: "healthy" | "at_risk" | "stalled";
  canNudge: boolean;
  cooldownRemainingDays: number;
  startDate: string;
}

export interface SaturatedMentorItem {
  id: string;
  mentorId: string;
  name: string;
  activeMentees: number;
  maxMentees: number;
}

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
  actorRole: string;
  details: Record<string, unknown>;
}

interface OfficerDashboardViewProps {
  officer: {
    name: string;
    role: string;
    institutionName: string;
    institutionId: string;
  };
  metrics: {
    pendingVerifications: number;
    verifiedAlumni: number;
    activeMentorships: number;
    stalledMentorships: number;
    mentorSaturationRate: number;
    totalMentors: number;
  };
  momentumDistribution: Array<{ name: string; count: number; fill: string }>;
  capacityDistribution: Array<{ status: string; count: number; fill: string }>;
  saturatedMentors: SaturatedMentorItem[];
  recentVerifications: VerificationPreviewItem[];
  recentPairings: PairingPreviewItem[];
  auditLogs: AuditLogItem[];
}

function formatAuditTime(timestampStr: string) {
  try {
    const d = new Date(timestampStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return timestampStr;
  }
}

export function OfficerDashboardView({
  officer,
  metrics,
  momentumDistribution,
  capacityDistribution,
  saturatedMentors,
  recentVerifications,
  recentPairings,
  auditLogs,
}: OfficerDashboardViewProps) {
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [actingVerifId, setActingVerifId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [verificationsList, setVerificationsList] =
    useState<VerificationPreviewItem[]>(recentVerifications);
  const [pairingsList, setPairingsList] = useState<PairingPreviewItem[]>(recentPairings);

  const handleQuickNudge = async (pairing: PairingPreviewItem) => {
    setNudgingId(pairing.id);
    setFeedback(null);
    try {
      const res = await nudgeMentorship(pairing.id);
      if (res.success) {
        setPairingsList((prev) =>
          prev.map((p) => (p.id === pairing.id ? { ...p, canNudge: false, cooldownRemainingDays: 7 } : p))
        );
        setFeedback({
          type: "success",
          text: `Engagement nudge dispatched to ${pairing.studentName} and ${pairing.mentorName}.`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to trigger nudge." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setNudgingId(null);
    }
  };

  const handleQuickApprove = async (verif: VerificationPreviewItem) => {
    setActingVerifId(verif.id);
    setFeedback(null);
    try {
      const res = await decideVerification(verif.id, "verified");
      if (res.success) {
        setVerificationsList((prev) => prev.filter((v) => v.id !== verif.id));
        setFeedback({
          type: "success",
          text: `Alumnus ${verif.alumnusName} verified and admitted to mentor directory.`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to approve verification." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error occurred." });
    } finally {
      setActingVerifId(null);
    }
  };

  const totalMomentumPairs = momentumDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all animate-in fade-in ${
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

      {/* =====================================================================
          1. EXECUTIVE WELCOME BANNER (LIGHT BACKGROUND)
      ====================================================================== */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative texture & light ambient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-50/80 via-white to-amber-50/20 pointer-events-none" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-100 border border-stone-200/80 text-stone-700 text-xs font-semibold shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-primary-600" />
              <span className="capitalize">{officer.institutionName}</span>
              <span className="text-stone-300">&bull;</span>
              <span className="text-stone-600 font-medium">Command Center</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif tracking-tight text-stone-900 leading-tight">
              Executive Mentorship Command Center
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed">
              Live monitoring of credential verification throughput, relationship health momentum, and institutional mentor saturation.
            </p>
          </div>

          {/* Quick Metrics Badges (Light Themed) */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="px-5 py-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center shadow-2xs min-w-[125px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">
                Pending Verification
              </span>
              <span className="text-2xl font-bold font-serif text-amber-900 mt-0.5 block">
                {metrics.pendingVerifications}
              </span>
            </div>

            <div className="px-5 py-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-center shadow-2xs min-w-[125px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800 block">
                Stalled Pairs
              </span>
              <span className="text-2xl font-bold font-serif text-rose-900 mt-0.5 block">
                {metrics.stalledMentorships}
              </span>
            </div>

            <div className="px-5 py-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 text-center shadow-2xs min-w-[125px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600 block">
                Mentor Saturation
              </span>
              <span className="text-2xl font-bold font-serif text-stone-900 mt-0.5 block">
                {metrics.mentorSaturationRate}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. TOP KPI CARDS (HIGH CONTRAST & PROFESSIONAL METRICS)
      ====================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-2.5 hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Verified Alumni Mentors</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-stone-900">{metrics.verifiedAlumni}</span>
            <span className="text-xs text-stone-500 font-medium">mentors enrolled</span>
          </div>
          <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Degrees &amp; credentials accredited</span>
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-2.5 hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Active Relationships</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-primary-600 border border-amber-200 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-stone-900">{metrics.activeMentorships}</span>
            <span className="text-xs text-stone-500 font-medium">active pairings</span>
          </div>
          <p className="text-[11px] text-stone-500">
            {metrics.stalledMentorships > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>{metrics.stalledMentorships} relationship(s) stalled</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>100% active momentum</span>
              </span>
            )}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-2.5 hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Capacity Saturation</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-stone-900">{metrics.mentorSaturationRate}%</span>
            <span className="text-xs text-stone-500 font-medium">capacity utilized</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  metrics.mentorSaturationRate > 85 ? "bg-rose-500" : metrics.mentorSaturationRate > 65 ? "bg-amber-500" : "bg-primary-600"
                }`}
                style={{ width: `${Math.min(100, metrics.mentorSaturationRate)}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-400">Hard limit: Invariant 1 active</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-2.5 hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Governance Benchmark</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-stone-900">4.8</span>
            <span className="text-xs text-stone-500 font-medium">/ 5.0 rating</span>
          </div>
          <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>96% student satisfaction index</span>
          </p>
        </div>
      </section>

      {/* =====================================================================
          3. DIAGRAMMATIC VISUAL REPORTS (CHARTS WITH RECHARTS)
      ====================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagrammatic Report 1: Relationship Momentum Health */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Relationship Health Momentum</span>
              </h2>
              <Link
                href="/officer/momentum"
                className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
              >
                <span>Full Watchdog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-stone-500 mb-6">
              Classification of active pairings based on check-in recency (Healthy &lt;8d, At-Risk 8–13d, Stalled 14+d).
            </p>

            <div className="h-64 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-stone-900">{d.name}</p>
                            <p className="font-mono text-stone-600">{d.count} pairings</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={momentumDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {momentumDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold font-serif text-stone-900 leading-none">
                  {totalMomentumPairs}
                </span>
                <span className="text-[10px] uppercase font-semibold text-stone-400 mt-1">
                  Active Pairs
                </span>
              </div>
            </div>
          </div>

          {/* Chart Legend & Summary Bar */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-100 text-center">
            {momentumDistribution.map((item) => (
              <div key={item.name} className="p-2.5 rounded-2xl bg-stone-50/80 border border-stone-100">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <p className="text-lg font-bold font-serif text-stone-900 mt-0.5">{item.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Diagrammatic Report 2: Mentor Saturation & Capacity Load */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                <span>Mentor Capacity &amp; Saturation</span>
              </h2>
              <Link
                href="/officer/capacity"
                className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
              >
                <span>Manage Limits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-stone-500 mb-6">
              Distribution of alumni mentor workload guaranteeing Invariant 1 limits are never exceeded.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={capacityDistribution}
                  margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                >
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={{ stroke: "#e7e5e4" }}
                    tick={{ fontSize: 11, fill: "#78716c", fontWeight: 500 }}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: "#e7e5e4" }}
                    tick={{ fontSize: 11, fill: "#78716c" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-stone-900">{d.status}</p>
                            <p className="font-mono text-stone-600">{d.count} alumni mentors</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {capacityDistribution.map((entry, index) => (
                      <Cell key={`cell-cap-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Capacity Safeguard Note */}
          <div className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Invariant 1: Automated request throttling active</span>
            </span>
            <span className="font-bold text-stone-900">{metrics.totalMentors} mentors tracked</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. PRIORITY ATTENTION ACTION FEEDS
      ====================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Action Box: Priority Pending Verifications */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Priority Pending Verifications
                </h3>
                <p className="text-xs text-stone-500">
                  {verificationsList.length} alumni awaiting credential accreditation
                </p>
              </div>
            </div>
            <Link
              href="/officer/verifications"
              className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {verificationsList.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-stone-800">
                All verification requests reviewed!
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                New submissions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationsList.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl border border-stone-100 bg-stone-50/60 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-stone-900 truncate">{v.alumnusName}</p>
                    <p className="text-[11px] text-stone-600 truncate">
                      {v.degree} &bull; Class of {v.graduationYear}
                    </p>
                    <span className="inline-block font-mono text-[10px] text-stone-400 bg-white px-1.5 py-0.5 rounded border border-stone-200/60">
                      ID: {v.institutionalIdentifier}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickApprove(v)}
                      disabled={actingVerifId === v.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {actingVerifId === v.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve</span>
                    </button>
                    <Link
                      href="/officer/verifications"
                      className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors shadow-2xs"
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Box: Stalled Mentorships Requiring Nudge */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-rose-600" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Stalled Mentorship Action Feed
                </h3>
                <p className="text-xs text-stone-500">
                  Relationships inactive for 14+ days requiring intervention
                </p>
              </div>
            </div>
            <Link
              href="/officer/momentum"
              className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pairingsList.filter((p) => p.health === "stalled").length === 0 ? (
            <div className="p-8 text-center border border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
              <Activity className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-stone-800">
                Zero stalled mentorship relationships!
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                All active pairings have recorded check-in activity within the last 13 days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pairingsList
                .filter((p) => p.health === "stalled")
                .slice(0, 3)
                .map((p) => {
                  const isNudging = nudgingId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {p.studentName}{" "}
                          <span className="text-stone-400 font-normal">&bull;</span>{" "}
                          <span className="text-stone-700">{p.mentorName}</span>
                        </p>
                        <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>{p.daysInactive} days inactive</span>
                        </p>
                      </div>

                      <div className="shrink-0">
                        {p.canNudge ? (
                          <button
                            type="button"
                            onClick={() => handleQuickNudge(p)}
                            disabled={isNudging}
                            className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isNudging ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Trigger Nudge</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-500 bg-white px-2.5 py-1 rounded-lg border border-stone-200/80 font-medium">
                            Cooldown ({p.cooldownRemainingDays}d)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          5. BOTTOM SECTION: CAPACITY LIMITS & LIVE AUDIT STREAM
      ====================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saturated Mentors Warning Card */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-primary-600" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Capacity Watchdog
                </h3>
                <p className="text-xs text-stone-500">Mentors at declared limit ceiling</p>
              </div>
            </div>
            <Link
              href="/officer/capacity"
              className="text-xs font-semibold text-primary-600 hover:underline"
            >
              Manage &rarr;
            </Link>
          </div>

          {saturatedMentors.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-6">
              No mentors are currently at maximum declared capacity.
            </p>
          ) : (
            <div className="space-y-2.5">
              {saturatedMentors.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-stone-900 truncate">{m.name}</p>
                    <p className="text-[11px] text-stone-500">
                      {m.activeMentees} of {m.maxMentees} active mentees
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200/60 shrink-0">
                    100% Saturated
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Audit Log Stream */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Recent Institutional Audit Stream
              </h3>
              <p className="text-xs text-stone-500">
                Compliance trail for credential reviews and governance decisions
              </p>
            </div>
            <Link
              href="/officer/reports"
              className="text-xs font-semibold text-primary-600 hover:underline"
            >
              Full Audit Trail &rarr;
            </Link>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-6">
              No audit events recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-3 px-2 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/60 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold text-stone-800 bg-stone-100 border border-stone-200/70 px-2.5 py-0.5 rounded-lg shadow-2xs">
                      {log.action}
                    </span>
                    <span className="text-stone-600 font-medium truncate">{log.resource}</span>
                    <span className="text-stone-400 text-[11px]">by {log.actorRole}</span>
                  </div>

                  <div className="flex items-center gap-1 text-stone-400 text-[11px] font-mono shrink-0">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{formatAuditTime(log.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
