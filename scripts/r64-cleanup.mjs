#!/usr/bin/env node
/**
 * R64-cleanup — remove the 6 R64 cards that matrix "dead-lettered" but
 * generate-card.mjs still added placeholder entries to cards.json.
 *
 * Background: matrix API returned 'no output_url in matrix response'
 * 4 times for ~6 R64 slugs. The script retried but each card was
 * dead-lettered without ever producing an image. However, BEFORE
 * dead-lettering, generate-card.mjs already added an entry to
 * cards.json with image pointing at /cards/<kind>/<slug>/<slug>-card.png.
 * For cards that actually wrote disk images (matrix produced something,
 * even if the response was malformed) the local files exist; for others,
 * the cards.json entry is an orphan with no image.
 *
 * To avoid shipping broken-image cards to prod, remove these entries
 * from cards.json. Ship only what matrix actually completed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards.json");
const PUBLIC = path.join(ROOT, "public");

const cards = JSON.parse(readFileSync(CARDS, "utf8"));

// R64 slugs matrix returned 'no output_url in matrix response' for.
// Keep only slugs where the local image file actually exists on disk.
const R64_FAILED = [
  "jiaxing",
  "beyond-music",
  "thor-cnt",
  "sumo",
  "tsunami-cnt",
  "kuroshio-current",
  "vancouver",
  "shantou",
];

let removed = 0;
const before = cards.length;
const filtered = cards.filter((c) => {
  if (!R64_FAILED.includes(c.slug)) return true;
  // Keep only if both -card.png AND -thumb.webp exist on disk.
  const cardPath = path.join(PUBLIC, "cards", c.kind, c.slug, `${c.slug}-card.png`);
  const thumbPath = path.join(PUBLIC, "cards", c.kind, c.slug, `${c.slug}-thumb.webp`);
  const keep = existsSync(cardPath) && existsSync(thumbPath);
  if (!keep) removed++;
  return keep;
});

writeFileSync(CARDS, JSON.stringify(filtered, null, 2) + "\n", "utf8");
console.log(`R64 cleanup: removed ${removed} orphan R64 cards. ${before} → ${filtered.length}.`);