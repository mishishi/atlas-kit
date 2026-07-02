// scripts/r70-validate-plan.mjs
// Validate R70 plan against taxonomy: every (kind, subKind) must exist.
import fs from "node:fs";
const t = JSON.parse(fs.readFileSync("data/taxonomy.json", "utf8"));
const plan = JSON.parse(fs.readFileSync("scripts/r70-plan.json", "utf8"));

let bad = 0;
const kindCounts = {};
for (const card of plan.cards) {
  const kDef = t.kinds[card.kind];
  if (!kDef) {
    console.log(`MISSING kind: ${card.slug} → ${card.kind}`);
    bad++;
    continue;
  }
  const skDef = (kDef.subKinds || []).find(s => s.slug === card.subKind);
  if (!skDef) {
    console.log(`MISSING subKind: ${card.slug} → ${card.kind}/${card.subKind}`);
    bad++;
    continue;
  }
  kindCounts[card.kind] = (kindCounts[card.kind] || 0) + 1;
}

console.log(`\nResult: ${bad === 0 ? "ALL VALID" : bad + " errors"}`);
console.log(`Plan size: ${plan.cards.length}`);
console.log(`Kind breakdown:`);
for (const [k, n] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${n}`);
}