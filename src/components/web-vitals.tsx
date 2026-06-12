"use client";

import { onLCP, onINP, onCLS, onFCP, onTTFB } from "web-vitals";
import { useEffect } from "react";

/**
 * P2: Web Vitals reporter.
 *
 * - In dev: console.log
 * - In prod: console.log (no analytics sink yet — can be added to a
 *   logging endpoint later)
 *
 * Why client-side: web-vitals must run after hydration to attach to
 * real user interactions, and Next.js emits them via PerformanceObserver
 * which is browser-only.
 */
export function WebVitals() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const send = (metric: { name: string; value: number; id: string; rating?: string }) => {
      // eslint-disable-next-line no-console
      console.info(
        `[web-vital] ${metric.name}=${Math.round(metric.value)} (${metric.rating ?? "?"})`,
        metric,
      );
    };
    onLCP(send);
    onINP(send);
    onCLS(send);
    onFCP(send);
    onTTFB(send);
  }, []);
  return null;
}
