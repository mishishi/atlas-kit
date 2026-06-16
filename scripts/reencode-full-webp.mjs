#!/usr/bin/env node
// Re-encode the 60 -full.png files (currently 1536w × 2752 PNG, ~5.5
// MB each = 334 MB total — over Vercel Hobby's 100 MB static upload
// cap) to 1024w WebP q90. Expected output: 200-800 KB each, ~30-50
// MB total — fits Hobby with room to spare; if on Pro (1 GB cap)
// there's no downside either.
//
// Why WebP: same perceptual quality as PNG at 30-50% the file size
// for AI-generated photorealistic content. The lightbox is the only
// consumer (it uses next/image which auto-serves WebP via Vercel's
// image optimizer when the source is supported) so no compat concern.
//
// Why 1024w: matches the original tier intent (the resize script
// intended 1024w but `withoutEnlargement: true` was wrong — should
// have been `fit: 'inside'` with a 1024 cap). 1024w at the device
// pixel ratio of typical 2x retina phones is 512 CSS pixels — more
// than enough for the modal's natural 100% zoom view.
//
// Updates data/cards.json image_full from *.png → *.webp so the
// lightbox pulls the new path. PNGs are deleted to keep the bundle
// under cap.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CARDS_DIR = path.resolve("public/cards");
const CARDS_JSON = path.resolve("data/cards.json");

const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

// Idempotency check (Round 23): if any card already points to a
// .webp file, the script has been run before. Bail out instead of
// silently no-op'ing (or worse, re-encoding and unlinking the
// already-encoded files).
const alreadyWebp = cards.some(
  (c) => c.image_full?.endsWith("-full.webp"),
);
if (alreadyWebp) {
  console.error(
    "⚠️  image_full already points to .webp — this script has already been run.\n" +
      "    Re-running it is a no-op (the .png source files have been deleted).\n" +
      "    If you need to re-encode (e.g. quality change), restore the .png files first.",
  );
  process.exit(1);
}

let resized = 0, failed = 0;
let totalIn = 0, totalOut = 0;

for (const c of cards) {
  const fullPng = c.image_full?.replace(/^\/cards\//, "");
  if (!fullPng || !fullPng.endsWith("-full.png")) continue;
  const src = path.join(CARDS_DIR, fullPng);
  if (!fs.existsSync(src)) continue;
  const base = fullPng.replace(/-full\.png$/, "");
  const dst = path.join(CARDS_DIR, `${base}-full.webp`);
  try {
    const srcSize = fs.statSync(src).size;
    totalIn += srcSize;
    await sharp(src)
      .resize(1024, null, { withoutEnlargement: true })
      .webp({ quality: 90, effort: 4 })
      .toFile(dst);
    const dstSize = fs.statSync(dst).size;
    totalOut += dstSize;
    // Update cards.json to point to the new webp
    c.image_full = `/cards/${base}-full.webp`;
    // Remove the old png
    fs.unlinkSync(src);
    const ratio = ((1 - dstSize / srcSize) * 100).toFixed(0);
    console.log(
      `  ${base.padEnd(28)} ${(srcSize / 1024).toFixed(0)}kB -> ${(dstSize / 1024).toFixed(0)}kB (-${ratio}%)`,
    );
    resized++;
  } catch (e) {
    console.log(`  ERR ${base}: ${e.message}`);
    failed++;
  }
}

fs.writeFileSync(CARDS_JSON, JSON.stringify(cards, null, 2) + "\n", "utf8");

console.log(`\nDone. resized=${resized} failed=${failed}`);
console.log(`Total: ${(totalIn / 1024 / 1024).toFixed(0)} MB -> ${(totalOut / 1024 / 1024).toFixed(0)} MB`);
console.log(`Bundle: ${(totalOut / 1024 / 1024).toFixed(0)} MB of static assets, well under Hobby 100 MB cap.`);
