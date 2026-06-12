import { CardGrid } from "@/components/card-grid";
import { getAllCards, getDiverseFeatured, searchCards } from "@/lib/data";
import { Search as SearchIcon } from "lucide-react";

export const metadata = {
  title: "搜索 · 图鉴社",
};

interface SearchProps {
  searchParams: { q?: string };
}

// When the user's query yields no results, suggest 4 alternative searches
// based on the most common kind labels — pulls them out of the dead end.
function buildNoResultSuggestions(allCards: ReturnType<typeof getAllCards>) {
  const seen = new Set<string>();
  const suggestions: { label: string; href: string }[] = [];
  // Prefer tags that already exist on real cards
  for (const c of allCards) {
    for (const tag of c.tags) {
      if (tag.length >= 2 && !seen.has(tag)) {
        seen.add(tag);
        suggestions.push({ label: `#${tag}`, href: `/search?q=${encodeURIComponent(tag)}` });
        if (suggestions.length >= 4) return suggestions;
      }
    }
  }
  // Fallback: kind labels
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
  const noResultSuggestions = buildNoResultSuggestions(allCards);

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">搜索图鉴</h1>
        <p className="text-muted-foreground">按标题、标签或描述搜索</p>
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
          搜索标题、英文名、标签或描述 (中英皆可, 不区分大小写)
        </p>
      </form>

      {query && (
        <div className="mb-6 text-sm text-muted-foreground" aria-live="polite">
          搜索 <span className="font-serif font-bold text-foreground">"{query}"</span> 找到{" "}
          <span className="font-serif font-bold text-gold-deep tabular-nums">{results.length}</span> 张图鉴
        </div>
      )}

      {query ? (
        <CardGrid
          cards={results}
          emptyMessage={`没有找到关于 "${query}" 的图鉴, 换个词试试?`}
          emptyTitle="暂无匹配结果"
          suggestions={noResultSuggestions}
        />
      ) : (
        <div>
          <h2 className="font-serif text-lg font-semibold mb-4 text-muted-foreground">热门推荐</h2>
          <CardGrid cards={popularSuggestions} />
        </div>
      )}
    </div>
  );
}