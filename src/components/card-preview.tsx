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
      aria-label={`${card.title} — ${card.subtitle || "图鉴卡片"}`}
      className={cn(
        "group block overflow-hidden rounded-lg border border-border bg-card shadow-card",
        "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-card-hover",
        // Round 12 a11y fix: explicit focus-visible ring + offset for
        // keyboard users. Without this, sighted-mouse users see the
        // hover lift, but Tab users get no focus indicator at all.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-muted">
        <Image
          // List/card views use the 200-wide thumb (avg ~42KB) instead of
          // the 5.7MB full PNG. 60 cards now load as 2.5MB total instead
          // of 342MB. Falls back to card.image for placeholder cards that
          // haven't been resized yet.
          src={card.image_thumb ?? card.image}
          // Alt describes the IMAGE's content (card.subtitle), not the card itself.
          // The link's aria-label (title + subtitle) is the SR-accessible
          // name; image alt is just the picture content. Round 12 fix: also
          // drop the duplicate aria-label on the "新收录" badge below.
          alt={card.subtitle || card.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="object-cover"
        />
        {/* "New" badge: surfaces cards added in the last 24h so users notice
            fresh content on repeat visits. Static dot (no infinite pulse) per
            the design review — MOTION_INTENSITY=4 doesn't justify a perpetual
            animation in a list of 60 cards. Round 12 fix: drop the duplicate
            aria-label; the visible "新收录" text is the SR-accessible name.

            Round 17 fix: `Date.now()` runs at SSR time (server clock) but
            again at hydration time (client clock) — the two can drift by
            seconds-to-minutes and silently flip the badge on/off across the
            boundary. suppressHydrationWarning tells React not to warn; we
            accept the very rare flash as the cost of keeping this a server
            component (moving it client-side would re-hydrate all 60 cards). */}
        {Date.now() - new Date(card.createdAt).getTime() < 86400000 && (
          <span
            suppressHydrationWarning
            className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-success-foreground shadow-card"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cream" aria-hidden="true" />
            新收录
          </span>
        )}
      </div>

      <div className="p-4 paper-grain">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
          <span>{seriesName}</span>
          <span>·</span>
          <span>No.{card.seriesNo}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold leading-tight mb-1 group-hover:text-gold-deep transition-colors">
          {card.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{card.subtitle}</p>
        <div className="flex flex-wrap gap-1.5">
          {card.tags.slice(0, 3).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>
    </Link>
  );
}