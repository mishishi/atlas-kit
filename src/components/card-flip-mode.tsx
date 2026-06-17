"use client";

/**
 * R34 Day 3 (2026-06-17): 翻图录 mode — fullscreen image-first
 * browsing. Activated via `?mode=flip` on any /cards/[slug] URL.
 *
 * Layout (from top to bottom):
 *   1. Top bar — [× 关闭] left, "3/5" position counter right
 *   2. Center — large 9:16 image (image_full 1024w) with side
 *      arrow buttons (←/→) vertically centered
 *   3. Bottom — title (Chinese), subtitle (series · seriesNo),
 *      "查看完整图鉴 →" link to the regular detail page
 *
 * Interaction:
 *   - Keyboard: ←/→ nav, Esc close, Space next (slide-show feel)
 *   - Touch: swipe left/right (R34 Day 2)
 *   - Click image: open lightbox (inherits from detail page)
 *   - Click X or 关闭: router.push("/cards/<slug>") (clean URL)
 *
 * The flip mode is a `fixed inset-0` overlay (z-50) on top of the
 * site chrome (SiteHeader/SiteFooter). It uses bg-background +
 * paper-grain so it matches the brand; we don't render a separate
 * full-screen route to avoid duplicating the data layer.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, X, Maximize2 } from "lucide-react";
import { Lightbox } from "@/components/lightbox";
import { Skeleton } from "@/components/skeleton";
import type { Card } from "@/lib/types";
import { displayLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { useState } from "react";

export function CardFlipMode({
  card,
  prev,
  next,
  position,
  total,
}: {
  card: Card;
  prev?: Card;
  next?: Card;
  /** 1-based current card index in the sorted series */
  position: number;
  /** total cards in this series */
  total: number;
}) {
  const router = useRouter();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const seriesName =
    SERIES_TYPE_MAP[card.series]?.name ?? displayLabel(card.kind);

  // Lock body scroll while in flip mode — the user should feel
  // they're in a "presentation" mode, not a scrollable page. SSR
  // safe: only run on client (useEffect).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard: Esc close, ←/→ nav (skip when in input/textarea,
  // and skip arrow nav when lightbox is open so the lightbox
  // own ←/→ image-nav doesn't conflict).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxOpen) return;
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
      if (e.key === "Escape") {
        e.preventDefault();
        router.push(`/cards/${card.slug}`);
      } else if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        router.push(`/cards/${prev.slug}?mode=flip`);
      } else if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        router.push(`/cards/${next.slug}?mode=flip`);
      } else if (e.key === " " && next) {
        // Space = "next card" (slide-show convention)
        e.preventDefault();
        router.push(`/cards/${next.slug}?mode=flip`);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [card.slug, prev, next, router, lightboxOpen]);

  // Touch swipe (only on coarse-pointer devices). Same threshold
  // as R34 Day 2: |dx| >= 50px AND |dx| > |dy| * 1.5.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isCoarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    if (!isCoarse) return;

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
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0 && prev) {
        router.push(`/cards/${prev.slug}?mode=flip`);
      } else if (dx < 0 && next) {
        router.push(`/cards/${next.slug}?mode=flip`);
      }
    }
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next, router]);

  const imgSrc = card.image_full ?? card.image;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="翻图录模式"
      className="fixed inset-0 z-50 bg-background paper-grain flex flex-col"
    >
      {/* Top bar: close (X) + position counter */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <Link
          href={`/cards/${card.slug}`}
          aria-label="关闭翻图录"
          className={cn(
            "inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-md text-sm font-medium",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors",
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          关闭
        </Link>
        <p
          className="text-sm text-muted-foreground tabular-nums"
          aria-label={`第 ${position} 张, 共 ${total} 张`}
        >
          <span className="font-serif text-base text-foreground">{position}</span>
          <span className="mx-1">/</span>
          <span>{total}</span>
        </p>
      </div>

      {/* Center: side arrows + image */}
      <div className="flex-1 flex items-center justify-center relative px-4 md:px-16 min-h-0">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => prev && router.push(`/cards/${prev.slug}?mode=flip`)}
          disabled={!prev}
          aria-label={prev ? `上一张: ${prev.title}` : "已是第一张"}
          className={cn(
            "absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10",
            "inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full",
            "bg-card/80 backdrop-blur border border-border shadow-card",
            "hover:bg-card hover:border-gold hover:shadow-card-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-card/80 disabled:hover:border-border",
            "transition-all",
          )}
        >
          <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
        </button>

        {/* Image container */}
        <div
          className="relative h-full max-h-[75vh] aspect-[9/16] rounded-lg overflow-hidden border border-border shadow-card-hover"
          style={{ backgroundColor: card.palette[0] }}
        >
          {/* Skeleton shimmer while image loads (R35 reuse) */}
          <Skeleton
            className={cn(
              "absolute inset-0 rounded-lg transition-opacity duration-500 pointer-events-none",
              imgLoaded ? "opacity-0" : "opacity-100",
            )}
          />
          {/* Image: clickable to open lightbox. We use image_full
              (1024w) for the bigger viewing area; the detail page
              hero uses the 600w `image` field. */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`查看原图: ${card.title}`}
            className="absolute inset-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <Image
              src={imgSrc}
              alt={card.title}
              fill
              priority
              quality={95}
              sizes="(max-width: 768px) 100vw, 75vh"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
              className={cn(
                "object-cover transition-all duration-500",
                imgLoaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-[1.02]",
              )}
            />
            {/* Hover affordance: magnifier pill (same as detail hero) */}
            <span
              className={cn(
                "absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-card backdrop-blur",
                "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
              )}
              aria-hidden="true"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              查看原图
            </span>
          </button>
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => next && router.push(`/cards/${next.slug}?mode=flip`)}
          disabled={!next}
          aria-label={next ? `下一张: ${next.title}` : "已是最后一张"}
          className={cn(
            "absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10",
            "inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full",
            "bg-card/80 backdrop-blur border border-border shadow-card",
            "hover:bg-card hover:border-gold hover:shadow-card-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-card/80 disabled:hover:border-border",
            "transition-all",
          )}
        >
          <ArrowRight className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Bottom: title + subtitle + detail link */}
      <div className="px-4 py-4 md:px-6 md:py-6 text-center space-y-2 max-w-3xl mx-auto w-full">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground leading-tight">
          {card.title}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-[0.15em]">
          No.{card.seriesNo} · {seriesName}
        </p>
        {card.subtitle && (
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            {card.subtitle}
          </p>
        )}
        <Link
          href={`/cards/${card.slug}`}
          className={cn(
            "inline-flex items-center gap-1 mt-2 text-sm text-gold-deep hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
            "transition-colors min-h-[44px] px-2",
          )}
        >
          查看完整图鉴 <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src={imgSrc}
        alt={card.title}
        filename={card.slug}
        caption={card.subtitle ?? card.title}
      />
    </div>
  );
}
