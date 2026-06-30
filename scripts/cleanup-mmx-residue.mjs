#!/usr/bin/env node
/**
 * R60plus cleanup: strip " · 百科占位" suffix from 200 subtitle fields
 * where mmx-stubborn batch (R59) left the placeholder. Earlier R58c
 * attempt used regex `·\s*百科占位\s*$` but the actual placeholder
 * pattern is "X · Y · 百科占位" (kind · topic · 占位) — the trailing
 * 占位 matches but the previous `·` separator needs different handling.
 *
 * Strategy:
 *   - Match: kind · topic · 百科占位 at end of subtitle
 *   - Strip: leave just "kind · topic"
 *   - Result: subtitle becomes meaningful again ("电影 · 玩具总动员")
 *
 * Also fix 2 cards where description starts with "**xxx**\n\n" (mmx
 * fallback template).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data/cards.json");

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));

let subtitleFixed = 0;
let descFixed = 0;

for (const c of cards) {
  // 1. Subtitle cleanup: strip " · 百科占位" suffix (with optional surrounding whitespace)
  if (c.subtitle) {
    const before = c.subtitle;
    // Match "· 百科占位" OR "百科占位" at end (allow both middle-dot and plain)
    c.subtitle = c.subtitle
      .replace(/\s*[·・]\s*百科占位\s*$/, "")  // " · 百科占位" or "・百科占位"
      .replace(/\s*百科占位\s*$/, "")            // bare "百科占位" at end
      .trim();
    if (c.subtitle !== before) subtitleFixed++;
  }

  // 2. Description: strip leading "**xxx**\n\n" mmx fallback prefix
  if (c.description) {
    const before = c.description;
    c.description = c.description.replace(/^\*\*[^*]+\*\*\s*\n+/, "").trim();
    if (c.description !== before) descFixed++;
  }
}

writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Subtitle cleaned: ${subtitleFixed}`);
console.log(`Description cleaned: ${descFixed}`);

// Re-audit
const reAudit = cards.filter(c => /百科占位/.test(c.subtitle || "") || /百科占位/.test(c.description || "") || /^\*\*[^*]+\*\*\s*\n/.test(c.description || ""));
console.log(`Remaining residue: ${reAudit.length}`);