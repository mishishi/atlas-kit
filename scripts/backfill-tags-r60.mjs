#!/usr/bin/env node
// Backfill cross-cutting tags for cards missing them.
// add-cross-tags.mjs only handles hard-coded slugs. R59+ added 100+ cards
// without CROSS_TAGS entries. This script uses mmx to generate tags for
// any card with <2 tags.
import fs from "node:fs";
import path from "node:path";
import { callMmxSync } from "./mmx-client.mjs";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社 tag 编辑, 给每张卡片写 4-6 个 cross-cutting 标签.
- 中文, 1-4 字短语
- 跨维度分类: 区域 (中国/东亚/全球/北美/欧洲/南美/非洲/中东/海洋) +
  时代 (古代/近代/现代) + 主题 (自然/城市/科技/文化/历史/神话/文学/艺术/饮食/节日/交通/医学/能源) +
  主体 (哺乳/鸟类/植物/矿物/建筑/器物/人物) + 风格 (古典/流行/实验)
- 跟已有 tag 不要重复, 不要编号, 不要 markdown, 输出 JSON 数组`;

function callMmx(prompt) {
  return callMmxSync(prompt, SYSTEM_PROMPT, { quiet: true });
}

const targets = cards.filter((c) => !c.tags || c.tags.length < 2);
console.log(`Will tag ${targets.length} cards.`);
let ok = 0, fail = 0;
for (let i = 0; i < targets.length; i++) {
  const c = targets[i];
  const prompt = `为「${c.title}」(slug:${c.slug}, 类型:${c.kind}, subKind:${c.subKind||""}) 写 4-6 个 cross-cutting tag。
当前已有 tag: ${(c.tags||[]).join(", ") || "(无)"}。
要求: 不要重复, 不要编号, JSON 数组输出.`;
  process.stdout.write(`[${i+1}/${targets.length}] ${c.slug} ... `);
  try {
    let out = callMmx(prompt).trim();
    out = out.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
    const arr = JSON.parse(out);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("not array");
    // dedup with existing
    const seen = new Set(c.tags || []);
    for (const t of arr) {
      if (typeof t === "string" && t.length <= 8 && t.length >= 1 && !seen.has(t)) {
        (c.tags = c.tags || []).push(t);
        seen.add(t);
      }
    }
    if (c.tags.length < 2) throw new Error("too few after merge");
    ok++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK (${c.tags.length} tags total)`);
  } catch (e) {
    fail++;
    console.log(`FAIL: ${(e.message||"").slice(0, 80)}`);
  }
}
console.log(`\nDone. ok=${ok} fail=${fail}.`);