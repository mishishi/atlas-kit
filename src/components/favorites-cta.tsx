"use client";

/**
 * R53 (2026-06-22): FavoritesCta — banner shown above the /all page
 * 3-grid. Reads favorites count from localStorage, renders one of
 * 3 states:
 *
 *   - Pre-hydration:        skeleton pill (avoids layout shift)
 *   - 0 favorites:          "还没收藏 · 在图鉴页点星标 + 随机逛逛 /random"
 *   - ≥1 favorites:         "你已收藏 N 张 · 查看收藏夹 →" + /random CTA
 *
 * The component is intentionally a thin read-only island (no toggle
 * UI here). All toggling happens on /cards/[slug] (hero star) and
 * CardPreview (corner star). This banner just promotes the
 * /favorites route from the discoverability perspective.
 *
 * Why not render this in the page header text? Because the count
 * is per-user (localStorage), not site-wide. The page shell stays
 * server-rendered, the dynamic count hydrates client-side.
 */

import Link from "next/link";
import { Star, Dices, ArrowRight } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

export function FavoritesCta() {
  const { count, hydrated } = useFavorites();

  // Pre-hydration skeleton: same outer dimensions as the real pill so
  // layout doesn't shift when localStorage hydrates.
  if (!hydrated) {
    return (
      <div
        aria-hidden="true"
        className="mb-10 h-[68px] rounded-lg border border-dashed border-border bg-card/30"
      />
    );
  }

  if (count === 0) {
    return (
      <aside
        aria-label="收藏夹提示"
        className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-card/50 px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
          <Star className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
          <span className="truncate">
            收藏夹是空的,在图鉴页或卡片预览上点星标就好。
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/random"
            className="inline-flex items-center gap-1.5 min-h-[36px] rounded-md border border-border bg-card px-3 text-xs hover:border-gold hover:text-gold-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Dices className="h-3.5 w-3.5" aria-hidden="true" />
            随机一张
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="收藏夹"
      className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Star
          className="h-4 w-4 shrink-0 fill-gold text-gold-deep"
          aria-hidden="true"
        />
        <span className="truncate">
          你已收藏{" "}
          <span className="font-serif text-gold-deep font-medium tabular-nums">
            {count}
          </span>{" "}
          张图鉴
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/random"
          className="inline-flex items-center gap-1.5 min-h-[36px] rounded-md border border-border bg-card px-3 text-xs hover:border-gold hover:text-gold-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Dices className="h-3.5 w-3.5" aria-hidden="true" />
          随机一张
        </Link>
        <Link
          href="/favorites"
          className="inline-flex items-center gap-1.5 min-h-[36px] rounded-md bg-gold-deep px-3 text-xs font-medium text-cream hover:bg-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          查看收藏夹
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}