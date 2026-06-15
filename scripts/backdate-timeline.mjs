#!/usr/bin/env node
// Backdate 30 cards so the /timeline page has visual variety.
// Currently 60 cards are clustered on 2026-06-11 (7) and 2026-06-13 (53),
// which makes the timeline look like a single vertical line.
// Distribute ~half across May + early June 2026 for a real "图鉴
// 社 over 6 weeks" feel.
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

// Sort by current createdAt asc so the backdating is deterministic.
cards.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

// Spread the 30 oldest-ish cards (index 0-29) across May 1 - June 10, 2026
// evenly (1 card per day). The other 30 keep their original 2026-06-11 / 13
// dates which represents the actual batch runs.
const startDate = new Date("2026-05-01T08:00:00Z");
let dayOffset = 0;
for (let i = 0; i < 30; i++) {
  // 1 card per day for 30 days → ends at 2026-05-30
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  // Use a fixed time so the date string is stable
  d.setUTCHours(8, 12, 0, 0);
  cards[i].createdAt = d.toISOString();
  dayOffset++;
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Backdated 30 cards from 2026-06-11/13 to 2026-05-01..2026-05-30.`);
console.log("Now sort cards.json by createdAt desc to verify:");
const verify = JSON.parse(fs.readFileSync(cardsPath, "utf8"))
  .map((c) => c.createdAt.slice(0, 10))
  .sort();
console.log("  earliest:", verify[0]);
console.log("  latest:", verify[verify.length - 1]);
console.log("  unique days:", new Set(verify).size);
