"use client";

/**
 * R52 (2026-06-22): /favorites page client island.
 *
 * Filters all cards by `useFavorites()` slugs, renders empty state
 * or filled grid. Clear-all button confirms via window.confirm
 * (cheap, no extra modal).
 *
 * Sort: favorited slugs are stored as an array (append-only in
 * `toggle`), so we honor the user's addition order: newest favorites
 * appear first. Cards the user removed just don't appear.
 *
 * Hydration:
 *   - SSR renders the empty state (favorites = empty Set).
 *   - Client mount reads localStorage and re-renders.
 *   - The brief empty → filled flash is acceptable here because
 *     the user navigated here intentionally and expects to see
 *     content appear. (No flicker problem because the empty state
 *     and the title both render in the same paint.)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star, Trash2, Dices, LayoutGrid, Compass } from "lucide-react";
import { CardGrid } from "./card-grid";
import { Card as CardType } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

interface FavoritesListProps {
  allCards: CardType[];
}

export function FavoritesList({ allCards }: FavoritesListProps) {
  const { favorites, hydrated, clear } = useFavorites();
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Filter cards by favorited slugs, preserve user's addition order
  const favCards = useMemo(() => {
    if (favorites.size === 0) return [];
    const slugArr = [...favorites];
    // Map slug → card, drop missing (deleted from cards.json)
    const bySlug = new Map(allCards.map((c) => [c.slug, c]));
    return slugArr
      .map((s) => bySlug.get(s))
      .filter((c): c is CardType => Boolean(c));
  }, [favorites, allCards]);

  function handleClear() {
    if (confirmingClear) {
      clear();
      setConfirmingClear(false);
      return;
    }
    setConfirmingClear(true);
    // Auto-cancel confirmation after 3s if user doesn't click again
    window.setTimeout(() => setConfirmingClear(false), 3000);
  }

  // Pre-hydration: SSR + first client paint both render empty state
  // because favorites Set starts as `new Set()`. Show a soft loading
  // shimmer so the user knows we're about to read localStorage.
  if (!hydrated) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center"
      >
        <Star className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">正在读取收藏…</p>
      </div>
    );
  }

  // Empty state — fully hydrated, genuinely empty
  if (favCards.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center"
      >
        <Star
          className="mx-auto h-12 w-12 text-gold-deep/40 mb-4"
          aria-hidden="true"
        />
        <h2 className="font-serif text-xl font-semibold mb-2">
          收藏夹是空的
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          在图鉴页或卡片预览上点星标,喜欢的图鉴会出现在这里。星标按钮就在大图的右上角。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/random"
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-md border border-border bg-card px-4 text-sm hover:border-gold hover:text-gold-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Dices className="h-4 w-4" aria-hidden="true" />
            随机一张
          </Link>
          <Link
            href="/cards"
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-md border border-border bg-card px-4 text-sm hover:border-gold hover:text-gold-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            全部图鉴
          </Link>
          <Link
            href="/series"
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-md border border-border bg-card px-4 text-sm hover:border-gold hover:text-gold-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            逛系列
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          已收藏 <span className="font-serif text-gold-deep">{favCards.length}</span> 张
        </p>
        <button
          type="button"
          onClick={handleClear}
          aria-label={confirmingClear ? "再次点击确认清空" : "清空收藏夹"}
          className={cn(
            "inline-flex items-center gap-1.5 min-h-[44px] rounded-md border px-3.5 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            confirmingClear
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-border text-muted-foreground hover:text-destructive hover:border-destructive",
          )}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {confirmingClear ? "再点一次确认" : "清空收藏夹"}
        </button>
      </div>
      <CardGrid cards={favCards} ariaLabel="收藏夹图鉴" />
    </div>
  );
}