import { THEME_TYPES } from "./theme-types";
import { SERIES_TYPES, type SeriesType } from "./series-types";

export type { ThemeType } from "./theme-types";
export { THEME_TYPES, THEME_TYPE_MAP, PROMPT_TYPES } from "./theme-types";
export { SERIES_TYPES, SERIES_TYPE_MAP, recommendSeries } from "./series-types";
export type { SeriesType } from "./series-types";

// CardKind = union of all theme type keys. Kept in sync with THEME_TYPES[].key
// (manually, since TS can't infer literal types from runtime arrays).
export type CardKind =
  | "pet"
  | "animal"
  | "plant"
  | "city"
  | "person"
  | "festival"
  | "food"
  | "phenomenon"
  | "history"
  | "object"
  | "tech"
  | "other";

export interface Card {
  slug: string;
  title: string;
  kind: CardKind;
  /** Series slug — points to SERIES_TYPES[].slug. Decoupled from kind (a card's
   *  series is editorial/story-level, while kind is taxonomic/category-level). */
  series: string;
  seriesNo: string;
  palette: [string, string, string]; // [bg, accent, secondary]
  image: string;
  score: number;
  tags: string[];
  tagline: string;
  subtitle: string;
  description: string;
  createdAt: string; // ISO date
}

/** Series — collection-level view (slug, name, plus runtime-aggregated fields) */
export interface Series {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  palette: [string, string, string];
  themeTags: string[];
  keywords: string[];
  icon?: string;
  createdAt: string;
  // runtime-aggregated:
  count: number;
  cards: Card[];
}

/** label for each kind — derived from THEME_TYPES so it stays in sync */
export const KIND_LABELS: Record<CardKind, string> = Object.fromEntries(
  THEME_TYPES.map((t) => [t.key, t.label]),
) as Record<CardKind, string>;

/** lucide icon name for each kind */
export const KIND_ICONS: Record<CardKind, string> = Object.fromEntries(
  THEME_TYPES.map((t) => [t.key, "Sparkles"]),
) as Record<CardKind, string>;

// Backwards compat: legacy "dog" entries render as pet in UI
export function displayLabel(kind: string): string {
  if (kind === "dog") return KIND_LABELS.pet;
  return (KIND_LABELS as Record<string, string>)[kind] ?? kind;
}
