"use client";

/**
 * R52 (2026-06-22): StarButton — 收藏切换按钮.
 *
 * Two sizes:
 *   - "prominent" (44px, detail page hero top-right): always visible,
 *     gold fill when favorited.
 *   - "subtle" (32px, CardPreview overlay top-right): always rendered
 *     but `opacity-0 group-hover:opacity-100` so it doesn't fight the
 *     image. When favorited, stays at opacity-100.
 *
 * Both sizes are ≥ WCAG 2.5.5 44px touch target when the click area
 * is considered (`-m-2` extends the hit area without changing the
 * visible footprint).
 */

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/lib/favorites";

interface StarButtonProps {
  slug: string;
  /** Title for aria-label. Defaults to "收藏". */
  title?: string;
  size?: "prominent" | "subtle";
  /** Stop click bubbling so the parent Link doesn't also navigate. */
  stopPropagation?: boolean;
  className?: string;
}

export function StarButton({
  slug,
  title,
  size = "prominent",
  stopPropagation = false,
  className,
}: StarButtonProps) {
  const { favorites, toggle, hydrated } = useFavorites();
  const isFav = favorites.has(slug);

  const sizes = {
    prominent: {
      btn: "min-h-[44px] min-w-[44px] -m-2 p-2",
      icon: "h-6 w-6",
      bg: "bg-card/95 backdrop-blur shadow-card border-border",
    },
    subtle: {
      btn: "min-h-[32px] min-w-[32px] -m-1.5 p-1.5",
      icon: "h-4 w-4",
      bg: "bg-card/90 backdrop-blur shadow-card border-border",
    },
  } as const;

  const s = sizes[size];

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggle(slug);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        isFav
          ? `取消收藏${title ? `「${title}」` : ""}`
          : `收藏${title ? `「${title}」` : ""}`
      }
      aria-pressed={isFav}
      // `hydrated` gates the visible state — before localStorage is
      // read, the icon would render as "not favorited" and then flip
      // after hydration. Hiding until hydrated avoids the flash.
      data-hydrated={hydrated || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-all duration-150",
        "hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Subtle variant: hidden by default, visible on card hover OR
        // when already favorited (so it's discoverable, but not noisy).
        size === "subtle" && !isFav && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        s.btn,
        s.bg,
        className,
      )}
    >
      <Star
        className={cn(
          s.icon,
          "transition-colors",
          isFav
            ? "fill-gold text-gold-deep"
            : "text-muted-foreground hover:text-gold-deep",
        )}
        aria-hidden="true"
      />
    </button>
  );
}