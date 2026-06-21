#!/usr/bin/env node
// scripts/parallel-gen-images.mjs
//
// 并发跑 generate-card.mjs 给 R37 (或其他 large plan) 生成图片,
// 4 worker 各跑一个 sub-plan (独立 cards.json 副本), 最后合并。
//
// 用法:
//   node scripts/parallel-gen-images.mjs --plan tmp/r37-plan.json --workers 4
//
// 行为:
//   1. 读 plan, round-robin 分给 N 个 worker
//   2. 给每个 worker 生成 sub-plan-N.json
//   3. 复制 data/cards.json → tmp/parallel-gen/cards.worker-N.json
//   4. spawn N 个 generate-card.mjs 进程跑各 sub-plan
//      (matrix_generate_image 4 路并发, 但 cards.json 写入不冲突)
//   5. 等所有 worker 完成
//   6. 合并 cards.worker-N.json → data/cards.json (union by slug, 保留最新 fields)

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, "scripts");
const TMP = path.join(ROOT, "tmp", "parallel-gen");
fs.mkdirSync(TMP, { recursive: true });

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const planPath = getArg("--plan");
const workers = parseInt(getArg("--workers") || "4", 10);
const dryRun = args.includes("--dry-run");

if (!planPath) {
  console.error("Usage: node scripts/parallel-gen-images.mjs --plan <plan.json> [--workers N] [--dry-run]");
  process.exit(1);
}

const CARDS_JSON = path.join(ROOT, "data", "cards.json");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const jobs = plan.plan;
console.log(`Plan: ${jobs.length} cards, workers: ${workers}`);

// Round-robin 分片
const shards = Array.from({ length: workers }, () => []);
jobs.forEach((j, i) => shards[i % workers].push(j));
shards.forEach((s, i) => console.log(`  worker-${i}: ${s.length} cards`));

// 给每个 worker 写 sub-plan + 复制 cards.json
const FIELDS = ["description", "history", "sources", "quote", "trivia", "tagline", "score", "tags", "image", "image_thumb", "image_full", "subtitle", "palette", "seriesNo"];
for (let w = 0; w < workers; w++) {
  const subPlan = { ...plan, plan: shards[w] };
  fs.writeFileSync(path.join(TMP, `sub-plan-${w}.json`), JSON.stringify(subPlan, null, 2) + "\n", "utf8");
  fs.copyFileSync(CARDS_JSON, path.join(TMP, `cards.worker-${w}.json`));
}

function spawnWorker(w) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [
      path.join(SCRIPTS, "generate-card.mjs"),
      "--from-plan", path.join(TMP, `sub-plan-${w}.json`),
      "--cards-path", path.join(TMP, `cards.worker-${w}.json`),
      "--resolution", "1K",
    ], { stdio: ["ignore", "pipe", "pipe"], shell: false });
    proc.stdout.on("data", (d) => process.stdout.write(`[w${w}] ${d}`));
    proc.stderr.on("data", (d) => process.stderr.write(`[w${w}!] ${d}`));
    proc.on("exit", (code) => {
      if (code !== 0) console.error(`[w${w}] exit code ${code}`);
      resolve(code);
    });
  });
}

(async () => {
  const t0 = Date.now();
  const codes = await Promise.all(Array.from({ length: workers }, (_, i) => spawnWorker(i)));
  console.log(`\nAll workers done in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min`);

  // 合并所有 worker 的 cards.worker-N.json → data/cards.json
  const finalCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  const finalBySlug = new Map(finalCards.map((c) => [c.slug, c]));

  for (let w = 0; w < workers; w++) {
    const wPath = path.join(TMP, `cards.worker-${w}.json`);
    if (!fs.existsSync(wPath)) continue;
    const wCards = JSON.parse(fs.readFileSync(wPath, "utf8"));
    for (const wc of wCards) {
      const fc = finalBySlug.get(wc.slug);
      if (fc) {
        // 已存在: master 里有同 slug, worker 修改了 image 字段就替换
        if (fc.image !== wc.image) {
          finalBySlug.set(wc.slug, wc);
        }
      } else {
        // worker 新生成的卡: 直接加进 master
        finalBySlug.set(wc.slug, wc);
      }
    }
  }

  fs.writeFileSync(CARDS_JSON, JSON.stringify([...finalBySlug.values()], null, 2) + "\n", "utf8");
  console.log(`Merged ${finalBySlug.size} cards into ${CARDS_JSON}`);

  // 验证
  const after = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  console.log(`After merge: ${after.length} total cards`);
  const byKind = {};
  after.forEach((c) => { byKind[c.kind] = (byKind[c.kind] || 0) + 1; });
  console.log("Kind distribution:");
  Object.entries(byKind).sort().forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));
})();