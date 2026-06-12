import { CardGrid } from "@/components/card-grid";
import { getAllCards, searchCards } from "@/lib/data";
import { Search as SearchIcon } from "lucide-react";

export const metadata = {
  title: "搜索 · 图鉴社",
};

interface SearchProps {
  searchParams: { q?: string };
}

export default function SearchPage({ searchParams }: SearchProps) {
  const query = searchParams.q ?? "";
  const results = query ? searchCards(query) : [];
  const suggestions = getAllCards().slice(0, 4);

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
            placeholder="试试 金毛、柯基、普洱茶、夜行..."
            className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </form>

      {query && (
        <div className="mb-6 text-sm text-muted-foreground" aria-live="polite">
          搜索 <span className="font-serif font-bold text-foreground">"{query}"</span> 找到{" "}
          <span className="font-serif font-bold text-gold-deep tabular-nums">{results.length}</span> 张图鉴
        </div>
      )}

      {query ? (
        <CardGrid cards={results} emptyMessage={`没有找到关于 "${query}" 的图鉴`} />
      ) : (
        <div>
          <h2 className="font-serif text-lg font-semibold mb-4 text-muted-foreground">热门推荐</h2>
          <CardGrid cards={suggestions} />
        </div>
      )}
    </div>
  );
}