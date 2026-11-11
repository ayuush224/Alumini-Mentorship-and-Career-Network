import React from "react";

export default function MentorLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-stone-200 rounded" />
            <div className="h-8 w-64 bg-stone-300 rounded-lg" />
          </div>
          <div className="w-12 h-12 rounded-full bg-stone-200" />
        </div>
      </div>

      {/* Metrics Grid */}
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
            <div className="h-8 w-14 bg-stone-300 rounded-lg" />
            <div className="h-3 w-28 bg-stone-100 rounded" />
          </div>
        ))}
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
          <div className="h-5 w-40 bg-stone-300 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-stone-100 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
          <div className="h-5 w-32 bg-stone-300 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-stone-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
