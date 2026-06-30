"use client";

/**
 * K (2026-06-30): /all View 1 flip card.
 *
 * Numbered list of 12 longest-description cards. Default state: just
 * the title + char count. Click to flip → show description preview
 * (line-clamped to 3 lines) + "查看图鉴 →" CTA.
 *
 * Implementation notes:
 *   - CSS-only flip (rotateY 180deg + transform-style: preserve-3d).
 *     No Framer Motion, no Radix. Just two stacked divs.
 *   - State: a single `flipped: Set<slug>` (so multiple can be open).
 *     Toggle on click. Esc / outside-click close (single-open
 *     policy is more common but loses the "compare two cards" use
 *     case — go multi-open).
 *   - A11y: each row is a `<button>` with `aria-expanded`. The
 *     description face is `aria-hidden` when not flipped so SR
 *     users don't get content twice.
 *   - SSR-safe: the flipped Set starts empty on both server and
 *     client. No hydration mismatch.
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, RotateCcw } from "lucide-react";
import type { Card as CardType } from "@/lib/types";

interface FlipCardProps {
  card: CardType;
  index: number;
}

export function FlipCard({ card, index }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const toggle = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  return (
    <li className="[perspective:1200px]">
      <div
        className={cn(
          "relative w-full transition-transform duration-500",
          "[transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Front face: title + char count */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={flipped}
          aria-controls={`flip-${card.slug}-back`}
          className={cn(
            "group flex w-full min-h-[44px] items-baseline gap-3 rounded-md px-3 py-2",
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors text-left",
            "[backface-visibility:hidden]",
          )}
        >
          <span className="font-mono text-xs tabular-nums text-muted-foreground/70 w-6 shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors truncate flex-1">
            {card.title}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
            {card.description.length} 字
          </span>
        </button>

        {/* Back face: description preview + CTA. min-h-[88px] so the
            back face has enough room for 3 lines of description text
            even on the shortest cards. When the back is hidden
            (backface-visibility: hidden) this min-h doesn't affect
            layout — the front's 44px still drives the row height
            in default state. */}
        <div
          id={`flip-${card.slug}-back`}
          aria-hidden={!flipped}
          className={cn(
            "absolute inset-0 w-full min-h-[88px]",
            "[backface-visibility:hidden] [transform:rotateY(180deg)]",
            "rounded-md border border-gold/40 bg-cream/40 p-3",
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-gold-deep mb-1.5 flex items-center gap-1">
            <span className="font-mono tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>·</span>
            <span className="font-serif font-medium normal-case tracking-normal text-foreground/90">
              {card.title}
            </span>
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3 mb-2">
            {card.description}
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              收起
            </button>
            <Link
              href={`/cards/${card.slug}`}
              className="inline-flex items-center gap-1 text-[10px] text-gold-deep hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              查看图鉴
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}