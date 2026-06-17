#!/usr/bin/env node
/**
 * R37 (2026-06-17): score-all-cards.mjs
 *
 * Run check-image 8-rule quality check on all 61 cards. Output a report
 * (default) or write visualScore to cards.json (--write).
 *
 * Usage:
 *   node scripts/score-all-cards.mjs            # dry-run, print report
 *   node scripts/score-all-cards.mjs --write    # also update cards.json
 *   node scripts/score-all-cards.mjs --only=fail  # only show failed cards
 *   node scripts/score-all-cards.mjs --json     # machine-readable
 *
 * Per-card timing: ~3-5s (OCR is the bottleneck). 61 cards = 3-5 min
 * total. CI can parallelize (share tesseract worker) but for one-off
 * runs sequential is fine.
 *
 * 长城 placeholder: 0/8 expected (it's a sharp-generated SVG, not a
 * real image). Don't be alarmed by the failure — that's the data
 * telling you the regen priority.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { checkImage } from "./check-image.mjs";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\//, ""));
const CARDS_PATH = path.join(ROOT, "data", "cards.json");

const args = process.argv.slice(2);
const write = args.includes("--write");
const onlyFail = args.includes("--only-fail");
const asJson = args.includes("--json");

const cards = JSON.parse(await fs.readFile(CARDS_PATH, "utf8"));

console.log(`Scoring ${cards.length} cards...`);
console.log("");

const report = [];
let totalRuntime = 0;

for (let i = 0; i < cards.length; i++) {
  const card = cards[i];
  const imageRel = `public/cards/${card.kind}/${card.slug}/${card.slug}-card.png`;
  const imageAbs = path.join(ROOT, imageRel);

  // Check file exists
  try {
    await fs.access(imageAbs);
  } catch {
    report.push({
      slug: card.slug,
      title: card.title,
      kind: card.kind,
      image: imageRel,
      score: null,
      total: 8,
      error: "image file not found",
    });
    continue;
  }

  const t0 = Date.now();
  let result;
  try {
    result = await checkImage(imageAbs);
  } catch (e) {
    report.push({
      slug: card.slug,
      title: card.title,
      kind: card.kind,
      image: imageRel,
      score: null,
      total: 8,
      error: e.message,
    });
    continue;
  }
  const dt = Date.now() - t0;
  totalRuntime += dt;

  report.push({
    slug: card.slug,
    title: card.title,
    kind: card.kind,
    image: imageRel,
    score: result.score,
    total: result.total,
    passed: result.passed,
    failed: result.results.filter((r) => !r.pass).map((r) => ({
      ruleId: r.ruleId,
      rule: r.rule,
      detail: r.detail,
    })),
    meta: result.meta,
    durationMs: dt,
  });

  // Progress to stderr (so --json output stays clean)
  if (!asJson) {
    const mark = result.passed ? "✓" : result.score >= 6 ? "·" : "✗";
    process.stderr.write(
      `  [${mark}] ${String(i + 1).padStart(2)}/${cards.length} ${card.title} ${result.score}/8 (${dt}ms)\n`,
    );
  }
}

// ─── Output ─────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({ totalRuntime, report }, null, 2));
} else {
  console.log("");
  console.log("─".repeat(60));
  console.log("");

  // Distribution
  const buckets = { 8: 0, 7: 0, 6: 0, "0-5": 0, error: 0 };
  for (const r of report) {
    if (r.error) buckets.error++;
    else if (r.score === 8) buckets[8]++;
    else if (r.score === 7) buckets[7]++;
    else if (r.score === 6) buckets[6]++;
    else buckets["0-5"]++;
  }
  console.log("Score distribution:");
  console.log(`  8/8 (perfect):   ${buckets[8]}`);
  console.log(`  7/8:             ${buckets[7]}`);
  console.log(`  6/8:             ${buckets[6]}`);
  console.log(`  0-5/8 (regen):   ${buckets["0-5"]}`);
  console.log(`  errors:          ${buckets.error}`);
  console.log(`  total:           ${report.length}`);
  console.log("");
  console.log(`Total runtime: ${(totalRuntime / 1000).toFixed(1)}s`);
  console.log("");

  // Show failed cards (most useful signal)
  const failed = report
    .filter((r) => !r.passed && !r.error)
    .sort((a, b) => a.score - b.score);

  if (failed.length > 0 && !onlyFail) {
    console.log("Failed cards (sorted by score, lowest first):");
    console.log("");
    for (const r of failed) {
      console.log(`  ✗ ${r.title} (${r.score}/8)`);
      for (const f of r.failed) {
        console.log(`     ${f.ruleId}. ${f.rule}`);
        console.log(`        ${f.detail}`);
      }
    }
    console.log("");
  }

  if (onlyFail) {
    // Just dump failed cards in compact form
    for (const r of failed) {
      const ruleIds = r.failed.map((f) => f.ruleId).join(",");
      console.log(`${r.title} | ${r.score}/8 | failed: ${ruleIds}`);
    }
  }

  // Placeholder note
  const placeholder = report.find(
    (r) => r.error && r.error.includes("not found"),
  );
  if (placeholder) {
    console.log(
      "Note: cards with 'image not found' are placeholders (e.g. 长城) — expected 0/8.",
    );
    console.log("");
  }
}

// ─── Write ──────────────────────────────────────────────────────────
if (write) {
  // Build a slug → score map
  const scoreBySlug = new Map();
  for (const r of report) {
    if (r.score != null) {
      scoreBySlug.set(r.slug, r.score);
    }
  }

  // Update cards.json in place
  let written = 0;
  for (const card of cards) {
    if (scoreBySlug.has(card.slug)) {
      card.visualScore = scoreBySlug.get(card.slug);
      written++;
    }
  }

  await fs.writeFile(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n");
  console.log("");
  console.log(`Wrote visualScore to ${written} cards in ${CARDS_PATH}`);
}
