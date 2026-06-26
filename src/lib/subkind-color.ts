/**
 * R58d (2026-06-26): browser-safe subKind color palette.
 *
 * Each (kind, subKind) pair gets a deterministic hue via golden-ratio
 * stepping (137.508° apart) so 138 subKinds land on visually distinct
 * colors without collision-prone hashes.
 *
 * Why this lives in a separate file (not taxonomy.ts):
 *   - taxonomy.ts uses node:fs to read taxonomy.json, can't be imported
 *     into client components.
 *   - Color resolution is pure (input → output, no IO), so it doesn't
 *     need to live next to the taxonomy loader.
 *
 * If taxonomy.json adds new subKinds, append to SUB_KIND_ORDER below
 * to keep colors stable for existing entries. Order = taxonomy.json
 * walk order (kinds alphabetical, subKinds definition order within).
 */

import type { CardKind } from "./types";

const GOLDEN_HUE = 137.508;

/**
 * Source-of-truth order (must match taxonomy.json walk order).
 * If you add a new subKind to a kind, append it to that kind's array.
 * If you add a new kind, append a new entry at the end.
 */
const SUB_KIND_ORDER: Array<{ kind: CardKind; slug: string }> = [
  // pet
  { kind: "pet", slug: "dog-breed" },
  { kind: "pet", slug: "cat-breed" },
  { kind: "pet", slug: "pet-bird" },
  { kind: "pet", slug: "reptile" },
  { kind: "pet", slug: "small-mammal" },
  // animal
  { kind: "animal", slug: "mammal" },
  { kind: "animal", slug: "bird" },
  { kind: "animal", slug: "marine" },
  { kind: "animal", slug: "reptile" },
  { kind: "animal", slug: "insect" },
  // city
  { kind: "city", slug: "ancient-capital" },
  { kind: "city", slug: "jiangnan-water-town" },
  { kind: "city", slug: "modern-mega" },
  { kind: "city", slug: "coastal" },
  { kind: "city", slug: "mountain" },
  // festival
  { kind: "festival", slug: "traditional" },
  { kind: "festival", slug: "solar-term" },
  { kind: "festival", slug: "ethnic-minority" },
  { kind: "festival", slug: "foreign" },
  { kind: "festival", slug: "modern-holiday" },
  // food
  { kind: "food", slug: "northern" },
  { kind: "food", slug: "southern" },
  { kind: "food", slug: "western" },
  { kind: "food", slug: "street-food" },
  { kind: "food", slug: "dessert" },
  { kind: "food", slug: "drink" },
  // phenomenon
  { kind: "phenomenon", slug: "weather" },
  { kind: "phenomenon", slug: "astronomical" },
  { kind: "phenomenon", slug: "geological" },
  { kind: "phenomenon", slug: "ocean" },
  { kind: "phenomenon", slug: "biological" },
  // history
  { kind: "history", slug: "pre-qin" },
  { kind: "history", slug: "han" },
  { kind: "history", slug: "tang-song" },
  { kind: "history", slug: "ming-qing" },
  { kind: "history", slug: "modern" },
  { kind: "history", slug: "contemporary" },
  // object
  { kind: "object", slug: "daily-use" },
  { kind: "object", slug: "craft" },
  { kind: "object", slug: "art" },
  { kind: "object", slug: "ritual" },
  { kind: "object", slug: "scientific" },
  // tech
  { kind: "tech", slug: "information" },
  { kind: "tech", slug: "energy" },
  { kind: "tech", slug: "materials" },
  { kind: "tech", slug: "transport" },
  { kind: "tech", slug: "biomedical" },
  // person
  { kind: "person", slug: "ancient-scholar" },
  { kind: "person", slug: "ancient-leader" },
  { kind: "person", slug: "ancient-scientist" },
  { kind: "person", slug: "modern-figure" },
  { kind: "person", slug: "literary-character" },
  // other
  { kind: "other", slug: "intangible-heritage" },
  { kind: "other", slug: "cultural-symbol" },
  { kind: "other", slug: "tradition" },
  { kind: "other", slug: "ceremony" },
  { kind: "other", slug: "craft-and-botanical-mix" },
  // architecture
  { kind: "architecture", slug: "ancient-palace" },
  { kind: "architecture", slug: "religious" },
  { kind: "architecture", slug: "defensive" },
  { kind: "architecture", slug: "garden" },
  { kind: "architecture", slug: "modern" },
  { kind: "architecture", slug: "ancient-tower" },
  // artwork
  { kind: "artwork", slug: "painting" },
  { kind: "artwork", slug: "sculpture" },
  { kind: "artwork", slug: "ceramic" },
  { kind: "artwork", slug: "calligraphy" },
  { kind: "artwork", slug: "textile" },
  // mythology
  { kind: "mythology", slug: "greek" },
  { kind: "mythology", slug: "norse" },
  { kind: "mythology", slug: "chinese" },
  { kind: "mythology", slug: "egyptian" },
  { kind: "mythology", slug: "hindu" },
  { kind: "mythology", slug: "japanese" },
  { kind: "mythology", slug: "classical-roman" },
  { kind: "mythology", slug: "european-pagan" },
  { kind: "mythology", slug: "near-eastern" },
  { kind: "mythology", slug: "americas" },
  { kind: "mythology", slug: "oceania" },
  // book
  { kind: "book", slug: "classical" },
  { kind: "book", slug: "modern-literature" },
  { kind: "book", slug: "science" },
  { kind: "book", slug: "children" },
  { kind: "book", slug: "reference" },
  // chemical-element
  { kind: "chemical-element", slug: "alkali-metal" },
  { kind: "chemical-element", slug: "alkaline-earth" },
  { kind: "chemical-element", slug: "transition-metal" },
  { kind: "chemical-element", slug: "post-transition" },
  { kind: "chemical-element", slug: "nonmetal" },
  { kind: "chemical-element", slug: "noble-gas" },
  // country
  { kind: "country", slug: "east-asia" },
  { kind: "country", slug: "southeast-asia" },
  { kind: "country", slug: "south-asia" },
  { kind: "country", slug: "europe" },
  { kind: "country", slug: "americas" },
  { kind: "country", slug: "oceania-africa" },
  // space-object
  { kind: "space-object", slug: "planet" },
  { kind: "space-object", slug: "moon" },
  { kind: "space-object", slug: "star" },
  { kind: "space-object", slug: "galaxy" },
  { kind: "space-object", slug: "nebula" },
  { kind: "space-object", slug: "other-cosmic" },
  // sport
  { kind: "sport", slug: "ball-sport" },
  { kind: "sport", slug: "water-sport" },
  { kind: "sport", slug: "combat" },
  { kind: "sport", slug: "athletics" },
  { kind: "sport", slug: "winter" },
  { kind: "sport", slug: "mind-sport" },
  // profession
  { kind: "profession", slug: "medical" },
  { kind: "profession", slug: "engineering" },
  { kind: "profession", slug: "education" },
  { kind: "profession", slug: "art" },
  { kind: "profession", slug: "service" },
  { kind: "profession", slug: "tech" },
  // disease
  { kind: "disease", slug: "infectious" },
  { kind: "disease", slug: "chronic" },
  { kind: "disease", slug: "cancer" },
  { kind: "disease", slug: "genetic" },
  { kind: "disease", slug: "mental" },
  // vehicle
  { kind: "vehicle", slug: "car" },
  { kind: "vehicle", slug: "aircraft" },
  { kind: "vehicle", slug: "ship" },
  { kind: "vehicle", slug: "train" },
  { kind: "vehicle", slug: "spacecraft" },
  // music
  { kind: "music", slug: "chinese-pop" },
  { kind: "music", slug: "chinese-rock" },
  { kind: "music", slug: "japanese" },
  { kind: "music", slug: "western-classic" },
  { kind: "music", slug: "western-modern" },
  { kind: "music", slug: "anime-ost" },
  { kind: "music", slug: "film-ost" },
  // anime
  { kind: "anime", slug: "shonen" },
  { kind: "anime", slug: "seinen" },
  { kind: "anime", slug: "shoujo" },
  { kind: "anime", slug: "mecha" },
  { kind: "anime", slug: "isekai" },
  { kind: "anime", slug: "slice-of-life" },
  // movie
  { kind: "movie", slug: "hollywood" },
  { kind: "movie", slug: "chinese" },
  { kind: "movie", slug: "japanese" },
  { kind: "movie", slug: "european" },
  { kind: "movie", slug: "animation" },
  { kind: "movie", slug: "documentary" },
  // plant (R58b — added in plant taxonomy fill)
  { kind: "plant", slug: "flower" },
  { kind: "plant", slug: "tree" },
  { kind: "plant", slug: "tea" },
  { kind: "plant", slug: "grass" },
];

const IDX_BY_KEY = new Map<string, number>();
SUB_KIND_ORDER.forEach((p, i) => {
  IDX_BY_KEY.set(`${p.kind}/${p.slug}`, i);
});

const FALLBACK = { fill: "#f5f0e6", stroke: "#b88952" };

export function subKindColor(
  kind: CardKind,
  subKind: string | undefined,
): { fill: string; stroke: string } {
  if (!subKind) return FALLBACK;
  const idx = IDX_BY_KEY.get(`${kind}/${subKind}`);
  if (idx === undefined) return FALLBACK;
  const hue = (idx * GOLDEN_HUE) % 360;
  return {
    fill: `hsl(${hue.toFixed(0)}, 55%, 65%)`,
    stroke: `hsl(${hue.toFixed(0)}, 65%, 40%)`,
  };
}