#!/usr/bin/env node
/**
 * Resume: backfill tags for the 76 cards still under 4 tags.
 * Idempotent. Uses mmx single-call per card.
 */
import fs from "node:fs";
import path from "node:path";
import { callMmxSync } from "./mmx-client.mjs";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM = `你是图鉴社 (Atlas Kit) 的标签编辑, 专门为图鉴卡补跨切分类标签.
- 输出 JSON 数组, 5-7 个标签
- 优先用以下跨切分类轴:
  · 地域 (中国 / 日本 / 欧洲 / 印度 / 中东 / 东南亚 / 美洲 / 非洲 / 海洋 / 全球)
  · 时代 (古代 / 近代 / 现代 / 当代)
  · 主题 (哺乳 / 节肢 / 鸟 / 鱼 / 昆虫 / 植物 / 矿石 / 化学 / 物理 / 数学 / 医学 / 工程 / 艺术 / 音乐 / 文学 / 历史 / 地理 / 政治 / 商业 / 体育 / 哲学 / 宗教 / 教育)
  · 跨切属性 (古代 / 近代 / 现代 / 当代 / 自然 / 文化 / 工艺 / 科学 / 流行 / 民俗)
- 已有标签不要重复
- 只输出 JSON 数组, 不要 markdown, 不要解释`;

function callMmx(prompt) {
  return callMmxSync(prompt, SYSTEM, { quiet: true });
}

function extractArray(text) {
  let s = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
  const m = s.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const targets = cards.filter((c) => !c.tags || c.tags.length < 4);
console.log(`Resuming tags backfill for ${targets.length} cards.`);

let ok = 0, fail = 0;
for (let i = 0; i < targets.length; i++) {
  const c = targets[i];
  process.stdout.write(`[${i + 1}/${targets.length}] ${c.title} ... `);
  try {
    const prompt = `为「${c.title}」(类型:${c.kind}, 已有标签: [${(c.tags || []).join(",")}]) 推荐 5-7 个跨切分类标签.`;
    const out = callMmx(prompt);
    const arr = extractArray(out);
    if (!arr || arr.length < 3) {
      console.log(`FAIL (got ${arr?.length || 0})`);
      fail++;
      continue;
    }
    const merged = [...new Set([...(c.tags || []), ...arr.map((s) => String(s).trim()).filter(Boolean)])].slice(0, 10);
    c.tags = merged;
    ok++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK (${merged.length})`);
  } catch (e) {
    fail++;
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
  }
}
console.log(`\nDone: success=${ok} fail=${fail}`);