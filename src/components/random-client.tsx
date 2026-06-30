"use client";

/**
 * R52 (2026-06-22): /random client UI — replaces the old 302 redirect.
 *
 * Interactive features:
 *   - Hero card preview (image + title + tagline) instead of bare redirect
 *   - 4 action buttons: 再换一张 / 看详情 / 收藏 / 同系列再抽
 *   - 24-kind chips at top (filter the candidate pool)
 *   - URL ?kind=X → deep link, browser back/forward works
 *   - sessionStorage tracks drawn slugs (防重复); pool resets when full
 *
 * SSR-safe:
 *   - First paint: pre-renders with the first candidate (URL ?kind
 *     wins if provided, else `cards[0]`). The candidate is determined
 *     deterministically from the URL filter so SSR + first client
 *     render agree (no hydration flash on the displayed card).
 *   - sessionStorage / localStorage reads happen after mount only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Dices,
  Eye,
  RefreshCw,
  Shuffle,
  Star,
} from "lucide-react";
import type { Card, CardKind } from "@/lib/types";
import { KIND_LABELS, displayLabel } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { THEME_TYPES } from "@/lib/theme-types";
import { getSubKindsForKind, getSubKindLabel } from "@/lib/taxonomy-browser";
import { StarButton } from "./star-button";
import { cn } from "@/lib/utils";

interface RandomClientProps {
  allCards: Card[];
}

const HISTORY_KEY = "atlas-kit-random-history";
const HISTORY_MAX = 20; // remember up to last 20 drawn slugs (session-scoped)

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(next: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Quota / SecurityError — fail silently
  }
}

export function RandomClient({ allCards }: RandomClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kindFilter = searchParams.get("kind") as CardKind | null;
  const subKindFilter = searchParams.get("subKind");

  // All kinds (with count) — used for chips. Includes "all" pseudo.
  const kindOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allCards) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
    return [
      { key: null, label: "全部", count: allCards.length },
      ...THEME_TYPES.filter((t) => counts.has(t.key)).map((t) => ({
        key: t.key as CardKind,
        label: t.label,
        count: counts.get(t.key) ?? 0,
      })),
    ];
  }, [allCards]);

  // R58 (2026-06-26): subKind chips for active kind. Only shown when
  // a kind is selected AND that kind has subKinds in taxonomy.
  const subKindOptions = useMemo(() => {
    if (!kindFilter) return [];
    const list = getSubKindsForKind(kindFilter);
    return list.map((s) => {
      const count = allCards.filter(
        (c) => c.kind === kindFilter && c.subKind === s.slug,
      ).length;
      return { slug: s.slug, label: s.label, count };
    });
  }, [allCards, kindFilter]);

  // Validate subKind against taxonomy for current kind. Invalid (stale
  // link, removed taxonomy bucket) → ignore silently.
  const activeSubKind =
    kindFilter && subKindFilter && subKindOptions.some((s) => s.slug === subKindFilter)
      ? subKindFilter
      : null;

  // Candidate pool (filtered by kind + subKind).
  const pool = useMemo(() => {
    if (!kindFilter) return allCards;
    let result = allCards.filter((c) => c.kind === kindFilter);
    if (activeSubKind) result = result.filter((c) => c.subKind === activeSubKind);
    return result;
  }, [allCards, kindFilter, activeSubKind]);

  // The currently-displayed slug. SSR + first client render agree on
  // the deterministic pick below (no flash on hydration).
  const [slug, setSlug] = useState<string | null>(() => {
    if (pool.length === 0) return null;
    return pool[0].slug;
  });
  // Tracks whether we've mounted. Gates any sessionStorage-based logic.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reroll helper — picks a slug from `pool` avoiding history.
  // R-G (2026-06-30): added `sameSubKind` mode for subKind-aware reroll.
  // Now 3 modes:
  //   - false:           any card in pool
  //   - sameSeries=true: only same series as current card
  //   - sameSubKind=true: only same subKind as current card
  // History exclusion is skipped when the candidate pool is too small
  // (otherwise tiny pools of 2-3 cards would always re-draw the same
  // one — user complaint: "再换一张" button is a no-op).
  const reroll = useCallback(
    (sameSeries = false, sameSubKind = false) => {
      if (pool.length === 0) return;
      const history = readHistory();
      let candidates = pool;
      if (slug) {
        const currentCard = pool.find((c) => c.slug === slug);
        if (currentCard) {
          if (sameSeries) {
            const sameSeriesPool = pool.filter(
              (c) => c.series === currentCard.series && c.slug !== slug,
            );
            if (sameSeriesPool.length > 0) candidates = sameSeriesPool;
          } else if (sameSubKind) {
            const sameSubKindPool = pool.filter(
              (c) =>
                c.kind === currentCard.kind &&
                c.subKind === currentCard.subKind &&
                c.slug !== slug,
            );
            if (sameSubKindPool.length > 0) candidates = sameSubKindPool;
          }
        }
      }
      // Pool too small (≤2) — history exclusion would make the reroll
      // effectively deterministic. Always draw from full candidates.
      const skipHistory = candidates.length <= 2;
      const fresh = skipHistory
        ? candidates
        : candidates.filter((c) => !history.includes(c.slug));
      const chosen =
        fresh.length > 0
          ? fresh[Math.floor(Math.random() * fresh.length)]
          : candidates[Math.floor(Math.random() * candidates.length)];
      setSlug(chosen.slug);
      // Update history (newest first, capped)
      const newHistory = [chosen.slug, ...history].slice(0, HISTORY_MAX);
      writeHistory(newHistory);
    },
    [pool, slug],
  );

  // When the kind or subKind filter changes (e.g. chip click), reset
  // displayed slug to a deterministic first candidate of the new pool
  // so the UI doesn't show "stale" card from a different kind/subKind.
  useEffect(() => {
    if (pool.length > 0 && (!slug || !pool.find((c) => c.slug === slug))) {
      setSlug(pool[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, activeSubKind]);

  // Spacebar to reroll (when not focused in input).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== " ") return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      reroll(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reroll]);

  const card = slug ? allCards.find((c) => c.slug === slug) : null;

  function setKind(next: CardKind | null) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next) params.set("kind", next);
    else params.delete("kind");
    // Switching kind invalidates subKind — drop it from URL so the
    // candidate pool isn't empty due to stale subKind.
    params.delete("subKind");
    const qs = params.toString();
    router.replace(qs ? `/random?${qs}` : "/random", { scroll: false });
  }

  function setSubKind(next: string | null) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next) params.set("subKind", next);
    else params.delete("subKind");
    const qs = params.toString();
    router.replace(qs ? `/random?${qs}` : "/random", { scroll: false });
  }

  if (pool.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center"
      >
        <Dices className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
        <p className="text-muted-foreground">
          没有符合{" "}
          <strong>
            {kindFilter ? KIND_LABELS[kindFilter] : "当前"}
            {activeSubKind && ` · ${getSubKindLabel(kindFilter!, activeSubKind) ?? activeSubKind}`}
          </strong>{" "}
          的图鉴。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Kind chips */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          按类型筛选
        </p>
        <div className="flex flex-wrap gap-1.5">
          {kindOptions.map((opt) => {
            const active = (opt.key ?? null) === (kindFilter ?? null);
            return (
              <button
                key={opt.key ?? "all"}
                type="button"
                onClick={() => setKind(opt.key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "border-gold bg-gold/15 text-gold-deep font-medium"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                )}
              >
                {opt.label}
                <span className="opacity-60 tabular-nums">{opt.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* R58 (2026-06-26): subKind chips — only when kind selected and
          that kind has subKinds in taxonomy. */}
      {kindFilter && subKindOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            二级分类
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSubKind(null)}
              aria-pressed={!activeSubKind}
              className={cn(
                "inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !activeSubKind
                  ? "border-gold bg-gold/15 text-gold-deep font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              全部
              <span className="opacity-60 tabular-nums">
                {allCards.filter((c) => c.kind === kindFilter).length}
              </span>
            </button>
            {subKindOptions.map((opt) => {
              const active = activeSubKind === opt.slug;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  onClick={() => setSubKind(active ? null : opt.slug)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-gold bg-gold/15 text-gold-deep font-medium"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  {opt.label}
                  <span className="opacity-60 tabular-nums">{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero card preview */}
      {card && (
        <article
          aria-live="polite"
          className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr] md:items-start"
        >
          {/* Image */}
          <div className="relative mx-auto w-full max-w-[360px] aspect-[9/16] overflow-hidden rounded-lg border border-border bg-card shadow-card-hover">
            <Image
              src={card.image_thumb ?? card.image}
              alt={card.subtitle || card.title}
              fill
              sizes="(max-width: 768px) 80vw, 360px"
              priority
              className="object-cover"
            />
            {/* Top-right star overlay */}
            <div className="absolute top-3 right-3 z-10">
              <StarButton slug={card.slug} title={card.title} size="prominent" />
            </div>
          </div>

          {/* Meta + buttons */}
          <div className="space-y-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold-deep mb-2">
                {SERIES_TYPE_MAP[card.series]?.name ?? card.series}
                <span>·</span>
                <span>No.{card.seriesNo}</span>
                <span>·</span>
                <span>{displayLabel(card.kind)}</span>
                {card.subKind && (
                  <>
                    <span>›</span>
                    <span>{getSubKindLabel(card.kind, card.subKind) ?? card.subKind}</span>
                  </>
                )}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold leading-tight mb-2">
                {card.title}
              </h2>
              <p className="font-serif text-lg text-gold-deep mb-3">{card.subtitle}</p>
              <p className="text-base text-foreground/80 leading-relaxed line-clamp-4">
                {card.tagline}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => reroll(false)}
                className="inline-flex items-center gap-2 min-h-[44px] rounded-md bg-gold-deep px-5 text-sm font-medium text-cream shadow-card transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                再换一张
                <kbd className="ml-1 px-1.5 py-0.5 rounded border border-cream/30 bg-cream/10 text-[10px] font-mono">
                  Space
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => reroll(true)}
                disabled={(() => {
                  const cur = card;
                  if (!cur) return true;
                  return (
                    pool.filter(
                      (c) => c.series === cur.series && c.slug !== cur.slug,
                    ).length === 0
                  );
                })()}
                className="inline-flex items-center gap-2 min-h-[44px] rounded-md border border-border bg-card px-5 text-sm transition-colors hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                同系列再抽
              </button>
              {/* R-G (2026-06-30): subKind-aware reroll. Disabled when the
                  current card has no subKind or the (kind, subKind) bucket
                  has no other cards. Sits next to "同系列" so user can
                  choose wider (any in series) vs narrower (same subKind). */}
              <button
                type="button"
                onClick={() => reroll(false, true)}
                disabled={(() => {
                  const cur = card;
                  if (!cur || !cur.subKind) return true;
                  return (
                    pool.filter(
                      (c) =>
                        c.kind === cur.kind &&
                        c.subKind === cur.subKind &&
                        c.slug !== cur.slug,
                    ).length === 0
                  );
                })()}
                className="inline-flex items-center gap-2 min-h-[44px] rounded-md border border-border bg-card px-5 text-sm transition-colors hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                同分类再抽
              </button>
              <Link
                href={`/cards/${card.slug}`}
                className="inline-flex items-center gap-2 min-h-[44px] rounded-md border border-border bg-card px-5 text-sm transition-colors hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                看详情
              </Link>
              {mounted && (
                <Link
                  href="/favorites"
                  className="inline-flex items-center gap-2 min-h-[44px] rounded-md border border-border bg-card px-5 text-sm transition-colors hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                  收藏夹
                </Link>
              )}
            </div>

            {/* Stats: roll count + history */}
            <p className="text-xs text-muted-foreground pt-2">
              本次刷新已抽 <span className="text-gold-deep font-medium tabular-nums">{mounted ? readHistory().length : 0}</span> 张
              {" · "}
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Space</kbd>
              {" "}再抽一张
            </p>
          </div>
        </article>
      )}
    </div>
  );
}