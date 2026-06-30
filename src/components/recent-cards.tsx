"use client";

/**
 * U (2026-06-30): 最新收录 — horizontal-scrolling row of the 5 most
 * recent cards on the home page.
 *
 * Why a client island: the prev/next buttons scroll the inner
 * strip programmatically. Server-rendering the cards themselves
 * (via the CardPreview card grid pattern) avoids hydration cost —
 * only the controls are interactive.
 *
 * Layout: 5 cards in a row at md+, each card is 1/5 of the strip
 * width (min-width per card 200px so on mobile 1.25 cards are
 * visible, hinting at horizontal scroll). Right/left arrow buttons
 * scroll by ~80% of the visible width; mobile users just swipe.
 *
 * The "新收录" badge reuses CardPreview's existing implementation
 * (suppressHydrationWarning on the timestamp; per R17 round note).
 */

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Card } from "@/lib/types";
import { CardPreview } from "./card-preview";
import { cn } from "@/lib/utils";

interface RecentCardsProps {
  cards: Card[];
}

export function RecentCards({ cards }: RecentCardsProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // Update arrow disabled state on scroll + on mount.
  const onScroll = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  if (cards.length === 0) return null;

  return (
    <section className="container py-12 md:py-16" data-section="recent">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-2">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>NEW THIS WEEK</span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-1">最新收录</h2>
          <p className="text-sm text-muted-foreground">
            按收录日倒序, 最近 5 张图鉴
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/changelog"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            完整更新日志
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label="向左滚动"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground",
              )}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label="向右滚动"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground",
              )}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={stripRef}
        onScroll={onScroll}
        className="-mx-4 sm:mx-0 flex gap-4 overflow-x-auto scroll-smooth px-4 sm:px-0 snap-x snap-mandatory pb-2"
        aria-label="最近 5 张图鉴横滚"
      >
        {cards.map((c) => (
          <div
            key={c.slug}
            className="shrink-0 basis-[78%] sm:basis-[40%] md:basis-[28%] lg:basis-[20%] snap-start"
          >
            <CardPreview card={c} />
          </div>
        ))}
      </div>
    </section>
  );
}