import React, { Suspense } from "react";
import { NavigationProgressBar } from "@/app/_components/navigation-progress-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-slate-800 selection:bg-blue-100 selection:text-blue-600">
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>
      {children}
    </div>
  );
}
