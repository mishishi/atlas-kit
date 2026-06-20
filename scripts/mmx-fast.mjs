#!/usr/bin/env node
// scripts/mmx-fast.mjs
//
// 直接 HTTP 调 MiniMax Messages API (绕过 mmx CLI spawn 开销),
// 并发 fetch (Promise.all), retry 改 prompt schema 提高成功率。
//
// 用法:
//   node scripts/mmx-fast.mjs --stage descriptions --workers 6
//   node scripts/mmx-fast.mjs --stage history --workers 6
//   node scripts/mmx-fast.mjs --stage sources --workers 6
//   node scripts/mmx-fast.mjs --stage extras --workers 6
//   node scripts/mmx-fast.mjs --stage tagline --workers 6
//
// 工作方式:
//   1. 读 cards.json + MiniMax api_key
//   2. 找缺某字段的 slugs
//   3. round-robin 分给 N 个 worker
//   4. 每个 worker 用 Promise.all 并发 fetch MiniMax API
//   5. worker 写 cards.worker-N.json (避免 race)
//   6. 主进程合并所有 worker cards.json → data/cards.json

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const stage = (getArg("--stage") || "descriptions").toLowerCase();
const workers = Math.min(parseInt(getArg("--workers") || "6", 10), 12);
const dryRun = args.includes("--dry-run");
const limit = parseInt(getArg("--limit") || "0", 10) || Infinity;

const ROOT = process.cwd();
const TMP = path.join(ROOT, "tmp", "mmx-fast");
fs.mkdirSync(TMP, { recursive: true });

const CARDS_JSON = path.join(ROOT, "data", "cards.json");
const cfgPath = process.platform === "win32" ? "C:/Users/zrb03/.mmx/config.json" : path.join(os.homedir(), ".mmx/config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const API_KEY = cfg.api_key;
const BASE_URL = cfg.base_url || (cfg.region === "cn" ? "https://api.minimaxi.com" : "https://api.MiniMax.io");
const ENDPOINT = `${BASE_URL}/v1/text/chatcompletion_v2`;
// MiniMax-M2.7-highspeed — M2.7's reasoning_content eats 11k+ tokens and
// max_tokens=2000 leaves content="" empty. highspeed uses less reasoning,
// 2000 tokens is enough for short JSON outputs.
const MODEL = "MiniMax-M2.7-highspeed";

const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

// ========== Stage configs ==========
const isPlaceholder = (s) => !s || s.trim().length < 20 || s.includes("百科图鉴占位条目");
const stages = {
  descriptions: {
    filter: (c) => isPlaceholder(c.description) || (c.description && c.description.includes("undefined")),
    system: `你是图鉴社 (Atlas Kit) 编辑. 写中文百科卡片简介. 严格只输出 JSON object, 字段名 "text". 不要 markdown, 不要标题.`,
    user: (c) => `为「${c.title}」(类型:${c.kind}) 写一段 80-150 字简介, 中文, 2-3 句, 像维基百科概述段. 保守引用数据. 只输出 {"text": "..."}.`,
    parse: (raw) => {
      let t = raw.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").replace(/^["「『]|["」』]$/g, "").trim();
      try { return JSON.parse(t).text; } catch (e) {}
      const m = t.match(/"text"\s*:\s*"([^"]+)"/);
      if (m) return m[1];
      const m2 = t.match(/text["\s:]+(.+?)(?:"|$)/s);
      if (m2) return m2[1].trim();
      return null;
    },
    field: "description",
  },
  history: {
    filter: (c) => !c.history || !Array.isArray(c.history) || c.history.length === 0,
    system: `你是图鉴社历史编辑. 严格只输出 JSON 数组, 每条 {year, title, body}. year 用字符串, body 30-60 字.`,
    user: (c) => `为「${c.title}」(类型:${c.kind}) 写 3-5 条历史节点. JSON 数组 [{year, title, body}]. year 用 "X 年" 或 "前 X 年" 或 "X 世纪" 格式. 正序古→今. 3-5 条. 只输出 JSON 数组.`,
    parse: (raw) => {
      let t = raw.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.filter(n => n.year && n.title);
      } catch (e) {}
      const m = t.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[0]);
          if (Array.isArray(arr)) return arr.filter(n => n.year && n.title);
        } catch (e2) {}
      }
      return null;
    },
    field: "history",
  },
  sources: {
    filter: (c) => !Array.isArray(c.sources) || c.sources.length < 2 || c.sources.some(s => !s.url || s.url === "undefined"),
    system: `你是图鉴社编辑. 为每张图鉴挑 2-4 条最权威中文参考来源. 严格只输出 JSON 数组, 每条 {title, url, type}.`,
    user: (c) => `为「${c.title}」(类型:${c.kind}) 推荐 2-4 条权威中文参考来源. JSON 数组 [{title, url, type}]. type ∈ 百科/学术/博物馆/机构/新闻/其它. url 用 https:// 开头, 真实可靠不编造. 顺序: 通用百科→学术/博物馆→媒体/专题. 只输出 JSON 数组.`,
    parse: (raw) => {
      let t = raw.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.filter(s => s.title && s.url && s.url.startsWith("http"));
      } catch (e) {}
      const m = t.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[0]);
          if (Array.isArray(arr)) return arr.filter(s => s.title && s.url && s.url.startsWith("http"));
        } catch (e2) {}
      }
      return null;
    },
    field: "sources",
  },
  extras: {
    filter: (c) => !c.quote || !c.trivia || (c.quote && c.quote.includes("undefined")) || (c.trivia && c.trivia.includes("undefined")),
    system: `你是图鉴社编辑. 写中文百科条目引文与趣闻. 严格只输出 JSON object, 字段名固定 quote 和 trivia. 不要 markdown.`,
    user: (c) => `条目主题是「${c.title}」, 类型「${c.kind}」. 请写 2 段中文百科引文与小知识:\n1. quote: 与「${c.title}」相关的 1-2 句权威引文, 标注来源. 20-60 字. 引文必须真实, 严禁编造.\n2. trivia: 与「${c.title}」有关的 1 句有趣小知识. 15-40 字.\n只用 JSON {"quote": "...", "trivia": "..."} 回应, 不要其他字段, 不要 markdown, 不要代码块.`,
    parse: (raw) => {
      let t = raw.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
      try {
        const o = JSON.parse(t);
        if (o.quote || o.trivia) return o;
      } catch (e) {}
      const m = t.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const o = JSON.parse(m[0]);
          if (o.quote || o.trivia) return o;
        } catch (e2) {}
      }
      return null;
    },
    fields: ["quote", "trivia"],
  },
  tagline: {
    filter: (c) => !c.tagline || !c.tagline.trim() || c.tagline === "[object Object]",
    system: `你是图鉴社编辑. 为图鉴写一句 4-12 字中文短语标语. 严格只输出 JSON {"tagline": "..."}.`,
    user: (c) => `为「${c.title}」(类型:${c.kind}) 写一句 4-12 字标语, 简短精炼, 抓住核心特征或地位. 不用 "是" 字开头, 不用句号. 只输出 {"tagline": "..."}.`,
    parse: (raw) => {
      let t = raw.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").replace(/[。.!！,，;；]+$/g, "").trim();
      try {
        const o = JSON.parse(t);
        if (o.tagline) return { tagline: o.tagline };
      } catch (e) {}
      const m = t.match(/"tagline"\s*:\s*"([^"]+)"/);
      if (m) return { tagline: m[1] };
      return null;
    },
    field: "tagline",
  },
};

const cfg2 = stages[stage];
if (!cfg2) {
  console.error(`Unknown stage: ${stage}. Use: ${Object.keys(stages).join(", ")}`);
  process.exit(1);
}

// ========== Async mmx call (HTTP, retry-friendly) ==========
async function mmxChat(systemPrompt, userPrompt, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (i < retries - 1) {
          await sleep(2000 * (i + 1));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const j = await res.json();
      const raw = j.choices?.[0]?.message?.content || "";
      // Detect bad content: model returned JSON about the literal word "undefined"
      // or about JavaScript/ECMAScript when topic isn't a programming concept.
      // This is a known high-variance behavior of m2.7-highspeed on small topics.
      const isLikelyOffTopic = /^(undefined\s|Undefined\s|MDN\s*文档|typeof\s+undefined)/i.test(raw.trim())
        || /MDN\s*文档|MDN\s*指出|ECMA-?262|ECMAScript|JavaScript\s*中的|JavaScript\s*中,|原始值|未赋值的原始值|表示变量未赋值|表示变量尚未被赋值|变量已声明但未赋值|变量已声明但尚未赋值|未定义\s*值|原始值,?用于表示|ECMAScript\s*规范|typeof\s+undefined|Undefined\s+类型|typeof\s+运算|全局对象的属性|可被重新赋值|原始值,\s*用于|String|IE\s|在JavaScript中|在\s*JavaScript\s*中|在\s*旧版/.test(raw);
      if (isLikelyOffTopic) {
        if (i < retries - 1) {
          await sleep(1500 * (i + 1));
          continue;
        }
        return { ok: false, raw, err: "off-topic content (model returned 'undefined' answers)" };
      }
      const parsed = cfg2.parse(raw);
      if (parsed !== null && parsed !== undefined) {
        if (cfg2.fields && typeof parsed === "object") {
          // extras: return object {quote, trivia}
          return { ok: true, value: parsed };
        }
        return { ok: true, value: parsed };
      }
      if (i < retries - 1) {
        await sleep(1500 * (i + 1));
        continue;
      }
      return { ok: false, raw, err: "parse failed" };
    } catch (e) {
      if (i < retries - 1) {
        await sleep(2000 * (i + 1));
        continue;
      }
      return { ok: false, err: e.message };
    }
  }
}

function sleep(ms) {
  const sab = new SharedArrayBuffer(4);
  const i32 = new Int32Array(sab);
  Atomics.wait(i32, 0, 0, ms);
}

// ========== Worker: process one shard ==========
async function processShard(shard, workerId) {
  const workerCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  let success = 0, fail = 0;

  // Process in batches of 2 concurrent (m2.7-highspeed rate limits under burst)
  const batchSize = 2;
  for (let i = 0; i < shard.length; i += batchSize) {
    const batch = shard.slice(i, i + batchSize);
    const promises = batch.map(async (slug) => {
      const c = workerCards.find((x) => x.slug === slug);
      if (!c) return;
      const result = await mmxChat(cfg2.system, cfg2.user(c));
      if (!result.ok) {
        console.log(`[w${workerId}] FAIL ${slug}: ${result.err?.slice(0, 80) || "parse"}`);
        fail++;
        return;
      }
      if (cfg2.fields) {
        for (const f of cfg2.fields) {
          if (result.value[f]) {
            const newVal = String(result.value[f]).trim();
            const isWorkerValueBad = /MDN|ECMAScript|JavaScript|typeof\s+undefined|未赋值的原始值|原始值,?用于表示|未定义\s*值|在JavaScript中|在\s*旧版|全局对象的属性/.test(newVal);
            const isExistingBad = !c[f] || !c[f].trim() || String(c[f]).includes("undefined") || isWorkerValueBad;
            if (isExistingBad) c[f] = newVal;
          }
        }
      } else if (cfg2.field) {
        // parse() may return a string OR an object like {tagline: "..."}
        // (for stages that wrap their value to be consistent with extras).
        const v = (typeof result.value === "object" && result.value !== null)
          ? result.value[cfg2.field]
          : result.value;
        c[cfg2.field] = String(v || "").trim();
      }
      success++;
    });
    await Promise.all(promises);
  }

  // Write worker copy
  const wp = path.join(TMP, `cards.worker-${workerId}.json`);
  fs.writeFileSync(wp, JSON.stringify(workerCards, null, 2) + "\n", "utf8");
  return { success, fail };
}

// ========== Main ==========
const targets = cards.filter(cfg2.filter).map((c) => c.slug).slice(0, limit);
console.log(`Stage: ${stage}, workers: ${workers}, targets: ${targets.length}`);

if (dryRun) {
  console.log(`First 5: ${targets.slice(0, 5).join(", ")}`);
  process.exit(0);
}

if (targets.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

// Round-robin shards
const shards = Array.from({ length: workers }, () => []);
targets.forEach((s, i) => shards[i % workers].push(s));
shards.forEach((s, i) => console.log(`  worker-${i}: ${s.length} cards`));

(async () => {
  const t0 = Date.now();
  const results = await Promise.all(shards.map((s, i) => processShard(s, i)));
  console.log(`\nAll workers done in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min`);
  results.forEach((r, i) => console.log(`  worker-${i}: ${r.success} ok, ${r.fail} fail`));

  // Merge all worker cards.worker-N.json → data/cards.json
  const finalCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  const finalBySlug = new Map(finalCards.map((c) => [c.slug, c]));
  for (let w = 0; w < workers; w++) {
    const wp = path.join(TMP, `cards.worker-${w}.json`);
    if (!fs.existsSync(wp)) continue;
    const wCards = JSON.parse(fs.readFileSync(wp, "utf8"));
    const isBadValue = (v, field) => {
      if (!v || !String(v).trim()) return true;
      const s = String(v);
      if (s.includes("undefined")) return true;
      if (field === "tagline" && v === "[object Object]") return true;
      if (field === "description" && isPlaceholder(v)) return true;
      // also flag JS/ECMAScript off-topic content for quote/trivia/sources
      if ((field === "quote" || field === "trivia" || field === "sources" || field === "title")
        && /MDN|ECMAScript|JavaScript|typeof\s+undefined|未赋值的原始值|原始值,?用于表示|未定义\s*值|在JavaScript中|在\s*旧版|全局对象的属性/.test(s)) {
        return true;
      }
      return false;
    };
    for (const wc of wCards) {
      const fc = finalBySlug.get(wc.slug);
      if (!fc) continue;
      if (cfg2.fields) {
        for (const f of cfg2.fields) {
          if (wc[f] && isBadValue(fc[f], f)) fc[f] = wc[f];
        }
      } else if (cfg2.field) {
        if (wc[cfg2.field] && isBadValue(fc[cfg2.field], cfg2.field)) {
          fc[cfg2.field] = wc[cfg2.field];
        }
      }
    }
  }
  fs.writeFileSync(CARDS_JSON, JSON.stringify([...finalBySlug.values()], null, 2) + "\n", "utf8");
  console.log(`Merged ${finalBySlug.size} cards into ${CARDS_JSON}`);

  const after = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  console.log(`\nFinal stats:`);
  if (stage === "descriptions") {
    console.log(`  placeholder: ${after.filter((c) => c.description?.includes("百科图鉴占位条目")).length}`);
  } else if (stage === "history") {
    console.log(`  no history: ${after.filter((c) => !c.history || c.history.length === 0).length}`);
  } else if (stage === "sources") {
    console.log(`  no sources: ${after.filter((c) => !Array.isArray(c.sources) || c.sources.length < 2).length}`);
  } else if (stage === "extras") {
    console.log(`  no quote: ${after.filter((c) => !c.quote || !c.quote.trim()).length}`);
    console.log(`  no trivia: ${after.filter((c) => !c.trivia || !c.trivia.trim()).length}`);
  } else if (stage === "tagline") {
    console.log(`  no tagline: ${after.filter((c) => !c.tagline || !c.tagline.trim()).length}`);
  }
})();