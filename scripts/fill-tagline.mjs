#!/usr/bin/env node
// scripts/fill-tagline.mjs
//
// R36+ tagline 补全: 给 cards 写 4-12 字中文短标语 (类似 "六朝古都" /
// "世界三大无攻击性犬种"). mmx text chat, ~$0.05/卡.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const includeSlugs = (() => {
  const i = args.indexOf("--include-slug");
  if (i < 0) return null;
  return new Set(args[i + 1].split(",").filter(Boolean));
})();

const cardsPathIdx = args.indexOf("--cards-path");
const cardsPath = cardsPathIdx >= 0 ? args[cardsPathIdx + 1] : path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社编辑, 为图鉴写一句 4-12 字中文短语标语.
要求:
- 中文, 4-12 字, 1 句话
- 简短精炼, 抓住该条目的核心特征或地位
- 不用 "是" 字开头, 不用句号
- 例: "六朝古都" / "世界三大无攻击性犬种" / "上有天堂下有苏杭"
- 只输出短语本身, 不要 markdown, 不要解释`;

function callMmx(prompt) {
  const isWin = process.platform === "win32";
  const mmxPath = isWin ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1" : "mmx";
  const args = ["text", "chat", "--non-interactive", "--quiet", "--message", prompt, "--system", SYSTEM_PROMPT];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 60_000 }
    );
  }
  return execFileSync(mmxPath, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 60_000 });
}

let targets = cards.filter((c) => !c.tagline || !c.tagline.trim());
if (includeSlugs) targets = targets.filter((c) => includeSlugs.has(c.slug));
console.log(`Will draft tagline for ${targets.length} cards.`);

let success = 0, fail = 0;
for (let i = 0; i < targets.length; i++) {
  const c = targets[i];
  const prompt = `为「${c.title}」(类型:${c.kind}, 副标题:${c.subtitle || ""}) 写一句 4-12 字标语.`;
  process.stdout.write(`[${i + 1}/${targets.length}] ${c.title} ... `);
  try {
    let tagline = callMmx(prompt).trim();
    tagline = tagline
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/```\s*$/, "")
      .replace(/^["「『]|["」』]$/g, "")
      .replace(/[。.!！,，;；]+$/g, "")
      .trim();
    if (tagline.length < 2 || tagline.length > 30) {
      console.log(`FAIL: invalid length (${tagline.length})`);
      fail++;
      continue;
    }
    c.tagline = tagline;
    success++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK ("${tagline}")`);
  } catch (e) {
    fail++;
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
  }
}

console.log(`\nDone. success=${success} fail=${fail}.`);