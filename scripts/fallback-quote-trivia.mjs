#!/usr/bin/env node
/**
 * Fallback: programmatically fill quote + trivia using existing card data.
 * mmx was unreliable (529 overloaded) — these mechanical templates are
 * consistent and never fail.
 *
 * - quote: pick a sentence from description (last sentence is often the
 *   "punch line") or skip if description is too short.
 * - trivia: derive 1-2 facts from the description's own numbers/names.
 *   If description is too thin, fall back to a generic "可通过 X 了解"
 *   pointer — better than empty.
 */
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

function pickQuote(c) {
  const desc = c.description || "";
  if (desc.length < 30) return null;
  // Take last sentence (preferred for "punch line")
  const sentences = desc.split(/[。.！？」』]/).filter((s) => s.trim().length > 10);
  if (sentences.length === 0) return null;
  const last = sentences[sentences.length - 1].trim();
  if (last.length < 8 || last.length > 60) return null;
  return last + "。";
}

function pickTrivia(c) {
  const desc = c.description || "";
  if (desc.length < 40) {
    return `在图鉴社「${c.title}」专题页可查看完整档案与历史沿革。`;
  }
  // Pick a phrase containing a number or proper noun from description
  const matches = desc.match(/[一二三四五六七八九十百千万亿0-9]+[^。]*?。/g);
  if (matches && matches.length > 0) {
    const m = matches[0].trim();
    if (m.length >= 12 && m.length <= 80) return m;
  }
  return `「${c.title}」属于「${c.kind}」分类,可在 /cards?kind=${c.kind} 查看同类图鉴。`;
}

let qFixed = 0, tFixed = 0;
for (const c of cards) {
  if (!c.quote || c.quote.length < 5) {
    const q = pickQuote(c);
    if (q) {
      c.quote = q;
      qFixed++;
    }
  }
  if (!c.trivia || c.trivia.length < 5) {
    const t = pickTrivia(c);
    if (t) {
      c.trivia = t;
      tFixed++;
    }
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`quote fixed: ${qFixed}, trivia fixed: ${tFixed}`);

const noQuote = cards.filter((c) => !c.quote).length;
const noTrivia = cards.filter((c) => !c.trivia).length;
console.log(`Remaining: no-quote=${noQuote} no-trivia=${noTrivia}`);