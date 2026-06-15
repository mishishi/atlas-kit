import Link from "next/link";
import { getAllCards } from "@/lib/data";
import { Card as CardType, KIND_LABELS } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { ListOrdered, Hash, Layers } from "lucide-react";

export const metadata = {
  title: "索引 · 图鉴社",
  description: "图鉴社 60 张图鉴的多种索引视图: 按字数、按系列、按类型。",
};

/**
 * /index — alternative navigational surface for users who want
 * to scan rather than browse. Three views:
 *
 * 1. 按字数: cards ordered by description length (longest = most
 *    detailed). Useful for "I want the deepest dive on a topic".
 * 2. 按系列: grouped by the 5 series. Useful for "I want to read
 *    all 5 city-encyclopedia cards in order".
 * 3. 按类型: same grouping as /browse but here for users who
 *    land on /index and want to drill by taxonomy.
 *
 * The page is server-rendered (zero JS), the three views render
 * as side-by-side <section>s so a single page-load gives the
 * user all three.
 */
export default function IndexPage() {
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

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
          <span>索引</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">多种视角看图鉴</h1>
        <p className="text-muted-foreground leading-relaxed">
          三种索引帮你从不同角度切入 — 按篇幅、按系列、按类型。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* View 1: by length */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Hash className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            按字数 (深度优先)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">最详尽的 {byLength.length} 张</p>
          <ol className="space-y-2 list-none p-0">
            {byLength.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={`/cards/${c.slug}`}
                  className="group flex items-baseline gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground/70 w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors truncate">
                    {c.title}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
                    {c.description.length} 字
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* View 2: by series */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            按系列
          </h2>
          <p className="text-sm text-muted-foreground mb-4">5 个系列, 按收录号排序</p>
          <div className="space-y-5">
            {[...bySeries.entries()].map(([seriesSlug, cards]) => {
              const seriesName = SERIES_TYPE_MAP[seriesSlug]?.name ?? seriesSlug;
              return (
                <div key={seriesSlug}>
                  <h3 className="font-serif text-sm font-semibold mb-1.5 text-gold-deep">
                    {seriesName}
                    <span className="text-[10px] text-muted-foreground tabular-nums ml-1.5">({cards.length})</span>
                  </h3>
                  <ol className="space-y-1 list-none p-0">
                    {cards.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/cards/${c.slug}`}
                          className="group flex items-baseline gap-2 text-sm text-foreground hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
                        >
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">No.{c.seriesNo}</span>
                          <span className="truncate">{c.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* View 3: by kind */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-gold-deep inline-block" aria-hidden="true" />
            按类型
          </h2>
          <p className="text-sm text-muted-foreground mb-4">12 个分类</p>
          <div className="space-y-2.5">
            {[...byKind.entries()].map(([kind, cards]) => (
              <Link
                key={kind}
                href={`/browse?kind=${kind}`}
                className="group flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
              >
                <span className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors">
                  {KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground/70">{cards.length} 张</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
