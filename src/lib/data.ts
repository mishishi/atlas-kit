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

/**
 * R34 (2026-06-17): prev/next navigation in same series, sorted by
 * seriesNo. Returns the cards immediately before and after the given
 * slug, with wrap-around (last → first, first → last). Used by the
 * 翻图录浏览体验 (Detail page prev/next + keyboard nav).
 *
 * If the slug isn't found, returns {prev: undefined, next: undefined}.
 * Single-card series returns the same card on both sides.
 */
export function getAdjacentInSeries(slug: string): {
  prev?: Card;
  next?: Card;
} {
  const card = getCardBySlug(slug);
  if (!card) return { prev: undefined, next: undefined };
  const series = getCardsBySeries(card.series).sort((a, b) =>
    a.seriesNo.localeCompare(b.seriesNo, "en", { numeric: true }),
  );
  const i = series.findIndex((c) => c.slug === slug);
  if (i < 0) return { prev: undefined, next: undefined };
  const n = series.length;
  return {
    prev: series[(i - 1 + n) % n],
    next: series[(i + 1) % n],
  };
}

export function getCardsByKind(kind: Card["kind"]): Card[] {
  return cards.filter((c) => c.kind === kind);
}

/** Convert a human-readable name to a slug. Kept for legacy callers. */
export function seriesToSlug(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Fuzzy search across title, subtitle, tagline, description and tags.
 * Uses fuse.js (already a dependency). Returns cards sorted by
 * relevance score (lower = better in fuse). Empty query returns [].
 *
 * Weights: title/subtitle/tagline are user-facing and carry the
 * strongest signal; description is longer so we set a smaller weight;
 * tags are already the most-sparse signal so we keep them moderate.
 *
 * Threshold 0.4 = quite permissive (catches typos like "金毛" → "金
 * 茂" too), so the empty-state copy is "try one of these" rather
 * than "no results" for the common typo case.
 */
export function searchCards(query: string): Card[] {
  const q = query.trim();
  if (!q) return [];
  // Lazy-init fuse on first call. Module-level so the search index
  // is built once per process and shared across requests.
  const fuse = getFuse();
  return fuse.search(q).map((r) => r.item);
}

// Fuse instance — built once on first search, re-used for subsequent
// queries. 60 cards is tiny (few KB of memory) so there's no win in
// streaming or rebuild logic.
let _fuse: import("fuse.js").default<Card> | null = null;
function getFuse() {
  if (_fuse) return _fuse;
  // Dynamic import would be ideal for server bundle, but fuse.js is
  // only ~6KB and we always need it (search is the primary entry),
  // so a static import is fine.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Fuse = require("fuse.js").default as typeof import("fuse.js").default;
  _fuse = new Fuse(cards, {
    keys: [
      { name: "title", weight: 3 },
      { name: "subtitle", weight: 1.5 },
      { name: "tagline", weight: 1.5 },
      { name: "tags", weight: 1 },
      { name: "description", weight: 0.5 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 1,
  });
  return _fuse;
}

/**
 * Pre-compute the document frequency of every tag across all cards.
 * Used by relatedScore() for IDF (Inverse Document Frequency) weighting
 * so that common tags (e.g. "中国" appears on 44/60 cards) contribute
 * less to the relatedness score than rare tags (e.g. "三星伴月" on 1/60).
 *
 * Built once at module load — O(N × avg-tags-per-card) ≈ 60 × 8 = 480 ops.
 * Without this, recommendations on 中国-themed cards would just be a
 * list of every other 中国 card (44/60 = 73% of the corpus matches),
 * which is exactly the Round 27 P1-6 problem.
 */
const TAG_DOC_FREQ = new Map<string, number>();
for (const c of cards) {
  for (const t of c.tags) {
    TAG_DOC_FREQ.set(t, (TAG_DOC_FREQ.get(t) ?? 0) + 1);
  }
}
/** log(N / df + 1) — softer than full IDF, prevents zero-division on
 *  tags that appear on every card. */
const TAG_IDF = new Map<string, number>();
const N = cards.length;
for (const [tag, df] of TAG_DOC_FREQ) {
  TAG_IDF.set(tag, Math.log(N / (df + 1)) + 1);
}

/**
 * Score a card against a target card for "你可能也会喜欢" recommendations.
 * Used by getRelatedCards() below. Higher = more related.
 *
 *   +5 same kind (taxonomic similarity)
 *   +3 same series (story similarity — usually already shown in 同系列
 *       siblings block, so caller excludes those before calling this)
 *   +4 same subKind (R58e, 2026-06-26: L3 taxonomy. Picks up the
 *       "罗马神话 → 希腊神话" / "古都 → 古都" type signal that
 *       same-kind alone misses. SubKind is more specific than kind
 *       so it should rank above tag IDF but below same-series.)
 *   +Σ IDF(tag) for each shared tag (no cap, no flat weight).
 *       Rare tags (low df) carry more signal than common ones.
 *
 * Palette similarity was tried in 2026-06 but dropped: the 60-card
 * batch run used only 6 distinct palettes (one per series), so the
 * palette check either matched everything (low threshold) or
 * nothing (high threshold). Tags give us actual content-based
 * differentiation. Bring palette back if/when palettes diversify.
 */
function relatedScore(target: Card, candidate: Card): number {
  let score = 0;
  if (target.kind === candidate.kind) score += 5;
  if (target.series === candidate.series) score += 3;
  // R58e: subKind match. 4 pts sits between series (+3) and kind (+5)
  // — subKind is more specific than kind but spans series, so it
  // should rank above series-only and below kind+series combo.
  if (
    target.subKind &&
    candidate.subKind &&
    target.subKind === candidate.subKind
  ) {
    score += 4;
  }
  for (const t of target.tags) {
    if (candidate.tags.includes(t)) {
      score += TAG_IDF.get(t) ?? 0;
    }
  }
  return score;
}

/**
 * Pick N cards related to `target` for the "你可能也会喜欢" section
 * on the detail page. Excludes:
 *   - the target itself
 *   - same-series siblings (they're already in the 同系列 block)
 *   - cards of the same kind already shown in 同类推荐 (the caller
 *     passes those slugs in `excludeSlugs`)
 *
 * Algorithm: score all candidates with relatedScore (IDF-weighted),
 * sort desc, take top N. Tie-breaker: newer createdAt first.
 *
 * Round 27 (2026-06-17): added IDF weighting. Before this, the top-5
 * "related" cards for any 中国-themed card were just the 5 most
 * recent 中国 cards, which isn't a recommendation. Now rare-tag
 * matches push the most thematically distinct cards up.
 */
export function getRelatedCards(
  target: Card,
  n: number,
  excludeSlugs: Set<string> = new Set(),
): Card[] {
  const exclude = new Set([target.slug, ...excludeSlugs]);
  const scored = cards
    .filter((c) => !exclude.has(c.slug))
    .map((c) => ({ c, score: relatedScore(target, c) }))
    .filter((x) => x.score >= 3); // minimum: at least one shared cross-tag (or 1+tag + same kind)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.c.createdAt < b.c.createdAt ? 1 : -1;
  });
  return scored.slice(0, n).map((x) => x.c);
}

/** Return the N most recently added cards. */
export function getRecentCards(n: number): Card[] {
  return getAllCards().slice(0, n);
}

/**
 * Build a forward-mention index: for every card slug, list the slugs
 * of OTHER cards whose titles appear in this card's description /
 * tagline / subtitle text.
 *
 * Used by the detail page for two things:
 *   1. Inline `<Link>` rendering inside the description body
 *   2. "X 也提到了这张" reverse-reference section
 *
 * Why a Map<string, Set<string>> and not a Map<string, string[]>:
 * sets dedupe by definition, and a card mentioning another card
 * twice in its body shouldn't be counted twice downstream.
 *
 * The index is built once per process (60 cards, cheap) and shared.
 */
let _mentionIndex: Map<string, Set<string>> | null = null;
export function getMentionIndex(): Map<string, Set<string>> {
  if (_mentionIndex) return _mentionIndex;
  // Build a title → slug map. Use the FIRST slug if two cards share
  // a title (shouldn't happen with English slugs, but defensive).
  const titleToSlug = new Map<string, string>();
  for (const c of cards) {
    if (!titleToSlug.has(c.title)) titleToSlug.set(c.title, c.slug);
  }
  const idx = new Map<string, Set<string>>();
  for (const c of cards) {
    const haystack = [c.description, c.tagline, c.subtitle].filter(Boolean).join(" ");
    const mentioned = new Set<string>();
    for (const [title, slug] of titleToSlug) {
      if (slug === c.slug) continue;
      if (title.length < 2) continue; // skip 1-char false positives
      if (haystack.includes(title)) mentioned.add(slug);
    }
    idx.set(c.slug, mentioned);
  }
  _mentionIndex = idx;
  return idx;
}

/** Forward mentions of a card (cards that this card mentions in its text). */
export function getForwardMentions(slug: string): Card[] {
  const idx = getMentionIndex();
  const slugs = idx.get(slug) ?? new Set();
  return cards.filter((c) => slugs.has(c.slug));
}

/** Reverse references: cards that mention this card in their text. */
export function getReverseMentions(slug: string, limit = 8): Card[] {
  const idx = getMentionIndex();
  const refs: Card[] = [];
  for (const [otherSlug, mentioned] of idx) {
    if (otherSlug === slug) continue;
    if (mentioned.has(slug)) {
      const c = cards.find((x) => x.slug === otherSlug);
      if (c) refs.push(c);
    }
  }
  // Newest mentions first
  refs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return refs.slice(0, limit);
}

/**
 * Build a {title: slug} map for ALL other cards, used by <LinkedText>
 * to render the description body with internal links to any card
 * whose title appears in the text.
 */
export function getAllCardsForMentionMap(excludeSlug?: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of cards) {
    if (c.slug === excludeSlug) continue;
    // Don't overwrite if two cards share a title — keep the first
    if (!(c.title in map)) map[c.title] = c.slug;
  }
  return map;
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
