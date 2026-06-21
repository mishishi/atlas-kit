#!/usr/bin/env node
// scripts/handwrite-r37.mjs
//
// R37 mmx 反复 parse 失败或未跑的 metadata hardcoded 兜底。
// 数据从 tmp/r37-hardcoded.json 读取, 避免单文件过大。
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const dataPath = path.resolve("tmp/r37-hardcoded.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
const ENTRIES = JSON.parse(fs.readFileSync(dataPath, "utf8"));

let addedDesc = 0, addedHistory = 0;
for (const c of cards) {
  const ex = ENTRIES[c.slug];
  if (!ex) continue;
  if (ex.description && (c.description.includes('百科图鉴占位条目') || c.description.length < 30)) {
    c.description = ex.description;
    addedDesc++;
  }
  if (ex.history && Array.isArray(ex.history) && (!c.history || c.history.length === 0)) {
    c.history = ex.history;
    addedHistory++;
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Handwritten: ${addedDesc} descriptions + ${addedHistory} histories`);
console.log(`Total cards now: ${cards.length}`);