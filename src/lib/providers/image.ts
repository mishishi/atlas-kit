/**
 * Image generation provider abstraction.
 *
 * Pick a provider via IMAGE_PROVIDER env var:
 *   - "matrix"   — uses mavis CLI (current default; works locally only)
 *   - "hailuo"   — direct call to Hailuo AI HTTP API (requires HAILUO_API_KEY)
 *   - "openai"   — direct call to OpenAI DALL-E (requires OPENAI_API_KEY)
 *
 * Each provider returns: { url: string } on success
 * Throws on error.
 */

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
  resolution?: "1K" | "2K" | "4K";
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt?: string;
}

export type ImageProvider = (input: GenerateImageInput) => Promise<GenerateImageResult>;

// ---------- Matrix (current default via mavis CLI) ----------
async function matrixProvider(input: GenerateImageInput): Promise<GenerateImageResult> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  const { writeFile, unlink } = await import("fs/promises");
  const path = await import("path");

  const tmpJson = path.join(process.cwd(), `.tmp-${Date.now()}.json`);
  const requestJson = {
    requests: [{ prompt: input.prompt, aspect_ratio: input.aspectRatio ?? "9:16", resolution: input.resolution ?? "2K" }],
  };
  await writeFile(tmpJson, JSON.stringify(requestJson), "utf8");

  const mavisBin = process.env.MAVIS_BIN_PATH ?? "C:\\Users\\zrb03\\.mavis\\bin\\mavis.cmd";
  let mcpOutput = "";
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { stdout } = await execFileAsync(
        mavisBin,
        ["mcp", "call", "matrix", "matrix_generate_image", "--file", tmpJson],
        { maxBuffer: 10 * 1024 * 1024, timeout: 110_000, shell: process.platform === "win32", windowsHide: true },
      );
      mcpOutput = stdout;
      lastError = null;
      break;
    } catch (e: any) {
      lastError = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await unlink(tmpJson).catch(() => {});
  if (lastError) throw lastError;
  const m = mcpOutput.match(/"output_url"\s*:\s*"([^"]+)"/);
  if (!m) throw new Error("Matrix output parse failed");
  return { url: m[1] };
}

// ---------- MiniMax (Hailuo) Image API — direct HTTP ----------
// Docs: https://platform.minimaxi.com/docs/api-reference/image-generation-t2i
// Endpoint: POST https://api.minimaxi.com/v1/image_generation
// Auth: Authorization: Bearer <MINIMAX_API_KEY>
// Model: image-01 (static) | image-01-live (with style presets)
// Supports n: 1-9 (generate up to 9 per call) + seed (reproducibility)
async function hailuoProvider(input: GenerateImageInput): Promise<GenerateImageResult> {
  const apiKey = process.env.MINIMAX_API_KEY ?? process.env.HAILUO_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY not set (get from https://platform.minimaxi.com/user-center/basic-information/interface-key)");

  // aspect_ratio mapping (our internal 9:16 → MiniMax 9:16 which is 720x1280)
  const aspectMap: Record<string, string> = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
    "21:9": "21:9",
  };
  const aspectRatio = aspectMap[input.aspectRatio ?? "9:16"] ?? "9:16";

  const res = await fetch("https://api.minimaxi.com/v1/image_generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "image-01",
      prompt: input.prompt,
      aspect_ratio: aspectRatio,
      response_format: "url",
      n: 1, // single image; use n: 9 if you want to pick best of many
      prompt_optimizer: true, // let MiniMax optimize our prompt
      aigc_watermark: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MiniMax API HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();

  // Check MiniMax-level status code
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax API error ${data.base_resp?.status_code}: ${data.base_resp?.status_msg}`);
  }

  const urls = data.data?.image_urls;
  if (!urls || urls.length === 0) {
    throw new Error("MiniMax API returned no image URLs");
  }

  return {
    url: urls[0],
    revisedPrompt: data.data?.image_base64 ? undefined : undefined, // MiniMax doesn't return revised_prompt directly
  };
}

// ---------- OpenAI DALL-E direct HTTP ----------
async function openaiProvider(input: GenerateImageInput): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const size = input.aspectRatio === "9:16"
    ? "1024x1792"
    : input.aspectRatio === "1:1"
    ? "1024x1024"
    : input.aspectRatio === "16:9"
    ? "1792x1024"
    : "1024x1792";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: input.prompt,
      n: 1,
      size,
      quality: "hd",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return { url: data.data[0].url, revisedPrompt: data.data[0].revised_prompt };
}

// ---------- Provider registry ----------
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const providerName = process.env.IMAGE_PROVIDER ?? "matrix";
  switch (providerName) {
    case "matrix": return matrixProvider(input);
    case "minimax":
    case "hailuo": return hailuoProvider(input);
    case "openai": return openaiProvider(input);
    default: throw new Error(`Unknown IMAGE_PROVIDER: ${providerName}`);
  }
}