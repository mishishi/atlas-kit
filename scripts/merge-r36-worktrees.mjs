#!/usr/bin/env node
// scripts/merge-r36-worktrees.mjs
//
// 把 4 个 R36 worktree (r36-batch-1..4) 的新卡片 entries 合并到当前
// (master) worktree 的 cards.json + public/cards/。
//
// 用法:
//   cd D:/workspaces/mcode/atlas-kit
//   node scripts/merge-r36-worktrees.mjs
//
// 行为:
//   1. 读 master cards.json + 4 个 batch 的 cards.json
//   2. 找 master 没有的 slugs (R36 新增) → 收集 entries
//   3. 去重紫禁城 (slug=forbidden-city, master 已作为 other kind 存在)
//   4. 合并到 master cards.json
//   5. 复制每个 batch 的 public/cards/<kind>/<slug>/ 到 master
//   6. 打印报告

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const WORKSPACE = "D:/workspaces/mcode";
const BATCHES = ["r36-batch-1", "r36-batch-2", "r36-batch-3", "r36-batch-4"];
const ROOT = process.cwd();
const CARDS_JSON = path.join(ROOT, "data", "cards.json");
const CARDS_DIR = path.join(ROOT, "public", "cards");

// 1. 读 master cards.json
const masterCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
const masterSlugs = new Set(masterCards.map((c) => c.slug));
console.log(`Master baseline: ${masterCards.length} cards (${masterSlugs.size} unique slugs)`);

// 2. 从每个 batch 收集 R36 新增 entries
const collected = new Map(); // slug → entry
const conflicts = []; // 同 slug 不同 entry 的冲突
for (const batch of BATCHES) {
  const batchCardsPath = path.join(WORKSPACE, `atlas-kit-${batch}`, "data", "cards.json");
  if (!fs.existsSync(batchCardsPath)) {
    console.log(`  ! ${batch}: data/cards.json missing, skip`);
    continue;
  }
  const batchCards = JSON.parse(fs.readFileSync(batchCardsPath, "utf8"));
  const newEntries = batchCards.filter((c) => !masterSlugs.has(c.slug));
  console.log(`  ${batch}: ${batchCards.length} cards, ${newEntries.length} R36 new`);
  for (const e of newEntries) {
    if (collected.has(e.slug)) {
      // 已存在,检查是否一致
      const prev = collected.get(e.slug);
      if (JSON.stringify(prev) !== JSON.stringify(e)) {
        conflicts.push({ slug: e.slug, batch1: prev, batch2: e });
      }
    } else {
      collected.set(e.slug, e);
    }
  }
}

console.log(`\nCollected ${collected.size} unique R36 new slugs`);

// 3. 复制每个 batch 的 public/cards/<kind>/<slug>/ 到 master
let copiedDirs = 0, copiedFiles = 0;
for (const batch of BATCHES) {
  const batchCardsDir = path.join(WORKSPACE, `atlas-kit-${batch}`, "public", "cards");
  if (!fs.existsSync(batchCardsDir)) continue;
  const kinds = fs.readdirSync(batchCardsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const kind of kinds) {
    const batchKindDir = path.join(batchCardsDir, kind);
    const slugs = fs.readdirSync(batchKindDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const slug of slugs) {
      if (!collected.has(slug)) continue; // 跳过 master 已有的 (e.g. forbidden-city)
      const srcDir = path.join(batchKindDir, slug);
      const dstDir = path.join(CARDS_DIR, kind, slug);
      if (fs.existsSync(dstDir)) continue; // 已存在
      fs.mkdirSync(dstDir, { recursive: true });
      const files = fs.readdirSync(srcDir);
      for (const f of files) {
        fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
        copiedFiles++;
      }
      copiedDirs++;
    }
  }
}
console.log(`Copied ${copiedDirs} card dirs (${copiedFiles} files) to master`);

// 4. 合并 cards.json entries
const newEntries = [...collected.values()];
masterCards.push(...newEntries);
fs.writeFileSync(CARDS_JSON, JSON.stringify(masterCards, null, 2) + "\n", "utf8");
console.log(`\nMerged cards.json: ${masterCards.length} total (master ${masterCards.length - newEntries.length} + R36 new ${newEntries.length})`);

// 5. 冲突报告
if (conflicts.length) {
  console.log(`\n! ${conflicts.length} slug conflicts (same slug, different metadata):`);
  for (const c of conflicts.slice(0, 10)) {
    console.log(`    ${c.slug}: title differs? "${c.batch1.title}" vs "${c.batch2.title}"`);
  }
}

// 6. 验证
const finalCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
const finalByKind = {};
finalCards.forEach((c) => { finalByKind[c.kind] = (finalByKind[c.kind] || 0) + 1; });
console.log(`\nFinal kind distribution:`);
Object.entries(finalByKind).sort().forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));