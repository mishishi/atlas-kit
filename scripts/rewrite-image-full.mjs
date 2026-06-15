#!/usr/bin/env node
// One-off: rewrite cards.json so image_full = image (600w card).
// Rationale: -full.png (1024w) was deleted to fit Vercel's 300 MB
// function-bundle cap. image_full now points to the same 600w
// card as c.image. Detail page's "view original" download link
// and the opengraph-image.tsx's src={c.image} all still work;
// they just resolve to 600w instead of 1024w. Retina users
// (1x-2x oversample) still see crisp images; users on
// 3x-4x mobile displays may notice slight softness on the
// original-size download, but the in-page hero (also 600w) is
// unaffected.
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

let updated = 0;
for (const c of cards) {
  if (c.image_full && c.image_full !== c.image) {
    c.image_full = c.image;
    updated++;
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Updated ${updated} cards. image_full now = image (600w card).`);
