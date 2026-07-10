// src/lib/reading-time.ts
//
// R78 (2026-07-10): reading time estimate. R77 shipping the progress bar
// left a question: "how long will this take?" A user opening a long
// history card wants to know upfront. The bar (R77) shows progress
// WHILE reading; this shows ETA at the START.
//
// Aggregation: description (the main body) + history node bodies
// (5-8 nodes) + sources titles. We skip quote / trivia / myth / fact
// — those are short side panels, not the main reading flow. Word
// counting treats each CJK char as 1 word and each Latin word as 1
// word, so the estimate is roughly the same regardless of language
// mix.
//
// Rate: 250 wpm for Chinese-dominant text (typical Chinese silent
// reading speed). 200 wpm for very Latin-heavy. We split on CJK vs
// non-CJK, weight accordingly. Result is rounded up to nearest
// minute, minimum 1.
//
// Why this is fine without empirical calibration: the user only
// needs an order-of-magnitude signal. "约 8 分钟" is a 2x better
// answer than "约 4 分钟" but for our purposes the granularity
// is 1 minute and the bandwidth is "8 / 12 / 15" — being off by 1
// minute is invisible.

import type { Card } from "@/lib/types";

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

/** Count words: each CJK char = 1 word, each non-CJK word = 1 word. */
export function countWords(text: string): number {
  if (!text) return 0;
  let cjk = 0;
  let latin = 0;
  // strip whitespace and Latin punctuation noise
  const stripped = text.replace(/[\s\p{P}]+/gu, " ");
  for (const ch of stripped) {
    if (CJK_RE.test(ch)) cjk++;
    else if (/[a-zA-Z0-9]/.test(ch)) latin++;
  }
  // Latin words are counted by split; CJK is per char.
  // Heuristic: latin segments roughly 5 chars/word
  return cjk + Math.ceil(latin / 5);
}

interface ReadingTime {
  minutes: number;
  words: number;
}

const CHARS_PER_MINUTE = 400; // Chinese silent reading
const WORDS_PER_MINUTE = 220; // English silent reading

/** Estimate reading time in minutes (rounded up, min 1). */
export function estimateReadingTime(card: Pick<Card, "description" | "history" | "sources">): ReadingTime {
  let cjk = 0;
  let latin = 0;
  const segments: string[] = [card.description ?? ""];
  if (card.history) {
    for (const node of card.history) {
      segments.push(node.title ?? "");
      segments.push(node.body ?? "");
    }
  }
  if (card.sources) {
    for (const s of card.sources) {
      segments.push(s.title ?? "");
    }
  }
  for (const seg of segments) {
    if (!seg) continue;
    for (const ch of seg) {
      if (CJK_RE.test(ch)) cjk++;
      else if (/[a-zA-Z0-9]/.test(ch)) latin++;
    }
  }
  // Latin words ≈ latin chars / 5
  const latinWords = Math.ceil(latin / 5);
  const minutes = Math.max(1, Math.ceil(cjk / CHARS_PER_MINUTE + latinWords / WORDS_PER_MINUTE));
  return { minutes, words: cjk + latinWords };
}

/** Format a reading time as Chinese label: "约 8 分钟阅读" */
export function formatReadingTime(rt: ReadingTime): string {
  return `约 ${rt.minutes} 分钟阅读`;
}
