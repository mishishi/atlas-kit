#!/usr/bin/env node
/**
 * audit-images.mjs — HEAD-probe every image URL in cards.json.
 * Outputs: failed URLs + breakdown of the 3 tiers (image / thumb / full).
 *
 * Why:
 *   - 600 images on CloudBase CDN, 0% verified since R36 migration.
 *   - If even 0.5% are broken, that's 30 cards rendering alt text only.
 *   - Run this BEFORE a deploy / before marketing pushes — broken
 *     images are the #1 user-facing "this site is dead" signal.
 *
 * How:
 *   - 1 HTTP HEAD request per unique URL (image / thumb / full)
 *   - 5 concurrent via Promise.allSettled (don't hammer the CDN)
 *   - Per-card audit outputs 4 statuses:
 *     OK: 3/3 tiers pass
 *     PARTIAL: some pass, some fail
 *     BROKEN: 3/3 fail
 *     LOCAL: image path starts with / (not yet migrated to CDN)
 *   - Exit code: 0 if no BROKEN, 1 if any BROKEN.
 *
 * Run: node scripts/audit-images.mjs
 *      node scripts/audit-images.mjs --concurrency 10  (tune for your network)
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const concurrency = parseInt(
  args.includes("--concurrency") ? args[args.indexOf("--concurrency") + 1] : "5",
  10,
);

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data", "cards.json");

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));

// 1. Collect unique URLs across 3 tiers.
const allUrls = new Set();
for (const c of cards) {
  if (c.image) allUrls.add(c.image);
  if (c.image_thumb) allUrls.add(c.image_thumb);
  if (c.image_full) allUrls.add(c.image_full);
}
console.log(`Probing ${allUrls.size} unique URLs (${cards.length} cards, 3 tiers) with concurrency=${concurrency}...\n`);

// 2. HEAD probe with bounded concurrency.
const urlArr = [...allUrls];
const results = new Map(); // url → { status, ms }

async function probeOne(url) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    results.set(url, { status: res.status, ms: Date.now() - start, ok: res.ok });
  } catch (e) {
    results.set(url, { status: e.name === "AbortError" ? "TIMEOUT" : `ERR: ${e.message?.slice(0, 40)}`, ms: Date.now() - start, ok: false });
  }
}

async function probeAll() {
  let i = 0;
  async function worker() {
    while (i < urlArr.length) {
      const idx = i++;
      await probeOne(urlArr[idx]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

await probeAll();

// 3. Bucket per-card by tier status.
const cardStatus = {
  OK: [],           // all 3 tiers pass
  PARTIAL: [],      // some fail
  BROKEN: [],       // all 3 fail
  LOCAL: [],        // image path starts with /cards/ (not migrated to CDN)
};

for (const c of cards) {
  const i = results.get(c.image);
  if (!i) continue;
  if (c.image.startsWith("/")) {
    cardStatus.LOCAL.push({ slug: c.slug, title: c.title });
    continue;
  }
  const t = c.image_thumb ? results.get(c.image_thumb) : null;
  const f = c.image_full ? results.get(c.image_full) : null;
  const oks = [i, t, f].filter(Boolean).filter((r) => r.ok).length;
  if (oks === 3) cardStatus.OK.push({ slug: c.slug });
  else if (oks === 0) cardStatus.BROKEN.push({ slug: c.slug, title: c.title });
  else cardStatus.PARTIAL.push({ slug: c.slug, title: c.title, oks });
}

// 4. Print summary.
console.log(`\n${"=".repeat(60)}`);
console.log(`Summary:`);
console.log(`  OK      : ${cardStatus.OK.length}`);
console.log(`  PARTIAL : ${cardStatus.PARTIAL.length}`);
console.log(`  BROKEN  : ${cardStatus.BROKEN.length}`);
console.log(`  LOCAL   : ${cardStatus.LOCAL.length} (not yet migrated to CDN)`);

if (cardStatus.PARTIAL.length > 0) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`PARTIAL (some tiers fail):`);
  for (const { slug, title, oks } of cardStatus.PARTIAL) {
    console.log(`  ${slug} (${title}): ${oks}/3 tiers OK`);
    // Per-tier diagnostic
    for (const tier of ["image", "image_thumb", "image_full"]) {
      const url = cards.find(c => c.slug === slug)[tier];
      if (!url) continue;
      const r = results.get(url);
      if (r && !r.ok) console.log(`    [FAIL] ${tier}: ${r.status} (${url.slice(0, 80)}...)`);
    }
  }
}

if (cardStatus.BROKEN.length > 0) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`BROKEN (all tiers fail — URGENT):`);
  for (const { slug, title } of cardStatus.BROKEN) {
    console.log(`  ${slug} | ${title}`);
  }
}

if (cardStatus.LOCAL.length > 0) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`LOCAL (image starts with /, not on CDN):`);
  for (const { slug, title } of cardStatus.LOCAL.slice(0, 10)) {
    console.log(`  ${slug} | ${title}`);
  }
  if (cardStatus.LOCAL.length > 10) {
    console.log(`  ... +${cardStatus.LOCAL.length - 10} more`);
  }
}

// 5. Per-URL failure detail (for debugging).
const failedUrls = [...results.entries()].filter(([_, r]) => !r.ok);
if (failedUrls.length > 0) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Failed URLs (${failedUrls.length}):`);
  for (const [url, r] of failedUrls.slice(0, 20)) {
    console.log(`  [${r.status}] ${url.slice(0, 100)}`);
  }
  if (failedUrls.length > 20) {
    console.log(`  ... +${failedUrls.length - 20} more`);
  }
}

console.log(`\nTotal probed: ${urlArr.length} in ${results.size > 0 ? (Array.from(results.values()).reduce((a, r) => a + r.ms, 0) / 1000).toFixed(1) : 0}s`);

if (cardStatus.BROKEN.length > 0) process.exit(1);