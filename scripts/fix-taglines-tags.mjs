#!/usr/bin/env node
/**
 * Fix tagline + backfill tags for cards missing/short on either field.
 * R59-R60+35 batches added 200+ cards but skipped tagline (visible in all
 * card previews) and some had < 4 tags (reduces search / related-score).
 *
 * Strategy: mmx text chat per-card for tagline, then per-card for tags.
 * Both are single-call (no batching) because the prompt needs full card context.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const TAGLINE_SYSTEM = `你是图鉴社 (Atlas Kit) 的编辑, 专门为图鉴卡写一句话 tagline.
- 中文, 15-30 字, 一句话
- 短而有钩子: 不直白说"这是 X", 而是说 X 的某个有趣属性 / 反差 / 隐藏维度
- 像博物馆展签的引言, 像书的副标题
- 不堆砌形容词, 不抒情
- 只输出 tagline 本身, 不要引号, 不要前缀`;

const TAGS_SYSTEM = `你是图鉴社 (Atlas Kit) 的标签编辑, 专门为图鉴卡补跨切分类标签.
- 输出 JSON 数组, 5-7 个标签
- 优先用以下跨切分类轴:
  · 地域 (中国 / 日本 / 欧洲 / 印度 / 中东 / 东南亚 / 美洲 / 非洲 / 海洋 / 全球)
  · 时代 (古代 / 近代 / 现代 / 当代)
  · 文化圈 (东亚 / 西方 / 伊斯兰 / 印度 / 拉美 / 非洲)
  · 主题 (哺乳 / 节肢 / 鸟 / 鱼 / 昆虫 / 植物 / 矿石 / 化学 / 物理 / 数学 / 医学 / 工程 / 艺术 / 音乐 / 文学 / 历史 / 地理 / 政治 / 商业 / 体育 / 哲学 / 宗教 / 教育)
  · 跨切属性 (古代 / 近代 / 现代 / 当代 / 自然 / 文化 / 工艺 / 科学 / 流行 / 民俗)
- 已有标签不要重复
- 只输出 JSON 数组, 不要 markdown, 不要解释`;

function callMmx(prompt, system) {
  const isWin = process.platform === "win32";
  const mmxPath = isWin ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1" : "mmx";
  const args = ["text", "chat", "--non-interactive", "--quiet", "--message", prompt, "--system", system];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...args],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 },
    );
  }
  return execFileSync(mmxPath, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 90_000 });
}

function extractArray(text) {
  let s = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
  const m = s.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ===== Tagline pass =====
const noTagline = cards.filter((c) => !c.tagline);
console.log(`Will draft tagline for ${noTagline.length} cards.`);

let tOk = 0, tFail = 0;
for (let i = 0; i < noTagline.length; i++) {
  const c = noTagline[i];
  process.stdout.write(`[tagline ${i + 1}/${noTagline.length}] ${c.title} ... `);
  try {
    const prompt = `为「${c.title}」(类型:${c.kind}, 描述: ${(c.description || "").slice(0, 80)}) 写一句 15-30 字的中文 tagline.`;
    const out = callMmx(prompt, TAGLINE_SYSTEM).trim();
    let body = out.replace(/^["「『]|["」』]$/g, "").trim();
    if (body.length < 8 || body.length > 60) {
      console.log(`FAIL: length ${body.length}`);
      tFail++;
      continue;
    }
    c.tagline = body;
    tOk++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK "${body.slice(0, 30)}"`);
  } catch (e) {
    tFail++;
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
  }
}
console.log(`\nTagline done: success=${tOk} fail=${tFail}`);

// ===== Tags pass =====
const shortTags = cards.filter((c) => !c.tags || c.tags.length < 4);
console.log(`\nWill backfill tags for ${shortTags.length} cards.`);

let gOk = 0, gFail = 0;
for (let i = 0; i < shortTags.length; i++) {
  const c = shortTags[i];
  process.stdout.write(`[tags ${i + 1}/${shortTags.length}] ${c.title} ... `);
  try {
    const prompt = `为「${c.title}」(类型:${c.kind}, 已有标签: [${(c.tags || []).join(",")}]) 推荐 5-7 个跨切分类标签.`;
    const out = callMmx(prompt, TAGS_SYSTEM);
    const arr = extractArray(out);
    if (!arr || !Array.isArray(arr) || arr.length < 3) {
      console.log(`FAIL: parse (got ${arr?.length || 0})`);
      gFail++;
      continue;
    }
    // Merge with existing tags, dedup, cap at 10
    const merged = [...new Set([...(c.tags || []), ...arr.map((s) => String(s).trim()).filter(Boolean)])].slice(0, 10);
    c.tags = merged;
    gOk++;
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
    console.log(`OK (${merged.length} tags)`);
  } catch (e) {
    gFail++;
    console.log(`ERR: ${e.message?.slice(0, 80) ?? e}`);
  }
}
console.log(`\nTags done: success=${gOk} fail=${gFail}`);