"use client";
import { useEffect, useState } from "react";

/**
 * R77 (2026-07-10) reading progress bar — shows scroll progress on
 * long-form pages like /cards/[slug] (which can run 4000+ words across
 * history + sources + revisions). Without this, users have no
 * sense-of-place when they scroll past the fold: is the page 10% done
 * or 90%?
 *
 * Design choices:
 *
 * - **2px sticky-top bar**: thin, gold-deep, doesn't compete with the
 *   SiteHeader (which is 56-64px tall). Visible while scrolling, fades
 *   when scroll = 0 or scroll = 100% (so the bar doesn't nag at the
 *   very top or at the very bottom).
 *
 * - **Calculated via requestAnimationFrame**: reading scrollHeight every
 *   scroll event would be a layout thrash. We rAF-throttle so we never
 *   measure more than once per animation frame regardless of how
 *   fast the user scrolls.
 *
 * - **Fixed-100% offset**: instead of counting from body height to 0,
 *   we compute how much of the document has been scrolled past. At top
 *   (scrollY=0), progress = 0. When the bottom of the page reaches
 *   the bottom of the viewport, progress = 1. Linear interpolation
 *   in between. This matches the GitHub PR / Wikipedia table-of-
 *   contents indicator pattern readers expect.
 *
 * - **SSR-safe**: useState's initializer returns 0 (the default), so
 *   the server-rendered output is a 0%-width bar. Hydration happens
 *   on the client, then a single rAF tick kicks in to set the real
 *   value. No hydration mismatch flash.
 *
 * - **Print hides**: when printing (`@media print`), the bar would
 *   appear at the top of every page in the printed A4 output,
 *   which looks like noise. `print:hidden` Tailwind utility drops it.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      // Avoid divide-by-zero on pages shorter than viewport.
      const pct = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
      setProgress(pct);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial measurement after mount (covers deep-link arrivals
    // where the user lands scrolled-down, e.g. browser back-button
    // restoring scroll position).
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-0.5 print:hidden"
    >
      <div
        className="h-full origin-left bg-gold-deep transition-[width] duration-100 ease-out"
        style={{
          // Hide at exactly 0 or 1 to avoid a "stuck bar" feeling.
          width: `${progress * 100}%`,
          opacity: progress > 0 && progress < 1 ? 1 : 0,
        }}
      />
    </div>
  );
}