// src/lib/rateLimit.ts
// High-performance sliding window rate limiter for authentication, punch, and sensitive endpoints.

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Checks and records a rate-limited action under the given key.
 *
 * @param key Unique key (e.g. `login:user@example.com` or `punch:emp-id`)
 * @param maxAttempts Maximum allowed attempts within window
 * @param windowMs Window duration in milliseconds (e.g. 15 * 60 * 1000 for 15 mins)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= maxAttempts) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = Math.max(0, oldestTimestamp + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxAttempts - record.timestamps.length,
    retryAfterMs: 0,
  };
}
