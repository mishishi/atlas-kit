// Sample-gen: produce 1 image using the EXACT current wizard prompt
// (loaded from prompt-templates.ts via tsx) and save to public/cards/sample-*.png
// for visual review. Does NOT touch cards.json.
import fs from "node:fs";
import path from "node:path";
import { buildPrompt } from "../src/lib/prompt-templates";

const DAEMON = process.env.MAVIS_DAEMON_URL ?? "http://127.0.0.1:15321";
const TOPIC = process.argv[2];
const KIND = process.argv[3] ?? "other";
if (!TOPIC) { console.error("usage: sample-gen.mjs <topic> <kind>"); process.exit(1); }

const prompt = buildPrompt({ topic: TOPIC, kind: KIND, palette: "auto" });
console.log(`[sample] topic=${TOPIC} kind=${KIND} prompt=${prompt.length} chars`);

const t0 = Date.now();
const res = await fetch(`${DAEMON}/mavis/api/mcp/call`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    server: "matrix",
    tool: "matrix_generate_image",
    arguments: { prompt, aspect_ratio: "9:16", n: 1, size: "1024x1792" },
  }),
});
if (!res.ok) { console.error("HTTP", res.status, await res.text()); process.exit(1); }
const env = await res.json();
const inner = env?.content?.[0]?.text;
let parsed; try { parsed = JSON.parse(inner); } catch {}
const cdn = parsed?.success_items?.[0]?.output_url
  ?? (inner.match?.(/"output_url"\s*:\s*"([^"]+)"/) || [])[1];
if (!cdn) { console.error("no output_url:", inner?.slice(0, 200)); process.exit(1); }

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.resolve(`public/cards/sample-${ts}.png`);
const img = await fetch(cdn);
const buf = Buffer.from(await img.arrayBuffer());
fs.writeFileSync(out, buf);
console.log(`[sample] OK ${elapsed}s -> ${out} (${(buf.length/1024).toFixed(0)} KB)`);
