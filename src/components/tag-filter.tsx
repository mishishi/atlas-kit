import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: { tag: string; count: number }[];
  active?: string;
}

export function TagFilter({ tags, active }: TagFilterProps) {
  if (tags.length === 0) return null;
  return (
    <nav
      aria-label="按标签筛选"
      className="-mx-1 flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:snap-none sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {tags.map(({ tag, count }) => {
        const isActive = active === tag;
        return (
          <a
            key={tag}
            href={isActive ? "/cards" : `/cards?tag=${encodeURIComponent(tag)}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-gold-deep bg-gold text-cream font-medium"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold",
            )}
          >
            <span>#{tag}</span>
            <span className={cn("text-[10px] tabular-nums", isActive ? "opacity-80" : "opacity-50")}>
              {count}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
