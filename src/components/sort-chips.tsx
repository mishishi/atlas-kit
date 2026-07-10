"use client";

import Link from "next/link";

interface SortOption {
  key: string;
  label: string;
}

interface SortChipsProps {
  options: SortOption[];
  activeSort: string;
  buildHref: (key: string) => string;
  ariaLabel?: string;
  /** R78 (2026-07-10): when true, sticks the chip row to the top of
   *  the viewport on mobile so the user can re-sort mid-scroll on a
   *  600+ card grid. Defaults to false. Sticky offsets below the
   *  site header (top-16). Desktop stays inline (sm:static). */
  sticky?: boolean;
}

/**
 * R60plus (2026-06-30): SortChips — shared horizontal chip strip for
 * sort selection, used by /cards and /search. Each chip is a Link that
 * preserves the existing URL params and adds/replaces `sort=`.
 *
 * R78 (2026-07-10): optional `sticky` prop. On mobile (where the
 * 5/6-col grid is 30+ rows tall) the user often scrolls deep into
 * the list and wants to re-sort without scrolling back to the top.
 * Sticky at top-16 (just under the site header at top-0/12) keeps
 * the chip row visible. Desktop stays inline — desktop has a wider
 * viewport and the sort chips already fit in the eyebrow region.
 *
 * Why a component:
 *   - Both /cards and /search previously inline-defined identical chip
 *     markup. DRY-ing it ensures the two pages stay visually identical
 *     when one or the other changes.
 *   - The label "排序" + uppercase tracking is a recognizable affordance
 *     that pairs with subKind chips above it.
 *
 * Props:
 *   - options: [{ key, label }] — sort options (4 max)
 *   - activeSort: currently active key
 *   - buildHref(key): (key) => string — produce the chip's href given the
 *     new sort key. Caller is responsible for preserving other URL params.
 *   - ariaLabel: optional override (default "排序方式")
 *   - sticky: when true, makes the chip row sticky on mobile (default false)
 *
 * Visual contract (matches subKind chips above):
 *   - container: -mx-4 px-4 sm:mx-0 sm:px-0, mb-4
 *   - label: text-xs uppercase tracking-[0.15em] text-muted-foreground shrink-0
 *   - list: flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto
 *   - chip: rounded-full border px-3 text-xs min-h-[36px]
 *   - active: border-gold bg-cream text-gold-deep font-medium
 *   - inactive: border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold
 */
export function SortChips({ options, activeSort, buildHref, ariaLabel = "排序方式", sticky = false }: SortChipsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 ${
        sticky ? "sticky top-16 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 py-2 sm:static sm:bg-transparent sm:backdrop-blur-0 sm:py-0" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground shrink-0">
          排序
        </span>
        <ul className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible list-none p-0 scrollbar-editorial">
          {options.map((s) => {
            const href = buildHref(s.key);
            const isActive = activeSort === s.key;
            return (
              <li key={s.key}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-gold bg-cream text-gold-deep font-medium"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}