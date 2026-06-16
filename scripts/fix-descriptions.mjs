#!/usr/bin/env node
// Rewrite the 7 cards with empty/placeholder descriptions.
// These were skipped by the original 60-card batch run.
// Strategy: use mmx text chat to draft 2-3 sentence descriptions
// that match the editorial voice of the existing 53 cards.
// Hand-review 2-3 samples after the run.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社 (Atlas Kit) 的编辑, 专门为图鉴社写卡片简介.
- 中文, 2-3 句, 80-150 字
- 像维基百科 "概述" 段: 是什么 / 在哪 / 核心特征
- 用 "「主语 + 是 + 关键信息」" 结构, 不抒情不夸张
- 提到具体数据 (数量/年代/比例) 时必须保守, 不知道的写 "约" 或省略
- 只输出简介正文, 不要 markdown, 不要标题`;

function callMmx(prompt) {
  const isWin = process.platform === "win32";
  const mmxPath = isWin ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1" : "mmx";
  const args = ["text", "chat", "--non-interactive", "--quiet", "--message", prompt, "--system", SYSTEM_PROMPT];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 },
    );
  }
  return execFileSync(mmxPath, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 });
}

const targets = cards.filter((c) => !c.description || c.description.trim().length < 20);
console.log(`Will rewrite descriptions for ${targets.length} cards.`);

let success = 0, fail = 0;
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
      console.log("FAIL: too short");
      fail++;
      continue;
    }
    c.description = body;
    success++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK (${body.length} chars)`);
  } catch (e) {
    fail++;
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
  }
}

console.log(`\nDone. success=${success} fail=${fail}.`);
