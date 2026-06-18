#!/usr/bin/env node
// Enrich card descriptions with cross-references to other cards so
// the knowledge graph has actual edges (was 11/60 cards with
// mentions → 50/60 with 0). Strategy:
//   1. For each card, find the 1-2 other cards with the highest
//      shared cross-tag count (kind/series excluded — those are
//      handled by separate "同系列" and "同类推荐" sections).
//   2. Append a natural editorial sentence at the end of the
//      description: "（参见 X, Y）" — short, visual, doesn't break
//      the editorial tone.
//   3. Only add the cross-ref if it's not already mentioned in
//      the description (dedup).
//   4. Only add if shared-tag score is meaningful (>= 2 cross-tags).
//      Random weak cross-refs make the site feel spammy.
//
// The cross-tag overlap is computed from the same cross-cutting
// tags the recommendation engine uses (中国 / 古代 / 江南 / ...).
// We reuse the same data path so the knowledge graph and the rec
// engine stay consistent.
//
// To skip a card: add its slug to SKIP_SLUGS below.
import fs from "node:fs";
import path from "node:path";

const SKIP_SLUGS = new Set(); // editorial: cards you don't want cross-refs on

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

// R33: --only-kind / --only-slug flags — restrict the outer loop to a
// subset so batch-generate.mjs can run enrich for just the new cards
// without sweeping all 70+ cards every time (N^2/2 cross-tag scoring
// gets slow at 60+ cards × 60+ cards).
//
// Note: candidates are STILL drawn from the full cards set — only the
// targets (cards that get a "（参见：X, Y）" appended to description)
// are restricted.
const args = process.argv.slice(2);
const onlyKind = (args.includes("--only-kind") ? args[args.indexOf("--only-kind") + 1] : null);
const onlySlug = (args.includes("--only-slug") ? args[args.indexOf("--only-slug") + 1] : null);

const targets = onlySlug
  ? cards.filter((c) => c.slug === onlySlug)
  : onlyKind
    ? cards.filter((c) => c.kind === onlyKind)
    : cards;

function sharedCrossTagCount(a, b) {
  // Only count "cross-cutting" tags — these are 2-char concepts
  // (中国 / 古代 / 现代 / 江南 / etc) not the per-card descriptive
  // tags. We use a length-based heuristic + a blocklist of
  // known short tags that ARE descriptive.
  const CROSS_TAG_MIN_LEN = 2;
  const DESCRIPTIVE_SHORT = new Set([
    "温顺", "蓝眼", "凤头", "古蜀", "礼器", "海派", "强健", "机警", "黏人",
    "玉髓", "花纹", "蓝白", "白绿", "黄绿", "花中", "岁寒", "花中君子",
  ]);
  const isCross = (t) =>
    t.length >= CROSS_TAG_MIN_LEN && !DESCRIPTIVE_SHORT.has(t);
  let n = 0;
  for (const t of a.tags) {
    if (!isCross(t)) continue;
    if (b.tags.includes(t)) n++;
  }
  return n;
}

let updated = 0;
for (const target of targets) {
  if (SKIP_SLUGS.has(target.slug)) continue;
  const text = (target.description || "") + " " + (target.tagline || "") + " " + (target.subtitle || "");
  // Find candidates not already mentioned and not in the same
  // series (those are in their own section)
  const candidates = cards
    .filter((c) => c.slug !== target.slug && c.series !== target.series)
    .map((c) => ({ c, score: sharedCrossTagCount(target, c) }))
    .filter((x) => x.score >= 2 && !text.includes(x.c.title))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (candidates.length === 0) continue;
  // Append a parenthetical cross-ref. Use the editorial format
  // "（参见 X, Y）" — matches the existing parenthetical tone in
  // many descriptions (e.g. "（公元前 138 年）" style).
  const names = candidates.map((x) => x.c.title).join("、");
  target.description = (target.description || "").trimEnd() + `（参见：${names}）`;
  updated++;
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");

const scopeLabel = onlySlug
  ? `slug=${onlySlug}`
  : onlyKind
    ? `kind=${onlyKind} (${targets.length} cards)`
    : `all (${targets.length} cards)`;
console.log(`Enriched ${updated}/${targets.length} target(s) [${scopeLabel}] with cross-references.`);
const newCounts = new Map();
for (const c of cards) {
  const text = (c.description || "") + " " + (c.tagline || "") + " " + (c.subtitle || "");
  let n = 0;
  for (const other of cards) {
    if (other.slug === c.slug) continue;
    if (text.includes(other.title)) n++;
  }
  if (n > 0) newCounts.set(c.title, n);
}
console.log(`\nNow ${newCounts.size}/${cards.length} cards have at least 1 cross-mention.`);
console.log("Top forward-mentioners (who mention the most others):");
[...newCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([t, n]) => console.log("  " + n + " " + t));
