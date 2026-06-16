#!/usr/bin/env node
// One-time migration: move all 60 cards from the flat
// `public/cards/<slug>-{card,thumb,full}.{png,webp}` layout to a
// per-card directory layout
// `public/cards/<kind>/<slug>/<slug>-{card,thumb,full}.{png,webp}`
// and update data/cards.json's `image` / `image_thumb` / `image_full`
// fields to match.
//
// Why this layout: one folder per card → delete a card = delete one
// folder, no orphan -thumb.webp left behind. New artifacts
// (e.g. `{slug}-prompt.md`, `{slug}-source.png`) naturally live
// next to the generated image.
//
// Idempotent: if a card is already in the new layout (i.e.
// `image` starts with `/cards/<kind>/<slug>/`), the script skips
// it. Run again any time to verify nothing changed.
//
// Round 26, 2026-06-17.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const CARDS_JSON = path.join(ROOT, "data", "cards.json");
const PUBLIC_DIR = path.join(ROOT, "public", "cards");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");

// Build the new path given an old flat filename and the card's kind.
//   old: "belgian-malinois-card.png"
//   kind: "pet"
//   →    "/cards/pet/belgian-malinois/belgian-malinois-card.png"
//
// The slug is the filename WITHOUT the suffix (-card / -thumb / -full)
// and WITHOUT the extension. The slug-equality to cards.json slug is
// NOT enforced here — we trust the file naming convention. If a file
// name doesn't match this pattern, the script bails out (see validator).
function newPublicPath(oldRel, kind) {
  // oldRel starts with "/cards/"
  const filename = oldRel.replace(/^\/cards\//, "");
  // filename like "belgian-malinois-card.png" → slug "belgian-malinois"
  const m = filename.match(/^(.+)-(card|thumb|full)\.(png|webp)$/);
  if (!m) {
    throw new Error(`unexpected filename shape: ${filename} (expected <slug>-{card,thumb,full}.{png,webp})`);
  }
  const slug = m[1];
  return `/cards/${kind}/${slug}/${filename}`;
}

function fileExistsFor(oldRel) {
  const filename = oldRel.replace(/^\/cards\//, "");
  return fs.existsSync(path.join(PUBLIC_DIR, filename));
}

function main() {
  if (!fs.existsSync(CARDS_JSON)) {
    console.error(`cards.json not found at ${CARDS_JSON}`);
    process.exit(1);
  }
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`public/cards not found at ${PUBLIC_DIR}`);
    process.exit(1);
  }

  const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

  const ops = []; // { card, field, oldRel, newRel, action: 'mv'|'mkdir'|'skip' }
  let alreadyMigrated = 0;
  let willUpdateFields = 0;

  for (const c of cards) {
    for (const field of ["image", "image_thumb", "image_full"]) {
      const oldRel = c[field];
      if (!oldRel) continue;

      // Skip if already in new layout
      const newRel = newPublicPath(oldRel, c.kind);
      const newFilename = newRel.replace(/^\/cards\//, "");
      const oldFilename = oldRel.replace(/^\/cards\//, "");

      if (oldRel === newRel) {
        alreadyMigrated++;
        ops.push({
          slug: c.slug,
          kind: c.kind,
          field,
          oldRel,
          newRel,
          action: "skip-already-migrated",
        });
        continue;
      }

      // Will move file + update field
      willUpdateFields++;
      ops.push({
        slug: c.slug,
        kind: c.kind,
        field,
        oldRel,
        newRel,
        oldFilename,
        newFilename,
        action: "mv",
      });
    }
  }

  // Group by destination directory to batch mkdirs
  const destDirs = new Set();
  for (const op of ops) {
    if (op.action === "mv") {
      destDirs.add(path.dirname(path.join(PUBLIC_DIR, op.newFilename)));
    }
  }

  console.log(`[migrate-card-paths] mode = ${APPLY ? "APPLY (will write)" : "DRY-RUN (no writes)"}`);
  console.log(`  cards.json: ${cards.length} cards`);
  console.log(`  already-migrated: ${alreadyMigrated} fields`);
  console.log(`  to update:       ${willUpdateFields} fields`);
  console.log(`  files to move:   ${ops.filter((o) => o.action === "mv").length}`);
  console.log(`  dirs to create:  ${destDirs.size} (one per card)`);

  // Validate: every old file must actually exist on disk
  let missingFiles = 0;
  for (const op of ops) {
    if (op.action === "mv" && !fileExistsFor(op.oldRel)) {
      console.warn(
        `  ⚠️  ${op.slug} (${op.kind}) field=${op.field}: source file missing on disk: ${op.oldRel}`,
      );
      missingFiles++;
    }
  }
  if (missingFiles > 0) {
    console.error(`\n  ${missingFiles} source file(s) missing on disk. Aborting.`);
    console.error(`  Fix the missing files (or restore from git) before re-running.`);
    process.exit(1);
  }

  // Validate: kind distribution
  const kindCounts = {};
  for (const c of cards) kindCounts[c.kind] = (kindCounts[c.kind] ?? 0) + 1;
  console.log(`\n  kind distribution:`);
  for (const [k, n] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(10)} ${n}`);
  }

  // Sample 5 cards to show what the new path looks like
  console.log(`\n  sample new paths (first 5 cards):`);
  for (const c of cards.slice(0, 5)) {
    console.log(`    ${c.slug} (${c.kind})`);
    for (const field of ["image", "image_thumb", "image_full"]) {
      if (c[field]) {
        console.log(`      ${field.padEnd(13)} ${c[field]}  →  ${newPublicPath(c[field], c.kind)}`);
      }
    }
  }

  if (!APPLY) {
    console.log(`\n[DRY-RUN] No files written. Re-run with --apply to execute.`);
    return;
  }

  // APPLY mode — actually do it
  console.log(`\n[APPLY] Writing changes...`);

  // 1. Create destination directories
  let dirsMade = 0;
  for (const dir of destDirs) {
    fs.mkdirSync(dir, { recursive: true });
    dirsMade++;
  }
  console.log(`  created ${dirsMade} directories`);

  // 2. Move files
  let filesMoved = 0;
  for (const op of ops) {
    if (op.action !== "mv") continue;
    const src = path.join(PUBLIC_DIR, op.oldFilename);
    const dst = path.join(PUBLIC_DIR, op.newFilename);
    fs.renameSync(src, dst);
    filesMoved++;
  }
  console.log(`  moved ${filesMoved} files`);

  // 3. Update cards.json
  for (const c of cards) {
    for (const field of ["image", "image_thumb", "image_full"]) {
      if (!c[field]) continue;
      const newRel = newPublicPath(c[field], c.kind);
      if (c[field] !== newRel) {
        c[field] = newRel;
      }
    }
  }
  fs.writeFileSync(CARDS_JSON, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`  updated ${CARDS_JSON}`);

  // 4. Summary
  const remaining = fs.readdirSync(PUBLIC_DIR);
  const orphans = remaining.filter((f) => f.match(/^[a-z0-9-]+-(card|thumb|full)\.(png|webp)$/));
  console.log(`\n  files still at top level: ${orphans.length} (should be 0)`);
  if (orphans.length > 0) {
    console.warn(`  ⚠️  orphans:`, orphans);
  }
  console.log(`\n[APPLY] Done. Next: review git diff, then add redirects in next.config.mjs, then commit.`);
}

main();