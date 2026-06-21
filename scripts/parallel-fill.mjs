#!/usr/bin/env node
// scripts/parallel-fill.mjs
//
// 并发跑 fix-descriptions / draft-history / draft-sources 的 mmx 任务,
// 4 worker 并发处理 cards.json 的不同子集, 然后合并结果。
//
// 用法:
//   node scripts/parallel-fill.mjs --stage descriptions --workers 4
//   node scripts/parallel-fill.mjs --stage history --workers 4
//   node scripts/parallel-fill.mjs --stage sources --workers 4
//   node scripts/parallel-fill.mjs --stage all --workers 4
//
// 行为:
//   1. 读 cards.json, 找当前 stage 需要补的 slug 集合
//   2. 把 slugs 分给 N 个 worker (round-robin)
//   3. 每个 worker 跑独立的 fix-descriptions / draft-history / draft-sources
//      处理 cards.worker-N.json 副本
//   4. 等待所有 worker 完成
//   5. 合并所有 worker 的 cards.worker-N.json → cards.json
//      (用 unique slug 的最新字段覆盖)

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, "scripts");
const TMP = path.join(ROOT, "tmp", "parallel-fill");
fs.mkdirSync(TMP, { recursive: true });

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const stage = (getArg("--stage") || "descriptions").toLowerCase();
const workers = parseInt(getArg("--workers") || "4", 10);

const CARDS_JSON = path.join(ROOT, "data", "cards.json");

// 1. 找每个 stage 需要的 slugs
const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
const isPlaceholder = (s) => !s || s.trim().length < 20 || s.includes("百科图鉴占位条目");

function targetsForStage(stage) {
  if (stage === "descriptions") {
    return cards.filter((c) => isPlaceholder(c.description)).map((c) => c.slug);
  }
  if (stage === "history") {
    return cards.filter((c) => !c.history || !Array.isArray(c.history) || c.history.length === 0).map((c) => c.slug);
  }
  if (stage === "sources") {
    return cards.filter((c) => !Array.isArray(c.sources) || c.sources.length === 0).map((c) => c.slug);
  }
  if (stage === "extras") {
    return cards.filter((c) => !c.quote || !c.trivia).map((c) => c.slug);
  }
  if (stage === "tagline") {
    return cards.filter((c) => !c.tagline || !c.tagline.trim()).map((c) => c.slug);
  }
  if (stage === "all") {
    const s = new Set();
    cards.forEach((c) => {
      if (isPlaceholder(c.description)) s.add(c.slug);
      if (!c.history || !Array.isArray(c.history) || c.history.length === 0) s.add(c.slug);
      if (!Array.isArray(c.sources) || c.sources.length === 0) s.add(c.slug);
      if (!c.quote || !c.trivia) s.add(c.slug);
      if (!c.tagline || !c.tagline.trim()) s.add(c.slug);
    });
    return [...s];
  }
  console.error(`Unknown stage: ${stage}. Use: descriptions|history|sources|extras|tagline|all`);
  process.exit(1);
}

const slugs = targetsForStage(stage);
console.log(`Stage: ${stage}, workers: ${workers}, slugs to fill: ${slugs.length}`);
if (slugs.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

// 2. Round-robin 分片
const shards = Array.from({ length: workers }, () => []);
slugs.forEach((slug, i) => shards[i % workers].push(slug));
shards.forEach((s, i) => console.log(`  worker-${i}: ${s.length} slugs`));

// 3. 启动 worker 子进程
function scriptForStage(stage) {
  if (stage === "descriptions") return "fix-descriptions.mjs";
  if (stage === "history") return "draft-history.mjs";
  if (stage === "sources") return "draft-sources.mjs";
  if (stage === "extras") return "draft-extras.mjs";
  if (stage === "tagline") return "fill-tagline.mjs";
  if (stage === "all") return null; // 特殊处理
  return null;
}

function spawnWorker(workerId, workerSlugs) {
  const workerCards = path.join(TMP, `cards.worker-${workerId}.json`);
  // 复制当前 cards.json 给 worker
  fs.copyFileSync(CARDS_JSON, workerCards);

  const stages = stage === "all"
    ? ["descriptions", "history", "sources", "extras", "tagline"]
    : [stage];
  return new Promise((resolve, reject) => {
    const procs = [];
    let pending = 0;
    const onExit = () => { if (--pending === 0) resolve(); };
    for (const s of stages) {
      const slugsForStage = workerSlugs.filter((slug) => {
        const c = JSON.parse(fs.readFileSync(workerCards, "utf8")).find((x) => x.slug === slug);
        if (!c) return false;
        if (s === "descriptions") return isPlaceholder(c.description);
        if (s === "history") return !c.history || !Array.isArray(c.history) || c.history.length === 0;
        if (s === "sources") return !Array.isArray(c.sources) || c.sources.length === 0;
        if (s === "extras") return !c.quote || !c.trivia;
        if (s === "tagline") return !c.tagline || !c.tagline.trim();
        return false;
      });
      if (slugsForStage.length === 0) continue;

      const script = scriptForStage(s);
      pending++;
      const proc = spawn("node", [
        path.join(SCRIPTS, script),
        "--include-slug", slugsForStage.join(","),
        "--cards-path", workerCards,
      ], { stdio: ["ignore", "pipe", "pipe"], shell: false });
      procs.push(proc);
      // 限流输出
      proc.stdout.on("data", (d) => process.stdout.write(`[w${workerId}/${s}] ` + d.toString()));
      proc.stderr.on("data", (d) => process.stderr.write(`[w${workerId}/${s}!] ` + d.toString()));
      proc.on("exit", (code) => {
        if (code !== 0) console.error(`[w${workerId}/${s}] exit code ${code}`);
        onExit();
      });
    }
    if (pending === 0) resolve();
  });
}

(async () => {
  const t0 = Date.now();
  await Promise.all(shards.map((shard, i) => spawnWorker(i, shard)));
  console.log(`\nAll workers done in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min`);

  // 4. 合并 worker cards.worker-N.json → cards.json
  // 对每个 worker 副本里的卡片, 用最新 field 覆盖 master
  // (worker 副本是从 master 复制来的, 所以 union 全集, 每张卡 fields 取最新一份 worker 的)
  const finalCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  const finalBySlug = new Map(finalCards.map((c) => [c.slug, c]));

  const FIELDS = ["description", "history", "sources", "quote", "trivia", "tagline", "score", "tags"];
  for (let w = 0; w < workers; w++) {
    const wPath = path.join(TMP, `cards.worker-${w}.json`);
    if (!fs.existsSync(wPath)) continue;
    const wCards = JSON.parse(fs.readFileSync(wPath, "utf8"));
    for (const wc of wCards) {
      const fc = finalBySlug.get(wc.slug);
      if (!fc) continue;
      for (const f of FIELDS) {
        if (wc[f] !== undefined && wc[f] !== null) fc[f] = wc[f];
      }
    }
  }

  fs.writeFileSync(CARDS_JSON, JSON.stringify([...finalBySlug.values()], null, 2) + "\n", "utf8");
  console.log(`Merged into ${CARDS_JSON} (${finalBySlug.size} cards)`);

  // 5. 验证 stage 效果
  const after = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
  const stats = {
    descriptions: after.filter((c) => !isPlaceholder(c.description)).length,
    history: after.filter((c) => c.history && c.history.length > 0).length,
    sources: after.filter((c) => c.sources && c.sources.length > 0).length,
  };
  console.log(`\nAfter merge:`);
  console.log(`  descriptions: ${stats.descriptions} / 240`);
  console.log(`  history:      ${stats.history} / 240`);
  console.log(`  sources:      ${stats.sources} / 240`);
})();