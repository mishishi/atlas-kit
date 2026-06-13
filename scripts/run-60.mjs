// Run all 60 cards through /api/generate (which itself talks to the
// matrix daemon). Uses the same code path as the wizard — same prompt,
// same rate limit, same upsert into cards.json. We just don't render
// the spinner; we just wait for each one to finish.
//
// Sleep 200s between requests to stay under the wizard's 5-min / 3 rate
// limit. With ~50-80s of actual gen per card, this means ~3 cards per
// 5-min window — exactly the limit, with safety margin for retries.
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3001";
const API = `${BASE}/api/generate`;

// Mirror the SLUG_TABLE in route.ts — must match exactly for the
// wizard to land on the right upsert.
const SLUGS = {
  // pet
  "拉布拉多": "pet", "布偶猫": "pet", "玄凤鹦鹉": "pet", "玉米蛇": "pet", "马犬": "pet",
  // animal
  "藏羚羊": "animal", "大熊猫": "animal", "雪豹": "animal", "东北虎": "animal", "朱鹮": "animal",
  // plant
  "西湖龙井": "plant", "银杏": "plant", "梅花": "plant", "兰花": "plant", "竹子": "plant",
  // city
  "上海": "city", "杭州": "city", "苏州": "city", "西安": "city", "北京": "city",
  // person
  "李白": "person", "杜甫": "person", "苏轼": "person", "蔡伦": "person", "张衡": "person",
  // festival
  "春节": "festival", "清明": "festival", "端午": "festival", "中秋": "festival", "冬至": "festival",
  // food
  "北京烤鸭": "food", "兰州拉面": "food", "肉夹馍": "food", "广式早茶": "food", "重庆火锅": "food",
  // phenomenon
  "极光": "phenomenon", "梅雨": "phenomenon", "钱塘江大潮": "phenomenon", "潮汐": "phenomenon", "厄尔尼诺": "phenomenon",
  // history
  "丝绸之路": "history", "贞观之治": "history", "安史之乱": "history", "戊戌变法": "history", "西安事变": "history",
  // object
  "玛瑙": "object", "玉璧": "object", "漆器": "object", "青花瓷": "object", "算盘": "object",
  // tech
  "5G": "tech", "人工智能": "tech", "量子计算": "tech", "区块链": "tech", "空间站": "tech",
  // other
  "故宫": "other", "敦煌莫高窟": "other", "苏州园林": "other", "三体": "other", "三星堆": "other",
};

const LOG = path.resolve("data/.run-60.log");
fs.writeFileSync(LOG, `# run started ${new Date().toISOString()}\n`);

const log = (m) => { console.log(m); fs.appendFileSync(LOG, m + "\n"); };

// Wait for dev server to be ready
log("[run] waiting for dev server...");
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${BASE}/`);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
log("[run] dev server up");

const topics = Object.entries(SLUGS);
const total = topics.length;
let done = 0, failed = 0;
const t0 = Date.now();

for (const [topic, kind] of topics) {
  done++;
  const tStart = Date.now();
  process.stdout.write(`[${done}/${total}] ${topic} (${kind})... `);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 180_000); // 3 min cap
      const res = await fetch(API, {
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
        process.stdout.write(`429 (wait ${wait}s, attempt ${attempt})... `);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (attempt === 2) {
          console.log(`HTTP ${res.status} ${data.error ?? ""}`);
          failed++;
        } else {
          await new Promise((r) => setTimeout(r, 30_000));
          continue;
        }
      } else {
        const data = await res.json();
        const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
        console.log(`OK ${elapsed}s -> ${data.image}`);
        break;
      }
    } catch (e) {
      if (attempt === 2) { console.log(`ERR ${e.message}`); failed++; }
      else { await new Promise((r) => setTimeout(r, 30_000)); }
    }
  }
  // Sleep 5s between requests (rate limit currently disabled at 9999
  // to allow batch run; daemon queue should be the only bottleneck)
  if (done < total) {
    const sleep = 5;
    process.stdout.write(`  (sleeping ${sleep}s before next)\n`);
    await new Promise((r) => setTimeout(r, sleep * 1000));
  }
}

const totalElapsed = ((Date.now() - t0) / 1000).toFixed(0);
log(`\n# run done ${new Date().toISOString()}`);
log(`# total: ${total}, done: ${done - failed}, failed: ${failed}, elapsed: ${totalElapsed}s`);
