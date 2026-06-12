import Link from "next/link";
import Image from "next/image";
import { getAllCards } from "@/lib/data";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { displayLabel, THEME_TYPES } from "@/lib/types";

export const metadata = {
  title: "全部图鉴 · 图鉴社",
  description: "按时间倒序浏览所有收录的中文图鉴卡片。",
};

interface AllCardsPageProps {
  searchParams: { kind?: string };
}

export default function AllCardsPage({ searchParams }: AllCardsPageProps) {
  const allCards = getAllCards();
  const activeKind = searchParams.kind;
  const cards = activeKind
    ? allCards.filter((c) => c.kind === activeKind)
    : allCards;
  const kindLabel = activeKind
    ? (THEME_TYPES.find((t) => t.key === activeKind)?.label ?? activeKind)
    : null;

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
          ALL CARDS
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
          {kindLabel ? `${kindLabel} · 图鉴` : "全部图鉴"}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {activeKind ? (
            <>
              筛选分类
              <span className="font-medium text-foreground mx-1">
                {kindLabel}
              </span>
              ，共
              <span className="font-medium text-foreground mx-1 tabular-nums">
                {cards.length}
              </span>
              张。
            </>
          ) : (
            <>
              按收录时间倒序排列，共
              <span className="font-medium text-foreground mx-1 tabular-nums">
                {cards.length}
              </span>
              张。点击单张进入详情查看完整模块。
            </>
          )}
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {activeKind
              ? `没有找到「${kindLabel}」分类下的图鉴。`
              : "还没有任何图鉴。"}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {activeKind && (
              <Link
                href="/cards"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                查看全部
              </Link>
            )}
            <Link
              href="/create"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gradient-to-br from-gold to-gold-deep px-4 py-2 text-sm font-medium text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              去生成第一张 →
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          role="list"
          aria-label={`${activeKind ? kindLabel : "全部"} ${cards.length} 张图鉴`}
        >
          {cards.map((c) => {
            const seriesName = SERIES_TYPE_MAP[c.series]?.name ?? c.series;
            return (
              <Link
                key={c.slug}
                href={`/cards/${c.slug}`}
                aria-label={`查看 ${c.title},属于 ${seriesName}`}
                role="listitem"
                className="group block overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:-translate-y-0.5"
              >
                <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
                  <Image
                    src={c.image}
                    alt={c.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover object-center transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <div className="font-serif text-sm font-semibold leading-tight line-clamp-2 mb-1.5 group-hover:text-gold-deep transition-colors">
                    {c.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">{seriesName}</span>
                    <span className="shrink-0 ml-1 tabular-nums">№ {c.seriesNo}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {displayLabel(c.kind)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
