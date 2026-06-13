import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { buildPrompt, getPaletteColors } from "@/lib/prompt-templates";
import { CardKind } from "@/lib/types";
import { THEME_TYPES } from "@/lib/theme-types";
import { SERIES_TYPES, getDefaultSeriesSlugForKind, SERIES_TYPE_MAP } from "@/lib/series-types";
import cardsData from "../../../../data/cards.json";

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

  // 3. Slug — keep ASCII-safe for routing; Chinese stays only in `title`
  // Use a short deterministic hash from the topic so the URL is stable and shareable
  function toSlug(text: string): string {
    // Strip non-ASCII to avoid URL encoding / routing issues
    const ascii = text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40);
    // Stable short hash from original text (handles pure-Chinese topics)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    const hashStr = Math.abs(hash).toString(36).slice(0, 6);
    return (ascii || "card") + "-" + hashStr;
  }
  const slug = toSlug(trimmedTopic);

  const cards = cardsData as any[];
  const existing = cards.find((c) => c.slug === slug);
  if (existing) {
    return NextResponse.json(
      { error: `主题 "${trimmedTopic}" 已存在,请换一个名字` },
      { status: 409 },
    );
  }

  // 4. Build prompt
  const prompt = buildPrompt({ topic: trimmedTopic, kind, palette });
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

  // 7. Download image to public/cards/
  // Filename: `<slug>.png` — directly matches the cards.json `image`
  // field, so wizard-generated cards slot in without manual patching.
  // We deliberately do NOT use a timestamp prefix: each slug should
  // produce one stable filename that overwrites any previous version
  // (the user's request when re-running the wizard for the same topic
  // is "replace the old image", not "keep N copies").
  const imageFilename = `${slug}.png`;
  const localPath = path.join(process.cwd(), "public", "cards", imageFilename);
  try {
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

  // 8. Append to cards.json
  const paletteColors = getPaletteColors(palette);
  const newCard = {
    slug,
    title: trimmedTopic,
    kind,
    series: seriesSlug, // store slug, not Chinese name
    seriesNo: String(cards.filter((c) => c.series === seriesSlug).length + 1).padStart(3, "0"),
    palette: paletteColors,
    image: `/cards/${imageFilename}`,
    score: 0,
    tags: [],
    tagline: "",
    subtitle: "",
    description: "",
    createdAt: new Date().toISOString().split('T')[0],
  };
  cards.push(newCard);
  await fs.writeFile(
    path.join(process.cwd(), "data", "cards.json"),
    JSON.stringify(cards, null, 2),
    "utf8",
  );

  return NextResponse.json({
    slug,
    image: newCard.image,
    title: newCard.title,
  });
}