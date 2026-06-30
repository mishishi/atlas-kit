import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card as CardType } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { cn } from "@/lib/utils";
import { Tag } from "./tag";
import { StarButton } from "./star-button";

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
          // the 5.7MB full PNG. 600 cards now load as ~25MB total instead
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
          // R53 (2026-06-22) hover polish: scale image up 4% on card
          // hover. The image is `fill` (absolute positioned); Tailwind's
          // default transform-origin is center which gives the
          // "zoom-in" feel without clipping. transition-transform only
          // (not transition-all) so opacity/filter changes elsewhere
          // don't pay for the same frame budget.
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {/* "New" badge: surfaces cards added in the last 24h so users notice
            fresh content on repeat visits. Static dot (no infinite pulse) per
            the design review — MOTION_INTENSITY=4 doesn't justify a perpetual
            animation in a list of 600 cards. Round 12 fix: drop the duplicate
            aria-label; the visible "新收录" text is the SR-accessible name.

            Round 17 fix: `Date.now()` runs at SSR time (server clock) but
            again at hydration time (client clock) — the two can drift by
            seconds-to-minutes and silently flip the badge on/off across the
            boundary. suppressHydrationWarning tells React not to warn; we
            accept the very rare flash as the cost of keeping this a server
            component (moving it client-side would re-hydrate all 600 cards). */}
        {Date.now() - new Date(card.createdAt).getTime() < 86400000 && (
          <span
            suppressHydrationWarning
            className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-success-foreground shadow-card"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cream" aria-hidden="true" />
            新收录
          </span>
        )}
        {/* R52 (2026-06-22): favorite star — mirror of 新收录 badge on
            the top-right. Subtle variant: hidden until card hover
            (or always visible when favorited) so it doesn't fight the
            image. `stopPropagation` so clicking the star doesn't also
            trigger the parent Link's navigation. */}
        <div className="absolute top-2 right-2">
          <StarButton
            slug={card.slug}
            title={card.title}
            size="subtle"
            stopPropagation
          />
        </div>
        {/* R53 (2026-06-22) hover polish: "查看图鉴 ↗" affordance pill
            — fades in on card hover/focus, parallel to HeroWithLightbox's
            "查看原图" pattern. Without this, users on a grid page only
            see the title-text color shift on hover, which is too subtle
            for the 600-card grid where every card is clickable. The pill
            is purely decorative — clicking anywhere on the parent Link
            still navigates — but it answers "what does this card do?"
            without the user having to guess from the title text alone. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5",
            "rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground",
            "shadow-card backdrop-blur",
            "opacity-0 translate-y-1 transition-all duration-200 ease-out",
            "group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0",
          )}
        >
          查看图鉴
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>

      <div className="p-4 paper-grain">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
          <span>{seriesName}</span>
          <span>·</span>
          <span>No.{card.seriesNo}</span>
        </div>
        {/* R53 polish: title gains an animated underline on hover.
            The underline grows from 0 to full width via
            `w-0 group-hover:w-full` on a child span — matches the
            eyebrow tag pattern but stays scoped to just the title
            (subtitle + tags don't get the treatment, would feel
            busy). Color stays the same gold-deep it already flips to. */}
        <h3 className="relative font-serif text-lg font-semibold leading-tight mb-1 text-foreground group-hover:text-gold-deep transition-colors">
          {card.title}
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 left-0 h-px w-0 bg-gold-deep transition-all duration-300 ease-out group-hover:w-full"
          />
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