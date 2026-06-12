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
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = (item.key === "all" && !active) || item.key === active;
        const href = item.key === "all" ? basePath : `${basePath}?kind=${item.key}`;
        return (
          <a
            key={item.key}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
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
    </div>
  );
}