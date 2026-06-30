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
}

/**
 * R60plus (2026-06-30): SortChips — shared horizontal chip strip for
 * sort selection, used by /cards and /search. Each chip is a Link that
 * preserves the existing URL params and adds/replaces `sort=`.
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
 *
 * Visual contract (matches subKind chips above):
 *   - container: -mx-4 px-4 sm:mx-0 sm:px-0, mb-4
 *   - label: text-xs uppercase tracking-[0.15em] text-muted-foreground shrink-0
 *   - list: flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto
 *   - chip: rounded-full border px-3 text-xs min-h-[36px]
 *   - active: border-gold bg-cream text-gold-deep font-medium
 *   - inactive: border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold
 */
export function SortChips({ options, activeSort, buildHref, ariaLabel = "排序方式" }: SortChipsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
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