import { notFound } from "next/navigation";
import { ArrowLeft, BookMarked, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getAllSeries, getSeriesBySlug } from "@/lib/data";
import { SeriesDetailTabs } from "@/components/series-detail-tabs";
import { displayLabel } from "@/lib/types";

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.slug }));
}

// See /cards/[slug] for the rationale — dynamicParams=false forces
// a real 404 on unknown series slugs instead of Next 14's default
// 200 + not-found body.
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) {
    // See /cards/[slug] for the rationale — throw at the metadata layer
    // so Next.js serves a real 404 with the not-found body.
    notFound();
  }
  return {
    title: `${series.name} · 图鉴社`,
    description: series.tagline,
  };
}

export default function SeriesDetail({ params }: { params: { slug: string } }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) notFound();

  // Pick up to 4 most recent cards for the header collage
  const headerCards = [...series.cards]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 4);

  return (
    <div className="container py-12 md:py-16">
      <Link
        href="/series"
        aria-label="返回所有系列"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        所有系列
      </Link>

      {/* Series header with hero + meta */}
      <header className="mb-10">
        <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start">
          {/* Hero collage: 1 full-width cover card (object-top so the
              species label is visible) + 3 thumbs below. The previous
              1:1 2x2 grid squished 9:16 source cards into 1:1 cells,
              cropping the subject on both axes. */}
          <div className="space-y-2">
            <div
              className="relative w-full aspect-[9/16] md:aspect-[3/4] rounded-lg border shadow-card overflow-hidden"
              style={{ backgroundColor: series.palette[0], borderColor: series.palette[1] }}
            >
              {headerCards[0] ? (
                <Image
                  src={headerCards[0].image_full ?? headerCards[0].image}
                  alt={headerCards[0].title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-top"
                  quality={95}
                  // Header hero is the LCP candidate for series detail pages.
                  priority
                />
              ) : (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                  style={{ color: series.palette[1] }}
                >
                  <Sparkles className="h-12 w-12 mb-3 opacity-50" />
                  <div className="font-serif text-lg font-semibold">系列筹备中</div>
                  <div className="text-xs opacity-70 mt-1">去生成第一张</div>
                </div>
              )}
            </div>
            {headerCards.length > 1 && (
              <div className="flex gap-2">
                {headerCards.slice(1, 4).map((c) => (
                  <div
                    key={c.slug}
                    className="relative flex-1 aspect-[3/4] overflow-hidden rounded-md ring-1 ring-black/5"
                    style={{ backgroundColor: series.palette[0] }}
                  >
                    <Image
                      src={c.image}
                      alt={c.title}
                      fill
                      sizes="(max-width: 768px) 33vw, 11vw"
                      className="object-cover object-top"
                      quality={95}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta (right) */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: series.palette[1] }}>
              主题系列
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-3">{series.name}</h1>
            <p className="font-serif text-lg text-muted-foreground mb-4">{series.tagline}</p>
            <p className="text-sm leading-relaxed text-foreground/80 mb-5 max-w-prose">
              {series.description}
            </p>

            {/* Palette swatches */}
            <div className="flex items-center gap-2 mb-5">
              {series.palette.map((color, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-md border border-black/10 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">系列色卡</span>
            </div>

            {/* Meta stats */}
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <span className="text-muted-foreground text-xs">已收录</span>
                <span className="ml-2 font-serif font-bold text-lg tabular-nums">{series.count}</span>
                <span className="text-muted-foreground text-xs ml-1">张</span>
              </div>
              {series.themeTags.length > 0 && (
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <span className="text-muted-foreground text-xs">涵盖</span>
                  <span className="ml-2">{series.themeTags.map(displayLabel).join("·")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* R76 (2026-07-10): 编辑精选 — top 6 cards by score.
          Renders before the tabs so the visitor sees the best
          entries immediately, without having to scroll through
          a tabbed list. Hidden when series has fewer than 6
          cards (small / new series where 'best of 6' is
          misleading vs. just showing all cards). Sort: score
          desc; break ties by createdAt desc (newer first). */}
      {series.cards.length >= 6 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-gold-deep" aria-hidden="true" />
              编辑精选
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              按评分排序 · 显示 {Math.min(6, series.cards.length)} / {series.cards.length} 张
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[...series.cards]
              .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.createdAt < b.createdAt ? 1 : -1;
              })
              .slice(0, 6)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/cards/${c.slug}`}
                  aria-label={`查看 ${c.title} · 评分 ${c.score.toFixed(1)}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[9/16]">
                    <Image
                      src={c.image_thumb ?? c.image}
                      alt={c.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 16vw"
                      className="object-cover"
                    />
                    {/* score badge — same visual treatment as the
                        "你可能也会喜欢" cards on the detail page, so
                        visitors recognize the recommendation signal
                        across surfaces. */}
                    <div
                      className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums shadow-md"
                      style={{ backgroundColor: c.palette[1], color: c.palette[0] }}
                    >
                      ★ {c.score.toFixed(1)}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors truncate">
                      {c.title}
                    </p>
                    {c.tagline && (
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground line-clamp-2">
                        {c.tagline}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* R88 (2026-07-15): 主题分布 — top 12 tags across this series's
          cards, sorted by frequency. Complements the curated
          `series.themeTags` shown in the header (editor-set, ~3-5 tags)
          by surfacing the actual content distribution visitors will
          see when they scroll the grid. Each pill links to
          /cards?tag=X with kind filter dropped, so the user can
          discover the tag across the full catalog, not just this
          series. Same pill style as the /search input's tag
          suggestions so the pattern is recognizable across surfaces. */}
      {(() => {
        const tagCounts = new Map<string, number>();
        for (const c of series.cards) {
          for (const t of c.tags ?? []) {
            tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
          }
        }
        const topTags = [...tagCounts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 12);
        if (topTags.length === 0) return null;
        return (
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <Tag className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                主题分布
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                按 series 内 cards 频率 · 取前 {topTags.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <Link
                  key={tag}
                  href={`/cards?tag=${encodeURIComponent(tag)}`}
                  aria-label={`查看标签 ${tag} 的全部图鉴 (${count} 张)`}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card hover:border-gold-deep hover:bg-gold-deep/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  <span>{tag}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">×{count}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Tabs + grid */}
      <SeriesDetailTabs cards={series.cards} />
    </div>
  );
}
