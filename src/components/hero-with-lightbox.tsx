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
 */
import Image from "next/image";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Lightbox } from "./lightbox";
import { cn } from "@/lib/utils";

interface HeroWithLightboxProps {
  src: string;
  alt: string;
  /** Card palette[0] — used as a background while the image loads */
  bgColor: string;
  /** Card title for the lightbox filename (English slug preferred) */
  filename: string;
  /** Card subtitle shown in the lightbox caption */
  caption: string;
}

export function HeroWithLightbox({ src, alt, bgColor, filename, caption }: HeroWithLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        {/* Clickable hero — the whole card is a button so the user
            has a generous tap target (the previous "查看大图" text
            link was a thin sliver below the image and easy to miss). */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`查看大图：${alt}`}
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
            查看大图
          </span>
        </button>

        {/* Secondary text link below the image — same action, different
            affordance for users who didn't notice the magnifier pill. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
        >
          查看大图 (600×1067) ↗
        </button>
      </div>

      <Lightbox
        open={open}
        onClose={() => setOpen(false)}
        src={src}
        alt={alt}
        filename={filename}
        caption={caption}
      />
    </>
  );
}
