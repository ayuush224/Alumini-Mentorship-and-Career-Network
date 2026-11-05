import React from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFF] text-slate-800 selection:bg-blue-100 selection:text-blue-600">
      {children}
    </div>
  );
}
