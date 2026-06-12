import { Card as CardType, KIND_LABELS } from "@/lib/types";

const VISIBLE_KINDS = KIND_LABELS;
import { cn } from "@/lib/utils";

interface KindFilterProps {
  counts: Record<string, number>;
  active?: string;
  basePath?: string;
}

export function KindFilter({ counts, active, basePath = "/" }: KindFilterProps) {
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const items = [{ key: "all", label: "全部", count: all }, ...Object.entries(KIND_LABELS).map(([k, label]) => ({ key: k, label, count: counts[k] ?? 0 }))];

  return (
    <nav
      aria-label="按主题筛选"
      // Mobile: horizontal scroll with hidden scrollbar so 13 chips don't wrap and crowd the row.
      // Desktop (sm+): wraps normally — there's room for 13 chips at md widths and up.
      className="-mx-1 flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:snap-none sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {items.map((item) => {
        const isActive = (item.key === "all" && !active) || item.key === active;
        const href = item.key === "all" ? basePath : `${basePath}?kind=${item.key}`;
        return (
          <a
            key={item.key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-gold-deep bg-gold text-cream font-medium"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold",
            )}
          >
            <span>{item.label}</span>
            <span className={cn("text-xs tabular-nums", isActive ? "opacity-80" : "opacity-50")}>
              {item.count}
            </span>
          </a>
        );
      })}
    </nav>
  );
}