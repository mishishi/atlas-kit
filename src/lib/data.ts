import type { Card, Series } from "./types";
import { SERIES_TYPES, SERIES_TYPE_MAP } from "./series-types";
import cardsData from "../../data/cards.json";

const cards = cardsData as Card[];

export function getAllCards(): Card[] {
  return [...cards].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getCardBySlug(slug: string): Card | undefined {
  return cards.find((c) => c.slug === slug);
}

/**
 * Build Series view from SERIES_TYPES (single source of truth) +
 * runtime aggregation of cards.
 *
 * Each declared series appears in the list even if it has 0 cards,
 * so users can see "this series exists, just nothing yet".
 */
export function getAllSeries(): Series[] {
  const seriesCardsMap = new Map<string, Card[]>();
  for (const card of cards) {
    const slug = card.series;
    if (!seriesCardsMap.has(slug)) seriesCardsMap.set(slug, []);
    seriesCardsMap.get(slug)!.push(card);
  }

  const series: Series[] = SERIES_TYPES.map((st) => {
    const seriesCards = (seriesCardsMap.get(st.slug) ?? []).sort((a, b) =>
      a.seriesNo.localeCompare(b.seriesNo),
    );
    return {
      slug: st.slug,
      name: st.name,
      tagline: st.tagline,
      description: st.description,
      palette: st.palette,
      themeTags: st.themeTags,
      keywords: st.keywords,
      icon: st.icon,
      createdAt: st.createdAt,
      count: seriesCards.length,
      cards: seriesCards,
    };
  });

  // sort: series with cards first (newest), then empty series (newest declared)
  return series.sort((a, b) => {
    if (a.count > 0 && b.count === 0) return -1;
    if (a.count === 0 && b.count > 0) return 1;
    if (a.count > 0 && b.count > 0) {
      return a.cards[0].createdAt < b.cards[0].createdAt ? 1 : -1;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function getSeriesBySlug(slug: string): Series | undefined {
  return getAllSeries().find((s) => s.slug === slug);
}

export function getCardsBySeries(seriesSlug: string): Card[] {
  return cards.filter((c) => c.series === seriesSlug);
}

export function getCardsByKind(kind: Card["kind"]): Card[] {
  return cards.filter((c) => c.kind === kind);
}

/** Convert a human-readable name to a slug. Kept for legacy callers. */
export function seriesToSlug(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}

export function searchCards(query: string): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return cards.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q),
  );
}

export function getKindCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.kind] = (counts[card.kind] ?? 0) + 1;
  }
  return counts;
}

/** Top N tags across all cards (for filter UI). */
export function getTopTags(limit = 16): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    for (const t of card.tags) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export function getCardsByTag(tag: string): Card[] {
  return cards.filter((c) => c.tags.includes(tag));
}

/** Helper: is a series slug valid? */
export function isValidSeries(slug: string): boolean {
  return slug in SERIES_TYPE_MAP;
}

/**
 * Pick N cards from getAllCards(), one per kind when possible, so the
 * "popular" / "featured" rows look varied instead of clustered.
 * Ties broken by createdAt desc (newest first).
 */
export function getDiverseFeatured(n: number): Card[] {
  const all = getAllCards();
  const byKind = new Map<string, Card[]>();
  for (const c of all) {
    const arr = byKind.get(c.kind) ?? [];
    arr.push(c);
    byKind.set(c.kind, arr);
  }
  const out: Card[] = [];
  const kinds = [...byKind.keys()];
  // Round-robin: pick newest from each kind until we hit `n` or exhaust kinds
  let k = 0;
  while (out.length < n && k < 50) {
    let pickedThisRound = 0;
    for (const kind of kinds) {
      if (out.length >= n) break;
      const arr = byKind.get(kind)!;
      if (arr.length > k) {
        out.push(arr[k]);
        pickedThisRound++;
      }
    }
    if (pickedThisRound === 0) break;
    k++;
  }
  return out;
}
