"use client";

/**
 * PrintAutoTrigger — auto-fires window.print() once on mount.
 * Used by the /print/cards/[slug] route so the user lands on a
 * "ready to print" page instead of having to hit Cmd/Ctrl+P
 * themselves.
 *
 * Why not put window.print() inline: SSR can't call it. We need
 * a client island to fire it after hydration.
 *
 * Why only once: useEffect with empty deps runs once. If the user
 * cancels and re-prints, the button at the top of the page can
 * re-trigger.
 */
import { useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrintAutoTrigger() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    // Small delay so the page paints + the user notices "we're in
    // print mode" before the print dialog steals focus. 600ms is
    // long enough for first paint, short enough to feel automatic.
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Manual print button — in case auto-print was cancelled, or the
  // user navigates back, the page has a "再次打印" affordance.
  // Hidden in print media via print:hidden.
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "print:hidden inline-flex items-center gap-1.5 rounded-md bg-gold-deep px-3 py-1.5 text-xs font-medium text-cream",
        "hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "transition-colors",
      )}
      aria-label="再次触发打印对话框"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      再次打印
    </button>
  );
}
