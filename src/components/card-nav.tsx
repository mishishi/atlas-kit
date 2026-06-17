"use client";

/**
 * R34 (2026-06-17): 翻图录浏览体验 — prev/next in same series.
 *
 * Day 1 MVP: button bar + keyboard arrow nav. Day 2 will add
 * touch swipe.
 *
 * Server passes prev/next slugs + titles; client renders the bar
 * and listens for arrow keys to navigate. Uses next/navigation's
 * router.push() for client-side transitions (faster than <a>).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

  // Keyboard: ←/→ navigates prev/next. Disabled when nothing to
  // navigate to (single-card series). Stops propagation so users
  // typing in an input don't accidentally trigger navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea/contenteditable
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
      if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        router.push(`/cards/${prev.slug}`);
      } else if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        router.push(`/cards/${next.slug}`);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
