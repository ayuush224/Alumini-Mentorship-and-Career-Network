"use client";

import React from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight Page Transition Wrapper
 *
 * Uses React's `key={pathname}` to trigger the GPU-accelerated `.animate-page-enter`
 * CSS animation whenever a client-side route navigation occurs.
 * Zero bundle overhead (0KB extra dependencies).
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={`animate-page-enter w-full h-full ${className}`}
    >
      {children}
    </div>
  );
}
