import Link from "next/link";
import { getAllCards, getTopTags } from "@/lib/data";
import { THEME_TYPES } from "@/lib/types";
import { TagFilter } from "@/components/tag-filter";
import { CardGrid } from "@/components/card-grid";
import { Pagination } from "@/components/pagination";

export const metadata = {
  title: "全部图鉴 · 图鉴社",
  description: "按时间倒序浏览所有收录的中文图鉴卡片。",
};

const PAGE_SIZE = 24;

interface AllCardsPageProps {
  searchParams: { kind?: string; tag?: string; page?: string };
}

export default function AllCardsPage({ searchParams }: AllCardsPageProps) {
  const allCards = getAllCards();
  const activeKind = searchParams.kind;
  const activeTag = searchParams.tag;
  const pageNum = Math.max(1, Number(searchParams.page ?? "1") || 1);

  // Pipeline: kind filter → tag filter
  const afterKind = activeKind
    ? allCards.filter((c) => c.kind === activeKind)
    : allCards;
  const filteredCards = activeTag
    ? afterKind.filter((c) => c.tags.includes(activeTag))
    : afterKind;
  const kindLabel = activeKind
    ? (THEME_TYPES.find((t) => t.key === activeKind)?.label ?? activeKind)
    : null;
  // Top tags come from the post-kind-filter set (so a user browsing "宠物"
  // sees tags actually used on pet cards, not the global top)
  const topTags = getTopTags(20).filter(
    (t) => t.tag === activeTag || afterKind.some((c) => c.tags.includes(t.tag)),
  );

  // Pagination
  const total = filteredCards.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(pageNum, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const cards = filteredCards.slice(start, start + PAGE_SIZE);

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
              : "全部图鉴"}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {activeTag || activeKind ? (
            <>
              {activeKind && (
                <>
                  筛选分类
                  <span className="font-medium text-foreground mx-1">
                    {kindLabel}
                  </span>
                </>
              )}
              {activeTag && (
                <>
                  · 标签
                  <span className="font-medium text-foreground mx-1">
                    #{activeTag}
                  </span>
                </>
              )}
              ，共
              <span className="font-medium text-foreground mx-1 tabular-nums">
                {total}
              </span>
              张。
            </>
          ) : (
            <>
              按收录时间倒序排列，共
              <span className="font-medium text-foreground mx-1 tabular-nums">
                {total}
              </span>
              张。点击单张进入详情查看完整模块。
            </>
          )}
        </p>
      </header>

      {/* Tag filter row — always shown if there are any tags in the post-kind set */}
      {topTags.length > 0 && (
        <div className="mb-6">
          <TagFilter tags={topTags} active={activeTag} />
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {activeTag
              ? `没有找到标签 #${activeTag} 下的图鉴${activeKind ? ` (${kindLabel} 分类)` : ""}。`
              : activeKind
                ? `没有找到「${kindLabel}」分类下的图鉴。`
                : "还没有任何图鉴。"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {(activeKind || activeTag) && (
              <Link
                href="/cards"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                查看全部
              </Link>
            )}
            <Link
              href="/create"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-4 py-2 text-sm font-medium text-cream hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              去生成第一张 →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <CardGrid
            cards={cards}
            ariaLabel={`${activeTag ? `#${activeTag}` : kindLabel ?? "全部"} ${cards.length} 张图鉴`}
            cols="xl:grid-cols-5"
          />
          {totalPages > 1 && safePage < totalPages && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              basePath="/cards"
              searchParams={{
                ...(activeKind && { kind: activeKind }),
                ...(activeTag && { tag: activeTag }),
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
