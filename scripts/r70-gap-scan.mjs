// scripts/r70-gap-scan.mjs
// Scan subKind coverage against taxonomy expected.
import fs from "node:fs";

const t = JSON.parse(fs.readFileSync("data/taxonomy.json", "utf8"));
const c = JSON.parse(fs.readFileSync("data/cards.json", "utf8"));

const counts = {};
for (const r of c) {
  const k = r.kind, sk = r.subKind;
  if (!counts[k]) counts[k] = {};
  counts[k][sk] = (counts[k][sk] || 0) + 1;
}

const gaps = [];
for (const [kSlug, kDef] of Object.entries(t.kinds)) {
  if (!kDef.subKinds) continue;
  for (const sk of kDef.subKinds) {
    const actual = (counts[kSlug] && counts[kSlug][sk.slug]) || 0;
    const expected = sk.expected ?? 5;
    if (actual < expected) {
      gaps.push({ kind: kSlug, subKind: sk.slug, actual, expected, diff: expected - actual, name: sk.displayName ?? sk.slug });
    }
  }
}

gaps.sort((a, b) => b.diff - a.diff);
console.log("Top 30 subKind gaps:");
for (const g of gaps.slice(0, 30)) {
  console.log(`  ${g.kind}/${g.subKind} (${g.name}): ${g.actual}/${g.expected} [need ${g.diff}]`);
}
console.log(`---total gaps: ${gaps.length}`);