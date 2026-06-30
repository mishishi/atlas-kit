#!/usr/bin/env node
/**
 * R58 (2026-06-26): subKind backfill — read cards.json, for each card without
 *  a subKind, use mmx text chat to suggest one (validated against
 *  data/taxonomy.json). Output a draft JSON the user reviews, then run with
 *  --apply to write back to cards.json.
 *
 * Strategy:
 *   1. For each kind, batch the 15 card titles into 1 mmx call (output: JSON
 *      array of {slug, subKind}). 25 kinds = 25 mmx calls ≈ 12 min total.
 *   2. Validate every mmx-suggested subKind via assertValidSubKind() before
 *      putting it in the draft. Invalid / missing → leave subKind unset, mark
 *      `confidence: "low"` so the user knows to hand-fill.
 *   3. Write tmp/subkind-draft.json (one entry per card, even those we couldn't
 *      classify — user can hand-edit before --apply).
 *   4. --apply reads the draft, validates again, sets `subKind` on each card,
 *      preserves `subKindLabel` (UI can resolve from taxonomy.json).
 *
 * Why not per-card mmx (slower): 400 calls × 30s = 200 min. Per-kind batching
 *  keeps the prompt focused (only relevant subKinds listed) and is ~16x faster.
 *
 * Why not pure heuristic: title-based keyword matching misses 50%+ of cards
 *  (especially abstract kinds like phenomenon, mythology, person). mmx is
 *  better at "this title sounds like a 唐宋 dynasty event" → "tang-song".
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data", "cards.json");
const TAX_PATH = path.join(ROOT, "data", "taxonomy.json");
const DRAFT_PATH = path.join(ROOT, "tmp", "subkind-draft.json");

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const hasFlag = (n) => args.includes(n);

const DRY_RUN = !hasFlag("--apply");
const ONLY_KIND = getArg("--kind"); // "pet" | "city" | ...  (single kind only)
const ONLY_SLUG = getArg("--slug"); // "xian" (single card only)
const VERBOSE = hasFlag("--verbose");

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
const taxonomy = JSON.parse(readFileSync(TAX_PATH, "utf8")).kinds;

function callMmx(prompt, systemPrompt) {
  const isWin = process.platform === "win32";
  const mmxPath = isWin ? "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1" : "mmx";
  const mmxArgs = [
    "text", "chat",
    "--non-interactive", "--quiet",
    "--message", prompt,
    "--system", systemPrompt,
    "--format", "json",
  ];
  if (isWin) {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mmxPath, ...mmxArgs],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 120_000 },
    );
  }
  return execFileSync(mmxPath, mmxArgs, {
    encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 120_000,
  });
}

function callMmxForKind(kind, subKinds, cardList) {
  const subKindList = subKinds.map((s) => `- ${s.slug} (${s.label})`).join("\n");
  const cardLines = cardList
    .map((c, i) => `${i + 1}. slug="${c.slug}" title="${c.title}" tags=[${(c.tags || []).join(",")}]`)
    .join("\n");

  const systemPrompt =
    "你是图鉴社 (Atlas Kit) 的分类编辑, 专门为图鉴卡打 L3 subKind 标签. " +
    "严格按照候选列表里的 subKind slug 输出, 不要自创. " +
    "如果某张卡你不确定, 输出空字符串 \"\". " +
    "只输出 JSON 数组, 不要 markdown, 不要解释.";

  const userPrompt =
    `kind="${kind}" 候选 subKind 列表 (必须从里面选):\n${subKindList}\n\n` +
    `请为以下 ${cardList.length} 张卡各分配一个最合适的 subKind slug:\n${cardLines}\n\n` +
    `输出 JSON 数组, 每个元素: {"slug": "<card-slug>", "subKind": "<subKind-slug-or-empty>"}`;

  const raw = callMmx(userPrompt, systemPrompt);
  // Strip code fences + extract array
  let text = raw
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  // Sometimes mmx wraps the JSON in a { "items": [...] } envelope — handle both
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("No JSON array found in mmx output");
  return JSON.parse(m[0]);
}

function classifyKind(kind) {
  const def = taxonomy[kind];
  if (!def) {
    console.error(`WARN: kind "${kind}" not in taxonomy.json, skipping`);
    return [];
  }
  const targets = cards.filter((c) => c.kind === kind && !c.subKind);
  if (targets.length === 0) {
    console.log(`  ${kind}: 0 missing subKind, skip`);
    return [];
  }
  console.log(`  ${kind}: ${targets.length} cards missing subKind, calling mmx...`);
  const validSubKinds = def.subKinds;
  try {
    const arr = callMmxForKind(kind, validSubKinds, targets);
    const out = [];
    let ok = 0, bad = 0, empty = 0;
    for (const item of arr) {
      const card = targets.find((c) => c.slug === item.slug);
      if (!card) {
        bad++;
        continue;
      }
      const proposed = (item.subKind || "").trim();
      const valid = validSubKinds.some((s) => s.slug === proposed);
      if (!proposed) {
        empty++;
        out.push({ slug: card.slug, currentSubKind: null, suggestedSubKind: null, confidence: "low", reason: "mmx 无建议, 需手填" });
      } else if (!valid) {
        bad++;
        out.push({ slug: card.slug, currentSubKind: null, suggestedSubKind: null, confidence: "low", reason: `mmx 给的 "${proposed}" 不在 taxonomy 里, 需手填` });
      } else {
        ok++;
        out.push({ slug: card.slug, currentSubKind: null, suggestedSubKind: proposed, confidence: "medium", reason: "mmx" });
      }
    }
    console.log(`    → ${ok} ok / ${empty} empty / ${bad} bad / ${targets.length} total`);
    return out;
  } catch (e) {
    console.error(`    FAIL: ${e.message?.slice(0, 200) ?? e}`);
    // Mark all as needs-manual-fill
    return targets.map((c) => ({
      slug: c.slug, currentSubKind: null, suggestedSubKind: null,
      confidence: "low", reason: `mmx 调用失败: ${e.message?.slice(0, 100) ?? e}`,
    }));
  }
}

// ===== Main =====
// In --apply mode, defer to scripts/apply-subkinds-direct.mjs (which doesn't
// invoke mmx) so we don't re-run the per-kind mmx batch with an already-
// filled draft. Saves 12 min on 25 kinds.
if (DRY_RUN === false && process.argv.includes("--defer-apply")) {
  console.log("--apply: deferring to scripts/apply-subkinds-direct.mjs (faster, no mmx).");
  console.log("To run the fast apply, use: node scripts/apply-subkinds-direct.mjs");
  process.exit(0);
}

if (ONLY_SLUG) {
  const card = cards.find((c) => c.slug === ONLY_SLUG);
  if (!card) { console.error(`slug "${ONLY_SLUG}" not found`); process.exit(1); }
  console.log(`Single-card mode: ${ONLY_SLUG} (${card.kind})`);
  const out = classifyKind(card.kind);
  // Keep only this slug's entry
  const filtered = out.filter((e) => e.slug === ONLY_SLUG);
  writeFileSync(DRAFT_PATH, JSON.stringify(filtered, null, 2) + "\n", "utf8");
  console.log(`Wrote 1 entry to ${DRAFT_PATH}`);
  process.exit(0);
}

const kindsToProcess = ONLY_KIND ? [ONLY_KIND] : [...new Set(cards.filter((c) => !c.subKind).map((c) => c.kind))];
console.log(`Processing ${kindsToProcess.length} kinds (cards without subKind: ${cards.filter((c) => !c.subKind).length})...`);

let existingDraft = [];
if (existsSync(DRAFT_PATH)) {
  existingDraft = JSON.parse(readFileSync(DRAFT_PATH, "utf8"));
  console.log(`Loaded ${existingDraft.length} existing draft entries from ${DRAFT_PATH}`);
}
const draftMap = new Map(existingDraft.map((e) => [e.slug, e]));

for (const kind of kindsToProcess) {
  const entries = classifyKind(kind);
  for (const e of entries) draftMap.set(e.slug, e);
  if (!DRY_RUN && entries.length > 0) {
    writeFileSync(DRAFT_PATH, JSON.stringify([...draftMap.values()], null, 2) + "\n", "utf8");
    console.log(`  (wrote ${draftMap.size} entries to ${DRAFT_PATH})`);
  }
}

const finalDraft = [...draftMap.values()];
writeFileSync(DRAFT_PATH, JSON.stringify(finalDraft, null, 2) + "\n", "utf8");

const okCount = finalDraft.filter((e) => e.suggestedSubKind).length;
const needFill = finalDraft.filter((e) => !e.suggestedSubKind).length;
console.log("");
console.log(`=== Summary ===`);
console.log(`Total draft entries: ${finalDraft.length}`);
console.log(`  mmx suggested: ${okCount}`);
console.log(`  need manual fill: ${needFill}`);
console.log(`Draft: ${DRAFT_PATH}`);

if (DRY_RUN) {
  console.log("\nNext: review the draft, hand-fill any `suggestedSubKind: null`,");
  console.log("then re-run with --apply to write to cards.json.");
} else {
  // --apply mode
  console.log("\n--apply mode: writing to cards.json...");
  let applied = 0, skipped = 0;
  for (const e of finalDraft) {
    const card = cards.find((c) => c.slug === e.slug);
    if (!card) { skipped++; continue; }
    if (!e.suggestedSubKind) { skipped++; continue; }
    // Final validation against taxonomy
    const valid = taxonomy[card.kind]?.subKinds.some((s) => s.slug === e.suggestedSubKind);
    if (!valid) {
      console.error(`  SKIP ${e.slug}: "${e.suggestedSubKind}" not in taxonomy for kind "${card.kind}"`);
      skipped++;
      continue;
    }
    card.subKind = e.suggestedSubKind;
    applied++;
  }
  writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`Applied ${applied}, skipped ${skipped}. cards.json updated.`);
}