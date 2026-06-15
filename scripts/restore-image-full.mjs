#!/usr/bin/env node
// One-off: rewrite cards.json so image_full points to the real
// 1024w -full.png. The inverse of rewrite-image-full.mjs.
// Used to bring back the high-res original after the previous
// -full.png delete (commit 22940ba) made image_full == image.
// The 60 -full.png files are restored from git history (24287a1~1).
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

let updated = 0;
for (const c of cards) {
  if (!c.image) continue;
  // c.image is /cards/<slug>-card.png — turn into /cards/<slug>-full.png
  const full = c.image.replace(/-card\.png$/, "-full.png");
  if (full === c.image) continue;
  c.image_full = full;
  updated++;
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Updated ${updated} cards. image_full now points to -full.png (1024w original).`);
