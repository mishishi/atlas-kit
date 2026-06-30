import Link from "next/link";
import { getAllCards } from "@/lib/data";
import { Card as CardType, KIND_LABELS, THEME_TYPES } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { ListOrdered, Hash, Layers } from "lucide-react";
import { FavoritesCta } from "@/components/favorites-cta";
import { FlipCard } from "@/components/flip-card";

export const metadata = {
  title: "索引 · 图鉴社",
  description: "图鉴社 600 张图鉴的多种索引视图: 按字数、按系列、按类型。",
};

/**
 * /all — alternative navigational surface for users who want
 * to scan rather than browse. Three views:
 *
 * 1. 按字数: cards ordered by description length (longest = most
 *    detailed). Useful for "I want the deepest dive on a topic".
 *    Layout: numbered list with description-length column.
 * 2. 按系列: grouped by the 5 series. Useful for "I want to read
 *    all 5 city-encyclopedia cards in order".
 *    Layout: bento-style card tiles (different shape from #1).
 * 3. 按类型: same grouping as /cards?kind= but here for users who
 *    land on /all and want to drill by taxonomy.
 *    Layout: 2x chip grid (different from #1 list and #2 cards).
 *
 * Three different layout families in a row — design-taste-frontend
 * §4.7 "no 3× identical layout" rule satisfied. Each view now uses
 * a distinct visual treatment.
 */
export default function AllPage() {
  const allCards = getAllCards();

  // View 1: by length (longest description first)
  const byLength = [...allCards]
    .filter((c) => c.description && c.description.length > 20)
    .sort((a, b) => b.description.length - a.description.length)
    .slice(0, 12);

  // View 2: by series
  const bySeries = new Map<string, CardType[]>();
  for (const c of allCards) {
    if (!bySeries.has(c.series)) bySeries.set(c.series, []);
    bySeries.get(c.series)!.push(c);
  }
  for (const arr of bySeries.values()) {
    arr.sort((a, b) => a.seriesNo.localeCompare(b.seriesNo));
  }

  // View 3: by kind
  const byKind = new Map<string, CardType[]>();
  for (const c of allCards) {
    if (!byKind.has(c.kind)) byKind.set(c.kind, []);
    byKind.get(c.kind)!.push(c);
  }
  const orderedKinds = THEME_TYPES.map((t) => t.key as string).filter((k) => byKind.has(k));

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
          <span>索引</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">多种视角看图鉴</h1>
        <p className="text-muted-foreground leading-relaxed">
          三种索引帮你从不同角度切入：按篇幅、按系列、按类型。
        </p>
      </header>

      {/* R53 (2026-06-22): favorites discovery CTA. Banner sits
          above the 3-grid so users in "I want to find my favorites"
          mode get a one-click path without scanning all 3 indexes. */}
      <FavoritesCta />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* View 1: by length — numbered list */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Hash className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            按字数 (深度优先)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            最详尽的 {byLength.length} 张 ·{" "}
            <span className="text-[10px]">点击行可翻面看描述</span>
          </p>
          {/* K (2026-06-30): View 1 now uses FlipCard (CSS rotateY 180deg)
              instead of direct-link rows. Click to reveal description +
              CTA without leaving /all. Multi-open supported so users
              can compare two entries. */}
          <ol className="space-y-1 list-none p-0">
            {byLength.map((c, i) => (
              <FlipCard key={c.slug} card={c} index={i} />
            ))}
          </ol>
        </section>

        {/* View 2: by series — bento card tiles. Each series gets a
            larger card with its accent dot + name (text accent color
            inherits contrast in both light/dark mode), count badge, and
            a compact preview row of the 3 newest entries. Distinct
            from the numbered list in #1 and the chip grid in #3.

            Audit fix (Round 13): removed the 3px colored border-left
            stripe (impeccable ban: side-stripe borders > 1px as colored
            accent on cards) and the inline cream-bg badge (broke in
            dark mode). The series identity now lives in a single 8px
            accent dot + accent-colored h3 text. The dot+text combo
            reads identically in both themes because hex #C97064 / #6B8294
            / #8C7F6E / #B8956A are mid-saturation; the badge bg uses
            the theme-aware `bg-muted` token instead of the hard-coded
            palette[0]. */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            按系列
          </h2>
          <p className="text-sm text-muted-foreground mb-4">5 个系列, 按收录号排序</p>
          <div className="space-y-3">
            {Array.from(bySeries.entries()).map(([seriesSlug, cards]) => {
              const seriesName = SERIES_TYPE_MAP[seriesSlug]?.name ?? seriesSlug;
              const accent = SERIES_TYPE_MAP[seriesSlug]?.palette?.[1] ?? "#87603f";
              return (
                <Link
                  key={seriesSlug}
                  href={`/series/${seriesSlug}`}
                  className="group block rounded-lg border border-border bg-card p-3 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                        aria-hidden="true"
                      />
                      <h3
                        className="font-serif text-sm font-semibold truncate transition-opacity group-hover:opacity-80"
                        style={{ color: accent }}
                        title={seriesName}
                      >
                        {seriesName}
                      </h3>
                    </div>
                    <span
                      className="font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0"
                      aria-label={`${cards.length} 张图鉴`}
                    >
                      {cards.length} 张
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                    {cards.slice(0, 3).map((c) => c.title).join(" · ")}
                    {cards.length > 3 ? " · …" : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* View 3: by kind — 2-col chip grid. Visually different from
            #1 (list) and #2 (cards). Each kind is a pill that links
            to /cards?kind= with the count. */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <span
              className="h-4 w-4 rounded bg-gold-deep inline-block"
              aria-hidden="true"
            />
            按类型
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{THEME_TYPES.length} 个分类</p>
          <ul className="grid grid-cols-2 gap-2 list-none p-0">
            {orderedKinds.map((kind) => {
              const count = byKind.get(kind)!.length;
              const label = KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind;
              return (
                <li key={kind}>
                  <Link
                    href={`/cards?kind=${kind}`}
                    className="group flex min-h-[44px] items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                  >
                    <span className="font-serif text-xs font-medium group-hover:text-gold-deep transition-colors">
                      {label}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}