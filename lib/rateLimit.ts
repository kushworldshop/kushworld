type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  // Cloudflare sets this on proxied requests; prefer when present.
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests. Please wait and try again.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}

const ROUTE_LIMITS: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: '/api/admin/login', limit: 5, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/login', limit: 10, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/register', limit: 5, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/auth/forgot-password', limit: 5, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/reset-password', limit: 10, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/verify', limit: 20, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/discord', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/grok/chat', limit: 40, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/shipping/prepare', limit: 30, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/orders/upload-id', limit: 10, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/users/id-upload', limit: 10, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/payments/charge', limit: 15, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/payments/btc/create', limit: 15, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/referrals', limit: 60, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/orders/check-verification', limit: 20, windowMs: 15 * 60 * 1000 },
];

export function getRouteRateLimit(pathname: string): { limit: number; windowMs: number } | null {
  const match = ROUTE_LIMITS.find((route) => pathname.startsWith(route.prefix));
  return match ? { limit: match.limit, windowMs: match.windowMs } : null;
}