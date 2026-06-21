#!/usr/bin/env node
// scripts/patch-missing-cards.mjs
//
// 给已有 -card.png 但 cards.json 缺 entry 的卡片补 placeholder metadata。
// 不重跑 matrix、不动现有图片。
//
// 用法:
//   node scripts/patch-missing-cards.mjs                  # 扫当前 worktree
//   node scripts/patch-missing-cards.mjs --csv tmp/r36-batch-3.csv
//   node scripts/patch-missing-cards.mjs --dry-run
//
// 行为:
//   1. 读 csv (默认扫描所有 kind/<slug>/*-card.png)
//   2. 对每个有 image 但 cards.json 没 entry 的 slug:
//      - 添加 placeholder entry (subtitle = "X · Y · 百科占位", description 占位)
//      - image 字段指向 /cards/<kind>/<slug>/<slug>-card.png
//   3. 写回 cards.json

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const hasFlag = (n) => args.includes(n);
const dryRun = hasFlag("--dry-run");
const csvArg = getArg("--csv");

const ROOT = process.cwd();
const CARDS_DIR = path.join(ROOT, "public", "cards");
const CARDS_JSON = path.join(ROOT, "data", "cards.json");

// R32: 中文 kind display name (跟 generate-card.mjs KIND_DISPLAY 对齐)
const KIND_DISPLAY = {
  pet: "宠物",
  animal: "动物",
  plant: "植物",
  city: "城市",
  festival: "节日",
  food: "食物",
  phenomenon: "自然现象",
  history: "历史事件",
  object: "器物",
  person: "人物",
  tech: "科技概念",
  other: "其他",
  architecture: "建筑",
  artwork: "艺术品",
  book: "书籍",
  "chemical-element": "化学元素",
  country: "国家",
  disease: "疾病",
  movie: "电影",
  mythology: "神话",
  profession: "职业",
  "space-object": "天体",
  sport: "体育运动",
  vehicle: "交通工具",
};

function loadCategoryIdentity(kind) {
  const p = path.join(ROOT, "prompt-template", "categories", `${kind}.md`);
  if (!fs.existsSync(p)) return null;
  const content = fs.readFileSync(p, "utf8");
  const m = content.match(/## Identity\n+([\s\S]+?)(?=\n##|$)/);
  if (!m) return null;
  const first = m[1]
    .trim()
    .split("\n")
    .find((l) => l.trim().startsWith("*"));
  return first ? first.replace(/^\*\s*/, "").trim() : null;
}

// 1. 收集 candidate slugs
let candidates = [];
if (csvArg) {
  // 优先用 csv (与 R36 batch 工作流一致)
  const lines = fs.readFileSync(csvArg, "utf8").split("\n").filter((l) => l.trim());
  lines.shift(); // skip header
  for (const line of lines) {
    const [topic, kind, slug] = line.split(",").map((x) => x.trim());
    if (topic && kind && slug) candidates.push({ topic, kind, slug });
  }
} else {
  // fallback: 扫 public/cards 下所有 -card.png
  const kinds = fs.readdirSync(CARDS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const kind of kinds) {
    const kindDir = path.join(CARDS_DIR, kind);
    const slugs = fs.readdirSync(kindDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const slug of slugs) {
      const cardPng = path.join(kindDir, slug, `${slug}-card.png`);
      if (fs.existsSync(cardPng)) candidates.push({ topic: slug, kind, slug });
    }
  }
}

// 2. 读 cards.json
const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
const existingSlugs = new Set(cards.map((c) => c.slug));

// 3. series No helper (R36: 新卡默认归 craft-and-botanical,系列内下一个号)
const seriesCount = {};
for (const c of cards) seriesCount[c.series] = (seriesCount[c.series] || 0) + 1;
function nextSeriesNo(series) {
  const next = (seriesCount[series] || 0) + 1;
  seriesCount[series] = next;
  return String(next).padStart(3, "0");
}

let added = 0, skippedExisting = 0, skippedNoImage = 0;
const patchLog = [];

for (const { topic, kind, slug } of candidates) {
  if (existingSlugs.has(slug)) {
    skippedExisting++;
    continue;
  }
  const cardDir = path.join(CARDS_DIR, kind, slug);
  const cardPng = path.join(cardDir, `${slug}-card.png`);
  if (!fs.existsSync(cardPng)) {
    skippedNoImage++;
    patchLog.push(`SKIP ${kind}/${slug}: no -card.png on disk`);
    continue;
  }
  const kindDisplay = KIND_DISPLAY[kind] || kind;
  const identityEn = loadCategoryIdentity(kind);
  const subtitle = `${kindDisplay} · ${topic} · 百科占位`;
  const description =
    `${topic} 是 Atlas Kit 图鉴社「${kindDisplay}」分类下的百科图鉴占位条目` +
    (identityEn ? ` (category identity: ${identityEn})` : "") +
    `。完整描述 / 历史沿革 / 参考来源 / 评分 / 视觉等字段由 AI 内容补全脚本 (draft-history / draft-sources / add-cross-tags / enrich-mentions / score-all-cards) 后续批量填充,无需人工写占位文案。`;

  const series = "craft-and-botanical";
  cards.push({
    slug,
    title: topic,
    kind,
    series,
    seriesNo: nextSeriesNo(series),
    palette: ["#F5F0E6", "#B88952", "#8C7F6E"],
    image: `/cards/${kind}/${slug}/${slug}-card.png`,
    image_thumb: `/cards/${kind}/${slug}/${slug}-thumb.webp`,
    image_full: `/cards/${kind}/${slug}/${slug}-full.webp`,
    score: 0,
    tags: [],
    tagline: "",
    subtitle,
    description,
    createdAt: new Date().toISOString().split("T")[0],
  });
  added++;
  patchLog.push(`+ ADD ${kind}/${slug} (${topic})`);
}

console.log(`Patch report:`);
console.log(`  candidates scanned: ${candidates.length}`);
console.log(`  added:              ${added}`);
console.log(`  skipped (existing): ${skippedExisting}`);
console.log(`  skipped (no image): ${skippedNoImage}`);
if (patchLog.length) {
  console.log(`\nDetail:`);
  patchLog.forEach((l) => console.log(`  ${l}`));
}

if (added > 0 && !dryRun) {
  fs.writeFileSync(CARDS_JSON, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${CARDS_JSON} (${cards.length} cards total, +${added})`);
} else if (dryRun) {
  console.log(`\n[DRY-RUN] No file written.`);
}