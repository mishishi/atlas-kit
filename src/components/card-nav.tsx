"use client";

/**
 * R34 (2026-06-17): 翻图录浏览体验 — prev/next in same series.
 *
 * Day 1: button bar + keyboard arrow nav.
 * Day 2: mobile touch swipe (horizontal: prev = right→left, next =
 *   left→right, matches native iOS/Android swipe-page convention).
 *
 * Server passes prev/next slugs + titles; client renders the bar,
 * listens for arrow keys + touch events, and navigates via
 * router.push(). Touch handler only attaches if pointer is coarse
 * (mobile) — desktop doesn't get wasted touch listeners.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type AdjacentRef = { slug: string; title: string; seriesNo: string } | null;

export function CardNav({
  prev,
  next,
}: {
  prev: AdjacentRef;
  next: AdjacentRef;
}) {
  const router = useRouter();
  // Track the start position (x + y) so we can measure horizontal
  // delta against vertical delta on touchend. Stored in a ref (not
  // state) so updates don't trigger re-render mid-swipe.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Keyboard: ←/→ + j/k (R41) navigates prev/next. Disabled when
  // nothing to navigate to (single-card series). Skips when user is
  // typing in an input/textarea/contenteditable.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      // R41: j/k are vim-style aliases. CapsLock and shift don't matter
      // (e.key is already lowercased by the browser for letter keys).
      if ((e.key === "ArrowLeft" || e.key === "k") && prev) {
        e.preventDefault();
        router.push(`/cards/${prev.slug}`);
      } else if ((e.key === "ArrowRight" || e.key === "j") && next) {
        e.preventDefault();
        router.push(`/cards/${next.slug}`);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  // Touch swipe: only attach on coarse-pointer devices (mobile).
  // Threshold = 50px horizontal delta AND |dx| > |dy| * 1.5 (so a
  // vertical scroll that happens to have 60px of horizontal jitter
  // won't accidentally trigger nav). iOS/Android convention:
  //   swipe left (dx<0) → next card
  //   swipe right (dx>0) → previous card
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isCoarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    if (!isCoarse) return; // desktop: no touch listener needed

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
    function onTouchEnd(e: TouchEvent) {
      if (touchStart.current == null) return;
      const start = touchStart.current;
      touchStart.current = null;
      const end = e.changedTouches[0];
      if (end == null) return;
      const dx = end.clientX - start.x;
      const dy = end.clientY - start.y;
      // Need at least 50px horizontal travel AND horizontal must
      // dominate vertical by 1.5× — otherwise vertical scroll wins.
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0 && prev) {
        router.push(`/cards/${prev.slug}`);
      } else if (dx < 0 && next) {
        router.push(`/cards/${next.slug}`);
      }
    }
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next, router]);

  return (
    <nav
      aria-label="图录翻页"
      className="grid grid-cols-2 gap-3 mb-8"
    >
      {prev ? (
        <Link
          href={`/cards/${prev.slug}`}
          aria-label={`上一张: ${prev.title}`}
          className={cn(
            "group flex items-center gap-3 min-h-[64px] rounded-lg border border-border bg-card p-3",
            "hover:border-gold hover:shadow-card transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <ArrowLeft
            className="h-5 w-5 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">
              上一张 · No.{prev.seriesNo}
            </p>
            <p className="font-serif text-sm font-medium leading-snug truncate group-hover:text-gold-deep transition-colors">
              {prev.title}
            </p>
          </div>
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}
      {next ? (
        <Link
          href={`/cards/${next.slug}`}
          aria-label={`下一张: ${next.title}`}
          className={cn(
            "group flex items-center gap-3 min-h-[64px] rounded-lg border border-border bg-card p-3 justify-end text-right",
            "hover:border-gold hover:shadow-card transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">
              下一张 · No.{next.seriesNo}
            </p>
            <p className="font-serif text-sm font-medium leading-snug truncate group-hover:text-gold-deep transition-colors">
              {next.title}
            </p>
          </div>
          <ArrowRight
            className="h-5 w-5 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}
    </nav>
  );
}
