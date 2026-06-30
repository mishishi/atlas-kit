/**
 * mmx-client.mjs — robust wrapper around `mmx.ps1 text chat` for batch
 * scripts. Adds retry with exponential backoff + jitter, request timeout,
 * hang detection, and per-call stats logging.
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
 * R60+ hang detection:
 *   - If a single call exceeds HANG_THRESHOLD_MS (default 2 min), it's
 *     classified as MmxHangError. NO retry — hanging again would just
 *     multiply the wasted time.
 *   - Callers (batch scripts) catch MmxHangError and fall back to
 *     programmatic derivation (see mmx-fallback.mjs). This way one bad
 *     card never blocks the whole batch.
 *
 * Usage (async, for new code):
 *   import { callMmx, callMmxJson, MmxError, MmxHangError } from "./mmx-client.mjs";
 *   try {
 *     const text = await callMmx({ message: "...", system: "..." });
 *   } catch (e) {
 *     if (e instanceof MmxHangError) {
 *       // use programmatic fallback
 *     } else {
 *       throw e;
 *     }
 *   }
 *
 * Usage (sync drop-in, for existing scripts):
 *   // At the top of any old script:
 *   import { callMmxSync } from "./mmx-client.mjs";
 *   globalThis.callMmx = (prompt, system) => callMmxSync(prompt, system);
 *
 *   // Then existing callMmx(prompt) usages Just Work, with retry+backoff.
 *
 * Env:
 *   MMX_MAX_RETRIES (default 2) — total attempts before giving up
 *   MMX_TIMEOUT_MS (default 90000) — per-call timeout
 *   MMX_BACKOFF_BASE_MS (default 2000) — base backoff for retry
 *   MMX_HANG_THRESHOLD_MS (default 120000) — beyond this = hang, no retry
 */
import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const MMX_PATH = "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1";
const MAX_RETRIES = parseInt(process.env.MMX_MAX_RETRIES ?? "2", 10);
const TIMEOUT_MS = parseInt(process.env.MMX_TIMEOUT_MS ?? "90000", 10);
const BACKOFF_BASE_MS = parseInt(process.env.MMX_BACKOFF_BASE_MS ?? "2000", 10);
const HANG_THRESHOLD_MS = parseInt(process.env.MMX_HANG_THRESHOLD_MS ?? "120000", 10);

export class MmxError extends Error {
  constructor(message, { attempts, lastError, elapsedMs } = {}) {
    super(message);
    this.name = "MmxError";
    this.attempts = attempts;
    this.lastError = lastError;
    this.elapsedMs = elapsedMs;
  }
}

export class MmxHangError extends MmxError {
  // Subclass that explicitly signals "the call hung past the threshold,
  // do NOT retry me, use fallback". Distinct from MmxError so batch
  // scripts can match `instanceof MmxHangError` and route to fallback.
  constructor({ elapsedMs, attempts = 1, lastError } = {}) {
    super(`mmx call hung after ${(elapsedMs / 1000).toFixed(0)}s (threshold ${HANG_THRESHOLD_MS / 1000}s)`, {
      attempts,
      lastError,
      elapsedMs,
    });
    this.name = "MmxHangError";
  }
}

function sleepSync(ms) {
  // Synchronous sleep using Atomics.wait — works in main thread.
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.wait(view, 0, 0, ms);
}

function computeBackoff(attempt) {
  const base = BACKOFF_BASE_MS * Math.pow(2, attempt);
  const jitter = base * 0.25 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

function isTransient(stderr) {
  const transient = /529|overloaded|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|timeout|ETIMEOUT|EPIPE|ENOTFOUND|aborted|terminated|killed/i.test(stderr);
  const fatal = /401|403|400|invalid|unauthorized|forbidden|API key|argument|usage/i.test(stderr);
  return transient && !fatal;
}

function buildArgs({ message, system, model, maxTokens, temperature, quiet, format }) {
  const args = ["text", "chat", "--non-interactive"];
  if (quiet) args.push("--quiet");
  if (model) args.push("--model", model);
  if (maxTokens) args.push("--max-tokens", String(maxTokens));
  if (temperature != null) args.push("--temperature", String(temperature));
  if (system) args.push("--system", system);
  if (format) args.push("--format", format);
  args.push("--message", message);
  return args;
}

/**
 * Synchronous drop-in replacement for old `callMmx(prompt)` / `callMmx(prompt, system)` calls.
 * Same signature, same return value (raw stdout string), but with retry+backoff.
 * Returns string on success. Throws on failure after MAX_RETRIES exhausted.
 *
 * IMPORTANT: defaults to `quiet: true` for backward compat with scripts that
 * expect raw text output (fix-descriptions, draft-sources, draft-history).
 * BUT scripts that parse mmx JSON envelope (draft-history.mjs's extractResponseText)
 * must pass `quiet: false` to get the full JSON envelope — without it M2.7
 * emits empty string and the process hangs.
 *
 * Use this for migrating legacy batch scripts without converting them to async.
 */
export function callMmxSync(prompt, system, options = {}) {
  if (!existsSync(MMX_PATH)) {
    throw new MmxError(`mmx not found at ${MMX_PATH}`);
  }
  const args = buildArgs({
    message: prompt,
    system,
    quiet: options.quiet ?? true,
    format: options.format,
  });
  const start = Date.now();
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    try {
      // Cross-platform: powershell.exe on Windows, mmx directly on Linux/macOS
      // (mmx.ps1 is a Windows-specific script). Local dev may be either.
      const isWin = process.platform === "win32";
      const stdout = isWin
        ? execFileSync(
            "powershell.exe",
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", MMX_PATH, ...args],
            { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: TIMEOUT_MS },
          )
        : execFileSync(MMX_PATH.replace(/\.ps1$/, ""), args, {
            encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: TIMEOUT_MS,
          });
      return stdout;
    } catch (e) {
      lastError = e;
      const stderr = e.stderr?.toString() ?? e.message ?? "";
      const elapsed = Date.now() - attemptStart;
      // Hang detection: if a single attempt exceeded the threshold,
      // abort with MmxHangError. NO retry — hanging again multiplies waste.
      if (elapsed >= HANG_THRESHOLD_MS) {
        console.warn(`[mmx] HANG detected (${(elapsed / 1000).toFixed(0)}s >= ${HANG_THRESHOLD_MS / 1000}s threshold). Aborting — use programmatic fallback.`);
        throw new MmxHangError({ elapsedMs: elapsed, attempts: attempt + 1, lastError: e });
      }
      const transient = isTransient(stderr);
      console.warn(`[mmx] attempt ${attempt + 1}/${MAX_RETRIES} failed (${e.code ?? e.message?.slice(0, 80) ?? "?"})${transient ? " [transient, will retry]" : " [fatal]"}`);
      if (!transient) break;
      if (attempt < MAX_RETRIES - 1) {
        const wait = computeBackoff(attempt);
        console.warn(`[mmx] backing off ${wait}ms...`);
        sleepSync(wait);
      }
    }
  }

  throw new MmxError(
    `mmx call failed after ${MAX_RETRIES} attempts: ${lastError?.message?.slice(0, 200) ?? "unknown"}`,
    { attempts: MAX_RETRIES, lastError, elapsedMs: Date.now() - start },
  );
}

/**
 * Async version — preferred for new code. Returns the raw stdout string.
 * Throws MmxError after MAX_RETRIES exhausted.
 */
export async function callMmx({ message, system, model, maxTokens = 4096, temperature, quiet = true }) {
  if (!existsSync(MMX_PATH)) {
    throw new MmxError(`mmx not found at ${MMX_PATH}`);
  }
  const args = buildArgs({ message, system, model, maxTokens, temperature, quiet });
  const start = Date.now();
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const isWin = process.platform === "win32";
      const { stdout } = await new Promise((resolve, reject) => {
        const child = isWin
          ? execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", MMX_PATH, ...args],
              { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: TIMEOUT_MS },
              (err, stdout) => err ? reject(err) : resolve({ stdout }))
          : execFile(MMX_PATH.replace(/\.ps1$/, ""), args,
              { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: TIMEOUT_MS },
              (err, stdout) => err ? reject(err) : resolve({ stdout }));
      });
      return stdout;
    } catch (e) {
      lastError = e;
      const stderr = e.stderr?.toString() ?? e.message ?? "";
      const elapsed = Date.now() - start;
      // Hang detection: if total elapsed >= threshold, abort with MmxHangError.
      if (elapsed >= HANG_THRESHOLD_MS) {
        console.warn(`[mmx] HANG detected (${(elapsed / 1000).toFixed(0)}s >= ${HANG_THRESHOLD_MS / 1000}s threshold). Aborting — use programmatic fallback.`);
        throw new MmxHangError({ elapsedMs: elapsed, attempts: attempt + 1, lastError: e });
      }
      const transient = isTransient(stderr);
      console.warn(`[mmx] attempt ${attempt + 1}/${MAX_RETRIES} failed (${e.code ?? e.message?.slice(0, 80) ?? "?"})${transient ? " [transient, will retry]" : " [fatal]"}`);
      if (!transient) break;
      if (attempt < MAX_RETRIES - 1) {
        const wait = computeBackoff(attempt);
        console.warn(`[mmx] backing off ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
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