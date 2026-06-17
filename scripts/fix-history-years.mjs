#!/usr/bin/env node
/**
 * R36 (2026-06-17): fix-history-years.mjs
 *
 * 修历史时间轴的 "X" 占位 year. drafter 指令是:
 *   "year 用 'X 年' 或 '前 X 年' 或 'X 世纪' 格式"
 * AI 遇到年代不精确的题材 (古代人物/远古祭祀/古老物种) 就塞
 * "X" 当占位, body 字段其实有真实年代 ("19世纪末" / "周代" /
 * "新石器时代晚期"), 只是没填到 year 字段.
 *
 * 修法: regex 提 body 第一个中文年代标记, 替换 X.
 * 提不到 (如 body 只说 "少年时期" 没具体年代) → "年代不详".
 *
 * 用法:
 *   node scripts/fix-history-years.mjs            # dry-run, 打计划
 *   node scripts/fix-history-years.mjs --apply    # 实际写 cards.json
 *
 * 幂等: 第二次跑 X 都已被替换, no-op. 任意非 "X" year 跳过.
 *
 * 影响范围: 17 张卡 / 109 条 history entries. 见 tmp/ 备份可选.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const CARDS_PATH = path.join(ROOT, "data", "cards.json");
const apply = process.argv.includes("--apply");

// 顺序: 长 → 短 (regex 从左到右, 第一个 alternative 匹配优先).
// 例 "西周" 在 "周" 之前 → 优先匹配 "西周".
// 朝代用 "代/朝" 后缀, 避免裸 "周/汉" 误匹配 (如 "周天子").
// 数字与中文单位之间允许 \s* (空格/Tab), 兼容 "20 世纪" /
// "20世纪" 两种写法. 没有 \s* 时, 空格会切碎 regex, 让
// "60年" 误匹配 "20 世纪 60 年代" 这种 body.
const ERA_RE = new RegExp(
  "(" +
    [
      // 远古时代 (新/旧石器)
      "新石器\\s*时代(?:晚期|中期|早期|末期)?",
      "旧石器\\s*时代(?:晚期|中期|早期|末期)?",
      // 公元前
      "公元前\\s*\\d+\\s*年?",
      // 朝代细化 (双向)
      "西周|东周|西汉|东汉|西晋|东晋|北宋|南宋|西魏|东魏|西夏|北魏|南朝|北朝|五代|十国|辽金|元末|明初|明末|清初|清末",
      // 时期 (长)
      "上古\\s*时期|远古\\s*时期|先秦\\s*时期|春秋\\s*时期|战国\\s*时期|秦汉\\s*时期|魏晋\\s*时期|南北朝\\s*时期|隋唐\\s*时期|宋元\\s*时期|明清\\s*时期",
      // 时期 (短)
      "上古|远古|先秦|春秋|战国|秦汉|魏晋|南北朝|隋唐|宋元|明清",
      // 时期 (通用, "少年时期" 之类不靠这个, 不会单独命中)
      "近代|现代|当代",
      // 标准朝代
      "周代|秦代|汉代|唐代|宋代|元代|明代|清代|周朝|秦朝|汉朝|唐朝|宋朝|元朝|明朝|清朝",
      // 世纪 (允许 "20 世纪" / "20世纪" / "20  世纪")
      "\\d{1,2}\\s*世纪(?:末|初|中|晚期)?",
      // 年代 (同上)
      "\\d{1,2}\\s*年代(?:末|初|中)?",
      // 公历年 (1-4 位数字 + 年, 可选月)
      "\\d{1,4}\\s*年(?:\\d{1,2}\\s*月)?",
    ].join("|") +
    ")",
  "g"
);

/**
 * 从 body 提取第一个中文年代标记. 返回标准化字符串 (去除多余空格).
 * 没找到返回 null.
 */
function extractYear(body) {
  if (!body) return null;
  // 全局匹配, 取第一个. match 本身在 /g 模式下是迭代器, 但
  // exec() 在 /g 模式下也是迭代器. 用 matchAll 拿第一个.
  ERA_RE.lastIndex = 0;
  const m = ERA_RE.exec(body);
  if (!m) return null;
  const raw = m[1];
  // 标准化: 压缩内部空白 (e.g. "1854 年" → "1854年")
  return raw.replace(/\s+/g, "");
}

const cards = JSON.parse(fs.readFileSync(CARDS_PATH, "utf8"));

let totalFixed = 0;
let totalUnknown = 0;
let totalSkipped = 0;
const log = [];

for (const card of cards) {
  if (!card.history) continue;
  for (const node of card.history) {
    if (node.year !== "X") {
      totalSkipped++;
      continue;
    }
    const extracted = extractYear(node.body ?? "");
    const newYear = extracted ?? "年代不详";
    if (extracted) {
      totalFixed++;
    } else {
      totalUnknown++;
    }
    log.push({
      slug: card.slug,
      title: card.title,
      from: node.year,
      to: newYear,
      bodyPreview: (node.body ?? "").slice(0, 60),
    });
  }
}

console.log(
  `${apply ? "APPLY" : "DRY-RUN"} mode. ${apply ? "Writing cards.json..." : "Re-run with --apply to write."}`,
);
console.log("---");
console.log(`Extracted from body: ${totalFixed}`);
console.log(`Marked 年代不详:    ${totalUnknown}`);
console.log(`Skipped (non-X):    ${totalSkipped}`);
console.log("---");
log.forEach((l) => {
  const tag = l.to === "年代不详" ? "[?]" : "[+]";
  console.log(`${tag} [${l.title}] ${l.from} → ${l.to}`);
  console.log(`     ${l.bodyPreview}${l.bodyPreview.length >= 60 ? "…" : ""}`);
});

if (apply) {
  // Apply to the actual history nodes
  for (const card of cards) {
    if (!card.history) continue;
    for (const node of card.history) {
      if (node.year !== "X") continue;
      const extracted = extractYear(node.body ?? "");
      node.year = extracted ?? "年代不详";
    }
  }
  fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n");
  console.log("---");
  console.log(`Written ${CARDS_PATH}`);
} else {
  console.log("---");
  console.log("No changes written. Use --apply to commit.");
}
