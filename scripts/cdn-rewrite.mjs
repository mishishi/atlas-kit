#!/usr/bin/env node
// scripts/cdn-rewrite.mjs
//
// Rewrite cards.json image paths from local /cards/... to a CDN prefix.
// Default mapping:
//   /cards/<kind>/<slug>/<slug>-card.png  →  <prefix>/cards/<kind>/<slug>/<slug>-card.png
//   /cards/<kind>/<slug>/<slug>-thumb.webp → <prefix>/cards/<kind>/<slug>/<slug>-thumb.webp
//   /cards/<kind>/<slug>/<slug>-full.webp  → <prefix>/cards/<kind>/<slug>/<slug>-full.webp
//
// (The path mirror is identical to the local layout — the CloudBase
// bucket just got the public/<kind>/<slug>/ tree uploaded 1:1 under /cards/.
//
// Usage:
//   node scripts/cdn-rewrite.mjs --prefix https://636c-cloud1-...tcb.qcloud.la --dry-run
//   node scripts/cdn-rewrite.mjs --prefix https://636c-cloud1-...tcb.qcloud.la --apply
//   node scripts/cdn-rewrite.mjs --rollback
//
// Dry-run prints the first 5 changes + stats, doesn't write.
// Apply rewrites cards.json in-place (atomic via temp file + rename).
// Rollback restores the .bak created by the last --apply.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const prefix = getArg("--prefix");
const dryRun = args.includes("--dry-run");
const apply = args.includes("--apply");
const rollback = args.includes("--rollback");

if (!prefix && !rollback) {
  console.error("Missing --prefix <url>");
  console.error("Usage: node scripts/cdn-rewrite.mjs --prefix https://pub-xxx.r2.dev [--dry-run|--apply|--rollback]");
  process.exit(1);
}

const ROOT = process.cwd();
const CARDS_JSON = path.join(ROOT, "data", "cards.json");
const BAK_JSON = path.join(ROOT, "data", "cards.cdn-bak.json");

if (rollback) {
  if (!fs.existsSync(BAK_JSON)) {
    console.error(`No backup at ${BAK_JSON}. Run --apply first.`);
    process.exit(1);
  }
  fs.copyFileSync(BAK_JSON, CARDS_JSON);
  console.log(`Restored ${CARDS_JSON} from ${BAK_JSON}`);
  process.exit(0);
}

const normalizePrefix = (p) => p.replace(/\/+$/, "") + "/";

function rewritePath(localPath, prefix) {
  // /cards/<kind>/<slug>/<filename> → <prefix>/cards/<kind>/<slug>/<filename>
  // (Local and CDN paths share the same /cards/ root; only the prefix
  // changes. The CloudBase bucket was uploaded with this 1:1 mirror.)
  if (!localPath || !localPath.startsWith("/cards/")) return localPath;
  return normalizePrefix(prefix) + localPath.slice(1); // strip leading "/"
}

const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

const fields = ["image", "image_thumb", "image_full"];
let totalChanged = 0;
let totalUnchanged = 0;
const samples = [];

for (const c of cards) {
  for (const f of fields) {
    if (!c[f]) continue;
    const oldVal = c[f];
    const newVal = rewritePath(oldVal, prefix);
    if (oldVal !== newVal) {
      c[f] = newVal;
      totalChanged++;
      if (samples.length < 5) samples.push({ slug: c.slug, field: f, oldVal, newVal });
    } else {
      totalUnchanged++;
    }
  }
}

console.log(`Cards: ${cards.length}`);
console.log(`Fields rewritten: ${totalChanged}`);
console.log(`Already-CDN or null: ${totalUnchanged}`);
console.log();
console.log("Sample (first 5):");
for (const s of samples) {
  console.log(`  ${s.slug}.${s.field}`);
  console.log(`    - ${s.oldVal}`);
  console.log(`    + ${s.newVal}`);
}

if (dryRun) {
  console.log("\n[DRY-RUN] No files written. Use --apply to commit.");
  process.exit(0);
}

if (apply) {
  // Backup current cards.json first (idempotent: skip if .bak already exists from earlier apply)
  if (!fs.existsSync(BAK_JSON)) {
    fs.copyFileSync(CARDS_JSON, BAK_JSON);
    console.log(`\nBackup: ${BAK_JSON}`);
  } else {
    console.log(`\nBackup already exists at ${BAK_JSON}, skipping (use --rollback to restore)`);
  }
  // Atomic write
  const tmp = CARDS_JSON + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(cards, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, CARDS_JSON);
  console.log(`Wrote ${CARDS_JSON}`);
  console.log(`Rollback: node scripts/cdn-rewrite.mjs --rollback`);
  process.exit(0);
}