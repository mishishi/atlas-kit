#!/usr/bin/env node
// Append a revision entry to a card's `revisions` array.
// Used after any hand-edit to a card's text content (description,
// tags, history). Run: node scripts/log-revision.mjs <slug> <summary>
//
// Example: node scripts/log-revision.mjs sanxingdui "添加历史沿革 5 节点"
//
// Schema: { date: ISO, summary: string, fields: string[] }
// - date: when the edit happened
// - summary: one-line description of what changed
// - fields: which fields were touched (description / tags / history / etc)
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node scripts/log-revision.mjs <slug> <summary> [field1 field2 ...]");
  process.exit(1);
}

const [slug, summary, ...fields] = args;
const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
const c = cards.find((x) => x.slug === slug);
if (!c) {
  console.error(`Card not found: ${slug}`);
  process.exit(1);
}

c.revisions = c.revisions ?? [];
c.revisions.push({
  date: new Date().toISOString(),
  summary,
  fields: fields.length > 0 ? fields : ["unspecified"],
});

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Logged revision for ${slug}: "${summary}" (${c.revisions.length} total)`);
