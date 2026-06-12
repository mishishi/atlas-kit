import Image from "next/image";
import Link from "next/link";
import { Card as CardType } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { cn } from "@/lib/utils";
import { Tag } from "./tag";

interface CardPreviewProps {
  card: CardType;
  className?: string;
  priority?: boolean;
}

export function CardPreview({ card, className, priority = false }: CardPreviewProps) {
  const seriesName = SERIES_TYPE_MAP[card.series]?.name ?? card.series;
  return (
    <Link
      href={`/cards/${card.slug}`}
      className={cn(
        "group block overflow-hidden rounded-lg border border-border bg-card shadow-card",
        "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-muted">
        <Image
          src={card.image}
          alt={`${card.title} 科普图鉴`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="object-cover"
        />
      </div>

      <div className="p-4 paper-grain">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          <span>{seriesName}</span>
          <span>·</span>
          <span>No.{card.seriesNo}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold leading-tight mb-1 group-hover:text-gold-deep transition-colors">
          {card.title}
        </h3>
        <p className="text-xs italic text-muted-foreground mb-3">{card.subtitle}</p>
        <div className="flex flex-wrap gap-1.5">
          {card.tags.slice(0, 3).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>
    </Link>
  );
}