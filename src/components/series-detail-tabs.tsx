"use client";

import { useState } from "react";
import { CardPreview } from "./card-preview";
import { Card as CardType, displayLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SeriesDetailTabsProps {
  cards: CardType[];
  slug: string;
}

type Tab = "all" | "newest" | "top";

export function SeriesDetailTabs({ cards }: SeriesDetailTabsProps) {
  // Default to "top" — it's the most useful view (highest-scored cards first).
  // If user lands via deep link (?tab=...), they'll get the right one.
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "top";
    const initial = new URLSearchParams(window.location.search).get("tab");
    return initial === "all" || initial === "newest" ? initial : "top";
  });

  const sortedCards = (() => {
    if (tab === "newest") {
      return [...cards].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    if (tab === "top") {
      return [...cards].sort((a, b) => b.score - a.score);
    }
    return cards;
  })();

  if (cards.length === 0) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <p className="text-muted-foreground">该系列暂无图鉴 · 等待第一张收录</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "all", label: `全部 ${cards.length}` },
          { key: "newest", label: "最新发布" },
          { key: "top", label: "评分榜" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-4 py-2 text-sm transition-colors",
              tab === t.key
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-deep" />
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedCards.map((card, idx) => (
          <CardPreview key={card.slug} card={card} priority={idx < 4} />
        ))}
      </div>
    </div>
  );
}
