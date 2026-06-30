/**
 * mmx-client.mjs — robust wrapper around `mmx.ps1 text chat` for batch
 * scripts. Adds retry with exponential backoff + jitter, request timeout,
 * and per-call stats logging.
 *
 * Why this exists:
 *   - mmx CLI spawns powershell → node → API per call (~800ms cold start)
 *   - When the API is overloaded (529) or the daemon is throttling, calls
 *     hang 90s+ before timing out. Multiplied by 200+ cards in a batch,
 *     this kills scripts.
 *   - Per-card scripts (fix-descriptions, draft-history, draft-sources)
 *     each duplicate their own callMmx() — no shared retry logic, no
 *     shared observability.
 *
 * Usage:
 *   import { callMmx, withRetry, MmxError } from "./mmx-client.mjs";
 *   const text = await callMmx({ message: "...", system: "..." });
 *
 * Env:
 *   MMX_MAX_RETRIES (default 3) — total attempts before giving up
 *   MMX_TIMEOUT_MS (default 90000) — per-call timeout
 *   MMX_BACKOFF_BASE_MS (default 2000) — base backoff for retry
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const execFileP = promisify(execFile);

const MMX_PATH = "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1";
const MAX_RETRIES = parseInt(process.env.MMX_MAX_RETRIES ?? "3", 10);
const TIMEOUT_MS = parseInt(process.env.MMX_TIMEOUT_MS ?? "90000", 10);
const BACKOFF_BASE_MS = parseInt(process.env.MMX_BACKOFF_BASE_MS ?? "2000", 10);

export class MmxError extends Error {
  constructor(message, { attempts, lastError, elapsedMs } = {}) {
    super(message);
    this.name = "MmxError";
    this.attempts = attempts;
    this.lastError = lastError;
    this.elapsedMs = elapsedMs;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt) {
  // Exponential with jitter: base * 2^attempt + 25% randomness
  const base = BACKOFF_BASE_MS * Math.pow(2, attempt);
  const jitter = base * 0.25 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

function isTransient(stderr) {
  // 529 overloaded, ETIMEDOUT, ECONNRESET, ECONNREFUSED, socket hang up
  // Also: any exit code that's not a client-side validation error.
  // mmx errors that should NOT be retried: 401/403 (auth), 400 (bad input).
  const transient = /529|overloaded|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|timeout|ETIMEOUT|EPIPE|ENOTFOUND|aborted|terminated|killed/i.test(stderr);
  const fatal = /401|403|400|invalid|unauthorized|forbidden|API key|argument|usage/i.test(stderr);
  return transient && !fatal;
}

/**
 * Call mmx text chat with retry + backoff.
 * Returns the raw stdout string on success.
 * Throws MmxError after MAX_RETRIES exhausted.
 */
export async function callMmx({ message, system, model, maxTokens = 4096, temperature, quiet = true }) {
  if (!existsSync(MMX_PATH)) {
    throw new MmxError(`mmx not found at ${MMX_PATH}`);
  }
  const args = ["text", "chat", "--non-interactive"];
  if (quiet) args.push("--quiet");
  if (model) args.push("--model", model);
  if (maxTokens) args.push("--max-tokens", String(maxTokens));
  if (temperature != null) args.push("--temperature", String(temperature));
  if (system) args.push("--system", system);
  args.push("--message", message);

  const start = Date.now();
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { stdout } = await execFileP(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", MMX_PATH, ...args],
        { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: TIMEOUT_MS },
      );
      return stdout;
    } catch (e) {
      lastError = e;
      const stderr = e.stderr?.toString() ?? e.message ?? "";
      const transient = isTransient(stderr);
      // Always log retry decision
      console.warn(`[mmx] attempt ${attempt + 1}/${MAX_RETRIES} failed (${e.code ?? e.message?.slice(0, 80) ?? "?"})${transient ? " [transient, will retry]" : " [fatal]"}`);
      if (!transient) break;
      if (attempt < MAX_RETRIES - 1) {
        const wait = computeBackoff(attempt);
        console.warn(`[mmx] backing off ${wait}ms...`);
        await sleep(wait);
      }
    }
  }

  throw new MmxError(
    `mmx call failed after ${MAX_RETRIES} attempts: ${lastError?.message?.slice(0, 200) ?? "unknown"}`,
    { attempts: MAX_RETRIES, lastError, elapsedMs: Date.now() - start },
  );
}

/**
 * Call mmx with a JSON array prompt — common pattern for batch scripts.
 * Returns parsed array (or null on parse failure).
 */
export async function callMmxJson({ message, system, model, maxTokens = 4096, temperature }) {
  const raw = await callMmx({ message, system, model, maxTokens, temperature });
  let text = raw
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}