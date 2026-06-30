#!/usr/bin/env node
// Rewrite the 7 cards with empty/placeholder descriptions.
// These were skipped by the original 60-card batch run.
// Strategy: use mmx text chat to draft 2-3 sentence descriptions
// that match the editorial voice of the existing 53 cards.
// Hand-review 2-3 samples after the run.
//
// R60+ (2026-06-30): when mmx hangs (> 2 min) or errors out, fall back
// to programmatic derivation (mmx-fallback.mjs). This keeps the batch
// moving even when the API is overloaded.
import fs from "node:fs";
import path from "node:path";
import { callMmxSync, MmxHangError, MmxError } from "./mmx-client.mjs";
import { fillMissingFields } from "./mmx-fallback.mjs";
// Polyfill old-style callMmx(prompt, system) using the retry+backoff wrapper.
const callMmx = (prompt, system) => callMmxSync(prompt, system);

const args = process.argv.slice(2);
const cardsPathIdx = args.indexOf("--cards-path");
const cardsPath = cardsPathIdx >= 0 ? args[cardsPathIdx + 1] : path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社 (Atlas Kit) 的编辑, 专门为图鉴社写卡片简介.
- 中文, 2-3 句, 80-150 字
- 像维基百科 "概述" 段: 是什么 / 在哪 / 核心特征
- 用 "「主语 + 是 + 关键信息」" 结构, 不抒情不夸张
- 提到具体数据 (数量/年代/比例) 时必须保守, 不知道的写 "约" 或省略
- 只输出简介正文, 不要 markdown, 不要标题`;

function callMmxOld() {} // placeholder, replaced by import above

const includeSlugs = (() => {
  const i = args.indexOf("--include-slug");
  if (i < 0) return null;
  return new Set(args[i + 1].split(",").filter(Boolean));
})();

// R36+ fix: 也覆盖 "百科图鉴占位条目" placeholder (那些 > 20 char 但还是占位)
const isPlaceholder = (s) => !s || s.trim().length < 20 || s.includes('百科图鉴占位条目');
let targets = cards.filter((c) => isPlaceholder(c.description));
if (includeSlugs) targets = targets.filter((c) => includeSlugs.has(c.slug));
console.log(`Will rewrite descriptions for ${targets.length} cards.`);

let success = 0, fail = 0, fallbackUsed = 0;
for (let i = 0; i < targets.length; i++) {
  const c = targets[i];
  const prompt = `为「${c.title}」(类型:${c.kind}, 副标题:${c.subtitle||""}, 标签:${c.tags.join(",")}) 写一段图鉴社的卡片简介.
 要求: 80-150 字, 中文, 2-3 句, 像维基百科概述段. 提到具体数据时保守.`;
  process.stdout.write(`[${i + 1}/${targets.length}] ${c.title} ... `);
  try {
    const out = callMmx(prompt).trim();
    // Strip quotes / code fences if the model wrapped the output
    let body = out
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/```\s*$/, "")
      .replace(/^["「『]|["」』]$/g, "")
      .trim();
    if (body.length < 30) {
      // mmx returned junk — fall back to programmatic derivation
      const { applied } = fillMissingFields(c);
      if (applied.includes("description")) {
        fallbackUsed++;
        console.log(`FALLBACK (mmx short output) (${c.description.length} chars)`);
        success++;
        fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
        continue;
      }
      console.log("FAIL: too short");
      fail++;
      continue;
    }
    c.description = body;
    success++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK (${body.length} chars)`);
  } catch (e) {
    if (e instanceof MmxHangError || e instanceof MmxError) {
      // mmx hung or errored out — fall back to programmatic derivation.
      const { applied } = fillMissingFields(c);
      if (applied.includes("description")) {
        fallbackUsed++;
        console.log(`FALLBACK (${e.name}) (${c.description.length} chars)`);
        success++;
        fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
        continue;
      }
    }
    fail++;
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
  }
}

console.log(`\nDone. success=${success} fail=${fail} fallback=${fallbackUsed}.`);
