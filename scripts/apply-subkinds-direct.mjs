#!/usr/bin/env node
/**
 * Apply subKind backfill draft → cards.json (without re-running mmx).
 * Use when backfill-subkinds.mjs --apply hangs because the script still
 * invokes mmx per-kind even in --apply mode.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRAFT_PATH = path.join(ROOT, "tmp", "subkind-draft.json");
const CARDS_PATH = path.join(ROOT, "data", "cards.json");
const TAX_PATH = path.join(ROOT, "data", "taxonomy.json");

const draft = JSON.parse(readFileSync(DRAFT_PATH, "utf8"));
const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
const taxonomy = JSON.parse(readFileSync(TAX_PATH, "utf8")).kinds;

let applied = 0, skipped = 0;
const bySlug = new Map(cards.map((c) => [c.slug, c]));

for (const e of draft) {
  const card = bySlug.get(e.slug);
  if (!card) { skipped++; continue; }
  if (!e.suggestedSubKind) { skipped++; continue; }
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

const noSubKind = cards.filter((c) => !c.subKind);
console.log(`Remaining no-subKind: ${noSubKind.length}`);
noSubKind.slice(0, 5).forEach((c) => console.log(`  ${c.slug} | ${c.kind}`));