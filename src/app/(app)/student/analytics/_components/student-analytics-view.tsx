"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { StudentAnalyticsOverview } from "@/lib/utils/analytics";

interface StudentAnalyticsViewProps {
  analytics: StudentAnalyticsOverview;
  studentName?: string;
}

export function StudentAnalyticsView({
  analytics,
  studentName = "Student",
}: StudentAnalyticsViewProps) {
  // SVG Radial Ring Calculation for Isolated Mentor Completeness (Green Chart)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (analytics.mentorTaskCompleteness / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* =====================================================================
          HEADER WITH TOTAL POINTS REPUTATION METRIC
      ====================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-[#2563EB] font-mono">
            80/20 WEIGHTED ANALYTICS ENGINE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-1">
            Performance &amp; Momentum
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            12-month timeline for {studentName} calculating 80% weight for mentor assignments and 20% for personal goals.
          </p>
        </div>

        {/* Total Points Badge */}
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                Total Reputation Points
              </p>
              <p className="text-xl font-bold text-stone-900 flex items-center gap-1.5">
                <span>{analytics.totalPoints} pts</span>
                <span className="text-xs font-normal text-emerald-600 font-mono">
                  (+20/task)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TOP STATS SUMMARY CARDS
      ====================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Momentum Score */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase font-mono">
              Momentum Score
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {analytics.momentumScore} / 100
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Weighted 80/20 rolling average
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Mentor Task Milestone */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase font-mono">
              Mentor Assignments
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {analytics.completedMentorTasks} / {analytics.totalMentorTasks}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {analytics.mentorTaskCompleteness}% completion rate
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Student Personal Tasks */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase font-mono">
              Personal Sub-Tasks
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">
              {analytics.completedStudentTasks} / {analytics.totalStudentTasks}
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Self-directed milestones
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          CHARTS ROW: 12-MONTH BLUE BAR CHART + GREEN RADIAL CHART
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. 12-MONTH BLUE BAR CHART (2 COLS) */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>12-Month Performance Trajectory</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-semibold">
                80/20 Weighted Score
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-6">
              Native MongoDB aggregation group by month ($dateToString) factoring 80% weight on mentor milestones and 20% on self sub-tasks.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-md text-xs space-y-1.5">
                            <p className="font-bold text-stone-900">{data.month} ({data.label})</p>
                            <p className="text-blue-700 font-semibold font-mono">
                              Weighted Score: {data.weightedScore}%
                            </p>
                            <div className="pt-1.5 border-t border-stone-100 text-[11px] text-stone-600 space-y-0.5">
                              <p>
                                &bull; Mentor tasks: {data.mentorCompleted}/{data.mentorTotal} (80% wt)
                              </p>
                              <p>
                                &bull; Student tasks: {data.studentCompleted}/{data.studentTotal} (20% wt)
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="weightedScore"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>Cache: revalidate = 3600s</span>
            <span>Scale: 0 - 100% Weighted Completeness</span>
          </div>
        </section>

        {/* 2. GREEN RADIAL CHART ISOLATING MENTOR TASK COMPLETENESS (1 COL) */}
        <section className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>Mentor Task Completeness</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                Isolated Metric
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Focuses exclusively on milestones assigned by your mentor.
            </p>

            {/* Radial Green Ring */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    className="text-stone-100"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    className="text-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold font-mono text-stone-900">
                    {analytics.mentorTaskCompleteness}%
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Callouts */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-center space-y-1">
              <p className="text-xs font-bold text-emerald-900">
                {analytics.completedMentorTasks} of {analytics.totalMentorTasks} Tasks Completed
              </p>
              <p className="text-[11px] text-emerald-700 leading-snug">
                Every mentor assignment earned +20 reputation points upon completion.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100">
            <Link
              href="/student/dashboard"
              className="w-full py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
