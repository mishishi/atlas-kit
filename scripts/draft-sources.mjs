#!/usr/bin/env node
// Add a `sources` field to each card with 2-4 references.
// Run from project root. Re-runnable: skips cards that already
// have sources. ~$0.20 total via mmx.
import fs from "node:fs";
import path from "node:path";
import { callMmxSync, MmxHangError, MmxError } from "./mmx-client.mjs";
import { isMmxContentBad, sanitizeMmxContent } from "./mmx-content-guard.mjs";
import { fillMissingFields } from "./mmx-fallback.mjs";

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

// Round 30 fix: --quiet causes M2.7 to emit empty output and hang.
// Parse the JSON envelope to extract .text. See draft-history.mjs for rationale.
const callMmx = (prompt) => callMmxSync(prompt, SYSTEM_PROMPT, { quiet: false });

// R70+ content-level retry: M2.7 returns JS-undefined docs / English stub /
// AI refusal ~10% of time. Retry up to MAX_RETRIES with 1.5s sleep between
// before falling back to programmatic derivation.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
function syncSleep(ms) {
  const sab = new SharedArrayBuffer(4);
  const i32 = new Int32Array(sab);
  Atomics.wait(i32, 0, 0, ms);
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

let success = 0, fail = 0, fallbackUsed = 0;
for (let i = 0; i < todo.length; i++) {
  const c = todo[i];
  process.stdout.write(`[${i + 1}/${todo.length}] ${c.title} ... `);

  // R70+: content-level retry loop. Each iteration:
  //   - callMmx → API retry (already inside mmx-client)
  //   - extractResponseText + sanitize
  //   - isMmxContentBad → reject JS-undefined / English stub / AI refusal
  //   - extractJsonArray → parse
  //   - validate: ≥2 sources with https URL
  // Give up after MAX_RETRIES, fall back to programmatic derivation.
  let valid = null;
  let attempts = 0;
  let lastErr = null;
  let mmxGaveUp = false;
  while (attempts < MAX_RETRIES && !valid) {
    attempts++;
    try {
      const raw = callMmx(userPrompt(c));
      const text = extractResponseText(raw);
      const cleaned = sanitizeMmxContent(text);
      const bad = isMmxContentBad(cleaned);
      if (bad.bad) {
        lastErr = `content: ${bad.reason}`;
        if (attempts < MAX_RETRIES) {
          syncSleep(RETRY_DELAY_MS);
          continue;
        }
        break;
      }
      const arr = extractJsonArray(cleaned);
      if (!arr || arr.length < 2) {
        lastErr = "parse";
        if (attempts < MAX_RETRIES) {
          syncSleep(RETRY_DELAY_MS);
          continue;
        }
        break;
      }
      const filtered = arr
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
      if (filtered.length < 2) {
        lastErr = `too few valid (got ${filtered.length})`;
        if (attempts < MAX_RETRIES) {
          syncSleep(RETRY_DELAY_MS);
          continue;
        }
        break;
      }
      valid = filtered;
    } catch (e) {
      lastErr = `ERR: ${e.message?.slice(0, 80) ?? e}`;
      if (e instanceof MmxHangError) {
        mmxGaveUp = true;
        console.log(`HANG (${(e.elapsedMs / 1000).toFixed(0)}s)`);
        break;
      }
      if (attempts < MAX_RETRIES) {
        syncSleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }

  if (valid) {
    c.sources = valid;
    success++;
    const note = attempts > 1 ? ` (after ${attempts} attempts)` : "";
    console.log(`OK (${valid.length} sources)${note}`);
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  } else {
    // R60+: programmatic derivation as last resort
    const { applied } = fillMissingFields(c);
    if (applied.includes("sources")) {
      fallbackUsed++;
      const reason = mmxGaveUp ? "HANG" : lastErr || "parse";
      console.log(`FALLBACK (${reason}) (${c.sources.length} sources)`);
      success++;
      fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    } else {
      console.log(`FAIL: ${lastErr ?? "unknown"}`);
      fail++;
    }
  }
}

console.log(`\nDone. success=${success} fail=${fail} fallback=${fallbackUsed}.`);
