import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { getAllCards, getAllSeries, getKindCounts } from "@/lib/data";
import { THEME_TYPES } from "@/lib/theme-types";
import { CardGrid } from "@/components/card-grid";
import { KindFilter } from "@/components/kind-filter";

interface HomeProps {
  searchParams: { kind?: string };
}

export default function Home({ searchParams }: HomeProps) {
  const allCards = getAllCards();
  const allSeries = getAllSeries();
  const kindCounts = getKindCounts();
  const activeKind = searchParams.kind;
  const filteredCards = activeKind ? allCards.filter((c) => c.kind === activeKind) : allCards;
  const featuredCards = filteredCards.slice(0, 8);
  // Pick 4 visually-staggered cards for the hero collage (different series for variety)
  const heroCards = (() => {
    const seen = new Set<string>();
    const picked: typeof allCards = [];
    for (const c of allCards) {
      if (!seen.has(c.series)) {
        seen.add(c.series);
        picked.push(c);
        if (picked.length === 4) break;
      }
    }
    return picked.length === 4 ? picked : allCards.slice(0, 4);
  })();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border paper-grain">
        <div className="container py-16 md:py-24">
          <div className="grid gap-10 lg:gap-16 lg:grid-cols-[1.1fr_1fr] items-center">
            <div>
              <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 animate-fade-in">
                知识整理 · 模块信息 · <br className="hidden md:block" />
                <span className="text-gold-deep italic">图鉴式展示</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                9 个固定模块 · 任意主题 · 像翻一页百科书的图鉴卡片。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/create"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-gold-deep px-5 py-2.5 text-sm font-medium text-cream shadow-card transition-all hover:bg-gold hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                生成你的图鉴
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/series"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
              >
                浏览所有系列
              </Link>
            </div>
            </div>

            {/* Right: hero collage — 1 featured card (medium-large, 280×498)
                center-front + 4 supporting thumbs fanned out behind it. The
                5 cards come from different series so the spread feels like
                a curated library shelf rather than one series. */}
            <div
              aria-hidden="true"
              className="relative h-[440px] lg:h-[500px] hidden lg:block"
            >
              {/* Background fan: 4 thumbs positioned at the corners, each
                  tilted differently. Rendered first so the center card
                  sits on top. */}
              {heroCards.slice(0, 4).map((c, i) => {
                // top-left, top-right, bottom-left, bottom-right corners
                const positions = [
                  "top-2 left-2 -rotate-6 z-10",
                  "top-6 right-4 rotate-4 z-20",
                  "bottom-8 left-10 rotate-5 z-15",
                  "bottom-2 right-2 -rotate-4 z-25",
                ];
                return (
                  <Link
                    key={c.slug}
                    href={`/cards/${c.slug}`}
                    className={`absolute w-[110px] aspect-[9/16] rounded-md overflow-hidden border shadow-card ring-1 ring-black/5 transition-transform duration-300 hover:scale-110 hover:z-50 ${positions[i]}`}
                    style={{ backgroundColor: c.palette[0], borderColor: c.palette[1] }}
                  >
                    <Image
                      src={c.image_thumb ?? c.image}
                      alt=""
                      fill
                      sizes="110px"
                      className="object-cover object-top"
                      // Only the first card is the LCP candidate; the rest
                      // lazy-load (default).
                      priority={i === 0}
                    />
                  </Link>
                );
              })}

              {/* Center featured card — bigger, slightly tilted right, sits
                  on top. This is the visual focal point. */}
              {heroCards[0] && (
                <Link
                  href={`/cards/${heroCards[0].slug}`}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] aspect-[9/16] rounded-xl overflow-hidden border-2 shadow-card-hover ring-1 ring-black/5 transition-transform duration-300 hover:scale-105 z-40"
                  style={{ backgroundColor: heroCards[0].palette[0], borderColor: heroCards[0].palette[1] }}
                >
                  <Image
                    // Use the 600-wide -card for the center piece (visible
                    // at ~280px CSS width, 600 source = 2x retina).
                    src={heroCards[0].image}
                    alt=""
                    fill
                    sizes="280px"
                    className="object-cover object-top"
                    priority
                  />
                  {/* Subtle label ribbon at the bottom — gives the hero a
                      "this is one of the cards" anchor. */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-6">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cream/80 mb-0.5">精选</p>
                    <p className="font-serif text-sm text-cream font-medium leading-tight line-clamp-2">
                      {heroCards[0].title}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Series strip — 4-cell bento with one feature cell (平均评分)
              dropped from the bordered 'card on card' pattern so the row
              has visual rhythm, per Section 4.7 'Bento Background Diversity'. */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">{allCards.length}</div>
              <div className="text-xs text-muted-foreground mt-1">图鉴总数</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">{allSeries.length}</div>
              <div className="text-xs text-muted-foreground mt-1">主题系列</div>
            </div>
            <div className="rounded-lg p-4 paper-grain flex flex-col justify-center">
              <div className="font-serif text-3xl font-bold text-foreground tabular-nums leading-none">
                {(allCards.reduce((a, c) => a + c.score, 0) / allCards.length).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">平均评分 / 10</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">
                {THEME_TYPES.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">主题类型</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 series preview — each series gets a row with its own cover
          card + tagline + 1 'see all' CTA. Sits between the stat strip
          and the featured-cards grid so users see 'this is curated
          collections' before 'here are individual cards'. */}
      <section className="border-b border-border bg-muted/30 paper-grain">
        <div className="container py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold-deep mb-2">CURATED COLLECTIONS</div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-1">五大系列</h2>
              <p className="text-sm text-muted-foreground">按主题分组的图鉴合集, 每个系列都有自己的故事、视觉规范与收藏价值</p>
            </div>
            <Link
              href="/series"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm self-start md:self-auto"
            >
              查看全部 {allSeries.length} 个系列
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 list-none p-0">
            {allSeries.slice(0, 5).map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/series/${s.slug}`}
                  aria-label={`进入系列 ${s.name},已收录 ${s.count} 张图鉴`}
                  className="group block overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all h-full"
                  style={{ borderColor: s.palette[1] }}
                >
                  {/* Cover: first card of this series, 9:16 portrait.
                      Use -thumb.webp (already 384w; just upscaled on
                      retina but small footprint) — keeps this section
                      light even with 5 series cards. */}
                  {s.cards[0] ? (
                    <div className="relative aspect-[9/16] overflow-hidden">
                      <Image
                        src={s.cards[0].image_thumb ?? s.cards[0].image}
                        alt={s.cards[0].title}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover object-top transition-transform group-hover:scale-105"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent p-3 pt-8">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-cream/80 mb-0.5">No.001</p>
                        <p className="font-serif text-xs text-cream font-medium leading-tight line-clamp-2">
                          {s.cards[0].title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="aspect-[9/16] flex flex-col items-center justify-center text-center p-3"
                      style={{ backgroundColor: s.palette[0], color: s.palette[1] }}
                    >
                      <Sparkles className="h-6 w-6 mb-1 opacity-50" />
                      <div className="text-[10px] font-medium">尚无图鉴</div>
                    </div>
                  )}
                  <div className="p-3">
                    <h3
                      className="font-serif text-sm font-semibold leading-tight mb-1 truncate group-hover:opacity-80 transition-opacity"
                      style={{ color: s.palette[1] }}
                      title={s.name}
                    >
                      {s.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mb-1.5">{s.tagline}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="tabular-nums">{s.count} 张</span>
                      <span style={{ color: s.palette[1] }} className="font-medium">
                        进入 →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cards grid */}
      <section className="container py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-1">精选图鉴</h2>
            <p className="text-sm text-muted-foreground">每一张都经博物馆图鉴质感打磨</p>
          </div>
          <KindFilter counts={kindCounts} active={activeKind} />
        </div>
        <CardGrid cards={featuredCards} emptyMessage="该分类下暂无图鉴" />

        {filteredCards.length > featuredCards.length && (
          <div className="mt-10 text-center">
            <Link
              href={`/cards${activeKind ? `?kind=${activeKind}` : ""}`}
              aria-label={`查看全部 ${filteredCards.length} 张图鉴`}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              查看全部 {filteredCards.length} 张
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}