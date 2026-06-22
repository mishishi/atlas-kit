#!/usr/bin/env node
// scripts/upload-cdn.mjs
//
// Pipeline 上传步 — 把 public/cards/<kind>/<slug>/ 下的 3 个产物
// (-card.png / -thumb.webp / -full.webp) 上传到 CloudBase 云存储,
// 可选地把 cards.json 里的本地路径改成 CDN URL (R-something 的
// cdn-rewrite.mjs 逻辑内联, 单 slug 增量版).
//
// 用法:
//   node scripts/upload-cdn.mjs --kind <kind> --slug <slug>          # 单卡
//   node scripts/upload-cdn.mjs --kind <kind>                        # 单 kind 全量
//   node scripts/upload-cdn.mjs --all                                # 全部 kind
//   加 --dry-run                                                    # 只列文件不上传
//   加 --also-rewrite                                               # 上传后改 cards.json
//
// 鉴权 (CloudBase Node SDK):
//   - admin:   TENCENT_SECRET_ID + TENCENT_SECRET_KEY (Tencent Cloud CAM API key)
//              这是默认 + 推荐路径, 适合 CLI/服务端.
//   - 环境变量 + 自动: 如果是部署在云函数里, SDK 自动读
//              TENCENTCLOUD_SECRETID/TENCENTCLOUD_SECRETKEY (无需 env).
//
// 不像 R52 用过的 matrix MCP (走的是 mavis daemon HTTP),
// 这里直接调 CloudBase Node SDK, 无需 daemon.
//
// 用法示例 (端到端):
//   1. node scripts/generate-card.mjs --topic X --kind Y --slug Z --upload
//      → 本脚本在生成 3-tier 之后被自动调用
//   2. node scripts/upload-cdn.mjs --kind food --slug dumplings --dry-run
//      → 验证文件清单
//   3. node scripts/upload-cdn.mjs --kind food --slug dumplings --also-rewrite
//      → 上传 + 把 cards.json path 改成 CDN URL

import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import tcb from "@cloudbase/node-sdk";

const ROOT = process.cwd();
const PUBLIC_CARDS = path.join(ROOT, "public", "cards");
const CARDS_JSON = path.join(ROOT, "data", "cards.json");

// --- CLI args ---
const args = process.argv.slice(2);
const getArg = (n) =>
  args.includes(n) ? args[args.indexOf(n) + 1] : null;
const hasFlag = (n) => args.includes(n);

const slug = getArg("--slug");
const kind = getArg("--kind");
const doAll = hasFlag("--all");
const dryRun = hasFlag("--dry-run");
const alsoRewrite = hasFlag("--also-rewrite");

// --- Config (env) ---
const ENV = process.env.TENCENT_CLOUDBASE_ENV || "cloud1-d9gv1q8ikad5e9721";
const REGION =
  process.env.TENCENT_CLOUDBASE_REGION || "ap-shanghai";
const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const CDN_DOMAIN = (
  process.env.TENCENT_CDN_DOMAIN ||
  "https://636c-cloud1-d9gv1q8ikad5e9721-1442530204.tcb.qcloud.la"
).replace(/\/+$/, "");

// Sanity-check admin creds (the SDK won't error early; better to fail fast)
// Skipped if --dry-run, since dry-run does no network and doesn't init the SDK.
if (!dryRun && (!SECRET_ID || !SECRET_KEY)) {
  console.error(
    "Missing TENCENT_SECRET_ID / TENCENT_SECRET_KEY in env.",
  );
  console.error(
    "These are Tencent Cloud CAM API keys (not CloudBase env keys).",
  );
  console.error(
    "Get them at: https://console.cloud.tencent.com/cam/capi",
  );
  console.error(
    "Then add to .env.local:",
  );
  console.error("  TENCENT_SECRET_ID=AKID...");
  console.error("  TENCENT_SECRET_KEY=...");
  process.exit(1);
}

// --- Init CloudBase (skipped if --dry-run) ---
const app = dryRun
  ? null
  : tcb.init({
      env: ENV,
      region: REGION,
      secretId: SECRET_ID,
      secretKey: SECRET_KEY,
    });

// --- Find files to upload ---
function findFiles() {
  const results = [];
  const TIER_FILES = /-(card\.png|thumb\.webp|full\.webp)$/;

  if (doAll) {
    if (!fs.existsSync(PUBLIC_CARDS)) {
      throw new Error(`No ${PUBLIC_CARDS}`);
    }
    for (const k of fs.readdirSync(PUBLIC_CARDS)) {
      const kDir = path.join(PUBLIC_CARDS, k);
      if (!fs.statSync(kDir).isDirectory()) continue;
      for (const s of fs.readdirSync(kDir)) {
        const sDir = path.join(kDir, s);
        if (!fs.statSync(sDir).isDirectory()) continue;
        for (const file of fs.readdirSync(sDir)) {
          if (!TIER_FILES.test(file)) continue;
          results.push({
            kind: k,
            slug: s,
            filename: file,
            localPath: path.join(sDir, file),
            cloudPath: `/cards/${k}/${s}/${file}`,
          });
        }
      }
    }
  } else if (kind && slug) {
    const sDir = path.join(PUBLIC_CARDS, kind, slug);
    if (!fs.existsSync(sDir)) {
      throw new Error(`No local files at ${sDir}`);
    }
    for (const file of fs.readdirSync(sDir)) {
      if (!TIER_FILES.test(file)) continue;
      results.push({
        kind,
        slug,
        filename: file,
        localPath: path.join(sDir, file),
        cloudPath: `/cards/${kind}/${slug}/${file}`,
      });
    }
  } else if (kind) {
    const kDir = path.join(PUBLIC_CARDS, kind);
    if (!fs.existsSync(kDir)) {
      throw new Error(`No kind dir ${kDir}`);
    }
    for (const s of fs.readdirSync(kDir)) {
      const sDir = path.join(kDir, s);
      if (!fs.statSync(sDir).isDirectory()) continue;
      for (const file of fs.readdirSync(sDir)) {
        if (!TIER_FILES.test(file)) continue;
        results.push({
          kind,
          slug: s,
          filename: file,
          localPath: path.join(sDir, file),
          cloudPath: `/cards/${kind}/${s}/${file}`,
        });
      }
    }
  } else {
    console.error(
      "Usage:\n" +
        "  node scripts/upload-cdn.mjs --kind <kind> --slug <slug>\n" +
        "  node scripts/upload-cdn.mjs --kind <kind>\n" +
        "  node scripts/upload-cdn.mjs --all\n" +
        "Add --dry-run to just list files, --also-rewrite to update cards.json.",
    );
    process.exit(1);
  }
  return results;
}

const files = findFiles();
console.log(
  `Found ${files.length} files (env=${ENV}, region=${REGION})`,
);

// --- Dry run: just print ---
if (dryRun) {
  for (const f of files) {
    const size = fs.statSync(f.localPath).size;
    console.log(
      `  ${f.cloudPath.padEnd(60)} ${(size / 1024).toFixed(0).padStart(6)} kB`,
    );
  }
  console.log(`\nCDN domain: ${CDN_DOMAIN}`);
  console.log("Re-run without --dry-run to actually upload.");
  process.exit(0);
}

// --- Upload ---
// node-sdk uploadFile signature: { cloudPath, fileContent: Buffer | fs.ReadStream }
// Stream is preferred for multi-MB files; cards are <1MB so either works.
// We use ReadStream to avoid loading the whole image into memory at once.
let ok = 0;
let fail = 0;
const errors = [];

for (const f of files) {
  try {
    const stream = createReadStream(f.localPath);
    await app.uploadFile({
      cloudPath: f.cloudPath,
      fileContent: stream,
    });
    console.log(`  ✓ ${f.cloudPath}`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${f.cloudPath}: ${e.message}`);
    fail++;
    errors.push({ path: f.cloudPath, error: e.message });
  }
}

console.log(`\nDone. ${ok} uploaded, ${fail} failed.`);
console.log(`Public URLs: ${CDN_DOMAIN}/cards/<kind>/<slug>/<filename>`);

// --- Optional: rewrite cards.json ---
if (alsoRewrite && ok > 0) {
  const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  const uploaded = new Map(); // slug → { image, image_thumb, image_full }
  for (const f of files) {
    if (!uploaded.has(f.slug)) uploaded.set(f.slug, {});
    const url = `${CDN_DOMAIN}${f.cloudPath}`;
    if (f.filename.endsWith("-card.png")) uploaded.get(f.slug).image = url;
    if (f.filename.endsWith("-thumb.webp")) uploaded.get(f.slug).image_thumb = url;
    if (f.filename.endsWith("-full.webp")) uploaded.get(f.slug).image_full = url;
  }
  let changed = 0;
  for (const c of cards) {
    const up = uploaded.get(c.slug);
    if (!up) continue;
    if (up.image && c.image !== up.image) {
      c.image = up.image;
      changed++;
    }
    if (up.image_thumb && c.image_thumb !== up.image_thumb) {
      c.image_thumb = up.image_thumb;
      changed++;
    }
    if (up.image_full && c.image_full !== up.image_full) {
      c.image_full = up.image_full;
      changed++;
    }
  }
  fs.writeFileSync(
    CARDS_JSON,
    JSON.stringify(cards, null, 2) + "\n",
    "utf8",
  );
  console.log(
    `Rewrote ${changed} fields in cards.json to use CDN URLs.`,
  );
  if (fail > 0) {
    console.log(`⚠ ${fail} files failed; their paths were NOT updated.`);
  }
}

// Exit non-zero if anything failed (caller can detect)
if (fail > 0) process.exit(2);