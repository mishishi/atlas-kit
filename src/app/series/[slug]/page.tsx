import { notFound } from "next/navigation";
import { ArrowLeft, BookMarked, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getAllSeries, getSeriesBySlug } from "@/lib/data";
import { SeriesDetailTabs } from "@/components/series-detail-tabs";
import { displayLabel } from "@/lib/types";

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) return { title: "系列未找到 · 图鉴社" };
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
                  src={headerCards[0].image}
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

      {/* Tabs + grid */}
      <SeriesDetailTabs cards={series.cards} slug={series.slug} />
    </div>
  );
}
