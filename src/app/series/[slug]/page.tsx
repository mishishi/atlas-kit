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

      {/* Series header with collage + meta */}
      <header className="mb-10">
        <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start">
          {/* Cover collage (left, 1:1 square) */}
          <div
            className="relative aspect-square rounded-lg border shadow-card overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5 p-1"
            style={{ backgroundColor: series.palette[0], borderColor: series.palette[1] }}
          >
            {headerCards.length > 0 ? (
              headerCards.map((c) => (
                <div key={c.slug} className="relative aspect-[9/16] overflow-hidden rounded-sm">
                  <Image
                    src={c.image}
                    alt={c.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover object-center"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-2 row-span-2 flex flex-col items-center justify-center text-center" style={{ color: series.palette[1] }}>
                <Sparkles className="h-12 w-12 mb-3 opacity-50" />
                <div className="font-serif text-lg font-semibold">系列筹备中</div>
                <div className="text-xs opacity-70 mt-1">去生成第一张</div>
              </div>
            )}
          </div>

          {/* Meta (right) */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: series.palette[1] }}>
              主题系列
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-3">{series.name}</h1>
            <p className="font-serif text-lg text-muted-foreground italic mb-4">{series.tagline}</p>
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
