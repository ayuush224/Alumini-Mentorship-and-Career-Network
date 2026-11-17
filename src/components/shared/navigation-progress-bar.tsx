"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Instant Global Navigation Progress Bar
 *
 * Provides immediate (< 16ms) tactile visual feedback across all route changes.
 * Automatically triggers whenever an internal navigation link is clicked,
 * and clears as soon as the target page mounts and pathname/searchParams update.
 */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [, startTransition] = useTransition();

  // Reset navigation indicator whenever route transition completes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Capture user link clicks immediately to provide instant tactile response
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore clicks with modifier keys (new tab, new window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }

      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Only trigger for same-origin internal navigations
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        targetAttr !== "_blank" &&
        !anchor.hasAttribute("download")
      ) {
        // If clicking the current path, don't trigger
        const currentPath = window.location.pathname + window.location.search;
        if (href === currentPath) return;

        startTransition(() => {
          setIsNavigating(true);
        });
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[2.5px] overflow-hidden pointer-events-none"
    >
      <div className="h-full w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 animate-[pulse_1s_ease-in-out_infinite]" />
    </div>
  );
}
