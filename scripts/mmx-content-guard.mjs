/**
 * mmx-content-guard.mjs — bad-content detection for M2.7 / M2.7-highspeed.
 *
 * Background (from R60+):
 *   M2.7 returns 30% off-topic content for small / topic-unclear prompts:
 *     - JavaScript "undefined" / MDN / ECMAScript spec (irrelevant to Chinese 百科 prompt)
 *     - Empty content (reasoning_tokens eats budget)
 *     - Garbled Chinese (mixed ink/blank strokes from Hailuo pipeline — not model)
 *
 * Existing mmx-client retry handles transient API errors, but M2.7's bad-output
 * has finish_reason="stop" so retries don't auto-trigger. We need CONTENT-level
 * guard that detects bad output and re-prompts (with different seed or phrased).
 *
 * Usage:
 *   import { isMmxContentBad, sanitizeMmxContent, retryUntilGood } from "./mmx-content-guard.mjs";
 *
 *   const result = await retryUntilGood({
 *     call: (attempt) => callMmx({ message: prompt, system, quiet: false }),
 *     parser: (raw) => parseHistoryNodes(raw),  // user-provided parser
 *     maxAttempts: 5,
 *   });
 */

// Bad content patterns observed across R60-R68 batch runs.
// Each entry: { re, why } — match = content is unusable.
const BAD_PATTERNS = [
  // JavaScript undefined trap (M2.7 hallucinating JS docs instead of encyclopedia text)
  { re: /\bMDN\b|\bECMAScript\b|JavaScript.*typeof|typeof\s+undefined|未赋值的原始值|原始值[,，]?\s*用于表示|未定义\s*值|在JavaScript中|在\s*旧版|全局对象的属性/, why: "M2.7 returned JS docs instead of encyclopedia content" },

  // English-only fallback when Chinese prompt clearly expected
  { re: /^[\s\S]*?(Wikipedia|encyclopedia article|This article is about|the following is a stub)/i, why: "English Wikipedia stub returned for Chinese prompt" },

  // Generic AI refusals
  { re: /I cannot|I apologize|对不起,我无法|抱歉,我不能|as an AI|as a language model/i, why: "AI refusal / unable response" },

  // Residue in output (model leaked placeholder / undefined / object stringification)
  { re: /\bundefined\b|\[object Object\]|\[object Promise\]|\bNaN\b/, why: "residue string in content (undefined / object stringified)" },
];

// Placeholder pollution patterns (mmx fallback default)
const PLACEHOLDER_PATTERNS = [
  /^a$/i,  // a/b/c placeholder
  /百科占位/,
  /placeholder/i,
];

const MIN_CONTENT_LENGTH = 30;  // any returned content shorter than this is suspect

/**
 * Returns { bad: true, reason: string } if content matches any bad pattern,
 * else { bad: false }.
 */
export function isMmxContentBad(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { bad: true, reason: "empty or non-string content" };
  }
  const trimmed = rawText.trim();
  if (trimmed.length < MIN_CONTENT_LENGTH) {
    return { bad: true, reason: `content too short (${trimmed.length} chars)` };
  }
  for (const { re, why } of BAD_PATTERNS) {
    if (re.test(trimmed)) {
      return { bad: true, reason: why };
    }
  }
  return { bad: false };
}

/**
 * Strip mmx JSON envelope noise and return the raw content text.
 * Handles: ```json ... ``` fences, leading reasoning blocks, trailing whitespace.
 */
export function sanitizeMmxContent(rawText) {
  if (!rawText) return "";
  let t = rawText.trim();
  // Strip leading ```json or ``` fence
  t = t.replace(/^```(?:json)?\s*/i, "");
  t = t.replace(/```\s*$/, "");
  // Strip "reasoning_content:" leading block (M2.7 sometimes leaks)
  t = t.replace(/^reasoning_content:[\s\S]*?\n\n+/i, "");
  return t.trim();
}

/**
 * Retry loop that combines mmx-client retry (API errors) + content guard
 * (M2.7 garbage). Each attempt can either fail at the network layer (transient
 * 5xx / hang) or the content layer (model returned bad output).
 *
 * @param call: async () => string  — mmx invocation. Per-attempt, can vary seed
 * @param parser: (raw: string) => any | null  — domain parser; null = bad output
 * @param maxAttempts: number  — default 5 (3 content + 2 transient)
 * @returns { result, attempts, totalContentFailures }
 *   Throws if all attempts fail.
 */
export async function retryUntilGood({ call, parser, maxAttempts = 5 }) {
  let lastError = null;
  let contentFails = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw;
    try {
      raw = await call(attempt);
    } catch (e) {
      // Network-level failure (transient API error / hang) — already retried by mmx-client
      lastError = e;
      if (e.name === "MmxHangError") {
        // Don't retry hang — caller should fall back to programmatic derivation
        throw e;
      }
      console.warn(`[content-guard] attempt ${attempt}: network error: ${e.message?.slice(0, 100)}`);
      continue;
    }

    // Content-level check
    const sanitized = sanitizeMmxContent(raw);
    const bad = isMmxContentBad(sanitized);
    if (bad.bad) {
      contentFails++;
      console.warn(`[content-guard] attempt ${attempt}: content bad — ${bad.reason}`);
      lastError = new Error(`bad content: ${bad.reason}`);
      continue;
    }

    // Parser-level check (domain-specific — e.g., "is this a valid history node array?")
    let parsed;
    try {
      parsed = parser(sanitized);
    } catch (e) {
      contentFails++;
      console.warn(`[content-guard] attempt ${attempt}: parser threw — ${e.message?.slice(0, 100)}`);
      lastError = e;
      continue;
    }
    if (parsed == null) {
      contentFails++;
      console.warn(`[content-guard] attempt ${attempt}: parser returned null (bad shape)`);
      lastError = new Error("parser returned null");
      continue;
    }

    // All good
    return { result: parsed, attempts: attempt, contentFailures: contentFails };
  }

  const err = new Error(`content guard: all ${maxAttempts} attempts failed (${contentFails} content fails)`);
  err.lastError = lastError;
  err.contentFailures = contentFails;
  throw err;
}

/**
 * Detect mmx residue strings (placeholder / undefined / [object Object]) in a
 * final card field. Used by handwrite-* cleanup scripts to find cards that
 * still have bad data despite batch pipeline.
 */
export function isResidueInCardField(value) {
  if (!value || typeof value !== "string") return false;
  if (/undefined|\[object Object\]|\[object Promise\]|NaN/.test(value)) return true;
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(value.trim()))) return true;
  if (/^[abc]{1,3}$/i.test(value.trim())) return true;  // a/b/c/abc placeholders
  return false;
}