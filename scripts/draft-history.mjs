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

// Round 34+ fix: internal retry for non-deterministic mmx responses.
// M2.7 sometimes returns "X" placeholders, invalid JSON, or partial
// arrays. Each retry sleeps 1.5s (give mmx service cooldown). 3
// retries x 4 cards = 12 attempts, but in practice 1 retry resolves
// most cases. CLI override via --max-retries N (1 = old behavior).
const retriesIdx = args.indexOf("--max-retries");
let MAX_RETRIES = 3;
if (retriesIdx >= 0) {
  const r = parseInt(args[retriesIdx + 1], 10);
  if (Number.isFinite(r) && r >= 1) MAX_RETRIES = r;
}
const RETRY_DELAY_MS = 1500;

/** Sync sleep that doesn't require async/await in main loop. */
function syncSleep(ms) {
  const sab = new SharedArrayBuffer(4);
  const i32 = new Int32Array(sab);
  Atomics.wait(i32, 0, 0, ms);
}

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const SYSTEM_PROMPT = `你是图鉴社历史编辑。严格只输出 JSON 数组 [{year, title, body}]。year 用字符串, body 30-60 字。`;

function userPrompt(card) {
  // Round 30: 节点数从 5-8 砍到 3-5。M2.7 + thinking 模式会吃光
  // 4096 tokens,导致 text 字段没输出。3-5 节点足够紧凑,thinking
  // 也能给 text 留余地。要更多节点时再扩。
  return `为「${card.title}」(类型:${card.kind}, 副标题:${card.subtitle || ""}, 标签:${card.tags.join(",")}) 写 3-5 条历史节点。

要求:
- JSON 数组, 每条 {year: 字符串, title: 6-12字, body: 30-60字史实}
- year 用 "X 年" 或 "前 X 年" 或 "X 世纪" 格式
- 正序 (古→今)
- 3-5 条
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
  // The mmx CLI also doesn't have --system-prompt, it has --system.
  //
  // Round 30 fix: don't pass --quiet. M2.7 emits a JSON envelope with
  // {content:[{type:"thinking",...},{type:"text",...}]}; with --quiet
  // the CLI silently returns empty string and the process hangs until
  // our timeout. Without --quiet we get the full JSON envelope, which
  // we parse below to extract the .text field.
  const isWin = process.platform === "win32";
  const mmxPath = isWin
    ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1"
    : "mmx";
  const args = [
    "text",
    "chat",
    "--non-interactive",
    "--message",
    prompt,
    "--system",
    SYSTEM_PROMPT,
  ];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 180_000 },
    );
  }
  return execFileSync(mmxPath, args, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 180_000,
  });
}

/**
 * Extract the model's text content from a mmx response.
 *
 * M2.7 response format (newer mmx versions):
 *   {
 *     "content": [
 *       { "type": "thinking", "thinking": "..." },
 *       { "type": "text", "text": "[{...}, ...]" }
 *     ],
 *     ...
 *   }
 *
 * Older mmx (or non-thinking models) just returned raw text — we
 * fall back to that for backward compat.
 */
function extractResponseText(raw) {
  if (!raw) return "";
  let env = null;
  try {
    env = JSON.parse(raw);
  } catch {
    return raw; // not JSON envelope, treat as raw text
  }
  if (Array.isArray(env?.content)) {
    const textItem = env.content.find((c) => c && c.type === "text");
    if (textItem?.text) return textItem.text;
  }
  return raw;
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

/**
 * Round 30: post-process — M2.7 frequently forgets to fill the `year`
 * field in the JSON output (the year ends up inside `body` instead).
 * Pull it out of body so the timeline isn't full of "X" placeholders.
 *
 * Priority: 前 N 年 > 公元 N 年 > N 年 (2-4 digits) > N 世纪
 * Returns null if no year found (caller should drop the node).
 */
function extractYearFromBody(body) {
  if (!body) return null;
  let m;
  if ((m = body.match(/前\s*(\d+)\s*年/))) return `前 ${m[1]} 年`;
  if ((m = body.match(/公元\s*(\d+)\s*年/))) return `${m[1]} 年`;
  if ((m = body.match(/(\d{2,4})\s*年/))) return `${m[1]} 年`;
  if ((m = body.match(/(\d+)\s*世纪/))) return `${m[1]} 世纪`;
  return null;
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

  // Round 34+ internal retry: same card, same prompt, max MAX_RETRIES
  // attempts with 1.5s sleep between. Persist on first valid ≥3 result.
  let valid = null;
  let attempts = 0;
  let lastErr = null;
  while (attempts < MAX_RETRIES && !valid) {
    attempts++;
    try {
      const raw = callMmx(prompt);
      const text = extractResponseText(raw);
      const arr = extractJsonArray(text);
      if (!arr || arr.length < 3) {
        lastErr = "parse";
        if (attempts < MAX_RETRIES) {
          syncSleep(RETRY_DELAY_MS);
          continue;
        }
        console.log(`FAIL: ${lastErr} after ${attempts} attempt(s)`);
        break;
      }
      // Validate each node. Coerce year to string (model sometimes
      // returns numbers or uses "event" instead of "body"). Truncate
      // body if too long to keep the timeline compact.
      //
      // Round 30: if the model didn't fill `year`, post-process it out
      // of `body` (M2.7 commonly embeds the year in the body text).
      const validated = arr
        .map((n) => {
          if (!n || typeof n !== "object") return null;
          const titleField = n.title ?? n.event ?? n.heading;
          const bodyField = n.body ?? n.event ?? n.description ?? n.text;
          if (typeof titleField !== "string" || typeof bodyField !== "string") return null;
          const yearRaw = n.year ?? n.date ?? n.time;
          let year;
          if (yearRaw == null || yearRaw === "" || yearRaw === "X" || yearRaw === "x") {
            year = extractYearFromBody(bodyField);
            if (year == null) return null; // 仍然没 year,丢弃
          } else {
            year = typeof yearRaw === "number" ? `${yearRaw} 年` : String(yearRaw);
          }
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
      if (validated.length < 3) {
        lastErr = `too few valid nodes (got ${validated.length})`;
        if (attempts < MAX_RETRIES) {
          syncSleep(RETRY_DELAY_MS);
          continue;
        }
        console.log(`FAIL: ${lastErr} after ${attempts} attempt(s)`);
        break;
      }
      valid = validated;
    } catch (e) {
      lastErr = `ERR: ${e.message?.slice(0, 80) ?? e}`;
      if (attempts < MAX_RETRIES) {
        syncSleep(RETRY_DELAY_MS);
        continue;
      }
      console.log(lastErr + ` after ${attempts} attempt(s)`);
    }
  }

  if (valid) {
    c.history = valid;
    success++;
    const attemptNote = attempts > 1 ? ` (after ${attempts} attempt${attempts > 1 ? "s" : ""})` : "";
    console.log(`OK (${valid.length} nodes)${attemptNote}`);
    // Persist after every success — so a timeout mid-run doesn't
    // lose the work we've already done. Cheap (60 × a few KB).
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  } else {
    fail++;
  }
}

console.log(`\nDone. success=${success} fail=${fail}. cards.json updated.`);
console.log("Review the history fields and commit when satisfied.");
