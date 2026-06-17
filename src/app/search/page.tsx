import { CardGrid } from "@/components/card-grid";
import { CardPreview } from "@/components/card-preview";
import {
  getAllCards,
  getDiverseFeatured,
  getRecentCards,
  getTopTags,
  searchCards,
} from "@/lib/data";
import { Search as SearchIcon, Hash, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "搜索 · 图鉴社",
  description: "在 60 张图鉴里搜索主题、标签、系列。fuse.js 模糊匹配, 支持中文。",
  // Round 27 (2026-06-17): explicit OG image + twitter card so shared
  // search URLs don't fall through to the all-cards collage.
  openGraph: {
    title: "搜索 · 图鉴社",
    description: "在 60 张图鉴里搜索主题、标签、系列。",
    type: "website",
    locale: "zh_CN",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "搜索 · 图鉴社",
    description: "在 60 张图鉴里搜索主题、标签、系列。",
    images: ["/opengraph-image"],
  },
};

interface SearchProps {
  searchParams: { q?: string };
}

// When the user's query yields no results, suggest 4 alternative searches
// based on the most common tags — pulls them out of the dead end.
function buildNoResultSuggestions(allCards: ReturnType<typeof getAllCards>) {
  const seen = new Set<string>();
  const suggestions: { label: string; href: string }[] = [];
  for (const c of allCards) {
    for (const tag of c.tags) {
      if (tag.length >= 2 && !seen.has(tag)) {
        seen.add(tag);
        suggestions.push({ label: `#${tag}`, href: `/search?q=${encodeURIComponent(tag)}` });
        if (suggestions.length >= 4) return suggestions;
      }
    }
  }
  if (suggestions.length === 0) {
    return [
      { label: "宠物", href: "/?kind=pet" },
      { label: "城市", href: "/?kind=city" },
      { label: "节日", href: "/?kind=festival" },
      { label: "全部图鉴", href: "/cards" },
    ];
  }
  return suggestions;
}

export default function SearchPage({ searchParams }: SearchProps) {
  const query = searchParams.q ?? "";
  const results = query ? searchCards(query) : [];
  const allCards = getAllCards();
  const popularSuggestions = getDiverseFeatured(4);
  const recentCards = getRecentCards(6);
  const topTags = getTopTags(12);
  const noResultSuggestions = buildNoResultSuggestions(allCards);

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">搜索图鉴</h1>
        <p className="text-muted-foreground">按标题、副标题、标签或描述做模糊搜索</p>
      </header>

      <form className="mb-10 max-w-xl" action="/search" method="get" role="search">
        <label className="sr-only" htmlFor="search-q">搜索图鉴</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            id="search-q"
            type="search"
            name="q"
            defaultValue={query}
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="search-hint"
            placeholder="试试 金毛、柯基、普洱茶、夜行..."
            className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <p id="search-hint" className="mt-2 text-xs text-muted-foreground">
          模糊搜索, 支持中英 / 拼写容错 / 标题副标题标签描述
        </p>
      </form>

      {query && (
        <div className="mb-6 text-sm text-muted-foreground" aria-live="polite">
          搜索 <span className="font-serif font-bold text-foreground">“{query}”</span> 找到{" "}
          <span className="font-serif font-bold text-gold-deep tabular-nums">{results.length}</span> 张图鉴
        </div>
      )}

      {query ? (
        <CardGrid
          cards={results}
          emptyMessage={`没有找到关于 “${query}” 的图鉴, 换个词试试?`}
          emptyTitle="暂无匹配结果"
          suggestions={noResultSuggestions}
        />
      ) : (
        <div className="space-y-12">
          {/* 热门标签 — quick entry to the long tail of the catalog */}
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4 text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" aria-hidden="true" />
              热门标签
            </h2>
            <ul className="flex flex-wrap gap-2 list-none p-0">
              {topTags.map(({ tag, count }) => (
                <li key={tag}>
                  <Link
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm",
                      "text-foreground hover:border-gold hover:text-gold-deep",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "transition-colors",
                    )}
                  >
                    <span>#{tag}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* 最近添加 — newest 6 cards (sorted desc by createdAt) */}
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4 text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              最近添加
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 list-none p-0">
              {recentCards.map((c) => (
                <li key={c.slug}>
                  <CardPreview card={c} />
                </li>
              ))}
            </ul>
          </section>

          {/* 热门推荐 — round-robin diverse featured (1 per kind) */}
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4 text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              热门推荐
            </h2>
            <CardGrid cards={popularSuggestions} cols="md:grid-cols-4" />
          </section>
        </div>
      )}
    </div>
  );
}