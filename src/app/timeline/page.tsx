import Image from "next/image";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { getAllCards } from "@/lib/data";
import { Card as CardType, KIND_LABELS } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "时间线 · 图鉴社",
  description: "60 张图鉴的收录时间线, 按月分组。看看图鉴社是怎么一步步长出来的。",
};

/**
 * Group cards by YYYY-MM. Returns a chronologically-sorted list of
 * {month, cards} pairs, newest month first.
 */
function groupByMonth(cards: CardType[]) {
  const groups = new Map<string, CardType[]>();
  for (const c of cards) {
    const m = c.createdAt.slice(0, 7); // YYYY-MM
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(c);
  }
  // Sort cards within each month by date desc
  for (const arr of groups.values()) {
    arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, cards]) => ({ month, cards }));
}

/** Format YYYY-MM as 2026 年 5 月 (zh). */
function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y} 年 ${parseInt(m, 10)} 月`;
}

function formatMonthShort(month: string): string {
  const [, m] = month.split("-");
  return `${parseInt(m, 10)}月`;
}

export default function TimelinePage() {
  const allCards = getAllCards(); // already sorted by createdAt desc
  const groups = groupByMonth(allCards);
  const firstCard = allCards[allCards.length - 1];
  const lastCard = allCards[0];
  const totalSpan = Math.ceil(
    (new Date(lastCard.createdAt).getTime() - new Date(firstCard.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="container py-12 md:py-16">
      {/* Header */}
      <header className="mb-12 max-w-2xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>收录时间线</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
          {totalSpan} 天里, 慢慢长出了 {allCards.length} 张图鉴
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          从 {formatDate(firstCard.createdAt)} 的第一张「{firstCard.title}」, 到{" "}
          {formatDate(lastCard.createdAt)} 的「{lastCard.title}」。
          时间线按月倒序排列, 每月内按收录日倒序。
        </p>
      </header>

      {/* Timeline — vertical rail on the left (md+), with the date
          label inside a circle. Each card row is full-width on mobile
          (no rail), 2-column on desktop (rail + content). */}
      <div className="relative">
        {/* Vertical rail (desktop only) */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-0 bottom-0 left-[7.25rem] w-px bg-gradient-to-b from-border via-border to-transparent"
        />

        <ol className="space-y-12 list-none p-0">
          {groups.map(({ month, cards }) => (
            <li key={month}>
              {/* Month label — sticky-ish feel: large date stamp on
                  the left (desktop), top (mobile) */}
              <div className="md:flex md:items-baseline md:gap-8 mb-6">
                <h2
                  className="font-serif text-2xl md:text-3xl font-bold text-gold-deep md:min-w-[6.5rem] md:text-right tabular-nums"
                >
                  {formatMonth(month)}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 md:mt-0">
                  {cards.length} 张图鉴
                </p>
              </div>

              {/* Cards in this month — alternating left/right on
                  desktop? No, keep all left for editorial readability.
                  Each row is a small card preview (image + meta). */}
              <ul className="space-y-4 md:space-y-6 md:pl-[8.5rem] list-none p-0">
                {cards.map((c, idx) => {
                  const seriesName = SERIES_TYPE_MAP[c.series]?.name ?? c.series;
                  return (
                    <li key={c.slug} className="relative">
                      {/* Timeline dot — sits on the rail (desktop) */}
                      <span
                        aria-hidden="true"
                        className="hidden md:block absolute -left-[1.7rem] top-6 h-3 w-3 rounded-full bg-gold-deep ring-4 ring-background"
                      />
                      <Link
                        href={`/cards/${c.slug}`}
                        className="group flex flex-col sm:flex-row gap-4 sm:gap-6 rounded-lg border border-border bg-card p-4 sm:p-5 shadow-card hover:shadow-card-hover hover:border-gold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {/* Image — 4:5 aspect so it doesn't dominate */}
                        <div
                          className="relative aspect-[4/5] w-full sm:w-32 sm:shrink-0 overflow-hidden rounded-md"
                          style={{ backgroundColor: c.palette[0] }}
                        >
                          <Image
                            src={c.image_thumb ?? c.image}
                            alt={c.subtitle || c.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 128px"
                            className="object-cover"
                            priority={idx < 2}
                          />
                        </div>

                        {/* Meta — title / subtitle / tagline / tags */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-1.5">
                            <span className="font-medium text-foreground/80">{formatDate(c.createdAt)}</span>
                            <span>·</span>
                            <span>{seriesName}</span>
                            <span>·</span>
                            <span>No.{c.seriesNo}</span>
                          </div>
                          <h3 className="font-serif text-lg font-semibold leading-snug mb-1 group-hover:text-gold-deep transition-colors">
                            {c.title}
                          </h3>
                          <p className="text-sm font-serif text-gold-deep mb-2">{c.subtitle}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{c.tagline}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/80">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" aria-hidden="true" />
                              {KIND_LABELS[c.kind]}
                            </span>
                            {c.tags.slice(0, 3).map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
