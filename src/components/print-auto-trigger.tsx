"use client";

/**
 * PrintAutoTrigger — fires window.print() 1.5s after mount, with
 * a clear opt-out: a small "× 不打印" button that cancels the
 * pending timer. After 1.5s the auto-print is unavoidable (the
 * browser print dialog will pop up regardless), so the user can
 * always hit Cancel in the dialog. The opt-out here is for the
 * "I want to look at this page first before deciding" case.
 *
 * Also: if the user has localStorage "atlas-kit:auto-print" set
 * to "off" (set by a previous opt-out click), don't auto-print at
 * all. This makes the opt-out sticky.
 */
import { useEffect, useRef, useState } from "react";
import { X, Printer } from "lucide-react";

const AUTO_PRINT_KEY = "atlas-kit:auto-print";
const COUNTDOWN_SECONDS = 3;

export function PrintAutoTrigger() {
  const [cancelled, setCancelled] = useState(false);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [enabled, setEnabled] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Respect a previous opt-out (user clicked "不打印" last time)
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(AUTO_PRINT_KEY);
    if (stored === "off") {
      setEnabled(false);
      return;
    }

    // Countdown 3s, then fire
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    timerRef.current = setTimeout(() => {
      if (typeof window !== "undefined") window.print();
    }, COUNTDOWN_SECONDS * 1000);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCancelled(true);
    // Make the opt-out sticky for the rest of this session + future
    // visits. User can still click the "再次打印" button on the page.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTO_PRINT_KEY, "off");
    }
  };

  const handleManualPrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  if (!enabled || cancelled) {
    return (
      <div className="no-print fixed bottom-6 right-6 z-10 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-card-hover">
        <Printer className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <button
          type="button"
          onClick={handleManualPrint}
          className="text-sm font-medium text-foreground hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          打印此页
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-6 right-6 z-10 flex items-center gap-2 rounded-full border border-gold-deep bg-card px-3 py-2 shadow-card-hover"
    >
      <span className="flex items-center gap-1.5 text-sm text-foreground">
        <span className="h-2 w-2 rounded-full bg-gold-deep animate-pulse" aria-hidden="true" />
        即将打印 ({remaining}s)
      </span>
      <button
        type="button"
        onClick={handleCancel}
        aria-label="取消自动打印"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        <X className="h-3 w-3" aria-hidden="true" />
        取消
      </button>
    </div>
  );
}
