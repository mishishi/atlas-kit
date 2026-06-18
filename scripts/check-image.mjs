#!/usr/bin/env node
// scripts/check-image.mjs
//
// Auto-check generated card images against 8 quality rules.
//
// CLI:
//   node scripts/check-image.mjs <path-to-image>
//   node scripts/check-image.mjs <path> --json          # machine-readable
//   node scripts/check-image.mjs <path> --quiet         # summary only
//
// As a module:
//   import { checkImage } from "./check-image.mjs";
//   const { score, results, meta } = await checkImage("path/to/card.png");
//
// Exit 0 if all 8 pass, exit 1 if any fail.
//
// 8 rules (R30 spec, 2026-06-17; Rule 5 "no duplicate blocks" dropped
// per user feedback — too strict for legitimate summary-module
// overlap like "主要食物" echoing "食性行为" in module 4):
//   1. 严格 9:16 比例
//   2. 8 个信息模块 (≥ 6 容忍, sharp 像素分析检测)
//   3. 标题不能含 "图鉴/档案" 后缀 (品牌是图鉴社)
//   4. 标注线 / 引线 (边缘密度 ≥ 5%)
//   5. Summary Bar ≤ 2 行
//   6. 无明显乱码 (OCR 置信度 > 50% 且 CJK > 30%)
//   7. 无广告词 (24 个常见营销词)
//   8. 可视化条带 (中段 16-色调色板 ≥ 8 颜色)
//
// R37 (2026-06-17): refactored to export checkImage() so score-all
// scripts can iterate. Added --json / --quiet flags for CI use.
//
// Dependencies: sharp (already in project), tesseract.js (devDep
// added 2026-06-17). chi_sim language pack auto-downloads on first
// run (~30MB, cached in node_modules/tesseract.js-core).

import sharp from "sharp";
import { createWorker } from "tesseract.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

/**
 * Run all 8 quality rules on a card image. Returns structured result.
 *
 * @param {string} imagePath - absolute or repo-relative path
 * @returns {Promise<{
 *   score: number,           // 0-8, count of passed rules
 *   total: number,           // 8
 *   passed: boolean,         // score === total
 *   meta: { width, height, sizeBytes, ratio },
 *   results: Array<{ rule: string, ruleId: number, pass: boolean, detail: string }>
 * }>}
 */
export async function checkImage(imagePath) {
  if (!path.isAbsolute(imagePath)) {
    imagePath = path.resolve(ROOT, imagePath);
  }
  let stat;
  try {
    stat = await fs.stat(imagePath);
  } catch {
    throw new Error(`File not found: ${imagePath}`);
  }
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${imagePath}`);
  }

  // OCR setup (one worker per call; for batch use, refactor to share)
  const worker = await createWorker(["chi_sim"], undefined, {
    logger: () => {},
  });

  let imgMeta;
  let ocr;
  try {
    imgMeta = await sharp(imagePath).metadata();
    const ret = await worker.recognize(imagePath, {}, {
      blocks: true,
      text: true,
      hocr: true,
    });
    ocr = ret.data;
  } catch (e) {
    await worker.terminate();
    throw new Error(`Processing failed: ${e.message}`);
  }

  const W = imgMeta.width;
  const H = imgMeta.height;

  // Flatten v5 hierarchical blocks → flat words[] array
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

  // ─── Helpers ───────────────────────────────────────────────────────

  function groupRows(words, bandTop, bandBottom) {
    const inBand = words.filter(
      (w) => w.bbox.y0 >= bandTop && w.bbox.y1 <= bandBottom,
    );
    if (inBand.length === 0) return [];
    inBand.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
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

  // ─── 8 Rules ───────────────────────────────────────────────────────
  const results = [];

  // Rule 1: 9:16 aspect ratio
  {
    const ratio = W / H;
    const target = 9 / 16;
    const delta = Math.abs(ratio - target);
    const pass = delta < 0.02;
    results.push({
      ruleId: 1,
      rule: "严格 9:16",
      pass,
      detail: `${W}×${H} → ratio ${ratio.toFixed(3)} (target ${target.toFixed(3)}, Δ${delta.toFixed(3)})`,
    });
  }

  // Rule 2: 8 modules (≥ 6 tolerated) — R35 sharp pixel 2D analysis
  // Previous OCR-based algorithm had two false-positive bugs:
  //   1. lowerLines 包了 30%-95% = 中下 65%(原意"下半部分")
  //   2. OCR line bbox cluster gap 阈值跟视觉模块不对应
  //      (chef 视觉 8 模块被判 3 个 cluster → false 6/8)
  // New: sharp crop 下半部分 (50%-95%),按左右两栏分别聚类 dark rows。
  // Atlas Kit layout 是 2 栏 × N 行,每栏 N 个 module。每栏 ≥ 3 module +
  // 总 ≥ 6。1D 算法把左右栏 y 同步合并 → 必须分栏聚类。
  {
    const croppedBuf = await sharp(imagePath)
      .extract({
        left: 0,
        top: Math.floor(H * 0.50),
        width: W,
        height: Math.floor(H * 0.45),
      })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = croppedBuf;
    const Wc = info.width;
    const Hc = info.height;
    const darkThreshold = 128;
    const contentRatioThreshold = 0.04;
    const midX = Math.floor(Wc / 2);

    function clusterCol(x0, x1) {
      // 在 [x0, x1) 列宽内,每行 dark pixel 比例
      const colWidth = x1 - x0;
      const flags = [];
      for (let y = 0; y < Hc; y++) {
        let darkCount = 0;
        for (let x = x0; x < x1; x++) {
          if (data[y * Wc + x] < darkThreshold) darkCount++;
        }
        flags.push(darkCount / colWidth >= contentRatioThreshold);
      }
      // 合并连续 content rows
      const minH = Math.max(3, Math.floor(H * 0.015));
      let n = 0;
      let curStart = -1;
      for (let y = 0; y < Hc; y++) {
        if (flags[y]) {
          if (curStart < 0) curStart = y;
        } else if (curStart >= 0) {
          if (y - curStart >= minH) n++;
          curStart = -1;
        }
      }
      if (curStart >= 0 && Hc - curStart >= minH) n++;
      return n;
    }

    // 排除中线附近 (跨栏的 timeline / pie chart),边界内缩 5%
    const padX = Math.floor(Wc * 0.05);
    const lCount = clusterCol(padX, midX - padX);
    const rCount = clusterCol(midX + padX, Wc - padX);
    const total = lCount + rCount;
    const pass = total >= 6;
    results.push({
      ruleId: 2,
      rule: "8 个信息模块",
      pass,
      detail: `下半部分 2 栏 dark-row 聚类: 左 ${lCount} + 右 ${rCount} = ${total} (目标 ≥ 6, image ${W}×${H})`,
    });
  }

  // Rule 3: Title no 图鉴/档案 suffix
  {
    const topCropPath = imagePath + ".title-crop.png";
    await sharp(imagePath)
      .extract({ left: 0, top: 0, width: W, height: Math.floor(H * 0.18) })
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
    const pass = !hasSuffix;
    const cleanText = titleText.replace(/\s+/g, " ").trim().slice(0, 50);
    results.push({
      ruleId: 3,
      rule: "标题无「图鉴/档案」后缀",
      pass,
      detail: `${hasSuffix ? "❌ 含" : "✓ 干净"}: "${cleanText}"`,
    });
  }

  // Rule 4: Annotation lines
  {
    const gray = await sharp(imagePath)
      .grayscale()
      .resize({ width: 400 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data, info } = gray;
    const { width: gW, height: gH, channels } = info;
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
    const totalSampled = ((gH - 2) / 2) * ((gW - 2) / 2);
    const edgeRatio = edgeCount / totalSampled;
    const pass = edgeRatio > 0.05;
    results.push({
      ruleId: 4,
      rule: "标注线 / 引线",
      pass,
      detail: `边缘密度 ${(edgeRatio * 100).toFixed(1)}% (目标 ≥ 5%)`,
    });
  }

  // Rule 5: Summary Bar ≤ 2 lines
  {
    const bottomRows = groupRows(words, Math.floor(H * 0.88), H);
    const pass = bottomRows.length > 0 && bottomRows.length <= 2;
    results.push({
      ruleId: 5,
      rule: "Summary Bar ≤ 2 行",
      pass,
      detail: `底部 12% OCR 行数: ${bottomRows.length} (目标 1-2)`,
    });
  }

  // Rule 6: No garbled text
  {
    const conf = ocr.confidence ?? 0;
    const text = ocr.text || "";
    const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const total = text.replace(/\s/g, "").length || 1;
    const cjkRatio = cjk / total;
    const pass = conf > 50 && cjkRatio > 0.3;
    results.push({
      ruleId: 6,
      rule: "无明显乱码",
      pass,
      detail: `OCR 置信度 ${conf.toFixed(0)}%, CJK 占比 ${(cjkRatio * 100).toFixed(0)}% (目标 conf>50% 且 CJK>30%)`,
    });
  }

  // Rule 7: No advertising words
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
      ruleId: 7,
      rule: "无广告词",
      pass,
      detail: hits.length === 0 ? "未检测到广告词" : `命中: ${hits.join(", ")}`,
    });
  }

  // Rule 8: Visualization strip
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
    const colors = new Set();
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i] >> 4;
      const g = data[i + 1] >> 4;
      const b = data[i + 2] >> 4;
      colors.add((r << 8) | (g << 4) | b);
    }
    const pass = colors.size >= 8;
    results.push({
      ruleId: 8,
      rule: "可视化条带",
      pass,
      detail: `中段 16-色调色板颜色数: ${colors.size} (目标 ≥ 8)`,
    });
  }

  await worker.terminate();

  const score = results.filter((r) => r.pass).length;
  return {
    score,
    total: results.length,
    passed: score === results.length,
    meta: {
      width: W,
      height: H,
      sizeBytes: stat.size,
      ratio: +(W / H).toFixed(3),
    },
    results,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────
// Detect "ran as the entry point" vs "imported as a module" by
// comparing the script path (process.argv[1]) to this file's path.
// Earlier `import.meta.url === 'file:///${__filename}'` heuristic
// broke when imported from score-all-cards.mjs on Windows because
// of slash normalization mismatches.
const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
const isMainModule = entryFile === __filename;
if (isMainModule) {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      "Usage: node scripts/check-image.mjs <image-path>\n" +
        "Flags: --json  --quiet\n" +
        "Example: node scripts/check-image.mjs public/cards/object/abacus/abacus-card.png",
    );
    process.exit(2);
  }

  const asJson = process.argv.includes("--json");
  const quiet = process.argv.includes("--quiet");

  try {
    const result = await checkImage(arg);

    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else if (quiet) {
      console.log(
        `${result.score}/${result.total} ${result.passed ? "PASS" : "FAIL"} | ${arg}`,
      );
      for (const r of result.results) {
        if (!r.pass) console.log(`  ✗ ${r.ruleId}. ${r.rule}: ${r.detail}`);
      }
    } else {
      console.log("");
      console.log(
        `Image: ${arg} (${result.meta.width}×${result.meta.height}, ${(result.meta.sizeBytes / 1024).toFixed(0)} KB)`,
      );
      console.log("");
      console.log(`${result.score}/${result.total} rule check:`);
      console.log("");
      for (const r of result.results) {
        const mark = r.pass ? "✓" : "✗";
        console.log(`  [${mark}] ${r.ruleId}. ${r.rule}`);
        console.log(`      ${r.detail}`);
      }
      console.log("");
      console.log(
        result.passed
          ? `ALL 8 RULES PASS`
          : `${result.total - result.score} of 8 rules failed`,
      );
    }
    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}
