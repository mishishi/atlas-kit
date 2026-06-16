import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getPaletteColors } from "@/lib/prompt-templates";
import { CardKind } from "@/lib/types";
import { THEME_TYPES } from "@/lib/theme-types";
import { SERIES_TYPES, getDefaultSeriesSlugForKind, SERIES_TYPE_MAP } from "@/lib/series-types";
import cardsData from "../../../../data/cards.json";

const execFileAsync = promisify(execFile);

/**
 * Prompt template switch.
 *
 * The wizard and CLI share ONE source of truth: scripts/build-prompt.mjs.
 * That script accepts --version v1|v2 (default v2):
 *
 *   v1 — inline 243-line hard-coded Chinese prompt (the original,
 *        kept for rollback / A/B comparison)
 *   v2 — reads prompt-template/main-template.md + categories/<kind>.md
 *        verbatim (the curated, file-archived source of truth)
 *
 * Selector for the wizard: PROMPT_VERSION env var.
 *   - unset / "v2"  → v2 (preferred default — matches the archived
 *                     templates and the CLI script)
 *   - "v1"          → v1 (legacy inline, for rollback / A/B)
 *
 * Why child_process: keeps the wizard and CLI on the EXACT same code
 * path. Editing the script's logic (e.g. adding a new kind) flows
 * to both surfaces automatically. The script is small, fast
 * (~50ms), and reads only local files.
 */
const PROMPT_VERSION = process.env.PROMPT_VERSION === "v1" ? "v1" : "v2";

async function buildPromptViaScript(topic: string, kind: CardKind): Promise<string> {
  const scriptPath = path.join(process.cwd(), "scripts", "build-prompt.mjs");
  const { stdout, stderr } = await execFileAsync(
    "node",
    [scriptPath, topic, kind, "--version", PROMPT_VERSION, "--quiet"],
    { timeout: 10_000, maxBuffer: 1024 * 1024 },
  );
  if (stderr && !stdout) {
    throw new Error(`build-prompt.mjs failed: ${stderr.trim()}`);
  }
  return stdout.trimEnd() + "\n";
}

interface RequestBody {
  topic: string;
  kind: CardKind;
  palette: string;
  seriesSlug?: string;
}

// Force Node runtime (need child_process + fs for download)
export const runtime = "nodejs";
// Allow up to 130 seconds total for AI generation + 2 retries
export const maxDuration = 130;

export async function POST(req: Request) {
  // 1. Rate limit
  const ip = getClientIp(req.headers);
  const limit = rateLimit(ip);
  if (!limit.allowed) {
    const waitSec = Math.ceil((limit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `请求过于频繁,请 ${waitSec} 秒后再试 (每 5 分钟最多 3 次)` },
      { status: 429 },
    );
  }

  // 2. Parse + validate
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { topic, kind, palette } = body;
  const requestedSeriesSlug: string | undefined = body.seriesSlug;
  const trimmedTopic = (topic ?? "").trim();
  if (!trimmedTopic) return NextResponse.json({ error: "主题不能为空" }, { status: 400 });
  if (trimmedTopic.length > 30) return NextResponse.json({ error: "主题不能超过 30 字" }, { status: 400 });
  if (!THEME_TYPES.some((t) => t.key === kind)) {
    return NextResponse.json({ error: "类型无效" }, { status: 400 });
  }

  // Resolve series slug: client value > default for kind > fallback
  let seriesSlug: string;
  if (requestedSeriesSlug && SERIES_TYPE_MAP[requestedSeriesSlug]) {
    seriesSlug = requestedSeriesSlug;
  } else {
    seriesSlug = getDefaultSeriesSlugForKind(kind);
  }

  // 3. Slug — prefer the curated English slug table for the 60
  //    placeholder topics; fall back to a stable hash-based slug
  //    for any new topic the user might type in.
  //
  //    Why the table: the 60 cards.json entries all use English slugs
  //    (labrador-retriever, hangzhou, peking-duck, ...). If wizard
  //    produced hash slugs (card-abc123), re-running the wizard
  //    for "拉布拉多" would not match "labrador-retriever" in cards.json
  //    and would create a duplicate entry.
  function toSlugFallback(text: string): string {
    // Stable short hash from pure-Chinese text — only used for topics
    // not in SLUG_TABLE (e.g. user types a custom topic).
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return "card-" + Math.abs(hash).toString(36).slice(0, 6);
  }
  const SLUG_TABLE: Record<string, string> = {
    // pet
    "拉布拉多": "labrador-retriever", "布偶猫": "ragdoll", "玄凤鹦鹉": "cockatiel",
    "玉米蛇": "corn-snake", "马犬": "belgian-malinois",
    // animal
    "藏羚羊": "tibetan-antelope", "大熊猫": "giant-panda", "雪豹": "snow-leopard",
    "东北虎": "siberian-tiger", "朱鹮": "crested-ibis",
    // plant
    "西湖龙井": "longjing-tea", "银杏": "ginkgo", "梅花": "plum-blossom",
    "兰花": "orchid", "竹子": "bamboo",
    // city
    "上海": "shanghai", "杭州": "hangzhou", "苏州": "suzhou", "西安": "xian", "北京": "beijing",
    // person
    "李白": "li-bai", "杜甫": "du-fu", "苏轼": "su-shi", "蔡伦": "cai-lun", "张衡": "zhang-heng",
    // festival
    "春节": "spring-festival", "清明": "qingming", "端午": "dragon-boat", "中秋": "mid-autumn", "冬至": "winter-solstice",
    // food
    "北京烤鸭": "peking-duck", "兰州拉面": "lamian", "肉夹馍": "rougamo", "广式早茶": "yum-cha", "重庆火锅": "chongqing-hotpot",
    // phenomenon
    "极光": "aurora", "梅雨": "plum-rain", "钱塘江大潮": "qiantang-tide", "潮汐": "tide", "厄尔尼诺": "el-nino",
    // history
    "丝绸之路": "silk-road", "贞观之治": "reign-of-zhenguan", "安史之乱": "an-shi-rebellion",
    "戊戌变法": "hundred-days-reform", "西安事变": "xian-incident",
    // object
    "玛瑙": "agate", "玉璧": "jade-bi", "漆器": "lacquerware", "青花瓷": "blue-white-porcelain", "算盘": "abacus",
    // tech
    "5G": "5g", "人工智能": "artificial-intelligence", "量子计算": "quantum-computing", "区块链": "blockchain", "空间站": "space-station",
    // other
    "故宫": "forbidden-city", "敦煌莫高窟": "mogao-caves", "苏州园林": "suzhou-gardens", "三体": "three-body", "三星堆": "sanxingdui",
  };
  const slug = SLUG_TABLE[trimmedTopic] ?? toSlugFallback(trimmedTopic);

  const cards = cardsData as any[];
  // Match by English slug. Re-running wizard for an existing card
  // updates its image only (preserves hand-written content).
  const existing = cards.find((c) => c.slug === slug);

  // 4. Build prompt — delegated to scripts/build-prompt.mjs (single
  //    source of truth shared with the CLI). See header comment for
  //    PROMPT_VERSION semantics.
  const prompt = await buildPromptViaScript(trimmedTopic, kind);
  const requestJson = {
    requests: [{ prompt, aspect_ratio: "9:16", resolution: "2K" }],
  };

  // 5. Call mavis daemon HTTP API (skips the mavis CLI which has unreliable
  //    daemon-discovery in Next.js child processes — see memory).
  //    Daemon URL is configurable via MAVIS_DAEMON_URL env (defaults to
  //    localhost for dev). On Vercel, set this to your daemon's public URL.
  const daemonUrl = process.env.MAVIS_DAEMON_URL ?? "http://127.0.0.1:15321";
  const daemonMcpPath = `${daemonUrl}/mavis/api/mcp/call`;

  let mcpOutput = "";
  let lastError: any = null;
  // Retry up to 2 times — matrix can be slow on cold start
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[generate] attempt ${attempt}/2: direct HTTP to daemon at 127.0.0.1:15321`);
      // Bypass the mavis CLI entirely and call the daemon HTTP API directly.
      // The mavis CLI's daemon-discovery preflight can fail with a misleading
      // "No Mavis daemon running" error when called from inside a Next.js dev
      // server child process (verified via env dump — the same ~/.mavis/daemon.port
      // file is readable from the Next.js process but the CLI's auto-detect
      // path returns null). Calling /mavis/api/mcp/call directly is faster
      // and side-steps the preflight entirely.
      const res = await fetch(daemonMcpPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: "matrix",
          tool: "matrix_generate_image",
          arguments: requestJson,
        }),
        signal: AbortSignal.timeout(110_000), // matrix cold start can be 30-60s
      });
      const text = await res.text();
      mcpOutput = text;
      console.log("[generate] daemon status:", res.status, "body (first 400):", text.slice(0, 400));
      if (!res.ok) {
        lastError = new Error(`daemon returned ${res.status}: ${text.slice(0, 300)}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        break;
      }
      lastError = null;
      break;
    } catch (e: any) {
      console.error(`[generate] attempt ${attempt} failed:`, e.message);
      lastError = e;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  if (lastError || !mcpOutput) {
    return NextResponse.json(
      {
        error: `AI 生成失败: ${lastError?.message ?? "无输出"}`,
      },
      { status: 502 },
    );
  }

  // 6. Parse CDN URL
  // The daemon returns an MCP-style envelope: { content: [{type:"text", text:"<matrix JSON>"}], isError }
  // The inner text is matrix's own JSON, where output_url lives in success_items[].output_url.
  let cdnUrl: string | null = null;
  try {
    const envelope = JSON.parse(mcpOutput);
    const innerText = envelope?.content?.[0]?.text;
    if (typeof innerText === "string") {
      const inner = JSON.parse(innerText);
      cdnUrl = inner?.success_items?.[0]?.output_url ?? null;
    }
  } catch (e) {
    // fall through to regex
  }
  if (!cdnUrl) {
    // Fallback: regex against the raw output (works for both flat matrix JSON
    // and the nested MCP envelope)
    const urlMatch = mcpOutput.match(/"output_url"\s*:\s*"([^"]+)"/);
    cdnUrl = urlMatch?.[1] ?? null;
  }
  if (!cdnUrl) {
    return NextResponse.json(
      { error: "AI 生成结果解析失败,请重试" },
      { status: 502 },
    );
  }

  // 7. Download image to public/cards/<kind>/<slug>/<slug>-card.png
  // Round 26 (2026-06-17): per-card directory layout. One folder per
  // card → delete a card = delete one folder, no orphan -thumb.webp
  // left behind. New artifacts (e.g. <slug>-prompt.md) live next
  // to the generated image.
  //
  // Re-running the wizard for an existing card overwrites the
  // previous image, which is the desired behavior. Slugs are English
  // (labrador-retriever, hangzhou, etc.) so the filename is also
  // English — URL-safe, no encodeURIComponent needed.
  const cardFilename = `${slug}-card.png`;
  const cardDir = path.join(process.cwd(), "public", "cards", kind, slug);
  const localPath = path.join(cardDir, cardFilename);
  try {
    await fs.mkdir(cardDir, { recursive: true });
    const res = await fetch(cdnUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(localPath, buffer);
  } catch (e: any) {
    return NextResponse.json(
      { error: `下载 AI 图片失败: ${e.message ?? "未知错误"}` },
      { status: 502 },
    );
  }

  // 7b. Save the prompt that generated this card next to the image
  // (H1 rule: prompt is a verbatim read from prompt-template/, NOT
  //  paraphrased or summarized — the file is exactly what was sent
  //  to the model, for traceability / re-generation / debugging).
  try {
    const promptPath = path.join(cardDir, `${slug}-prompt.md`);
    // We re-run build-prompt.mjs here to get the exact prompt text
    // (one-shot script invocation, not a long-lived import — same
    // H1 discipline as the wizard generation above).
    const prompt = await buildPromptViaScript(trimmedTopic, kind);
    await fs.writeFile(promptPath, prompt, "utf8");
  } catch (e: any) {
    // Non-fatal: image is the primary deliverable. If we can't save
    // the prompt, log but continue.
    console.error(`[generate] failed to save prompt.md for ${slug}: ${e.message}`);
  }

  // 8. Persist to cards.json
  const paletteColors = getPaletteColors(palette);
  const imagePath = `/cards/${kind}/${slug}/${cardFilename}`;
  let resultSlug: string;
  if (existing) {
    // Re-run for an existing card: only update the image. Keep the
    // hand-written tagline / description / tags / score untouched.
    existing.image = imagePath;
    resultSlug = existing.slug;
  } else {
    const newCard = {
      slug,
      title: trimmedTopic,
      kind,
      series: seriesSlug, // store slug, not Chinese name
      seriesNo: String(cards.filter((c) => c.series === seriesSlug).length + 1).padStart(3, "0"),
      palette: paletteColors,
      image: imagePath,
      score: 0,
      tags: [],
      tagline: "",
      subtitle: "",
      description: "",
      createdAt: new Date().toISOString().split('T')[0],
    };
    cards.push(newCard);
    resultSlug = slug;
  }
  await fs.writeFile(
    path.join(process.cwd(), "data", "cards.json"),
    JSON.stringify(cards, null, 2),
    "utf8",
  );

  return NextResponse.json({
    slug: resultSlug,
    image: imagePath,
    title: trimmedTopic,
  });
}