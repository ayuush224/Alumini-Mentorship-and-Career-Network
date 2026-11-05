import React from "react";

export default function OfficerLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-3">
        <div className="h-4 w-32 bg-stone-200 rounded-md" />
        <div className="h-8 w-64 bg-stone-300 rounded-lg" />
        <div className="h-4 w-96 bg-stone-200 rounded-md" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-stone-200/80 space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-stone-200 rounded" />
              <div className="w-8 h-8 rounded-lg bg-stone-100" />
            </div>
            <div className="h-8 w-16 bg-stone-300 rounded-lg" />
            <div className="h-3 w-28 bg-stone-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4">
        <div className="h-5 w-40 bg-stone-300 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-stone-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
