"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CardPreview } from "./card-preview";
import { Card as CardType, displayLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SeriesDetailTabsProps {
  cards: CardType[];
  slug: string;
}

type Tab = "all" | "newest" | "top";

function isTab(v: string | null | undefined): v is Tab {
  return v === "all" || v === "newest" || v === "top";
}

export function SeriesDetailTabs({ cards }: SeriesDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tab state is driven by the URL (?tab=newest). Default = "top".
  // Reading + writing the URL (instead of just useState) means deep links
  // and back/forward navigation work correctly.
  const urlTab = searchParams.get("tab");
  const tab: Tab = isTab(urlTab) ? urlTab : "top";

  const setTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "top") {
        params.delete("tab"); // keep URL clean when on default
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const sortedCards = (() => {
    if (tab === "newest") {
      return [...cards].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    if (tab === "top") {
      // score desc with seriesNo asc as tiebreaker (so unrated cards sort stably)
      return [...cards].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.seriesNo.localeCompare(b.seriesNo);
      });
    }
    return [...cards].sort((a, b) => a.seriesNo.localeCompare(b.seriesNo));
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
            aria-current={tab === t.key ? "true" : undefined}
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
