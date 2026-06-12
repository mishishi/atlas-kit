import { CardPreview } from "./card-preview";
import { Card as CardType } from "@/lib/types";

interface CardGridProps {
  cards: CardType[];
  emptyMessage?: string;
}

export function CardGrid({ cards, emptyMessage = "暂无图鉴" }: CardGridProps) {
  if (cards.length === 0) {
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