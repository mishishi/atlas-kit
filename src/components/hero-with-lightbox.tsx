"use client";

/**
 * HeroWithLightbox — detail page hero image that opens a fullscreen
 * lightbox modal on click. Replaces the static <Image> + "查看大图"
 * link with an interactive experience (the user can either click the
 * image directly, or the text button below it).
 *
 * Why a client island: the detail page is a server component for SEO
 * (it emits JSON-LD from card data at request time). Only the hero
 * needs interactivity, so we hydrate just this subtree.
 *
 * Image tiers (60 cards, all English slugs):
 *   - thumb.webp  (384w)   — list views
 *   - card.png    (600w)   — detail hero (this component)
 *   - full.webp   (1024w)  — lightbox modal (high-res "view original")
 *                           (was 1536w PNG ~5.5MB; re-encoded to
 *                            1024w WebP q90 in 2026-06-16 — 19 MB
 *                            total, fits Vercel Hobby 100 MB cap)
 */
import Image from "next/image";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Lightbox } from "./lightbox";
import { cn } from "@/lib/utils";

interface HeroWithLightboxProps {
  /** 600w card PNG — used for the hero (faster load) */
  src: string;
  /** 1024w high-res WebP — used inside the lightbox (pixel-real zoom) */
  fullSrc: string;
  alt: string;
  /** Card palette[0] — used as a background while the image loads */
  bgColor: string;
  /** Card title for the lightbox filename (English slug preferred) */
  filename: string;
  /** Card subtitle shown in the lightbox caption */
  caption: string;
}

export function HeroWithLightbox({ src, fullSrc, alt, bgColor, filename, caption }: HeroWithLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        {/* Clickable hero — the whole card is a button so the user
            has a generous tap target (was a thin sliver below the
            image, easy to miss). */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`查看原图：${alt}`}
          className={cn(
            "group relative block aspect-[9/16] w-full max-w-[480px] mx-auto overflow-hidden rounded-lg border border-border bg-card shadow-card-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-shadow hover:shadow-dark-card",
          )}
        >
          <div className="absolute inset-0" style={{ backgroundColor: bgColor }} aria-hidden="true" />
          <Image
            src={src}
            alt={alt}
            fill
            priority
            quality={90}
            sizes="(max-width: 1024px) 100vw, 480px"
            className="relative object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {/* Hover affordance — bottom-right magnifier pill, fades in
              on hover/focus. On touch devices, the whole button is
              the tap target so the affordance is redundant. */}
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

        {/* Secondary text link below the image — opens the 1024w
            original inside the lightbox. The honest label tells the
            user the modal will show the 1024w source, not the 600w
            thumbnail they were just looking at. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
        >
          查看原图 (1024×1835) ↗
        </button>
      </div>

      <Lightbox
        open={open}
        onClose={() => setOpen(false)}
        src={fullSrc}
        alt={alt}
        filename={filename}
        caption={caption}
      />
    </>
  );
}
