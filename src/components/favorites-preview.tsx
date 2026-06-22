"use client";

/**
 * R54 (2026-06-22): FavoritesPreview — home page section that surfaces
 * the user's bookmarked cards. Inserted between the 5-series preview
 * and the "精选图鉴" cards grid.
 *
 * Behaviour:
 *   - 0 favorites: returns null. First-time visitors don't see an
 *     empty "你还没收藏" placeholder — that's redundant with the
 *     hero CTAs.
 *   - 1-6 favorites: show all in a 2/3/6 col grid (matches CardGrid
 *     default behaviour).
 *   - ≥7 favorites: show top 6 + "查看全部 (N) →" link (uses
 *     CardPreview's existing card tile — no duplication).
 *
 * Why client-side only (no SSR): favorites are localStorage-only.
 * Server can't know the count. Returning null on the server while
 * rendering the section on the client causes a brief empty-section
 * flash for 1 visit. We accept that — the section is small, the
 * flash is one paint, and SSR'ing a "loading skeleton" here would
 * be more disruptive (reserve space for content that may not exist).
 */

import { useMemo } from "react";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import type { Card as CardType } from "@/lib/types";
import { CardPreview } from "./card-preview";
import { useFavorites } from "@/lib/favorites";

interface FavoritesPreviewProps {
  allCards: CardType[];
  /** Cap the rendered grid at this many cards (default 6). */
  cap?: number;
}

export function FavoritesPreview({ allCards, cap = 6 }: FavoritesPreviewProps) {
  const { favorites, hydrated } = useFavorites();

  // Filter + preserve user's addition order (newest favorites first).
  // `useFavorites` stores slugs as append-only array, so iterating the
  // Set in insertion order gives us chronological display.
  const favCards = useMemo(() => {
    if (!hydrated || favorites.size === 0) return [];
    const bySlug = new Map(allCards.map((c) => [c.slug, c]));
    const out: CardType[] = [];
    for (const slug of favorites) {
      const c = bySlug.get(slug);
      if (c) out.push(c);
    }
    return out;
  }, [favorites, allCards, hydrated]);

  // Pre-hydration + 0-favorites: render nothing. SSR returns null too
  // (useFavorites' initial state is empty Set), so no hydration flash
  // for the absent case.
  if (favCards.length === 0) return null;

  const shown = favCards.slice(0, cap);
  const overflow = favCards.length - shown.length;

  return (
    <section
      aria-label="你的收藏夹预览"
      className="container py-12 md:py-16 border-b border-border"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-2">
            <Star className="h-3.5 w-3.5 fill-gold" aria-hidden="true" />
            <span>YOUR COLLECTION</span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-1">
            你的收藏
          </h2>
          <p className="text-sm text-muted-foreground">
            已经收藏了 {favCards.length} 张图鉴
            {overflow > 0 && ` · 这里显示最近 ${cap} 张`}
          </p>
        </div>
        <Link
          href="/favorites"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-gold/40 bg-gold/5 px-4 text-sm font-medium text-gold-deep hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors self-start md:self-auto"
        >
          <Star className="h-4 w-4 fill-gold" aria-hidden="true" />
          查看收藏夹 ({favCards.length})
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        role="list"
        aria-label={`收藏夹 ${favCards.length} 张中的 ${shown.length} 张`}
      >
        {shown.map((c) => (
          <div key={c.slug} role="listitem">
            <CardPreview card={c} />
          </div>
        ))}
      </div>
    </section>
  );
}