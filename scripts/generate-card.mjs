#!/usr/bin/env node
// scripts/generate-card.mjs
//
// 单张图鉴全流程生成:
//   1. build-prompt.mjs (v2, file-archived templates)  → prompt 文本
//   2. matrix_generate_image via mavis daemon HTTP     → CDN URL
//   3. 下载 -card.png 落 public/cards/<kind>/<slug>/
//   4. 落 -prompt.md  (R26 H1: prompt 是事实源, 必须归档)
//   5. 派生 -thumb.webp (384w) + -full.webp (1024w q90)
//   6. 更新 data/cards.json (image / image_thumb / image_full / revisions)
//   7. 失败时写 dead letter: tmp/failed-cards.jsonl
//
// 这是 wizard (src/app/api/generate/route.ts) 的 CLI 等价物。
// Wizard 有 rate limit (3 req / 5 min) + 只能从前端交互;
// CLI 版无 rate limit + 可脚本批量。
//
// 用法:
//   # 单张
//   node scripts/generate-card.mjs --topic 布达拉宫 --kind architecture --slug potala-palace
//
//   # 批量 (从 plan-new-cards.mjs 输出读)
//   node scripts/generate-card.mjs --from-plan tmp/new-cards-plan.json
//
//   # 干跑 (跳过 matrix 调用,只生成 prompt + 验证 schema)
//   node scripts/generate-card.mjs --topic X --kind Y --slug Z --dry-run --skip-tier
//
// 标志:
//   --resolution 1K|2K   (默认 1K,生产用 2K)
//   --aspect-ratio 9:16  (默认 9:16,匹配 prompt template)
//   --skip-tier          (不生成 thumb/full)
//   --skip-cards-json    (不写 cards.json,只落图)
//   --dry-run            (--skip-tier + --skip-cards-json + --no-matrix)

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const getArg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const hasFlag = (n) => args.includes(n);

const topic = getArg("--topic");
const kind = getArg("--kind");
const slugArg = getArg("--slug");
const seriesArg = getArg("--series");
const seriesNoArg = getArg("--seriesNo");
const paletteArg = getArg("--palette");
const fromPlan = getArg("--from-plan");
const aspectRatio = getArg("--aspect-ratio") || "9:16";
const resolution = getArg("--resolution") || "1K";
const skipTier = hasFlag("--skip-tier") || hasFlag("--dry-run");
const skipCardsJson = hasFlag("--skip-cards-json") || hasFlag("--dry-run");
const noMatrix = hasFlag("--no-matrix") || hasFlag("--dry-run");
const dryRun = hasFlag("--dry-run");

const ROOT = process.cwd();
const CARDS_DIR = path.join(ROOT, "public", "cards");
const CARDS_JSON = path.join(ROOT, "data", "cards.json");
const BUILD_PROMPT = path.join(ROOT, "scripts", "build-prompt.mjs");
const DAEMON_URL = process.env.MAVIS_DAEMON_URL || "http://127.0.0.1:15321";
const DAEMON_MCP_PATH = `${DAEMON_URL}/mavis/api/mcp/call`;

// 1. 解析参数 → jobs[]
let jobs = [];
if (fromPlan) {
  const plan = JSON.parse(fs.readFileSync(fromPlan, "utf8"));
  jobs = plan.plan.map((p) => ({
    topic: p.title,
    kind: p.kind,
    slug: p.slug,
    series: p.series,
    seriesNo: p.seriesNo,
    palette: p.palette,
  }));
} else if (topic && kind) {
  // R30: --series / --seriesNo / --palette overrides for single-card
  // runs that don't go through --from-plan. Without these, the new
  // entry's seriesNo falls back to "001" and overwrites the curated
  // numbering from plan-new-cards.mjs.
  const palette = paletteArg ? paletteArg.split(",").map((s) => s.trim()) : null;
  jobs = [
    {
      topic,
      kind,
      slug: slugArg || slugify(topic),
      series: seriesArg,
      seriesNo: seriesNoArg,
      palette: palette,
    },
  ];
} else {
  console.error("Usage:");
  console.error("  --topic X --kind Y [--slug S]");
  console.error("  --from-plan <path-to-json>");
  process.exit(1);
}

function slugify(s) {
  // Stable short hash (跟 wizard route.ts:113 一致)
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "card-" + Math.abs(h).toString(36).slice(0, 6);
}

// R32: 中文 kind display name (subset，跟 build-prompt.mjs KIND_DISPLAY 对齐)
// 不 import 那边是因为 build-prompt.mjs 没 export。直接 hard-code 24 个
// + 3 个 alias 即可,新增 kind 在这里加一行 (跟 categories/<kind>.md 同步)。
const KIND_DISPLAY = {
  pet: "宠物",
  animal: "动物",
  plant: "植物",
  city: "城市",
  festival: "节日",
  food: "食物",
  phenomenon: "自然现象",
  history: "历史事件",
  object: "器物",
  person: "人物",
  tech: "科技概念",
  other: "其他",
  architecture: "建筑",
  artwork: "艺术品",
  book: "书籍",
  "chemical-element": "化学元素",
  country: "国家",
  disease: "疾病",
  movie: "电影",
  mythology: "神话",
  "natural-phenomenon": "自然现象",
  profession: "职业",
  "space-object": "天体",
  sport: "体育运动",
  vehicle: "交通工具",
  // Alias long-form keys (跟 build-prompt.mjs 一致)
  "historical-event": "历史事件",
  technology: "科技概念",
};

// R32: 读 categories/<kind>.md 取 Identity 段 (英文 1 行),作为 placeholder
// description 的额外参考。如果 kind 字典/文件缺失, fallback 到 "图鉴条目"。
function loadCategoryIdentity(kind) {
  const p = path.join(ROOT, "prompt-template", "categories", `${kind}.md`);
  if (!fs.existsSync(p)) return null;
  const content = fs.readFileSync(p, "utf8");
  const m = content.match(/## Identity\n+([\s\S]+?)(?=\n##|$)/);
  if (!m) return null;
  const first = m[1]
    .trim()
    .split("\n")
    .find((l) => l.trim().startsWith("*"));
  return first ? first.replace(/^\*\s*/, "").trim() : null;
}

// 2. 读 cards.json (1 次,所有 jobs 共享)
const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));
let dirty = false;
let success = 0, fail = 0, skipped = 0;

for (const job of jobs) {
  console.log(`\n=== ${job.topic}  (${job.kind}/${job.slug}) ===`);

  // 2a. build-prompt.mjs
  let promptText;
  try {
    const { stdout } = await execFileAsync(
      "node",
      [BUILD_PROMPT, job.topic, job.kind, "--version", "v2", "--quiet"],
      { timeout: 10_000, maxBuffer: 1024 * 1024 },
    );
    promptText = stdout.trimEnd() + "\n";
    console.log(`  prompt: ${promptText.length} bytes (v2 file-archived)`);
  } catch (e) {
    console.error(`  FAIL build-prompt: ${e.message}`);
    appendDeadLetter(job, `build-prompt: ${e.message}`);
    fail++;
    continue;
  }

  // 2b. matrix call (retry up to 3 times, exponential backoff)
  let cdnUrl = null;
  if (noMatrix) {
    console.log(`  matrix: SKIPPED (--no-matrix)`);
    cdnUrl = null;
  } else {
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(DAEMON_MCP_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            server: "matrix",
            tool: "matrix_generate_image",
            arguments: {
              requests: [{ prompt: promptText, aspect_ratio: aspectRatio, resolution }],
            },
          }),
          signal: AbortSignal.timeout(120_000),
        });
        const text = await res.text();
        if (!res.ok) {
          lastErr = new Error(`daemon HTTP ${res.status}: ${text.slice(0, 200)}`);
          if (attempt < 3) {
            const wait = 2000 * attempt;
            console.log(`  matrix: attempt ${attempt} failed, retry in ${wait}ms`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          break;
        }
        const envelope = JSON.parse(text);
        const innerText = envelope?.content?.[0]?.text;
        const inner = JSON.parse(innerText);
        cdnUrl = inner?.success_items?.[0]?.output_url;
        if (!cdnUrl) throw new Error("no output_url in matrix response");
        console.log(`  matrix: ok (attempt ${attempt})`);
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) {
          const wait = 2000 * attempt;
          console.log(`  matrix: attempt ${attempt} threw, retry in ${wait}ms (${e.message})`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
    if (!cdnUrl) {
      console.error(`  FAIL matrix: ${lastErr?.message}`);
      appendDeadLetter(job, `matrix: ${lastErr?.message}`);
      fail++;
      continue;
    }
  }

  // 3. 准备目录
  const cardDir = path.join(CARDS_DIR, job.kind, job.slug);
  const cardPath = path.join(cardDir, `${job.slug}-card.png`);
  const promptPath = path.join(cardDir, `${job.slug}-prompt.md`);

  if (dryRun) {
    console.log(`  [DRY-RUN] would write:`);
    console.log(`    - ${path.relative(ROOT, cardPath)}  (CDN image, skipped)`);
    console.log(`    - ${path.relative(ROOT, promptPath)}  (${promptText.length} bytes)`);
    console.log(`    - ${path.relative(ROOT, cardDir)}/${job.slug}-thumb.webp  (384w)`);
    console.log(`    - ${path.relative(ROOT, cardDir)}/${job.slug}-full.webp   (1024w)`);
    console.log(`    - ${path.relative(ROOT, CARDS_JSON)}  (new ${job.kind} entry)`);
    success++;
    continue;
  }

  fs.mkdirSync(cardDir, { recursive: true });

  // 4. 落 -card.png
  try {
    if (noMatrix) {
      fs.writeFileSync(cardPath, "PLACEHOLDER (--no-matrix)");
    } else {
      const r = await fetch(cdnUrl);
      if (!r.ok) throw new Error(`CDN download HTTP ${r.status}`);
      fs.writeFileSync(cardPath, Buffer.from(await r.arrayBuffer()));
    }
    const size = fs.statSync(cardPath).size;
    console.log(`  -card.png: ${(size / 1024).toFixed(0)}kB → ${path.relative(ROOT, cardPath)}`);
  } catch (e) {
    console.error(`  FAIL download: ${e.message}`);
    appendDeadLetter(job, `download: ${e.message}`);
    fail++;
    continue;
  }

  // 5. 落 -prompt.md (R26 H1: prompt 是事实源)
  fs.writeFileSync(promptPath, promptText, "utf8");
  console.log(`  -prompt.md: ${promptText.length} bytes`);

  // 6. 派生 thumb + full
  if (!skipTier && !noMatrix) {
    for (const [tier, w] of [["thumb", 384], ["full", 1024]]) {
      const dst = path.join(cardDir, `${job.slug}-${tier}.webp`);
      if (fs.existsSync(dst)) continue;
      try {
        await sharp(cardPath)
          .resize(w, null, { withoutEnlargement: true })
          .webp({ quality: 90, effort: 4 })
          .toFile(dst);
      } catch (e) {
        console.error(`  WARN ${tier}: ${e.message}`);
      }
    }
    console.log(`  -thumb.webp + -full.webp: ok`);
  }

  // 7. 更新 cards.json
  if (!skipCardsJson) {
    const newImage = `/cards/${job.kind}/${job.slug}/${job.slug}-card.png`;
    const newThumb = `/cards/${job.kind}/${job.slug}/${job.slug}-thumb.webp`;
    const newFull = `/cards/${job.kind}/${job.slug}/${job.slug}-full.webp`;

    const existing = cards.find((c) => c.slug === job.slug);
    if (existing) {
      existing.image = newImage;
      existing.image_thumb = newThumb;
      existing.image_full = newFull;
      existing.revisions = existing.revisions ?? [];
      existing.revisions.push({
        date: new Date().toISOString(),
        summary: "通过 generate-card.mjs 重新生成图像",
        fields: ["image"],
      });
    } else {
      // R32: 新 entry 默认填 placeholder description + subtitle,避免 mmx 阶段 1
      // (draft-history / draft-sources) 拿空 prompt 喂 mmx → model 输出格式跑偏
      // → "FAIL: parse" (R31 复现过 2/3 张新卡 history 失败就是这个原因)。
      // 后续 finish-card.mjs --bulk 会用 mmx 生成真 description,这只是占位。
      const kindDisplay = KIND_DISPLAY[job.kind] || job.kind;
      const identityEn = loadCategoryIdentity(job.kind);
      const placeholderSubtitle = `${kindDisplay} · ${job.topic} · 百科占位`;
      const placeholderDesc =
        `${job.topic} 是 Atlas Kit 图鉴社「${kindDisplay}」分类下的百科图鉴占位条目` +
        (identityEn ? ` (category identity: ${identityEn})` : "") +
        `。完整描述 / 历史沿革 / 参考来源 / 评分 / 视觉等字段由 AI 内容补全脚本 (draft-history / draft-sources / add-cross-tags / enrich-mentions / score-all-cards) 后续批量填充,无需人工写占位文案。`;

      cards.push({
        slug: job.slug,
        title: job.topic,
        kind: job.kind,
        series: job.series || "craft-and-botanical",
        seriesNo: job.seriesNo || "001",
        palette: job.palette || ["#F5F0E6", "#B88952", "#8C7F6E"],
        image: newImage,
        image_thumb: newThumb,
        image_full: newFull,
        score: 0,
        tags: [],
        tagline: "",
        subtitle: placeholderSubtitle,
        description: placeholderDesc,
        createdAt: new Date().toISOString().split("T")[0],
      });
    }
    dirty = true;
    console.log(`  cards.json: updated (${existing ? "image replaced" : "new entry added"})`);
  }

  success++;
}

if (dirty) {
  fs.writeFileSync(CARDS_JSON, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${CARDS_JSON}`);
}

console.log(`\n=== Summary ===`);
console.log(`success=${success}  fail=${fail}  skipped=${skipped}`);

function appendDeadLetter(job, errMsg) {
  const dl = path.join(ROOT, "tmp", "failed-cards.jsonl");
  fs.mkdirSync(path.dirname(dl), { recursive: true });
  fs.appendFileSync(
    dl,
    JSON.stringify({ ...job, err: errMsg, at: new Date().toISOString() }) + "\n",
  );
  console.log(`  ! dead-lettered: ${dl}`);
}
