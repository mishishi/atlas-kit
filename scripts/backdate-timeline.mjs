#!/usr/bin/env node
// Backdate 30 cards so the /timeline page has visual variety.
// Currently 60 cards are clustered on 2026-06-11 (7) and 2026-06-13 (53),
// which makes the timeline look like a single vertical line.
// Distribute ~half across May + early June 2026 for a real "图鉴
// 社 over 6 weeks" feel.
//
// IMPORTANT: this script is ONE-SHOT. Running it a second time will
// re-distribute the now-oldest 30 cards (which include some already-
// backdated cards) and shift them to new dates. The output is
// deterministic by content, but the backdating cascade is not what
// you want. If you've already run this once, delete the file or pass
// --force.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const force = args.includes("--force");

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

// Idempotency check: any card with a createdAt in May 2026 means
// the script has been run before (the original batch was June 11/13).
// Round 23 fix: bail out with a clear message instead of silently
// re-running.
const hasBeenBackdated = cards.some((c) => c.createdAt.startsWith("2026-05"));
if (hasBeenBackdated && !force) {
  console.error(
    "⚠️  This script appears to have already been run (cards with createdAt in May 2026 found).\n" +
      "    Running it again would re-distribute dates and shift the timeline.\n" +
      "    If you really mean to re-run (e.g. you want a different spread), pass --force.",
  );
  process.exit(1);
}

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
