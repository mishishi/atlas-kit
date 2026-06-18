#!/usr/bin/env node
// scripts/regen-3tier.mjs
//
// 从 <slug>-card.png 派生 -thumb.webp (384w) + -full.webp (1024w q90)。
// 单张 (--kind X --slug Y) 或批量 (--all)。
//
// 跟 reencode-full-webp.mjs 的关系: 那个是"60 张批量迁移 PNG→WebP
// 的一次性脚本" (R28 verification,假设源都是 -full.png)。
// 这个是日常用的 per-card 工具,wizard / generate-card.mjs 跑完
// -card.png 后调用,生成 3-tier 静态资源。
//
// 用法:
//   node scripts/regen-3tier.mjs --kind architecture --slug potala-palace
//   node scripts/regen-3tier.mjs --all
//   node scripts/regen-3tier.mjs --all --force   (覆盖已有 thumb/full)

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const kind = (args.includes("--kind") ? args[args.indexOf("--kind") + 1] : null);
const slug = (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null);
const all = args.includes("--all");
const force = args.includes("--force");

const CARDS_DIR = path.resolve("public/cards");
const CARDS_JSON = path.resolve("data/cards.json");

const THUMB_WIDTH = 384;
const FULL_WIDTH = 1024;
const WEBP_QUALITY = 90;

const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

let targets = [];
if (all) {
  targets = cards;
} else if (kind && slug) {
  const c = cards.find((x) => x.kind === kind && x.slug === slug);
  if (!c) {
    console.error(`Card not found: ${kind}/${slug}`);
    process.exit(1);
  }
  targets = [c];
} else {
  console.error("Usage:");
  console.error("  node scripts/regen-3tier.mjs --kind X --slug Y");
  console.error("  node scripts/regen-3tier.mjs --all");
  console.error("  (add --force to overwrite existing thumb/full)");
  process.exit(1);
}

let ok = 0, skip = 0, fail = 0;
let updated = false;

for (const c of targets) {
  if (!c.image) continue;
  // "/cards/architecture/potala-palace/potala-palace-card.png"
  // → "architecture/potala-palace/potala-palace-card.png"
  const rel = c.image.replace(/^\/cards\//, "");
  const base = rel.replace(/-card\.png$/, "");
  const cardPath = path.join(CARDS_DIR, rel);
  const thumbPath = path.join(CARDS_DIR, `${base}-thumb.webp`);
  const fullPath = path.join(CARDS_DIR, `${base}-full.webp`);

  if (!fs.existsSync(cardPath)) {
    console.log(`  SKIP ${base}: -card.png not found at ${rel}`);
    skip++;
    continue;
  }

  for (const [outPath, width, tier] of [
    [thumbPath, THUMB_WIDTH, "thumb"],
    [fullPath, FULL_WIDTH, "full"],
  ]) {
    if (fs.existsSync(outPath) && !force) {
      skip++;
      continue;
    }
    try {
      const srcSize = fs.statSync(cardPath).size;
      await sharp(cardPath)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toFile(outPath);
      const dstSize = fs.statSync(outPath).size;
      const ratio = ((1 - dstSize / srcSize) * 100).toFixed(0);
      const arrow = dstSize <= srcSize ? "↓" : "≈";
      console.log(
        `  ${base} (${tier} ${width}w): ` +
          `${(srcSize / 1024).toFixed(0)}kB ${arrow} ${(dstSize / 1024).toFixed(0)}kB (-${ratio}%)`,
      );
      ok++;
    } catch (e) {
      console.log(`  ERR ${base} (${tier}): ${e.message}`);
      fail++;
    }
  }

  // 更新 cards.json (thumb / full 路径)
  const newThumb = `/cards/${base}-thumb.webp`;
  const newFull = `/cards/${base}-full.webp`;
  if (c.image_thumb !== newThumb) { c.image_thumb = newThumb; updated = true; }
  if (c.image_full !== newFull) { c.image_full = newFull; updated = true; }
}

if (updated) {
  fs.writeFileSync(CARDS_JSON, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`\nUpdated ${cards.length} card entries in cards.json (image_thumb / image_full).`);
}

console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail}`);
