import { Link2 } from "lucide-react";
import Link from "next/link";
import { CardPreview } from "./card-preview";
import { Card as CardType } from "@/lib/types";

interface CardGridProps {
  cards: CardType[];
  emptyMessage?: string;
  /** When cards is empty AND suggestions provided, render the suggestions
   *  list (used by search "no results" to push users to other queries). */
  suggestions?: { label: string; href: string }[];
  emptyTitle?: string;
}

export function CardGrid({
  cards,
  emptyMessage = "暂无图鉴",
  suggestions,
  emptyTitle,
}: CardGridProps) {
  if (cards.length === 0) {
    if (suggestions && suggestions.length > 0) {
      return (
        <div
          role="status"
          className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center"
        >
          {emptyTitle && (
            <h3 className="font-serif text-lg font-semibold mb-2">{emptyTitle}</h3>
          )}
          <p className="text-muted-foreground mb-5">{emptyMessage}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            试试这些
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2 list-none p-0">
            {suggestions.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link2 className="h-3 w-3" aria-hidden="true" />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <div className="grid place-items-center py-20 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <CardPreview key={card.slug} card={card} priority={idx < 4} />
      ))}
    </div>
  );
}