#!/usr/bin/env node
// scripts/batch-generate.mjs
//
// 端到端 batch orchestrator (R33):
//   1. 拿 plan
//      - 默认: 内嵌调 plan-new-cards.mjs 拿缺口 (单源路径, 跟 wizard 调
//        build-prompt.mjs 同源 — 改 plan 规则只需要改 plan-new-cards.mjs 一处)
//      - --kind X: 单 kind
//      - --include-empty: 全 24 kind 候选池 (含 current=0 的新 kind)
//      - --from-csv <path>: 手控 CSV (topic,kind,slug? 逐行)
//      - --from-plan <path>: 已有 plan JSON (快速 retry)
//   2. 并发生成 N 张图 (调 generate-card.mjs 单卡模式 — 一次一张)
//      - concurrency 1-3, 默认 1 (顺序最稳, 矩阵后端一过性 timeout 概率低)
//   3. 每张跑完后跑 finish-card.mjs --slug X 补 mmx 阶段 1 (history + sources)
//   4. 全部跑完后跑 finish-card.mjs --bulk 补 阶段 2 (cross-tags + mentions + myth + score)
//   5. 失败进 dead letter: tmp/batch-failed.jsonl
//
// 用法:
//   node scripts/batch-generate.mjs                                # 默认 plan-new-cards 模式
//   node scripts/batch-generate.mjs --kind architecture             # 单 kind
//   node scripts/batch-generate.mjs --include-empty                # 全 24 kind
//   node scripts/batch-generate.mjs --from-csv tmp/my-batch.csv    # CSV
//   node scripts/batch-generate.mjs --from-plan tmp/new-cards-plan.json  # 已有 plan
//   node scripts/batch-generate.mjs --concurrency 2               # 2 worker
//   node scripts/batch-generate.mjs --skip-finish                  # 跳过 finish-card (只要图)
//   node scripts/batch-generate.mjs --dry-run                      # echo plan, 不真跑
//
// 设计原则:
// - 不内联 plan-new-cards.mjs 逻辑, 用 child_process.execFile 调 — 跟
//   wizard 调 build-prompt.mjs 同样的 "single source of truth" 模式。
//   改 plan 规则只需要改 plan-new-cards.mjs 一处, batch-generate 自动同步。
// - 不内联 generate-card / finish-card 逻辑, 同样用 child_process 调 —
//   这两个脚本本身已经包含 retry / dead letter / 3-tier 派生, 复用
//   而不是 fork。

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const hasFlag = (n) => args.includes(n);

const kind = getArg("--kind");
// R34: --kinds 是 --kind 的复数版(逗号分隔),转发给 plan-new-cards
//      单一 kind 时 batch-generate --kinds movie 跟 --kind movie 等价
const kindsArg = getArg("--kinds");
const kindsList = kindsArg
  ? kindsArg.split(",").map((s) => s.trim()).filter(Boolean)
  : kind
    ? [kind]
    : null;
const includeEmpty = hasFlag("--include-empty");
const fromCsv = getArg("--from-csv");
const fromPlan = getArg("--from-plan");
const concurrency = Math.max(1, Math.min(3, parseInt(getArg("--concurrency") || "1", 10)));
const skipFinish = hasFlag("--skip-finish");
const skipBulk = hasFlag("--skip-bulk");
const dryRun = hasFlag("--dry-run");
const count = getArg("--count") ? parseInt(getArg("--count"), 10) : 0;

const ROOT = process.cwd();
const PLAN_NEW_CARDS = path.join(ROOT, "scripts", "plan-new-cards.mjs");
const GENERATE_CARD = path.join(ROOT, "scripts", "generate-card.mjs");
const FINISH_CARD = path.join(ROOT, "scripts", "finish-card.mjs");
const TMP_PLAN = path.join(ROOT, "tmp", "new-cards-plan.json");
const DEAD_LETTER = path.join(ROOT, "tmp", "batch-failed.jsonl");

// === Step 1: 拿 plan ===
let plan;
console.log(`[1/4] Plan phase`);
if (fromPlan) {
  console.log(`  source: --from-plan ${fromPlan}`);
  plan = JSON.parse(fs.readFileSync(fromPlan, "utf8"));
} else if (fromCsv) {
  console.log(`  source: --from-csv ${fromCsv}`);
  const lines = fs
    .readFileSync(fromCsv, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"));
  plan = {
    plan: lines.map((line, i) => {
      const parts = line.split(",").map((x) => x.trim());
      const [t, k, s = ""] = parts;
      if (!t || !k) throw new Error(`CSV line ${i + 1} invalid: ${line}`);
      return {
        title: t,
        kind: k,
        slug: s || slugify(t),
        series: undefined,
        seriesNo: undefined,
        palette: undefined,
      };
    }),
  };
} else {
  // Default: 调 plan-new-cards.mjs 拿 plan
  const extraArgs = [];
  // R34: --kinds (复数) 优先于 --kind (单数),都优先于 includeEmpty 全扫
  if (kindsList && kindsList.length > 0) extraArgs.push("--kinds", kindsList.join(","));
  else if (includeEmpty) {
    // includeEmpty 模式没指定 kind: 传 --include-empty 给 plan-new-cards,让 plan-new-cards 自己扫全 24 kind
  }
  if (includeEmpty) extraArgs.push("--include-empty");
  if (count > 0) extraArgs.push("--count", String(count));
  console.log(`  source: spawn plan-new-cards.mjs ${extraArgs.join(" ")}`);
  try {
    const { stdout } = await execFileAsync("node", [PLAN_NEW_CARDS, ...extraArgs], {
      cwd: ROOT,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    // plan-new-cards.mjs 写 tmp/new-cards-plan.json; 直接读
    plan = JSON.parse(fs.readFileSync(TMP_PLAN, "utf8"));
    if (stdout) process.stdout.write(stdout);
  } catch (e) {
    console.error(`  FAIL: ${e.message?.slice(0, 300) ?? e}`);
    process.exit(1);
  }
}

const jobs = plan.plan || [];
if (jobs.length === 0) {
  console.log("\n  No new cards to generate. Exiting.");
  process.exit(0);
}

console.log(`\n  Plan: ${jobs.length} card(s):`);
jobs.forEach((j, i) => {
  const series = j.series || "?";
  const no = j.seriesNo || "?";
  console.log(`    ${i + 1}. ${j.title}  (${j.kind}/${j.slug})  [${series}/${no}]`);
});
console.log(`  Concurrency: ${concurrency}`);

if (dryRun) {
  console.log("\n[DRY-RUN] would orchestrate the above. Exiting.");
  process.exit(0);
}

// === Step 2: 并发生成 ===
console.log(`\n[2/4] Generate phase (${jobs.length} card × concurrency ${concurrency})`);
const startTime = Date.now();
let success = 0;
let fail = 0;
const failedJobs = [];

async function runJob(job) {
  const idx = jobs.indexOf(job) + 1;
  console.log(`\n  [${idx}/${jobs.length}] ${job.title}  (${job.kind}/${job.slug})`);
  const childArgs = [
    GENERATE_CARD,
    "--topic",
    job.title,
    "--kind",
    job.kind,
    "--slug",
    job.slug,
  ];
  if (job.series) childArgs.push("--series", job.series);
  if (job.seriesNo) childArgs.push("--seriesNo", job.seriesNo);
  if (job.palette) childArgs.push("--palette", job.palette.join(","));

  try {
    const { stdout } = await execFileAsync("node", childArgs, {
      cwd: ROOT,
      timeout: 600_000, // 10 min per card (matrix cold start + 3-tier)
      maxBuffer: 10 * 1024 * 1024,
    });
    // 截取最后 8 行 (避免一卡 spam 太多)
    if (stdout) console.log(stdout.split("\n").slice(-8).join("\n"));
    success++;
  } catch (e) {
    const errMsg = e.message?.slice(0, 300) ?? String(e);
    console.error(`  FAIL: ${errMsg}`);
    failedJobs.push({ job, err: errMsg, phase: "generate" });
    fail++;
  }
}

// Simple worker pool (concurrency 1-3)
const queue = [...jobs];
const workers = Array.from({ length: concurrency }, async () => {
  while (queue.length > 0) {
    const job = queue.shift();
    if (job) await runJob(job);
  }
});
await Promise.all(workers);

console.log(`\n  Generate phase done. success=${success} fail=${fail}`);

// === Step 3: 阶段 1 per-card (mmx) ===
if (!skipFinish && success > 0) {
  console.log(`\n[3/4] Finish phase 1 (mmx history + sources) for ${success} card(s)`);
  // finish-card.mjs 一次跑所有 missing cards (不区分 slug)
  // 所以一次调用处理所有 success 的卡
  try {
    const { stdout } = await execFileAsync("node", [FINISH_CARD, "--slug", jobs[0].slug, "--no-score"], {
      cwd: ROOT,
      timeout: 600_000, // 10 min, mmx on 1+ cards
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stdout) {
      const tail = stdout.split("\n").slice(-10).join("\n");
      console.log(tail);
    }
  } catch (e) {
    console.error(`  FAIL: ${e.message?.slice(0, 200) ?? e}`);
    // 不算 fail (mmx 一过性问题, 不阻塞 bulk 阶段)
  }
}

// === Step 4: 阶段 2 bulk ===
if (!skipFinish && !skipBulk) {
  // R33: derive unique kinds from this batch so enrich-mentions only
  // sweeps the affected subset (N^2/2 cross-tag scoring) instead of
  // all 70+ cards. Falls back to full sweep if batch spans 0 or >1
  // kind (enrich-mentions --only-kind is single-value).
  const uniqueKinds = [...new Set(jobs.map((j) => j.kind))];
  const finishArgs = ["--bulk", "--no-score"];
  if (uniqueKinds.length === 1) {
    finishArgs.push("--only-kinds", uniqueKinds[0]);
  } else if (uniqueKinds.length > 1) {
    console.log(
      `\n  Note: batch spans ${uniqueKinds.length} kinds (${uniqueKinds.join(", ")}), enrich-mentions will do a full sweep (slower)`,
    );
  }

  console.log(`\n[4/4] Finish phase 2 (bulk: cross-tags + mentions + myth)`);
  try {
    const { stdout } = await execFileAsync("node", [FINISH_CARD, ...finishArgs], {
      cwd: ROOT,
      timeout: 180_000, // 3 min, deterministic (enrich scoped to one kind)
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stdout) {
      const tail = stdout.split("\n").slice(-5).join("\n");
      console.log(tail);
    }
  } catch (e) {
    console.error(`  FAIL: ${e.message?.slice(0, 200) ?? e}`);
  }
}

// === 报告 ===
const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
const minutes = (elapsed / 60).toFixed(1);
console.log(`\n=== Done ===`);
console.log(`Generate: success=${success} fail=${fail} (${jobs.length} total)`);
console.log(`Elapsed:  ${elapsed}s (${minutes} min)`);

if (failedJobs.length > 0) {
  fs.mkdirSync(path.dirname(DEAD_LETTER), { recursive: true });
  fs.appendFileSync(
    DEAD_LETTER,
    failedJobs
      .map((f) =>
        JSON.stringify({
          ...f.job,
          err: f.err,
          phase: f.phase,
          at: new Date().toISOString(),
        }),
      )
      .join("\n") + "\n",
  );
  console.log(`\nDead letter: ${DEAD_LETTER}  (${failedJobs.length} entry/entries)`);
  console.log(
    `Retry with:  node scripts/batch-generate.mjs --from-plan ${TMP_PLAN}`,
  );
  process.exit(1);
}

process.exit(0);

// === helper ===
function slugify(s) {
  // 跟 plan-new-cards.mjs 的 slugify 一致 (R30 起的 stable hash fallback)
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "card-" + Math.abs(h).toString(36).slice(0, 6);
}
