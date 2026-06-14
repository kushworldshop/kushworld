import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp, getRouteRateLimit, rateLimitResponse } from '@/lib/rateLimit';

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let routeLimit = pathname.startsWith('/api/') ? getRouteRateLimit(pathname) : null;
  if (pathname === '/api/orders' && request.method === 'POST') {
    routeLimit = { limit: 20, windowMs: 60 * 60 * 1000 };
  }

  if (routeLimit) {
    const ip = getClientIp(request);
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
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
};