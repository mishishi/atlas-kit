"use client";

/**
 * R52 (2026-06-22): FavoritesBadge — header 右上角 icon-only favorites
 * shortcut. Stays out of the 7-item nav (per "5±2 mobile-nav" rule)
 * by sitting next to the theme toggle as a self-contained icon
 * button. Shows the current favorited count as a small numeric
 * badge — empty when 0 (avoids visual noise on first visit).
 *
 * SSR-safe: count starts at 0 on both server + first client paint
 * (useFavorites' empty initial Set), then bumps after hydration.
 * Acceptable because the badge is purely cosmetic (no skipped nav
 * item, no broken link).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function FavoritesBadge() {
  const { count, hydrated } = useFavorites();
  const pathname = usePathname() ?? "/";
  const active = pathname === "/favorites";

  return (
    <Link
      href="/favorites"
      aria-label={`收藏夹${count > 0 ? ` (${count})` : ""}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      <Star
        className={cn(
          "h-5 w-5 transition-colors",
          count > 0 ? "fill-gold text-gold-deep" : "text-current",
        )}
        aria-hidden="true"
      />
      {/* Count badge — only render after hydration AND when > 0.
          `suppressHydrationWarning` covers the brief flash between
          SSR (no badge) and post-hydration (badge appears). */}
      {hydrated && count > 0 && (
        <span
          suppressHydrationWarning
          className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-deep px-1 text-[10px] font-medium text-cream shadow-card tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}