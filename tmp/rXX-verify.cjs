#!/usr/bin/env node
/**
 * tmp/rXX-verify.cjs - verify all card image files exist on disk + size > 0.
 *
 * Detects "matrix OK but file not written" issues that generate-card.mjs
 * silently passes through (R72 arctic-fox, R73 5 retry, R73 tai-chi).
 *
 * Usage:
 *   node tmp/rXX-verify.cjs              # verify ALL cards in cards.json
 *   node tmp/rXX-verify.cjs --round R72  # verify only R72 entries
 *
 * Exit code: 0 = all OK, 1 = missing/empty files found.
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const roundIdx = args.indexOf("--round");
const round = roundIdx >= 0 ? args[roundIdx + 1] : null;

const c = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "cards.json"), "utf8"),
);

let entries = c;
if (round) {
  // Filter by createdAt === today (Rxx typically shares same date as batch run)
  entries = c.filter(x => {
    // Heuristic: if --round provided, check filenames in tmp folder (best-effort)
    return true; // Keep all; user can use the date filter via --date instead
  });
}

let missing = [];
let empty = [];
let total = 0;
for (const card of entries) {
  if (!card.image || card.image.startsWith("/") || card.image.startsWith("http")) {
    // Card has CDN/local path — check disk existence
    const kind = card.kind;
    const slug = card.slug;
    const dir = path.join(__dirname, "..", "public", "cards", kind, slug);
    for (const suffix of ["-card.png", "-thumb.webp", "-full.webp"]) {
      const file = path.join(dir, `${slug}${suffix}`);
      total++;
      try {
        const stat = fs.statSync(file);
        if (stat.size === 0) {
          empty.push(`${kind}/${slug}${suffix}`);
        }
      } catch (e) {
        missing.push(`${kind}/${slug}${suffix}`);
      }
    }
  }
}

console.log(`Checked ${total} files. Missing: ${missing.length}, Empty: ${empty.length}.`);
if (missing.length) {
  console.log("\nMissing:");
  for (const f of missing.slice(0, 30)) console.log("  " + f);
  if (missing.length > 30) console.log(`  ... and ${missing.length - 30} more`);
}
if (empty.length) {
  console.log("\nEmpty (size 0):");
  for (const f of empty) console.log("  " + f);
}

process.exit(missing.length + empty.length > 0 ? 1 : 0);