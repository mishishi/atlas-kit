import Link from "next/link";
import { CardPreview } from "@/components/card-preview";
import { getAllCards } from "@/lib/data";
import { CardKind, KIND_LABELS, THEME_TYPES } from "@/lib/types";
import { ArrowRight, BookMarked, Filter } from "lucide-react";

export const metadata = {
  title: "分类浏览 · 图鉴社",
  description: "按类型浏览图鉴社的全部 60 张图鉴 — 宠物、动物、植物、城市、人物、节日、食物、现象、历史、器物、科技、其他。",
};

interface BrowseProps {
  searchParams: { kind?: string };
}

/**
 * /browse — taxonomic view by kind. Shows each kind's name, a
 * count, and the cards in that kind. Used to be navigable via
 * /?kind=pet but the home page already does that — /browse is
 * the dedicated landing for kind-level exploration.
 *
 * The kind filter in the URL (?kind=pet) deep-links to a single
 * kind, and is the canonical shareable URL for "I want pet cards".
 */
export default function BrowsePage({ searchParams }: BrowseProps) {
  const allCards = getAllCards();
  const selectedKind = (searchParams.kind ?? "") as CardKind | "";

  // Group cards by kind, preserving the THEME_TYPES order (which
  // is the editorial order, not alphabetical)
  const byKind = new Map<CardKind, typeof allCards>();
  for (const c of allCards) {
    if (!byKind.has(c.kind)) byKind.set(c.kind, []);
    byKind.get(c.kind)!.push(c);
  }

  const orderedKinds = THEME_TYPES.map((t) => t.key as CardKind).filter((k) => byKind.has(k));
  const totalKinds = orderedKinds.length;

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>分类浏览</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
          按类型看 {allCards.length} 张图鉴
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {totalKinds} 个分类, 每类 5-12 张. 点类型跳到对应卡片, 或直接浏览全部。
        </p>
      </header>

      {/* Kind filter chips — sticky-ish, helps user jump between
          kinds without scrolling back. Renders as a horizontal
          scroll on mobile, wraps on desktop. */}
      <nav aria-label="按类型筛选" className="mb-12 -mx-4 px-4 sm:mx-0 sm:px-0">
        <ul className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible list-none p-0 scrollbar-editorial">
          <li>
            <Link
              href="/browse"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                selectedKind === ""
                  ? "border-gold-deep bg-gold-deep text-cream"
                  : "border-border bg-card text-foreground hover:border-gold"
              }`}
            >
              全部 <span className="text-[10px] tabular-nums opacity-70">({allCards.length})</span>
            </Link>
          </li>
          {orderedKinds.map((k) => {
            const count = byKind.get(k)!.length;
            const active = selectedKind === k;
            return (
              <li key={k}>
                <Link
                  href={`/browse?kind=${k}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "border-gold-deep bg-gold-deep text-cream"
                      : "border-border bg-card text-foreground hover:border-gold"
                  }`}
                >
                  {KIND_LABELS[k]} <span className="text-[10px] tabular-nums opacity-70">({count})</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* When a kind is selected, show just that kind's cards in a
          full grid. Otherwise show a per-kind breakdown with each
          kind's preview cards (max 4 per kind) + a "view all" link. */}
      {selectedKind ? (
        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-bold">
              {KIND_LABELS[selectedKind]}
            </h2>
            <Link
              href="/browse"
              className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              ← 全部
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 list-none p-0">
            {byKind.get(selectedKind)?.map((c) => (
              <li key={c.slug} className="h-full">
                <CardPreview card={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="space-y-12">
          {orderedKinds.map((k) => {
            const cards = byKind.get(k)!;
            const preview = cards.slice(0, 4);
            return (
              <section key={k}>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-gold-deep" aria-hidden="true" />
                    {KIND_LABELS[k]}
                    <span className="text-sm tabular-nums text-muted-foreground">({cards.length})</span>
                  </h2>
                  <Link
                    href={`/browse?kind=${k}`}
                    className="inline-flex items-center gap-1 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    查看全部
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 list-none p-0">
                  {preview.map((c) => (
                    <li key={c.slug} className="h-full">
                      <CardPreview card={c} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
