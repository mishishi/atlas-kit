import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getAllCards, getAllSeries, getKindCounts } from "@/lib/data";
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

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border paper-grain">
        <div className="container py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs text-gold-deep mb-6">
              <Sparkles className="h-3 w-3" />
              <span>系列化中文科普图鉴 · Atlas Kit</span>
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 animate-fade-in">
              知识整理 · 模块信息 · <br className="hidden md:block" />
              <span className="text-gold-deep italic">图鉴式展示</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              每一张图鉴都像翻一页百科书: 主视觉、基础档案、外观特征、性格习性、养护评分、优缺点对比、趣味冷知识、健康风险 — 9 个模块完整呈现一个主题。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-5 py-2.5 text-sm font-medium text-cream shadow-card transition-all hover:bg-gold hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                生成你的图鉴
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/series"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
              >
                浏览所有系列
              </Link>
            </div>
          </div>

          {/* Series strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">{allCards.length}</div>
              <div className="text-xs text-muted-foreground mt-1">图鉴总数</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">{allSeries.length}</div>
              <div className="text-xs text-muted-foreground mt-1">主题系列</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">
                {(allCards.reduce((a, c) => a + c.score, 0) / allCards.length).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">平均评分</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 paper-grain shadow-card">
              <div className="font-serif text-2xl font-bold text-gold-deep tabular-nums">
                {new Set(allCards.map((c) => c.kind)).size}
              </div>
              <div className="text-xs text-muted-foreground mt-1">主题类型</div>
            </div>
          </div>
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