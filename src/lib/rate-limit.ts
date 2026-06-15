// Simple in-memory IP rate limiter for MVP
// In production: use Redis/Upstash for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
// Production rate limit: 3 generation requests per 5 minutes per IP.
// The previous value (9999) was for batch-running the 60 placeholder
// cards and must not ship to production. The generation wizard calls
// matrix MCP, which is itself rate-limited; 3/5min keeps a single
// user from triggering 502 floods when the upstream is throttled.
const MAX_REQUESTS = 3;

export function rateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + WINDOW_MS;
    store.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

// Periodically cleanup old entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (entry.resetAt < now) store.delete(ip);
  }
}, 60 * 1000); // every minute

export function getClientIp(headers: Headers): string {
  // Check common proxy headers first
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  // Fallback
  return "unknown";
}