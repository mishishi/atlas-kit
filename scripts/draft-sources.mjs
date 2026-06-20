#!/usr/bin/env node
// Add a `sources` field to each card with 2-4 references.
// Run from project root. Re-runnable: skips cards that already
// have sources. ~$0.20 total via mmx.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const cardsPathIdx = args.indexOf("--cards-path");
const cardsPath = cardsPathIdx >= 0 ? args[cardsPathIdx + 1] : path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社编辑, 为每张图鉴挑 2-4 条最权威的中文参考来源. 只输出 JSON 数组.`;

function userPrompt(card) {
  return `为「${card.title}」(类型:${card.kind}, 标签:${card.tags.join(",")}) 推荐 2-4 条权威中文参考来源.

要求:
- JSON 数组, 每条 {title: 来源名, url: 链接, type: "百科"|"学术"|"博物馆"|"机构"|"新闻"|"其它"}
- 优先权威中文资源: 中国大百科全书, 维基百科中文版, 百度百科, 中国科学院, 故宫博物院, 国家级博物馆, 知网/学术论文
- type 必填, 真实可靠, 不编造具体网址
- url 用 https:// 开头
- 顺序: 通用百科 → 学术 / 博物馆 → 媒体 / 专题
- 只输出 JSON 数组, 没有任何其他文字`;
}

function callMmx(prompt) {
  // Round 30 fix: --quiet causes M2.7 to emit empty output and hang.
  // Parse the JSON envelope to extract .text. See draft-history.mjs
  // for full rationale.
  const isWin = process.platform === "win32";
  const mmxPath = isWin ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1" : "mmx";
  const args = ["text", "chat", "--non-interactive", "--message", prompt, "--system", SYSTEM_PROMPT];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 180_000 },
    );
  }
  return execFileSync(mmxPath, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 180_000 });
}

function extractResponseText(raw) {
  // Same as draft-history.mjs: extract .text from M2.7 envelope,
  // fall back to raw text if not JSON.
  if (!raw) return "";
  let env = null;
  try { env = JSON.parse(raw); } catch { return raw; }
  if (Array.isArray(env?.content)) {
    const textItem = env.content.find((c) => c && c.type === "text");
    if (textItem?.text) return textItem.text;
  }
  return raw;
}

function extractJsonArray(text) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start < 0 || end < 0) return null;
  const slice = s.slice(start, end + 1);
  try {
    const arr = JSON.parse(slice);
    return Array.isArray(arr) ? arr : null;
  } catch {
    try {
      const fixed = slice.replace(/,\s*]/g, "]").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

const includeSlugs = (() => {
  const i = args.indexOf("--include-slug");
  if (i < 0) return null;
  return new Set(args[i + 1].split(",").filter(Boolean));
})();

let todo = cards.filter((c) => !Array.isArray(c.sources) || c.sources.length === 0);
if (includeSlugs) todo = todo.filter((c) => includeSlugs.has(c.slug));
console.log(`Will draft sources for ${todo.length} cards (${cards.length} total, ${todo.length} missing).`);

let success = 0, fail = 0;
for (let i = 0; i < todo.length; i++) {
  const c = todo[i];
  process.stdout.write(`[${i + 1}/${todo.length}] ${c.title} ... `);
  try {
    const raw = callMmx(userPrompt(c));
    const text = extractResponseText(raw);
    const arr = extractJsonArray(text);
    if (!arr || arr.length < 2) {
      console.log("FAIL: parse");
      fail++;
      continue;
    }
    // Validate: need title + url (or at least title + type)
    const valid = arr
      .filter((s) => s && typeof s.title === "string" && typeof s.type === "string")
      // Round 23 fix: drop sources with missing/empty url instead of
      // writing "" into cards.json — that previously caused broken-link
      // rows to render in the /cards/[slug] 参考来源 section.
      .filter((s) => typeof s.url === "string" && s.url.startsWith("https://"))
      .slice(0, 5)
      .map((s) => ({
        title: String(s.title).trim().slice(0, 60),
        url: s.url.trim(),
        type: String(s.type).trim(),
      }));
    if (valid.length < 2) {
      console.log("FAIL: too few");
      fail++;
      continue;
    }
    c.sources = valid;
    success++;
    console.log(`OK (${valid.length} sources)`);
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  } catch (e) {
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
    fail++;
  }
}

console.log(`\nDone. success=${success} fail=${fail}.`);
