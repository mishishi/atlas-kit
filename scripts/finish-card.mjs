#!/usr/bin/env node
// scripts/finish-card.mjs
//
// 内容补全串联器: 跑完图后,补齐 description / history / sources /
// cross-tags / 内链 / visualScore 等字段。
//
// 6 个现有补全脚本分两类:
//
//   阶段 1 (per-card, --slug X): 调 mmx text chat
//     - draft-history.mjs  (--limit 1, 跳过已有 history)
//     - draft-sources.mjs  (自动跳过已有 sources)
//
//   阶段 2 (bulk, --bulk): 跑全 cards.json
//     - add-cross-tags.mjs     (cross-cutting tags)
//     - enrich-mentions.mjs    (内链丰富)
//     - add-myth-fact.mjs      (神话/事实, 10 张 hardcoded)
//     - score-all-cards.mjs    (visualScore, 默认 dry-run)
//
// 用法:
//   node scripts/finish-card.mjs --slug potala-palace            # 阶段 1
//   node scripts/finish-card.mjs --slug X --bulk                # 阶段 1+2
//   node scripts/finish-card.mjs --all                           # 阶段 1+2 + 全部 cards
//   node scripts/finish-card.mjs --all --limit 5                 # 阶段 1 限 5 张
//   node scripts/finish-card.mjs --bulk --no-score               # 阶段 2 不跑 visualScore
//
// mmx text chat 是有成本的 (~$0.30 + $0.20 = $0.50 per 60 cards),默认走
// 全量。用 --limit N 控制阶段 1 的 mmx 调用次数。

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const hasFlag = (n) => args.includes(n);

const slug = getArg("--slug");
const bulk = hasFlag("--bulk") || hasFlag("--all");
const all = hasFlag("--all");
const limit = parseInt(getArg("--limit") || "0", 10) || 0;
const noScore = hasFlag("--no-score");
const verbose = hasFlag("--verbose") || process.env.VERBOSE === "1";
// R33: --only-kinds kind1,kind2,... — restrict enrich-mentions outer loop
// to these kinds (candidates still from full cards set). batch-generate.mjs
// uses this to avoid 70+ card N^2/2 cross-tag scoring on every batch.
const onlyKinds = (getArg("--only-kinds") || "").split(",").map((s) => s.trim()).filter(Boolean);

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, "scripts");

function runStage(label, script, extraArgs = []) {
  console.log(`\n=== ${label} ===`);
  console.log(`  $ node ${path.relative(ROOT, script)} ${extraArgs.join(" ")}`);
  try {
    const out = execFileSync("node", [script, ...extraArgs], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: verbose ? "inherit" : "pipe",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600_000, // 10 min per stage, mmx cold start can be slow
    });
    if (!verbose && out) console.log(out.trim().split("\n").slice(-3).join("\n"));
    return true;
  } catch (e) {
    console.error(`  FAIL: ${e.message?.slice(0, 200) ?? e}`);
    return false;
  }
}

const stages = [];

// 阶段 1: per-card 调 mmx
if (slug) {
  // --limit 1 让 draft-history 只跑 1 张,布达拉宫不在 60 张里所以会被选中
  // (todo 列表 = 没有 history 的卡,布达拉宫空 history 在最前)
  const limitArg = limit > 0 ? ["--limit", String(limit)] : [];
  stages.push({
    label: "阶段 1a: draft-history (mmx M2.7)",
    script: path.join(SCRIPTS, "draft-history.mjs"),
    args: limitArg,
  });
  stages.push({
    label: "阶段 1b: draft-sources (mmx M2.7)",
    script: path.join(SCRIPTS, "draft-sources.mjs"),
    args: [],
  });
}

// 阶段 2: bulk 全量补全
if (bulk) {
  stages.push({
    label: "阶段 2a: add-cross-tags (deterministic, no mmx)",
    script: path.join(SCRIPTS, "add-cross-tags.mjs"),
    args: [],
  });
  stages.push({
    label: "阶段 2b: enrich-mentions (deterministic, no mmx)" +
      (onlyKinds.length ? ` [only-kinds=${onlyKinds.join(",")}]` : ""),
    script: path.join(SCRIPTS, "enrich-mentions.mjs"),
    args: onlyKinds.length > 0 ? ["--only-kind", onlyKinds[0]] : [],
  });
  // Note: enrich-mentions currently takes a single --only-kind. If batch
  // spans multiple kinds, batch-generate.mjs runs enrich per-kind itself
  // (or this can be extended to --only-kind1 --only-kind2 in future).
  stages.push({
    label: "阶段 2c: add-myth-fact (10 hardcoded pairs, no mmx)",
    script: path.join(SCRIPTS, "add-myth-fact.mjs"),
    args: [],
  });
  if (!noScore) {
    stages.push({
      label: "阶段 2d: score-all-cards (check-image 8-rule, --write)",
      script: path.join(SCRIPTS, "score-all-cards.mjs"),
      args: ["--write"],
    });
  }
}

if (stages.length === 0) {
  console.error("Usage:");
  console.error("  --slug X               跑阶段 1 (per-card, mmx)");
  console.error("  --slug X --bulk        阶段 1+2 (mmx + bulk 补全)");
  console.error("  --all                  --slug X --bulk + 跑全 cards 阶段 1");
  console.error("  --limit N              阶段 1 限 N 张 (mmx 成本控制)");
  console.error("  --no-score             阶段 2 不跑 visualScore");
  console.error("  --verbose              显示子脚本完整输出");
  process.exit(1);
}

console.log(`Will run ${stages.length} stage(s):`);
stages.forEach((s, i) => console.log(`  ${i + 1}. ${s.label}`));
console.log("");

let okCount = 0, failCount = 0;
for (const stage of stages) {
  const ok = runStage(stage.label, stage.script, stage.args);
  if (ok) okCount++;
  else failCount++;
}

console.log(`\n=== Done ===`);
console.log(`stages: ${okCount} ok / ${failCount} fail / ${stages.length} total`);
process.exit(failCount > 0 ? 1 : 0);
