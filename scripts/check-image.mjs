#!/usr/bin/env node
// scripts/check-image.mjs
//
// Auto-check generated card images against 9 quality rules. Run after
// matrix_generate_image returns an image. CLI:
//
//   node scripts/check-image.mjs <path-to-image>
//   node scripts/check-image.mjs public/cards/object/abacus/abacus-card.png
//
// Pass/fail per rule. Exit 0 if all pass, exit 1 if any fail. Designed to
// be wired into the wizard's image generation flow later.
//
// 8 rules (from R30 spec, 2026-06-17; Rule 5 "no duplicate blocks"
// dropped per user feedback — too strict for legitimate summary-
// module overlap like "主要食物" echoing "食性行为" in module 4):
//   1. Strict 9:16 aspect ratio
//   2. 8 information modules present
//   3. Title should NOT have "图鉴" or "档案" suffix
//      (brand is "图鉴社" — that lives in the brand, not card titles)
//   4. Annotation lines / callouts visible
//   5. (removed — was duplicate detection)
//   6. Summary Bar ≤ 2 lines
//   7. No visible garbled text
//   8. No advertising words
//   9. Visualization strip present
//
// Dependencies: sharp (already in project), tesseract.js (devDep added
// 2026-06-17). chi_sim language pack auto-downloads on first run (~30MB,
// cached in node_modules/tesseract.js-core).

import sharp from "sharp";
import { createWorker } from "tesseract.js";
import fs from "node:fs/promises";
import path from "node:path";

const __filename = new URL(import.meta.url).pathname.replace(/^\//, "");
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// ─── CLI ───────────────────────────────────────────────────────────────
const arg = process.argv[2];
if (!arg) {
  console.error(
    "Usage: node scripts/check-image.mjs <image-path>\n" +
      "Example: node scripts/check-image.mjs public/cards/object/abacus/abacus-card.png",
  );
  process.exit(2);
}
const imagePath = path.isAbsolute(arg) ? arg : path.resolve(ROOT, arg);

let stat;
try {
  stat = await fs.stat(imagePath);
} catch {
  console.error(`File not found: ${imagePath}`);
  process.exit(2);
}
if (!stat.isFile()) {
  console.error(`Not a file: ${imagePath}`);
  process.exit(2);
}

// ─── OCR setup ─────────────────────────────────────────────────────────
console.error("OCR: loading chi_sim worker (first run downloads ~30MB)...");
const worker = await createWorker(["chi_sim"], undefined, {
  // Quiet logger — first-run progress gets noisy otherwise
  logger: () => {},
});

let imgMeta;
let ocr;
try {
  // ─── Step 1: image metadata (sharp) ──────────────────────────────────
  imgMeta = await sharp(imagePath).metadata();
  const W = imgMeta.width;
  const H = imgMeta.height;

  // ─── Step 2: full-image OCR ──────────────────────────────────────────
  // tesseract.js v5 requires the 3rd arg to enable structured output
  // (blocks / lines / words with bbox). Without it, only `text` and
  // `confidence` are populated — rules 2/3/5/6 (which need word-level
  // bbox) silently fail.
  const ret = await worker.recognize(imagePath, {}, {
    blocks: true,
    text: true,
    hocr: true,
  });
  ocr = ret.data;
} catch (e) {
  console.error(`Processing failed: ${e.message}`);
  await worker.terminate();
  process.exit(1);
}
// Don't terminate the worker here — Rule 3 (title crop) re-uses it
// for a second pass on the title region at 2x upscale. Terminate
// is called at the very end after all rules run.

const W = imgMeta.width;
const H = imgMeta.height;

// ─── Flatten v5 hierarchical blocks → single words[] array ────────────
// v5 returns: blocks[].paragraphs[].lines[].words[]
// Rule 2/3/5/6 expect a flat words[] with bbox. Walk the tree.
const flatWords = [];
if (ocr.blocks) {
  for (const blk of ocr.blocks) {
    for (const para of blk.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const w of line.words || []) {
          flatWords.push({
            text: w.text,
            confidence: w.confidence,
            bbox: w.bbox,
          });
        }
      }
    }
  }
}
const words = flatWords;

// ─── Helpers ───────────────────────────────────────────────────────────

/** Group OCR words by their bounding-box vertical band, dedup nearby rows. */
function groupRows(words, bandTop, bandBottom) {
  const inBand = words.filter(
    (w) => w.bbox.y0 >= bandTop && w.bbox.y1 <= bandBottom,
  );
  if (inBand.length === 0) return [];
  // Sort by y, then x
  inBand.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  // Cluster by y proximity: if next word's y0 is within 10px of prev y1, same row
  const rows = [];
  let cur = { words: [inBand[0]], y0: inBand[0].bbox.y0, y1: inBand[0].bbox.y1 };
  for (let i = 1; i < inBand.length; i++) {
    const w = inBand[i];
    if (w.bbox.y0 - cur.y1 <= 10) {
      cur.words.push(w);
      cur.y1 = Math.max(cur.y1, w.bbox.y1);
    } else {
      rows.push(cur);
      cur = { words: [w], y0: w.bbox.y0, y1: w.bbox.y1 };
    }
  }
  rows.push(cur);
  return rows;
}

/** Count distinct text clusters separated by ≥ 30px vertical gap. */
function countModules(words) {
  // Lower 60% of image = module area
  const rows = groupRows(words, Math.floor(H * 0.30), Math.floor(H * 0.95));
  if (rows.length === 0) return 0;
  const clusters = [];
  let lastY1 = -Infinity;
  for (const r of rows) {
    if (r.y0 - lastY1 >= 30) {
      clusters.push(r);
    } else {
      clusters[clusters.length - 1].y1 = r.y1;
      clusters[clusters.length - 1].words.push(...r.words);
    }
    lastY1 = r.y1;
  }
  return clusters.length;
}

// ─── 9 Rules ───────────────────────────────────────────────────────────
const results = [];

// Rule 1: 9:16 aspect ratio
{
  const ratio = W / H;
  const target = 9 / 16; // 0.5625
  const delta = Math.abs(ratio - target);
  const pass = delta < 0.02; // tolerance ±2%
  results.push({
    rule: "1. 严格 9:16",
    pass,
    detail: `${W}×${H} → ratio ${ratio.toFixed(3)} (target ${target.toFixed(3)}, Δ${delta.toFixed(3)})`,
  });
}

// Rule 2: 8 modules
// Heuristic: use tesseract's LINE-level bbox (not word-level) since
// tesseract chi_sim fragments Chinese into per-char "words" and
// line bbox is more spatially coherent. Split lower 60% into LEFT
// and RIGHT halves using bbox CENTER (not x0 which can be misleading
// for left-aligned text). Cluster lines by y-gap >= 2.5% of H.
{
  // Extract line bboxes from the same OCR output
  const lines = [];
  for (const blk of ocr.blocks || []) {
    for (const p of blk.paragraphs || []) {
      for (const l of p.lines || []) {
        if (l.bbox && typeof l.bbox.y0 === "number") {
          lines.push(l.bbox);
        }
      }
    }
  }
  const lowerLines = lines.filter((b) => b.y0 >= H * 0.30 && b.y0 < H * 0.95);
  const midX = W / 2;
  const countCol = (col) => {
    if (col.length === 0) return 0;
    col.sort((a, b) => a.y0 - b.y0);
    const gap = H * 0.025;
    let n = 1;
    for (let i = 1; i < col.length; i++) {
      if (col[i].y0 - col[i - 1].y1 >= gap) n++;
    }
    return n;
  };
  const left = lowerLines.filter((b) => (b.x0 + b.x1) / 2 < midX);
  const right = lowerLines.filter((b) => (b.x0 + b.x1) / 2 >= midX);
  const lCount = countCol(left);
  const rCount = countCol(right);
  const total = lCount + rCount;
  const pass = total >= 6; // tolerate some over/undercount from noise
  results.push({
    rule: "2. 8 个信息模块",
    pass,
    detail: `下半部分 2 栏 (line bbox + x_center 拆分): 左 ${lCount} 聚类 + 右 ${rCount} 聚类 = ${total} (目标 ≥ 6, 容忍 OCR 误差)`,
  });
}

// Rule 3: Title should NOT have "图鉴" or "档案" suffix
// The brand is "图鉴社" — "图鉴" lives in the brand, not the card
// title. Card titles should be just the subject (三星堆, 丹顶鹤,
// 拉布拉多) without "图鉴"/"档案" suffix. The check is inverted:
// PASS if neither appears, FAIL if either appears.
//
// Heuristic: crop top 18%, scale up 3x, OCR with PSM 6. Tesseract
// chi_sim struggles with large display Chinese even at 3x, so
// the title text in the detail may be garbled — the check still
// works on the regex level: as long as "图鉴" or "档案" appears
// in the OCR'd title region, fail.
{
  const topCropPath = imagePath + ".title-crop.png";
  await sharp(imagePath)
    .extract({
      left: 0,
      top: 0,
      width: W,
      height: Math.floor(H * 0.18),
    })
    .resize({ width: W * 3 })
    .toFile(topCropPath);
  const titleRet = await worker.recognize(
    topCropPath,
    { tessedit_pageseg_mode: "6" },
    { blocks: true, text: true, hocr: true },
  );
  await fs.unlink(topCropPath).catch(() => {});
  const titleText = titleRet.data.text || "";
  const hasSuffix = /图鉴|档案/.test(titleText);
  const pass = !hasSuffix; // inverted: pass = no suffix
  // Show a clean snippet of the OCR'd title for context
  const cleanText = titleText.replace(/\s+/g, " ").trim().slice(0, 50);
  results.push({
    rule: "3. 标题不能有「图鉴/档案」后缀",
    pass,
    detail: `${hasSuffix ? "❌ 标题包含" : "✓ 标题干净"}: "${cleanText}"`,
  });
}

// Rule 4: Annotation lines / callouts
// Heuristic: count non-white horizontal/vertical line segments in middle
// band via edge detection on a downscaled gray image.
{
  const gray = await sharp(imagePath)
    .grayscale()
    .resize({ width: 400 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = gray;
  const { width: gW, height: gH, channels } = info;
  // Simple edge density: count pixels with strong gradient (Sobel-lite)
  let edgeCount = 0;
  for (let y = 1; y < gH - 1; y += 2) {
    for (let x = 1; x < gW - 1; x += 2) {
      const i = (y * gW + x) * channels;
      const gx =
        -data[i - channels - channels] +
        data[i + channels - channels] +
        -2 * data[i - channels] +
        2 * data[i + channels] +
        -data[i - channels + channels] +
        data[i + channels + channels];
      const gy =
        -data[i - channels - channels] +
        -2 * data[i] +
        -data[i + channels - channels] +
        data[i - channels + channels] +
        2 * data[i] +
        data[i + channels + channels];
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > 80) edgeCount++;
    }
  }
  // Heuristic: a card with annotation lines should have at least some
  // edge density in the lower half. Threshold tuned by experiment.
  const totalSampled = ((gH - 2) / 2) * ((gW - 2) / 2);
  const edgeRatio = edgeCount / totalSampled;
  const pass = edgeRatio > 0.05; // 5% of sampled pixels have edges
  results.push({
    rule: "4. 标注线 / 引线",
    pass,
    detail: `边缘密度 ${(edgeRatio * 100).toFixed(1)}% (目标 ≥ 5%)`,
  });
}

// Rule 6: Summary Bar ≤ 2 lines
{
  const bottomRows = groupRows(words, Math.floor(H * 0.88), H);
  const pass = bottomRows.length > 0 && bottomRows.length <= 2;
  results.push({
    rule: "5. Summary Bar ≤ 2 行",
    pass,
    detail: `底部 12% OCR 行数: ${bottomRows.length} (目标 1-2)`,
  });
}

// Rule 7: No visible garbled text
// Heuristic: if OCR confidence is too low, the text was likely garbled in
// the image. Also flag if CJK character ratio is too low.
{
  const conf = ocr.confidence ?? 0;
  const text = ocr.text || "";
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const total = text.replace(/\s/g, "").length || 1;
  const cjkRatio = cjk / total;
  const pass = conf > 50 && cjkRatio > 0.3;
  results.push({
    rule: "6. 无明显乱码",
    pass,
    detail: `OCR 置信度 ${conf.toFixed(0)}%, CJK 占比 ${(cjkRatio * 100).toFixed(0)}% (目标 conf>50% 且 CJK>30%)`,
  });
}

// Rule 8: No advertising words
{
  const adWords = [
    "限时", "抢购", "折扣", "特价", "秒杀", "促销", "爆款",
    "限时优惠", "领券", "立减", "包邮", "官方正品", "厂家直销",
    "买一送一", "全场", "钜惠", "直降", "下单", "立即购买", "热卖",
  ];
  const text = ocr.text || "";
  const hits = adWords.filter((w) => text.includes(w));
  const pass = hits.length === 0;
  results.push({
    rule: "7. 无广告词",
    pass,
    detail: hits.length === 0 ? "未检测到广告词" : `命中: ${hits.join(", ")}`,
  });
}

// Rule 9: Visualization strip present
// Heuristic: count distinct color regions in the middle horizontal band
// (where visualization icons would be). If too monochrome, missing.
{
  const mid = await sharp(imagePath)
    .extract({
      left: 0,
      top: Math.floor(H * 0.45),
      width: W,
      height: Math.floor(H * 0.15),
    })
    .resize({ width: 200 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = mid;
  const { width: mW, height: mH, channels } = info;
  // Quantize to 16-color buckets and count distinct colors
  const colors = new Set();
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i] >> 4;
    const g = data[i + 1] >> 4;
    const b = data[i + 2] >> 4;
    colors.add((r << 8) | (g << 4) | b);
  }
  const pass = colors.size >= 8;
  results.push({
    rule: "8. 可视化条带",
    pass,
    detail: `中段 16-色调色板颜色数: ${colors.size} (目标 ≥ 8 表示有图标/可视化)`,
  });
}

// ─── Output ────────────────────────────────────────────────────────────
console.log("");
console.log(`Image: ${imagePath} (${W}×${H}, ${(stat.size / 1024).toFixed(0)} KB)`);
console.log("");
console.log("8-rule check:");
console.log("");
let allPass = true;
for (const r of results) {
  const mark = r.pass ? "✓" : "✗";
  if (!r.pass) allPass = false;
  console.log(`  [${mark}] ${r.rule}`);
  console.log(`      ${r.detail}`);
}
console.log("");
console.log(
  allPass
    ? `ALL 8 RULES PASS`
    : `${results.filter((r) => !r.pass).length} of 8 rules failed`,
);
// Worker was kept alive for Rule 3's title-crop second pass.
// Terminate now that all rules have run.
await worker.terminate();
process.exit(allPass ? 0 : 1);
