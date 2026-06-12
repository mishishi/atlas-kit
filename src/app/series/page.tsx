import Link from "next/link";
import Image from "next/image";
import { Layers, Sparkles } from "lucide-react";
import { getAllSeries, getKindCounts } from "@/lib/data";
import { displayLabel } from "@/lib/types";
import { THEME_TYPES } from "@/lib/theme-types";

export const metadata = {
  title: "所有系列 · 图鉴社",
  description: "按主题分组的图鉴集合。点击进入单个系列查看完整列表。",
};

export default function SeriesPage() {
  const series = getAllSeries();
  const kindCounts = getKindCounts();

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-12 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">CURATED COLLECTIONS</div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">所有系列</h1>
        <p className="text-muted-foreground leading-relaxed">
          按主题分组的图鉴合集。每个系列都有自己的故事、视觉规范和收藏价值。
        </p>
      </header>

      <ul className="space-y-8 list-none p-0" aria-label="所有系列列表">
        {series.map((s, index) => {
          // Pick: 1 hero (latest) + 5 thumbnails (rest)
          const sortedCards = [...s.cards].sort((a, b) =>
            a.createdAt < b.createdAt ? 1 : -1,
          );
          const heroCard = sortedCards[0];
          const thumbs = sortedCards.slice(1, 6); // up to 5

          return (
            <li>
            <Link
              key={s.slug}
              href={`/series/${s.slug}`}
              aria-label={`进入系列 ${s.name},已收录 ${s.count} 张图鉴`}
              className="group block overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:-translate-y-0.5"
              style={{ borderColor: s.palette[1] }}
            >
              <div className="flex flex-col md:flex-row">
                {/* Hero cover — 3:4 portrait (260×347px). Source images are
                    9:16 (0.5625) portraits; 4:3 (1.33) would force
                    object-cover to crop the subject horizontally and
                    squish it, so 3:4 (0.75) is the closest balanced
                    match. 9:16 at 200w was 355px tall and left a 130px
                    dead zone on the right; 3:4 at 260w lands at 347px —
                    close to the right column and doesn't waste space. */}
                <div
                  className="relative w-full md:w-[260px] shrink-0 aspect-[3/4] md:aspect-[3/4]"
                  style={{ backgroundColor: s.palette[0] }}
                >
                  {heroCard ? (
                    <Image
                      src={heroCard.image}
                      alt={heroCard.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 260px"
                      className="object-cover object-center"
                      quality={95}
                      // First series row's hero is the LCP candidate — preload it.
                      // Other rows stay lazy so we don't bloat the initial bundle.
                      priority={index === 0}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                      style={{ color: s.palette[1] }}
                    >
                      <Sparkles className="h-10 w-10 mb-2 opacity-50" />
                      <div className="text-xs font-medium">尚无图鉴</div>
                      <div className="text-[10px] opacity-70 mt-1">去生成第一张</div>
                    </div>
                  )}
                </div>

                {/* Right content — fills the hero's height and vertically
                    distributes the 3 layers (head / thumbs / footer) so
                    there's no dead space in the middle. */}
                <div className="flex-1 p-5 paper-grain min-w-0 flex flex-col md:justify-between gap-3">
                  {/* Layer 1: title + count */}
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h2
                      className="font-serif text-xl font-semibold group-hover:opacity-80 transition-opacity truncate"
                      style={{ color: s.palette[1] }}
                    >
                      {s.name}
                    </h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 tabular-nums">
                      <Layers className="h-3 w-3" />
                      <span className="font-medium text-foreground">{s.count}</span>
                      <span>张</span>
                    </div>
                  </div>

                  {/* Layer 2: tagline */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                    {s.tagline}
                  </p>

                  {/* Layer 3: thumbnails strip + tags + CTA */}
                  <div>
                    {thumbs.length > 0 ? (
                      <div
                        className="flex gap-2 overflow-x-auto pb-1"
                        role="list"
                        aria-label={`同系列其他 ${thumbs.length} 张`}
                      >
                        {thumbs.map((c) => (
                          <div
                            key={c.slug}
                            className="relative shrink-0 w-16 aspect-[3/4] overflow-hidden rounded-sm ring-1 ring-black/5"
                            style={{ backgroundColor: s.palette[0] }}
                            role="listitem"
                          >
                            <Image
                              src={c.image}
                              alt={c.title}
                              fill
                              sizes="64px"
                              className="object-cover object-center"
                              quality={95}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="h-16 rounded-sm border border-dashed flex items-center justify-center text-[10px]"
                        style={{ borderColor: s.palette[1], color: s.palette[1] }}
                      >
                        等待更多图鉴收录
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {/* Palette swatches */}
                        {s.palette.map((color, i) => (
                          <div
                            key={i}
                            className="h-2.5 w-5 rounded-sm border border-black/5"
                            style={{ backgroundColor: color }}
                            title={color}
                            aria-label={`色卡 ${i + 1}: ${color}`}
                          />
                        ))}
                        {/* Theme tags */}
                        {s.themeTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            #{displayLabel(tag)}
                          </span>
                        ))}
                      </div>
                      <span
                        className="text-xs font-medium shrink-0 tabular-nums"
                        style={{ color: s.palette[1] }}
                      >
                        进入 →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            </li>
          );
        })}
      </ul>

      {/* Stats footer */}
      <section aria-labelledby="kind-stats-title" className="mt-16 rounded-lg border border-border bg-card p-6 paper-grain">
        <h2 id="kind-stats-title" className="font-serif text-lg font-semibold mb-4">主题分布</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {THEME_TYPES.map((t) => {
            const count = kindCounts[t.key] ?? 0;
            return (
              <div
                key={t.key}
                className="text-center rounded-md py-2"
                style={{ opacity: count === 0 ? 0.4 : 1 }}
              >
                <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">
                  {count}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {displayLabel(t.key)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
