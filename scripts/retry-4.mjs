// Retry the 4 cards that failed in the batch run (matrix daemon 502).
// Each one is a single POST; route.ts upsert means we just overwrite
// the image for the existing cards.json entry.
import fs from "node:fs";
const BASE = "http://localhost:3001";
const FAIL = [
  ["银杏", "plant"],
  ["李白", "person"],
  ["西安事变", "history"],
  ["三体", "other"],
];
for (const [topic, kind] of FAIL) {
  process.stdout.write(`${topic} (${kind})... `);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 180_000);
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, kind, palette: "auto" }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const m = /请\s*(\d+)\s*秒/.exec(data.error || "");
        const wait = m ? Math.min(Number(m[1]) + 5, 320) : 200;
        process.stdout.write(`429(wait ${wait}s)... `);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (attempt === 3) console.log(`HTTP ${res.status} ${data.error ?? ""}`);
        else { await new Promise((r) => setTimeout(r, 30_000)); continue; }
      } else {
        const data = await res.json();
        console.log(`OK -> ${data.image}`);
        break;
      }
    } catch (e) {
      if (attempt === 3) console.log(`ERR ${e.message}`);
      else await new Promise((r) => setTimeout(r, 30_000));
    }
  }
  await new Promise((r) => setTimeout(r, 5000));
}
