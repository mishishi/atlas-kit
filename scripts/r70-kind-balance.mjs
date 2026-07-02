// scripts/r70-kind-balance.mjs
import fs from "node:fs";
const c = JSON.parse(fs.readFileSync("data/cards.json", "utf8"));
const counts = {};
for (const r of c) counts[r.kind] = (counts[r.kind] || 0) + 1;
const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
const total = c.length;
console.log("Kind distribution (top 25 of total=" + total + "):");
for (const [k, n] of arr.slice(0, 25)) {
  const pct = ((n / total) * 100).toFixed(1);
  console.log("  " + k.padEnd(15) + n + " (" + pct + "%)");
}
console.log("\nUnderserved kinds (count < 15):");
for (const [k, n] of arr.filter(([_, c]) => c < 15)) {
  console.log("  " + k.padEnd(15) + n);
}