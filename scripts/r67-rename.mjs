#!/usr/bin/env node
/**
 * r67-rename.mjs — post-process r67 cards: rename hash slug → real slug.
 * Strategy:
 *   - Find placeholder entry (slug = realSlug, no image) → realEntry
 *   - Find generated entry (slug = card-<hash>, has image) → hashEntry
 *   - Move hashEntry's files from /cards/<kind>/<hash>/ to /cards/<kind>/<real>/
 *   - Rewrite hashEntry.slug/image paths to realSlug
 *   - Merge subKind/series/seriesNo/palette from realEntry → hashEntry
 *   - Delete realEntry (placeholder)
 *   - Repeat for each title in realSlugs map
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync, rmdirSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards.json");

const cards = JSON.parse(readFileSync(CARDS, "utf8"));

const realSlugs = new Map([
  ["倭黑猩猩", "bonobo"],
  ["亚洲鲤鱼入侵", "introduced-species"],
  ["零号病人", "zero-cnt"],
  ["阅读障碍症", "dyslexia"],
  ["激光干涉引力波天文台", "laser-interferometer"],
  ["侏罗纪公园", "jurassic-park-cnt"],
]);

let moved = 0;
let skipped = 0;
for (const [title, realSlug] of realSlugs) {
  const realEntry = cards.find((c) => c.slug === realSlug);
  const hashEntry = cards.find((c) => c.title === title && c.slug.startsWith("card-"));
  if (!hashEntry) { skipped++; continue; }
  const hashSlug = hashEntry.slug;
  const kind = hashEntry.kind;

  // 1. Move 3 files from public/cards/<kind>/<hashSlug>/ → public/cards/<kind>/<realSlug>/
  const srcDir = path.join(ROOT, "public", "cards", kind, hashSlug);
  const dstDir = path.join(ROOT, "public", "cards", kind, realSlug);
  if (existsSync(srcDir)) {
    mkdirSync(dstDir, { recursive: true });
    for (const f of readdirSync(srcDir)) {
      const from = path.join(srcDir, f);
      const to = path.join(dstDir, f.replace(new RegExp(`^${hashSlug}`), realSlug));
      renameSync(from, to);
    }
    rmdirSync(srcDir);
  }

  // 2. Rewrite hashEntry slug + image paths
  hashEntry.slug = realSlug;
  hashEntry.image = `/cards/${kind}/${realSlug}/${realSlug}-card.png`;
  if (hashEntry.image_thumb) hashEntry.image_thumb = `/cards/${kind}/${realSlug}/${realSlug}-thumb.webp`;
  if (hashEntry.image_full) hashEntry.image_full = `/cards/${kind}/${realSlug}/${realSlug}-full.webp`;

  // 3. Merge placeholder fields (subKind/series/seriesNo/palette) into hashEntry
  if (realEntry && realEntry !== hashEntry) {
    for (const k of ["subKind", "series", "seriesNo", "palette"]) {
      if (realEntry[k] !== undefined && realEntry[k] !== null) hashEntry[k] = realEntry[k];
    }
    const idx = cards.indexOf(realEntry);
    if (idx >= 0) cards.splice(idx, 1);
  }
  moved++;
}

writeFileSync(CARDS, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`r67-rename: moved ${moved} cards; skipped ${skipped}.`);
