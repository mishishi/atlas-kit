import Link from "next/link";
import { ArrowRight, BookMarked } from "lucide-react";
import { getAllCards, getTopTags } from "@/lib/data";
import { CardKind, KIND_LABELS, THEME_TYPES } from "@/lib/types";
import { getSubKindsForKind } from "@/lib/taxonomy";
import { TagFilter } from "@/components/tag-filter";
import { CardGrid } from "@/components/card-grid";
import { CardPreview } from "@/components/card-preview";
import { Tag } from "@/components/tag";

export const metadata = {
  title: "全部图鉴 · 图鉴社",
  description: "按分类浏览图鉴社的全部 60 张图鉴 — 宠物、动物、植物、城市、人物、节日、食物、现象、历史、器物、科技、其他。",
};

/**
 * /cards — taxonomic view by kind. Replaces the old /browse (now a
 * 308 redirect to this page).
 *
 * Two view modes:
 *   1. Default (no ?kind=) — "per-kind preview": 12 sections, each
 *      shows the kind name + count + 4 preview cards + "查看全部"
 *      link. Helps users who don't know what they want explore by
 *      taxonomy.
 *   2. Filtered (?kind=pet) — full grid of all cards in that kind,
 *      paginated, with kind-filter chips on top.
 *
 * Tag filter is layered on top of kind filter (and shown when there
 * are tags to filter by).
 */

interface CardsPageProps {
  searchParams: { kind?: string; tag?: string; subKind?: string };
}

const PREVIEW_PER_KIND = 4;
const FULL_GRID_COLS = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export default function CardsPage({ searchParams }: CardsPageProps) {
  const allCards = getAllCards();

  // Validate ?kind= (C2d fix): unknown kind → empty state, not a crash
  const requestedKind = searchParams.kind ?? "";
  const validKind = THEME_TYPES.some((t) => t.key === requestedKind)
    ? (requestedKind as CardKind)
    : null;
  const activeKind = validKind;
  const activeTag = searchParams.tag;
  // R58 (2026-06-26): subKind filter — L3 taxonomy within kind.
  // Validate: subKind must be in taxonomy for activeKind. Invalid → silently
  // ignore (don't 404 the user — they might have a stale link).
  const subKindList = activeKind ? getSubKindsForKind(activeKind) : [];
  const requestedSubKind = searchParams.subKind ?? "";
  const validSubKind =
    activeKind && subKindList.some((s) => s.slug === requestedSubKind)
      ? requestedSubKind
      : null;
  const activeSubKind = validSubKind;

  // Group cards by kind, preserving the THEME_TYPES order (editorial,
  // not alphabetical)
  const byKind = new Map<CardKind, typeof allCards>();
  for (const c of allCards) {
    if (!byKind.has(c.kind)) byKind.set(c.kind, []);
    byKind.get(c.kind)!.push(c);
  }
  const orderedKinds = THEME_TYPES.map((t) => t.key as CardKind).filter((k) => byKind.has(k));

  // Filtered view: cards of the active kind, optionally with tag filter.
  // Round 12 fix: when `?tag=` is set WITHOUT `?kind=`, the user expects
  // "all cards tagged X" across kinds, not the default per-kind preview
  // that silently ignores the tag. So:
  //   - ?kind=X  → cards of that kind (optionally + ?tag= filter)
  //   - ?tag=X  (no kind) → all cards tagged X, any kind
  //   - both    → cards of that kind, filtered by tag
  //   - neither → per-kind preview (the default)
  const filteredCards = (() => {
    if (activeKind) {
      let result = byKind.get(activeKind) ?? [];
      if (activeSubKind) result = result.filter((c) => c.subKind === activeSubKind);
      if (activeTag) result = result.filter((c) => c.tags.includes(activeTag));
      return result;
    }
    if (activeTag) {
      return allCards.filter((c) => c.tags.includes(activeTag));
    }
    return [];
  })();
  const kindLabel = activeKind ? KIND_LABELS[activeKind] : null;
  // Top tags from the post-kind+subKind-filter set (or global if no kind filter)
  const topTags = activeKind
    ? getTopTags(20).filter(
        (t) =>
          t.tag === activeTag ||
          filteredCards.some((c) => c.tags.includes(t.tag)),
      )
    : activeTag
      ? getTopTags(20) // any tag with at least 1 card
      : [];

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          ALL CARDS
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
          {activeTag
            ? `#${activeTag}`
            : kindLabel
              ? `${kindLabel} · 图鉴`
              : `按类型看 ${allCards.length} 张图鉴`}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {activeTag || activeKind ? (
            <>
              {kindLabel && (
                <>
                  筛选分类
                  <span className="font-medium text-foreground mx-1">{kindLabel}</span>
                </>
              )}
              {activeSubKind && (() => {
                const sk = subKindList.find((s) => s.slug === activeSubKind);
                return sk ? (
                  <>
                    {" > "}
                    <span className="font-medium text-foreground mx-1">{sk.label}</span>
                  </>
                ) : null;
              })()}
              {activeTag && (
                <>
                  · 标签
                  <span className="font-medium text-foreground mx-1">#{activeTag}</span>
                </>
              )}
              ，共
              <span className="font-medium text-foreground mx-1 tabular-nums">
                {filteredCards.length}
              </span>
              张。
            </>
          ) : (
            <>
              {orderedKinds.length} 个分类, 每类 {PREVIEW_PER_KIND} 张预览。点类型看完整列表, 或直接进
              <span className="font-medium text-foreground mx-1">单图鉴</span>
              详情。
            </>
          )}
        </p>
      </header>

      {/* Kind filter chips — sticky-ish, helps user jump between
          kinds without scrolling back. Renders as a horizontal
          scroll on mobile, wraps on desktop. */}
      <nav aria-label="按类型筛选" className="mb-12 -mx-4 px-4 sm:mx-0 sm:px-0">
        <ul className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible list-none p-0 scrollbar-editorial">
          <li>
            <Link
              href="/cards"
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
          {orderedKinds.map((k) => {
            const count = byKind.get(k)!.length;
            const active = activeKind === k;
            return (
              <li key={k}>
                <Link
                  href={`/cards?kind=${k}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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

      {/* SubKind filter chips (R58, 2026-06-26) — L3 axis within a kind.
          Only shown when a kind is selected AND that kind has subKinds
          defined in taxonomy.json. Click to set ?subKind=X; click "全部"
          to clear (preserves kind + tag). */}
      {activeKind && subKindList.length > 0 && (
        <nav
          aria-label="按二级分类筛选"
          className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground shrink-0">
              二级
            </span>
            <ul className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible list-none p-0 scrollbar-editorial">
              <li>
                <Link
                  href={`/cards?kind=${activeKind}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ""}`}
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
                const subCount = (byKind.get(activeKind) ?? []).filter(
                  (c) => c.subKind === s.slug,
                ).length;
                const subActive = activeSubKind === s.slug;
                return (
                  <li key={s.slug}>
                    <Link
                      href={`/cards?kind=${activeKind}&subKind=${encodeURIComponent(s.slug)}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ""}`}
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
          </div>
        </nav>
      )}

      {/* Tag filter row — only in filtered view, only when tags exist */}
      {activeKind && topTags.length > 0 && (
        <div className="mb-6">
          <TagFilter tags={topTags} active={activeTag} />
        </div>
      )}

      {/* Filtered view (single kind): full grid */}
      {activeKind ? (
        filteredCards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {activeSubKind && activeTag
                ? `没有找到「${kindLabel} · ${subKindList.find((s) => s.slug === activeSubKind)?.label ?? activeSubKind}」下标签 #${activeTag} 的图鉴。`
                : activeSubKind
                  ? `「${kindLabel} · ${subKindList.find((s) => s.slug === activeSubKind)?.label ?? activeSubKind}」下还没有图鉴。`
                  : activeTag
                    ? `没有找到标签 #${activeTag} 下的「${kindLabel}」图鉴。`
                    : `「${kindLabel}」分类下还没有图鉴。`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {activeTag && (
                <Link
                  href={`/cards?kind=${activeKind}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  清除标签筛选
                </Link>
              )}
              <Link
                href="/cards"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                查看全部
              </Link>
              <Link
                href="/create"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-4 py-2 text-sm font-medium text-cream hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                去生成第一张 →
              </Link>
            </div>
          </div>
        ) : (
          <ul className={`grid ${FULL_GRID_COLS} gap-4 list-none p-0`}>
            {filteredCards.map((c) => (
              <li key={c.slug} className="h-full">
                <CardPreview card={c} />
              </li>
            ))}
          </ul>
        )
      ) : (
        /* Default view (no kind filter): per-kind preview blocks */
        <div className="space-y-12">
          {orderedKinds.map((k) => {
            const cards = byKind.get(k)!;
            const preview = cards.slice(0, PREVIEW_PER_KIND);
            return (
              <section key={k}>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-gold-deep" aria-hidden="true" />
                    {KIND_LABELS[k]}
                    <span className="text-sm tabular-nums text-muted-foreground">({cards.length})</span>
                  </h2>
                  <Link
                    href={`/cards?kind=${k}`}
                    className="inline-flex min-h-[44px] items-center gap-1 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    查看全部
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <ul className={`grid ${FULL_GRID_COLS} gap-4 list-none p-0`}>
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
