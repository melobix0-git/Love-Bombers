const buckets = globalThis.__loveBomberRateBuckets || new Map();
globalThis.__loveBomberRateBuckets = buckets;

export class RateLimitError extends Error {
  constructor(retryAfter) {
    super('Too many requests. Please try again shortly.');
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
  }
}

function getClientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  return String(forwarded || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

export function enforceRateLimit(req, { limit = 30, windowMs = 60_000 } = {}) {
  const key = `${req.method}:${getClientKey(req)}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((current.expiresAt - now) / 1000)));
  }
}
