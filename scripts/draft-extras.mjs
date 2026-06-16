#!/usr/bin/env node
// Add 2 new editorial fields to each card:
//   - quote: 1-2 sentence authoritative citation
//   - trivia: 1 sentence interesting fact
//
// myth/fact are handled by add-myth-fact.mjs (Round 9 — hand-written,
// not AI-drafted, because M2.7 was unreliable on structured pair output).
//
// AI-drafted via mmx text chat, ~$0.15 total for quote+trivia batch.
// Skips cards that already have both fields.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = "你是图鉴社编辑. 写中文百科条目. 严格按要求输出 JSON, 不解释.";

function userPrompt(card) {
  return "为「" + card.title + "」写 2 段中文 (一起放进一个 JSON 对象里, 字段名固定英文):\n" +
    "1. 字段名 \"quote\": 1-2 句权威引文, 标注来源 (例: 苏轼《惠州一绝》/ 维基百科 / 国务院批复). 20-60 字. 引文必须真实, 不知道就选另一条, 严禁编造.\n" +
    "2. 字段名 \"trivia\": 1 句有趣小知识. 15-40 字.\n" +
    "只输出 {\"quote\": \"...\", \"trivia\": \"...\"} 这个 JSON. 不要 markdown 不要解释. 重要: 只用 quote 和 trivia 两个字段, 不要再加其他.";
}

function callMmx(prompt) {
  const isWin = process.platform === "win32";
  const mmxPath = isWin ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1" : "mmx";
  const args = ["text", "chat", "--non-interactive", "--quiet", "--message", prompt, "--system", SYSTEM_PROMPT];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 }
    );
  }
  return execFileSync(mmxPath, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 });
}

function extractJsonObject(text) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  const slice = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice);
    return obj && typeof obj === "object" ? obj : null;
  } catch (e1) {
    try {
      const fixed = slice
        .replace(/,\s*\}/g, "}")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
      return JSON.parse(fixed);
    } catch (e2) {
      return null;
    }
  }
}

const targets = cards.filter((c) => !c.quote || !c.trivia);
console.log("Will draft extras for " + targets.length + " cards (" + cards.length + " total).");

let success = 0, fail = 0;
for (let i = 0; i < targets.length; i++) {
  const c = targets[i];
  process.stdout.write("[" + (i + 1) + "/" + targets.length + "] " + c.title + " ... ");
  try {
    const raw = callMmx(userPrompt(c));
    const obj = extractJsonObject(raw);
    if (!obj) {
      console.log("FAIL: parse");
      fail++;
      continue;
    }
    const fields = {
      quote: typeof obj.quote === "string" ? obj.quote.trim().slice(0, 200) : "",
      trivia: typeof obj.trivia === "string" ? obj.trivia.trim().slice(0, 100) : "",
    };
    const validCount = Object.values(fields).filter((v) => v.length > 5).length;
    if (process.env.DEBUG_EXTRAS) {
      console.log("  DEBUG obj:", JSON.stringify(obj).slice(0, 300));
      console.log("  DEBUG fields:", JSON.stringify(fields));
    }
    if (validCount < 2) {
      console.log("FAIL: too few valid (" + validCount + "/2)");
      fail++;
      continue;
    }
    c.quote = fields.quote;
    c.trivia = fields.trivia;
    success++;
    console.log("OK (" + validCount + "/2 fields)");
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  } catch (e) {
    console.log("ERR: " + (e.message ? e.message.slice(0, 80) : e));
    fail++;
  }
}

console.log("\nDone. success=" + success + " fail=" + fail + ".");
