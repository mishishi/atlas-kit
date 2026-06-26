import Image from "next/image";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { getAllCards } from "@/lib/data";
import { Card as CardType, KIND_LABELS } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { THEME_TYPES } from "@/lib/theme-types";
import { getSubKindsForKind, getSubKindLabel } from "@/lib/taxonomy";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "时间线 · 图鉴社",
  description: "按月倒序的图鉴收录时间线, 支持类型 + 二级分类过滤。",
  openGraph: {
    title: "时间线 · 图鉴社",
    description: "按月倒序的图鉴收录时间线。",
    type: "website",
    locale: "zh_CN",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "时间线 · 图鉴社",
    description: "按月倒序的图鉴收录时间线。",
    images: ["/opengraph-image"],
  },
};

interface TimelinePageProps {
  searchParams: { kind?: string; subKind?: string };
}

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

export default function TimelinePage({ searchParams }: TimelinePageProps) {
  const allCards = getAllCards(); // already sorted by createdAt desc

  // R58g (2026-06-26): kind + subKind filter via URL params.
  const requestedKind = searchParams.kind ?? "";
  const validKind = THEME_TYPES.some((t) => t.key === requestedKind)
    ? (requestedKind as CardType["kind"])
    : null;
  const activeKind = validKind;
  const subKindList = activeKind ? getSubKindsForKind(activeKind) : [];
  const requestedSubKind = searchParams.subKind ?? "";
  const validSubKind =
    activeKind && subKindList.some((s) => s.slug === requestedSubKind)
      ? requestedSubKind
      : null;
  const activeSubKind = validSubKind;

  // Empty state (N3 fix): if the dataset is empty, the math below
  // would render "NaN 天". Show a friendly empty state instead.
  if (allCards.length === 0) {
    return (
      <div className="container py-12 md:py-16">
        <header className="mb-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>收录时间线</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            还没有图鉴收录
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            时间线按月倒序排列, 每月内按收录日倒序。第一张图鉴收录后, 这里就会出现它.
          </p>
        </header>
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            <Link
              href="/create"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-5 py-2.5 text-sm font-medium text-cream hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              去生成第一张 →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const groups = groupByMonth(allCards);
  // Apply kind + subKind filter
  const visibleCards = (() => {
    let result = allCards;
    if (activeKind) result = result.filter((c) => c.kind === activeKind);
    if (activeSubKind) result = result.filter((c) => c.subKind === activeSubKind);
    return result;
  })();
  const filteredGroups = groupByMonth(visibleCards);
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
          {visibleCards.length < allCards.length && (
            <span className="text-muted-foreground text-2xl ml-2">
              (筛选后 {visibleCards.length})
            </span>
          )}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          从 {formatDate(firstCard.createdAt)} 的第一张「{firstCard.title}」, 到{" "}
          {formatDate(lastCard.createdAt)} 的「{lastCard.title}」。
          时间线按月倒序排列, 每月内按收录日倒序。
        </p>
      </header>

      {/* R58g (2026-06-26): kind + subKind filter chips. Same UX as
          /cards. Click kind chip to filter; subKind chip appears when
          a kind is selected. URL deep-links preserved. */}
      <nav aria-label="按类型筛选" className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <ul className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible list-none p-0 scrollbar-editorial">
          <li>
            <Link
              href="/timeline"
              aria-current={!activeKind ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                !activeKind
                  ? "border-gold-deep bg-gold-deep text-cream"
                  : "border-border bg-card text-foreground hover:border-gold"
              }`}
            >
              全部 <span className="text-[10px] tabular-nums opacity-70">({allCards.length})</span>
            </Link>
          </li>
          {THEME_TYPES.map((t) => {
            const k = t.key as CardType["kind"];
            const count = allCards.filter((c) => c.kind === k).length;
            if (count === 0) return null;
            const active = activeKind === k;
            return (
              <li key={k}>
                <Link
                  href={`/timeline?kind=${k}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    active
                      ? "border-gold-deep bg-gold-deep text-cream"
                      : "border-border bg-card text-foreground hover:border-gold"
                  }`}
                >
                  {t.label} <span className="text-[10px] tabular-nums opacity-70">({count})</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* subKind chips (R58g) — only when kind is selected */}
      {activeKind && subKindList.length > 0 && (
        <nav aria-label="按二级分类筛选" className="mb-10 -mx-4 px-4 sm:mx-0 sm:px-0">
          <ul className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible list-none p-0 scrollbar-editorial">
            <li>
              <Link
                href={`/timeline?kind=${activeKind}`}
                aria-current={!activeSubKind ? "page" : undefined}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  !activeSubKind
                    ? "border-gold bg-cream text-gold-deep font-medium"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold"
                }`}
              >
                全部
              </Link>
            </li>
            {subKindList.map((s) => {
              const subCount = allCards.filter(
                (c) => c.kind === activeKind && c.subKind === s.slug,
              ).length;
              if (subCount === 0) return null;
              const subActive = activeSubKind === s.slug;
              return (
                <li key={s.slug}>
                  <Link
                    href={`/timeline?kind=${activeKind}&subKind=${encodeURIComponent(s.slug)}`}
                    aria-current={subActive ? "page" : undefined}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      subActive
                        ? "border-gold bg-cream text-gold-deep font-medium"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold"
                    }`}
                  >
                    {s.label} <span className="text-[10px] tabular-nums opacity-70">({subCount})</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Timeline — vertical rail on the left (md+), with the date
          label inside a circle. Each card row is full-width on mobile
          (no rail), 2-column on desktop (rail + content). */}
      <div className="relative">
        {/* Vertical rail (desktop only) */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-0 bottom-0 left-[7.25rem] w-px bg-gradient-to-b from-border via-border to-transparent"
        />

        {filteredGroups.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              没有符合{" "}
              <strong>
                {activeKind ? KIND_LABELS[activeKind] : "当前"}
                {activeSubKind && ` · ${getSubKindLabel(activeKind!, activeSubKind) ?? activeSubKind}`}
              </strong>{" "}
              的图鉴。
            </p>
          </div>
        )}

        <ol className="space-y-12 list-none p-0">
          {filteredGroups.map(({ month, cards }) => (
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
                            alt={c.title}
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
