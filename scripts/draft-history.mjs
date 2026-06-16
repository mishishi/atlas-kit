#!/usr/bin/env node
// Batch-generate 5-8 history nodes per card via mmx text chat.
// One LLM call per card, ~$0.30 total. Run from project root.
//
// Usage: node scripts/draft-history.mjs [--dry-run] [--limit N]
//
// Output: writes to data/cards.json (in-place) the `history` field
// on each card. Cards that already have `history` are skipped
// (so the script is idempotent and re-runnable).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
let limit = Infinity;
if (limitIdx >= 0) {
  const limitRaw = args[limitIdx + 1];
  const parsed = parseInt(limitRaw, 10);
  // Round 23 fix: validate --limit so `0` or `-3` doesn't silently
  // produce "Done. success=0 fail=0" with no explanation.
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`Invalid --limit value: "${limitRaw}". Must be a positive integer.`);
    process.exit(1);
  }
  limit = parsed;
}

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社历史编辑。严格只输出 JSON 数组 [{year, title, body}]。year 用字符串, body 30-60 字。`;

function userPrompt(card) {
  return `为「${card.title}」(类型:${card.kind}, 副标题:${card.subtitle || ""}, 标签:${card.tags.join(",")}) 写 5-8 条历史节点。

要求:
- JSON 数组, 每条 {year: 字符串, title: 6-12字, body: 30-60字史实}
- year 用 "X 年" 或 "前 X 年" 或 "X 世纪" 格式
- 正序 (古→今)
- 5-8 条
- 动物/植物/器物: 写该实体本身的历史/演变/起源, 不要生物学发现史
- 现代技术 (5G/AI/区块链): 写技术发展节点
- 神话/传说/节日: 写起源+演变+现代定型
- 史实必须准确, 不知道的写 "约" 或留模糊
- 只输出 JSON 数组, 没有任何其他文字`;
}

function callMmx(prompt) {
  // On Windows, mmx is a .ps1 PowerShell shim, not a .exe. Node's
  // execFile doesn't auto-resolve .ps1 files via PATH. Use the full
  // path with the right invocation. PowerShell executes the .ps1
  // directly when given the -File arg.
  //
  // --output json wraps the response in an envelope: {content, ...}.
  // We want pure text, so no --output flag (default = text mode).
  // The mmx CLI also doesn't have --system-prompt, it has --system.
  const isWin = process.platform === "win32";
  const mmxPath = isWin
    ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1"
    : "mmx";
  const args = [
    "text",
    "chat",
    "--non-interactive",
    "--quiet",
    "--message",
    prompt,
    "--system",
    SYSTEM_PROMPT,
  ];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 },
    );
  }
  return execFileSync(mmxPath, args, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 90_000,
  });
}

function extractJsonArray(text) {
  // Strip any leading/trailing whitespace, remove code fences if any.
  let s = text.trim();
  // Remove ```json ... ``` fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  // Find first [ and last ]
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start < 0 || end < 0) return null;
  const slice = s.slice(start, end + 1);
  try {
    const arr = JSON.parse(slice);
    if (!Array.isArray(arr)) return null;
    return arr;
  } catch (e) {
    // Try to fix common issues: trailing commas, smart quotes
    try {
      const fixed = slice
        .replace(/,\s*]/g, "]")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

const todo = cards.filter((c) => !c.history || !Array.isArray(c.history) || c.history.length === 0);
const targets = todo.slice(0, limit);

console.log(`Will draft history for ${targets.length} cards (${cards.length} total, ${todo.length} missing).`);
if (dryRun) {
  console.log("[dry-run] Would prompt for first card:", targets[0]?.title);
  process.exit(0);
}

let success = 0, fail = 0;
for (let i = 0; i < targets.length; i++) {
  const c = targets[i];
  const prompt = userPrompt(c);
  process.stdout.write(`[${i + 1}/${targets.length}] ${c.title} ... `);
  try {
    const raw = callMmx(prompt);
    const arr = extractJsonArray(raw);
    if (!arr || arr.length < 3) {
      console.log("FAIL: parse");
      fail++;
      continue;
    }
    // Validate each node. Coerce year to string (model sometimes
    // returns numbers or uses "event" instead of "body"). Truncate
    // body if too long to keep the timeline compact.
    const valid = arr
      .map((n) => {
        if (!n || typeof n !== "object") return null;
        const titleField = n.title ?? n.event ?? n.heading;
        const bodyField = n.body ?? n.event ?? n.description ?? n.text;
        if (typeof titleField !== "string" || typeof bodyField !== "string") return null;
        const yearRaw = n.year ?? n.date ?? n.time;
        if (yearRaw == null) return null;
        const year = typeof yearRaw === "number" ? `${yearRaw} 年` : String(yearRaw);
        let body = String(bodyField).trim();
        if (body.length > 100) body = body.slice(0, 100) + "…";
        return {
          year: year.trim(),
          title: String(titleField).trim().slice(0, 16),
          body,
        };
      })
      .filter((v) => v && v.year && v.title && v.body)
      .slice(0, 8);
    if (valid.length < 3) {
      console.log(`FAIL: too few valid nodes (got ${valid.length})`);
      fail++;
      continue;
    }
    c.history = valid;
    success++;
    console.log(`OK (${valid.length} nodes)`);
    // Persist after every success — so a timeout mid-run doesn't
    // lose the work we've already done. Cheap (60 × a few KB).
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  } catch (e) {
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
    fail++;
  }
}

console.log(`\nDone. success=${success} fail=${fail}. cards.json updated.`);
console.log("Review the history fields and commit when satisfied.");
