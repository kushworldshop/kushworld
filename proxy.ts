import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp, getRouteRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const isProd = process.env.NODE_ENV === 'production';

function applySecurityHeaders(response: NextResponse) {
  // Core security headers (many also set at CF layer; we enforce at origin too)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Additional hardening
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // Note: COEP can be strict; enable only if you control all cross-origin resources (fonts, images, etc.)
  // response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin'); // safe for public assets + CDNs

  // Remove tech fingerprinting / internal headers that can aid attackers or trigger "unsafe" scanners
  response.headers.delete('X-Powered-By');
  response.headers.delete('x-powered-by');
  // Next.js RSC/debug headers (leaked in responses sometimes)
  response.headers.delete('x-nextjs-cache');
  response.headers.delete('x-nextjs-prerender');
  response.headers.delete('x-nextjs-stale-time');
  response.headers.delete('x-nextjs-matched-path');
  response.headers.delete('x-nextjs-rewrite');

  // Content-Security-Policy
  // Practical policy for Next.js 16 + current assets (cdnjs font-awesome, CF beacon, images, etc.).
  // 'unsafe-inline'/'unsafe-eval' required for Next hydration/chunks without complex nonce setup.
  // Tighten further later if you introduce nonces or remove inline.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://static.cloudflareinsights.com https://cdn-cgi.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://cdnjs.cloudflare.com",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting (in-memory; restarts on PM2 reload. Protects logins, orders, uploads, etc.)
  let routeLimit = pathname.startsWith('/api/') ? getRouteRateLimit(pathname) : null;
  if (pathname === '/api/orders' && request.method === 'POST') {
    routeLimit = { limit: 20, windowMs: 60 * 60 * 1000 };
  }

  if (routeLimit) {
    const ip = getClientIp(request as unknown as Request);
    const limitKey = pathname === '/api/orders' ? `/api/orders:post:${ip}` : `${pathname}:${ip}`;
    const result = checkRateLimit(limitKey, routeLimit.limit, routeLimit.windowMs);
    if (!result.allowed) {
      return rateLimitResponse(result);
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static assets)
     * - _next/image (optimized images)
     * - favicon / icons / manifest (static)
     * - public assets we don't need to wrap
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
};
